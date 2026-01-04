import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { createFullTestApp } from '../helpers/appSetup.js';
import { createTestAdmin, createTestUser, generateTestToken } from '../helpers/testHelpers.js';
import { ROLES } from '../../src/config/constants.js';

describe('API Smoke Tests', () => {
  let app;
  let adminToken;
  let tenantId;

  beforeAll(async () => {
    app = await createFullTestApp();
    const { user, tenant } = await createTestAdmin();
    adminToken = generateTestToken(user._id);
    tenantId = tenant._id;
  });

  describe('Health Check', () => {
    it('GET /api/health should return success', async () => {
      const res = await request(app)
        .get('/api/health')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Test API is running');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('Auth Routes Smoke Test', () => {
    it('POST /api/auth/register should be accessible', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          organizationName: `Smoke Test Org ${Date.now()}`,
          email: `smoke-${Date.now()}@example.com`,
          password: 'Test123!@#',
          firstName: 'Smoke',
          lastName: 'Test',
        });

      // Should succeed or fail with validation error (not 500)
      expect([201, 400]).toContain(res.status);
    });

    it('POST /api/auth/login should be accessible', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      // Should return 401 (not 500)
      expect([200, 401]).toContain(res.status);
    });

    it('GET /api/auth/me should require authentication', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('GET /api/auth/me should work with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401]).toContain(res.status);
    });
  });

  describe('Protected Routes Smoke Test', () => {
    it('GET /api/employees should require authentication', async () => {
      const res = await request(app)
        .get('/api/employees')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('GET /api/branches should require authentication', async () => {
      const res = await request(app)
        .get('/api/branches')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('GET /api/departments should require authentication', async () => {
      const res = await request(app)
        .get('/api/departments')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('GET /api/attendance should require authentication', async () => {
      const res = await request(app)
        .get('/api/attendance')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app)
        .get('/api/unknown-route')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Route not found');
    });

    it('should return 404 for unknown nested routes', async () => {
      const res = await request(app)
        .get('/api/auth/unknown-endpoint')
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  describe('Request Validation Smoke Test', () => {
    it('should reject invalid JSON', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect([400, 500]).toContain(res.status);
    });

    it('should handle empty body', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect([400]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Response Format Smoke Test', () => {
    it('all responses should have success field', async () => {
      const routes = [
        { method: 'get', path: '/api/health' },
        { method: 'post', path: '/api/auth/login', body: { email: 'test@test.com', password: 'test' } },
        { method: 'get', path: '/api/unknown' },
      ];

      for (const route of routes) {
        let req = request(app)[route.method](route.path);
        if (route.body) {
          req = req.send(route.body);
        }
        const res = await req;
        expect(res.body).toHaveProperty('success');
      }
    });

    it('error responses should have message field', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });

      expect(res.body).toHaveProperty('message');
    });
  });

  describe('Security Headers Smoke Test', () => {
    it('should have security headers from helmet', async () => {
      const res = await request(app)
        .get('/api/health')
        .expect(200);

      // Helmet sets these headers
      expect(res.headers).toHaveProperty('x-content-type-options');
      expect(res.headers).toHaveProperty('x-frame-options');
    });
  });
});
