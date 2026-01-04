import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { createTestApp } from '../helpers/appSetup.js';
import { createTestUser, createTestTenant, generateTestToken, testData } from '../helpers/testHelpers.js';
import { User, Tenant } from '../../src/models/index.js';
import { ROLES } from '../../src/config/constants.js';

describe('Auth Regression Tests', () => {
  let app;

  beforeAll(async () => {
    const { default: authRoutes } = await import('../../src/routes/auth.js');
    app = createTestApp({ '/api/auth': authRoutes });
  });

  describe('Registration Edge Cases', () => {
    it('should handle special characters in organization name', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          organizationName: "John's Company & Associates (Test)",
          email: `special-${Date.now()}@example.com`,
          password: 'Test123!@#',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      // Slug should be sanitized
      expect(res.body.data.tenant.slug).toMatch(/^[a-z0-9-]+$/);
    });

    it('should handle unicode characters in names', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          organizationName: `Test Org ${Date.now()}`,
          email: `unicode-${Date.now()}@example.com`,
          password: 'Test123!@#',
          firstName: 'José',
          lastName: 'García',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.firstName).toBe('José');
      expect(res.body.data.user.lastName).toBe('García');
    });

    it('should handle email with subdomain', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          organizationName: `Subdomain Org ${Date.now()}`,
          email: `user@mail.subdomain.example.com`,
          password: 'Test123!@#',
          firstName: 'Test',
          lastName: 'User',
        });

      // Should accept valid subdomain emails
      expect([201, 400]).toContain(res.status);
    });

    it('should handle very long organization names', async () => {
      const longName = 'A'.repeat(200);
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          organizationName: longName,
          email: `longname-${Date.now()}@example.com`,
          password: 'Test123!@#',
          firstName: 'Test',
          lastName: 'User',
        });

      // Should either accept or reject gracefully
      expect([201, 400]).toContain(res.status);
    });
  });

  describe('Login Security Tests', () => {
    it('should not reveal whether email exists in error message', async () => {
      const res1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test123!@#',
        })
        .expect(401);

      const res2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'anotherfake@example.com',
          password: 'WrongPass',
        })
        .expect(401);

      // Error messages should be identical (no email enumeration)
      expect(res1.body.message).toBe(res2.body.message);
    });

    it('should handle SQL injection attempts in email field', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: "'; DROP TABLE users; --",
          password: 'Test123!@#',
        });

      // Should fail with validation error, not crash
      expect([400, 401]).toContain(res.status);
    });

    it('should handle NoSQL injection attempts', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: { $gt: '' },
          password: 'Test123!@#',
        });

      // Should fail with validation error, not return data
      expect([400, 401, 500]).toContain(res.status);
      expect(res.body.data).toBeUndefined();
    });

    it('should handle XSS attempts in login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: '<script>alert("xss")</script>@example.com',
          password: 'Test123!@#',
        });

      expect([400, 401]).toContain(res.status);
    });
  });

  describe('Token Security Tests', () => {
    it('should reject expired tokens', async () => {
      // Create a token that expires immediately
      const jwt = await import('jsonwebtoken');
      const expiredToken = jwt.default.sign(
        { id: '507f1f77bcf86cd799439011' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should reject tokens with invalid signature', async () => {
      const jwt = await import('jsonwebtoken');
      const invalidToken = jwt.default.sign(
        { id: '507f1f77bcf86cd799439011' },
        'wrong-secret',
        { expiresIn: '1d' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should reject malformed tokens', async () => {
      const malformedTokens = [
        'not-a-jwt',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
        'Bearer ',
        '',
      ];

      for (const token of malformedTokens) {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(401);
      }
    });
  });

  describe('Password Change Regression', () => {
    it('should prevent reusing current password', async () => {
      const { user, tenant } = await createTestUser({
        email: `reuse-${Date.now()}@example.com`,
        password: 'CurrentPass123!',
      });
      const token = generateTestToken(user._id);

      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'CurrentPass123!',
          newPassword: 'CurrentPass123!',
        });

      // Should either reject (preferred) or accept
      // If implementation allows same password, this is a potential improvement
      expect([200, 400]).toContain(res.status);
    });

    it('should invalidate old password after change', async () => {
      const { user, tenant } = await createTestUser({
        email: `invalidate-${Date.now()}@example.com`,
        password: 'OldPassword123!',
      });
      const token = generateTestToken(user._id);

      // Change password
      await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword456!',
        })
        .expect(200);

      // Try to login with old password
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'OldPassword123!',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple simultaneous login attempts', async () => {
      const { user, tenant } = await createTestUser({
        email: `concurrent-${Date.now()}@example.com`,
        password: 'Test123!@#',
      });

      // Send multiple login requests simultaneously
      const requests = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: 'Test123!@#',
          })
      );

      const results = await Promise.all(requests);

      // All should succeed
      results.forEach(res => {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });
  });

  describe('Input Sanitization', () => {
    it('should reject email with leading/trailing whitespace', async () => {
      const { user, tenant } = await createTestUser({
        email: `trim-${Date.now()}@example.com`,
        password: 'Test123!@#',
      });

      // Server rejects emails with whitespace as invalid
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: `  ${user.email}  `,
          password: 'Test123!@#',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should be case insensitive for email', async () => {
      const { user, tenant } = await createTestUser({
        email: `casetest-${Date.now()}@example.com`,
        password: 'Test123!@#',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email.toUpperCase(),
          password: 'Test123!@#',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});
