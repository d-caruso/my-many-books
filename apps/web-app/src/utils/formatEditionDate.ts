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
