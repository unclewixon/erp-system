import { describe, it, expect, beforeEach } from '@jest/globals';
import { User, Tenant } from '../../../src/models/index.js';
import { ROLES } from '../../../src/config/constants.js';
import { createTestTenant } from '../../helpers/testHelpers.js';

describe('User Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid user with required fields', async () => {
      const tenant = await createTestTenant();
      const userData = {
        email: 'test@example.com',
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
        tenant: tenant._id,
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe('test@example.com');
      expect(savedUser.firstName).toBe('John');
      expect(savedUser.lastName).toBe('Doe');
      expect(savedUser.role).toBe(ROLES.EMPLOYEE); // default role
      expect(savedUser.isActive).toBe(true);
    });

    it('should fail without required email', async () => {
      const user = new User({
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
      });

      await expect(user.save()).rejects.toThrow(/email is required/i);
    });

    it('should fail without required password', async () => {
      const user = new User({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });

      await expect(user.save()).rejects.toThrow(/password is required/i);
    });

    it('should fail without required firstName', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'Test123!@#',
        lastName: 'Doe',
      });

      await expect(user.save()).rejects.toThrow(/first name is required/i);
    });

    it('should fail without required lastName', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'Test123!@#',
        firstName: 'John',
      });

      await expect(user.save()).rejects.toThrow(/last name is required/i);
    });

    it('should fail with password less than 6 characters', async () => {
      const user = new User({
        email: 'test@example.com',
        password: '12345',
        firstName: 'John',
        lastName: 'Doe',
      });

      await expect(user.save()).rejects.toThrow(/at least 6 characters/i);
    });

    it('should enforce unique email constraint', async () => {
      const tenant = await createTestTenant();
      const userData = {
        email: 'unique@example.com',
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
        tenant: tenant._id,
      };

      await User.create(userData);

      const duplicateUser = new User({
        ...userData,
        firstName: 'Jane',
      });

      await expect(duplicateUser.save()).rejects.toThrow();
    });

    it('should convert email to lowercase', async () => {
      const tenant = await createTestTenant();
      const user = await User.create({
        email: 'TEST@EXAMPLE.COM',
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
        tenant: tenant._id,
      });

      expect(user.email).toBe('test@example.com');
    });

    it('should trim whitespace from fields', async () => {
      const tenant = await createTestTenant();
      const user = await User.create({
        email: '  test@example.com  ',
        password: 'Test123!@#',
        firstName: '  John  ',
        lastName: '  Doe  ',
        tenant: tenant._id,
      });

      expect(user.email).toBe('test@example.com');
      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Doe');
    });

    it('should only allow valid roles', async () => {
      const tenant = await createTestTenant();
      const user = new User({
        email: 'test@example.com',
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
        role: 'invalid_role',
        tenant: tenant._id,
      });

      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const tenant = await createTestTenant();
      const plainPassword = 'Test123!@#';
      const user = await User.create({
        email: 'test@example.com',
        password: plainPassword,
        firstName: 'John',
        lastName: 'Doe',
        tenant: tenant._id,
      });

      // Fetch user with password
      const userWithPassword = await User.findById(user._id).select('+password');

      expect(userWithPassword.password).not.toBe(plainPassword);
      expect(userWithPassword.password).toMatch(/^\$2[aby]?\$\d+\$/); // bcrypt hash pattern
    });

    it('should not rehash password if not modified', async () => {
      const tenant = await createTestTenant();
      const user = await User.create({
        email: 'test@example.com',
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
        tenant: tenant._id,
      });

      const originalPassword = (await User.findById(user._id).select('+password')).password;

      // Update user without changing password
      user.firstName = 'Jane';
      await user.save();

      const updatedPassword = (await User.findById(user._id).select('+password')).password;

      expect(updatedPassword).toBe(originalPassword);
    });
  });

  describe('comparePassword Method', () => {
    it('should return true for correct password', async () => {
      const tenant = await createTestTenant();
      const plainPassword = 'Test123!@#';
      const user = await User.create({
        email: 'test@example.com',
        password: plainPassword,
        firstName: 'John',
        lastName: 'Doe',
        tenant: tenant._id,
      });

      const userWithPassword = await User.findById(user._id).select('+password');
      const isMatch = await userWithPassword.comparePassword(plainPassword);

      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const tenant = await createTestTenant();
      const user = await User.create({
        email: 'test@example.com',
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
        tenant: tenant._id,
      });

      const userWithPassword = await User.findById(user._id).select('+password');
      const isMatch = await userWithPassword.comparePassword('wrongpassword');

      expect(isMatch).toBe(false);
    });
  });

  describe('Virtual Fields', () => {
    it('should return fullName virtual', async () => {
      const tenant = await createTestTenant();
      const user = await User.create({
        email: 'test@example.com',
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
        tenant: tenant._id,
      });

      expect(user.fullName).toBe('John Doe');
    });

    it('should include virtuals in JSON output', async () => {
      const tenant = await createTestTenant();
      const user = await User.create({
        email: 'test@example.com',
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
        tenant: tenant._id,
      });

      const userJSON = user.toJSON();
      expect(userJSON.fullName).toBe('John Doe');
    });
  });

  describe('Default Values', () => {
    it('should set default role to employee', async () => {
      const tenant = await createTestTenant();
      const user = await User.create({
        email: 'test@example.com',
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
        tenant: tenant._id,
      });

      expect(user.role).toBe(ROLES.EMPLOYEE);
    });

    it('should set default isActive to true', async () => {
      const tenant = await createTestTenant();
      const user = await User.create({
        email: 'test@example.com',
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
        tenant: tenant._id,
      });

      expect(user.isActive).toBe(true);
    });

    it('should set default isEmailVerified to false', async () => {
      const tenant = await createTestTenant();
      const user = await User.create({
        email: 'test@example.com',
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
        tenant: tenant._id,
      });

      expect(user.isEmailVerified).toBe(false);
    });
  });

  describe('Roles', () => {
    it('should allow all valid roles', async () => {
      const tenant = await createTestTenant();
      const validRoles = Object.values(ROLES);

      for (const role of validRoles) {
        const user = await User.create({
          email: `test-${role}@example.com`,
          password: 'Test123!@#',
          firstName: 'John',
          lastName: 'Doe',
          role: role,
          tenant: role === ROLES.SUPER_ADMIN ? null : tenant._id,
        });

        expect(user.role).toBe(role);
      }
    });
  });
});
