import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import Task from '../models/Task.js';
import Employee from '../models/Employee.js';

const router = express.Router();

router.use(protect);
router.use(tenantGuard);

// Get all tasks
router.get('/', async (req, res) => {
  try {
    // Super Admin has no tenant - return empty array
    if (!req.user.tenant) {
      return res.json({ success: true, data: [] });
    }

    const { status, priority, department, assignedTo, project } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (department) query.department = department;
    if (assignedTo) query.assignedTo = assignedTo;
    if (project) query.project = project;

    // Non-admin users can only see their tasks or tasks they created
    const isAdmin = ['super_admin', 'tenant_admin', 'hr_manager'].includes(req.user.role);
    if (!isAdmin) {
      const employee = await Employee.findOne({ user: req.user._id });
      if (employee) {
        query.$or = [
          { assignedTo: employee._id },
          { createdBy: req.user._id },
          { watchers: req.user._id },
        ];
      }
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'firstName lastName employeeId')
      .populate('assignedBy', 'firstName lastName')
      .populate('department', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ priority: -1, dueDate: 1 });

    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get my tasks
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

    const tasks = await Task.find({
      tenant: req.user.tenant,
      assignedTo: employee._id,
      status: { $ne: 'cancelled' },
    })
      .populate('department', 'name')
      .populate('assignedBy', 'firstName lastName')
      .sort({ priority: -1, dueDate: 1 });

    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single task
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('assignedTo', 'firstName lastName employeeId email')
      .populate('assignedBy', 'firstName lastName')
      .populate('department', 'name')
      .populate('comments.user', 'firstName lastName')
      .populate('parentTask', 'title taskNumber')
      .populate('dependencies', 'title taskNumber status');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create task
router.post('/', async (req, res) => {
  try {
    const task = await Task.create({
      ...req.body,
      tenant: req.user.tenant,
      assignedBy: req.user._id,
      createdBy: req.user._id,
    });

    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'firstName lastName')
      .populate('department', 'name');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Check authorization
    const employee = await Employee.findOne({ user: req.user._id });
    const isAssignee = employee && task.assignedTo?.toString() === employee._id.toString();
    const isCreator = task.createdBy?.toString() === req.user._id.toString();
    const isAdmin = ['super_admin', 'tenant_admin', 'hr_manager'].includes(req.user.role);

    if (!isAssignee && !isCreator && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Track completion
    if (req.body.status === 'completed' && task.status !== 'completed') {
      req.body.completedAt = new Date();
    }

    Object.assign(task, req.body);
    await task.save();

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update task status
router.patch('/:id/status', async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.status = req.body.status;
    if (req.body.status === 'completed') {
      task.completedAt = new Date();
    }

    await task.save();

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Add comment
router.post('/:id/comments', async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.comments.push({
      user: req.user._id,
      comment: req.body.comment,
      attachments: req.body.attachments || [],
    });

    await task.save();

    const populated = await Task.findById(task._id)
      .populate('comments.user', 'firstName lastName');

    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update checklist item
router.patch('/:id/checklist/:itemId', async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const item = task.checklist.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Checklist item not found' });
    }

    item.isCompleted = req.body.isCompleted;
    if (req.body.isCompleted) {
      item.completedBy = req.user._id;
      item.completedAt = new Date();
    }

    await task.save();

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Add checklist item
router.post('/:id/checklist', async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.checklist.push({
      title: req.body.title,
      isCompleted: false,
    });

    await task.save();

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Only creator or admin can delete
    const isCreator = task.createdBy?.toString() === req.user._id.toString();
    const isAdmin = ['super_admin', 'tenant_admin'].includes(req.user.role);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await task.deleteOne();

    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get task stats
router.get('/stats/summary', async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    const matchQuery = { tenant: req.user.tenant };

    // For non-admin, show their own task stats
    const isAdmin = ['super_admin', 'tenant_admin', 'hr_manager'].includes(req.user.role);
    if (!isAdmin && employee) {
      matchQuery.assignedTo = employee._id;
    }

    const [statusStats, priorityStats, overdueCount] = await Promise.all([
      Task.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Task.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Task.countDocuments({
        ...matchQuery,
        dueDate: { $lt: new Date() },
        status: { $nin: ['completed', 'cancelled'] },
      }),
    ]);

    res.json({
      success: true,
      data: {
        byStatus: statusStats,
        byPriority: priorityStats,
        overdue: overdueCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
