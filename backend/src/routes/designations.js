import express from 'express';
import { body, validationResult } from 'express-validator';
import { Designation, Employee } from '../models/index.js';
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

// @route   GET /api/designations
// @desc    Get all designations for current tenant
// @access  Private
router.get('/', protect, tenantGuard, async (req, res) => {
  try {
    const { search, department, level, isActive, tenant } = req.query;

    // Super Admin can see all or filter by tenant query param
    const query = {};
    if (req.user.tenant) {
      query.tenant = req.user.tenant._id;
    } else if (tenant) {
      query.tenant = tenant;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    if (department) query.department = department;
    if (level) query.level = parseInt(level);
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const designations = await Designation.find(query)
      .populate('department', 'name code')
      .sort({ level: 1, name: 1 });

    // Get employee counts
    const desigIds = designations.map(d => d._id);
    const employeeCounts = await Employee.aggregate([
      { $match: { designation: { $in: desigIds }, isActive: true } },
      { $group: { _id: '$designation', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    employeeCounts.forEach(ec => {
      countMap[ec._id.toString()] = ec.count;
    });

    const designationsWithCounts = designations.map(d => ({
      ...d.toObject(),
      employeeCount: countMap[d._id.toString()] || 0,
    }));

    res.json({
      success: true,
      data: designationsWithCounts,
    });
  } catch (error) {
    console.error('Get designations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/designations/:id
// @desc    Get designation by ID
// @access  Private
router.get('/:id', protect, tenantGuard, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.tenant) {
      query.tenant = req.user.tenant._id;
    }

    const designation = await Designation.findOne(query).populate('department', 'name code');

    if (!designation) {
      return res.status(404).json({
        success: false,
        message: 'Designation not found',
      });
    }

    const employeeCount = await Employee.countDocuments({
      designation: designation._id,
      isActive: true,
    });

    res.json({
      success: true,
      data: {
        ...designation.toObject(),
        employeeCount,
      },
    });
  } catch (error) {
    console.error('Get designation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/designations
// @desc    Create new designation
// @access  Private/TenantAdmin/HRManager
router.post('/', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN), tenantGuard, [
  body('name').notEmpty().withMessage('Designation name is required'),
  body('code').notEmpty().withMessage('Designation code is required'),
], validate, async (req, res) => {
  try {
    const tenantId = req.user.tenant?._id || req.body.tenant;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant is required',
      });
    }

    const designationData = {
      ...req.body,
      tenant: tenantId,
    };

    const designation = await Designation.create(designationData);

    const populatedDesignation = await Designation.findById(designation._id)
      .populate('department', 'name code');

    res.status(201).json({
      success: true,
      message: 'Designation created successfully',
      data: populatedDesignation,
    });
  } catch (error) {
    console.error('Create designation error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Designation code already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/designations/:id
// @desc    Update designation
// @access  Private/TenantAdmin/HRManager
router.put('/:id', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN), tenantGuard, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.tenant) {
      query.tenant = req.user.tenant._id;
    }

    let designation = await Designation.findOne(query);

    if (!designation) {
      return res.status(404).json({
        success: false,
        message: 'Designation not found',
      });
    }

    designation = await Designation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('department', 'name code');

    res.json({
      success: true,
      message: 'Designation updated successfully',
      data: designation,
    });
  } catch (error) {
    console.error('Update designation error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Designation code already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   DELETE /api/designations/:id
// @desc    Delete designation
// @access  Private/TenantAdmin
router.delete('/:id', protect, authorize(ROLES.TENANT_ADMIN, ROLES.SUPER_ADMIN), tenantGuard, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.tenant) {
      query.tenant = req.user.tenant._id;
    }

    const designation = await Designation.findOne(query);

    if (!designation) {
      return res.status(404).json({
        success: false,
        message: 'Designation not found',
      });
    }

    // Check for employees
    const employeeCount = await Employee.countDocuments({ designation: designation._id });
    if (employeeCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete designation with ${employeeCount} employees. Please reassign them first.`,
      });
    }

    await designation.deleteOne();

    res.json({
      success: true,
      message: 'Designation deleted successfully',
    });
  } catch (error) {
    console.error('Delete designation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;
