import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import Query from '../models/Query.js';
import Employee from '../models/Employee.js';

const router = express.Router();

router.use(protect);
router.use(tenantGuard);

// Get all queries (HR view)
router.get('/', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    // Super Admin has no tenant - return empty array
    if (!req.user.tenant) {
      return res.json({ success: true, data: [] });
    }

    const { status, type, priority } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;

    const queries = await Query.find(query)
      .populate('employee', 'firstName lastName employeeId')
      .populate('assignedTo', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: queries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get my queries
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

    const queries = await Query.find({
      tenant: req.user.tenant,
      employee: employee._id,
    })
      .populate('assignedTo', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: queries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get assigned queries
router.get('/assigned', async (req, res) => {
  try {
    // Super Admin has no tenant - return empty array
    if (!req.user.tenant) {
      return res.json({ success: true, data: [] });
    }

    const queries = await Query.find({
      tenant: req.user.tenant,
      assignedTo: req.user._id,
      status: { $in: ['open', 'under_review', 'pending_response'] },
    })
      .populate('employee', 'firstName lastName employeeId')
      .sort({ priority: -1, createdAt: -1 });

    res.json({ success: true, data: queries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single query
router.get('/:id', async (req, res) => {
  try {
    const query = await Query.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('employee', 'firstName lastName employeeId email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('responses.respondedBy', 'firstName lastName')
      .populate('resolution.resolvedBy', 'firstName lastName')
      .populate('escalation.escalatedTo', 'firstName lastName');

    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    // Check authorization
    const employee = await Employee.findOne({ user: req.user._id });
    const isOwner = employee && query.employee._id.toString() === employee._id.toString();
    const isAssigned = query.assignedTo && query.assignedTo._id.toString() === req.user._id.toString();
    const isHR = ['super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'].includes(req.user.role);

    if (!isOwner && !isAssigned && !isHR) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: query });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create query
router.post('/', async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const query = await Query.create({
      ...req.body,
      tenant: req.user.tenant,
      employee: employee._id,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: query });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Create query for employee (HR)
router.post('/employee/:employeeId', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const query = await Query.create({
      ...req.body,
      tenant: req.user.tenant,
      employee: req.params.employeeId,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: query });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update query
router.put('/:id', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const query = await Query.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    res.json({ success: true, data: query });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Add response
router.post('/:id/responses', async (req, res) => {
  try {
    const query = await Query.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    query.responses.push({
      respondedBy: req.user._id,
      response: req.body.response,
      attachments: req.body.attachments || [],
    });

    if (query.status === 'open') {
      query.status = 'under_review';
    }

    await query.save();

    res.json({ success: true, data: query });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Resolve query
router.post('/:id/resolve', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const query = await Query.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      {
        status: 'resolved',
        resolution: {
          summary: req.body.summary,
          actionTaken: req.body.actionTaken,
          resolvedBy: req.user._id,
          resolvedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    res.json({ success: true, data: query });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Escalate query
router.post('/:id/escalate', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const query = await Query.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      {
        status: 'escalated',
        escalation: {
          escalatedTo: req.body.escalatedTo,
          escalatedAt: new Date(),
          reason: req.body.reason,
        },
        assignedTo: req.body.escalatedTo,
      },
      { new: true }
    );

    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    res.json({ success: true, data: query });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get query stats
router.get('/stats/summary', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const [statusStats, typeStats] = await Promise.all([
      Query.aggregate([
        { $match: { tenant: req.user.tenant } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Query.aggregate([
        { $match: { tenant: req.user.tenant } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        byStatus: statusStats,
        byType: typeStats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
