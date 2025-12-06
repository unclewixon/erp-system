import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import {
  TaskProject,
  TaskLabel,
  Task,
  TaskComment,
  TaskBoard,
  TaskTemplate,
  TaskAutomation,
} from '../models/TaskManagement.js';

const router = express.Router();

// Apply authentication and tenant guard to all routes
router.use(protect);
router.use(tenantGuard);

// ============================================
// PROJECT ROUTES
// ============================================

// @route   GET /api/task-management/projects
router.get('/projects', async (req, res) => {
  try {
    const { status, type, search, page = 1, limit = 20 } = req.query;

    const query = {
      tenant: req.user.tenant,
      isArchived: false,
    };

    if (status) query.status = status;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by visibility
    query.$or = query.$or || [];
    query.$or.push(
      { visibility: 'public' },
      { manager: req.user.employee },
      { 'members.employee': req.user.employee },
      { createdBy: req.user.employee }
    );

    const projects = await TaskProject.find(query)
      .populate('manager', 'firstName lastName avatar')
      .populate('department', 'name')
      .populate('members.employee', 'firstName lastName avatar')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await TaskProject.countDocuments(query);

    res.json({
      success: true,
      data: projects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/task-management/projects/:id
router.get('/projects/:id', async (req, res) => {
  try {
    const project = await TaskProject.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('manager', 'firstName lastName email avatar')
      .populate('department', 'name')
      .populate('branch', 'name')
      .populate('members.employee', 'firstName lastName email avatar')
      .populate('parent', 'name code')
      .populate('createdBy', 'firstName lastName');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Get task statistics
    const taskStats = await Task.aggregate([
      { $match: { tenant: req.user.tenant, project: project._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        ...project.toObject(),
        taskStats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/task-management/projects
router.post('/projects', async (req, res) => {
  try {
    const project = await TaskProject.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user.employee,
      members: [
        {
          employee: req.user.employee,
          role: 'owner',
        },
        ...(req.body.members || []),
      ],
    });

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/task-management/projects/:id
router.put('/projects/:id', async (req, res) => {
  try {
    const project = await TaskProject.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({ success: true, data: project });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/task-management/projects/:id/members
router.post('/projects/:id/members', async (req, res) => {
  try {
    const { employeeId, role } = req.body;

    const project = await TaskProject.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      {
        $push: {
          members: {
            employee: employeeId,
            role: role || 'member',
          },
        },
      },
      { new: true }
    ).populate('members.employee', 'firstName lastName email avatar');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({ success: true, data: project.members });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/task-management/projects/:id/members/:memberId
router.delete('/projects/:id/members/:memberId', async (req, res) => {
  try {
    const project = await TaskProject.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      {
        $pull: {
          members: { employee: req.params.memberId },
        },
      },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({ success: true, message: 'Member removed' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/task-management/projects/:id/archive
router.post('/projects/:id/archive', async (req, res) => {
  try {
    const project = await TaskProject.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: req.user.employee,
      },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({ success: true, data: project });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// LABEL ROUTES
// ============================================

// @route   GET /api/task-management/labels
router.get('/labels', async (req, res) => {
  try {
    const { projectId } = req.query;

    const query = {
      tenant: req.user.tenant,
      $or: [{ isGlobal: true }],
    };

    if (projectId) {
      query.$or.push({ project: projectId });
    }

    const labels = await TaskLabel.find(query).sort('name');

    res.json({ success: true, data: labels });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/task-management/labels
router.post('/labels', async (req, res) => {
  try {
    const label = await TaskLabel.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user.employee,
    });

    res.status(201).json({ success: true, data: label });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/task-management/labels/:id
router.put('/labels/:id', async (req, res) => {
  try {
    const label = await TaskLabel.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true }
    );

    if (!label) {
      return res.status(404).json({ success: false, message: 'Label not found' });
    }

    res.json({ success: true, data: label });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/task-management/labels/:id
router.delete('/labels/:id', async (req, res) => {
  try {
    await TaskLabel.findOneAndDelete({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    // Remove label from all tasks
    await Task.updateMany(
      { tenant: req.user.tenant, labels: req.params.id },
      { $pull: { labels: req.params.id } }
    );

    res.json({ success: true, message: 'Label deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// TASK ROUTES
// ============================================

// @route   GET /api/task-management/tasks
router.get('/tasks', async (req, res) => {
  try {
    const {
      project,
      status,
      priority,
      assignee,
      type,
      label,
      search,
      dueFrom,
      dueTo,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {
      tenant: req.user.tenant,
      isArchived: false,
    };

    if (project) query.project = project;
    if (status) query.status = { $in: status.split(',') };
    if (priority) query.priority = { $in: priority.split(',') };
    if (assignee) query.assignee = assignee;
    if (type) query.type = type;
    if (label) query.labels = label;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { taskNumber: { $regex: search, $options: 'i' } },
      ];
    }
    if (dueFrom || dueTo) {
      query.dueDate = {};
      if (dueFrom) query.dueDate.$gte = new Date(dueFrom);
      if (dueTo) query.dueDate.$lte = new Date(dueTo);
    }

    const tasks = await Task.find(query)
      .populate('project', 'name code color')
      .populate('assignee', 'firstName lastName avatar')
      .populate('assignees.employee', 'firstName lastName avatar')
      .populate('labels', 'name color')
      .populate('parent', 'taskNumber title')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Task.countDocuments(query);

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/task-management/tasks/my-tasks
router.get('/tasks/my-tasks', async (req, res) => {
  try {
    const { status } = req.query;

    const query = {
      tenant: req.user.tenant,
      isArchived: false,
      $or: [
        { assignee: req.user.employee },
        { 'assignees.employee': req.user.employee },
      ],
    };

    if (status) query.status = { $in: status.split(',') };

    const tasks = await Task.find(query)
      .populate('project', 'name code color')
      .populate('labels', 'name color')
      .sort('dueDate -priority');

    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/task-management/tasks/:id
router.get('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('project', 'name code color settings')
      .populate('parent', 'taskNumber title status')
      .populate('subtasks', 'taskNumber title status assignee')
      .populate('assignee', 'firstName lastName email avatar')
      .populate('assignees.employee', 'firstName lastName email avatar')
      .populate('reporter', 'firstName lastName avatar')
      .populate('watchers', 'firstName lastName avatar')
      .populate('labels', 'name color')
      .populate('dependencies.task', 'taskNumber title status')
      .populate('timeLogs.employee', 'firstName lastName')
      .populate('activity.performer', 'firstName lastName avatar')
      .populate('createdBy', 'firstName lastName');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Get comments
    const comments = await TaskComment.find({ task: task._id })
      .populate('author', 'firstName lastName avatar')
      .populate('parent')
      .sort('createdAt');

    res.json({
      success: true,
      data: {
        ...task.toObject(),
        comments,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/task-management/tasks
router.post('/tasks', async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      tenant: req.user.tenant,
      reporter: req.user.employee,
      createdBy: req.user.employee,
      department: req.user.department,
      branch: req.user.branch,
    };

    // Handle parent task (subtask creation)
    if (req.body.parentId) {
      const parentTask = await Task.findById(req.body.parentId);
      if (parentTask) {
        taskData.parent = parentTask._id;
        taskData.project = parentTask.project;
        taskData.depth = (parentTask.depth || 0) + 1;
      }
    }

    const task = await Task.create(taskData);

    // Update parent's subtasks array
    if (task.parent) {
      await Task.findByIdAndUpdate(task.parent, {
        $push: { subtasks: task._id },
      });
    }

    // Populate for response
    await task.populate([
      { path: 'project', select: 'name code' },
      { path: 'assignee', select: 'firstName lastName avatar' },
      { path: 'labels', select: 'name color' },
    ]);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant-${req.user.tenant}`).emit('task:created', task);
    }

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/task-management/tasks/:id
router.put('/tasks/:id', async (req, res) => {
  try {
    const existingTask = await Task.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!existingTask) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Track status change
    if (req.body.status && req.body.status !== existingTask.status) {
      const now = new Date();
      const lastStatusChange = existingTask.statusHistory.slice(-1)[0];
      const duration = lastStatusChange
        ? Math.round((now - lastStatusChange.changedAt) / 60000)
        : 0;

      existingTask.statusHistory.push({
        status: req.body.status,
        changedBy: req.user.employee,
        changedAt: now,
        duration,
      });

      existingTask.activity.push({
        action: 'status_changed',
        performer: req.user.employee,
        details: {
          from: existingTask.status,
          to: req.body.status,
        },
        timestamp: now,
      });

      // Set completion date if done
      if (req.body.status === 'done' && !existingTask.completedDate) {
        existingTask.completedDate = now;
      }
    }

    // Track other changes
    const trackableFields = ['priority', 'assignee', 'dueDate'];
    for (const field of trackableFields) {
      if (req.body[field] && req.body[field] !== existingTask[field]?.toString()) {
        existingTask.activity.push({
          action: `${field}_changed`,
          performer: req.user.employee,
          details: {
            from: existingTask[field],
            to: req.body[field],
          },
          timestamp: new Date(),
        });
      }
    }

    Object.assign(existingTask, req.body);
    await existingTask.save();

    await existingTask.populate([
      { path: 'project', select: 'name code' },
      { path: 'assignee', select: 'firstName lastName avatar' },
      { path: 'labels', select: 'name color' },
    ]);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant-${req.user.tenant}`).emit('task:updated', existingTask);
    }

    res.json({ success: true, data: existingTask });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/task-management/tasks/:id/time-log
router.post('/tasks/:id/time-log', async (req, res) => {
  try {
    const { startTime, endTime, duration, description, billable } = req.body;

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      {
        $push: {
          timeLogs: {
            employee: req.user.employee,
            startTime,
            endTime,
            duration,
            description,
            billable: billable !== false,
          },
          activity: {
            action: 'time_logged',
            performer: req.user.employee,
            details: { duration },
            timestamp: new Date(),
          },
        },
        $inc: { 'timeTracking.totalLogged': duration },
        'timeTracking.lastLoggedAt': new Date(),
      },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.json({ success: true, data: task.timeLogs });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/task-management/tasks/:id/checklist
router.put('/tasks/:id/checklist', async (req, res) => {
  try {
    const { checklist } = req.body;

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      { checklist },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Update progress based on checklist
    task.updateChecklistProgress();
    await task.save();

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/task-management/tasks/:id/dependencies
router.post('/tasks/:id/dependencies', async (req, res) => {
  try {
    const { taskId, type } = req.body;

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      {
        $push: {
          dependencies: {
            task: taskId,
            type: type || 'relates_to',
          },
        },
      },
      { new: true }
    ).populate('dependencies.task', 'taskNumber title status');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.json({ success: true, data: task.dependencies });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/task-management/tasks/:id/watch
router.post('/tasks/:id/watch', async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      { $addToSet: { watchers: req.user.employee } },
      { new: true }
    ).populate('watchers', 'firstName lastName avatar');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.json({ success: true, data: task.watchers });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/task-management/tasks/:id/watch
router.delete('/tasks/:id/watch', async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      { $pull: { watchers: req.user.employee } },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.json({ success: true, message: 'Unwatched' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/task-management/tasks/:id
router.delete('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Remove from parent's subtasks
    if (task.parent) {
      await Task.findByIdAndUpdate(task.parent, {
        $pull: { subtasks: task._id },
      });
    }

    // Archive instead of delete if has subtasks
    if (task.subtasks && task.subtasks.length > 0) {
      task.isArchived = true;
      task.archivedAt = new Date();
      task.archivedBy = req.user.employee;
      await task.save();
      return res.json({ success: true, message: 'Task archived' });
    }

    // Delete comments
    await TaskComment.deleteMany({ task: task._id });

    await task.deleteOne();

    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// COMMENT ROUTES
// ============================================

// @route   POST /api/task-management/tasks/:id/comments
router.post('/tasks/:id/comments', async (req, res) => {
  try {
    const { content, richContent, parentId, isInternal, mentions } = req.body;

    const comment = await TaskComment.create({
      tenant: req.user.tenant,
      task: req.params.id,
      parent: parentId,
      author: req.user.employee,
      content,
      richContent,
      isInternal,
      mentions,
    });

    // Add to task activity
    await Task.findByIdAndUpdate(req.params.id, {
      $push: {
        activity: {
          action: 'commented',
          performer: req.user.employee,
          timestamp: new Date(),
        },
      },
    });

    await comment.populate('author', 'firstName lastName avatar');

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant-${req.user.tenant}`).emit('task:comment', {
        taskId: req.params.id,
        comment,
      });
    }

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/task-management/comments/:id
router.put('/comments/:id', async (req, res) => {
  try {
    const comment = await TaskComment.findOneAndUpdate(
      {
        _id: req.params.id,
        tenant: req.user.tenant,
        author: req.user.employee,
      },
      {
        content: req.body.content,
        richContent: req.body.richContent,
        isEdited: true,
        editedAt: new Date(),
      },
      { new: true }
    ).populate('author', 'firstName lastName avatar');

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    res.json({ success: true, data: comment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/task-management/comments/:id
router.delete('/comments/:id', async (req, res) => {
  try {
    const comment = await TaskComment.findOneAndDelete({
      _id: req.params.id,
      tenant: req.user.tenant,
      author: req.user.employee,
    });

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/task-management/comments/:id/react
router.post('/comments/:id/react', async (req, res) => {
  try {
    const { emoji } = req.body;

    const comment = await TaskComment.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const reaction = comment.reactions.find((r) => r.emoji === emoji);
    if (reaction) {
      const userIndex = reaction.users.indexOf(req.user.employee);
      if (userIndex > -1) {
        reaction.users.splice(userIndex, 1);
        if (reaction.users.length === 0) {
          comment.reactions = comment.reactions.filter((r) => r.emoji !== emoji);
        }
      } else {
        reaction.users.push(req.user.employee);
      }
    } else {
      comment.reactions.push({
        emoji,
        users: [req.user.employee],
      });
    }

    await comment.save();

    res.json({ success: true, data: comment.reactions });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// BOARD ROUTES
// ============================================

// @route   GET /api/task-management/boards
router.get('/boards', async (req, res) => {
  try {
    const { projectId } = req.query;

    const query = {
      tenant: req.user.tenant,
      $or: [
        { isPublic: true },
        { owner: req.user.employee },
        { 'sharedWith.employee': req.user.employee },
      ],
    };

    if (projectId) query.project = projectId;

    const boards = await TaskBoard.find(query)
      .populate('project', 'name code')
      .populate('owner', 'firstName lastName')
      .sort('-isDefault name');

    res.json({ success: true, data: boards });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/task-management/boards
router.post('/boards', async (req, res) => {
  try {
    const board = await TaskBoard.create({
      ...req.body,
      tenant: req.user.tenant,
      owner: req.user.employee,
      createdBy: req.user.employee,
    });

    res.status(201).json({ success: true, data: board });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/task-management/boards/:id
router.put('/boards/:id', async (req, res) => {
  try {
    const board = await TaskBoard.findOneAndUpdate(
      {
        _id: req.params.id,
        tenant: req.user.tenant,
        $or: [
          { owner: req.user.employee },
          { 'sharedWith.employee': req.user.employee, 'sharedWith.permission': 'edit' },
        ],
      },
      req.body,
      { new: true }
    );

    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }

    res.json({ success: true, data: board });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// TEMPLATE ROUTES
// ============================================

// @route   GET /api/task-management/templates
router.get('/templates', async (req, res) => {
  try {
    const { projectId, category } = req.query;

    const query = {
      tenant: req.user.tenant,
      $or: [{ isGlobal: true }],
    };

    if (projectId) query.$or.push({ project: projectId });
    if (category) query.category = category;

    const templates = await TaskTemplate.find(query)
      .populate('project', 'name')
      .populate('template.labels', 'name color')
      .sort('-usageCount name');

    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/task-management/templates
router.post('/templates', async (req, res) => {
  try {
    const template = await TaskTemplate.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user.employee,
    });

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/task-management/templates/:id/use
router.post('/templates/:id/use', async (req, res) => {
  try {
    const template = await TaskTemplate.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    // Create task from template
    const taskData = {
      ...template.template,
      ...req.body,
      tenant: req.user.tenant,
      reporter: req.user.employee,
      createdBy: req.user.employee,
    };

    const task = await Task.create(taskData);

    // Create subtasks if defined
    if (template.template.subtasks && template.template.subtasks.length > 0) {
      for (const subtask of template.template.subtasks) {
        await Task.create({
          ...subtask,
          tenant: req.user.tenant,
          parent: task._id,
          project: task.project,
          reporter: req.user.employee,
          createdBy: req.user.employee,
          depth: 1,
        });
      }
    }

    // Increment usage count
    template.usageCount += 1;
    await template.save();

    await task.populate([
      { path: 'project', select: 'name code' },
      { path: 'labels', select: 'name color' },
    ]);

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// AUTOMATION ROUTES
// ============================================

// @route   GET /api/task-management/automations
router.get('/automations', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { projectId } = req.query;

    const query = { tenant: req.user.tenant };
    if (projectId) query.project = projectId;

    const automations = await TaskAutomation.find(query)
      .populate('project', 'name code')
      .sort('-isActive name');

    res.json({ success: true, data: automations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/task-management/automations
router.post('/automations', authorize('admin', 'manager'), async (req, res) => {
  try {
    const automation = await TaskAutomation.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user.employee,
    });

    res.status(201).json({ success: true, data: automation });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/task-management/automations/:id
router.put('/automations/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const automation = await TaskAutomation.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true }
    );

    if (!automation) {
      return res.status(404).json({ success: false, message: 'Automation not found' });
    }

    res.json({ success: true, data: automation });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/task-management/automations/:id
router.delete('/automations/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    await TaskAutomation.findOneAndDelete({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    res.json({ success: true, message: 'Automation deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// ANALYTICS
// ============================================

// @route   GET /api/task-management/analytics
router.get('/analytics', async (req, res) => {
  try {
    const { projectId, startDate, endDate } = req.query;

    const matchQuery = { tenant: req.user.tenant };
    if (projectId) matchQuery.project = mongoose.Types.ObjectId(projectId);
    if (startDate) matchQuery.createdAt = { $gte: new Date(startDate) };
    if (endDate) {
      matchQuery.createdAt = matchQuery.createdAt || {};
      matchQuery.createdAt.$lte = new Date(endDate);
    }

    const [statusDistribution, priorityDistribution, assigneeStats, timeStats] = await Promise.all([
      // Status distribution
      Task.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Priority distribution
      Task.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),

      // Tasks by assignee
      Task.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$assignee', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'employees',
            localField: '_id',
            foreignField: '_id',
            as: 'assignee',
          },
        },
        { $unwind: { path: '$assignee', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name: {
              $cond: {
                if: '$assignee',
                then: { $concat: ['$assignee.firstName', ' ', '$assignee.lastName'] },
                else: 'Unassigned',
              },
            },
            count: 1,
          },
        },
      ]),

      // Time tracking stats
      Task.aggregate([
        { $match: { ...matchQuery, 'timeTracking.totalLogged': { $gt: 0 } } },
        {
          $group: {
            _id: null,
            totalLogged: { $sum: '$timeTracking.totalLogged' },
            avgPerTask: { $avg: '$timeTracking.totalLogged' },
            taskCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        statusDistribution,
        priorityDistribution,
        assigneeStats,
        timeStats: timeStats[0] || { totalLogged: 0, avgPerTask: 0, taskCount: 0 },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
