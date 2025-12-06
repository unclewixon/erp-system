import express from 'express';
import { Tenant, User, Employee, Branch, Department } from '../models/index.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// All routes require super admin access
router.use(protect, authorize(ROLES.SUPER_ADMIN));

// @route   GET /api/admin/tenants
// @desc    Get all tenants (alias for /api/tenants)
// @access  Private/SuperAdmin
router.get('/tenants', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, plan, isActive } = req.query;

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

// @route   POST /api/admin/tenants
// @desc    Create a new tenant
// @access  Private/SuperAdmin
router.post('/tenants', async (req, res) => {
  try {
    const { name, email, phone, industry, size, plan } = req.body;

    // Check if tenant already exists
    const existingTenant = await Tenant.findOne({ email });
    if (existingTenant) {
      return res.status(400).json({
        success: false,
        message: 'Organization with this email already exists',
      });
    }

    const tenant = await Tenant.create({
      name,
      email,
      phone,
      industry,
      size,
      subscription: { plan: plan || 'starter' },
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      data: tenant,
    });
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/admin/tenants/:id
// @desc    Update a tenant
// @access  Private/SuperAdmin
router.put('/tenants/:id', async (req, res) => {
  try {
    const { name, email, phone, industry, size, plan, isActive } = req.body;

    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    if (name) tenant.name = name;
    if (email) tenant.email = email;
    if (phone !== undefined) tenant.phone = phone;
    if (industry !== undefined) tenant.industry = industry;
    if (size) tenant.size = size;
    if (plan) tenant.subscription.plan = plan;
    if (isActive !== undefined) tenant.isActive = isActive;

    await tenant.save();

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

// @route   DELETE /api/admin/tenants/:id
// @desc    Delete a tenant
// @access  Private/SuperAdmin
router.delete('/tenants/:id', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    // Soft delete - just deactivate
    tenant.isActive = false;
    await tenant.save();

    res.json({
      success: true,
      message: 'Organization deleted successfully',
    });
  } catch (error) {
    console.error('Delete tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/admin/analytics
// @desc    Get platform analytics
// @access  Private/SuperAdmin
router.get('/analytics', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get total counts
    const [totalTenants, activeTenants, totalEmployees, totalUsers] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ isActive: true }),
      Employee.countDocuments(),
      User.countDocuments(),
    ]);

    // Get plan distribution
    const planDistribution = await Tenant.aggregate([
      { $group: { _id: '$subscription.plan', count: { $sum: 1 } } },
    ]);

    const planData = planDistribution.map(p => ({
      plan: p._id ? p._id.charAt(0).toUpperCase() + p._id.slice(1) : 'Starter',
      count: p.count,
      percentage: Math.round((p.count / totalTenants) * 100),
    }));

    // Get recent tenants
    const recentTenants = await Tenant.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name subscription.plan createdAt');

    // Get monthly growth (mock data for now - would need historical tracking)
    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
    const baseCount = Math.max(totalTenants - 15, 10);
    const monthlyGrowth = months.map((month, index) => ({
      month,
      tenants: baseCount + (index * 3) + Math.floor(Math.random() * 5),
      revenue: (baseCount + index * 3) * 25000 + Math.floor(Math.random() * 10000),
    }));

    // Calculate estimated monthly revenue based on plans
    let monthlyRevenue = 0;
    planDistribution.forEach(p => {
      switch (p._id) {
        case 'starter':
          monthlyRevenue += p.count * 15000;
          break;
        case 'professional':
          monthlyRevenue += p.count * 45000;
          break;
        case 'enterprise':
          monthlyRevenue += p.count * 150000;
          break;
        default:
          monthlyRevenue += p.count * 15000;
      }
    });

    res.json({
      success: true,
      data: {
        totalTenants,
        activeTenants,
        totalEmployees,
        totalUsers,
        monthlyRevenue,
        planDistribution: planData,
        recentTenants: recentTenants.map(t => ({
          name: t.name,
          plan: t.subscription?.plan || 'starter',
          createdAt: t.createdAt,
        })),
        monthlyGrowth,
      },
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;
