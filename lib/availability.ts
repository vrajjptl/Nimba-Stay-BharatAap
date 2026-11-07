import { getDb } from './db';
import { nightsBetween } from './dates';
import { hasDateClash, type ClashBooking } from './overlap';

export type AvailableRoom = {
  id: number;
  number: string;
  category: string;
  pricePerNight: number;
  nights: number;
  totalPrice: number;
};

type RoomRow = {
  id: number;
  number: string;
  category: string;
  pricePerNight: number;
  status: string;
};

type BookingRow = ClashBooking & { roomId: number };

export function findAvailableRooms(checkIn: string, checkOut: string, category?: string): AvailableRoom[] {
  const db = getDb();
  const read = db.transaction(() => {
    const rooms = (
      category
        ? db.prepare('SELECT id, number, category, pricePerNight, status FROM rooms WHERE category = ? ORDER BY number').all(category)
        : db.prepare('SELECT id, number, category, pricePerNight, status FROM rooms ORDER BY number').all()
    ) as RoomRow[];

    const bookings = db.prepare('SELECT roomId, checkIn, checkOut, status FROM bookings').all() as BookingRow[];
    const nights = nightsBetween(checkIn, checkOut);
    const requested = { checkIn, checkOut };

    return rooms.flatMap((room) => {
      if (room.status !== 'active') return [];
      const stays = bookings.filter((booking) => booking.roomId === room.id);
      if (hasDateClash(requested, stays)) return [];
      return [
        {
          id: room.id,
          number: room.number,
          category: room.category,
          pricePerNight: room.pricePerNight,
          nights,
          totalPrice: room.pricePerNight * nights,
        },
      ];
    });
  });

  return read();
}
