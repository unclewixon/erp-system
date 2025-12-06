import express from 'express';
import { body, validationResult } from 'express-validator';
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

// @route   GET /api/shifts
// @desc    Get all shifts
// @access  Private
router.get('/', protect, tenantGuard, async (req, res) => {
  try {
    const shifts = await Shift.find({
      tenant: req.user.tenant._id,
      isActive: true,
    }).sort({ name: 1 });

    res.json({
      success: true,
      data: shifts,
    });
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/shifts/:id
// @desc    Get shift by ID
// @access  Private
router.get('/:id', protect, tenantGuard, async (req, res) => {
  try {
    const shift = await Shift.findOne({
      _id: req.params.id,
      tenant: req.user.tenant._id,
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found',
      });
    }

    res.json({
      success: true,
      data: shift,
    });
  } catch (error) {
    console.error('Get shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/shifts
// @desc    Create new shift
// @access  Private/Admin/HR
router.post('/', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER), tenantGuard, [
  body('name').notEmpty().withMessage('Shift name is required'),
  body('code').notEmpty().withMessage('Shift code is required'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid start time format (HH:MM)'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid end time format (HH:MM)'),
], validate, async (req, res) => {
  try {
    const shift = await Shift.create({
      ...req.body,
      tenant: req.user.tenant._id,
    });

    res.status(201).json({
      success: true,
      message: 'Shift created successfully',
      data: shift,
    });
  } catch (error) {
    console.error('Create shift error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Shift code already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/shifts/:id
// @desc    Update shift
// @access  Private/Admin/HR
router.put('/:id', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER), tenantGuard, async (req, res) => {
  try {
    const shift = await Shift.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found',
      });
    }

    res.json({
      success: true,
      message: 'Shift updated successfully',
      data: shift,
    });
  } catch (error) {
    console.error('Update shift error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Shift code already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   DELETE /api/shifts/:id
// @desc    Delete shift
// @access  Private/Admin
router.delete('/:id', protect, authorize(ROLES.TENANT_ADMIN), tenantGuard, async (req, res) => {
  try {
    const shift = await Shift.findOne({
      _id: req.params.id,
      tenant: req.user.tenant._id,
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found',
      });
    }

    if (shift.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete default shift',
      });
    }

    await shift.deleteOne();

    res.json({
      success: true,
      message: 'Shift deleted successfully',
    });
  } catch (error) {
    console.error('Delete shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;
