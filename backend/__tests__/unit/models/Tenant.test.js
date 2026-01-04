import { describe, it, expect } from '@jest/globals';
import { Tenant } from '../../../src/models/index.js';
import { SUBSCRIPTION_PLANS, MODULES } from '../../../src/config/constants.js';

describe('Tenant Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid tenant with required fields', async () => {
      const tenantData = {
        name: 'Test Organization',
        slug: 'test-org',
        email: 'org@example.com',
      };

      const tenant = await Tenant.create(tenantData);

      expect(tenant._id).toBeDefined();
      expect(tenant.name).toBe('Test Organization');
      expect(tenant.slug).toBe('test-org');
      expect(tenant.email).toBe('org@example.com');
    });

    it('should fail without required name', async () => {
      const tenant = new Tenant({
        slug: 'test-org',
        email: 'org@example.com',
      });

      await expect(tenant.save()).rejects.toThrow(/organization name is required/i);
    });

    it('should fail without required slug', async () => {
      const tenant = new Tenant({
        name: 'Test Organization',
        email: 'org@example.com',
      });

      await expect(tenant.save()).rejects.toThrow();
    });

    it('should fail without required email', async () => {
      const tenant = new Tenant({
        name: 'Test Organization',
        slug: 'test-org',
      });

      await expect(tenant.save()).rejects.toThrow(/organization email is required/i);
    });

    it('should enforce unique slug constraint', async () => {
      await Tenant.create({
        name: 'First Org',
        slug: 'unique-slug',
        email: 'first@example.com',
      });

      const duplicateTenant = new Tenant({
        name: 'Second Org',
        slug: 'unique-slug',
        email: 'second@example.com',
      });

      await expect(duplicateTenant.save()).rejects.toThrow();
    });

    it('should enforce unique email constraint', async () => {
      await Tenant.create({
        name: 'First Org',
        slug: 'first-org',
        email: 'unique@example.com',
      });

      const duplicateTenant = new Tenant({
        name: 'Second Org',
        slug: 'second-org',
        email: 'unique@example.com',
      });

      await expect(duplicateTenant.save()).rejects.toThrow();
    });

    it('should convert email to lowercase', async () => {
      const tenant = await Tenant.create({
        name: 'Test Org',
        slug: 'test-org',
        email: 'TEST@EXAMPLE.COM',
      });

      expect(tenant.email).toBe('test@example.com');
    });

    it('should convert slug to lowercase', async () => {
      const tenant = await Tenant.create({
        name: 'Test Org',
        slug: 'TEST-ORG',
        email: 'test@example.com',
      });

      expect(tenant.slug).toBe('test-org');
    });
  });

  describe('Subscription Fields', () => {
    it('should set default subscription plan to starter', async () => {
      const tenant = await Tenant.create({
        name: 'Test Org',
        slug: 'test-org',
        email: 'test@example.com',
      });

      expect(tenant.subscription.plan).toBe(SUBSCRIPTION_PLANS.STARTER);
    });

    it('should allow all valid subscription plans', async () => {
      const validPlans = Object.values(SUBSCRIPTION_PLANS);

      for (let i = 0; i < validPlans.length; i++) {
        const plan = validPlans[i];
        const tenant = await Tenant.create({
          name: `Test Org ${i}`,
          slug: `test-org-${i}`,
          email: `test${i}@example.com`,
          subscription: { plan },
        });

        expect(tenant.subscription.plan).toBe(plan);
      }
    });

    it('should allow valid modules in subscription', async () => {
      const tenant = await Tenant.create({
        name: 'Test Org',
        slug: 'test-org',
        email: 'test@example.com',
        subscription: {
          plan: SUBSCRIPTION_PLANS.ENTERPRISE,
          modules: [MODULES.HR, MODULES.PAYROLL, MODULES.ATTENDANCE],
        },
      });

      expect(tenant.subscription.modules).toContain(MODULES.HR);
      expect(tenant.subscription.modules).toContain(MODULES.PAYROLL);
      expect(tenant.subscription.modules).toContain(MODULES.ATTENDANCE);
    });

    it('should set default maxEmployees to 25', async () => {
      const tenant = await Tenant.create({
        name: 'Test Org',
        slug: 'test-org',
        email: 'test@example.com',
      });

      expect(tenant.subscription.maxEmployees).toBe(25);
    });

    it('should set default maxBranches to 1', async () => {
      const tenant = await Tenant.create({
        name: 'Test Org',
        slug: 'test-org',
        email: 'test@example.com',
      });

      expect(tenant.subscription.maxBranches).toBe(1);
    });
  });

  describe('Size Field', () => {
    it('should set default size to 1-10', async () => {
      const tenant = await Tenant.create({
        name: 'Test Org',
        slug: 'test-org',
        email: 'test@example.com',
      });

      expect(tenant.size).toBe('1-10');
    });

    it('should only allow valid size values', async () => {
      const validSizes = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

      for (let i = 0; i < validSizes.length; i++) {
        const size = validSizes[i];
        const tenant = await Tenant.create({
          name: `Test Org Size ${i}`,
          slug: `test-org-size-${i}`,
          email: `testsize${i}@example.com`,
          size,
        });

        expect(tenant.size).toBe(size);
      }
    });

    it('should reject invalid size values', async () => {
      const tenant = new Tenant({
        name: 'Test Org',
        slug: 'test-org',
        email: 'test@example.com',
        size: 'invalid-size',
      });

      await expect(tenant.save()).rejects.toThrow();
    });
  });

  describe('Trial Fields', () => {
    it('should set default trial values', async () => {
      const tenant = await Tenant.create({
        name: 'Test Org',
        slug: 'test-org',
        email: 'test@example.com',
      });

      expect(tenant.trial.isOnTrial).toBe(true);
      expect(tenant.trial.trialDays).toBe(3);
      expect(tenant.trial.hasExpired).toBe(false);
      expect(tenant.trial.convertedToPaid).toBe(false);
    });
  });

  describe('Address Fields', () => {
    it('should save address fields correctly', async () => {
      const tenant = await Tenant.create({
        name: 'Test Org',
        slug: 'test-org',
        email: 'test@example.com',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          zipCode: '10001',
        },
      });

      expect(tenant.address.street).toBe('123 Main St');
      expect(tenant.address.city).toBe('New York');
      expect(tenant.address.state).toBe('NY');
      expect(tenant.address.country).toBe('USA');
      expect(tenant.address.zipCode).toBe('10001');
    });
  });

  describe('Active Status', () => {
    it('should set default isActive to true', async () => {
      const tenant = await Tenant.create({
        name: 'Test Org',
        slug: 'test-org',
        email: 'test@example.com',
      });

      expect(tenant.isActive).toBe(true);
    });

    it('should allow setting isActive to false', async () => {
      const tenant = await Tenant.create({
        name: 'Test Org',
        slug: 'test-org',
        email: 'test@example.com',
        isActive: false,
      });

      expect(tenant.isActive).toBe(false);
    });
  });
});
