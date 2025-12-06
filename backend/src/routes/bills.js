import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import { Vendor, Bill, PurchaseOrder } from '../models/Bill.js';

const router = express.Router();

router.use(protect);
router.use(tenantGuard);

// ============ VENDORS ============

router.get('/vendors', async (req, res) => {
  try {
    const vendors = await Vendor.find({
      tenant: req.user.tenant,
      isActive: true,
    }).sort({ name: 1 });

    res.json({ success: true, data: vendors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/vendors/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    res.json({ success: true, data: vendor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/vendors', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const vendor = await Vendor.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/vendors/:id', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const vendor = await Vendor.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    res.json({ success: true, data: vendor });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ BILLS ============

router.get('/', authorize('super_admin', 'tenant_admin', 'finance_manager', 'finance_officer'), async (req, res) => {
  try {
    const { status, vendor, startDate, endDate } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (vendor) query.vendor = vendor;
    if (startDate || endDate) {
      query.billDate = {};
      if (startDate) query.billDate.$gte = new Date(startDate);
      if (endDate) query.billDate.$lte = new Date(endDate);
    }

    const bills = await Bill.find(query)
      .populate('vendor', 'name code')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: bills });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('vendor')
      .populate('approvedBy', 'firstName lastName')
      .populate('payments.paidBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    res.json({ success: true, data: bill });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', authorize('super_admin', 'tenant_admin', 'finance_manager', 'finance_officer'), async (req, res) => {
  try {
    const bill = await Bill.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: bill });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/:id', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: { $in: ['draft', 'pending'] },
    });

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found or cannot be edited' });
    }

    Object.assign(bill, req.body);
    await bill.save();

    res.json({ success: true, data: bill });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/:id/approve', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const bill = await Bill.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: { $in: ['draft', 'pending'] } },
      {
        status: 'approved',
        approvedBy: req.user._id,
        approvedAt: new Date(),
      },
      { new: true }
    );

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    res.json({ success: true, data: bill });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/:id/payments', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: { $in: ['approved', 'partial'] },
    });

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found or not approved' });
    }

    bill.payments.push({
      amount: req.body.amount,
      paymentDate: req.body.paymentDate || new Date(),
      paymentMethod: req.body.paymentMethod,
      reference: req.body.reference,
      notes: req.body.notes,
      paidBy: req.user._id,
    });

    await bill.save();

    res.json({ success: true, data: bill });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ PURCHASE ORDERS ============

router.get('/purchase-orders', authorize('super_admin', 'tenant_admin', 'finance_manager', 'finance_officer'), async (req, res) => {
  try {
    const { status, vendor } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (vendor) query.vendor = vendor;

    const orders = await PurchaseOrder.find(query)
      .populate('vendor', 'name code')
      .populate('department', 'name')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/purchase-orders/:id', async (req, res) => {
  try {
    const order = await PurchaseOrder.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('vendor')
      .populate('department', 'name')
      .populate('approvedBy', 'firstName lastName')
      .populate('linkedBill')
      .populate('createdBy', 'firstName lastName');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/purchase-orders', authorize('super_admin', 'tenant_admin', 'finance_manager', 'finance_officer'), async (req, res) => {
  try {
    const order = await PurchaseOrder.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/purchase-orders/:id/approve', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const order = await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: 'pending_approval' },
      {
        status: 'approved',
        approvedBy: req.user._id,
        approvedAt: new Date(),
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/purchase-orders/:id/receive', authorize('super_admin', 'tenant_admin', 'finance_manager', 'finance_officer'), async (req, res) => {
  try {
    const order = await PurchaseOrder.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: { $in: ['approved', 'sent', 'partial_received'] },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    order.receivedItems.push({
      itemIndex: req.body.itemIndex,
      quantityReceived: req.body.quantity,
      receivedDate: new Date(),
      receivedBy: req.user._id,
      notes: req.body.notes,
    });

    // Check if all items received
    const allReceived = order.items.every((item, idx) => {
      const received = order.receivedItems
        .filter(r => r.itemIndex === idx)
        .reduce((sum, r) => sum + r.quantityReceived, 0);
      return received >= item.quantity;
    });

    order.status = allReceived ? 'received' : 'partial_received';
    await order.save();

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/stats/summary', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const [billStats, overdueStats, vendorStats] = await Promise.all([
      Bill.aggregate([
        { $match: { tenant: req.user.tenant } },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$totalAmount' } } },
      ]),
      Bill.aggregate([
        {
          $match: {
            tenant: req.user.tenant,
            status: { $in: ['pending', 'approved', 'partial'] },
            dueDate: { $lt: new Date() },
          },
        },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$balanceDue' } } },
      ]),
      Bill.aggregate([
        { $match: { tenant: req.user.tenant, status: { $ne: 'cancelled' } } },
        { $group: { _id: '$vendor', total: { $sum: '$totalAmount' }, balance: { $sum: '$balanceDue' } } },
        {
          $lookup: {
            from: 'vendors',
            localField: '_id',
            foreignField: '_id',
            as: 'vendor',
          },
        },
        { $unwind: '$vendor' },
        { $project: { vendorName: '$vendor.name', total: 1, balance: 1 } },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        byStatus: billStats,
        overdue: overdueStats[0] || { count: 0, total: 0 },
        topVendors: vendorStats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
