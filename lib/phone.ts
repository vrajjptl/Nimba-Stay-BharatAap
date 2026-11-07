export function isTenDigitPhone(phone: string): boolean {
  return /^\d{10}$/.test(phone);
}
