import { cancelBooking } from '../../../../lib/bookings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: 'Booking id is invalid' }, { status: 400 });
  }

  const result = cancelBooking(id);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json(result.booking);
}
