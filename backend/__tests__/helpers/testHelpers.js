import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User, Tenant, Employee, Branch, Department, Designation } from '../../src/models/index.js';
import { ROLES, SUBSCRIPTION_PLANS, MODULES, EMPLOYEE_STATUS, EMPLOYMENT_TYPE } from '../../src/config/constants.js';

/**
 * Create a test tenant
 */
export const createTestTenant = async (overrides = {}) => {
  const tenant = await Tenant.create({
    name: overrides.name || 'Test Organization',
    slug: overrides.slug || `test-org-${Date.now()}`,
    email: overrides.email || `test-${Date.now()}@example.com`,
    phone: overrides.phone || '+1234567890',
    industry: overrides.industry || 'Technology',
    subscription: {
      plan: overrides.plan || SUBSCRIPTION_PLANS.ENTERPRISE,
      modules: overrides.modules || Object.values(MODULES),
      startDate: new Date(),
      status: 'active',
    },
    settings: {
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    },
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    ...overrides,
  });

  return tenant;
};

/**
 * Create a test branch
 */
export const createTestBranch = async (tenant, overrides = {}) => {
  const branch = await Branch.create({
    tenant: tenant._id,
    name: overrides.name || 'Test Branch',
    code: overrides.code || `BR${Date.now()}`,
    address: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      country: 'Test Country',
      zipCode: '12345',
    },
    isActive: true,
    ...overrides,
  });

  return branch;
};

/**
 * Create a test department
 */
export const createTestDepartment = async (tenant, overrides = {}) => {
  const department = await Department.create({
    tenant: tenant._id,
    name: overrides.name || 'Test Department',
    code: overrides.code || `DEPT${Date.now()}`,
    description: 'Test department for testing',
    isActive: true,
    ...overrides,
  });

  return department;
};

/**
 * Create a test designation
 */
export const createTestDesignation = async (tenant, overrides = {}) => {
  const designation = await Designation.create({
    tenant: tenant._id,
    name: overrides.name || 'Test Position',
    code: overrides.code || `POS${Date.now()}`,
    description: 'Test designation for testing',
    level: overrides.level || 3,
    isActive: true,
    ...overrides,
  });

  return designation;
};

/**
 * Create a test user
 */
export const createTestUser = async (overrides = {}) => {
  const tenant = overrides.tenant || (await createTestTenant());

  const user = await User.create({
    email: overrides.email || `user-${Date.now()}@example.com`,
    password: overrides.password || 'Test123!@#',
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || 'User',
    phone: overrides.phone || '+1234567890',
    role: overrides.role || ROLES.EMPLOYEE,
    tenant: tenant._id,
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    isEmailVerified: overrides.isEmailVerified !== undefined ? overrides.isEmailVerified : true,
    ...overrides,
  });

  return { user, tenant };
};

/**
 * Create a test admin user
 */
export const createTestAdmin = async (overrides = {}) => {
  return createTestUser({
    role: ROLES.TENANT_ADMIN,
    ...overrides,
  });
};

/**
 * Create a test super admin
 */
export const createTestSuperAdmin = async (overrides = {}) => {
  const user = await User.create({
    email: overrides.email || `superadmin-${Date.now()}@example.com`,
    password: overrides.password || 'Test123!@#',
    firstName: overrides.firstName || 'Super',
    lastName: overrides.lastName || 'Admin',
    role: ROLES.SUPER_ADMIN,
    tenant: null,
    isActive: true,
    isEmailVerified: true,
    ...overrides,
  });

  return { user, tenant: null };
};

/**
 * Create a complete employee with all required dependencies
 */
export const createTestEmployee = async (tenant, user, overrides = {}) => {
  // Create required dependencies if not provided
  const branch = overrides.branch || await createTestBranch(tenant);
  const department = overrides.department || await createTestDepartment(tenant);
  const designation = overrides.designation || await createTestDesignation(tenant);

  const employee = await Employee.create({
    tenant: tenant._id,
    user: user._id,
    employeeId: overrides.employeeId || `EMP${Date.now()}`,
    firstName: user.firstName || 'Test',
    lastName: user.lastName || 'Employee',
    email: user.email,
    phone: user.phone || '+1234567890',
    dateOfJoining: overrides.dateOfJoining || new Date(),
    hireDate: overrides.hireDate || new Date(),
    branch: branch._id,
    department: department._id,
    designation: designation._id,
    status: overrides.status || EMPLOYEE_STATUS.ACTIVE,
    employmentType: overrides.employmentType || EMPLOYMENT_TYPE.FULL_TIME,
    ...overrides,
  });

  return { employee, branch, department, designation };
};

/**
 * Create a user with employee record (convenience method)
 */
export const createEmployeeWithUser = async (tenantOverrides = {}, userOverrides = {}, employeeOverrides = {}) => {
  const tenant = await createTestTenant(tenantOverrides);
  const { user } = await createTestUser({ tenant, ...userOverrides });
  const { employee, branch, department, designation } = await createTestEmployee(tenant, user, employeeOverrides);
  const token = generateTestToken(user._id);

  return { user, tenant, employee, branch, department, designation, token };
};

/**
 * Generate a JWT token for a user
 */
export const generateTestToken = (userId) => {
  return jwt.sign(
    { id: userId.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

/**
 * Create authenticated user with token
 */
export const createAuthenticatedUser = async (role = ROLES.EMPLOYEE, overrides = {}) => {
  const { user, tenant } = await createTestUser({ role, ...overrides });
  const token = generateTestToken(user._id);
  return { user, tenant, token };
};

/**
 * Generate a valid ObjectId
 */
export const generateObjectId = () => new mongoose.Types.ObjectId();

/**
 * Wait for a specified time (useful for testing async operations)
 */
export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Test data generators
 */
export const testData = {
  validUser: () => ({
    email: `test-${Date.now()}@example.com`,
    password: 'Test123!@#',
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890',
  }),

  validOrganization: () => ({
    organizationName: `Test Org ${Date.now()}`,
    email: `org-${Date.now()}@example.com`,
    password: 'Test123!@#',
    firstName: 'Admin',
    lastName: 'User',
    phone: '+1234567890',
    industry: 'Technology',
  }),

  invalidEmails: [
    'notanemail',
    'missing@domain',
    '@nodomain.com',
    'spaces in@email.com',
    '',
  ],

  weakPasswords: [
    '12345',
    'abc',
    '',
  ],
};
