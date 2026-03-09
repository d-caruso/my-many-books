import { getStatusColor } from '../BookCard/BookCard.logic';

describe('BookCard.logic', () => {
  test('getStatusColor maps statuses to stable colors', () => {
    expect(getStatusColor('finished')).toBe('#2E7D32');
    expect(getStatusColor('reading')).toBe('#1976D2');
    expect(getStatusColor('paused')).toBe('#ED6C02');
    expect(getStatusColor(undefined)).toBe('#757575');
  });
});
