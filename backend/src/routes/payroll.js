import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import { SalaryGrade, EmployeeSalary, Payroll, Payslip } from '../models/index.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';

const router = express.Router();

// Apply middleware
router.use(protect);
router.use(tenantGuard);

// ============ SALARY GRADES ============

// Get all salary grades
router.get('/grades', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const grades = await SalaryGrade.find({ tenant: req.user.tenant })
      .sort({ level: 1 });

    res.json({ success: true, data: grades });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create salary grade
router.post('/grades', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const grade = await SalaryGrade.create({
      ...req.body,
      tenant: req.user.tenant,
    });

    res.status(201).json({ success: true, data: grade });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update salary grade
router.put('/grades/:id', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const grade = await SalaryGrade.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    if (!grade) {
      return res.status(404).json({ success: false, message: 'Salary grade not found' });
    }

    res.json({ success: true, data: grade });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete salary grade
router.delete('/grades/:id', authorize('super_admin', 'tenant_admin'), async (req, res) => {
  try {
    const grade = await SalaryGrade.findOneAndDelete({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!grade) {
      return res.status(404).json({ success: false, message: 'Salary grade not found' });
    }

    res.json({ success: true, message: 'Salary grade deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ EMPLOYEE SALARY ============

// Get employee salary structure
router.get('/salary/:employeeId', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const salary = await EmployeeSalary.findOne({
      tenant: req.user.tenant,
      employee: req.params.employeeId,
      isActive: true,
    })
      .populate('employee', 'firstName lastName employeeId')
      .populate('salaryGrade');

    res.json({ success: true, data: salary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get my salary structure
router.get('/my-salary', async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const salary = await EmployeeSalary.findOne({
      tenant: req.user.tenant,
      employee: employee._id,
      isActive: true,
    }).populate('salaryGrade');

    res.json({ success: true, data: salary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create/Update employee salary
router.post('/salary/:employeeId', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    // Deactivate existing salary
    await EmployeeSalary.updateMany(
      { tenant: req.user.tenant, employee: req.params.employeeId },
      { isActive: false }
    );

    const salary = await EmployeeSalary.create({
      ...req.body,
      tenant: req.user.tenant,
      employee: req.params.employeeId,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: salary });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ PAYROLL ============

// Get all payrolls
router.get('/', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const { year } = req.query;
    const query = { tenant: req.user.tenant };

    if (year) {
      query.year = parseInt(year);
    }

    const payrolls = await Payroll.find(query)
      .populate('processedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ year: -1, month: -1 });

    res.json({ success: true, data: payrolls });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get payroll by ID
router.get('/:id', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const payroll = await Payroll.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('processedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll not found' });
    }

    res.json({ success: true, data: payroll });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create/Initialize payroll
router.post('/', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const { month, year } = req.body;

    // Check if payroll already exists
    const existing = await Payroll.findOne({
      tenant: req.user.tenant,
      month,
      year,
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Payroll already exists for this period' });
    }

    // Calculate pay period
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const payroll = await Payroll.create({
      tenant: req.user.tenant,
      month,
      year,
      payPeriod: { startDate, endDate },
    });

    res.status(201).json({ success: true, data: payroll });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Process payroll
router.post('/:id/process', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const payroll = await Payroll.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll not found' });
    }

    if (payroll.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Payroll is already processed' });
    }

    payroll.status = 'processing';
    await payroll.save();

    // Get all active employees with salary structure
    const employees = await Employee.find({
      tenant: req.user.tenant,
      status: 'active',
    }).populate('department designation');

    const salaries = await EmployeeSalary.find({
      tenant: req.user.tenant,
      isActive: true,
    });

    const salaryMap = {};
    salaries.forEach(s => {
      salaryMap[s.employee.toString()] = s;
    });

    let totalBasic = 0, totalEarnings = 0, totalDeductions = 0, totalGross = 0, totalNet = 0, totalTax = 0;
    const payslips = [];

    for (const emp of employees) {
      const salary = salaryMap[emp._id.toString()];
      if (!salary) continue;

      // Get attendance for the month
      const attendance = await Attendance.find({
        tenant: req.user.tenant,
        employee: emp._id,
        date: {
          $gte: payroll.payPeriod.startDate,
          $lte: payroll.payPeriod.endDate,
        },
      });

      const presentDays = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
      const absentDays = attendance.filter(a => a.status === 'absent').length;
      const workingDays = attendance.length;

      // Calculate earnings and deductions
      const earnings = salary.components.filter(c => c.type === 'earning');
      const deductions = salary.components.filter(c => c.type === 'deduction');

      const totalEarningsAmount = earnings.reduce((sum, c) => sum + (c.value || 0), 0);
      const totalDeductionsAmount = deductions.reduce((sum, c) => sum + (c.value || 0), 0);
      const grossSalary = salary.basicSalary + totalEarningsAmount;
      const netSalary = grossSalary - totalDeductionsAmount;

      // Calculate tax (simplified - in real world, use proper tax tables)
      const taxableIncome = grossSalary - deductions.filter(d => !d.isTaxable).reduce((sum, d) => sum + d.value, 0);
      const taxAmount = calculateTax(taxableIncome);

      const payslip = await Payslip.create({
        tenant: req.user.tenant,
        payroll: payroll._id,
        employee: emp._id,
        month: payroll.month,
        year: payroll.year,
        payPeriod: payroll.payPeriod,
        employeeDetails: {
          employeeId: emp.employeeId,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          department: emp.department?.name,
          designation: emp.designation?.title,
          dateOfJoining: emp.dateOfJoining,
        },
        earnings: earnings.map(e => ({
          name: e.name,
          code: e.code,
          category: e.category,
          amount: e.value,
          isTaxable: e.isTaxable,
        })),
        deductions: deductions.map(d => ({
          name: d.name,
          code: d.code,
          category: d.category,
          amount: d.value,
        })),
        attendance: {
          workingDays,
          presentDays,
          absentDays,
        },
        summary: {
          basicSalary: salary.basicSalary,
          totalEarnings: totalEarningsAmount,
          grossSalary,
          totalDeductions: totalDeductionsAmount,
          taxAmount,
          netSalary: netSalary - taxAmount,
        },
        bankDetails: salary.bankDetails,
        status: 'processed',
      });

      payslips.push(payslip);

      totalBasic += salary.basicSalary;
      totalEarnings += totalEarningsAmount;
      totalDeductions += totalDeductionsAmount;
      totalGross += grossSalary;
      totalNet += netSalary - taxAmount;
      totalTax += taxAmount;
    }

    // Update payroll with summary
    payroll.status = 'processed';
    payroll.totalEmployees = payslips.length;
    payroll.summary = { totalBasic, totalEarnings, totalDeductions, totalGross, totalNet, totalTax };
    payroll.processedBy = req.user._id;
    payroll.processedAt = new Date();
    await payroll.save();

    res.json({ success: true, data: payroll, payslipsCreated: payslips.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Simple tax calculation (Nigeria PAYE simplified)
function calculateTax(annualIncome) {
  const monthlyIncome = annualIncome;
  // Simplified: 10% tax on income above 300000 monthly
  if (monthlyIncome > 300000) {
    return (monthlyIncome - 300000) * 0.1;
  }
  return 0;
}

// Approve payroll
router.post('/:id/approve', authorize('super_admin', 'tenant_admin'), async (req, res) => {
  try {
    const payroll = await Payroll.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: 'processed' },
      {
        status: 'approved',
        approvedBy: req.user._id,
        approvedAt: new Date(),
      },
      { new: true }
    );

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll not found or not ready for approval' });
    }

    res.json({ success: true, data: payroll });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark payroll as paid
router.post('/:id/pay', authorize('super_admin', 'tenant_admin'), async (req, res) => {
  try {
    const { paymentReference } = req.body;

    const payroll = await Payroll.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: 'approved' },
      {
        status: 'paid',
        paidBy: req.user._id,
        paidAt: new Date(),
        paymentReference,
      },
      { new: true }
    );

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll not found or not approved' });
    }

    // Update all payslips
    await Payslip.updateMany(
      { payroll: payroll._id },
      {
        status: 'paid',
        'paymentDetails.paidAt': new Date(),
        'paymentDetails.reference': paymentReference,
      }
    );

    res.json({ success: true, data: payroll });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ PAYSLIPS ============

// Get payslips for a payroll
router.get('/:id/payslips', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const payslips = await Payslip.find({
      tenant: req.user.tenant,
      payroll: req.params.id,
    })
      .populate('employee', 'firstName lastName employeeId')
      .sort({ 'employeeDetails.lastName': 1 });

    res.json({ success: true, data: payslips });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get my payslips
router.get('/payslips/my', async (req, res) => {
  try {
    // Super Admin has no tenant/employee - return empty array
    if (!req.user.tenant) {
      return res.json({ success: true, data: [] });
    }

    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.json({ success: true, data: [] });
    }

    const payslips = await Payslip.find({
      tenant: req.user.tenant,
      employee: employee._id,
    }).sort({ year: -1, month: -1 });

    res.json({ success: true, data: payslips });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single payslip
router.get('/payslips/:id', async (req, res) => {
  try {
    const payslip = await Payslip.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    }).populate('employee', 'firstName lastName employeeId');

    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip not found' });
    }

    // Check authorization
    const employee = await Employee.findOne({ user: req.user._id });
    const isOwn = employee && payslip.employee._id.toString() === employee._id.toString();
    const isHR = ['super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'].includes(req.user.role);

    if (!isOwn && !isHR) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: payslip });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
