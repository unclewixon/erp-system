import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import { Goal, ReviewCycle, PerformanceReview } from '../models/index.js';
import Employee from '../models/Employee.js';

const router = express.Router();

// Apply middleware
router.use(protect);
router.use(tenantGuard);

// ============ GOALS ============

// Get my goals
router.get('/goals/my', async (req, res) => {
  try {
    // Super Admin doesn't have employee record - return empty
    if (!req.user.tenant) {
      return res.json({ success: true, data: [] });
    }

    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.json({ success: true, data: [] });
    }

    const { status, reviewCycle } = req.query;
    const query = { tenant: req.user.tenant._id, employee: employee._id };

    if (status) query.status = status;
    if (reviewCycle) query.reviewCycle = reviewCycle;

    const goals = await Goal.find(query)
      .populate('reviewCycle', 'name year type')
      .populate('alignedTo', 'title')
      .sort({ dueDate: 1 });

    res.json({ success: true, data: goals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get team goals (for managers)
router.get('/goals/team', authorize('super_admin', 'tenant_admin', 'hr_manager', 'department_head', 'team_lead'), async (req, res) => {
  try {
    const tenantId = req.user.tenant?._id || req.query.tenant;

    // Super Admin sees all if no tenant specified
    if (!tenantId) {
      const goals = await Goal.find({})
        .populate('employee', 'firstName lastName employeeId')
        .populate('reviewCycle', 'name year')
        .sort({ dueDate: 1 });
      return res.json({ success: true, data: goals });
    }

    const employee = await Employee.findOne({ user: req.user._id });

    // Get direct reports
    const directReports = await Employee.find({
      tenant: tenantId,
      reportingTo: employee?._id,
    }).select('_id');

    const reportIds = directReports.map(r => r._id);

    const goals = await Goal.find({
      tenant: tenantId,
      employee: { $in: reportIds },
    })
      .populate('employee', 'firstName lastName employeeId')
      .populate('reviewCycle', 'name year')
      .sort({ dueDate: 1 });

    res.json({ success: true, data: goals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all goals (HR view)
router.get('/goals', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const { employee, status, reviewCycle, department, tenant } = req.query;
    const tenantId = req.user.tenant?._id || tenant;
    const query = {};
    if (tenantId) query.tenant = tenantId;

    if (employee) query.employee = employee;
    if (status) query.status = status;
    if (reviewCycle) query.reviewCycle = reviewCycle;

    let goals = await Goal.find(query)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('reviewCycle', 'name year type')
      .sort({ createdAt: -1 });

    if (department) {
      goals = goals.filter(g => g.employee?.department?.toString() === department);
    }

    res.json({ success: true, data: goals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get goal by ID
router.get('/goals/:id', async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.tenant) query.tenant = req.user.tenant._id;

    const goal = await Goal.findOne(query)
      .populate('employee', 'firstName lastName employeeId')
      .populate('reviewCycle', 'name year type')
      .populate('alignedTo', 'title')
      .populate('comments.createdBy', 'firstName lastName');

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    res.json({ success: true, data: goal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create goal
router.post('/goals', async (req, res) => {
  try {
    const tenantId = req.user.tenant?._id || req.body.tenant;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant is required' });
    }

    const employee = await Employee.findOne({ user: req.user._id });

    const goal = await Goal.create({
      ...req.body,
      tenant: tenantId,
      employee: req.body.employee || employee?._id,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: goal });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update goal
router.put('/goals/:id', async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.tenant) query.tenant = req.user.tenant._id;

    const goal = await Goal.findOneAndUpdate(
      query,
      req.body,
      { new: true, runValidators: true }
    );

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    res.json({ success: true, data: goal });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update goal progress
router.put('/goals/:id/progress', async (req, res) => {
  try {
    const { progress, keyResults } = req.body;
    const updateData = {};

    if (progress !== undefined) updateData.progress = progress;
    if (keyResults) updateData.keyResults = keyResults;

    // Auto-complete if progress is 100
    if (progress === 100) {
      updateData.status = 'completed';
      updateData.completedDate = new Date();
    }

    const progressQuery = { _id: req.params.id };
    if (req.user.tenant) progressQuery.tenant = req.user.tenant._id;

    const goal = await Goal.findOneAndUpdate(
      progressQuery,
      updateData,
      { new: true }
    );

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    res.json({ success: true, data: goal });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Add comment to goal
router.post('/goals/:id/comments', async (req, res) => {
  try {
    const commentQuery = { _id: req.params.id };
    if (req.user.tenant) commentQuery.tenant = req.user.tenant._id;

    const goal = await Goal.findOneAndUpdate(
      commentQuery,
      {
        $push: {
          comments: {
            content: req.body.content,
            createdBy: req.user._id,
          },
        },
      },
      { new: true }
    );

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    res.json({ success: true, data: goal });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete goal
router.delete('/goals/:id', async (req, res) => {
  try {
    const deleteQuery = { _id: req.params.id };
    if (req.user.tenant) deleteQuery.tenant = req.user.tenant._id;

    const goal = await Goal.findOneAndDelete(deleteQuery);

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    res.json({ success: true, message: 'Goal deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ REVIEW CYCLES ============

// Get all review cycles
router.get('/cycles', async (req, res) => {
  try {
    const { year, status, tenant } = req.query;
    const tenantId = req.user.tenant?._id || tenant;
    const query = {};
    if (tenantId) query.tenant = tenantId;

    if (year) query.year = parseInt(year);
    if (status) query.status = status;

    const cycles = await ReviewCycle.find(query)
      .sort({ year: -1, 'period.startDate': -1 });

    res.json({ success: true, data: cycles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get active review cycle
router.get('/cycles/active', async (req, res) => {
  try {
    const query = { status: { $in: ['active', 'in_review'] } };
    if (req.user.tenant) query.tenant = req.user.tenant._id;
    else if (req.query.tenant) query.tenant = req.query.tenant;

    const cycle = await ReviewCycle.findOne(query);

    res.json({ success: true, data: cycle });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get review cycle by ID
router.get('/cycles/:id', async (req, res) => {
  try {
    const cycle = await ReviewCycle.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!cycle) {
      return res.status(404).json({ success: false, message: 'Review cycle not found' });
    }

    res.json({ success: true, data: cycle });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create review cycle
router.post('/cycles', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const cycle = await ReviewCycle.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: cycle });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update review cycle
router.put('/cycles/:id', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const cycle = await ReviewCycle.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    if (!cycle) {
      return res.status(404).json({ success: false, message: 'Review cycle not found' });
    }

    res.json({ success: true, data: cycle });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Launch review cycle (create reviews for all employees)
router.post('/cycles/:id/launch', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const cycle = await ReviewCycle.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!cycle) {
      return res.status(404).json({ success: false, message: 'Review cycle not found' });
    }

    // Get all active employees
    const employees = await Employee.find({
      tenant: req.user.tenant,
      status: 'active',
    });

    const reviews = [];
    for (const emp of employees) {
      const existingReview = await PerformanceReview.findOne({
        tenant: req.user.tenant,
        reviewCycle: cycle._id,
        employee: emp._id,
      });

      if (!existingReview) {
        reviews.push({
          tenant: req.user.tenant,
          reviewCycle: cycle._id,
          employee: emp._id,
          reviewer: emp.reportingTo || emp._id,
          status: 'pending',
        });
      }
    }

    if (reviews.length > 0) {
      await PerformanceReview.insertMany(reviews);
    }

    cycle.status = 'active';
    await cycle.save();

    res.json({ success: true, data: cycle, reviewsCreated: reviews.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ PERFORMANCE REVIEWS ============

// Get my review
router.get('/reviews/my', async (req, res) => {
  try {
    // Super Admin doesn't have employee record - return empty
    if (!req.user.tenant) {
      return res.json({ success: true, data: [] });
    }

    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.json({ success: true, data: [] });
    }

    const { reviewCycle } = req.query;
    const query = { tenant: req.user.tenant._id, employee: employee._id };

    if (reviewCycle) query.reviewCycle = reviewCycle;

    const reviews = await PerformanceReview.find(query)
      .populate('reviewCycle', 'name year type status')
      .populate('reviewer', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get team reviews (for managers)
router.get('/reviews/team', authorize('super_admin', 'tenant_admin', 'hr_manager', 'department_head', 'team_lead'), async (req, res) => {
  try {
    const tenantId = req.user.tenant?._id || req.query.tenant;
    const employee = await Employee.findOne({ user: req.user._id });

    const query = {};
    if (tenantId) query.tenant = tenantId;

    // If not HR, only show reviews where user is the reviewer
    if (!['super_admin', 'tenant_admin', 'hr_manager'].includes(req.user.role)) {
      query.reviewer = employee?._id;
    }

    if (req.query.reviewCycle) query.reviewCycle = req.query.reviewCycle;

    const reviews = await PerformanceReview.find(query)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('reviewCycle', 'name year type')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all reviews (HR view)
router.get('/reviews', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const { reviewCycle, status, department, tenant } = req.query;
    const tenantId = req.user.tenant?._id || tenant;
    const query = {};
    if (tenantId) query.tenant = tenantId;

    if (reviewCycle) query.reviewCycle = reviewCycle;
    if (status) query.status = status;

    let reviews = await PerformanceReview.find(query)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('reviewer', 'firstName lastName')
      .populate('reviewCycle', 'name year type')
      .sort({ createdAt: -1 });

    if (department) {
      reviews = reviews.filter(r => r.employee?.department?.toString() === department);
    }

    res.json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get review by ID
router.get('/reviews/:id', async (req, res) => {
  try {
    const review = await PerformanceReview.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('employee', 'firstName lastName employeeId department designation')
      .populate('reviewer', 'firstName lastName')
      .populate('reviewCycle')
      .populate('selfReview.goals.goal')
      .populate('managerReview.goals.goal')
      .populate('peerReviews.reviewer', 'firstName lastName');

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Submit self review
router.post('/reviews/:id/self-review', async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });

    const review = await PerformanceReview.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      employee: employee?._id,
    });

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    review.selfReview = {
      ...req.body,
      submittedAt: new Date(),
    };
    review.status = 'manager_review';
    await review.save();

    res.json({ success: true, data: review });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Submit manager review
router.post('/reviews/:id/manager-review', authorize('super_admin', 'tenant_admin', 'hr_manager', 'department_head', 'team_lead'), async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });

    const review = await PerformanceReview.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      reviewer: employee?._id,
    });

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found or not authorized' });
    }

    review.managerReview = {
      ...req.body,
      submittedAt: new Date(),
    };
    review.status = 'calibration';
    await review.save();

    res.json({ success: true, data: review });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Calibrate review (HR)
router.post('/reviews/:id/calibrate', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const { calibratedRating, calibrationNotes } = req.body;

    const review = await PerformanceReview.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      {
        calibratedRating,
        calibrationNotes,
        calibratedBy: req.user._id,
        calibratedAt: new Date(),
        finalRating: calibratedRating,
        status: 'completed',
      },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.json({ success: true, data: review });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Acknowledge review (employee)
router.post('/reviews/:id/acknowledge', async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });

    const review = await PerformanceReview.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, employee: employee?._id },
      {
        'feedback.acknowledgedAt': new Date(),
        status: 'acknowledged',
      },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.json({ success: true, data: review });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get performance stats
router.get('/stats', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const activeCycle = await ReviewCycle.findOne({
      tenant: req.user.tenant,
      status: { $in: ['active', 'in_review'] },
    });

    let stats = {
      activeCycle: activeCycle?.name,
      totalGoals: 0,
      completedGoals: 0,
      pendingReviews: 0,
      completedReviews: 0,
    };

    if (activeCycle) {
      const [totalGoals, completedGoals, pendingReviews, completedReviews] = await Promise.all([
        Goal.countDocuments({ tenant: req.user.tenant, reviewCycle: activeCycle._id }),
        Goal.countDocuments({ tenant: req.user.tenant, reviewCycle: activeCycle._id, status: 'completed' }),
        PerformanceReview.countDocuments({ tenant: req.user.tenant, reviewCycle: activeCycle._id, status: { $ne: 'completed' } }),
        PerformanceReview.countDocuments({ tenant: req.user.tenant, reviewCycle: activeCycle._id, status: 'completed' }),
      ]);

      stats = { ...stats, totalGoals, completedGoals, pendingReviews, completedReviews };
    }

    const ratingDistribution = await PerformanceReview.aggregate([
      { $match: { tenant: req.user.tenant, finalRating: { $exists: true } } },
      { $group: { _id: '$finalRating', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({ success: true, data: { ...stats, ratingDistribution } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
