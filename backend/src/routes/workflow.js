import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import { WorkflowTemplate, ApprovalRequest } from '../models/Workflow.js';

const router = express.Router();

router.use(protect);
router.use(tenantGuard);

// ============ WORKFLOW TEMPLATES ============

// Get all templates
router.get('/templates', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    // Super Admin has no tenant - return empty array
    if (!req.user.tenant) {
      return res.json({ success: true, data: [] });
    }

    const { module } = req.query;
    const query = { tenant: req.user.tenant };

    if (module) query.module = module;

    const templates = await WorkflowTemplate.find(query)
      .populate('steps.approver', 'firstName lastName')
      .sort({ module: 1, name: 1 });

    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create template
router.post('/templates', authorize('super_admin', 'tenant_admin'), async (req, res) => {
  try {
    const template = await WorkflowTemplate.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update template
router.put('/templates/:id', authorize('super_admin', 'tenant_admin'), async (req, res) => {
  try {
    const template = await WorkflowTemplate.findOneAndUpdate(
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

// Delete template
router.delete('/templates/:id', authorize('super_admin', 'tenant_admin'), async (req, res) => {
  try {
    const template = await WorkflowTemplate.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      { isActive: false },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.json({ success: true, message: 'Template deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ APPROVAL REQUESTS ============

// Get all approval requests
router.get('/approvals', authorize('super_admin', 'tenant_admin', 'hr_manager', 'finance_manager'), async (req, res) => {
  try {
    // Super Admin has no tenant - return empty array
    if (!req.user.tenant) {
      return res.json({ success: true, data: [] });
    }

    const { status, module } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (module) query.module = module;

    const requests = await ApprovalRequest.find(query)
      .populate('workflow', 'name')
      .populate('requestedBy', 'firstName lastName')
      .populate('currentApprover', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get my pending approvals
router.get('/approvals/pending', async (req, res) => {
  try {
    const requests = await ApprovalRequest.find({
      tenant: req.user.tenant,
      currentApprover: req.user._id,
      status: { $in: ['pending', 'in_progress'] },
    })
      .populate('workflow', 'name')
      .populate('requestedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get my requests
router.get('/approvals/my', async (req, res) => {
  try {
    const requests = await ApprovalRequest.find({
      tenant: req.user.tenant,
      requestedBy: req.user._id,
    })
      .populate('workflow', 'name')
      .populate('currentApprover', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single request
router.get('/approvals/:id', async (req, res) => {
  try {
    const request = await ApprovalRequest.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('workflow')
      .populate('requestedBy', 'firstName lastName email')
      .populate('currentApprover', 'firstName lastName email')
      .populate('history.approver', 'firstName lastName')
      .populate('history.delegatedTo', 'firstName lastName');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create approval request
router.post('/approvals', async (req, res) => {
  try {
    const workflow = await WorkflowTemplate.findOne({
      _id: req.body.workflowId,
      tenant: req.user.tenant,
      isActive: true,
    });

    if (!workflow) {
      return res.status(404).json({ success: false, message: 'Workflow not found' });
    }

    // Determine first approver
    const firstStep = workflow.steps.find(s => s.order === 1);
    let currentApprover = firstStep?.approver;

    const request = await ApprovalRequest.create({
      tenant: req.user.tenant,
      workflow: workflow._id,
      module: req.body.module,
      documentType: req.body.documentType,
      documentId: req.body.documentId,
      documentRef: req.body.documentRef,
      requestedBy: req.user._id,
      currentStep: 1,
      currentApprover,
      status: 'pending',
      summary: req.body.summary,
      metadata: req.body.metadata,
    });

    res.status(201).json({ success: true, data: request });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Approve request
router.post('/approvals/:id/approve', async (req, res) => {
  try {
    const request = await ApprovalRequest.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      currentApprover: req.user._id,
      status: { $in: ['pending', 'in_progress'] },
    }).populate('workflow');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found or not authorized' });
    }

    const workflow = request.workflow;
    const currentStepConfig = workflow.steps.find(s => s.order === request.currentStep);

    // Add to history
    request.history.push({
      step: request.currentStep,
      stepName: currentStepConfig?.name,
      approver: req.user._id,
      action: 'approved',
      comments: req.body.comments,
    });

    // Check if there are more steps
    const nextStep = workflow.steps.find(s => s.order === request.currentStep + 1);

    if (nextStep) {
      request.currentStep += 1;
      request.currentApprover = nextStep.approver;
      request.status = 'in_progress';
    } else {
      request.status = 'approved';
      request.completedAt = new Date();
      request.currentApprover = null;
    }

    await request.save();

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Reject request
router.post('/approvals/:id/reject', async (req, res) => {
  try {
    const request = await ApprovalRequest.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      currentApprover: req.user._id,
      status: { $in: ['pending', 'in_progress'] },
    }).populate('workflow');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found or not authorized' });
    }

    const currentStepConfig = request.workflow.steps.find(s => s.order === request.currentStep);

    request.history.push({
      step: request.currentStep,
      stepName: currentStepConfig?.name,
      approver: req.user._id,
      action: 'rejected',
      comments: req.body.reason,
    });

    request.status = 'rejected';
    request.completedAt = new Date();
    request.currentApprover = null;

    await request.save();

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delegate approval
router.post('/approvals/:id/delegate', async (req, res) => {
  try {
    const request = await ApprovalRequest.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      currentApprover: req.user._id,
      status: { $in: ['pending', 'in_progress'] },
    }).populate('workflow');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found or not authorized' });
    }

    const currentStepConfig = request.workflow.steps.find(s => s.order === request.currentStep);

    if (!currentStepConfig?.canDelegate) {
      return res.status(400).json({ success: false, message: 'Delegation not allowed for this step' });
    }

    request.history.push({
      step: request.currentStep,
      stepName: currentStepConfig?.name,
      approver: req.user._id,
      action: 'delegated',
      delegatedTo: req.body.delegateTo,
      comments: req.body.reason,
    });

    request.currentApprover = req.body.delegateTo;

    await request.save();

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Cancel request
router.post('/approvals/:id/cancel', async (req, res) => {
  try {
    const request = await ApprovalRequest.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      requestedBy: req.user._id,
      status: { $in: ['pending', 'in_progress'] },
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found or cannot be cancelled' });
    }

    request.status = 'cancelled';
    request.completedAt = new Date();

    await request.save();

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get approval stats
router.get('/stats/summary', async (req, res) => {
  try {
    const pendingCount = await ApprovalRequest.countDocuments({
      tenant: req.user.tenant,
      currentApprover: req.user._id,
      status: { $in: ['pending', 'in_progress'] },
    });

    const myRequestsCount = await ApprovalRequest.countDocuments({
      tenant: req.user.tenant,
      requestedBy: req.user._id,
      status: { $in: ['pending', 'in_progress'] },
    });

    const [statusStats] = await Promise.all([
      ApprovalRequest.aggregate([
        { $match: { tenant: req.user.tenant } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        pendingApprovals: pendingCount,
        myPendingRequests: myRequestsCount,
        byStatus: statusStats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
