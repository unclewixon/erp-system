import express from 'express';
import { body, query, validationResult } from 'express-validator';
import DutyRosterLink from '../models/DutyRosterLink.js';
import EmployeeShiftSchedule from '../models/EmployeeShiftSchedule.js';
import ShiftSwapRequest from '../models/ShiftSwapRequest.js';
import Department from '../models/Department.js';
import Employee from '../models/Employee.js';
import Shift from '../models/Shift.js';
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

// ==========================================
// DUTY ROSTER LINK ROUTES (Admin)
// ==========================================

// @route   GET /api/duty-roster/links
// @desc    Get all duty roster links
// @access  Private/Admin/HR
router.get('/links', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER), tenantGuard, async (req, res) => {
  try {
    // Super Admin has no tenant - return empty array
    if (!req.user.tenant) {
      return res.json({ success: true, data: [] });
    }

    const { month, year, department, status } = req.query;
    const filter = { tenant: req.user.tenant._id };

    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (department) filter.department = department;
    if (status) filter.status = status;

    const links = await DutyRosterLink.find(filter)
      .populate('department', 'name code')
      .populate('assignedTo', 'firstName lastName email employeeId')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: links,
    });
  } catch (error) {
    console.error('Get duty roster links error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/duty-roster/links
// @desc    Generate a new duty roster link for HOD
// @access  Private/Admin/HR
router.post('/links', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER), tenantGuard, [
  body('department').notEmpty().withMessage('Department is required'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Valid month is required (1-12)'),
  body('year').isInt({ min: 2024 }).withMessage('Valid year is required'),
  body('expiresAt').isISO8601().withMessage('Valid expiry date is required'),
], validate, async (req, res) => {
  try {
    const { department, month, year, expiresAt, notes } = req.body;

    // Get department and verify it has a head
    const dept = await Department.findOne({
      _id: department,
      tenant: req.user.tenant._id,
    }).populate('head');

    if (!dept) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    if (!dept.head) {
      return res.status(400).json({
        success: false,
        message: 'Department does not have a Head of Department assigned',
      });
    }

    // Check if link already exists for this department/month/year
    const existingLink = await DutyRosterLink.findOne({
      tenant: req.user.tenant._id,
      department,
      month,
      year,
    });

    if (existingLink && existingLink.status !== 'expired') {
      return res.status(400).json({
        success: false,
        message: 'A roster link already exists for this department and period',
        data: existingLink,
      });
    }

    // Create the link
    const link = await DutyRosterLink.create({
      tenant: req.user.tenant._id,
      department,
      assignedTo: dept.head._id,
      month,
      year,
      expiresAt: new Date(expiresAt),
      notes,
      createdBy: req.user._id,
    });

    const populatedLink = await DutyRosterLink.findById(link._id)
      .populate('department', 'name code')
      .populate('assignedTo', 'firstName lastName email employeeId')
      .populate('createdBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Duty roster link generated successfully',
      data: populatedLink,
    });
  } catch (error) {
    console.error('Create duty roster link error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A roster link already exists for this department and period',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/duty-roster/links/:id
// @desc    Update duty roster link (extend expiry, add notes)
// @access  Private/Admin/HR
router.put('/links/:id', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER), tenantGuard, async (req, res) => {
  try {
    const { expiresAt, notes, isActive } = req.body;
    const updateData = {};

    if (expiresAt) updateData.expiresAt = new Date(expiresAt);
    if (notes !== undefined) updateData.notes = notes;
    if (isActive !== undefined) updateData.isActive = isActive;

    const link = await DutyRosterLink.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant._id },
      updateData,
      { new: true }
    )
      .populate('department', 'name code')
      .populate('assignedTo', 'firstName lastName email employeeId');

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Duty roster link not found',
      });
    }

    res.json({
      success: true,
      message: 'Duty roster link updated',
      data: link,
    });
  } catch (error) {
    console.error('Update duty roster link error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   DELETE /api/duty-roster/links/:id
// @desc    Delete duty roster link
// @access  Private/Admin
router.delete('/links/:id', protect, authorize(ROLES.TENANT_ADMIN), tenantGuard, async (req, res) => {
  try {
    const link = await DutyRosterLink.findOneAndDelete({
      _id: req.params.id,
      tenant: req.user.tenant._id,
    });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Duty roster link not found',
      });
    }

    res.json({
      success: true,
      message: 'Duty roster link deleted',
    });
  } catch (error) {
    console.error('Delete duty roster link error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ==========================================
// PUBLIC HOD ROSTER ROUTES
// ==========================================

// @route   GET /api/duty-roster/public/:token
// @desc    Get roster link info and department employees (for HOD)
// @access  Public (token-based)
router.get('/public/:token', async (req, res) => {
  try {
    const link = await DutyRosterLink.findOne({ token: req.params.token })
      .populate('department', 'name code')
      .populate('assignedTo', 'firstName lastName email employeeId')
      .populate('tenant', 'name');

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired link',
      });
    }

    if (!link.isValid()) {
      return res.status(400).json({
        success: false,
        message: link.isExpired() ? 'This link has expired' : 'This link is no longer active',
      });
    }

    // Get department employees
    const employees = await Employee.find({
      tenant: link.tenant._id,
      department: link.department._id,
      isActive: true,
    }).select('firstName lastName employeeId email');

    // Get available shifts
    const shifts = await Shift.find({
      tenant: link.tenant._id,
      isActive: true,
    }).select('name code startTime endTime color workingDays');

    // Get existing schedules for this period
    const existingSchedules = await EmployeeShiftSchedule.find({
      tenant: link.tenant._id,
      department: link.department._id,
      month: link.month,
      year: link.year,
    }).populate('shift', 'name code color');

    // Update link status to in_progress if still pending
    if (link.status === 'pending') {
      link.status = 'in_progress';
      link.startedAt = new Date();
      await link.save();
    }

    res.json({
      success: true,
      data: {
        link: {
          _id: link._id,
          department: link.department,
          month: link.month,
          year: link.year,
          notes: link.notes,
          status: link.status,
          expiresAt: link.expiresAt,
        },
        organization: link.tenant.name,
        employees,
        shifts,
        existingSchedules,
      },
    });
  } catch (error) {
    console.error('Get public roster error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/duty-roster/public/:token/save
// @desc    Save roster schedules (for HOD)
// @access  Public (token-based)
router.post('/public/:token/save', [
  body('schedules').isArray().withMessage('Schedules must be an array'),
], validate, async (req, res) => {
  try {
    const link = await DutyRosterLink.findOne({ token: req.params.token });

    if (!link || !link.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired link',
      });
    }

    const { schedules } = req.body;

    // Process each schedule entry
    const operations = schedules.map(schedule => ({
      updateOne: {
        filter: {
          tenant: link.tenant,
          employee: schedule.employee,
          date: new Date(schedule.date),
        },
        update: {
          $set: {
            tenant: link.tenant,
            employee: schedule.employee,
            department: link.department,
            shift: schedule.shift,
            date: new Date(schedule.date),
            month: link.month,
            year: link.year,
            isDayOff: schedule.isDayOff || false,
            dayType: schedule.dayType || 'regular',
            customTiming: schedule.customTiming,
            notes: schedule.notes,
            dutyRosterLink: link._id,
          },
        },
        upsert: true,
      },
    }));

    await EmployeeShiftSchedule.bulkWrite(operations);

    res.json({
      success: true,
      message: 'Schedules saved successfully',
    });
  } catch (error) {
    console.error('Save roster error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/duty-roster/public/:token/complete
// @desc    Mark roster as completed (for HOD)
// @access  Public (token-based)
router.post('/public/:token/complete', async (req, res) => {
  try {
    const link = await DutyRosterLink.findOne({ token: req.params.token });

    if (!link || !link.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired link',
      });
    }

    link.status = 'completed';
    link.completedAt = new Date();
    await link.save();

    res.json({
      success: true,
      message: 'Roster marked as completed',
    });
  } catch (error) {
    console.error('Complete roster error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ==========================================
// EMPLOYEE SHIFT SCHEDULE ROUTES
// ==========================================

// @route   GET /api/duty-roster/schedules
// @desc    Get shift schedules (with filters)
// @access  Private
router.get('/schedules', protect, tenantGuard, async (req, res) => {
  try {
    const { month, year, department, employee } = req.query;
    const filter = { tenant: req.user.tenant._id, isActive: true };

    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (department) filter.department = department;
    if (employee) filter.employee = employee;

    const schedules = await EmployeeShiftSchedule.find(filter)
      .populate('employee', 'firstName lastName employeeId')
      .populate('department', 'name code')
      .populate('shift', 'name code startTime endTime color')
      .sort({ date: 1 });

    res.json({
      success: true,
      data: schedules,
    });
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/duty-roster/my-schedule
// @desc    Get current user's shift schedule
// @access  Private
router.get('/my-schedule', protect, tenantGuard, async (req, res) => {
  try {
    const { month, year } = req.query;

    // Superadmins don't have schedules
    if (!req.user.tenant) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Get employee record for current user
    const employee = await Employee.findOne({
      user: req.user._id,
      tenant: req.user.tenant._id,
    });

    if (!employee) {
      // User exists but has no employee record - return empty schedule
      return res.json({
        success: true,
        data: [],
      });
    }

    const filter = {
      tenant: req.user.tenant._id,
      employee: employee._id,
      isActive: true,
    };

    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);

    const schedules = await EmployeeShiftSchedule.find(filter)
      .populate('shift', 'name code startTime endTime color breakTime')
      .populate('department', 'name')
      .sort({ date: 1 });

    res.json({
      success: true,
      data: schedules,
    });
  } catch (error) {
    console.error('Get my schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ==========================================
// SHIFT SWAP REQUEST ROUTES
// ==========================================

// @route   GET /api/duty-roster/swap-requests
// @desc    Get shift swap requests
// @access  Private
router.get('/swap-requests', protect, tenantGuard, async (req, res) => {
  try {
    const { status, type } = req.query;

    // Superadmins don't have swap requests
    if (!req.user.tenant) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const filter = { tenant: req.user.tenant._id, isActive: true };

    if (status) filter.status = status;

    // Get employee record
    const employee = await Employee.findOne({
      user: req.user._id,
      tenant: req.user.tenant._id,
    });

    // If type is 'my', show requests by/for this employee
    // If type is 'admin', show all pending_admin requests (admin only)
    if (type === 'my' && employee) {
      filter.$or = [
        { requestedBy: employee._id },
        { swapWith: employee._id },
      ];
    }

    const requests = await ShiftSwapRequest.find(filter)
      .populate('requestedBy', 'firstName lastName employeeId')
      .populate('swapWith', 'firstName lastName employeeId')
      .populate({
        path: 'requesterSchedule',
        populate: { path: 'shift', select: 'name code startTime endTime color' },
      })
      .populate({
        path: 'targetSchedule',
        populate: { path: 'shift', select: 'name code startTime endTime color' },
      })
      .populate('adminApproval.approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error('Get swap requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/duty-roster/swap-requests
// @desc    Create a shift swap request
// @access  Private
router.post('/swap-requests', protect, tenantGuard, [
  body('swapWith').notEmpty().withMessage('Swap target employee is required'),
  body('requesterSchedule').notEmpty().withMessage('Your schedule is required'),
  body('targetSchedule').notEmpty().withMessage('Target schedule is required'),
  body('reason').notEmpty().withMessage('Reason for swap is required'),
], validate, async (req, res) => {
  try {
    const { swapWith, requesterSchedule, targetSchedule, reason } = req.body;

    // Get current user's employee record
    const employee = await Employee.findOne({
      user: req.user._id,
      tenant: req.user.tenant._id,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found',
      });
    }

    // Verify both schedules exist
    const [mySchedule, theirSchedule] = await Promise.all([
      EmployeeShiftSchedule.findOne({
        _id: requesterSchedule,
        tenant: req.user.tenant._id,
        employee: employee._id,
      }),
      EmployeeShiftSchedule.findOne({
        _id: targetSchedule,
        tenant: req.user.tenant._id,
        employee: swapWith,
      }),
    ]);

    if (!mySchedule || !theirSchedule) {
      return res.status(404).json({
        success: false,
        message: 'One or both schedules not found',
      });
    }

    const swapRequest = await ShiftSwapRequest.create({
      tenant: req.user.tenant._id,
      requestedBy: employee._id,
      swapWith,
      requesterSchedule,
      targetSchedule,
      requesterDate: mySchedule.date,
      targetDate: theirSchedule.date,
      reason,
    });

    const populatedRequest = await ShiftSwapRequest.findById(swapRequest._id)
      .populate('requestedBy', 'firstName lastName employeeId')
      .populate('swapWith', 'firstName lastName employeeId');

    res.status(201).json({
      success: true,
      message: 'Shift swap request submitted',
      data: populatedRequest,
    });
  } catch (error) {
    console.error('Create swap request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/duty-roster/swap-requests/:id/colleague-response
// @desc    Colleague responds to swap request
// @access  Private
router.put('/swap-requests/:id/colleague-response', protect, tenantGuard, [
  body('status').isIn(['accepted', 'declined']).withMessage('Valid status is required'),
], validate, async (req, res) => {
  try {
    const { status, comment } = req.body;

    // Get current user's employee record
    const employee = await Employee.findOne({
      user: req.user._id,
      tenant: req.user.tenant._id,
    });

    const request = await ShiftSwapRequest.findOne({
      _id: req.params.id,
      tenant: req.user.tenant._id,
      swapWith: employee._id,
      status: 'pending_colleague',
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Swap request not found or not awaiting your response',
      });
    }

    request.colleagueResponse = {
      status,
      respondedAt: new Date(),
      comment,
    };

    if (status === 'accepted') {
      request.status = 'pending_admin';
    } else {
      request.status = 'rejected';
    }

    await request.save();

    res.json({
      success: true,
      message: status === 'accepted' ? 'Request accepted, awaiting admin approval' : 'Request declined',
      data: request,
    });
  } catch (error) {
    console.error('Colleague response error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/duty-roster/swap-requests/:id/admin-approval
// @desc    Admin approves or rejects swap request
// @access  Private/Admin/HR
router.put('/swap-requests/:id/admin-approval', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER), tenantGuard, [
  body('status').isIn(['approved', 'rejected']).withMessage('Valid status is required'),
], validate, async (req, res) => {
  try {
    const { status, comment } = req.body;

    const request = await ShiftSwapRequest.findOne({
      _id: req.params.id,
      tenant: req.user.tenant._id,
      status: 'pending_admin',
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Swap request not found or not awaiting admin approval',
      });
    }

    request.adminApproval = {
      status,
      approvedBy: req.user._id,
      approvedAt: new Date(),
      comment,
    };

    if (status === 'approved') {
      request.status = 'approved';

      // Perform the actual swap in the schedules
      const [requesterSchedule, targetSchedule] = await Promise.all([
        EmployeeShiftSchedule.findById(request.requesterSchedule),
        EmployeeShiftSchedule.findById(request.targetSchedule),
      ]);

      if (requesterSchedule && targetSchedule) {
        // Swap the shifts
        const tempShift = requesterSchedule.shift;
        const tempCustomTiming = requesterSchedule.customTiming;

        requesterSchedule.shift = targetSchedule.shift;
        requesterSchedule.customTiming = targetSchedule.customTiming;
        requesterSchedule.isSwapped = true;
        requesterSchedule.swappedWith = request.swapWith;
        requesterSchedule.swapRequest = request._id;

        targetSchedule.shift = tempShift;
        targetSchedule.customTiming = tempCustomTiming;
        targetSchedule.isSwapped = true;
        targetSchedule.swappedWith = request.requestedBy;
        targetSchedule.swapRequest = request._id;

        await Promise.all([
          requesterSchedule.save(),
          targetSchedule.save(),
        ]);
      }
    } else {
      request.status = 'rejected';
    }

    await request.save();

    res.json({
      success: true,
      message: status === 'approved' ? 'Swap request approved and shifts swapped' : 'Swap request rejected',
      data: request,
    });
  } catch (error) {
    console.error('Admin approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/duty-roster/swap-requests/:id/cancel
// @desc    Cancel a swap request
// @access  Private
router.put('/swap-requests/:id/cancel', protect, tenantGuard, async (req, res) => {
  try {
    const { reason } = req.body;

    // Get current user's employee record
    const employee = await Employee.findOne({
      user: req.user._id,
      tenant: req.user.tenant._id,
    });

    const request = await ShiftSwapRequest.findOne({
      _id: req.params.id,
      tenant: req.user.tenant._id,
      requestedBy: employee._id,
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Swap request not found',
      });
    }

    if (!request.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: 'This request cannot be cancelled',
      });
    }

    request.status = 'cancelled';
    request.cancelledBy = req.user._id;
    request.cancelledAt = new Date();
    request.cancellationReason = reason;
    await request.save();

    res.json({
      success: true,
      message: 'Swap request cancelled',
      data: request,
    });
  } catch (error) {
    console.error('Cancel swap request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;
