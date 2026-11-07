'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { isTenDigitPhone } from '../lib/phone';

type Room = {
  id: number;
  number: string;
  category: string;
  pricePerNight: number;
  nights: number;
  totalPrice: number;
};

type BookingRow = {
  id: number;
  roomNumber: string;
  guestName: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  status: 'confirmed' | 'cancelled';
};

const categories = ['Standard', 'Deluxe', 'Suite'];

function inr(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function displayDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

async function readError(response: Response) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error || `Request failed (${response.status})`;
}

export default function HomePage() {
  const [checkIn, setCheckIn] = useState('2026-11-20');
  const [checkOut, setCheckOut] = useState('2026-11-22');
  const [category, setCategory] = useState('');
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const loadBookings = useCallback(async () => {
    const response = await fetch('/api/bookings');
    if (!response.ok) return readError(response);
    setBookings((await response.json()) as BookingRow[]);
    return '';
  }, []);

  const loadRooms = useCallback(async () => {
    const params = new URLSearchParams({ checkIn, checkOut });
    if (category) params.set('category', category);
    const response = await fetch(`/api/availability?${params}`);
    if (!response.ok) {
      setRooms(null);
      setSelectedId(null);
      return readError(response);
    }
    const nextRooms = (await response.json()) as Room[];
    setRooms(nextRooms);
    setSelectedId((current) => (nextRooms.some((room) => room.id === current) ? current : null));
    return '';
  }, [checkIn, checkOut, category]);

  useEffect(() => {
    loadBookings()
      .then((problem) => {
        if (problem) setError(problem);
      })
      .catch(() => setError('Could not load bookings'));
  }, [loadBookings]);

  function clearResults() {
    setRooms(null);
    setSelectedId(null);
    setError('');
    setSuccess('');
  }

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    setSearching(true);
    setError('');
    setSuccess('');
    try {
      const problem = await loadRooms();
      if (problem) setError(problem);
    } catch {
      setError('Could not reach the server');
    } finally {
      setSearching(false);
    }
  }

  async function onBook(event: FormEvent) {
    event.preventDefault();
    const room = rooms?.find((item) => item.id === selectedId);
    if (!room) return;

    const name = guestName.trim();
    if (!name) {
      setSuccess('');
      setError('Guest name is required');
      return;
    }
    if (!isTenDigitPhone(phone)) {
      setSuccess('');
      setError('Phone must be exactly 10 digits');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, guestName: name, phone, checkIn, checkOut }),
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      const saved = (await response.json()) as { guestName: string };
      setGuestName('');
      setPhone('');
      setSelectedId(null);
      setSuccess(`Booked room ${room.number} for ${saved.guestName}.`);
      const [roomsProblem, bookingsProblem] = await Promise.all([loadRooms(), loadBookings()]);
      if (roomsProblem || bookingsProblem) setError(roomsProblem || bookingsProblem);
    } catch {
      setError('Could not reach the server');
    } finally {
      setSubmitting(false);
    }
  }

  async function onCancel(id: number) {
    setCancellingId(id);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/bookings/${id}`, { method: 'PATCH' });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      setSuccess('Booking cancelled. Those dates are free again.');
      const tasks = [loadBookings()];
      if (rooms) tasks.push(loadRooms());
      const problems = await Promise.all(tasks);
      const problem = problems.find(Boolean);
      if (problem) setError(problem);
    } catch {
      setError('Could not reach the server');
    } finally {
      setCancellingId(null);
    }
  }

  const selected = rooms?.find((room) => room.id === selectedId) ?? null;
  const nights = rooms?.[0]?.nights;
  const busy = searching || submitting;

  return (
    <main>
      <header className="masthead">
        <p className="eyebrow">Nimba nature cure</p>
        <h1>Front desk</h1>
        <p className="lede">Search a stay, book a free room, or cancel a booking that was entered by mistake.</p>
      </header>

      <form className="panel search" onSubmit={onSearch}>
        <label>
          Check-in
          <input
            type="date"
            name="checkIn"
            value={checkIn}
            onChange={(event) => {
              setCheckIn(event.target.value);
              clearResults();
            }}
          />
        </label>
        <label>
          Check-out
          <input
            type="date"
            name="checkOut"
            value={checkOut}
            onChange={(event) => {
              setCheckOut(event.target.value);
              clearResults();
            }}
          />
        </label>
        <label>
          Category
          <select
            name="category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              clearResults();
            }}
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={busy}>
          {searching ? 'Searching…' : 'Search'}
        </button>
        <p className="hint">
          The checkout date is free for the next guest. Room 102 is booked until 20 Nov 2026, so a stay that starts
          that day can take it. Room 201's hold is cancelled. Room 104 is in maintenance and stays hidden.
        </p>
      </form>

      {error ? (
        <p className="banner error" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="banner ok" role="status">
          {success}
        </p>
      ) : null}

      <section aria-labelledby="free-rooms">
        <h2 id="free-rooms">
          Free rooms
          {nights ? <span className="quiet"> · {nights === 1 ? '1 night' : `${nights} nights`}</span> : null}
        </h2>
        {rooms === null ? (
          <p className="empty">Search to see rooms that are free for the whole stay.</p>
        ) : rooms.length === 0 ? (
          <p className="empty">No rooms are free for those dates.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Category</th>
                  <th className="num">Per night</th>
                  <th className="num">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => {
                  const isSelected = room.id === selectedId;
                  return (
                    <tr key={room.id} className={isSelected ? 'is-selected' : undefined}>
                      <td>{room.number}</td>
                      <td>{room.category}</td>
                      <td className="num">{inr(room.pricePerNight)}</td>
                      <td className="num">{inr(room.totalPrice)}</td>
                      <td className="actions">
                        <button
                          type="button"
                          className="secondary"
                          aria-pressed={isSelected}
                          onClick={() => setSelectedId(isSelected ? null : room.id)}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {selected ? (
          <form className="book" onSubmit={onBook}>
            <p>
              Room {selected.number} · {selected.category} · {inr(selected.pricePerNight)} a night ·{' '}
              {inr(selected.totalPrice)} for {displayDate(checkIn)} to {displayDate(checkOut)}
            </p>
            <label>
              Guest name
              <input
                name="guestName"
                value={guestName}
                autoComplete="name"
                onChange={(event) => setGuestName(event.target.value)}
              />
            </label>
            <label>
              Phone
              <input
                name="phone"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                placeholder="10 digits"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Booking…' : 'Book'}
            </button>
          </form>
        ) : null}
      </section>

      <section aria-labelledby="current-bookings">
        <h2 id="current-bookings">Current bookings</h2>
        {bookings.length === 0 ? (
          <p className="empty">No bookings yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Guest</th>
                  <th>Phone</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>{booking.roomNumber}</td>
                    <td>{booking.guestName}</td>
                    <td>{booking.phone}</td>
                    <td>{displayDate(booking.checkIn)}</td>
                    <td>{displayDate(booking.checkOut)}</td>
                    <td>
                      <span className={booking.status === 'cancelled' ? 'pill cancelled' : 'pill'}>
                        {booking.status === 'cancelled' ? 'Cancelled' : 'Confirmed'}
                      </span>
                    </td>
                    <td className="actions">
                      {booking.status === 'confirmed' ? (
                        <button
                          type="button"
                          className="danger"
                          disabled={cancellingId === booking.id}
                          onClick={() => onCancel(booking.id)}
                        >
                          {cancellingId === booking.id ? 'Cancelling…' : 'Cancel'}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
