import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import { BenefitPlan, EmployeeBenefit } from '../models/Benefit.js';
import Employee from '../models/Employee.js';

const router = express.Router();

router.use(protect);
router.use(tenantGuard);

// ============ BENEFIT PLANS ============

// Get all benefit plans
router.get('/plans', async (req, res) => {
  try {
    // Super Admin has no tenant - return empty array
    if (!req.user.tenant) {
      return res.json({ success: true, data: [] });
    }

    const plans = await BenefitPlan.find({
      tenant: req.user.tenant,
      isActive: true,
    })
      .populate('eligibility.departments', 'name')
      .populate('eligibility.designations', 'title');

    res.json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create benefit plan
router.post('/plans', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const plan = await BenefitPlan.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update benefit plan
router.put('/plans/:id', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const plan = await BenefitPlan.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Benefit plan not found' });
    }

    res.json({ success: true, data: plan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete benefit plan
router.delete('/plans/:id', authorize('super_admin', 'tenant_admin'), async (req, res) => {
  try {
    const plan = await BenefitPlan.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      { isActive: false },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Benefit plan not found' });
    }

    res.json({ success: true, message: 'Benefit plan deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ EMPLOYEE BENEFITS ============

// Get all employee benefits
router.get('/', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    // Super Admin has no tenant - return empty array
    if (!req.user.tenant) {
      return res.json({ success: true, data: [] });
    }

    const { status, planId } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (planId) query.benefitPlan = planId;

    const benefits = await EmployeeBenefit.find(query)
      .populate('employee', 'firstName lastName employeeId')
      .populate('benefitPlan', 'name type')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: benefits });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get my benefits
router.get('/my', async (req, res) => {
  try {
    // Super Admin has no tenant - return empty array
    if (!req.user.tenant) {
      return res.json({ success: true, data: [] });
    }

    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.json({ success: true, data: [] });
    }

    const benefits = await EmployeeBenefit.find({
      tenant: req.user.tenant,
      employee: employee._id,
    }).populate('benefitPlan');

    res.json({ success: true, data: benefits });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get employee benefits
router.get('/employee/:employeeId', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const benefits = await EmployeeBenefit.find({
      tenant: req.user.tenant,
      employee: req.params.employeeId,
    }).populate('benefitPlan');

    res.json({ success: true, data: benefits });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Enroll in benefit
router.post('/enroll', async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const plan = await BenefitPlan.findOne({
      _id: req.body.benefitPlanId,
      tenant: req.user.tenant,
      isActive: true,
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Benefit plan not found' });
    }

    // Check if already enrolled
    const existing = await EmployeeBenefit.findOne({
      tenant: req.user.tenant,
      employee: employee._id,
      benefitPlan: plan._id,
      status: { $in: ['pending', 'active'] },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Already enrolled in this benefit' });
    }

    const benefit = await EmployeeBenefit.create({
      tenant: req.user.tenant,
      employee: employee._id,
      benefitPlan: plan._id,
      enrollmentDate: new Date(),
      effectiveDate: req.body.effectiveDate || new Date(),
      coverageType: req.body.coverageType,
      dependents: req.body.dependents,
      contribution: {
        employerAmount: plan.contribution.employerAmount,
        employeeAmount: plan.contribution.employeeAmount,
      },
      status: 'pending',
    });

    res.status(201).json({ success: true, data: benefit });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Enroll employee (HR)
router.post('/enroll/:employeeId', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const plan = await BenefitPlan.findOne({
      _id: req.body.benefitPlanId,
      tenant: req.user.tenant,
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Benefit plan not found' });
    }

    const benefit = await EmployeeBenefit.create({
      ...req.body,
      tenant: req.user.tenant,
      employee: req.params.employeeId,
      benefitPlan: plan._id,
      enrollmentDate: new Date(),
      contribution: {
        employerAmount: plan.contribution.employerAmount,
        employeeAmount: plan.contribution.employeeAmount,
      },
      status: req.body.status || 'active',
      approvedBy: req.user._id,
      approvedAt: new Date(),
    });

    res.status(201).json({ success: true, data: benefit });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Approve enrollment
router.post('/:id/approve', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const benefit = await EmployeeBenefit.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: 'pending' },
      {
        status: 'active',
        approvedBy: req.user._id,
        approvedAt: new Date(),
      },
      { new: true }
    );

    if (!benefit) {
      return res.status(404).json({ success: false, message: 'Benefit enrollment not found' });
    }

    res.json({ success: true, data: benefit });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Terminate benefit
router.post('/:id/terminate', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const benefit = await EmployeeBenefit.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      {
        status: 'terminated',
        endDate: req.body.endDate || new Date(),
        notes: req.body.reason,
      },
      { new: true }
    );

    if (!benefit) {
      return res.status(404).json({ success: false, message: 'Benefit not found' });
    }

    res.json({ success: true, data: benefit });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get benefit stats
router.get('/stats/summary', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    // Super Admin has no tenant - return empty stats
    if (!req.user.tenant) {
      return res.json({ success: true, data: { byPlan: [], byStatus: [] } });
    }

    const [planStats, statusStats] = await Promise.all([
      EmployeeBenefit.aggregate([
        { $match: { tenant: req.user.tenant, status: 'active' } },
        { $group: { _id: '$benefitPlan', count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'benefitplans',
            localField: '_id',
            foreignField: '_id',
            as: 'plan',
          },
        },
        { $unwind: '$plan' },
        { $project: { planName: '$plan.name', planType: '$plan.type', count: 1 } },
      ]),
      EmployeeBenefit.aggregate([
        { $match: { tenant: req.user.tenant } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        byPlan: planStats,
        byStatus: statusStats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
