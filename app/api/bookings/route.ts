import { createBooking, listBookings, parseBookingBody } from '../../../lib/bookings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(listBookings());
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }

  const parsed = parseBookingBody(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: parsed.status });
  }

  const result = createBooking(parsed.value);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json(result.booking, { status: 201 });
}
