import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import Reimbursement from '../models/Reimbursement.js';
import Employee from '../models/Employee.js';

const router = express.Router();

router.use(protect);
router.use(tenantGuard);

// Get all reimbursements
router.get('/', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer', 'finance_manager'), async (req, res) => {
  try {
    const { status } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;

    const reimbursements = await Reimbursement.find(query)
      .populate('employee', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: reimbursements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get my reimbursements
router.get('/my', async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const reimbursements = await Reimbursement.find({
      tenant: req.user.tenant,
      employee: employee._id,
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: reimbursements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single reimbursement
router.get('/:id', async (req, res) => {
  try {
    const reimbursement = await Reimbursement.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('employee', 'firstName lastName employeeId email')
      .populate('reviewedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .populate('payment.paidBy', 'firstName lastName');

    if (!reimbursement) {
      return res.status(404).json({ success: false, message: 'Reimbursement not found' });
    }

    // Check authorization
    const employee = await Employee.findOne({ user: req.user._id });
    const isOwner = employee && reimbursement.employee._id.toString() === employee._id.toString();
    const isHR = ['super_admin', 'tenant_admin', 'hr_manager', 'hr_officer', 'finance_manager'].includes(req.user.role);

    if (!isOwner && !isHR) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: reimbursement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create reimbursement
router.post('/', async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const reimbursement = await Reimbursement.create({
      ...req.body,
      tenant: req.user.tenant,
      employee: employee._id,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: reimbursement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update reimbursement (only draft status)
router.put('/:id', async (req, res) => {
  try {
    const reimbursement = await Reimbursement.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: 'draft',
    });

    if (!reimbursement) {
      return res.status(404).json({ success: false, message: 'Reimbursement not found or cannot be edited' });
    }

    // Check ownership
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee || reimbursement.employee.toString() !== employee._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    Object.assign(reimbursement, req.body);
    await reimbursement.save();

    res.json({ success: true, data: reimbursement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Submit reimbursement
router.post('/:id/submit', async (req, res) => {
  try {
    const reimbursement = await Reimbursement.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: 'draft',
    });

    if (!reimbursement) {
      return res.status(404).json({ success: false, message: 'Reimbursement not found' });
    }

    // Check ownership
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee || reimbursement.employee.toString() !== employee._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    reimbursement.status = 'submitted';
    reimbursement.submittedAt = new Date();
    await reimbursement.save();

    res.json({ success: true, data: reimbursement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Review reimbursement
router.post('/:id/review', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const reimbursement = await Reimbursement.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: 'submitted' },
      {
        status: 'under_review',
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
        reviewComments: req.body.comments,
      },
      { new: true }
    );

    if (!reimbursement) {
      return res.status(404).json({ success: false, message: 'Reimbursement not found' });
    }

    res.json({ success: true, data: reimbursement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Approve reimbursement
router.post('/:id/approve', authorize('super_admin', 'tenant_admin', 'hr_manager', 'finance_manager'), async (req, res) => {
  try {
    const reimbursement = await Reimbursement.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: { $in: ['submitted', 'under_review'] },
    });

    if (!reimbursement) {
      return res.status(404).json({ success: false, message: 'Reimbursement not found' });
    }

    reimbursement.status = 'approved';
    reimbursement.approvedAmount = req.body.approvedAmount || reimbursement.totalAmount;
    reimbursement.approvedBy = req.user._id;
    reimbursement.approvedAt = new Date();

    await reimbursement.save();

    res.json({ success: true, data: reimbursement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Reject reimbursement
router.post('/:id/reject', authorize('super_admin', 'tenant_admin', 'hr_manager', 'finance_manager'), async (req, res) => {
  try {
    const reimbursement = await Reimbursement.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: { $in: ['submitted', 'under_review'] } },
      {
        status: 'rejected',
        rejectionReason: req.body.reason,
      },
      { new: true }
    );

    if (!reimbursement) {
      return res.status(404).json({ success: false, message: 'Reimbursement not found' });
    }

    res.json({ success: true, data: reimbursement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Mark as paid
router.post('/:id/pay', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const reimbursement = await Reimbursement.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: 'approved' },
      {
        status: 'paid',
        payment: {
          method: req.body.method,
          reference: req.body.reference,
          paidAt: new Date(),
          paidBy: req.user._id,
        },
        payrollId: req.body.payrollId,
      },
      { new: true }
    );

    if (!reimbursement) {
      return res.status(404).json({ success: false, message: 'Reimbursement not found or not approved' });
    }

    res.json({ success: true, data: reimbursement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get reimbursement stats
router.get('/stats/summary', authorize('super_admin', 'tenant_admin', 'hr_manager', 'finance_manager'), async (req, res) => {
  try {
    const [statusStats, categoryStats, totals] = await Promise.all([
      Reimbursement.aggregate([
        { $match: { tenant: req.user.tenant } },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$totalAmount' } } },
      ]),
      Reimbursement.aggregate([
        { $match: { tenant: req.user.tenant } },
        { $unwind: '$items' },
        { $group: { _id: '$items.category', count: { $sum: 1 }, total: { $sum: '$items.amount' } } },
      ]),
      Reimbursement.aggregate([
        { $match: { tenant: req.user.tenant, status: { $in: ['approved', 'paid'] } } },
        { $group: { _id: null, totalApproved: { $sum: '$approvedAmount' } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        byStatus: statusStats,
        byCategory: categoryStats,
        totalApproved: totals[0]?.totalApproved || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
