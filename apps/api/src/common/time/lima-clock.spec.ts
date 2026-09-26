import { describe, expect, it } from 'vitest';
import {
  endOfCivilDayInLima,
  limaDateKey,
  limaIsoWeek,
  limaYearMonthKey,
  startOfCivilDayInLima,
  startOfMonthInLima,
} from './lima-clock';

describe('startOfCivilDayInLima', () => {
  it('converts civil date string to UTC instant for Lima midnight', () => {
    const result = startOfCivilDayInLima('2025-01-15');
    expect(result.toISOString()).toBe('2025-01-15T05:00:00.000Z');
  });

  it('converts a UTC Date to Lima midnight of its civil day', () => {
    const utcDate = new Date('2025-01-15T22:00:00.000Z'); // 17:00 Lima
    const result = startOfCivilDayInLima(utcDate);
    expect(result.toISOString()).toBe('2025-01-15T05:00:00.000Z');
  });

  it('handles a date that is already Lima midnight in UTC', () => {
    const utcDate = new Date('2025-01-15T05:00:00.000Z'); // exactly Lima midnight
    const result = startOfCivilDayInLima(utcDate);
    expect(result.toISOString()).toBe('2025-01-15T05:00:00.000Z');
  });

  it('handles the day after a UTC date that crosses midnight in Lima', () => {
    // 2025-01-16T04:00:00Z = 2025-01-15T23:00:00 Lima
    const utcDate = new Date('2025-01-16T04:00:00.000Z');
    const result = startOfCivilDayInLima(utcDate);
    expect(result.toISOString()).toBe('2025-01-15T05:00:00.000Z');
  });

  it('handles leap year', () => {
    const result = startOfCivilDayInLima('2024-02-29');
    expect(result.toISOString()).toBe('2024-02-29T05:00:00.000Z');
  });
});

describe('endOfCivilDayInLima', () => {
  it('converts civil date string to UTC instant for Lima 23:59:59.999', () => {
    const result = endOfCivilDayInLima('2025-01-15');
    expect(result.toISOString()).toBe('2025-01-16T04:59:59.999Z');
  });

  it('handles end of month', () => {
    const result = endOfCivilDayInLima('2025-01-31');
    expect(result.toISOString()).toBe('2025-02-01T04:59:59.999Z');
  });

  it('handles end of year', () => {
    const result = endOfCivilDayInLima('2025-12-31');
    expect(result.toISOString()).toBe('2026-01-01T04:59:59.999Z');
  });
});

describe('startOfMonthInLima', () => {
  it('returns Lima midnight of the first day of the month', () => {
    const result = startOfMonthInLima(new Date('2025-03-15T10:00:00.000Z'));
    expect(result.toISOString()).toBe('2025-03-01T05:00:00.000Z');
  });
});

describe('limaDateKey', () => {
  it('returns YYYY-MM-DD in Lima for a UTC instant', () => {
    // 2025-01-15T22:00:00Z = 17:00 Lima, same day
    expect(limaDateKey(new Date('2025-01-15T22:00:00.000Z'))).toBe('2025-01-15');
  });

  it('returns the previous day in Lima for an early UTC morning', () => {
    // 2025-01-16T03:00:00Z = 22:00 Lima on Jan 15
    expect(limaDateKey(new Date('2025-01-16T03:00:00.000Z'))).toBe('2025-01-15');
  });

  it('returns the next day in Lima for late UTC night', () => {
    // 2025-01-15T04:00:00Z = 23:00 Lima on Jan 14
    expect(limaDateKey(new Date('2025-01-15T04:00:00.000Z'))).toBe('2025-01-14');
  });
});

describe('limaYearMonthKey', () => {
  it('returns YYYY-MM in Lima', () => {
    expect(limaYearMonthKey(new Date('2025-03-15T10:00:00.000Z'))).toBe('2025-03');
  });
});

describe('limaIsoWeek', () => {
  it('returns correct ISO week for a date in Lima', () => {
    // Monday 2025-03-10T12:00:00Z = 07:00 Lima
    const result = limaIsoWeek(new Date('2025-03-10T12:00:00.000Z'));
    expect(result).toEqual({ year: 2025, week: 11 });
  });

  it('handles ISO week crossing year boundary', () => {
    // 2025-12-31T10:00:00Z = 05:00 Lima, which is Wednesday
    // ISO week of 2025-12-31 depends if Jan 1 2026 is in week 1 of 2026
    // 2026-01-01 is Thursday, so Mon 2025-12-29 is week 1 of 2026
    // 2025-12-31 is still week 1 of 2026
    const result = limaIsoWeek(new Date('2025-12-31T10:00:00.000Z'));
    expect(result).toEqual({ year: 2026, week: 1 });
  });
});
