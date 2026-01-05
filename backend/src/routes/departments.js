import express from 'express';
import { body, validationResult } from 'express-validator';
import { Department, Employee } from '../models/index.js';
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

// @route   GET /api/departments
// @desc    Get all departments for current tenant
// @access  Private
router.get('/', protect, tenantGuard, async (req, res) => {
  try {
    const { search, branch, parent, isActive, tenant } = req.query;

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

    if (branch) query.branch = branch;
    if (parent) query.parent = parent;
    if (parent === 'null') query.parent = null;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const departments = await Department.find(query)
      .populate('head', 'firstName lastName employeeId')
      .populate('branch', 'name code')
      .populate('parent', 'name code')
      .sort({ name: 1 });

    // Get employee counts
    const deptIds = departments.map(d => d._id);
    const employeeCounts = await Employee.aggregate([
      { $match: { department: { $in: deptIds }, isActive: true } },
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    employeeCounts.forEach(ec => {
      countMap[ec._id.toString()] = ec.count;
    });

    const departmentsWithCounts = departments.map(d => ({
      ...d.toObject(),
      employeeCount: countMap[d._id.toString()] || 0,
    }));

    res.json({
      success: true,
      data: departmentsWithCounts,
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/departments/tree
// @desc    Get departments as hierarchical tree
// @access  Private
router.get('/tree', protect, tenantGuard, async (req, res) => {
  try {
    const query = { isActive: true };
    if (req.user.tenant) {
      query.tenant = req.user.tenant._id;
    } else if (req.query.tenant) {
      query.tenant = req.query.tenant;
    }

    const departments = await Department.find(query)
      .populate('head', 'firstName lastName employeeId')
      .sort({ name: 1 });

    // Build tree structure
    const buildTree = (items, parentId = null) => {
      return items
        .filter(item => {
          if (parentId === null) return !item.parent;
          return item.parent?.toString() === parentId.toString();
        })
        .map(item => ({
          ...item.toObject(),
          children: buildTree(items, item._id),
        }));
    };

    const tree = buildTree(departments);

    res.json({
      success: true,
      data: tree,
    });
  } catch (error) {
    console.error('Get department tree error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/departments/:id
// @desc    Get department by ID
// @access  Private
router.get('/:id', protect, tenantGuard, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.tenant) {
      query.tenant = req.user.tenant._id;
    }

    const department = await Department.findOne(query)
      .populate('head', 'firstName lastName employeeId email')
      .populate('branch', 'name code')
      .populate('parent', 'name code')
      .populate('subDepartments', 'name code');

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    const employeeCount = await Employee.countDocuments({
      department: department._id,
      isActive: true,
    });

    res.json({
      success: true,
      data: {
        ...department.toObject(),
        employeeCount,
      },
    });
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/departments
// @desc    Create new department
// @access  Private/TenantAdmin/HRManager
router.post('/', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN), tenantGuard, [
  body('name').notEmpty().withMessage('Department name is required'),
  body('code').notEmpty().withMessage('Department code is required'),
], validate, async (req, res) => {
  try {
    const tenantId = req.user.tenant?._id || req.body.tenant;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant is required',
      });
    }

    const departmentData = {
      ...req.body,
      tenant: tenantId,
    };

    const department = await Department.create(departmentData);

    const populatedDepartment = await Department.findById(department._id)
      .populate('head', 'firstName lastName employeeId')
      .populate('branch', 'name code')
      .populate('parent', 'name code');

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: populatedDepartment,
    });
  } catch (error) {
    console.error('Create department error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Department code already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/departments/:id
// @desc    Update department
// @access  Private/TenantAdmin/HRManager
router.put('/:id', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN), tenantGuard, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.tenant) {
      query.tenant = req.user.tenant._id;
    }

    let department = await Department.findOne(query);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    // Prevent circular parent reference
    if (req.body.parent === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Department cannot be its own parent',
      });
    }

    department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('head', 'firstName lastName employeeId')
      .populate('branch', 'name code')
      .populate('parent', 'name code');

    res.json({
      success: true,
      message: 'Department updated successfully',
      data: department,
    });
  } catch (error) {
    console.error('Update department error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Department code already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   DELETE /api/departments/:id
// @desc    Delete department
// @access  Private/TenantAdmin
router.delete('/:id', protect, authorize(ROLES.TENANT_ADMIN, ROLES.SUPER_ADMIN), tenantGuard, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.tenant) {
      query.tenant = req.user.tenant._id;
    }

    const department = await Department.findOne(query);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    // Check for sub-departments
    const subDeptCount = await Department.countDocuments({ parent: department._id });
    if (subDeptCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department with ${subDeptCount} sub-departments. Please delete or reassign them first.`,
      });
    }

    // Check for employees
    const employeeCount = await Employee.countDocuments({ department: department._id });
    if (employeeCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department with ${employeeCount} employees. Please reassign them first.`,
      });
    }

    await department.deleteOne();

    res.json({
      success: true,
      message: 'Department deleted successfully',
    });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;
