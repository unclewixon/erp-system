import express from 'express';
import { body, validationResult } from 'express-validator';
import { Tenant, User, Employee, Branch, Department } from '../models/index.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES, SUBSCRIPTION_PLANS } from '../config/constants.js';

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

// @route   GET /api/tenants
// @desc    Get all tenants (Super Admin only)
// @access  Private/SuperAdmin
router.get('/', protect, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, plan, isActive } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (plan) {
      query['subscription.plan'] = plan;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const tenants = await Tenant.find(query)
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Tenant.countDocuments(query);

    // Get employee counts for each tenant
    const tenantIds = tenants.map(t => t._id);
    const employeeCounts = await Employee.aggregate([
      { $match: { tenant: { $in: tenantIds } } },
      { $group: { _id: '$tenant', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    employeeCounts.forEach(ec => {
      countMap[ec._id.toString()] = ec.count;
    });

    const tenantsWithCounts = tenants.map(t => ({
      ...t.toObject(),
      employeeCount: countMap[t._id.toString()] || 0,
    }));

    res.json({
      success: true,
      data: tenantsWithCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/tenants/current
// @desc    Get current tenant details
// @access  Private
router.get('/current', protect, async (req, res) => {
  try {
    if (!req.user.tenant) {
      return res.status(400).json({
        success: false,
        message: 'No organization associated with this user',
      });
    }

    const tenant = await Tenant.findById(req.user.tenant._id)
      .populate('createdBy', 'firstName lastName email');

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    // Get counts
    const [employeeCount, branchCount, departmentCount] = await Promise.all([
      Employee.countDocuments({ tenant: tenant._id }),
      Branch.countDocuments({ tenant: tenant._id }),
      Department.countDocuments({ tenant: tenant._id }),
    ]);

    res.json({
      success: true,
      data: {
        ...tenant.toObject(),
        employeeCount,
        branchCount,
        departmentCount,
      },
    });
  } catch (error) {
    console.error('Get current tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/tenants/:id
// @desc    Get tenant by ID (Super Admin only)
// @access  Private/SuperAdmin
router.get('/:id', protect, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email');

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    // Get counts
    const [employeeCount, branchCount, departmentCount, userCount] = await Promise.all([
      Employee.countDocuments({ tenant: tenant._id }),
      Branch.countDocuments({ tenant: tenant._id }),
      Department.countDocuments({ tenant: tenant._id }),
      User.countDocuments({ tenant: tenant._id }),
    ]);

    res.json({
      success: true,
      data: {
        ...tenant.toObject(),
        employeeCount,
        branchCount,
        departmentCount,
        userCount,
      },
    });
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/tenants/current
// @desc    Update current tenant
// @access  Private/TenantAdmin
router.put('/current', protect, authorize(ROLES.TENANT_ADMIN), [
  body('name').optional().notEmpty().withMessage('Organization name cannot be empty'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
], validate, async (req, res) => {
  try {
    const allowedFields = ['name', 'email', 'phone', 'address', 'industry', 'size', 'settings'];
    const updates = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const tenant = await Tenant.findByIdAndUpdate(
      req.user.tenant._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Organization updated successfully',
      data: tenant,
    });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/tenants/:id
// @desc    Update tenant (Super Admin only)
// @access  Private/SuperAdmin
router.put('/:id', protect, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    res.json({
      success: true,
      message: 'Organization updated successfully',
      data: tenant,
    });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/tenants/:id/subscription
// @desc    Update tenant subscription (Super Admin only)
// @access  Private/SuperAdmin
router.put('/:id/subscription', protect, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const { plan, endDate, isActive } = req.body;

    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    if (plan) tenant.subscription.plan = plan;
    if (endDate) tenant.subscription.endDate = endDate;
    if (isActive !== undefined) tenant.subscription.isActive = isActive;

    await tenant.save();

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: tenant,
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/tenants/:id/toggle-status
// @desc    Toggle tenant active status (Super Admin only)
// @access  Private/SuperAdmin
router.put('/:id/toggle-status', protect, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    tenant.isActive = !tenant.isActive;
    await tenant.save();

    res.json({
      success: true,
      message: `Organization ${tenant.isActive ? 'activated' : 'deactivated'} successfully`,
      data: tenant,
    });
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/tenants/:id/stats
// @desc    Get tenant statistics (Super Admin only)
// @access  Private/SuperAdmin
router.get('/:id/stats', protect, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    const [
      totalEmployees,
      activeEmployees,
      totalBranches,
      totalDepartments,
      totalUsers,
    ] = await Promise.all([
      Employee.countDocuments({ tenant: tenant._id }),
      Employee.countDocuments({ tenant: tenant._id, status: 'active' }),
      Branch.countDocuments({ tenant: tenant._id }),
      Department.countDocuments({ tenant: tenant._id }),
      User.countDocuments({ tenant: tenant._id }),
    ]);

    res.json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        totalBranches,
        totalDepartments,
        totalUsers,
        subscription: tenant.subscription,
      },
    });
  } catch (error) {
    console.error('Get tenant stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;
