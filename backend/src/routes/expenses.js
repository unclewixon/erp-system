import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import { Expense, ExpenseCategory } from '../models/Expense.js';

const router = express.Router();

router.use(protect);
router.use(tenantGuard);

// ============ EXPENSE CATEGORIES ============

router.get('/categories', async (req, res) => {
  try {
    const categories = await ExpenseCategory.find({
      tenant: req.user.tenant,
      isActive: true,
    }).sort({ name: 1 });

    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/categories', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const category = await ExpenseCategory.create({
      ...req.body,
      tenant: req.user.tenant,
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/categories/:id', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const category = await ExpenseCategory.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
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

// ============ EXPENSES ============

router.get('/', authorize('super_admin', 'tenant_admin', 'finance_manager', 'finance_officer', 'hr_manager'), async (req, res) => {
  try {
    const { status, category, startDate, endDate } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (category) query.category = category;
    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(startDate);
      if (endDate) query.expenseDate.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(query)
      .populate('category', 'name code')
      .populate('department', 'name')
      .populate('submittedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: expenses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('category', 'name code')
      .populate('department', 'name')
      .populate('items.category', 'name')
      .populate('submittedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .populate('paidBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    res.json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const expense = await Expense.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: 'draft',
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found or cannot be edited' });
    }

    Object.assign(expense, req.body);
    await expense.save();

    res.json({ success: true, data: expense });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/:id/submit', async (req, res) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: 'draft' },
      {
        status: 'submitted',
        submittedBy: req.user._id,
        submittedAt: new Date(),
      },
      { new: true }
    );

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    res.json({ success: true, data: expense });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/:id/approve', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: { $in: ['submitted', 'under_review'] } },
      {
        status: 'approved',
        approvedBy: req.user._id,
        approvedAt: new Date(),
        approvedAmount: req.body.approvedAmount,
      },
      { new: true }
    );

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    res.json({ success: true, data: expense });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/:id/reject', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: { $in: ['submitted', 'under_review'] } },
      {
        status: 'rejected',
        rejectionReason: req.body.reason,
      },
      { new: true }
    );

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    res.json({ success: true, data: expense });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/:id/pay', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: 'approved' },
      {
        status: 'paid',
        paidBy: req.user._id,
        paidAt: new Date(),
        paymentMethod: req.body.paymentMethod,
        paymentReference: req.body.reference,
      },
      { new: true }
    );

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    res.json({ success: true, data: expense });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/stats/summary', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const { year, month } = req.query;
    const matchQuery = { tenant: req.user.tenant };

    if (year) {
      const startDate = new Date(year, month ? month - 1 : 0, 1);
      const endDate = month
        ? new Date(year, month, 0)
        : new Date(year, 11, 31);
      matchQuery.expenseDate = { $gte: startDate, $lte: endDate };
    }

    const [statusStats, categoryStats, monthlyTrend] = await Promise.all([
      Expense.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$totalAmount' } } },
      ]),
      Expense.aggregate([
        { $match: { ...matchQuery, status: { $in: ['approved', 'paid'] } } },
        { $group: { _id: '$category', total: { $sum: '$totalAmount' } } },
        {
          $lookup: {
            from: 'expensecategories',
            localField: '_id',
            foreignField: '_id',
            as: 'category',
          },
        },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        { $project: { categoryName: '$category.name', total: 1 } },
      ]),
      Expense.aggregate([
        { $match: { ...matchQuery, status: { $in: ['approved', 'paid'] } } },
        {
          $group: {
            _id: { year: { $year: '$expenseDate' }, month: { $month: '$expenseDate' } },
            total: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        byStatus: statusStats,
        byCategory: categoryStats,
        monthlyTrend,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
