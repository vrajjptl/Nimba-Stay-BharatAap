import { beforeEach, describe, expect, it } from 'vitest';
import { GET as getAvailability } from '../app/api/availability/route';
import { PATCH } from '../app/api/bookings/[id]/route';
import { POST } from '../app/api/bookings/route';
import { getDb, resetDatabase } from '../lib/db';

beforeEach(() => {
  resetDatabase();
});

function addRoom(row: { number: string; category?: string; pricePerNight?: number; status?: string }) {
  const result = getDb()
    .prepare('INSERT INTO rooms (number, category, pricePerNight, status) VALUES (?, ?, ?, ?)')
    .run(row.number, row.category ?? 'Standard', row.pricePerNight ?? 2500, row.status ?? 'active');
  return Number(result.lastInsertRowid);
}

function addBooking(row: { roomId: number; checkIn: string; checkOut: string; status?: string }) {
  getDb()
    .prepare(
      `INSERT INTO bookings (roomId, guestName, phone, checkIn, checkOut, status, createdAt)
       VALUES (?, 'Guest', '9999999999', ?, ?, ?, '2026-11-01T00:00:00.000Z')`,
    )
    .run(row.roomId, row.checkIn, row.checkOut, row.status ?? 'confirmed');
}

function book(body: Record<string, unknown>) {
  return POST(
    new Request('http://localhost/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

function stay(roomId: number, checkIn: string, checkOut: string, phone = '9876543210') {
  return { roomId, guestName: 'Asha Nair', phone, checkIn, checkOut };
}

describe('availability and bookings', () => {
  it('hides a room that overlaps and prices the free ones', async () => {
    const busy = addRoom({ number: '101', pricePerNight: 2500 });
    const free = addRoom({ number: '103', pricePerNight: 2800 });
    addBooking({ roomId: busy, checkIn: '2026-11-10', checkOut: '2026-11-15' });

    const response = await getAvailability(
      new Request('http://localhost/api/availability?checkIn=2026-11-12&checkOut=2026-11-14'),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        id: free,
        number: '103',
        category: 'Standard',
        pricePerNight: 2800,
        nights: 2,
        totalPrice: 5600,
      },
    ]);
  });

  it('rejects an overlapping stay', async () => {
    const roomId = addRoom({ number: '101' });
    addBooking({ roomId, checkIn: '2026-11-10', checkOut: '2026-11-15' });

    const response = await book(stay(roomId, '2026-11-12', '2026-11-16'));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'That room is already booked for those dates' });
  });

  it('allows a check-in on the existing checkout date', async () => {
    const roomId = addRoom({ number: '102' });
    addBooking({ roomId, checkIn: '2026-11-16', checkOut: '2026-11-20' });

    const response = await book(stay(roomId, '2026-11-20', '2026-11-22'));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      roomId,
      checkIn: '2026-11-20',
      checkOut: '2026-11-22',
      status: 'confirmed',
    });
  });

  it('does not let a cancelled booking block the room', async () => {
    const roomId = addRoom({ number: '201', category: 'Deluxe' });
    addBooking({ roomId, checkIn: '2026-11-10', checkOut: '2026-11-18', status: 'cancelled' });

    const listed = await getAvailability(
      new Request('http://localhost/api/availability?checkIn=2026-11-12&checkOut=2026-11-14'),
    );
    expect(await listed.json()).toMatchObject([{ id: roomId }]);

    const response = await book(stay(roomId, '2026-11-12', '2026-11-14'));
    expect(response.status).toBe(201);
  });

  it('never returns a room in maintenance', async () => {
    addRoom({ number: '104', status: 'maintenance' });
    const open = addRoom({ number: '101' });

    const response = await getAvailability(
      new Request('http://localhost/api/availability?checkIn=2026-11-20&checkOut=2026-11-22'),
    );
    const rooms = (await response.json()) as { id: number }[];
    expect(rooms.map((room) => room.id)).toEqual([open]);
  });

  it('rejects a booking when the room is under maintenance', async () => {
    const roomId = addRoom({ number: '104', status: 'maintenance' });
    const response = await book(stay(roomId, '2026-12-01', '2026-12-03'));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'Room is under maintenance' });
  });

  it('returns 400 when check-out is not after check-in', async () => {
    const availability = await getAvailability(
      new Request('http://localhost/api/availability?checkIn=2026-11-20&checkOut=2026-11-20'),
    );
    expect(availability.status).toBe(400);
    expect(await availability.json()).toEqual({ error: 'Check-out must be after check-in' });

    const roomId = addRoom({ number: '101' });
    const created = await book(stay(roomId, '2026-11-22', '2026-11-20'));
    expect(created.status).toBe(400);
    expect(await created.json()).toEqual({ error: 'Check-out must be after check-in' });
  });

  it('returns 400 when the phone is not 10 digits', async () => {
    const roomId = addRoom({ number: '101' });
    const response = await book(stay(roomId, '2026-12-01', '2026-12-03', '98765'));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Phone must be exactly 10 digits' });
  });

  it('returns 409 when the same room is booked twice for the same stay', async () => {
    const roomId = addRoom({ number: '101' });
    const first = await book(stay(roomId, '2026-12-01', '2026-12-03'));
    expect(first.status).toBe(201);

    const second = await book({ ...stay(roomId, '2026-12-01', '2026-12-03'), guestName: 'Rahul Menon', phone: '9876500000' });
    expect(second.status).toBe(409);
  });

  it('cancels a booking and frees the room', async () => {
    const roomId = addRoom({ number: '101' });
    const created = await book(stay(roomId, '2026-12-01', '2026-12-03'));
    const saved = (await created.json()) as { id: number };

    const cancelled = await PATCH(new Request(`http://localhost/api/bookings/${saved.id}`, { method: 'PATCH' }), {
      params: Promise.resolve({ id: String(saved.id) }),
    });
    expect(cancelled.status).toBe(200);
    expect(await cancelled.json()).toMatchObject({ id: saved.id, status: 'cancelled' });

    const again = await book({ ...stay(roomId, '2026-12-01', '2026-12-03'), guestName: 'Rahul Menon' });
    expect(again.status).toBe(201);
  });
});
