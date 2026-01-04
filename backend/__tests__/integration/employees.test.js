import { describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createTestApp } from '../helpers/appSetup.js';
import { createTestAdmin, generateTestToken, createTestTenant } from '../helpers/testHelpers.js';
import { Employee, User, Branch, Department, Designation } from '../../src/models/index.js';
import { ROLES, EMPLOYEE_STATUS, EMPLOYMENT_TYPE } from '../../src/config/constants.js';

describe('Employees API Integration Tests', () => {
  let app;
  let adminToken;
  let tenant;
  let branch;
  let department;
  let designation;

  beforeAll(async () => {
    const { default: employeeRoutes } = await import('../../src/routes/employees.js');
    app = createTestApp({ '/api/employees': employeeRoutes });
  });

  beforeEach(async () => {
    const adminData = await createTestAdmin();
    adminToken = generateTestToken(adminData.user._id);
    tenant = adminData.tenant;

    branch = await Branch.create({
      name: 'Head Office',
      code: 'HO',
      tenant: tenant._id,
      isActive: true,
    });

    department = await Department.create({
      name: 'Engineering',
      code: 'ENG',
      tenant: tenant._id,
      isActive: true,
    });

    designation = await Designation.create({
      name: 'Software Engineer',
      code: 'SE',
      level: 3,
      tenant: tenant._id,
      isActive: true,
    });
  });

  // Helper to create employee with required user
  const createEmployeeWithUser = async (overrides = {}) => {
    const email = overrides.email || `emp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
    const user = await User.create({
      email,
      password: 'Test123!@#',
      firstName: overrides.firstName || 'Test',
      lastName: overrides.lastName || 'Employee',
      tenant: tenant._id,
      role: ROLES.EMPLOYEE,
    });

    const employee = await Employee.create({
      employeeId: overrides.employeeId || `EMP${Date.now()}`,
      firstName: overrides.firstName || 'Test',
      lastName: overrides.lastName || 'Employee',
      email,
      tenant: tenant._id,
      user: user._id,
      branch: branch._id,
      department: department._id,
      designation: designation._id,
      dateOfJoining: new Date(),
      hireDate: new Date(),
      status: overrides.status || EMPLOYEE_STATUS.ACTIVE,
      employmentType: overrides.employmentType || EMPLOYMENT_TYPE.FULL_TIME,
    });

    return { employee, user };
  };

  describe('GET /api/employees', () => {
    it('should return empty list when no employees exist', async () => {
      const res = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should return employees for the tenant', async () => {
      await createEmployeeWithUser({
        employeeId: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
      });

      const res = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].firstName).toBe('John');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/employees')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should paginate results correctly', async () => {
      for (let i = 0; i < 15; i++) {
        await createEmployeeWithUser({
          employeeId: `EMP${String(i).padStart(3, '0')}`,
          firstName: `Employee${i}`,
        });
      }

      const res = await request(app)
        .get('/api/employees?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(10);
      expect(res.body.pagination.total).toBe(15);
      expect(res.body.pagination.pages).toBe(2);
    });

    it('should search employees by name', async () => {
      await createEmployeeWithUser({ employeeId: 'EMP001', firstName: 'Alice' });
      await createEmployeeWithUser({ employeeId: 'EMP002', firstName: 'Bob' });

      const res = await request(app)
        .get('/api/employees?search=Alice')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].firstName).toBe('Alice');
    });
  });

  describe('GET /api/employees/:id', () => {
    it('should return a specific employee', async () => {
      const { employee } = await createEmployeeWithUser({
        employeeId: 'EMP004',
        firstName: 'Bob',
        lastName: 'Wilson',
      });

      const res = await request(app)
        .get(`/api/employees/${employee._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe('Bob');
      expect(res.body.data.employeeId).toBe('EMP004');
    });

    it('should return 404 for non-existent employee', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .get(`/api/employees/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/employees/stats', () => {
    it('should return employee statistics', async () => {
      await createEmployeeWithUser({ employeeId: 'EMP001', status: EMPLOYEE_STATUS.ACTIVE });
      await createEmployeeWithUser({ employeeId: 'EMP002', status: EMPLOYEE_STATUS.ACTIVE });
      await createEmployeeWithUser({ employeeId: 'EMP003', status: EMPLOYEE_STATUS.ON_LEAVE });

      const res = await request(app)
        .get('/api/employees/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.totalEmployees).toBe(3);
      expect(res.body.data.activeEmployees).toBe(2);
      expect(res.body.data.onLeaveEmployees).toBe(1);
    });
  });

  describe('Multi-tenant Data Isolation', () => {
    it('should not return employees from different tenant', async () => {
      // Create employee in current tenant
      await createEmployeeWithUser({ employeeId: 'EMP001', firstName: 'MyEmployee' });

      // Create employee in different tenant
      const otherTenant = await createTestTenant({ name: 'Other Org' });
      const otherUser = await User.create({
        email: `other-${Date.now()}@example.com`,
        password: 'Test123!@#',
        firstName: 'Other',
        lastName: 'User',
        tenant: otherTenant._id,
        role: ROLES.EMPLOYEE,
      });
      await Employee.create({
        employeeId: 'OTHER001',
        firstName: 'OtherTenantEmployee',
        lastName: 'User',
        email: otherUser.email,
        tenant: otherTenant._id,
        user: otherUser._id,
        branch: branch._id,
        department: department._id,
        designation: designation._id,
        dateOfJoining: new Date(),
        hireDate: new Date(),
        status: EMPLOYEE_STATUS.ACTIVE,
        employmentType: EMPLOYMENT_TYPE.FULL_TIME,
      });

      const res = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].firstName).toBe('MyEmployee');
    });
  });
});
