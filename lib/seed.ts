import { getDb } from './db';

const rooms = [
  { id: 1, number: '101', category: 'Standard', pricePerNight: 2500, status: 'active' },
  { id: 2, number: '102', category: 'Standard', pricePerNight: 2500, status: 'active' },
  { id: 3, number: '103', category: 'Standard', pricePerNight: 2800, status: 'active' },
  { id: 4, number: '104', category: 'Standard', pricePerNight: 2500, status: 'maintenance' },
  { id: 5, number: '201', category: 'Deluxe', pricePerNight: 4200, status: 'active' },
  { id: 6, number: '202', category: 'Deluxe', pricePerNight: 4500, status: 'active' },
  { id: 7, number: '203', category: 'Deluxe', pricePerNight: 4800, status: 'active' },
  { id: 8, number: '301', category: 'Suite', pricePerNight: 7500, status: 'active' },
  { id: 9, number: '302', category: 'Suite', pricePerNight: 8200, status: 'active' },
  { id: 10, number: '303', category: 'Suite', pricePerNight: 9000, status: 'active' },
];

const bookings = [
  {
    roomId: 1,
    guestName: 'Meera Iyer',
    phone: '9845011122',
    checkIn: '2026-11-10',
    checkOut: '2026-11-15',
    status: 'confirmed',
  },
  {
    roomId: 2,
    guestName: 'Arun Deshpande',
    phone: '9845022233',
    checkIn: '2026-11-16',
    checkOut: '2026-11-20',
    status: 'confirmed',
  },
  {
    roomId: 5,
    guestName: 'Kiran Shah',
    phone: '9845033344',
    checkIn: '2026-11-10',
    checkOut: '2026-11-18',
    status: 'cancelled',
  },
  {
    roomId: 8,
    guestName: 'Lata Krishnan',
    phone: '9845044455',
    checkIn: '2026-11-22',
    checkOut: '2026-11-25',
    status: 'confirmed',
  },
];

export function seedDatabase(): void {
  const db = getDb();
  const replace = db.transaction(() => {
    db.exec('DELETE FROM bookings; DELETE FROM rooms;');
    const insertRoom = db.prepare(
      `INSERT INTO rooms (id, number, category, pricePerNight, status)
       VALUES (@id, @number, @category, @pricePerNight, @status)`,
    );
    const insertBooking = db.prepare(
      `INSERT INTO bookings (roomId, guestName, phone, checkIn, checkOut, status, createdAt)
       VALUES (@roomId, @guestName, @phone, @checkIn, @checkOut, @status, @createdAt)`,
    );
    for (const room of rooms) insertRoom.run(room);
    for (const booking of bookings) {
      insertBooking.run({ ...booking, createdAt: '2026-11-01T09:00:00.000Z' });
    }
  });
  replace();
}
