import { contractFixtures } from './mswHandlers';

describe('MSW contract fixtures', () => {
  it('should build valid response fixtures', () => {
    expect(contractFixtures.booksResponse.success).toBe(true);
    expect(contractFixtures.authorsResponse.success).toBe(true);
    expect(contractFixtures.categoriesResponse.success).toBe(true);
    expect(contractFixtures.settingsResponse.success).toBe(true);
    expect(contractFixtures.userProfileResponse.success).toBe(true);
    expect(contractFixtures.loginResponse.success).toBe(true);
    expect(contractFixtures.registerResponse.success).toBe(true);
    expect(contractFixtures.refreshResponse.success).toBe(true);
    expect(contractFixtures.logoutResponse.success).toBe(true);
    expect(contractFixtures.healthResponse.success).toBe(true);
    expect(contractFixtures.googleStartMobileResponse.success).toBe(true);
    expect(contractFixtures.googleMobileExchangeResponse.success).toBe(true);
  });
});

