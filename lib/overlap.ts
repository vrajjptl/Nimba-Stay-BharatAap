export type ClashBooking = {
  checkIn: string;
  checkOut: string;
  status: string;
};

// Dates are YYYY-MM-DD, so string order is calendar order.
// A guest leaving on 20 Nov does not block a guest arriving that same morning.
export function hasDateClash(
  requested: { checkIn: string; checkOut: string },
  existing: ClashBooking[],
): boolean {
  return existing.some((booking) => {
    if (booking.status === 'cancelled') return false;
    return requested.checkIn < booking.checkOut && requested.checkOut > booking.checkIn;
  });
}
