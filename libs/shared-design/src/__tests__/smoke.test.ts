import { themes, BOOK_STATUS_COLORS, getStatusColor } from '../index';

describe('shared-design exports', () => {
  test('exports themes', () => {
    expect(themes).toBeDefined();
  });

  test('exports BOOK_STATUS_COLORS and getStatusColor', () => {
    expect(BOOK_STATUS_COLORS).toBeDefined();
    expect(getStatusColor).toBeInstanceOf(Function);
  });
});
