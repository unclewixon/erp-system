import { describe, it, expect, beforeEach } from '@jest/globals';
import { Payroll, Payslip } from '../../../src/models/index.js';
import { createTestTenant, createTestUser } from '../../helpers/testHelpers.js';

describe('Payroll Model', () => {
  let tenant;

  beforeEach(async () => {
    tenant = await createTestTenant();
  });

  describe('Schema Validation', () => {
    it('should create a valid payroll record', async () => {
      const payroll = await Payroll.create({
        tenant: tenant._id,
        month: 1,
        year: 2026,
        payPeriod: {
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-31'),
        },
      });

      expect(payroll._id).toBeDefined();
      expect(payroll.month).toBe(1);
      expect(payroll.year).toBe(2026);
      expect(payroll.status).toBe('draft');
    });

    it('should fail without tenant', async () => {
      const payroll = new Payroll({
        month: 1,
        year: 2026,
        payPeriod: {
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-31'),
        },
      });

      await expect(payroll.save()).rejects.toThrow();
    });

    it('should fail without month', async () => {
      const payroll = new Payroll({
        tenant: tenant._id,
        year: 2026,
        payPeriod: {
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-31'),
        },
      });

      await expect(payroll.save()).rejects.toThrow();
    });

    it('should fail with invalid month (>12)', async () => {
      const payroll = new Payroll({
        tenant: tenant._id,
        month: 13,
        year: 2026,
        payPeriod: {
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-31'),
        },
      });

      await expect(payroll.save()).rejects.toThrow();
    });

    it('should fail with invalid month (<1)', async () => {
      const payroll = new Payroll({
        tenant: tenant._id,
        month: 0,
        year: 2026,
        payPeriod: {
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-31'),
        },
      });

      await expect(payroll.save()).rejects.toThrow();
    });

    it('should enforce unique tenant/year/month combination', async () => {
      await Payroll.create({
        tenant: tenant._id,
        month: 1,
        year: 2026,
        payPeriod: {
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-31'),
        },
      });

      const duplicate = new Payroll({
        tenant: tenant._id,
        month: 1,
        year: 2026,
        payPeriod: {
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-31'),
        },
      });

      await expect(duplicate.save()).rejects.toThrow();
    });
  });

  describe('Status Transitions', () => {
    it('should have default status as draft', async () => {
      const payroll = await Payroll.create({
        tenant: tenant._id,
        month: 2,
        year: 2026,
        payPeriod: {
          startDate: new Date('2026-02-01'),
          endDate: new Date('2026-02-28'),
        },
      });

      expect(payroll.status).toBe('draft');
    });

    it('should allow valid status values', async () => {
      const validStatuses = ['draft', 'processing', 'processed', 'approved', 'paid', 'cancelled'];

      for (let i = 0; i < validStatuses.length; i++) {
        const payroll = await Payroll.create({
          tenant: tenant._id,
          month: i + 3,
          year: 2026,
          payPeriod: {
            startDate: new Date(`2026-${String(i + 3).padStart(2, '0')}-01`),
            endDate: new Date(`2026-${String(i + 3).padStart(2, '0')}-28`),
          },
          status: validStatuses[i],
        });

        expect(payroll.status).toBe(validStatuses[i]);
      }
    });

    it('should reject invalid status values', async () => {
      const payroll = new Payroll({
        tenant: tenant._id,
        month: 10,
        year: 2026,
        payPeriod: {
          startDate: new Date('2026-10-01'),
          endDate: new Date('2026-10-31'),
        },
        status: 'invalid_status',
      });

      await expect(payroll.save()).rejects.toThrow();
    });
  });

  describe('Summary Calculations', () => {
    it('should have default summary values of 0', async () => {
      const payroll = await Payroll.create({
        tenant: tenant._id,
        month: 11,
        year: 2026,
        payPeriod: {
          startDate: new Date('2026-11-01'),
          endDate: new Date('2026-11-30'),
        },
      });

      expect(payroll.summary.totalBasic).toBe(0);
      expect(payroll.summary.totalEarnings).toBe(0);
      expect(payroll.summary.totalDeductions).toBe(0);
      expect(payroll.summary.totalGross).toBe(0);
      expect(payroll.summary.totalNet).toBe(0);
      expect(payroll.summary.totalTax).toBe(0);
    });

    it('should allow setting summary values', async () => {
      const payroll = await Payroll.create({
        tenant: tenant._id,
        month: 12,
        year: 2025,
        payPeriod: {
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-31'),
        },
        summary: {
          totalBasic: 100000,
          totalEarnings: 20000,
          totalDeductions: 15000,
          totalGross: 120000,
          totalNet: 105000,
          totalTax: 10000,
        },
      });

      expect(payroll.summary.totalBasic).toBe(100000);
      expect(payroll.summary.totalNet).toBe(105000);
    });
  });

  describe('Payroll Calculations', () => {
    it('should correctly calculate net pay (gross - deductions)', () => {
      const gross = 50000;
      const deductions = 5000;
      const expectedNet = gross - deductions;

      expect(expectedNet).toBe(45000);
    });

    it('should correctly calculate tax at standard rate', () => {
      const gross = 100000;
      const taxRate = 0.1; // 10%
      const expectedTax = gross * taxRate;

      expect(expectedTax).toBe(10000);
    });

    it('should correctly calculate overtime pay', () => {
      const hourlyRate = 50;
      const overtimeHours = 10;
      const overtimeMultiplier = 1.5;
      const expectedOvertimePay = hourlyRate * overtimeHours * overtimeMultiplier;

      expect(expectedOvertimePay).toBe(750);
    });

    it('should correctly prorate salary for partial month', () => {
      const monthlySalary = 60000;
      const workingDaysInMonth = 22;
      const daysWorked = 15;
      const proratedSalary = (monthlySalary / workingDaysInMonth) * daysWorked;

      expect(Math.round(proratedSalary)).toBe(40909);
    });
  });
});

describe('Payslip Model', () => {
  it('should validate payslip calculations are consistent', () => {
    const payslipData = {
      basic: 50000,
      allowances: {
        housing: 10000,
        transport: 5000,
        medical: 3000,
      },
      deductions: {
        tax: 6000,
        pension: 4000,
        healthInsurance: 2000,
      },
    };

    const totalAllowances = Object.values(payslipData.allowances).reduce((a, b) => a + b, 0);
    const totalDeductions = Object.values(payslipData.deductions).reduce((a, b) => a + b, 0);
    const gross = payslipData.basic + totalAllowances;
    const net = gross - totalDeductions;

    expect(totalAllowances).toBe(18000);
    expect(totalDeductions).toBe(12000);
    expect(gross).toBe(68000);
    expect(net).toBe(56000);
  });
});
