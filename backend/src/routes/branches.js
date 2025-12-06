import express from 'express';
import { body, validationResult } from 'express-validator';
import { Branch, Employee } from '../models/index.js';
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

// @route   GET /api/branches
// @desc    Get all branches for current tenant
// @access  Private
router.get('/', protect, tenantGuard, async (req, res) => {
  try {
    const { search, isActive } = req.query;

    const query = { tenant: req.user.tenant._id };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const branches = await Branch.find(query)
      .populate('manager', 'firstName lastName employeeId')
      .sort({ isHeadquarters: -1, name: 1 });

    // Get employee counts
    const branchIds = branches.map(b => b._id);
    const employeeCounts = await Employee.aggregate([
      { $match: { branch: { $in: branchIds }, isActive: true } },
      { $group: { _id: '$branch', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    employeeCounts.forEach(ec => {
      countMap[ec._id.toString()] = ec.count;
    });

    const branchesWithCounts = branches.map(b => ({
      ...b.toObject(),
      employeeCount: countMap[b._id.toString()] || 0,
    }));

    res.json({
      success: true,
      data: branchesWithCounts,
    });
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/branches/:id
// @desc    Get branch by ID
// @access  Private
router.get('/:id', protect, tenantGuard, async (req, res) => {
  try {
    const branch = await Branch.findOne({
      _id: req.params.id,
      tenant: req.user.tenant._id,
    }).populate('manager', 'firstName lastName employeeId email');

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found',
      });
    }

    const employeeCount = await Employee.countDocuments({
      branch: branch._id,
      isActive: true,
    });

    res.json({
      success: true,
      data: {
        ...branch.toObject(),
        employeeCount,
      },
    });
  } catch (error) {
    console.error('Get branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/branches
// @desc    Create new branch
// @access  Private/TenantAdmin/HRManager
router.post('/', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER), tenantGuard, [
  body('name').notEmpty().withMessage('Branch name is required'),
  body('code').notEmpty().withMessage('Branch code is required'),
], validate, async (req, res) => {
  try {
    const tenant = req.user.tenant;

    // Check branch limit
    const currentBranchCount = await Branch.countDocuments({ tenant: tenant._id });
    if (tenant.subscription.maxBranches !== -1 && currentBranchCount >= tenant.subscription.maxBranches) {
      return res.status(400).json({
        success: false,
        message: `Branch limit reached. Your plan allows ${tenant.subscription.maxBranches} branches.`,
      });
    }

    const branchData = {
      ...req.body,
      tenant: tenant._id,
    };

    // Handle geolocation
    if (req.body.latitude && req.body.longitude) {
      branchData.location = {
        type: 'Point',
        coordinates: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)],
      };
    }

    const branch = await Branch.create(branchData);

    res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      data: branch,
    });
  } catch (error) {
    console.error('Create branch error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Branch code already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/branches/:id
// @desc    Update branch
// @access  Private/TenantAdmin/HRManager
router.put('/:id', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER), tenantGuard, async (req, res) => {
  try {
    let branch = await Branch.findOne({
      _id: req.params.id,
      tenant: req.user.tenant._id,
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found',
      });
    }

    // Handle geolocation update
    if (req.body.latitude && req.body.longitude) {
      req.body.location = {
        type: 'Point',
        coordinates: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)],
      };
    }

    branch = await Branch.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('manager', 'firstName lastName employeeId');

    res.json({
      success: true,
      message: 'Branch updated successfully',
      data: branch,
    });
  } catch (error) {
    console.error('Update branch error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Branch code already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/branches/:id/geofence
// @desc    Update branch geofence settings
// @access  Private/TenantAdmin/HRManager
router.put('/:id/geofence', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER), tenantGuard, [
  body('enabled').isBoolean().withMessage('Enabled must be a boolean'),
  body('radius').optional().isNumeric().withMessage('Radius must be a number'),
  body('latitude').optional().isNumeric().withMessage('Latitude must be a number'),
  body('longitude').optional().isNumeric().withMessage('Longitude must be a number'),
], validate, async (req, res) => {
  try {
    const branch = await Branch.findOne({
      _id: req.params.id,
      tenant: req.user.tenant._id,
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found',
      });
    }

    const { enabled, radius, latitude, longitude } = req.body;

    branch.geofence.enabled = enabled;
    if (radius) branch.geofence.radius = radius;

    if (latitude && longitude) {
      branch.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      };
    }

    await branch.save();

    res.json({
      success: true,
      message: 'Geofence settings updated successfully',
      data: branch,
    });
  } catch (error) {
    console.error('Update geofence error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   DELETE /api/branches/:id
// @desc    Delete branch
// @access  Private/TenantAdmin
router.delete('/:id', protect, authorize(ROLES.TENANT_ADMIN), tenantGuard, async (req, res) => {
  try {
    const branch = await Branch.findOne({
      _id: req.params.id,
      tenant: req.user.tenant._id,
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found',
      });
    }

    // Check if branch has employees
    const employeeCount = await Employee.countDocuments({ branch: branch._id });
    if (employeeCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete branch with ${employeeCount} employees. Please reassign them first.`,
      });
    }

    await branch.deleteOne();

    res.json({
      success: true,
      message: 'Branch deleted successfully',
    });
  } catch (error) {
    console.error('Delete branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;
