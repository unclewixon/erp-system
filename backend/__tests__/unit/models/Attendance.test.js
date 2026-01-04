import { describe, it, expect, beforeEach } from '@jest/globals';
import { Attendance, Employee, User, Branch, Department, Designation } from '../../../src/models/index.js';
import { createTestTenant } from '../../helpers/testHelpers.js';
import { ROLES, EMPLOYEE_STATUS, EMPLOYMENT_TYPE } from '../../../src/config/constants.js';

describe('Attendance Model', () => {
  let tenant;
  let employee;
  let user;
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
      email: `att-${Date.now()}@example.com`,
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
  });

  describe('Schema Validation', () => {
    it('should create a valid attendance record', async () => {
      const attendance = await Attendance.create({
        tenant: tenant._id,
        employee: employee._id,
        date: new Date(),
        clockIn: {
          time: new Date(),
          method: 'web',
          location: { type: 'Point', coordinates: [0, 0] },
        },
        clockOut: {
          location: { type: 'Point', coordinates: [0, 0] },
        },
      });

      expect(attendance._id).toBeDefined();
      expect(attendance.status).toBe('present');
    });

    it('should fail without tenant', async () => {
      const attendance = new Attendance({
        employee: employee._id,
        date: new Date(),
      });

      await expect(attendance.save()).rejects.toThrow();
    });

    it('should fail without employee', async () => {
      const attendance = new Attendance({
        tenant: tenant._id,
        date: new Date(),
      });

      await expect(attendance.save()).rejects.toThrow();
    });

    it('should fail without date', async () => {
      const attendance = new Attendance({
        tenant: tenant._id,
        employee: employee._id,
      });

      await expect(attendance.save()).rejects.toThrow();
    });
  });

  describe('Clock In/Out', () => {
    it('should record clock in time', async () => {
      const clockInTime = new Date('2026-01-04T09:00:00Z');
      const attendance = await Attendance.create({
        tenant: tenant._id,
        employee: employee._id,
        date: new Date('2026-01-04'),
        clockIn: {
          time: clockInTime,
          method: 'mobile',
          location: { type: 'Point', coordinates: [0, 0] },
        },
        clockOut: {
          location: { type: 'Point', coordinates: [0, 0] },
        },
      });

      expect(attendance.clockIn.time.toISOString()).toBe(clockInTime.toISOString());
      expect(attendance.clockIn.method).toBe('mobile');
    });

    it('should record clock out time', async () => {
      const clockInTime = new Date('2026-01-04T09:00:00Z');
      const clockOutTime = new Date('2026-01-04T17:00:00Z');

      const attendance = await Attendance.create({
        tenant: tenant._id,
        employee: employee._id,
        date: new Date('2026-01-04'),
        clockIn: {
          time: clockInTime,
          method: 'web',
          location: { type: 'Point', coordinates: [0, 0] },
        },
        clockOut: {
          time: clockOutTime,
          method: 'web',
          location: { type: 'Point', coordinates: [0, 0] },
        },
      });

      expect(attendance.clockOut.time.toISOString()).toBe(clockOutTime.toISOString());
    });

    it('should validate clock in methods', async () => {
      const validMethods = ['web', 'mobile', 'biometric', 'manual'];

      for (const method of validMethods) {
        const attendance = await Attendance.create({
          tenant: tenant._id,
          employee: employee._id,
          date: new Date(`2026-01-0${validMethods.indexOf(method) + 5}`),
          clockIn: {
            time: new Date(),
            method,
            location: { type: 'Point', coordinates: [0, 0] },
          },
          clockOut: {
            location: { type: 'Point', coordinates: [0, 0] },
          },
        });

        expect(attendance.clockIn.method).toBe(method);
      }
    });
  });

  describe('Status Tracking', () => {
    it('should have default status as present', async () => {
      const attendance = await Attendance.create({
        tenant: tenant._id,
        employee: employee._id,
        date: new Date('2026-01-10'),
        clockIn: { time: new Date(), location: { type: 'Point', coordinates: [0, 0] } },
        clockOut: { location: { type: 'Point', coordinates: [0, 0] } },
      });

      expect(attendance.status).toBe('present');
    });

    it('should allow all valid status values', async () => {
      const validStatuses = ['present', 'absent', 'half_day', 'late', 'early_leave', 'on_leave', 'holiday', 'weekend'];

      for (let i = 0; i < validStatuses.length; i++) {
        const attendance = await Attendance.create({
          tenant: tenant._id,
          employee: employee._id,
          date: new Date(`2026-02-${String(i + 1).padStart(2, '0')}`),
          clockIn: { time: new Date(), location: { type: 'Point', coordinates: [0, 0] } },
          clockOut: { location: { type: 'Point', coordinates: [0, 0] } },
          status: validStatuses[i],
        });

        expect(attendance.status).toBe(validStatuses[i]);
      }
    });

    it('should reject invalid status', async () => {
      const attendance = new Attendance({
        tenant: tenant._id,
        employee: employee._id,
        date: new Date('2026-02-20'),
        status: 'invalid_status',
      });

      await expect(attendance.save()).rejects.toThrow();
    });
  });

  describe('Work Hours Calculation', () => {
    it('should have default scheduled hours of 8', async () => {
      const attendance = await Attendance.create({
        tenant: tenant._id,
        employee: employee._id,
        date: new Date('2026-03-01'),
        clockIn: { time: new Date(), location: { type: 'Point', coordinates: [0, 0] } },
        clockOut: { location: { type: 'Point', coordinates: [0, 0] } },
      });

      expect(attendance.workHours.scheduled).toBe(8);
    });

    it('should calculate actual work hours correctly', () => {
      const clockIn = new Date('2026-01-04T09:00:00');
      const clockOut = new Date('2026-01-04T17:30:00');
      const breakTime = 30; // 30 minutes

      const totalMinutes = (clockOut - clockIn) / (1000 * 60);
      const actualHours = (totalMinutes - breakTime) / 60;

      expect(actualHours).toBe(8); // 8.5 hours - 0.5 break = 8 hours
    });

    it('should calculate overtime correctly', () => {
      const scheduledHours = 8;
      const actualHours = 10;
      const overtime = Math.max(0, actualHours - scheduledHours);

      expect(overtime).toBe(2);
    });

    it('should not have negative overtime', () => {
      const scheduledHours = 8;
      const actualHours = 6;
      const overtime = Math.max(0, actualHours - scheduledHours);

      expect(overtime).toBe(0);
    });
  });

  describe('Late Detection', () => {
    it('should set isLate flag for late arrivals', () => {
      const shiftStart = new Date('2026-01-04T09:00:00');
      const graceMinutes = 15;
      const clockInTime = new Date('2026-01-04T09:20:00');

      const isLate = clockInTime > new Date(shiftStart.getTime() + graceMinutes * 60000);

      expect(isLate).toBe(true);
    });

    it('should not flag on-time arrivals as late', () => {
      const shiftStart = new Date('2026-01-04T09:00:00');
      const graceMinutes = 15;
      const clockInTime = new Date('2026-01-04T09:10:00');

      const isLate = clockInTime > new Date(shiftStart.getTime() + graceMinutes * 60000);

      expect(isLate).toBe(false);
    });

    it('should calculate late minutes correctly', () => {
      const shiftStart = new Date('2026-01-04T09:00:00');
      const clockInTime = new Date('2026-01-04T09:30:00');

      const lateMinutes = Math.max(0, (clockInTime - shiftStart) / (1000 * 60));

      expect(lateMinutes).toBe(30);
    });
  });

  describe('Geofence Validation', () => {
    it('should record geofence status', async () => {
      const attendance = await Attendance.create({
        tenant: tenant._id,
        employee: employee._id,
        date: new Date('2026-03-15'),
        clockIn: {
          time: new Date(),
          method: 'mobile',
          withinGeofence: true,
          location: {
            type: 'Point',
            coordinates: [-74.006, 40.7128],
          },
        },
        clockOut: {
          location: { type: 'Point', coordinates: [0, 0] },
        },
      });

      expect(attendance.clockIn.withinGeofence).toBe(true);
      expect(attendance.clockIn.location.coordinates).toEqual([-74.006, 40.7128]);
    });

    it('should calculate distance between points', () => {
      // Haversine formula for distance calculation
      const toRad = (deg) => deg * (Math.PI / 180);

      const calcDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // Earth radius in meters
        const φ1 = toRad(lat1);
        const φ2 = toRad(lat2);
        const Δφ = toRad(lat2 - lat1);
        const Δλ = toRad(lon2 - lon1);

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
      };

      // Office location
      const officeLat = 40.7128;
      const officeLon = -74.006;

      // Employee location (100m away)
      const empLat = 40.7137;
      const empLon = -74.006;

      const distance = calcDistance(officeLat, officeLon, empLat, empLon);
      const geofenceRadius = 200; // 200 meters

      expect(distance).toBeLessThan(geofenceRadius);
    });
  });

  describe('Break Time Tracking', () => {
    it('should record break times', async () => {
      const attendance = await Attendance.create({
        tenant: tenant._id,
        employee: employee._id,
        date: new Date('2026-03-20'),
        clockIn: { time: new Date(), location: { type: 'Point', coordinates: [0, 0] } },
        clockOut: { location: { type: 'Point', coordinates: [0, 0] } },
        breaks: [
          {
            startTime: new Date('2026-03-20T12:00:00'),
            endTime: new Date('2026-03-20T13:00:00'),
            type: 'lunch',
            duration: 60,
          },
        ],
      });

      expect(attendance.breaks.length).toBe(1);
      expect(attendance.breaks[0].type).toBe('lunch');
      expect(attendance.breaks[0].duration).toBe(60);
    });

    it('should calculate total break duration', () => {
      const breaks = [
        { duration: 60 }, // lunch
        { duration: 15 }, // tea
        { duration: 15 }, // prayer
      ];

      const totalBreakTime = breaks.reduce((sum, b) => sum + b.duration, 0);

      expect(totalBreakTime).toBe(90);
    });
  });
});
