import { contractFixtures } from './mswHandlers';

describe('MSW contract fixtures', () => {
  it('should build valid response fixtures', () => {
    expect(contractFixtures.booksResponse.success).toBe(true);
    expect(contractFixtures.authorsResponse.success).toBe(true);
    expect(contractFixtures.categoriesResponse.success).toBe(true);
    expect(contractFixtures.settingsResponse.success).toBe(true);
    expect(contractFixtures.userProfileResponse.success).toBe(true);
  });
});

