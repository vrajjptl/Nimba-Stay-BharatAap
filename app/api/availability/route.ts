import { findAvailableRooms } from '../../../lib/availability';
import { validateStayDates } from '../../../lib/dates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const checkIn = url.searchParams.get('checkIn');
  const checkOut = url.searchParams.get('checkOut');
  const dateError = validateStayDates(checkIn, checkOut);
  if (dateError) {
    return Response.json({ error: dateError }, { status: 400 });
  }

  const rawCategory = url.searchParams.get('category')?.trim() ?? '';
  const category = rawCategory && rawCategory.toLowerCase() !== 'all' ? rawCategory : undefined;
  const rooms = findAvailableRooms(checkIn as string, checkOut as string, category);
  return Response.json(rooms);
}
