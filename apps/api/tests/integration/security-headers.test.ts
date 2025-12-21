// ================================================================
// tests/integration/security-headers.test.ts
// Integration tests for security headers
// ================================================================

process.env['SECURITY_HEADERS_ENABLED'] = 'true';

import request from 'supertest';
import app from '../../src/app';

describe('Security Headers', () => {
  it('should include security headers on health endpoint', async () => {
    const response = await request(app).get('/api/v1/health').expect(200);

    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['referrer-policy']).toBe('same-origin');
    expect(response.headers['strict-transport-security']).toBeDefined();
  });
});
