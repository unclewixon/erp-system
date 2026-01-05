import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import { Onboarding, OnboardingTemplate } from '../models/Onboarding.js';
import Employee from '../models/Employee.js';

const router = express.Router();

router.use(protect);
router.use(tenantGuard);

// ============ ONBOARDING TEMPLATES ============

// Get all templates
router.get('/templates', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    // Super Admin has no tenant - return empty array
    if (!req.user.tenant) {
      return res.json({ success: true, data: [] });
    }

    const templates = await OnboardingTemplate.find({ tenant: req.user.tenant, isActive: true })
      .populate('department', 'name')
      .populate('designation', 'title');

    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create template
router.post('/templates', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const template = await OnboardingTemplate.create({
      ...req.body,
      tenant: req.user.tenant,
    });

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update template
router.put('/templates/:id', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const template = await OnboardingTemplate.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ ONBOARDING ============

// Get all onboardings
router.get('/', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    // Super Admin has no tenant - return empty array
    if (!req.user.tenant) {
      return res.json({ success: true, data: [] });
    }

    const { status } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;

    const onboardings = await Onboarding.find(query)
      .populate('employee', 'firstName lastName employeeId email')
      .populate('mentor', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: onboardings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get my onboarding
router.get('/my', async (req, res) => {
  try {
    // Super Admin has no tenant - return empty data
    if (!req.user.tenant) {
      return res.json({ success: true, data: null });
    }

    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.json({ success: true, data: null });
    }

    const onboarding = await Onboarding.findOne({
      tenant: req.user.tenant,
      employee: employee._id,
    }).populate('mentor', 'firstName lastName email');

    res.json({ success: true, data: onboarding });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single onboarding
router.get('/:id', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const onboarding = await Onboarding.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('employee', 'firstName lastName employeeId email')
      .populate('mentor', 'firstName lastName email')
      .populate('tasks.assignedTo', 'firstName lastName')
      .populate('tasks.completedBy', 'firstName lastName');

    if (!onboarding) {
      return res.status(404).json({ success: false, message: 'Onboarding not found' });
    }

    res.json({ success: true, data: onboarding });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create onboarding
router.post('/', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const { employeeId, templateId, ...data } = req.body;

    let tasks = data.tasks || [];

    // Apply template if provided
    if (templateId) {
      const template = await OnboardingTemplate.findById(templateId);
      if (template) {
        tasks = template.tasks.map((t, idx) => ({
          title: t.title,
          description: t.description,
          category: t.category,
          order: t.order || idx,
          status: 'pending',
        }));
      }
    }

    const onboarding = await Onboarding.create({
      ...data,
      employee: employeeId,
      tasks,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: onboarding });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update onboarding
router.put('/:id', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const onboarding = await Onboarding.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    if (!onboarding) {
      return res.status(404).json({ success: false, message: 'Onboarding not found' });
    }

    res.json({ success: true, data: onboarding });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update task status
router.put('/:id/tasks/:taskId', async (req, res) => {
  try {
    const { status, notes } = req.body;

    const onboarding = await Onboarding.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!onboarding) {
      return res.status(404).json({ success: false, message: 'Onboarding not found' });
    }

    const task = onboarding.tasks.id(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.status = status;
    if (notes) task.notes = notes;
    if (status === 'completed') {
      task.completedAt = new Date();
      task.completedBy = req.user._id;
    }

    // Check if all tasks are completed
    const allCompleted = onboarding.tasks.every(t => t.status === 'completed' || t.status === 'skipped');
    if (allCompleted) {
      onboarding.status = 'completed';
      onboarding.actualEndDate = new Date();
    } else if (onboarding.status === 'not_started') {
      onboarding.status = 'in_progress';
    }

    await onboarding.save();

    res.json({ success: true, data: onboarding });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get onboarding stats
router.get('/stats/summary', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const stats = await Onboarding.aggregate([
      { $match: { tenant: req.user.tenant } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      total: 0,
      not_started: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };

    stats.forEach(s => {
      result[s._id] = s.count;
      result.total += s.count;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
