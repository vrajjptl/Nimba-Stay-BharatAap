import { getDb } from './db';
import { validateStayDates } from './dates';
import { hasDateClash, type ClashBooking } from './overlap';
import { isTenDigitPhone } from './phone';

export type Booking = {
  id: number;
  roomId: number;
  guestName: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
};

export type BookingListItem = Booking & {
  roomNumber: string;
};

export type BookingInput = {
  roomId: number;
  guestName: string;
  phone: string;
  checkIn: string;
  checkOut: string;
};

type Failure = { ok: false; status: number; error: string };

export function parseBookingBody(body: unknown): { ok: true; value: BookingInput } | Failure {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'Request body must be a JSON object' };
  }

  const raw = body as Record<string, unknown>;
  const dateError = validateStayDates(raw.checkIn, raw.checkOut);
  if (dateError) return { ok: false, status: 400, error: dateError };

  if (typeof raw.guestName !== 'string' || raw.guestName.trim() === '') {
    return { ok: false, status: 400, error: 'Guest name is required' };
  }
  if (typeof raw.phone !== 'string' || !isTenDigitPhone(raw.phone)) {
    return { ok: false, status: 400, error: 'Phone must be exactly 10 digits' };
  }
  if (typeof raw.roomId !== 'number' || !Number.isInteger(raw.roomId)) {
    return { ok: false, status: 400, error: 'Room is required' };
  }

  return {
    ok: true,
    value: {
      roomId: raw.roomId,
      guestName: raw.guestName.trim(),
      phone: raw.phone,
      checkIn: raw.checkIn as string,
      checkOut: raw.checkOut as string,
    },
  };
}

export function createBooking(input: BookingInput): { ok: true; booking: Booking } | Failure {
  const db = getDb();
  // Lock the database before reading clashes. The next request waits, then sees this row.
  const write = db.transaction((): { ok: true; booking: Booking } | Failure => {
    const room = db.prepare('SELECT id, status FROM rooms WHERE id = ?').get(input.roomId) as
      | { id: number; status: string }
      | undefined;
    if (!room) return { ok: false, status: 400, error: 'Room not found' };
    if (room.status === 'maintenance') {
      return { ok: false, status: 409, error: 'Room is under maintenance' };
    }

    const existing = db
      .prepare('SELECT checkIn, checkOut, status FROM bookings WHERE roomId = ?')
      .all(input.roomId) as ClashBooking[];
    if (hasDateClash({ checkIn: input.checkIn, checkOut: input.checkOut }, existing)) {
      return { ok: false, status: 409, error: 'That room is already booked for those dates' };
    }

    const createdAt = new Date().toISOString();
    const inserted = db
      .prepare(
        `INSERT INTO bookings (roomId, guestName, phone, checkIn, checkOut, status, createdAt)
         VALUES (?, ?, ?, ?, ?, 'confirmed', ?)`,
      )
      .run(input.roomId, input.guestName, input.phone, input.checkIn, input.checkOut, createdAt);

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(Number(inserted.lastInsertRowid)) as Booking;
    return { ok: true, booking };
  });

  return write.immediate();
}

export function listBookings(): BookingListItem[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT b.id, b.roomId, b.guestName, b.phone, b.checkIn, b.checkOut, b.status, b.createdAt,
              r.number AS roomNumber
       FROM bookings b
       JOIN rooms r ON r.id = b.roomId
       ORDER BY CASE b.status WHEN 'confirmed' THEN 0 ELSE 1 END, b.checkIn, b.id`,
    )
    .all() as BookingListItem[];
}

export function cancelBooking(id: number): { ok: true; booking: Booking } | Failure {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as Booking | undefined;
  if (!existing) return { ok: false, status: 404, error: 'Booking not found' };
  if (existing.status !== 'cancelled') {
    db.prepare(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`).run(id);
  }
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as Booking;
  return { ok: true, booking };
}
