import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { createTestApp } from '../helpers/appSetup.js';
import { createTestUser, createTestAdmin, testData, generateTestToken } from '../helpers/testHelpers.js';
import { User, Tenant } from '../../src/models/index.js';
import { ROLES } from '../../src/config/constants.js';

describe('Auth API Integration Tests', () => {
  let app;

  beforeAll(async () => {
    const { default: authRoutes } = await import('../../src/routes/auth.js');
    app = createTestApp({ '/api/auth': authRoutes });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new organization and admin user successfully', async () => {
      const orgData = testData.validOrganization();

      const res = await request(app)
        .post('/api/auth/register')
        .send(orgData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Organization registered successfully');
      expect(res.body.data.user.email).toBe(orgData.email.toLowerCase());
      expect(res.body.data.user.role).toBe(ROLES.TENANT_ADMIN);
      expect(res.body.data.tenant.name).toBe(orgData.organizationName);
      expect(res.body.data.token).toBeDefined();
    });

    it('should fail with missing organization name', async () => {
      const orgData = testData.validOrganization();
      delete orgData.organizationName;

      const res = await request(app)
        .post('/api/auth/register')
        .send(orgData)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Organization name is required');
    });

    it('should fail with invalid email', async () => {
      const orgData = testData.validOrganization();
      orgData.email = 'invalid-email';

      const res = await request(app)
        .post('/api/auth/register')
        .send(orgData)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('valid email');
    });

    it('should fail with short password', async () => {
      const orgData = testData.validOrganization();
      orgData.password = '12345';

      const res = await request(app)
        .post('/api/auth/register')
        .send(orgData)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('at least 6 characters');
    });

    it('should fail with missing first name', async () => {
      const orgData = testData.validOrganization();
      delete orgData.firstName;

      const res = await request(app)
        .post('/api/auth/register')
        .send(orgData)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('First name is required');
    });

    it('should fail with missing last name', async () => {
      const orgData = testData.validOrganization();
      delete orgData.lastName;

      const res = await request(app)
        .post('/api/auth/register')
        .send(orgData)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Last name is required');
    });

    it('should fail with duplicate email', async () => {
      const orgData = testData.validOrganization();

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(orgData)
        .expect(201);

      // Second registration with same email
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...orgData,
          organizationName: 'Different Org',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Email already registered');
    });

    it('should generate unique slug for duplicate organization names', async () => {
      const orgData1 = {
        ...testData.validOrganization(),
        organizationName: 'Test Company',
        email: 'test1@example.com',
      };

      const orgData2 = {
        ...testData.validOrganization(),
        organizationName: 'Test Company',
        email: 'test2@example.com',
      };

      const res1 = await request(app)
        .post('/api/auth/register')
        .send(orgData1)
        .expect(201);

      const res2 = await request(app)
        .post('/api/auth/register')
        .send(orgData2)
        .expect(201);

      expect(res1.body.data.tenant.slug).toBe('test-company');
      expect(res2.body.data.tenant.slug).toBe('test-company-1');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const { user, tenant } = await createTestUser({
        email: 'login@example.com',
        password: 'Test123!@#',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Test123!@#',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.data.user.email).toBe('login@example.com');
      expect(res.body.data.token).toBeDefined();
    });

    it('should fail with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test123!@#',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should fail with invalid password', async () => {
      await createTestUser({
        email: 'wrongpass@example.com',
        password: 'Test123!@#',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrongpass@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should fail when user is deactivated', async () => {
      await createTestUser({
        email: 'inactive@example.com',
        password: 'Test123!@#',
        isActive: false,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inactive@example.com',
          password: 'Test123!@#',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Your account has been deactivated');
    });

    it('should fail when tenant is inactive', async () => {
      const tenant = await Tenant.create({
        name: 'Inactive Org',
        slug: `inactive-org-${Date.now()}`,
        email: `inactive-org-${Date.now()}@example.com`,
        isActive: false,
      });

      await User.create({
        email: 'inactivetenant@example.com',
        password: 'Test123!@#',
        firstName: 'Test',
        lastName: 'User',
        tenant: tenant._id,
        isActive: true,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inactivetenant@example.com',
          password: 'Test123!@#',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Organization subscription is inactive');
    });

    it('should set authentication cookie on successful login', async () => {
      await createTestUser({
        email: 'cookie@example.com',
        password: 'Test123!@#',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'cookie@example.com',
          password: 'Test123!@#',
        })
        .expect(200);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(cookie => cookie.startsWith('token='))).toBe(true);
    });

    it('should update lastLogin timestamp', async () => {
      const { user } = await createTestUser({
        email: 'lastlogin@example.com',
        password: 'Test123!@#',
      });

      const beforeLogin = user.lastLogin;

      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'lastlogin@example.com',
          password: 'Test123!@#',
        })
        .expect(200);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.lastLogin).toBeDefined();
      expect(updatedUser.lastLogin).not.toEqual(beforeLogin);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user when authenticated', async () => {
      const { user, token } = await createTestUser({
        email: 'me@example.com',
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
      }).then(async ({ user, tenant }) => {
        const token = generateTestToken(user._id);
        return { user, tenant, token };
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('me@example.com');
      expect(res.body.data.firstName).toBe('John');
      expect(res.body.data.lastName).toBe('Doe');
    });

    it('should fail without authentication token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Not authorized to access this route');
    });

    it('should fail with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear authentication cookie', async () => {
      const { user, tenant } = await createTestUser({
        email: 'logout@example.com',
        password: 'Test123!@#',
      });
      const token = generateTestToken(user._id);

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logged out successfully');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(cookie => cookie.includes('token=;'))).toBe(true);
    });
  });

  describe('PUT /api/auth/password', () => {
    it('should change password successfully', async () => {
      const { user, tenant } = await createTestUser({
        email: 'changepass@example.com',
        password: 'OldPass123!',
      });
      const token = generateTestToken(user._id);

      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'OldPass123!',
          newPassword: 'NewPass456!',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Password changed successfully');

      // Verify new password works
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'changepass@example.com',
          password: 'NewPass456!',
        })
        .expect(200);

      expect(loginRes.body.success).toBe(true);
    });

    it('should fail with incorrect current password', async () => {
      const { user, tenant } = await createTestUser({
        email: 'wrongcurrent@example.com',
        password: 'Correct123!',
      });
      const token = generateTestToken(user._id);

      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'Wrong123!',
          newPassword: 'NewPass456!',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Current password is incorrect');
    });

    it('should fail with short new password', async () => {
      const { user, tenant } = await createTestUser({
        email: 'shortpass@example.com',
        password: 'OldPass123!',
      });
      const token = generateTestToken(user._id);

      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'OldPass123!',
          newPassword: '12345',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should update profile successfully', async () => {
      const { user, tenant } = await createTestUser({
        email: 'profile@example.com',
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
      });
      const token = generateTestToken(user._id);

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '+9876543210',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe('Jane');
      expect(res.body.data.lastName).toBe('Smith');
      expect(res.body.data.phone).toBe('+9876543210');
    });
  });
});
