export const LIMA_TZ = 'America/Lima';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: LIMA_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function limaParts(date: Date): { year: number; month: number; day: number } {
  const parts = DATE_FORMATTER.formatToParts(date);
  return {
    year: Number(parts.find((p) => p.type === 'year')!.value),
    month: Number(parts.find((p) => p.type === 'month')!.value),
    day: Number(parts.find((p) => p.type === 'day')!.value),
  };
}

function parseIsoDate(value: string): { year: number; month: number; day: number } {
  const [y, m, d] = value.split('-').map(Number);
  return { year: y, month: m, day: d };
}

export function startOfCivilDayInLima(input: Date | string): Date {
  const { year, month, day } =
    typeof input === 'string' ? parseIsoDate(input) : limaParts(input);
  return new Date(Date.UTC(year, month - 1, day, 5, 0, 0, 0));
}

export function endOfCivilDayInLima(input: Date | string): Date {
  const { year, month, day } =
    typeof input === 'string' ? parseIsoDate(input) : limaParts(input);
  return new Date(Date.UTC(year, month - 1, day + 1, 4, 59, 59, 999));
}

export function startOfMonthInLima(input: Date = new Date()): Date {
  const { year, month } = limaParts(input);
  return new Date(Date.UTC(year, month - 1, 1, 5, 0, 0, 0));
}

export function limaDateKey(instant: Date): string {
  return DATE_FORMATTER.format(instant);
}

export function limaYearMonthKey(instant: Date): string {
  return limaDateKey(instant).slice(0, 7);
}

export function limaIsoWeek(instant: Date): { year: number; week: number } {
  const { year, month, day } = limaParts(instant);
  const target = new Date(year, month - 1, day);
  const dayNr = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const isoYear = target.getFullYear();
  const firstThursday = new Date(isoYear, 0, 4);
  const firstDayNr = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNr + 3);
  const week =
    1 +
    Math.round(
      (target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
  return { year: isoYear, week };
}
