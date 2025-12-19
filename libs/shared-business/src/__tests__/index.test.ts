import { AuthManager, BookManager, SearchManager } from '../index';

describe('shared-business exports', () => {
  it('exports business managers', () => {
    expect(AuthManager).toBeDefined();
    expect(BookManager).toBeDefined();
    expect(SearchManager).toBeDefined();
  });
});

