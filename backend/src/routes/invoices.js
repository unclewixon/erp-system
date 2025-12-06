import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import { Customer, Invoice } from '../models/Invoice.js';

const router = express.Router();

router.use(protect);
router.use(tenantGuard);

// ============ CUSTOMERS ============

router.get('/customers', async (req, res) => {
  try {
    const customers = await Customer.find({
      tenant: req.user.tenant,
      isActive: true,
    }).sort({ name: 1 });

    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/customers', authorize('super_admin', 'tenant_admin', 'finance_manager', 'sales_manager'), async (req, res) => {
  try {
    const customer = await Customer.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/customers/:id', authorize('super_admin', 'tenant_admin', 'finance_manager', 'sales_manager'), async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ INVOICES ============

router.get('/', authorize('super_admin', 'tenant_admin', 'finance_manager', 'finance_officer', 'sales_manager'), async (req, res) => {
  try {
    const { status, customer, startDate, endDate, type } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (customer) query.customer = customer;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) query.invoiceDate.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(query)
      .populate('customer', 'name code email')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('customer')
      .populate('payments.receivedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', authorize('super_admin', 'tenant_admin', 'finance_manager', 'finance_officer', 'sales_manager'), async (req, res) => {
  try {
    const invoice = await Invoice.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/:id', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: 'draft',
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found or cannot be edited' });
    }

    Object.assign(invoice, req.body);
    await invoice.save();

    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/:id/send', authorize('super_admin', 'tenant_admin', 'finance_manager', 'finance_officer'), async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: 'draft' },
      {
        status: 'sent',
        sentAt: new Date(),
      },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // TODO: Send email notification to customer

    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/:id/payments', authorize('super_admin', 'tenant_admin', 'finance_manager', 'finance_officer'), async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: { $in: ['sent', 'viewed', 'partial'] },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    invoice.payments.push({
      amount: req.body.amount,
      paymentDate: req.body.paymentDate || new Date(),
      paymentMethod: req.body.paymentMethod,
      reference: req.body.reference,
      notes: req.body.notes,
      receivedBy: req.user._id,
    });

    await invoice.save();

    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/:id/cancel', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: { $in: ['draft', 'sent', 'viewed'] },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found or cannot be cancelled' });
    }

    invoice.status = 'cancelled';
    invoice.notes = req.body.reason ? `Cancelled: ${req.body.reason}` : invoice.notes;
    await invoice.save();

    res.json({ success: true, data: invoice });
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
      matchQuery.invoiceDate = { $gte: startDate, $lte: endDate };
    }

    const [statusStats, overdueStats, customerStats, monthlyRevenue] = await Promise.all([
      Invoice.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$totalAmount' }, balance: { $sum: '$balanceDue' } } },
      ]),
      Invoice.aggregate([
        {
          $match: {
            tenant: req.user.tenant,
            status: { $in: ['sent', 'viewed', 'partial'] },
            dueDate: { $lt: new Date() },
          },
        },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$balanceDue' } } },
      ]),
      Invoice.aggregate([
        { $match: { tenant: req.user.tenant, status: { $ne: 'cancelled' } } },
        { $group: { _id: '$customer', total: { $sum: '$totalAmount' }, balance: { $sum: '$balanceDue' } } },
        {
          $lookup: {
            from: 'customers',
            localField: '_id',
            foreignField: '_id',
            as: 'customer',
          },
        },
        { $unwind: '$customer' },
        { $project: { customerName: '$customer.name', total: 1, balance: 1 } },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]),
      Invoice.aggregate([
        { $match: { ...matchQuery, status: 'paid' } },
        {
          $group: {
            _id: { year: { $year: '$invoiceDate' }, month: { $month: '$invoiceDate' } },
            revenue: { $sum: '$totalAmount' },
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
        overdue: overdueStats[0] || { count: 0, total: 0 },
        topCustomers: customerStats,
        monthlyRevenue,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
