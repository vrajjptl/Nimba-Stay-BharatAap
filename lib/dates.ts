const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function validateStayDates(checkIn: unknown, checkOut: unknown): string | null {
  if (typeof checkIn !== 'string' || typeof checkOut !== 'string' || checkIn === '' || checkOut === '') {
    return 'Check-in and check-out are required';
  }
  if (!isValidDate(checkIn) || !isValidDate(checkOut)) {
    return 'Check-in and check-out must be real dates in YYYY-MM-DD form';
  }
  if (checkOut <= checkIn) {
    return 'Check-out must be after check-in';
  }
  return null;
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const [startYear, startMonth, startDay] = checkIn.split('-').map(Number);
  const [endYear, endMonth, endDay] = checkOut.split('-').map(Number);
  const start = Date.UTC(startYear, startMonth - 1, startDay);
  const end = Date.UTC(endYear, endMonth - 1, endDay);
  return Math.round((end - start) / 86_400_000);
}
