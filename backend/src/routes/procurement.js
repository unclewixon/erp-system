import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import {
  ProcurementCategory,
  PurchaseRequisition,
  RFQ,
  GoodsReceiptNote,
  VendorEvaluation,
  VendorContract,
  VendorPriceList,
} from '../models/Procurement.js';
import { PurchaseOrder, Vendor } from '../models/Bill.js';

const router = express.Router();

router.use(protect);
router.use(tenantGuard);

// ============ PROCUREMENT CATEGORIES ============

router.get('/categories', async (req, res) => {
  try {
    const categories = await ProcurementCategory.find({
      tenant: req.user.tenant,
      isActive: true,
    })
      .populate('parentCategory', 'name code')
      .sort({ code: 1 });

    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/categories', authorize('super_admin', 'tenant_admin', 'procurement_manager'), async (req, res) => {
  try {
    const category = await ProcurementCategory.create({
      ...req.body,
      tenant: req.user.tenant,
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/categories/:id', authorize('super_admin', 'tenant_admin', 'procurement_manager'), async (req, res) => {
  try {
    const category = await ProcurementCategory.findOneAndUpdate(
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

// ============ PURCHASE REQUISITIONS ============

router.get('/requisitions', async (req, res) => {
  try {
    const { status, department, priority } = req.query;
    const query = { tenant: req.user.tenant };

    // Non-procurement users see only their own requisitions
    const isProcurement = ['super_admin', 'tenant_admin', 'procurement_manager', 'procurement_officer'].includes(req.user.role);
    if (!isProcurement) {
      query.requestedBy = req.user._id;
    }

    if (status) query.status = status;
    if (department) query.department = department;
    if (priority) query.priority = priority;

    const requisitions = await PurchaseRequisition.find(query)
      .populate('department', 'name')
      .populate('requestedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requisitions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/requisitions/:id', async (req, res) => {
  try {
    const requisition = await PurchaseRequisition.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('department', 'name')
      .populate('requestedBy', 'firstName lastName email')
      .populate('items.category', 'name')
      .populate('items.preferredVendor', 'name')
      .populate('reviewedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .populate('linkedPurchaseOrder')
      .populate('linkedRFQ');

    if (!requisition) {
      return res.status(404).json({ success: false, message: 'Requisition not found' });
    }

    res.json({ success: true, data: requisition });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/requisitions', async (req, res) => {
  try {
    const requisition = await PurchaseRequisition.create({
      ...req.body,
      tenant: req.user.tenant,
      requestedBy: req.user._id,
    });

    res.status(201).json({ success: true, data: requisition });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/requisitions/:id', async (req, res) => {
  try {
    const requisition = await PurchaseRequisition.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: 'draft',
    });

    if (!requisition) {
      return res.status(404).json({ success: false, message: 'Requisition not found or cannot be edited' });
    }

    Object.assign(requisition, req.body);
    await requisition.save();

    res.json({ success: true, data: requisition });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/requisitions/:id/submit', async (req, res) => {
  try {
    const requisition = await PurchaseRequisition.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: 'draft' },
      {
        status: 'submitted',
        submittedAt: new Date(),
      },
      { new: true }
    );

    if (!requisition) {
      return res.status(404).json({ success: false, message: 'Requisition not found' });
    }

    res.json({ success: true, data: requisition });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/requisitions/:id/approve', authorize('super_admin', 'tenant_admin', 'procurement_manager', 'hr_manager'), async (req, res) => {
  try {
    const requisition = await PurchaseRequisition.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: { $in: ['submitted', 'under_review'] } },
      {
        status: 'approved',
        approvedBy: req.user._id,
        approvedAt: new Date(),
      },
      { new: true }
    );

    if (!requisition) {
      return res.status(404).json({ success: false, message: 'Requisition not found' });
    }

    res.json({ success: true, data: requisition });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/requisitions/:id/reject', authorize('super_admin', 'tenant_admin', 'procurement_manager', 'hr_manager'), async (req, res) => {
  try {
    const requisition = await PurchaseRequisition.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: { $in: ['submitted', 'under_review'] } },
      {
        status: 'rejected',
        rejectionReason: req.body.reason,
      },
      { new: true }
    );

    if (!requisition) {
      return res.status(404).json({ success: false, message: 'Requisition not found' });
    }

    res.json({ success: true, data: requisition });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Convert requisition to PO
router.post('/requisitions/:id/convert-to-po', authorize('super_admin', 'tenant_admin', 'procurement_manager'), async (req, res) => {
  try {
    const requisition = await PurchaseRequisition.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: 'approved',
    });

    if (!requisition) {
      return res.status(404).json({ success: false, message: 'Approved requisition not found' });
    }

    const poItems = requisition.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.estimatedUnitPrice || 0,
      amount: item.estimatedAmount || 0,
      deliveryDate: item.requiredDate,
    }));

    const purchaseOrder = await PurchaseOrder.create({
      tenant: req.user.tenant,
      vendor: req.body.vendorId,
      department: requisition.department,
      items: poItems,
      subtotal: requisition.totalEstimatedAmount,
      totalAmount: requisition.totalEstimatedAmount,
      orderDate: new Date(),
      expectedDelivery: requisition.requiredDate,
      status: 'draft',
      createdBy: req.user._id,
    });

    requisition.status = 'converted';
    requisition.linkedPurchaseOrder = purchaseOrder._id;
    await requisition.save();

    res.json({ success: true, data: { requisition, purchaseOrder } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ REQUEST FOR QUOTATION (RFQ) ============

router.get('/rfqs', authorize('super_admin', 'tenant_admin', 'procurement_manager', 'procurement_officer'), async (req, res) => {
  try {
    const { status } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;

    const rfqs = await RFQ.find(query)
      .populate('requisition', 'requisitionNumber title')
      .populate('vendors.vendor', 'name')
      .populate('selectedVendor', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: rfqs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/rfqs/:id', async (req, res) => {
  try {
    const rfq = await RFQ.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('requisition')
      .populate('items.category', 'name')
      .populate('vendors.vendor')
      .populate('selectedVendor')
      .populate('linkedPurchaseOrder')
      .populate('createdBy', 'firstName lastName');

    if (!rfq) {
      return res.status(404).json({ success: false, message: 'RFQ not found' });
    }

    res.json({ success: true, data: rfq });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/rfqs', authorize('super_admin', 'tenant_admin', 'procurement_manager'), async (req, res) => {
  try {
    const rfq = await RFQ.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    // Link to requisition if provided
    if (req.body.requisitionId) {
      await PurchaseRequisition.findByIdAndUpdate(req.body.requisitionId, {
        linkedRFQ: rfq._id,
      });
    }

    res.status(201).json({ success: true, data: rfq });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/rfqs/:id/publish', authorize('super_admin', 'tenant_admin', 'procurement_manager'), async (req, res) => {
  try {
    const rfq = await RFQ.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: 'draft' },
      {
        status: 'published',
        publishedAt: new Date(),
      },
      { new: true }
    );

    if (!rfq) {
      return res.status(404).json({ success: false, message: 'RFQ not found' });
    }

    // TODO: Send invitations to vendors

    res.json({ success: true, data: rfq });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/rfqs/:id/vendors/:vendorId/respond', async (req, res) => {
  try {
    const rfq = await RFQ.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: 'published',
    });

    if (!rfq) {
      return res.status(404).json({ success: false, message: 'RFQ not found' });
    }

    const vendorResponse = rfq.vendors.find(v => v.vendor.toString() === req.params.vendorId);
    if (!vendorResponse) {
      return res.status(404).json({ success: false, message: 'Vendor not invited to this RFQ' });
    }

    vendorResponse.status = 'responded';
    vendorResponse.respondedAt = new Date();
    vendorResponse.quotation = req.body.quotation;

    await rfq.save();

    res.json({ success: true, data: rfq });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/rfqs/:id/award', authorize('super_admin', 'tenant_admin', 'procurement_manager'), async (req, res) => {
  try {
    const rfq = await RFQ.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: { $in: ['closed', 'evaluated'] },
    });

    if (!rfq) {
      return res.status(404).json({ success: false, message: 'RFQ not found' });
    }

    const selectedVendorResponse = rfq.vendors.find(v => v.vendor.toString() === req.body.vendorId);
    if (!selectedVendorResponse) {
      return res.status(404).json({ success: false, message: 'Vendor not found in RFQ' });
    }

    selectedVendorResponse.status = 'selected';
    rfq.selectedVendor = req.body.vendorId;
    rfq.status = 'awarded';

    // Mark other vendors as rejected
    rfq.vendors.forEach(v => {
      if (v.vendor.toString() !== req.body.vendorId && v.status === 'responded') {
        v.status = 'rejected';
      }
    });

    await rfq.save();

    res.json({ success: true, data: rfq });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ GOODS RECEIPT NOTE (GRN) ============

router.get('/grns', authorize('super_admin', 'tenant_admin', 'procurement_manager', 'procurement_officer', 'store_keeper'), async (req, res) => {
  try {
    const { status, vendor, purchaseOrder } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (vendor) query.vendor = vendor;
    if (purchaseOrder) query.purchaseOrder = purchaseOrder;

    const grns = await GoodsReceiptNote.find(query)
      .populate('purchaseOrder', 'poNumber')
      .populate('vendor', 'name')
      .populate('receivedBy', 'firstName lastName')
      .sort({ receivedDate: -1 });

    res.json({ success: true, data: grns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/grns/:id', async (req, res) => {
  try {
    const grn = await GoodsReceiptNote.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('purchaseOrder')
      .populate('vendor')
      .populate('receivedBy', 'firstName lastName')
      .populate('inspectedBy', 'firstName lastName');

    if (!grn) {
      return res.status(404).json({ success: false, message: 'GRN not found' });
    }

    res.json({ success: true, data: grn });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/grns', authorize('super_admin', 'tenant_admin', 'procurement_manager', 'procurement_officer', 'store_keeper'), async (req, res) => {
  try {
    const grn = await GoodsReceiptNote.create({
      ...req.body,
      tenant: req.user.tenant,
      receivedBy: req.user._id,
    });

    // Update PO status
    const po = await PurchaseOrder.findById(req.body.purchaseOrder);
    if (po) {
      const allReceived = po.items.every((item, idx) => {
        const grnItem = grn.items.find(g => g.poItemIndex === idx);
        const totalReceived = (item.receivedQuantity || 0) + (grnItem?.receivedQuantity || 0);
        return totalReceived >= item.quantity;
      });

      po.status = allReceived ? 'received' : 'partial_received';
      await po.save();
    }

    res.status(201).json({ success: true, data: grn });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/grns/:id/inspect', authorize('super_admin', 'tenant_admin', 'procurement_manager', 'quality_inspector'), async (req, res) => {
  try {
    const grn = await GoodsReceiptNote.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: 'pending_inspection' },
      {
        status: req.body.accepted ? 'accepted' : 'rejected',
        inspectedBy: req.user._id,
        inspectedAt: new Date(),
        inspectionNotes: req.body.notes,
      },
      { new: true }
    );

    if (!grn) {
      return res.status(404).json({ success: false, message: 'GRN not found' });
    }

    res.json({ success: true, data: grn });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ VENDOR EVALUATIONS ============

router.get('/evaluations', authorize('super_admin', 'tenant_admin', 'procurement_manager'), async (req, res) => {
  try {
    const { vendor } = req.query;
    const query = { tenant: req.user.tenant };

    if (vendor) query.vendor = vendor;

    const evaluations = await VendorEvaluation.find(query)
      .populate('vendor', 'name code')
      .populate('purchaseOrder', 'poNumber')
      .populate('evaluatedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: evaluations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/evaluations', authorize('super_admin', 'tenant_admin', 'procurement_manager', 'procurement_officer'), async (req, res) => {
  try {
    const evaluation = await VendorEvaluation.create({
      ...req.body,
      tenant: req.user.tenant,
      evaluatedBy: req.user._id,
    });

    // Update vendor's average rating
    const allEvaluations = await VendorEvaluation.find({
      tenant: req.user.tenant,
      vendor: req.body.vendor,
      status: { $in: ['submitted', 'reviewed'] },
    });

    if (allEvaluations.length > 0) {
      const avgScore = allEvaluations.reduce((sum, e) => sum + (e.overallScore || 0), 0) / allEvaluations.length;
      await Vendor.findByIdAndUpdate(req.body.vendor, {
        'performance.rating': Math.round(avgScore * 100) / 100,
        'performance.evaluationCount': allEvaluations.length,
      });
    }

    res.status(201).json({ success: true, data: evaluation });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ VENDOR CONTRACTS ============

router.get('/contracts', authorize('super_admin', 'tenant_admin', 'procurement_manager', 'finance_manager'), async (req, res) => {
  try {
    const { vendor, status, type } = req.query;
    const query = { tenant: req.user.tenant };

    if (vendor) query.vendor = vendor;
    if (status) query.status = status;
    if (type) query.type = type;

    const contracts = await VendorContract.find(query)
      .populate('vendor', 'name code')
      .populate('approvedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ endDate: 1 });

    res.json({ success: true, data: contracts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/contracts/:id', async (req, res) => {
  try {
    const contract = await VendorContract.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('vendor')
      .populate('approvedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    res.json({ success: true, data: contract });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/contracts', authorize('super_admin', 'tenant_admin', 'procurement_manager'), async (req, res) => {
  try {
    const contract = await VendorContract.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: contract });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/contracts/:id/approve', authorize('super_admin', 'tenant_admin'), async (req, res) => {
  try {
    const contract = await VendorContract.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: 'pending_approval' },
      {
        status: 'active',
        approvedBy: req.user._id,
        approvedAt: new Date(),
      },
      { new: true }
    );

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    res.json({ success: true, data: contract });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ VENDOR PRICE LISTS ============

router.get('/price-lists', authorize('super_admin', 'tenant_admin', 'procurement_manager', 'procurement_officer'), async (req, res) => {
  try {
    const { vendor, status } = req.query;
    const query = { tenant: req.user.tenant };

    if (vendor) query.vendor = vendor;
    if (status) query.status = status;

    const priceLists = await VendorPriceList.find(query)
      .populate('vendor', 'name code')
      .populate('createdBy', 'firstName lastName')
      .sort({ effectiveDate: -1 });

    res.json({ success: true, data: priceLists });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/price-lists', authorize('super_admin', 'tenant_admin', 'procurement_manager'), async (req, res) => {
  try {
    const priceList = await VendorPriceList.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: priceList });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ STATS ============

router.get('/stats/summary', authorize('super_admin', 'tenant_admin', 'procurement_manager'), async (req, res) => {
  try {
    const [requisitionStats, rfqStats, poStats, contractStats, vendorCount] = await Promise.all([
      PurchaseRequisition.aggregate([
        { $match: { tenant: req.user.tenant } },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$totalEstimatedAmount' } } },
      ]),
      RFQ.aggregate([
        { $match: { tenant: req.user.tenant } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      PurchaseOrder.aggregate([
        { $match: { tenant: req.user.tenant } },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$totalAmount' } } },
      ]),
      VendorContract.aggregate([
        { $match: { tenant: req.user.tenant, status: 'active' } },
        { $group: { _id: null, count: { $sum: 1 }, totalValue: { $sum: '$value' } } },
      ]),
      Vendor.countDocuments({ tenant: req.user.tenant, isActive: true }),
    ]);

    // Expiring contracts (next 30 days)
    const expiringContracts = await VendorContract.find({
      tenant: req.user.tenant,
      status: 'active',
      endDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })
      .populate('vendor', 'name')
      .select('contractNumber title vendor endDate');

    res.json({
      success: true,
      data: {
        requisitions: requisitionStats,
        rfqs: rfqStats,
        purchaseOrders: poStats,
        activeContracts: contractStats[0] || { count: 0, totalValue: 0 },
        vendorCount,
        expiringContracts,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
