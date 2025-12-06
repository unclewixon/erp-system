import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import { LoanType, Loan } from '../models/Loan.js';
import Employee from '../models/Employee.js';

const router = express.Router();

router.use(protect);
router.use(tenantGuard);

// ============ LOAN TYPES ============

// Get all loan types
router.get('/types', async (req, res) => {
  try {
    const types = await LoanType.find({
      tenant: req.user.tenant,
      isActive: true,
    });

    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create loan type
router.post('/types', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const type = await LoanType.create({
      ...req.body,
      tenant: req.user.tenant,
    });

    res.status(201).json({ success: true, data: type });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update loan type
router.put('/types/:id', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const type = await LoanType.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    if (!type) {
      return res.status(404).json({ success: false, message: 'Loan type not found' });
    }

    res.json({ success: true, data: type });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ LOANS ============

// Get all loans
router.get('/', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer', 'finance_manager'), async (req, res) => {
  try {
    const { status, loanTypeId } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (loanTypeId) query.loanType = loanTypeId;

    const loans = await Loan.find(query)
      .populate('employee', 'firstName lastName employeeId')
      .populate('loanType', 'name code')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: loans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get my loans
router.get('/my', async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const loans = await Loan.find({
      tenant: req.user.tenant,
      employee: employee._id,
    })
      .populate('loanType', 'name code interestRate')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: loans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single loan
router.get('/:id', async (req, res) => {
  try {
    const loan = await Loan.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('employee', 'firstName lastName employeeId email')
      .populate('loanType')
      .populate('approvedBy', 'firstName lastName')
      .populate('guarantors.employee', 'firstName lastName employeeId');

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    // Check authorization
    const employee = await Employee.findOne({ user: req.user._id });
    const isOwner = employee && loan.employee._id.toString() === employee._id.toString();
    const isHR = ['super_admin', 'tenant_admin', 'hr_manager', 'hr_officer', 'finance_manager'].includes(req.user.role);

    if (!isOwner && !isHR) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: loan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Apply for loan
router.post('/apply', async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const loanType = await LoanType.findOne({
      _id: req.body.loanTypeId,
      tenant: req.user.tenant,
      isActive: true,
    });

    if (!loanType) {
      return res.status(404).json({ success: false, message: 'Loan type not found' });
    }

    // Check max amount
    if (req.body.requestedAmount > loanType.maxAmount) {
      return res.status(400).json({ success: false, message: `Maximum loan amount is ${loanType.maxAmount}` });
    }

    // Check active loans
    const activeLoans = await Loan.countDocuments({
      tenant: req.user.tenant,
      employee: employee._id,
      status: { $in: ['pending', 'approved', 'disbursed', 'active'] },
    });

    if (activeLoans >= loanType.maxConcurrentLoans) {
      return res.status(400).json({ success: false, message: 'Maximum concurrent loans reached' });
    }

    const loan = await Loan.create({
      tenant: req.user.tenant,
      employee: employee._id,
      loanType: loanType._id,
      requestedAmount: req.body.requestedAmount,
      tenureMonths: req.body.tenureMonths,
      purpose: req.body.purpose,
      interestRate: loanType.interestRate,
      status: 'pending',
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: loan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Approve loan
router.post('/:id/approve', authorize('super_admin', 'tenant_admin', 'hr_manager', 'finance_manager'), async (req, res) => {
  try {
    const loan = await Loan.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: { $in: ['pending', 'under_review'] },
    });

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found or already processed' });
    }

    loan.status = 'approved';
    loan.approvedAmount = req.body.approvedAmount || loan.requestedAmount;
    loan.approvedBy = req.user._id;
    loan.approvedAt = new Date();
    loan.repaymentStartDate = req.body.repaymentStartDate || new Date();

    // Calculate repayments
    loan.calculateRepayments();
    await loan.save();

    res.json({ success: true, data: loan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Reject loan
router.post('/:id/reject', authorize('super_admin', 'tenant_admin', 'hr_manager', 'finance_manager'), async (req, res) => {
  try {
    const loan = await Loan.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: { $in: ['pending', 'under_review'] } },
      {
        status: 'rejected',
        rejectionReason: req.body.reason,
      },
      { new: true }
    );

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    res.json({ success: true, data: loan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Disburse loan
router.post('/:id/disburse', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const loan = await Loan.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: 'approved',
    });

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found or not approved' });
    }

    loan.status = 'disbursed';
    loan.disbursedAmount = loan.approvedAmount;
    loan.disbursementDate = new Date();
    loan.disbursementMethod = req.body.method || 'bank_transfer';
    loan.disbursementReference = req.body.reference;

    // Start as active after disbursement
    loan.status = 'active';

    await loan.save();

    res.json({ success: true, data: loan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Record repayment
router.post('/:id/repayments/:repaymentIndex', authorize('super_admin', 'tenant_admin', 'hr_manager', 'finance_manager'), async (req, res) => {
  try {
    const loan = await Loan.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: 'active',
    });

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    const repayment = loan.repayments[req.params.repaymentIndex];
    if (!repayment) {
      return res.status(404).json({ success: false, message: 'Repayment not found' });
    }

    repayment.paidAmount = req.body.amount;
    repayment.paidDate = new Date();
    repayment.status = req.body.amount >= repayment.amount ? 'paid' : 'partial';
    repayment.payrollId = req.body.payrollId;

    loan.totalRepaid += req.body.amount;
    loan.outstandingBalance = loan.approvedAmount - loan.totalRepaid;

    // Check if loan is completed
    const allPaid = loan.repayments.every(r => r.status === 'paid');
    if (allPaid) {
      loan.status = 'completed';
    }

    await loan.save();

    res.json({ success: true, data: loan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get loan stats
router.get('/stats/summary', authorize('super_admin', 'tenant_admin', 'hr_manager', 'finance_manager'), async (req, res) => {
  try {
    const [statusStats, typeStats, totalDisbursed] = await Promise.all([
      Loan.aggregate([
        { $match: { tenant: req.user.tenant } },
        { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$approvedAmount' } } },
      ]),
      Loan.aggregate([
        { $match: { tenant: req.user.tenant } },
        { $group: { _id: '$loanType', count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'loantypes',
            localField: '_id',
            foreignField: '_id',
            as: 'type',
          },
        },
        { $unwind: '$type' },
        { $project: { typeName: '$type.name', count: 1 } },
      ]),
      Loan.aggregate([
        { $match: { tenant: req.user.tenant, status: { $in: ['disbursed', 'active', 'completed'] } } },
        { $group: { _id: null, total: { $sum: '$disbursedAmount' }, outstanding: { $sum: '$outstandingBalance' } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        byStatus: statusStats,
        byType: typeStats,
        totals: totalDisbursed[0] || { total: 0, outstanding: 0 },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
