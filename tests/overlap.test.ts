import { describe, expect, it } from 'vitest';
import { hasDateClash } from '../lib/overlap';

const confirmed = (checkIn: string, checkOut: string) => [{ checkIn, checkOut, status: 'confirmed' }];

describe('hasDateClash', () => {
  it('rejects a stay that overlaps an existing one', () => {
    const clash = hasDateClash(
      { checkIn: '2026-11-12', checkOut: '2026-11-16' },
      confirmed('2026-11-10', '2026-11-15'),
    );
    expect(clash).toBe(true);
  });

  it('allows a check-in on the day the previous guest checks out', () => {
    const clash = hasDateClash(
      { checkIn: '2026-11-20', checkOut: '2026-11-22' },
      confirmed('2026-11-16', '2026-11-20'),
    );
    expect(clash).toBe(false);
  });

  it('ignores cancelled bookings', () => {
    const clash = hasDateClash(
      { checkIn: '2026-11-12', checkOut: '2026-11-14' },
      [{ checkIn: '2026-11-10', checkOut: '2026-11-18', status: 'cancelled' }],
    );
    expect(clash).toBe(false);
  });
});
