# Nimba Stay

A small front-desk screen for booking rooms at the Nimba nature cure centre.

## How to run

```bash
npm install
npm run seed
npm run dev
```

Open http://localhost:3000.

`npm run seed` creates `data/nimba.sqlite` and replaces whatever is already in it. Run it again any time you want the demo data back.

```bash
npm test
```

## Try this

Search 20 Nov 2026 to 22 Nov 2026.

- Room 102 is booked until 20 Nov, and it still shows up. The checkout day is free.
- Room 201 has a cancelled booking, so it is free.
- Room 104 is in maintenance and never appears.
- Room 101 is taken from 10 Nov to 15 Nov. Room 301 is taken from 22 Nov to 25 Nov.

## What works

- Search rooms that are free for the whole stay, with an optional category.
- Book a room. The phone is checked in the browser and again by the API.
- Validation errors and clash errors show on the page.
- The Book button stays disabled while the request is in flight.
- After a booking, the free-room list refreshes.
- Cancel a booking from the table. A cancelled stay stops blocking the room.

## What I left out

- No login.
- No way to edit a booking, only cancel it.
- No payments, taxes, or extra guests.
- No time of day. A stay is just two dates.
- One SQLite file on this machine. It is not meant for more than one front desk.

## What I added

A current-bookings table with a Cancel button on each confirmed row. Staff can undo a mistake without opening the database, and it makes the cancelled-booking rule visible. `PATCH /api/bookings/:id` sets the status to `cancelled`. `GET /api/bookings` feeds the table.

## Assumptions

- Dates are `YYYY-MM-DD`. Comparison is calendar order, so a guest leaving on 20 Nov does not block a guest arriving on 20 Nov.
- Category is optional. Blank or `all` means every category. Otherwise it must match exactly: `Standard`, `Deluxe`, or `Suite`.
- Phone means exactly 10 digits. No `+91`, spaces, or dashes.
- A missing name, a missing room, a bad phone, a bad date, or an unknown room is **400**.
- A clash with a confirmed booking is **409**.
- A room in maintenance is also **409**, with `{ "error": "Room is under maintenance" }`. I treated that as "this room is not free", same as a clash. The room is never included in availability.
- Cancelled bookings never block a room.
- Prices are whole rupees. The total is the nightly price times the number of nights.
- `GET /api/availability` returns a JSON array of free rooms. Errors from every endpoint are `{ "error": "a readable message" }`.
- The clash check and the insert run in one SQLite `IMMEDIATE` transaction, so a second request waits and then sees the first booking.
- The database file is `data/nimba.sqlite`. It is gitignored.

## Tools I used

I used an AI coding assistant in Cursor to scaffold the Next.js app and draft the database layer, the API routes, the page, and the tests. I asked it to keep the project small: plain CSS, one shared clash function in `lib/`, and no UI library. It was most useful for the App Router setup, the `better-sqlite3` transaction, and getting the Vitest cases written against the brief.

The parts I treated as mine to understand, rather than trust unread, are the overlap rule in `lib/overlap.ts`, the immediate transaction in `createBooking`, and the status codes (400 for a bad request, 409 for a clash or a room in maintenance).
