import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import {
  WorkflowTemplate,
  WorkflowInstance,
  ApprovalDelegation,
  ApprovalSubstitute,
  ApprovalMatrix,
  EscalationRule,
  WorkflowCategory,
} from '../models/WorkflowEngine.js';

const router = express.Router();

// Apply authentication and tenant guard to all routes
router.use(protect);
router.use(tenantGuard);

// ============================================
// WORKFLOW CATEGORY ROUTES
// ============================================

// @route   GET /api/workflow-engine/categories
router.get('/categories', authorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const categories = await WorkflowCategory.find({
      tenant: req.user.tenant,
      isActive: true,
    }).sort('order name');

    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/workflow-engine/categories
router.post('/categories', authorize('admin'), async (req, res) => {
  try {
    const category = await WorkflowCategory.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user.employee,
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/workflow-engine/categories/:id
router.put('/categories/:id', authorize('admin'), async (req, res) => {
  try {
    const category = await WorkflowCategory.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      { ...req.body, updatedBy: req.user.employee },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// WORKFLOW TEMPLATE ROUTES
// ============================================

// @route   GET /api/workflow-engine/templates
router.get('/templates', authorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const { category, status, type, search, page = 1, limit = 20 } = req.query;

    const query = { tenant: req.user.tenant };

    if (category) query.category = category;
    if (status) query.status = status;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    const templates = await WorkflowTemplate.find(query)
      .populate('category', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await WorkflowTemplate.countDocuments(query);

    res.json({
      success: true,
      data: templates,
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

// @route   GET /api/workflow-engine/templates/:id
router.get('/templates/:id', authorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const template = await WorkflowTemplate.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('category', 'name')
      .populate('steps.assignees.user', 'firstName lastName email')
      .populate('steps.assignees.role', 'name')
      .populate('createdBy', 'firstName lastName');

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/workflow-engine/templates
router.post('/templates', authorize('admin'), async (req, res) => {
  try {
    const template = await WorkflowTemplate.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user.employee,
    });

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/workflow-engine/templates/:id
router.put('/templates/:id', authorize('admin'), async (req, res) => {
  try {
    const template = await WorkflowTemplate.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    // Create new version if active template
    if (template.status === 'active' && req.body.createVersion) {
      template.status = 'deprecated';
      await template.save();

      const newTemplate = await WorkflowTemplate.create({
        ...req.body,
        tenant: req.user.tenant,
        version: template.version + 1,
        previousVersion: template._id,
        createdBy: req.user.employee,
      });

      return res.json({ success: true, data: newTemplate });
    }

    Object.assign(template, req.body);
    template.updatedBy = req.user.employee;
    await template.save();

    res.json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/workflow-engine/templates/:id/activate
router.post('/templates/:id/activate', authorize('admin'), async (req, res) => {
  try {
    const template = await WorkflowTemplate.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      { status: 'active', updatedBy: req.user.employee },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/workflow-engine/templates/:id
router.delete('/templates/:id', authorize('admin'), async (req, res) => {
  try {
    const template = await WorkflowTemplate.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    // Check if template has active instances
    const activeInstances = await WorkflowInstance.countDocuments({
      template: template._id,
      status: { $in: ['active', 'pending'] },
    });

    if (activeInstances > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete template with active instances',
      });
    }

    await template.deleteOne();
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// WORKFLOW INSTANCE ROUTES
// ============================================

// @route   GET /api/workflow-engine/instances
router.get('/instances', async (req, res) => {
  try {
    const { status, template, initiator, search, page = 1, limit = 20 } = req.query;

    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (template) query.template = template;
    if (initiator) query.initiatedBy = initiator;
    if (search) {
      query.$or = [
        { instanceNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
      ];
    }

    const instances = await WorkflowInstance.find(query)
      .populate('template', 'name code')
      .populate('initiatedBy', 'firstName lastName')
      .populate('currentStep.assignedTo', 'firstName lastName')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await WorkflowInstance.countDocuments(query);

    res.json({
      success: true,
      data: instances,
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

// @route   GET /api/workflow-engine/instances/my-tasks
router.get('/instances/my-tasks', async (req, res) => {
  try {
    const { status = 'pending' } = req.query;

    const instances = await WorkflowInstance.find({
      tenant: req.user.tenant,
      status: 'active',
      'currentStep.assignedTo': req.user.employee,
      'currentStep.status': status,
    })
      .populate('template', 'name code')
      .populate('initiatedBy', 'firstName lastName')
      .sort('-createdAt');

    res.json({ success: true, data: instances });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/workflow-engine/instances/:id
router.get('/instances/:id', async (req, res) => {
  try {
    const instance = await WorkflowInstance.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('template')
      .populate('initiatedBy', 'firstName lastName email')
      .populate('currentStep.assignedTo', 'firstName lastName email')
      .populate('history.performedBy', 'firstName lastName')
      .populate('stepsCompleted.completedBy', 'firstName lastName');

    if (!instance) {
      return res.status(404).json({ success: false, message: 'Instance not found' });
    }

    res.json({ success: true, data: instance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/workflow-engine/instances
router.post('/instances', async (req, res) => {
  try {
    const { templateId, data, title } = req.body;

    const template = await WorkflowTemplate.findOne({
      _id: templateId,
      tenant: req.user.tenant,
      status: 'active',
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Active template not found' });
    }

    // Get first step
    const firstStep = template.steps.find((s) => s.order === 1);

    const instance = await WorkflowInstance.create({
      tenant: req.user.tenant,
      template: template._id,
      title: title || `${template.name} - ${new Date().toISOString()}`,
      initiatedBy: req.user.employee,
      department: req.user.department,
      branch: req.user.branch,
      data,
      currentStep: {
        stepId: firstStep.stepId,
        stepName: firstStep.name,
        assignedTo: firstStep.assignees.map((a) => a.user).filter(Boolean),
        startedAt: new Date(),
        dueDate: firstStep.sla?.responseTime
          ? new Date(Date.now() + firstStep.sla.responseTime * 60 * 60 * 1000)
          : null,
      },
      status: 'active',
      history: [{
        action: 'initiated',
        stepId: firstStep.stepId,
        stepName: firstStep.name,
        performedBy: req.user.employee,
        timestamp: new Date(),
      }],
    });

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant-${req.user.tenant}`).emit('workflow:created', instance);
    }

    res.status(201).json({ success: true, data: instance });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/workflow-engine/instances/:id/action
router.post('/instances/:id/action', async (req, res) => {
  try {
    const { action, comments, data } = req.body;

    const instance = await WorkflowInstance.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    }).populate('template');

    if (!instance) {
      return res.status(404).json({ success: false, message: 'Instance not found' });
    }

    if (instance.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Workflow is not active' });
    }

    // Verify user is assigned to current step
    const isAssigned = instance.currentStep.assignedTo.some(
      (a) => a.toString() === req.user.employee.toString()
    );

    if (!isAssigned) {
      return res.status(403).json({ success: false, message: 'Not authorized to perform this action' });
    }

    const currentStepConfig = instance.template.steps.find(
      (s) => s.stepId === instance.currentStep.stepId
    );

    // Record action in history
    instance.history.push({
      action,
      stepId: instance.currentStep.stepId,
      stepName: instance.currentStep.stepName,
      performedBy: req.user.employee,
      comments,
      data,
      timestamp: new Date(),
    });

    // Mark current step as completed
    instance.stepsCompleted.push({
      stepId: instance.currentStep.stepId,
      stepName: instance.currentStep.stepName,
      action,
      completedBy: req.user.employee,
      completedAt: new Date(),
      comments,
    });

    // Determine next step based on action and conditions
    if (action === 'approve' || action === 'complete') {
      const currentOrder = currentStepConfig.order;
      let nextStep = null;

      // Check for conditional routing
      if (currentStepConfig.conditions && currentStepConfig.conditions.length > 0) {
        for (const condition of currentStepConfig.conditions) {
          const fieldValue = instance.data[condition.field];
          let conditionMet = false;

          switch (condition.operator) {
            case 'equals':
              conditionMet = fieldValue === condition.value;
              break;
            case 'greater_than':
              conditionMet = fieldValue > condition.value;
              break;
            case 'less_than':
              conditionMet = fieldValue < condition.value;
              break;
            case 'contains':
              conditionMet = fieldValue && fieldValue.includes(condition.value);
              break;
          }

          if (conditionMet && condition.action === 'goto_step') {
            nextStep = instance.template.steps.find((s) => s.stepId === condition.targetStep);
            break;
          }
        }
      }

      // If no conditional routing, get next sequential step
      if (!nextStep) {
        nextStep = instance.template.steps.find((s) => s.order === currentOrder + 1);
      }

      if (nextStep) {
        instance.currentStep = {
          stepId: nextStep.stepId,
          stepName: nextStep.name,
          assignedTo: nextStep.assignees.map((a) => a.user).filter(Boolean),
          startedAt: new Date(),
          dueDate: nextStep.sla?.responseTime
            ? new Date(Date.now() + nextStep.sla.responseTime * 60 * 60 * 1000)
            : null,
        };
        instance.progress = Math.round((currentOrder / instance.template.steps.length) * 100);
      } else {
        // Workflow completed
        instance.status = 'completed';
        instance.completedAt = new Date();
        instance.progress = 100;
      }
    } else if (action === 'reject') {
      instance.status = 'rejected';
      instance.rejectedAt = new Date();
      instance.rejectedBy = req.user.employee;
      instance.rejectionReason = comments;
    } else if (action === 'return') {
      // Return to previous step or initiator
      const previousStep = instance.template.steps.find(
        (s) => s.order === currentStepConfig.order - 1
      );

      if (previousStep) {
        instance.currentStep = {
          stepId: previousStep.stepId,
          stepName: previousStep.name,
          assignedTo: previousStep.assignees.map((a) => a.user).filter(Boolean),
          startedAt: new Date(),
          status: 'returned',
        };
      } else {
        instance.status = 'returned';
      }
    }

    // Update data if provided
    if (data) {
      instance.data = { ...instance.data, ...data };
    }

    await instance.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant-${req.user.tenant}`).emit('workflow:updated', instance);
    }

    res.json({ success: true, data: instance });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/workflow-engine/instances/:id/cancel
router.post('/instances/:id/cancel', async (req, res) => {
  try {
    const { reason } = req.body;

    const instance = await WorkflowInstance.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!instance) {
      return res.status(404).json({ success: false, message: 'Instance not found' });
    }

    // Only initiator or admin can cancel
    if (
      instance.initiatedBy.toString() !== req.user.employee.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel' });
    }

    instance.status = 'cancelled';
    instance.cancelledAt = new Date();
    instance.cancelledBy = req.user.employee;
    instance.cancellationReason = reason;

    instance.history.push({
      action: 'cancelled',
      performedBy: req.user.employee,
      comments: reason,
      timestamp: new Date(),
    });

    await instance.save();

    res.json({ success: true, data: instance });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// APPROVAL DELEGATION ROUTES
// ============================================

// @route   GET /api/workflow-engine/delegations
router.get('/delegations', async (req, res) => {
  try {
    const delegations = await ApprovalDelegation.find({
      tenant: req.user.tenant,
      $or: [{ delegator: req.user.employee }, { delegate: req.user.employee }],
    })
      .populate('delegator', 'firstName lastName email')
      .populate('delegate', 'firstName lastName email')
      .sort('-createdAt');

    res.json({ success: true, data: delegations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/workflow-engine/delegations
router.post('/delegations', async (req, res) => {
  try {
    const delegation = await ApprovalDelegation.create({
      ...req.body,
      tenant: req.user.tenant,
      delegator: req.user.employee,
    });

    res.status(201).json({ success: true, data: delegation });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/workflow-engine/delegations/:id/revoke
router.put('/delegations/:id/revoke', async (req, res) => {
  try {
    const delegation = await ApprovalDelegation.findOneAndUpdate(
      {
        _id: req.params.id,
        tenant: req.user.tenant,
        delegator: req.user.employee,
      },
      {
        status: 'revoked',
        revokedAt: new Date(),
        revokeReason: req.body.reason,
      },
      { new: true }
    );

    if (!delegation) {
      return res.status(404).json({ success: false, message: 'Delegation not found' });
    }

    res.json({ success: true, data: delegation });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// APPROVAL SUBSTITUTE ROUTES
// ============================================

// @route   GET /api/workflow-engine/substitutes
router.get('/substitutes', async (req, res) => {
  try {
    const substitutes = await ApprovalSubstitute.find({
      tenant: req.user.tenant,
      $or: [{ employee: req.user.employee }, { substitute: req.user.employee }],
    })
      .populate('employee', 'firstName lastName email')
      .populate('substitute', 'firstName lastName email')
      .sort('-createdAt');

    res.json({ success: true, data: substitutes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/workflow-engine/substitutes
router.post('/substitutes', async (req, res) => {
  try {
    const substitute = await ApprovalSubstitute.create({
      ...req.body,
      tenant: req.user.tenant,
      employee: req.user.employee,
      createdBy: req.user.employee,
    });

    res.status(201).json({ success: true, data: substitute });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// APPROVAL MATRIX ROUTES
// ============================================

// @route   GET /api/workflow-engine/matrices
router.get('/matrices', authorize('admin', 'hr'), async (req, res) => {
  try {
    const matrices = await ApprovalMatrix.find({
      tenant: req.user.tenant,
      isActive: true,
    })
      .populate('department', 'name')
      .populate('approvers.employee', 'firstName lastName')
      .sort('category minAmount');

    res.json({ success: true, data: matrices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/workflow-engine/matrices
router.post('/matrices', authorize('admin'), async (req, res) => {
  try {
    const matrix = await ApprovalMatrix.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user.employee,
    });

    res.status(201).json({ success: true, data: matrix });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// ESCALATION RULE ROUTES
// ============================================

// @route   GET /api/workflow-engine/escalation-rules
router.get('/escalation-rules', authorize('admin', 'hr'), async (req, res) => {
  try {
    const rules = await EscalationRule.find({
      tenant: req.user.tenant,
      isActive: true,
    })
      .populate('escalateTo', 'firstName lastName')
      .sort('category triggerAfterHours');

    res.json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/workflow-engine/escalation-rules
router.post('/escalation-rules', authorize('admin'), async (req, res) => {
  try {
    const rule = await EscalationRule.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user.employee,
    });

    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// ANALYTICS
// ============================================

// @route   GET /api/workflow-engine/analytics
router.get('/analytics', authorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const [instanceStats, templateStats, avgCompletionTime] = await Promise.all([
      // Instance status distribution
      WorkflowInstance.aggregate([
        {
          $match: {
            tenant: req.user.tenant,
            ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),

      // Most used templates
      WorkflowInstance.aggregate([
        {
          $match: {
            tenant: req.user.tenant,
            ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
          },
        },
        {
          $group: {
            _id: '$template',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'workflowtemplates',
            localField: '_id',
            foreignField: '_id',
            as: 'template',
          },
        },
        { $unwind: '$template' },
        {
          $project: {
            name: '$template.name',
            count: 1,
          },
        },
      ]),

      // Average completion time
      WorkflowInstance.aggregate([
        {
          $match: {
            tenant: req.user.tenant,
            status: 'completed',
            completedAt: { $exists: true },
          },
        },
        {
          $project: {
            duration: {
              $subtract: ['$completedAt', '$createdAt'],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgDuration: { $avg: '$duration' },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        instanceStats,
        templateStats,
        avgCompletionTime: avgCompletionTime[0]?.avgDuration || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
