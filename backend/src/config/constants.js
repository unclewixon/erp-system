export const ROLES = {
  SUPER_ADMIN: 'super_admin',      // Platform owner - manages all tenants
  TENANT_ADMIN: 'tenant_admin',     // Organization admin - full access to their org
  HR_MANAGER: 'hr_manager',         // HR department head
  HR_OFFICER: 'hr_officer',         // HR staff
  DEPARTMENT_HEAD: 'department_head', // Department manager
  TEAM_LEAD: 'team_lead',           // Team supervisor
  EMPLOYEE: 'employee',             // Regular employee
};

export const MODULES = {
  HR: 'hr_management',
  PAYROLL: 'payroll',
  RECRUITMENT: 'recruitment',
  PERFORMANCE: 'performance',
  TRAINING: 'training',
  ATTENDANCE: 'attendance',
  LEAVE: 'leave_management',
  ASSETS: 'asset_management',
  INVENTORY: 'inventory',
  ACCOUNTING: 'accounting',
  CRM: 'crm',
  PROJECT: 'project_management',
};

export const SUBSCRIPTION_PLANS = {
  STARTER: 'starter',       // Basic HR + Attendance
  PROFESSIONAL: 'professional', // + Payroll + Leave + Performance
  ENTERPRISE: 'enterprise',   // All modules
};

export const EMPLOYEE_STATUS = {
  ACTIVE: 'active',
  ON_LEAVE: 'on_leave',
  SUSPENDED: 'suspended',
  TERMINATED: 'terminated',
  RESIGNED: 'resigned',
  PROBATION: 'probation',
};

export const EMPLOYMENT_TYPE = {
  FULL_TIME: 'full_time',
  PART_TIME: 'part_time',
  CONTRACT: 'contract',
  INTERN: 'intern',
  CONSULTANT: 'consultant',
};

export const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
};

export const MARITAL_STATUS = {
  SINGLE: 'single',
  MARRIED: 'married',
  DIVORCED: 'divorced',
  WIDOWED: 'widowed',
};
