import express from 'express';
import { body, validationResult } from 'express-validator';
import { Employee, User, Tenant } from '../models/index.js';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import { ROLES, EMPLOYEE_STATUS } from '../config/constants.js';

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

// Generate employee ID
const generateEmployeeId = async (tenantId, prefix = 'EMP') => {
  const count = await Employee.countDocuments({ tenant: tenantId });
  const paddedNumber = String(count + 1).padStart(4, '0');
  return `${prefix}${paddedNumber}`;
};

// @route   GET /api/employees
// @desc    Get all employees for current tenant
// @access  Private
router.get('/', protect, tenantGuard, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      department,
      branch,
      designation,
      status,
      employmentType,
      tenant,
    } = req.query;

    // Super Admin can see all or filter by tenant query param
    const query = {};
    if (req.user.tenant) {
      query.tenant = req.user.tenant._id;
    } else if (tenant) {
      query.tenant = tenant;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    if (department) query.department = department;
    if (branch) query.branch = branch;
    if (designation) query.designation = designation;
    if (status) query.status = status;
    if (employmentType) query.employmentType = employmentType;

    const employees = await Employee.find(query)
      .populate('department', 'name code')
      .populate('branch', 'name code')
      .populate('designation', 'name code level')
      .populate('reportsTo', 'firstName lastName employeeId')
      .populate('user', 'email role isActive lastLogin')
      .sort({ firstName: 1, lastName: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Employee.countDocuments(query);

    res.json({
      success: true,
      data: employees,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/employees/directory
// @desc    Get employee directory (minimal info)
// @access  Private
router.get('/directory', protect, tenantGuard, async (req, res) => {
  try {
    const { search, department, branch, tenant } = req.query;

    // Super Admin can see all or filter by tenant query param
    const query = { isActive: true };
    if (req.user.tenant) {
      query.tenant = req.user.tenant._id;
    } else if (tenant) {
      query.tenant = tenant;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    if (department) query.department = department;
    if (branch) query.branch = branch;

    const employees = await Employee.find(query)
      .select('firstName lastName employeeId email phone avatar department designation branch')
      .populate('department', 'name')
      .populate('designation', 'name')
      .populate('branch', 'name')
      .sort({ firstName: 1, lastName: 1 });

    res.json({
      success: true,
      data: employees,
    });
  } catch (error) {
    console.error('Get directory error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/employees/org-chart
// @desc    Get organizational chart data
// @access  Private
router.get('/org-chart', protect, tenantGuard, async (req, res) => {
  try {
    const query = { isActive: true };
    if (req.user.tenant) {
      query.tenant = req.user.tenant._id;
    } else if (req.query.tenant) {
      query.tenant = req.query.tenant;
    }

    const employees = await Employee.find(query)
      .select('firstName lastName employeeId avatar designation department reportsTo')
      .populate('designation', 'name level')
      .populate('department', 'name');

    // Build org chart tree
    const buildTree = (items, parentId = null) => {
      return items
        .filter(item => {
          if (parentId === null) return !item.reportsTo;
          return item.reportsTo?.toString() === parentId.toString();
        })
        .map(item => ({
          ...item.toObject(),
          subordinates: buildTree(items, item._id),
        }));
    };

    const orgChart = buildTree(employees);

    res.json({
      success: true,
      data: orgChart,
    });
  } catch (error) {
    console.error('Get org chart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/employees/stats
// @desc    Get employee statistics
// @access  Private
router.get('/stats', protect, tenantGuard, async (req, res) => {
  try {
    const tenantId = req.user.tenant?._id || req.query.tenant;
    if (!tenantId) {
      return res.json({
        success: true,
        data: {
          totalEmployees: 0,
          activeEmployees: 0,
          onLeaveEmployees: 0,
          departmentStats: [],
          employmentTypeStats: [],
          recentHires: [],
        },
      });
    }

    const [
      totalEmployees,
      activeEmployees,
      onLeaveEmployees,
      departmentStats,
      employmentTypeStats,
      recentHires,
    ] = await Promise.all([
      Employee.countDocuments({ tenant: tenantId }),
      Employee.countDocuments({ tenant: tenantId, status: EMPLOYEE_STATUS.ACTIVE }),
      Employee.countDocuments({ tenant: tenantId, status: EMPLOYEE_STATUS.ON_LEAVE }),
      Employee.aggregate([
        { $match: { tenant: tenantId, isActive: true } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'departments',
            localField: '_id',
            foreignField: '_id',
            as: 'department'
          }
        },
        { $unwind: '$department' },
        { $project: { name: '$department.name', count: 1 } }
      ]),
      Employee.aggregate([
        { $match: { tenant: tenantId, isActive: true } },
        { $group: { _id: '$employmentType', count: { $sum: 1 } } }
      ]),
      Employee.find({ tenant: tenantId })
        .sort({ hireDate: -1 })
        .limit(5)
        .select('firstName lastName employeeId hireDate department')
        .populate('department', 'name'),
    ]);

    res.json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        onLeaveEmployees,
        departmentStats,
        employmentTypeStats,
        recentHires,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/employees/:id
// @desc    Get employee by ID
// @access  Private
router.get('/:id', protect, tenantGuard, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.tenant) {
      query.tenant = req.user.tenant._id;
    }

    const employee = await Employee.findOne(query)
      .populate('department', 'name code')
      .populate('branch', 'name code address')
      .populate('designation', 'name code level salaryGrade')
      .populate('reportsTo', 'firstName lastName employeeId email phone avatar')
      .populate('user', 'email role isActive lastLogin createdAt')
      .populate('directReports', 'firstName lastName employeeId designation');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    res.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/employees
// @desc    Create new employee
// @access  Private/TenantAdmin/HRManager/HROfficer
router.post('/', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER, ROLES.HR_OFFICER, ROLES.SUPER_ADMIN), tenantGuard, [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('department').notEmpty().withMessage('Department is required'),
  body('branch').notEmpty().withMessage('Branch is required'),
  body('designation').notEmpty().withMessage('Designation is required'),
  body('hireDate').notEmpty().withMessage('Hire date is required'),
], validate, async (req, res) => {
  try {
    const tenantId = req.user.tenant?._id || req.body.tenant;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant is required',
      });
    }

    const tenant = await Tenant.findById(tenantId);

    // Check employee limit
    const currentEmployeeCount = await Employee.countDocuments({ tenant: tenant._id });
    if (tenant.subscription.maxEmployees !== -1 && currentEmployeeCount >= tenant.subscription.maxEmployees) {
      return res.status(400).json({
        success: false,
        message: `Employee limit reached. Your plan allows ${tenant.subscription.maxEmployees} employees.`,
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: req.body.email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // Generate employee ID
    const employeeId = req.body.employeeId || await generateEmployeeId(tenant._id);

    // Create user account
    const tempPassword = `Temp@${Date.now().toString().slice(-6)}`;
    const user = await User.create({
      email: req.body.email.toLowerCase(),
      password: tempPassword,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone,
      role: req.body.role || ROLES.EMPLOYEE,
      tenant: tenant._id,
    });

    // Create employee
    const employeeData = {
      ...req.body,
      tenant: tenant._id,
      user: user._id,
      employeeId,
      email: req.body.email.toLowerCase(),
      workSchedule: req.body.workSchedule || {
        shiftStart: tenant.settings.workingHours.start,
        shiftEnd: tenant.settings.workingHours.end,
        workingDays: tenant.settings.workingDays,
      },
    };

    const employee = await Employee.create(employeeData);

    // Update user with employee reference
    user.employee = employee._id;
    await user.save({ validateBeforeSave: false });

    const populatedEmployee = await Employee.findById(employee._id)
      .populate('department', 'name code')
      .populate('branch', 'name code')
      .populate('designation', 'name code level')
      .populate('reportsTo', 'firstName lastName employeeId')
      .populate('user', 'email role isActive');

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: populatedEmployee,
      tempPassword, // In production, this should be sent via email
    });
  } catch (error) {
    console.error('Create employee error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID or email already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/employees/:id
// @desc    Update employee
// @access  Private/TenantAdmin/HRManager/HROfficer
router.put('/:id', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER, ROLES.HR_OFFICER, ROLES.SUPER_ADMIN), tenantGuard, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.tenant) {
      query.tenant = req.user.tenant._id;
    }

    let employee = await Employee.findOne(query);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    // Remove fields that shouldn't be updated directly
    const { user, tenant, employeeId, ...updateData } = req.body;

    employee = await Employee.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('department', 'name code')
      .populate('branch', 'name code')
      .populate('designation', 'name code level')
      .populate('reportsTo', 'firstName lastName employeeId')
      .populate('user', 'email role isActive');

    // Update user's first/last name if changed
    if (req.body.firstName || req.body.lastName) {
      await User.findByIdAndUpdate(employee.user._id, {
        firstName: req.body.firstName || employee.firstName,
        lastName: req.body.lastName || employee.lastName,
      });
    }

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: employee,
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/employees/:id/status
// @desc    Update employee status
// @access  Private/TenantAdmin/HRManager
router.put('/:id/status', protect, authorize(ROLES.TENANT_ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN), tenantGuard, [
  body('status').isIn(Object.values(EMPLOYEE_STATUS)).withMessage('Invalid status'),
], validate, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.tenant) {
      query.tenant = req.user.tenant._id;
    }

    const employee = await Employee.findOne(query);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    const { status, terminationDate, notes } = req.body;

    employee.status = status;
    if (terminationDate) employee.terminationDate = terminationDate;
    if (notes) employee.notes = notes;

    // Deactivate user account if terminated or resigned
    if ([EMPLOYEE_STATUS.TERMINATED, EMPLOYEE_STATUS.RESIGNED].includes(status)) {
      employee.isActive = false;
      await User.findByIdAndUpdate(employee.user, { isActive: false });
    }

    await employee.save();

    res.json({
      success: true,
      message: 'Employee status updated successfully',
      data: employee,
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   DELETE /api/employees/:id
// @desc    Delete employee (soft delete)
// @access  Private/TenantAdmin
router.delete('/:id', protect, authorize(ROLES.TENANT_ADMIN, ROLES.SUPER_ADMIN), tenantGuard, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.tenant) {
      query.tenant = req.user.tenant._id;
    }

    const employee = await Employee.findOne(query);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    // Soft delete - mark as inactive
    employee.isActive = false;
    employee.status = EMPLOYEE_STATUS.TERMINATED;
    await employee.save();

    // Deactivate user account
    await User.findByIdAndUpdate(employee.user, { isActive: false });

    res.json({
      success: true,
      message: 'Employee deleted successfully',
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;
