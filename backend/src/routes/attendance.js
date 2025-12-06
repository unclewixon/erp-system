import express from 'express';
import { body, validationResult } from 'express-validator';
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import Branch from '../models/Branch.js';
import Holiday from '../models/Holiday.js';
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

// Helper: Calculate distance between two points (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Helper: Get today's date at midnight
const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

// @route   POST /api/attendance/clock-in
// @desc    Clock in for the day
// @access  Private
router.post('/clock-in', protect, tenantGuard, [
  body('latitude').optional().isNumeric(),
  body('longitude').optional().isNumeric(),
], validate, async (req, res) => {
  try {
    const { latitude, longitude, method = 'web', notes } = req.body;

    // Get employee
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

    const today = getToday();

    // Check if already clocked in today
    const existing = await Attendance.findOne({
      tenant: req.user.tenant._id,
      employee: employee._id,
      date: today,
    });

    if (existing?.clockIn?.time) {
      return res.status(400).json({
        success: false,
        message: 'Already clocked in today',
        data: existing,
      });
    }

    // Get branch for geofence check
    const branch = await Branch.findById(employee.branch);
    let withinGeofence = true;

    if (branch?.geofence?.enabled && latitude && longitude) {
      const [branchLng, branchLat] = branch.location.coordinates;
      const distance = calculateDistance(latitude, longitude, branchLat, branchLng);
      withinGeofence = distance <= branch.geofence.radius;

      if (!withinGeofence) {
        return res.status(400).json({
          success: false,
          message: `You are ${Math.round(distance)}m away from the office. Maximum allowed: ${branch.geofence.radius}m`,
        });
      }
    }

    // Determine if late
    const now = new Date();
    const shiftStart = employee.workSchedule?.shiftStart || '09:00';
    const [shiftHour, shiftMin] = shiftStart.split(':').map(Number);
    const expectedClockIn = new Date(today);
    expectedClockIn.setHours(shiftHour, shiftMin, 0, 0);

    const graceMinutes = 15;
    expectedClockIn.setMinutes(expectedClockIn.getMinutes() + graceMinutes);

    const isLate = now > expectedClockIn;
    const lateMinutes = isLate ? Math.round((now - expectedClockIn) / (1000 * 60)) + graceMinutes : 0;

    // Create or update attendance
    const attendanceData = {
      tenant: req.user.tenant._id,
      employee: employee._id,
      date: today,
      branch: employee.branch,
      clockIn: {
        time: now,
        location: latitude && longitude ? {
          type: 'Point',
          coordinates: [longitude, latitude],
        } : undefined,
        method,
        withinGeofence,
        ipAddress: req.ip,
        notes,
      },
      shift: {
        name: 'Regular',
        startTime: employee.workSchedule?.shiftStart || '09:00',
        endTime: employee.workSchedule?.shiftEnd || '17:00',
      },
      isLate,
      lateMinutes,
      status: isLate ? 'late' : 'present',
    };

    let attendance;
    if (existing) {
      attendance = await Attendance.findByIdAndUpdate(existing._id, attendanceData, { new: true });
    } else {
      attendance = await Attendance.create(attendanceData);
    }

    res.status(201).json({
      success: true,
      message: isLate ? `Clocked in (${lateMinutes} minutes late)` : 'Clocked in successfully',
      data: attendance,
    });
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/attendance/clock-out
// @desc    Clock out for the day
// @access  Private
router.post('/clock-out', protect, tenantGuard, [
  body('latitude').optional().isNumeric(),
  body('longitude').optional().isNumeric(),
], validate, async (req, res) => {
  try {
    const { latitude, longitude, method = 'web', notes } = req.body;

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

    const today = getToday();

    const attendance = await Attendance.findOne({
      tenant: req.user.tenant._id,
      employee: employee._id,
      date: today,
    });

    if (!attendance?.clockIn?.time) {
      return res.status(400).json({
        success: false,
        message: 'You have not clocked in today',
      });
    }

    if (attendance.clockOut?.time) {
      return res.status(400).json({
        success: false,
        message: 'Already clocked out today',
        data: attendance,
      });
    }

    // Check for early leave
    const now = new Date();
    const shiftEnd = employee.workSchedule?.shiftEnd || '17:00';
    const [shiftHour, shiftMin] = shiftEnd.split(':').map(Number);
    const expectedClockOut = new Date(today);
    expectedClockOut.setHours(shiftHour, shiftMin, 0, 0);

    const isEarlyLeave = now < expectedClockOut;
    const earlyLeaveMinutes = isEarlyLeave ? Math.round((expectedClockOut - now) / (1000 * 60)) : 0;

    // Get branch for geofence check
    const branch = await Branch.findById(employee.branch);
    let withinGeofence = true;

    if (branch?.geofence?.enabled && latitude && longitude) {
      const [branchLng, branchLat] = branch.location.coordinates;
      const distance = calculateDistance(latitude, longitude, branchLat, branchLng);
      withinGeofence = distance <= branch.geofence.radius;
    }

    attendance.clockOut = {
      time: now,
      location: latitude && longitude ? {
        type: 'Point',
        coordinates: [longitude, latitude],
      } : undefined,
      method,
      withinGeofence,
      ipAddress: req.ip,
      notes,
    };
    attendance.isEarlyLeave = isEarlyLeave;
    attendance.earlyLeaveMinutes = earlyLeaveMinutes;

    if (isEarlyLeave && earlyLeaveMinutes > 240) {
      attendance.status = 'half_day';
    } else if (isEarlyLeave) {
      attendance.status = 'early_leave';
    }

    await attendance.save();

    res.json({
      success: true,
      message: isEarlyLeave ? `Clocked out (${earlyLeaveMinutes} minutes early)` : 'Clocked out successfully',
      data: attendance,
    });
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/attendance/today
// @desc    Get today's attendance for current user
// @access  Private
router.get('/today', protect, tenantGuard, async (req, res) => {
  try {
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

    const today = getToday();

    const attendance = await Attendance.findOne({
      tenant: req.user.tenant._id,
      employee: employee._id,
      date: today,
    });

    res.json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/attendance/my-history
// @desc    Get attendance history for current user
// @access  Private
router.get('/my-history', protect, tenantGuard, async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 30 } = req.query;

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

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Attendance.countDocuments(query);

    res.json({
      success: true,
      data: attendance,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get attendance history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/attendance
// @desc    Get all attendance records (HR/Admin)
// @access  Private/HR
router.get('/', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER, ROLES.HR_OFFICER), tenantGuard, async (req, res) => {
  try {
    const {
      date,
      startDate,
      endDate,
      employee,
      department,
      branch,
      status,
      page = 1,
      limit = 50,
    } = req.query;

    const query = { tenant: req.user.tenant._id };

    if (date) {
      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);
      query.date = selectedDate;
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (employee) query.employee = employee;
    if (branch) query.branch = branch;
    if (status) query.status = status;

    // If department filter, get employees in that department first
    if (department) {
      const deptEmployees = await Employee.find({ department }).select('_id');
      query.employee = { $in: deptEmployees.map(e => e._id) };
    }

    const attendance = await Attendance.find(query)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('branch', 'name code')
      .sort({ date: -1, 'clockIn.time': -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Attendance.countDocuments(query);

    res.json({
      success: true,
      data: attendance,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/attendance/summary
// @desc    Get attendance summary for a period
// @access  Private/HR
router.get('/summary', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER, ROLES.HR_OFFICER), tenantGuard, async (req, res) => {
  try {
    const { startDate, endDate, department, branch } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const matchStage = {
      tenant: req.user.tenant._id,
      date: { $gte: start, $lte: end },
    };

    if (branch) matchStage.branch = branch;

    // Get employee IDs if department filter
    if (department) {
      const deptEmployees = await Employee.find({ department }).select('_id');
      matchStage.employee = { $in: deptEmployees.map(e => e._id) };
    }

    const summary = await Attendance.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalHours: { $sum: '$workHours.actual' },
          totalOvertime: { $sum: '$workHours.overtime' },
        },
      },
    ]);

    const dailySummary = await Attendance.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          late: { $sum: { $cond: ['$isLate', 1, 0] } },
          earlyLeave: { $sum: { $cond: ['$isEarlyLeave', 1, 0] } },
          totalEmployees: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        byStatus: summary,
        daily: dailySummary,
        period: { start, end },
      },
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/attendance/manual
// @desc    Create manual attendance entry (HR/Admin)
// @access  Private/HR
router.post('/manual', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER), tenantGuard, [
  body('employee').notEmpty().withMessage('Employee is required'),
  body('date').notEmpty().withMessage('Date is required'),
  body('clockIn').notEmpty().withMessage('Clock in time is required'),
], validate, async (req, res) => {
  try {
    const { employee: employeeId, date, clockIn, clockOut, status, notes } = req.body;

    const employee = await Employee.findOne({
      _id: employeeId,
      tenant: req.user.tenant._id,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Check if attendance already exists
    const existing = await Attendance.findOne({
      tenant: req.user.tenant._id,
      employee: employee._id,
      date: attendanceDate,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Attendance record already exists for this date',
      });
    }

    const attendance = await Attendance.create({
      tenant: req.user.tenant._id,
      employee: employee._id,
      date: attendanceDate,
      branch: employee.branch,
      clockIn: {
        time: new Date(clockIn),
        method: 'manual',
      },
      clockOut: clockOut ? {
        time: new Date(clockOut),
        method: 'manual',
      } : undefined,
      status: status || 'present',
      regularization: {
        isRegularized: true,
        reason: notes || 'Manual entry by HR',
        requestedBy: req.user._id,
        approvedBy: req.user._id,
        status: 'approved',
        requestedAt: new Date(),
        approvedAt: new Date(),
      },
      notes,
    });

    res.status(201).json({
      success: true,
      message: 'Manual attendance created successfully',
      data: attendance,
    });
  } catch (error) {
    console.error('Manual attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/attendance/:id
// @desc    Update attendance record (HR/Admin)
// @access  Private/HR
router.put('/:id', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER), tenantGuard, async (req, res) => {
  try {
    const attendance = await Attendance.findOne({
      _id: req.params.id,
      tenant: req.user.tenant._id,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    const allowedUpdates = ['clockIn', 'clockOut', 'status', 'notes', 'breaks'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Mark as regularized if times are being changed
    if (updates.clockIn || updates.clockOut) {
      updates.regularization = {
        isRegularized: true,
        reason: req.body.reason || 'Updated by HR',
        approvedBy: req.user._id,
        status: 'approved',
        approvedAt: new Date(),
      };
    }

    const updated = await Attendance.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('employee', 'firstName lastName employeeId');

    res.json({
      success: true,
      message: 'Attendance updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;
