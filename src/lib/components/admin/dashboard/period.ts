export type GroupPeriod = 'per_day' | 'per_week' | 'per_month' | 'per_year';

export const GROUP_OPTIONS: { value: GroupPeriod; label: string }[] = [
  { value: 'per_day', label: 'Daily' },
  { value: 'per_week', label: 'Weekly' },
  { value: 'per_month', label: 'Monthly' },
  { value: 'per_year', label: 'Yearly' },
];

/** Local calendar date as YYYY-MM-DD (avoids the UTC shift of toISOString). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse a Postgres `date` ("YYYY-MM-DD") as a local date. */
export function parseISODate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** First day of the month, eleven months back: a rolling 12-month window. */
export function defaultStartDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 11, 1);
}

export function formatPeriod(value: string, group: GroupPeriod): string {
  const date = parseISODate(value);
  switch (group) {
    case 'per_day':
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    case 'per_week':
      return `Wk of ${date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`;
    case 'per_month':
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    case 'per_year':
      return String(date.getFullYear());
  }
}
