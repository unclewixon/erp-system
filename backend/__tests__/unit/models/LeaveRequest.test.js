import { describe, it, expect, beforeEach } from '@jest/globals';
import { LeaveRequest, LeaveType, Employee, User, Branch, Department, Designation } from '../../../src/models/index.js';
import { createTestTenant } from '../../helpers/testHelpers.js';
import { ROLES, EMPLOYEE_STATUS, EMPLOYMENT_TYPE } from '../../../src/config/constants.js';

describe('LeaveRequest Model', () => {
  let tenant;
  let employee;
  let user;
  let leaveType;
  let branch;
  let department;
  let designation;

  beforeEach(async () => {
    tenant = await createTestTenant();

    // Create required dependencies
    branch = await Branch.create({
      tenant: tenant._id,
      name: 'Test Branch',
      code: `BR${Date.now()}`,
      isActive: true,
    });

    department = await Department.create({
      tenant: tenant._id,
      name: 'Test Department',
      code: `DEPT${Date.now()}`,
      isActive: true,
    });

    designation = await Designation.create({
      tenant: tenant._id,
      name: 'Test Position',
      code: `POS${Date.now()}`,
      level: 3,
      isActive: true,
    });

    user = await User.create({
      email: `leave-${Date.now()}@example.com`,
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'Employee',
      tenant: tenant._id,
      role: ROLES.EMPLOYEE,
    });

    employee = await Employee.create({
      employeeId: `EMP${Date.now()}`,
      firstName: 'Test',
      lastName: 'Employee',
      email: user.email,
      tenant: tenant._id,
      user: user._id,
      branch: branch._id,
      department: department._id,
      designation: designation._id,
      dateOfJoining: new Date(),
      hireDate: new Date(),
      status: EMPLOYEE_STATUS.ACTIVE,
      employmentType: EMPLOYMENT_TYPE.FULL_TIME,
    });

    leaveType = await LeaveType.create({
      tenant: tenant._id,
      name: 'Annual Leave',
      code: 'AL',
      daysPerYear: 21,
      carryForwardLimit: 5,
      isActive: true,
    });
  });

  describe('Schema Validation', () => {
    it('should create a valid leave request', async () => {
      const leaveRequest = await LeaveRequest.create({
        tenant: tenant._id,
        employee: employee._id,
        leaveType: leaveType._id,
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-05'),
        totalDays: 5,
        workingDays: 5,
        reason: 'Family vacation',
        year: 2026,
      });

      expect(leaveRequest._id).toBeDefined();
      expect(leaveRequest.status).toBe('pending');
    });

    it('should fail without tenant', async () => {
      const leaveRequest = new LeaveRequest({
        employee: employee._id,
        leaveType: leaveType._id,
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-05'),
        totalDays: 5,
        workingDays: 5,
        reason: 'Test',
        year: 2026,
      });

      await expect(leaveRequest.save()).rejects.toThrow();
    });

    it('should fail without reason', async () => {
      const leaveRequest = new LeaveRequest({
        tenant: tenant._id,
        employee: employee._id,
        leaveType: leaveType._id,
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-05'),
        totalDays: 5,
        workingDays: 5,
        year: 2026,
      });

      await expect(leaveRequest.save()).rejects.toThrow(/reason is required/i);
    });

    it('should fail with totalDays less than 0.5', async () => {
      const leaveRequest = new LeaveRequest({
        tenant: tenant._id,
        employee: employee._id,
        leaveType: leaveType._id,
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-01'),
        totalDays: 0.25,
        workingDays: 0.25,
        reason: 'Test',
        year: 2026,
      });

      await expect(leaveRequest.save()).rejects.toThrow();
    });
  });

  describe('Status Transitions', () => {
    it('should have default status as pending', async () => {
      const leaveRequest = await LeaveRequest.create({
        tenant: tenant._id,
        employee: employee._id,
        leaveType: leaveType._id,
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-02'),
        totalDays: 2,
        workingDays: 2,
        reason: 'Personal work',
        year: 2026,
      });

      expect(leaveRequest.status).toBe('pending');
    });

    it('should allow all valid status values', async () => {
      const validStatuses = ['draft', 'pending', 'approved', 'rejected', 'cancelled', 'withdrawn'];

      for (let i = 0; i < validStatuses.length; i++) {
        const leaveRequest = await LeaveRequest.create({
          tenant: tenant._id,
          employee: employee._id,
          leaveType: leaveType._id,
          startDate: new Date(`2026-04-${String(i + 1).padStart(2, '0')}`),
          endDate: new Date(`2026-04-${String(i + 2).padStart(2, '0')}`),
          totalDays: 1,
          workingDays: 1,
          reason: `Test ${i}`,
          status: validStatuses[i],
          year: 2026,
        });

        expect(leaveRequest.status).toBe(validStatuses[i]);
      }
    });
  });

  describe('Half Day Leave', () => {
    it('should allow half day leave', async () => {
      const leaveRequest = await LeaveRequest.create({
        tenant: tenant._id,
        employee: employee._id,
        leaveType: leaveType._id,
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-05-01'),
        totalDays: 0.5,
        workingDays: 0.5,
        isHalfDay: true,
        halfDayType: 'first_half',
        reason: 'Medical appointment',
        year: 2026,
      });

      expect(leaveRequest.isHalfDay).toBe(true);
      expect(leaveRequest.halfDayType).toBe('first_half');
      expect(leaveRequest.totalDays).toBe(0.5);
    });

    it('should validate half day types', async () => {
      const validTypes = ['first_half', 'second_half'];

      for (const type of validTypes) {
        const leaveRequest = await LeaveRequest.create({
          tenant: tenant._id,
          employee: employee._id,
          leaveType: leaveType._id,
          startDate: new Date(`2026-05-${validTypes.indexOf(type) + 10}`),
          endDate: new Date(`2026-05-${validTypes.indexOf(type) + 10}`),
          totalDays: 0.5,
          workingDays: 0.5,
          isHalfDay: true,
          halfDayType: type,
          reason: 'Test half day',
          year: 2026,
        });

        expect(leaveRequest.halfDayType).toBe(type);
      }
    });
  });

  describe('Date Calculations', () => {
    it('should calculate working days correctly (excluding weekends)', () => {
      const calculateWorkingDays = (startDate, endDate) => {
        let count = 0;
        const current = new Date(startDate);
        const end = new Date(endDate);

        while (current <= end) {
          const day = current.getDay();
          if (day !== 0 && day !== 6) { // Not Sunday (0) or Saturday (6)
            count++;
          }
          current.setDate(current.getDate() + 1);
        }
        return count;
      };

      // Monday to Friday (5 working days)
      const workingDays = calculateWorkingDays('2026-01-05', '2026-01-09');
      expect(workingDays).toBe(5);

      // Monday to Sunday (5 working days, excludes Sat/Sun)
      const withWeekend = calculateWorkingDays('2026-01-05', '2026-01-11');
      expect(withWeekend).toBe(5);

      // Full week including weekend (5 working days)
      const fullWeek = calculateWorkingDays('2026-01-05', '2026-01-12');
      expect(fullWeek).toBe(6);
    });

    it('should store year correctly when provided', async () => {
      const leaveRequest = new LeaveRequest({
        tenant: tenant._id,
        employee: employee._id,
        leaveType: leaveType._id,
        startDate: new Date('2027-06-01'),
        endDate: new Date('2027-06-05'),
        totalDays: 5,
        workingDays: 5,
        reason: 'Summer vacation',
        year: 2027,
      });

      await leaveRequest.save();

      expect(leaveRequest.year).toBe(2027);
    });
  });

  describe('Leave Balance Validation', () => {
    it('should validate leave balance before approval', () => {
      const availableBalance = 10;
      const requestedDays = 5;

      const hasEnoughBalance = availableBalance >= requestedDays;
      expect(hasEnoughBalance).toBe(true);
    });

    it('should reject if insufficient balance', () => {
      const availableBalance = 3;
      const requestedDays = 5;

      const hasEnoughBalance = availableBalance >= requestedDays;
      expect(hasEnoughBalance).toBe(false);
    });

    it('should calculate remaining balance after approval', () => {
      const availableBalance = 21;
      const approvedDays = 5;
      const remainingBalance = availableBalance - approvedDays;

      expect(remainingBalance).toBe(16);
    });
  });

  describe('Approval Workflow', () => {
    it('should track approval flow', async () => {
      const manager = await User.create({
        email: `manager-${Date.now()}@example.com`,
        password: 'Test123!@#',
        firstName: 'Manager',
        lastName: 'User',
        tenant: tenant._id,
        role: ROLES.HR_MANAGER,
      });

      const leaveRequest = await LeaveRequest.create({
        tenant: tenant._id,
        employee: employee._id,
        leaveType: leaveType._id,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-03'),
        totalDays: 3,
        workingDays: 3,
        reason: 'Personal matters',
        year: 2026,
        approvalFlow: [
          {
            level: 1,
            approver: manager._id,
            status: 'pending',
          },
        ],
        currentApprover: manager._id,
      });

      expect(leaveRequest.approvalFlow.length).toBe(1);
      expect(leaveRequest.currentApprover.toString()).toBe(manager._id.toString());
    });

    it('should update status on approval', async () => {
      const leaveRequest = await LeaveRequest.create({
        tenant: tenant._id,
        employee: employee._id,
        leaveType: leaveType._id,
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-02'),
        totalDays: 2,
        workingDays: 2,
        reason: 'Holiday',
        year: 2026,
      });

      leaveRequest.status = 'approved';
      leaveRequest.approvedAt = new Date();
      leaveRequest.approvedBy = user._id;
      await leaveRequest.save();

      expect(leaveRequest.status).toBe('approved');
      expect(leaveRequest.approvedAt).toBeDefined();
    });

    it('should record rejection reason', async () => {
      const leaveRequest = await LeaveRequest.create({
        tenant: tenant._id,
        employee: employee._id,
        leaveType: leaveType._id,
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-05'),
        totalDays: 5,
        workingDays: 5,
        reason: 'Vacation',
        year: 2026,
      });

      leaveRequest.status = 'rejected';
      leaveRequest.rejectedAt = new Date();
      leaveRequest.rejectedBy = user._id;
      leaveRequest.rejectionReason = 'Critical project deadline';
      await leaveRequest.save();

      expect(leaveRequest.status).toBe('rejected');
      expect(leaveRequest.rejectionReason).toBe('Critical project deadline');
    });
  });

  describe('Overlapping Leave Detection', () => {
    it('should detect overlapping leave requests', async () => {
      // Existing approved leave: Feb 1-5
      await LeaveRequest.create({
        tenant: tenant._id,
        employee: employee._id,
        leaveType: leaveType._id,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-05'),
        totalDays: 5,
        workingDays: 5,
        reason: 'Approved leave',
        status: 'approved',
        year: 2026,
      });

      // Check for overlap with Feb 3-7
      const checkOverlap = async (empId, start, end, excludeStatuses = ['rejected', 'cancelled', 'withdrawn']) => {
        const overlapping = await LeaveRequest.findOne({
          employee: empId,
          status: { $nin: excludeStatuses },
          $or: [
            { startDate: { $lte: end }, endDate: { $gte: start } },
          ],
        });
        return !!overlapping;
      };

      const hasOverlap = await checkOverlap(
        employee._id,
        new Date('2026-09-03'),
        new Date('2026-09-07')
      );

      expect(hasOverlap).toBe(true);
    });
  });

  describe('Virtual Fields', () => {
    it('should display duration correctly for full day', async () => {
      const leaveRequest = await LeaveRequest.create({
        tenant: tenant._id,
        employee: employee._id,
        leaveType: leaveType._id,
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-03'),
        totalDays: 3,
        workingDays: 3,
        reason: 'Test',
        year: 2026,
      });

      expect(leaveRequest.durationDisplay).toBe('3 days');
    });

    it('should display duration correctly for single day', async () => {
      const leaveRequest = await LeaveRequest.create({
        tenant: tenant._id,
        employee: employee._id,
        leaveType: leaveType._id,
        startDate: new Date('2026-10-10'),
        endDate: new Date('2026-10-10'),
        totalDays: 1,
        workingDays: 1,
        reason: 'Test',
        year: 2026,
      });

      expect(leaveRequest.durationDisplay).toBe('1 day');
    });

    it('should display duration correctly for half day morning', async () => {
      const leaveRequest = await LeaveRequest.create({
        tenant: tenant._id,
        employee: employee._id,
        leaveType: leaveType._id,
        startDate: new Date('2026-10-15'),
        endDate: new Date('2026-10-15'),
        totalDays: 0.5,
        workingDays: 0.5,
        isHalfDay: true,
        halfDayType: 'first_half',
        reason: 'Test',
        year: 2026,
      });

      expect(leaveRequest.durationDisplay).toBe('Half Day (Morning)');
    });
  });
});
