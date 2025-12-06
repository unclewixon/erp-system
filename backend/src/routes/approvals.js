import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import {
  ApprovalChain,
  ApprovalRequest,
  DelegationHistory,
  ApprovalPolicy,
  ApprovalLimit,
  ApprovalQueue,
  ApprovalReminder,
} from '../models/Approval.js';

const router = express.Router();

// Apply authentication and tenant guard to all routes
router.use(protect);
router.use(tenantGuard);

// ============================================
// APPROVAL CHAIN ROUTES
// ============================================

// @route   GET /api/approvals/chains
router.get('/chains', authorize('admin', 'hr'), async (req, res) => {
  try {
    const { category, isActive = true } = req.query;

    const query = { tenant: req.user.tenant };
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const chains = await ApprovalChain.find(query)
      .populate('levels.approvers', 'firstName lastName')
      .populate('levels.roles', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort('category priority name');

    res.json({ success: true, data: chains });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/approvals/chains/:id
router.get('/chains/:id', authorize('admin', 'hr'), async (req, res) => {
  try {
    const chain = await ApprovalChain.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('levels.approvers', 'firstName lastName email')
      .populate('levels.roles', 'name')
      .populate('levels.designations', 'title')
      .populate('branches', 'name')
      .populate('departments', 'name');

    if (!chain) {
      return res.status(404).json({ success: false, message: 'Approval chain not found' });
    }

    res.json({ success: true, data: chain });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/approvals/chains
router.post('/chains', authorize('admin'), async (req, res) => {
  try {
    const chain = await ApprovalChain.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user.employee,
    });

    res.status(201).json({ success: true, data: chain });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/approvals/chains/:id
router.put('/chains/:id', authorize('admin'), async (req, res) => {
  try {
    const chain = await ApprovalChain.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      { ...req.body, updatedBy: req.user.employee },
      { new: true, runValidators: true }
    );

    if (!chain) {
      return res.status(404).json({ success: false, message: 'Approval chain not found' });
    }

    res.json({ success: true, data: chain });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/approvals/chains/:id
router.delete('/chains/:id', authorize('admin'), async (req, res) => {
  try {
    // Check for pending requests using this chain
    const pendingRequests = await ApprovalRequest.countDocuments({
      chain: req.params.id,
      status: { $in: ['pending', 'in_progress'] },
    });

    if (pendingRequests > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete chain with pending approval requests',
      });
    }

    const chain = await ApprovalChain.findOneAndDelete({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!chain) {
      return res.status(404).json({ success: false, message: 'Approval chain not found' });
    }

    res.json({ success: true, message: 'Approval chain deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// APPROVAL REQUEST ROUTES
// ============================================

// @route   GET /api/approvals/requests
router.get('/requests', async (req, res) => {
  try {
    const { status, type, requester, page = 1, limit = 20 } = req.query;

    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (type) query.referenceType = type;
    if (requester) query.requester = requester;

    const requests = await ApprovalRequest.find(query)
      .populate('chain', 'name')
      .populate('requester', 'firstName lastName email')
      .populate('department', 'name')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ApprovalRequest.countDocuments(query);

    res.json({
      success: true,
      data: requests,
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

// @route   GET /api/approvals/requests/pending
router.get('/requests/pending', async (req, res) => {
  try {
    const requests = await ApprovalRequest.find({
      tenant: req.user.tenant,
      status: { $in: ['pending', 'in_progress'] },
      'levels.approvers.employee': req.user.employee,
      'levels.approvers.status': 'pending',
    })
      .populate('chain', 'name')
      .populate('requester', 'firstName lastName email avatar')
      .populate('department', 'name')
      .sort('-priority -createdAt');

    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/approvals/requests/my-requests
router.get('/requests/my-requests', async (req, res) => {
  try {
    const { status } = req.query;

    const query = {
      tenant: req.user.tenant,
      requester: req.user.employee,
    };

    if (status) query.status = status;

    const requests = await ApprovalRequest.find(query)
      .populate('chain', 'name')
      .populate('levels.approvers.employee', 'firstName lastName')
      .sort('-createdAt');

    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/approvals/requests/:id
router.get('/requests/:id', async (req, res) => {
  try {
    const request = await ApprovalRequest.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('chain')
      .populate('requester', 'firstName lastName email avatar')
      .populate('department', 'name')
      .populate('branch', 'name')
      .populate('levels.approvers.employee', 'firstName lastName email avatar')
      .populate('levels.approvers.delegatedTo', 'firstName lastName')
      .populate('history.performer', 'firstName lastName')
      .populate('comments.author', 'firstName lastName avatar')
      .populate('attachments.uploadedBy', 'firstName lastName');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Approval request not found' });
    }

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/approvals/requests
router.post('/requests', async (req, res) => {
  try {
    const {
      chainId,
      referenceType,
      referenceId,
      referenceModel,
      referenceNumber,
      referenceData,
      title,
      description,
      amount,
      priority,
      attachments,
    } = req.body;

    // Get the approval chain
    const chain = await ApprovalChain.findOne({
      _id: chainId,
      tenant: req.user.tenant,
      isActive: true,
    }).populate('levels.approvers', '_id');

    if (!chain) {
      return res.status(404).json({ success: false, message: 'Approval chain not found' });
    }

    // Build levels from chain
    const levels = chain.levels.map((level) => ({
      level: level.level,
      levelName: level.name,
      status: level.level === 1 ? 'pending' : 'pending',
      approvers: level.approvers.map((approver) => ({
        employee: approver._id || approver,
        status: 'pending',
      })),
      requiredApprovals: level.approvalMode === 'all' ? level.approvers.length : 1,
      approvalMode: level.approvalMode,
    }));

    const request = await ApprovalRequest.create({
      tenant: req.user.tenant,
      chain: chain._id,
      referenceType,
      referenceId,
      referenceModel,
      referenceNumber,
      referenceData,
      requester: req.user.employee,
      department: req.user.department,
      branch: req.user.branch,
      title,
      description,
      amount,
      priority: priority || 'normal',
      currentLevel: 1,
      totalLevels: levels.length,
      status: 'pending',
      levels,
      attachments,
      submittedAt: new Date(),
      history: [{
        action: 'submitted',
        level: 1,
        performer: req.user.employee,
        comments: 'Request submitted for approval',
        timestamp: new Date(),
      }],
    });

    // Update approval queue for first level approvers
    const firstLevelApprovers = levels[0].approvers.map((a) => a.employee);
    for (const approverId of firstLevelApprovers) {
      await ApprovalQueue.findOneAndUpdate(
        { tenant: req.user.tenant, approver: approverId },
        {
          $push: {
            requests: {
              request: request._id,
              level: 1,
              priority: request.priority,
            },
          },
          $inc: { 'stats.pending': 1 },
          lastUpdated: new Date(),
        },
        { upsert: true }
      );
    }

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant-${req.user.tenant}`).emit('approval:created', request);
    }

    res.status(201).json({ success: true, data: request });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/approvals/requests/:id/approve
router.post('/requests/:id/approve', async (req, res) => {
  try {
    const { comments, attachments } = req.body;

    const request = await ApprovalRequest.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'pending' && request.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Request is not pending approval' });
    }

    // Find current level
    const currentLevel = request.levels.find((l) => l.level === request.currentLevel);
    if (!currentLevel) {
      return res.status(400).json({ success: false, message: 'Invalid approval level' });
    }

    // Find approver
    const approver = currentLevel.approvers.find(
      (a) => a.employee.toString() === req.user.employee.toString()
    );

    if (!approver) {
      return res.status(403).json({ success: false, message: 'Not authorized to approve this request' });
    }

    if (approver.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Already actioned this request' });
    }

    // Update approver status
    approver.status = 'approved';
    approver.action = 'approve';
    approver.comments = comments;
    approver.attachments = attachments;
    approver.actionDate = new Date();

    currentLevel.receivedApprovals += 1;

    // Add to history
    request.history.push({
      action: 'approved',
      level: request.currentLevel,
      performer: req.user.employee,
      comments,
      oldStatus: request.status,
      timestamp: new Date(),
    });

    // Check if level is complete
    const levelComplete =
      currentLevel.approvalMode === 'any' ||
      currentLevel.receivedApprovals >= currentLevel.requiredApprovals;

    if (levelComplete) {
      currentLevel.status = 'approved';
      currentLevel.completedAt = new Date();

      // Move to next level or complete
      if (request.currentLevel < request.totalLevels) {
        request.currentLevel += 1;
        request.status = 'in_progress';

        // Update queue for next level approvers
        const nextLevel = request.levels.find((l) => l.level === request.currentLevel);
        if (nextLevel) {
          nextLevel.startedAt = new Date();
          for (const nextApprover of nextLevel.approvers) {
            await ApprovalQueue.findOneAndUpdate(
              { tenant: req.user.tenant, approver: nextApprover.employee },
              {
                $push: {
                  requests: {
                    request: request._id,
                    level: request.currentLevel,
                    priority: request.priority,
                  },
                },
                $inc: { 'stats.pending': 1 },
                lastUpdated: new Date(),
              },
              { upsert: true }
            );
          }
        }
      } else {
        // All levels approved
        request.status = 'approved';
        request.approvedAt = new Date();

        request.history.push({
          action: 'approved',
          performer: req.user.employee,
          comments: 'Request fully approved',
          newStatus: 'approved',
          timestamp: new Date(),
        });
      }
    }

    await request.save();

    // Update approver's queue
    await ApprovalQueue.findOneAndUpdate(
      { tenant: req.user.tenant, approver: req.user.employee },
      {
        $pull: { requests: { request: request._id } },
        $inc: { 'stats.pending': -1, 'stats.approvedToday': 1 },
        lastUpdated: new Date(),
      }
    );

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant-${req.user.tenant}`).emit('approval:updated', request);
    }

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/approvals/requests/:id/reject
router.post('/requests/:id/reject', async (req, res) => {
  try {
    const { comments } = req.body;

    if (!comments) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const request = await ApprovalRequest.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Find current level and approver
    const currentLevel = request.levels.find((l) => l.level === request.currentLevel);
    const approver = currentLevel?.approvers.find(
      (a) => a.employee.toString() === req.user.employee.toString()
    );

    if (!approver) {
      return res.status(403).json({ success: false, message: 'Not authorized to reject this request' });
    }

    approver.status = 'rejected';
    approver.action = 'reject';
    approver.comments = comments;
    approver.actionDate = new Date();

    currentLevel.status = 'rejected';
    currentLevel.completedAt = new Date();

    request.status = 'rejected';
    request.rejectedAt = new Date();
    request.rejectedBy = req.user.employee;
    request.rejectionReason = comments;

    request.history.push({
      action: 'rejected',
      level: request.currentLevel,
      performer: req.user.employee,
      comments,
      newStatus: 'rejected',
      timestamp: new Date(),
    });

    await request.save();

    // Update approval queue
    await ApprovalQueue.findOneAndUpdate(
      { tenant: req.user.tenant, approver: req.user.employee },
      {
        $pull: { requests: { request: request._id } },
        $inc: { 'stats.pending': -1, 'stats.rejectedToday': 1 },
        lastUpdated: new Date(),
      }
    );

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant-${req.user.tenant}`).emit('approval:rejected', request);
    }

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/approvals/requests/:id/return
router.post('/requests/:id/return', async (req, res) => {
  try {
    const { comments } = req.body;

    if (!comments) {
      return res.status(400).json({ success: false, message: 'Return reason is required' });
    }

    const request = await ApprovalRequest.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    request.status = 'returned';
    request.returnReason = comments;
    request.returnedBy = req.user.employee;
    request.returnedAt = new Date();

    request.history.push({
      action: 'returned',
      level: request.currentLevel,
      performer: req.user.employee,
      comments,
      newStatus: 'returned',
      timestamp: new Date(),
    });

    await request.save();

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/approvals/requests/:id/cancel
router.post('/requests/:id/cancel', async (req, res) => {
  try {
    const { reason } = req.body;

    const request = await ApprovalRequest.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      requester: req.user.employee,
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (!['pending', 'in_progress', 'returned'].includes(request.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel this request' });
    }

    request.status = 'cancelled';
    request.cancelReason = reason;
    request.cancelledBy = req.user.employee;
    request.cancelledAt = new Date();

    request.history.push({
      action: 'cancelled',
      performer: req.user.employee,
      comments: reason,
      newStatus: 'cancelled',
      timestamp: new Date(),
    });

    await request.save();

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/approvals/requests/:id/comment
router.post('/requests/:id/comment', async (req, res) => {
  try {
    const { content, isInternal } = req.body;

    const request = await ApprovalRequest.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      {
        $push: {
          comments: {
            author: req.user.employee,
            content,
            isInternal: isInternal || false,
          },
        },
      },
      { new: true }
    ).populate('comments.author', 'firstName lastName avatar');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.json({ success: true, data: request.comments });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/approvals/requests/bulk-approve
router.post('/requests/bulk-approve', async (req, res) => {
  try {
    const { requestIds, comments } = req.body;

    const results = {
      success: [],
      failed: [],
    };

    for (const id of requestIds) {
      try {
        const request = await ApprovalRequest.findOne({
          _id: id,
          tenant: req.user.tenant,
        });

        if (!request) {
          results.failed.push({ id, error: 'Not found' });
          continue;
        }

        const currentLevel = request.levels.find((l) => l.level === request.currentLevel);
        const approver = currentLevel?.approvers.find(
          (a) => a.employee.toString() === req.user.employee.toString()
        );

        if (!approver || approver.status !== 'pending') {
          results.failed.push({ id, error: 'Not authorized or already actioned' });
          continue;
        }

        approver.status = 'approved';
        approver.action = 'approve';
        approver.comments = comments;
        approver.actionDate = new Date();
        currentLevel.receivedApprovals += 1;

        // Simplified completion check
        if (currentLevel.receivedApprovals >= (currentLevel.requiredApprovals || 1)) {
          currentLevel.status = 'approved';
          if (request.currentLevel >= request.totalLevels) {
            request.status = 'approved';
            request.approvedAt = new Date();
          } else {
            request.currentLevel += 1;
            request.status = 'in_progress';
          }
        }

        await request.save();
        results.success.push(id);
      } catch (err) {
        results.failed.push({ id, error: err.message });
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// APPROVAL POLICY ROUTES
// ============================================

// @route   GET /api/approvals/policies
router.get('/policies', authorize('admin', 'hr'), async (req, res) => {
  try {
    const policies = await ApprovalPolicy.find({
      tenant: req.user.tenant,
      isActive: true,
    })
      .populate('defaultChain', 'name')
      .sort('category name');

    res.json({ success: true, data: policies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/approvals/policies
router.post('/policies', authorize('admin'), async (req, res) => {
  try {
    const policy = await ApprovalPolicy.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user.employee,
    });

    res.status(201).json({ success: true, data: policy });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// APPROVAL LIMIT ROUTES
// ============================================

// @route   GET /api/approvals/limits
router.get('/limits', authorize('admin', 'hr', 'finance'), async (req, res) => {
  try {
    const limits = await ApprovalLimit.find({
      tenant: req.user.tenant,
      isActive: true,
    })
      .populate('user', 'firstName lastName')
      .populate('role', 'name')
      .populate('designation', 'title')
      .populate('department', 'name')
      .sort('category limitType');

    res.json({ success: true, data: limits });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/approvals/limits
router.post('/limits', authorize('admin'), async (req, res) => {
  try {
    const limit = await ApprovalLimit.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user.employee,
    });

    res.status(201).json({ success: true, data: limit });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// APPROVAL QUEUE ROUTES
// ============================================

// @route   GET /api/approvals/queue
router.get('/queue', async (req, res) => {
  try {
    let queue = await ApprovalQueue.findOne({
      tenant: req.user.tenant,
      approver: req.user.employee,
    }).populate({
      path: 'requests.request',
      populate: [
        { path: 'requester', select: 'firstName lastName avatar' },
        { path: 'chain', select: 'name' },
      ],
    });

    if (!queue) {
      queue = { requests: [], stats: { pending: 0, overdue: 0, urgent: 0 } };
    }

    res.json({ success: true, data: queue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/approvals/queue/:requestId/read
router.put('/queue/:requestId/read', async (req, res) => {
  try {
    await ApprovalQueue.findOneAndUpdate(
      {
        tenant: req.user.tenant,
        approver: req.user.employee,
        'requests.request': req.params.requestId,
      },
      {
        $set: {
          'requests.$.isRead': true,
          'requests.$.readAt': new Date(),
        },
      }
    );

    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// ANALYTICS
// ============================================

// @route   GET /api/approvals/analytics
router.get('/analytics', authorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = { tenant: req.user.tenant };
    if (startDate) dateFilter.createdAt = { $gte: new Date(startDate) };
    if (endDate) {
      dateFilter.createdAt = dateFilter.createdAt || {};
      dateFilter.createdAt.$lte = new Date(endDate);
    }

    const [statusBreakdown, categoryBreakdown, avgApprovalTime, topApprovers] = await Promise.all([
      // Status distribution
      ApprovalRequest.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // By category
      ApprovalRequest.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$referenceType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Average approval time (for completed requests)
      ApprovalRequest.aggregate([
        {
          $match: {
            ...dateFilter,
            status: 'approved',
            approvedAt: { $exists: true },
          },
        },
        {
          $project: {
            approvalTime: { $subtract: ['$approvedAt', '$submittedAt'] },
          },
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$approvalTime' },
          },
        },
      ]),

      // Top approvers
      ApprovalRequest.aggregate([
        { $match: dateFilter },
        { $unwind: '$levels' },
        { $unwind: '$levels.approvers' },
        { $match: { 'levels.approvers.status': 'approved' } },
        {
          $group: {
            _id: '$levels.approvers.employee',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'employees',
            localField: '_id',
            foreignField: '_id',
            as: 'employee',
          },
        },
        { $unwind: '$employee' },
        {
          $project: {
            name: { $concat: ['$employee.firstName', ' ', '$employee.lastName'] },
            count: 1,
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        statusBreakdown,
        categoryBreakdown,
        avgApprovalTime: avgApprovalTime[0]?.avgTime || 0,
        topApprovers,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
