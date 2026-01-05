import express from 'express';
import { body, validationResult } from 'express-validator';
import LeaveType from '../models/LeaveType.js';
import LeaveBalance from '../models/LeaveBalance.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Holiday from '../models/Holiday.js';
import Employee from '../models/Employee.js';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
    });
  }
  next();
};

// Helper: Calculate working days between two dates
const calculateWorkingDays = async (startDate, endDate, tenantId, excludeWeekends = true) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;

  // Get holidays in the range
  const holidays = await Holiday.find({
    tenant: tenantId,
    date: { $gte: start, $lte: end },
    isActive: true,
  }).select('date');

  const holidayDates = new Set(holidays.map(h => h.date.toISOString().split('T')[0]));

  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    const dateStr = current.toISOString().split('T')[0];

    // Skip weekends if required
    if (excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    // Skip holidays
    if (holidayDates.has(dateStr)) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    count++;
    current.setDate(current.getDate() + 1);
  }

  return count;
};

// ==================== LEAVE TYPES ====================

// @route   GET /api/leaves/types
// @desc    Get all leave types
// @access  Private
router.get('/types', protect, tenantGuard, async (req, res) => {
  try {
    // Super Admin has no tenant - return empty array
    if (!req.user.tenant) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const leaveTypes = await LeaveType.find({
      tenant: req.user.tenant._id,
      isActive: true,
    }).sort({ sortOrder: 1, name: 1 });

    res.json({
      success: true,
      data: leaveTypes,
    });
  } catch (error) {
    console.error('Get leave types error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/leaves/types
// @desc    Create leave type
// @access  Private/Admin/HR
router.post('/types', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER), tenantGuard, [
  body('name').notEmpty().withMessage('Leave type name is required'),
  body('code').notEmpty().withMessage('Leave type code is required'),
], validate, async (req, res) => {
  try {
    // Super Admin has no tenant - cannot create tenant-specific data
    if (!req.user.tenant) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create leave types without a tenant context',
      });
    }

    const leaveType = await LeaveType.create({
      ...req.body,
      tenant: req.user.tenant._id,
    });

    res.status(201).json({
      success: true,
      message: 'Leave type created successfully',
      data: leaveType,
    });
  } catch (error) {
    console.error('Create leave type error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Leave type code already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/leaves/types/:id
// @desc    Update leave type
// @access  Private/Admin/HR
router.put('/types/:id', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER), tenantGuard, async (req, res) => {
  try {
    // Super Admin has no tenant - cannot update tenant-specific data
    if (!req.user.tenant) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update leave types without a tenant context',
      });
    }

    const leaveType = await LeaveType.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!leaveType) {
      return res.status(404).json({
        success: false,
        message: 'Leave type not found',
      });
    }

    res.json({
      success: true,
      message: 'Leave type updated successfully',
      data: leaveType,
    });
  } catch (error) {
    console.error('Update leave type error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   DELETE /api/leaves/types/:id
// @desc    Delete leave type
// @access  Private/Admin
router.delete('/types/:id', protect, authorize(ROLES.TENANT_ADMIN), tenantGuard, async (req, res) => {
  try {
    // Check if leave type is in use
    const inUse = await LeaveRequest.countDocuments({
      leaveType: req.params.id,
    });

    if (inUse > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete. ${inUse} leave requests are using this type.`,
      });
    }

    await LeaveType.findOneAndDelete({
      _id: req.params.id,
      tenant: req.user.tenant._id,
    });

    res.json({
      success: true,
      message: 'Leave type deleted successfully',
    });
  } catch (error) {
    console.error('Delete leave type error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ==================== LEAVE BALANCES ====================

// @route   GET /api/leaves/balances/my
// @desc    Get current user's leave balances
// @access  Private
router.get('/balances/my', protect, tenantGuard, async (req, res) => {
  try {
    // Super Admin has no tenant - return empty array
    if (!req.user.tenant) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const { year = new Date().getFullYear() } = req.query;

    const employee = await Employee.findOne({
      user: req.user._id,
      tenant: req.user.tenant._id,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee profile not found',
      });
    }

    const balances = await LeaveBalance.find({
      tenant: req.user.tenant._id,
      employee: employee._id,
      year: parseInt(year),
    }).populate('leaveType', 'name code color isPaid');

    res.json({
      success: true,
      data: balances,
    });
  } catch (error) {
    console.error('Get my balances error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/leaves/balances/:employeeId
// @desc    Get employee's leave balances
// @access  Private/HR
router.get('/balances/:employeeId', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER, ROLES.HR_OFFICER), tenantGuard, async (req, res) => {
  try {
    // Super Admin has no tenant - return empty array
    if (!req.user.tenant) {
      return res.json({ success: true, data: [] });
    }

    const { year = new Date().getFullYear() } = req.query;

    const balances = await LeaveBalance.find({
      tenant: req.user.tenant._id,
      employee: req.params.employeeId,
      year: parseInt(year),
    }).populate('leaveType', 'name code color isPaid');

    res.json({
      success: true,
      data: balances,
    });
  } catch (error) {
    console.error('Get balances error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/leaves/balances/allocate
// @desc    Allocate leave balance to employee(s)
// @access  Private/Admin/HR
router.post('/balances/allocate', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER), tenantGuard, [
  body('leaveType').notEmpty().withMessage('Leave type is required'),
  body('year').notEmpty().withMessage('Year is required'),
  body('days').isNumeric().withMessage('Days must be a number'),
], validate, async (req, res) => {
  try {
    const { employees, leaveType, year, days, reason } = req.body;

    // If no specific employees, allocate to all active employees
    let targetEmployees;
    if (employees?.length > 0) {
      targetEmployees = employees;
    } else {
      const allEmployees = await Employee.find({
        tenant: req.user.tenant._id,
        isActive: true,
      }).select('_id');
      targetEmployees = allEmployees.map(e => e._id);
    }

    const results = [];

    for (const empId of targetEmployees) {
      let balance = await LeaveBalance.findOne({
        tenant: req.user.tenant._id,
        employee: empId,
        leaveType,
        year: parseInt(year),
      });

      if (balance) {
        balance.allocated += days;
        balance.adjustmentHistory.push({
          amount: days,
          reason: reason || 'Allocation',
          adjustedBy: req.user._id,
        });
        await balance.save();
      } else {
        balance = await LeaveBalance.create({
          tenant: req.user.tenant._id,
          employee: empId,
          leaveType,
          year: parseInt(year),
          allocated: days,
          adjustmentHistory: [{
            amount: days,
            reason: reason || 'Initial allocation',
            adjustedBy: req.user._id,
          }],
        });
      }

      results.push(balance);
    }

    res.status(201).json({
      success: true,
      message: `Leave allocated to ${results.length} employee(s)`,
      data: results,
    });
  } catch (error) {
    console.error('Allocate balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/leaves/balances/:id/adjust
// @desc    Adjust leave balance
// @access  Private/Admin/HR
router.put('/balances/:id/adjust', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER), tenantGuard, [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('reason').notEmpty().withMessage('Reason is required'),
], validate, async (req, res) => {
  try {
    const { amount, reason } = req.body;

    const balance = await LeaveBalance.findOne({
      _id: req.params.id,
      tenant: req.user.tenant._id,
    });

    if (!balance) {
      return res.status(404).json({
        success: false,
        message: 'Balance not found',
      });
    }

    balance.adjustments += amount;
    balance.adjustmentHistory.push({
      amount,
      reason,
      adjustedBy: req.user._id,
    });

    await balance.save();

    res.json({
      success: true,
      message: 'Balance adjusted successfully',
      data: balance,
    });
  } catch (error) {
    console.error('Adjust balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ==================== LEAVE REQUESTS ====================

// @route   GET /api/leaves/requests/my
// @desc    Get current user's leave requests
// @access  Private
router.get('/requests/my', protect, tenantGuard, async (req, res) => {
  try {
    // Super Admin has no tenant - return empty array
    if (!req.user.tenant) {
      return res.json({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      });
    }

    const { status, year, page = 1, limit = 20 } = req.query;

    const employee = await Employee.findOne({
      user: req.user._id,
      tenant: req.user.tenant._id,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee profile not found',
      });
    }

    const query = {
      tenant: req.user.tenant._id,
      employee: employee._id,
    };

    if (status) query.status = status;
    if (year) query.year = parseInt(year);

    const requests = await LeaveRequest.find(query)
      .populate('leaveType', 'name code color')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await LeaveRequest.countDocuments(query);

    res.json({
      success: true,
      data: requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get my requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/leaves/requests/pending
// @desc    Get pending leave requests for approval
// @access  Private/HR/Manager
router.get('/requests/pending', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER, ROLES.HR_OFFICER, ROLES.DEPARTMENT_HEAD, ROLES.TEAM_LEAD), tenantGuard, async (req, res) => {
  try {
    // Super Admin has no tenant - return empty array
    if (!req.user.tenant) {
      return res.json({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      });
    }

    const { page = 1, limit = 20 } = req.query;

    const query = {
      tenant: req.user.tenant._id,
      status: 'pending',
    };

    // If not HR, only show requests from direct reports
    if (![ROLES.TENANT_ADMIN, ROLES.HR_MANAGER, ROLES.HR_OFFICER].includes(req.user.role)) {
      const directReports = await Employee.find({
        tenant: req.user.tenant._id,
        reportsTo: req.user.employee,
      }).select('_id');

      query.employee = { $in: directReports.map(e => e._id) };
    }

    const requests = await LeaveRequest.find(query)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('leaveType', 'name code color')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await LeaveRequest.countDocuments(query);

    res.json({
      success: true,
      data: requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/leaves/requests
// @desc    Get all leave requests
// @access  Private/HR
router.get('/requests', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER, ROLES.HR_OFFICER), tenantGuard, async (req, res) => {
  try {
    // Super Admin has no tenant - return empty array
    if (!req.user.tenant) {
      return res.json({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      });
    }

    const {
      status,
      employee,
      department,
      leaveType,
      startDate,
      endDate,
      year,
      page = 1,
      limit = 20,
    } = req.query;

    const query = { tenant: req.user.tenant._id };

    if (status) query.status = status;
    if (employee) query.employee = employee;
    if (leaveType) query.leaveType = leaveType;
    if (year) query.year = parseInt(year);

    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    if (department) {
      const deptEmployees = await Employee.find({ department }).select('_id');
      query.employee = { $in: deptEmployees.map(e => e._id) };
    }

    const requests = await LeaveRequest.find(query)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('leaveType', 'name code color')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await LeaveRequest.countDocuments(query);

    res.json({
      success: true,
      data: requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/leaves/requests
// @desc    Create leave request
// @access  Private
router.post('/requests', protect, tenantGuard, [
  body('leaveType').notEmpty().withMessage('Leave type is required'),
  body('startDate').notEmpty().withMessage('Start date is required'),
  body('endDate').notEmpty().withMessage('End date is required'),
  body('reason').notEmpty().withMessage('Reason is required'),
], validate, async (req, res) => {
  try {
    // Super Admin has no tenant - cannot create leave requests
    if (!req.user.tenant) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create leave requests without a tenant context',
      });
    }

    const { leaveType, startDate, endDate, isHalfDay, halfDayType, reason, emergencyContact, handover } = req.body;

    const employee = await Employee.findOne({
      user: req.user._id,
      tenant: req.user.tenant._id,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee profile not found',
      });
    }

    // Get leave type details
    const leaveTypeDoc = await LeaveType.findOne({
      _id: leaveType,
      tenant: req.user.tenant._id,
      isActive: true,
    });

    if (!leaveTypeDoc) {
      return res.status(404).json({
        success: false,
        message: 'Leave type not found',
      });
    }

    // Calculate working days
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date',
      });
    }

    let workingDays = await calculateWorkingDays(start, end, req.user.tenant._id);
    let totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (isHalfDay) {
      workingDays = 0.5;
      totalDays = 0.5;
    }

    // Check leave balance
    const year = start.getFullYear();
    const balance = await LeaveBalance.findOne({
      tenant: req.user.tenant._id,
      employee: employee._id,
      leaveType,
      year,
    });

    const availableBalance = balance?.available || 0;

    if (availableBalance < workingDays) {
      return res.status(400).json({
        success: false,
        message: `Insufficient leave balance. Available: ${availableBalance} days, Requested: ${workingDays} days`,
      });
    }

    // Check for overlapping leaves
    const overlapping = await LeaveRequest.findOne({
      tenant: req.user.tenant._id,
      employee: employee._id,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
      ],
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: 'You already have a leave request for this period',
      });
    }

    // Create leave request
    const leaveRequest = await LeaveRequest.create({
      tenant: req.user.tenant._id,
      employee: employee._id,
      leaveType,
      startDate: start,
      endDate: end,
      isHalfDay,
      halfDayType,
      totalDays,
      workingDays,
      reason,
      emergencyContact,
      handover,
      year,
      status: leaveTypeDoc.rules.requiresApproval ? 'pending' : 'approved',
      currentApprover: employee.reportsTo || null,
    });

    // Update pending balance
    if (balance) {
      balance.pending += workingDays;
      await balance.save();
    }

    // If auto-approved, update balance
    if (!leaveTypeDoc.rules.requiresApproval) {
      if (balance) {
        balance.pending -= workingDays;
        balance.used += workingDays;
        await balance.save();
      }
      leaveRequest.approvedAt = new Date();
    }

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('leaveType', 'name code color')
      .populate('employee', 'firstName lastName employeeId');

    res.status(201).json({
      success: true,
      message: leaveTypeDoc.rules.requiresApproval
        ? 'Leave request submitted for approval'
        : 'Leave request approved',
      data: populated,
    });
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/leaves/requests/:id/approve
// @desc    Approve leave request
// @access  Private/HR/Manager
router.put('/requests/:id/approve', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER, ROLES.HR_OFFICER, ROLES.DEPARTMENT_HEAD, ROLES.TEAM_LEAD), tenantGuard, async (req, res) => {
  try {
    const { comments } = req.body;

    const leaveRequest = await LeaveRequest.findOne({
      _id: req.params.id,
      tenant: req.user.tenant._id,
      status: 'pending',
    });

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found or already processed',
      });
    }

    leaveRequest.status = 'approved';
    leaveRequest.approvedBy = req.user._id;
    leaveRequest.approvedAt = new Date();

    leaveRequest.approvalFlow.push({
      level: 1,
      approver: req.user._id,
      status: 'approved',
      comments,
      actionAt: new Date(),
    });

    await leaveRequest.save();

    // Update leave balance
    const balance = await LeaveBalance.findOne({
      tenant: req.user.tenant._id,
      employee: leaveRequest.employee,
      leaveType: leaveRequest.leaveType,
      year: leaveRequest.year,
    });

    if (balance) {
      balance.pending -= leaveRequest.workingDays;
      balance.used += leaveRequest.workingDays;
      await balance.save();
    }

    res.json({
      success: true,
      message: 'Leave request approved',
      data: leaveRequest,
    });
  } catch (error) {
    console.error('Approve leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/leaves/requests/:id/reject
// @desc    Reject leave request
// @access  Private/HR/Manager
router.put('/requests/:id/reject', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER, ROLES.HR_OFFICER, ROLES.DEPARTMENT_HEAD, ROLES.TEAM_LEAD), tenantGuard, [
  body('reason').notEmpty().withMessage('Rejection reason is required'),
], validate, async (req, res) => {
  try {
    const { reason, comments } = req.body;

    const leaveRequest = await LeaveRequest.findOne({
      _id: req.params.id,
      tenant: req.user.tenant._id,
      status: 'pending',
    });

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found or already processed',
      });
    }

    leaveRequest.status = 'rejected';
    leaveRequest.rejectedBy = req.user._id;
    leaveRequest.rejectedAt = new Date();
    leaveRequest.rejectionReason = reason;

    leaveRequest.approvalFlow.push({
      level: 1,
      approver: req.user._id,
      status: 'rejected',
      comments: comments || reason,
      actionAt: new Date(),
    });

    await leaveRequest.save();

    // Release pending balance
    const balance = await LeaveBalance.findOne({
      tenant: req.user.tenant._id,
      employee: leaveRequest.employee,
      leaveType: leaveRequest.leaveType,
      year: leaveRequest.year,
    });

    if (balance) {
      balance.pending -= leaveRequest.workingDays;
      await balance.save();
    }

    res.json({
      success: true,
      message: 'Leave request rejected',
      data: leaveRequest,
    });
  } catch (error) {
    console.error('Reject leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/leaves/requests/:id/cancel
// @desc    Cancel leave request
// @access  Private
router.put('/requests/:id/cancel', protect, tenantGuard, async (req, res) => {
  try {
    const { reason } = req.body;

    const employee = await Employee.findOne({
      user: req.user._id,
      tenant: req.user.tenant._id,
    });

    const leaveRequest = await LeaveRequest.findOne({
      _id: req.params.id,
      tenant: req.user.tenant._id,
      employee: employee._id,
      status: { $in: ['pending', 'approved'] },
    });

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found or cannot be cancelled',
      });
    }

    // Cannot cancel if leave has already started
    if (leaveRequest.status === 'approved' && new Date(leaveRequest.startDate) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel leave that has already started',
      });
    }

    const previousStatus = leaveRequest.status;
    leaveRequest.status = 'cancelled';
    leaveRequest.cancelledBy = req.user._id;
    leaveRequest.cancelledAt = new Date();
    leaveRequest.cancellationReason = reason;

    await leaveRequest.save();

    // Update balance
    const balance = await LeaveBalance.findOne({
      tenant: req.user.tenant._id,
      employee: leaveRequest.employee,
      leaveType: leaveRequest.leaveType,
      year: leaveRequest.year,
    });

    if (balance) {
      if (previousStatus === 'pending') {
        balance.pending -= leaveRequest.workingDays;
      } else if (previousStatus === 'approved') {
        balance.used -= leaveRequest.workingDays;
      }
      await balance.save();
    }

    res.json({
      success: true,
      message: 'Leave request cancelled',
      data: leaveRequest,
    });
  } catch (error) {
    console.error('Cancel leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ==================== HOLIDAYS ====================

// @route   GET /api/leaves/holidays
// @desc    Get holidays
// @access  Private
router.get('/holidays', protect, tenantGuard, async (req, res) => {
  try {
    // Super Admin has no tenant - return empty array
    if (!req.user.tenant) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const { year = new Date().getFullYear() } = req.query;

    const holidays = await Holiday.find({
      tenant: req.user.tenant._id,
      year: parseInt(year),
      isActive: true,
    }).sort({ date: 1 });

    res.json({
      success: true,
      data: holidays,
    });
  } catch (error) {
    console.error('Get holidays error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/leaves/holidays
// @desc    Create holiday
// @access  Private/Admin/HR
router.post('/holidays', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER), tenantGuard, [
  body('name').notEmpty().withMessage('Holiday name is required'),
  body('date').notEmpty().withMessage('Holiday date is required'),
], validate, async (req, res) => {
  try {
    const holiday = await Holiday.create({
      ...req.body,
      tenant: req.user.tenant._id,
    });

    res.status(201).json({
      success: true,
      message: 'Holiday created successfully',
      data: holiday,
    });
  } catch (error) {
    console.error('Create holiday error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Holiday already exists for this date',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/leaves/holidays/:id
// @desc    Update holiday
// @access  Private/Admin/HR
router.put('/holidays/:id', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER), tenantGuard, async (req, res) => {
  try {
    const holiday = await Holiday.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found',
      });
    }

    res.json({
      success: true,
      message: 'Holiday updated successfully',
      data: holiday,
    });
  } catch (error) {
    console.error('Update holiday error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   DELETE /api/leaves/holidays/:id
// @desc    Delete holiday
// @access  Private/Admin
router.delete('/holidays/:id', protect, authorize(ROLES.TENANT_ADMIN), tenantGuard, async (req, res) => {
  try {
    await Holiday.findOneAndDelete({
      _id: req.params.id,
      tenant: req.user.tenant._id,
    });

    res.json({
      success: true,
      message: 'Holiday deleted successfully',
    });
  } catch (error) {
    console.error('Delete holiday error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;
