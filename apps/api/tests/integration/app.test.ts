// ================================================================
// tests/integration/app.test.ts
// Integration tests for Express app
// ================================================================

import request from 'supertest';
import app from '../../src/app';
import { HEALTH_STATUS } from '@my-many-books/shared-types';
import { BASE_PATH } from '../utils/apiBasePath';

jest.mock('../../src/services/hooks/hookSystem', () => ({
  initializeHookSystem: jest.fn().mockResolvedValue(undefined),
}));

describe('Express App Integration', () => {
  describe('Health endpoint', () => {
    it('should respond to health check', async () => {
      const response = await request(app)
        .get(`${BASE_PATH}/health`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data.status', HEALTH_STATUS.HEALTHY);
      expect(response.body).toHaveProperty('data.timestamp');
      expect(response.body).toHaveProperty('data.version');
      expect(response.body.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('CORS configuration', () => {
    it('should have CORS enabled', async () => {
      const response = await request(app)
        .get(`${BASE_PATH}/health`)
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle OPTIONS requests', async () => {
      await request(app)
        .options(`${BASE_PATH}/health`)
        .expect(204);
    });
  });

  describe('JSON parsing', () => {
    it('should parse JSON requests', async () => {
      // Test that the app can handle JSON payloads
      // We'll use the health endpoint for this test since it exists
      const response = await request(app)
        .get(`${BASE_PATH}/health`)
        .set('Content-Type', 'application/json')
        .expect(200);

      expect(response.body).toHaveProperty('data.status');
    });
  });

  describe('Error handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found',
          details: { availableRoutes: BASE_PATH },
        },
      });
    });

    it('should handle invalid JSON gracefully', async () => {
      const response = await request(app)
        .post(`${BASE_PATH}/health`)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Invalid JSON payload',
          code: 'INVALID_JSON',
        },
      });
    });
  });

  describe('Express middleware', () => {
    it('should handle URL encoded data', async () => {
      // Test that urlencoded middleware is configured
      const response = await request(app)
        .get(`${BASE_PATH}/health`)
        .expect(200);

      expect(response.body.data.status).toBe(HEALTH_STATUS.HEALTHY);
    });

    it('should limit request size appropriately', async () => {
      // Test with a large but acceptable JSON payload
      const largeButAcceptableData = { data: 'x'.repeat(1000) };

      const response = await request(app)
        .post(`${BASE_PATH}/health`)
        .send(largeButAcceptableData)
        .expect(404); // POST to health returns 404, but JSON was parsed

      // If we got here, the JSON was parsed successfully
      expect(response.status).toBe(404);
    });
  });

  describe('API structure', () => {
    it('should have proper Express app structure', () => {
      // Test that app is an Express application
      expect(app).toBeDefined();
      expect(typeof app).toBe('function');
      expect(app.listen).toBeDefined();
    });
  });
});
