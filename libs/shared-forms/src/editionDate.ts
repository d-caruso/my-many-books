export type EditionDateParts = [string, string, string];

/**
 * Format an edition date string for display.
 *
 * Handles flexible granularity:
 * - "2024"       → "2024"
 * - "2024-03"    → "03/2024"
 * - "2024-03-15" → "15/03/2024"
 */
export function formatEditionDate(editionDate: string | null | undefined): string {
  if (!editionDate) return '';

  if (editionDate.length === 4) {
    return editionDate;
  }

  if (editionDate.length === 7) {
    const [year, month] = editionDate.split('-');
    return `${month}/${year}`;
  }

  const [year, month, day] = editionDate.split('-');
  return `${day}/${month}/${year}`;
}
export type EditionYearStepDirection = 'up' | 'down';

export const EDITION_DATE_MONTHS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, '0')
);

export function parseEditionDateParts(value?: string): EditionDateParts {
  if (!value) {
    return ['', '', ''];
  }

  const parts = value.split('-');
  return [parts[0] ?? '', parts[1] ?? '', parts[2] ?? ''];
}

export function assembleEditionDate(
  year: string,
  month: string,
  day: string
): string {
  if (!year) {
    return '';
  }

  if (!month) {
    return year;
  }

  if (!day) {
    return `${year}-${month}`;
  }

  return `${year}-${month}-${day}`;
}

export function getCurrentEditionYear(): number {
  return new Date().getFullYear();
}

export function sanitizeEditionYearInput(rawValue: string): string {
  const normalized = rawValue.replace(/\D/g, '').slice(0, 4);
  if (!/^\d{4}$/.test(normalized)) {
    return normalized;
  }

  const numericYear = Number(normalized);
  const currentYear = getCurrentEditionYear();
  if (!Number.isInteger(numericYear) || numericYear > currentYear) {
    return String(currentYear);
  }

  return normalized;
}

export function stepEditionYear(
  currentValue: string,
  direction: EditionYearStepDirection
): string {
  const currentYear = getCurrentEditionYear();
  if (!isValidEditionDateYear(currentValue)) {
    return String(currentYear);
  }

  const delta = direction === 'up' ? 1 : -1;
  const nextYear = Math.min(currentYear, Math.max(1, Number(currentValue) + delta));
  return String(nextYear).padStart(4, '0');
}

export function isValidEditionDateYear(year: string): boolean {
  if (!/^\d{4}$/.test(year)) {
    return false;
  }

  const yearNumber = Number(year);
  return (
    Number.isInteger(yearNumber) &&
    yearNumber >= 1 &&
    yearNumber <= getCurrentEditionYear()
  );
}

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function getEditionDateDaysInMonth(
  year: string,
  month: string
): string[] {
  if (!month) {
    return [];
  }

  const monthNumber = Number(month);
  if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    return [];
  }

  let totalDays = 31;

  if ([4, 6, 9, 11].includes(monthNumber)) {
    totalDays = 30;
  } else if (monthNumber === 2) {
    const yearNumber = Number(year);
    totalDays = isValidEditionDateYear(year) && isLeapYear(yearNumber) ? 29 : 28;
  }

  return Array.from({ length: totalDays }, (_, i) =>
    String(i + 1).padStart(2, '0')
  );
}
