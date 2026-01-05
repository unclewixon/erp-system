import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import {
  AssetCategory,
  Asset,
  DepreciationSchedule,
  AssetMaintenance,
  AssetTransfer,
  AssetDisposal,
  AssetAudit,
  AssetCheckout,
} from '../models/Asset.js';
import { AuditLog } from '../models/AuditLog.js';

const router = express.Router();

router.use(protect);
router.use(tenantGuard);

// Helper function to create audit log
const createAssetAuditLog = async (req, action, asset, changes = {}, assetDetails = {}) => {
  try {
    await AuditLog.log({
      tenant: req.user.tenant,
      action,
      entityType: 'asset',
      entityId: asset._id,
      entityNumber: asset.assetNumber,
      entityName: asset.name,
      user: req.user._id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userEmail: req.user.email,
      userRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      changes,
      metadata: { module: 'assets' },
      assetDetails,
    });
  } catch (error) {
    console.error('Asset audit log error:', error);
  }
};

// ============ ASSET CATEGORIES ============

router.get('/categories', async (req, res) => {
  try {
    // Super Admin has no tenant - return empty array
    if (!req.user.tenant) {
      return res.json({ success: true, data: [] });
    }

    const categories = await AssetCategory.find({
      tenant: req.user.tenant,
      isActive: true,
    })
      .populate('parentCategory', 'name code')
      .sort({ name: 1 });

    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/categories', authorize('super_admin', 'tenant_admin', 'asset_manager', 'finance_manager'), async (req, res) => {
  try {
    const category = await AssetCategory.create({
      ...req.body,
      tenant: req.user.tenant,
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/categories/:id', authorize('super_admin', 'tenant_admin', 'asset_manager', 'finance_manager'), async (req, res) => {
  try {
    const category = await AssetCategory.findOneAndUpdate(
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

// ============ ASSETS ============

router.get('/', authorize('super_admin', 'tenant_admin', 'asset_manager', 'finance_manager', 'hr_manager'), async (req, res) => {
  try {
    // Super Admin has no tenant - return empty array
    if (!req.user.tenant) {
      return res.json({ success: true, data: [] });
    }

    const { category, status, department, branch, assignedTo, search } = req.query;
    const query = { tenant: req.user.tenant };

    if (category) query.category = category;
    if (status) query.status = status;
    if (department) query.department = department;
    if (branch) query.branch = branch;
    if (assignedTo) query.assignedTo = assignedTo;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { assetNumber: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
      ];
    }

    const assets = await Asset.find(query)
      .populate('category', 'name code')
      .populate('department', 'name')
      .populate('branch', 'name')
      .populate('assignedTo', 'firstName lastName employeeId')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: assets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/summary', authorize('super_admin', 'tenant_admin', 'asset_manager', 'finance_manager'), async (req, res) => {
  try {
    // Super Admin has no tenant - return empty summary
    if (!req.user.tenant) {
      return res.json({
        success: true,
        data: {
          byStatus: [],
          byCategory: [],
          byDepartment: [],
          totals: { totalCost: 0, totalBookValue: 0, totalDepreciation: 0 },
          maintenanceDue: 0,
          warrantyExpiring: 0,
        },
      });
    }

    const [
      statusSummary,
      categorySummary,
      departmentSummary,
      depreciationSummary,
      maintenanceDue,
      warrantyExpiring,
    ] = await Promise.all([
      // By status
      Asset.aggregate([
        { $match: { tenant: req.user.tenant } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$totalCost' },
            bookValue: { $sum: '$bookValue' },
          },
        },
      ]),

      // By category
      Asset.aggregate([
        { $match: { tenant: req.user.tenant, status: { $ne: 'disposed' } } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalValue: { $sum: '$totalCost' },
            bookValue: { $sum: '$bookValue' },
          },
        },
        {
          $lookup: {
            from: 'assetcategories',
            localField: '_id',
            foreignField: '_id',
            as: 'categoryInfo',
          },
        },
        { $unwind: '$categoryInfo' },
        {
          $project: {
            categoryName: '$categoryInfo.name',
            count: 1,
            totalValue: 1,
            bookValue: 1,
          },
        },
      ]),

      // By department
      Asset.aggregate([
        { $match: { tenant: req.user.tenant, status: { $ne: 'disposed' } } },
        {
          $group: {
            _id: '$department',
            count: { $sum: 1 },
            totalValue: { $sum: '$totalCost' },
            bookValue: { $sum: '$bookValue' },
          },
        },
        {
          $lookup: {
            from: 'departments',
            localField: '_id',
            foreignField: '_id',
            as: 'deptInfo',
          },
        },
        { $unwind: { path: '$deptInfo', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            departmentName: { $ifNull: ['$deptInfo.name', 'Unassigned'] },
            count: 1,
            totalValue: 1,
            bookValue: 1,
          },
        },
      ]),

      // Total depreciation
      Asset.aggregate([
        { $match: { tenant: req.user.tenant, status: { $ne: 'disposed' } } },
        {
          $group: {
            _id: null,
            totalCost: { $sum: '$totalCost' },
            totalBookValue: { $sum: '$bookValue' },
            totalDepreciation: { $sum: '$accumulatedDepreciation' },
          },
        },
      ]),

      // Maintenance due (next 30 days)
      Asset.countDocuments({
        tenant: req.user.tenant,
        status: 'active',
        nextMaintenanceDate: {
          $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          $gte: new Date(),
        },
      }),

      // Warranty expiring (next 60 days)
      Asset.countDocuments({
        tenant: req.user.tenant,
        status: 'active',
        warrantyEndDate: {
          $lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          $gte: new Date(),
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        byStatus: statusSummary,
        byCategory: categorySummary,
        byDepartment: departmentSummary,
        totals: depreciationSummary[0] || { totalCost: 0, totalBookValue: 0, totalDepreciation: 0 },
        maintenanceDue,
        warrantyExpiring,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const asset = await Asset.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('category', 'name code depreciationMethod')
      .populate('department', 'name')
      .populate('branch', 'name')
      .populate('assignedTo', 'firstName lastName employeeId email')
      .populate('custodian', 'firstName lastName employeeId')
      .populate('vendor', 'name')
      .populate('createdBy', 'firstName lastName');

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    // Get related data
    const [maintenanceHistory, transferHistory, depreciationSchedule] = await Promise.all([
      AssetMaintenance.find({ asset: asset._id }).sort({ scheduledDate: -1 }).limit(10),
      AssetTransfer.find({ asset: asset._id }).sort({ transferDate: -1 }).limit(10),
      DepreciationSchedule.find({ asset: asset._id }).sort({ period: 1 }),
    ]);

    res.json({
      success: true,
      data: {
        ...asset.toObject(),
        maintenanceHistory,
        transferHistory,
        depreciationSchedule,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', authorize('super_admin', 'tenant_admin', 'asset_manager', 'finance_manager'), async (req, res) => {
  try {
    const asset = await Asset.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    // Generate depreciation schedule if applicable
    if (asset.depreciationMethod !== 'none' && asset.usefulLifeMonths > 0) {
      await generateDepreciationSchedule(asset);
    }

    await createAssetAuditLog(req, 'asset_acquire', asset, { after: asset.toObject() }, {
      newValue: asset.totalCost,
    });

    const populated = await Asset.findById(asset._id)
      .populate('category', 'name code')
      .populate('department', 'name');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/:id', authorize('super_admin', 'tenant_admin', 'asset_manager', 'finance_manager'), async (req, res) => {
  try {
    const before = await Asset.findOne({ _id: req.params.id, tenant: req.user.tenant });
    if (!before) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    const asset = await Asset.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    await createAssetAuditLog(req, 'update', asset, {
      before: before.toObject(),
      after: asset.toObject(),
    });

    res.json({ success: true, data: asset });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ DEPRECIATION ============

async function generateDepreciationSchedule(asset) {
  const schedules = [];
  let currentBookValue = asset.totalCost;
  const monthlyDepreciation = asset.depreciationMethod === 'straight_line'
    ? (asset.totalCost - asset.salvageValue) / asset.usefulLifeMonths
    : 0;

  const decliningRate = asset.depreciationMethod === 'declining_balance'
    ? (1 / asset.usefulLifeMonths) * 12
    : asset.depreciationMethod === 'double_declining'
      ? (2 / asset.usefulLifeMonths) * 12
      : 0;

  const startDate = asset.depreciationStartDate || asset.acquisitionDate;

  for (let period = 1; period <= asset.usefulLifeMonths; period++) {
    const periodDate = new Date(startDate);
    periodDate.setMonth(periodDate.getMonth() + period - 1);

    let depreciationAmount = 0;

    switch (asset.depreciationMethod) {
      case 'straight_line':
        depreciationAmount = monthlyDepreciation;
        break;
      case 'declining_balance':
      case 'double_declining':
        depreciationAmount = (currentBookValue * decliningRate) / 12;
        break;
      case 'sum_of_years':
        const remainingLife = asset.usefulLifeMonths - period + 1;
        const sumOfYears = (asset.usefulLifeMonths * (asset.usefulLifeMonths + 1)) / 2;
        depreciationAmount = ((asset.totalCost - asset.salvageValue) * remainingLife) / sumOfYears / 12;
        break;
    }

    // Ensure book value doesn't go below salvage value
    if (currentBookValue - depreciationAmount < asset.salvageValue) {
      depreciationAmount = currentBookValue - asset.salvageValue;
    }

    if (depreciationAmount <= 0) break;

    const accumulatedDep = asset.totalCost - currentBookValue + depreciationAmount;
    const closingBookValue = currentBookValue - depreciationAmount;

    schedules.push({
      tenant: asset.tenant,
      asset: asset._id,
      period,
      year: periodDate.getFullYear(),
      month: periodDate.getMonth() + 1,
      openingBookValue: currentBookValue,
      depreciationAmount,
      accumulatedDepreciation: accumulatedDep,
      closingBookValue,
      status: 'scheduled',
    });

    currentBookValue = closingBookValue;
  }

  if (schedules.length > 0) {
    await DepreciationSchedule.insertMany(schedules);
  }
}

router.get('/:id/depreciation', async (req, res) => {
  try {
    const schedules = await DepreciationSchedule.find({
      asset: req.params.id,
      tenant: req.user.tenant,
    }).sort({ period: 1 });

    res.json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/depreciation/run', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const { year, month } = req.body;

    // Find all scheduled depreciation for this period
    const schedules = await DepreciationSchedule.find({
      tenant: req.user.tenant,
      year,
      month,
      status: 'scheduled',
    }).populate('asset');

    let processed = 0;
    let totalDepreciation = 0;

    for (const schedule of schedules) {
      // Update asset
      const asset = schedule.asset;
      const previousValue = asset.bookValue;

      asset.accumulatedDepreciation += schedule.depreciationAmount;
      asset.bookValue = asset.totalCost - asset.accumulatedDepreciation;
      asset.lastDepreciationDate = new Date();
      await asset.save();

      // Mark schedule as posted
      schedule.status = 'posted';
      schedule.postedAt = new Date();
      schedule.postedBy = req.user._id;
      await schedule.save();

      await createAssetAuditLog(req, 'asset_depreciate', asset, {}, {
        previousValue,
        newValue: asset.bookValue,
        depreciationAmount: schedule.depreciationAmount,
      });

      processed++;
      totalDepreciation += schedule.depreciationAmount;
    }

    res.json({
      success: true,
      data: {
        processed,
        totalDepreciation,
        period: `${year}-${String(month).padStart(2, '0')}`,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ MAINTENANCE ============

router.get('/maintenance/list', authorize('super_admin', 'tenant_admin', 'asset_manager', 'maintenance_manager'), async (req, res) => {
  try {
    const { status, type, asset, startDate, endDate, priority } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (type) query.type = type;
    if (asset) query.asset = asset;
    if (priority) query.priority = priority;
    if (startDate || endDate) {
      query.scheduledDate = {};
      if (startDate) query.scheduledDate.$gte = new Date(startDate);
      if (endDate) query.scheduledDate.$lte = new Date(endDate);
    }

    const maintenances = await AssetMaintenance.find(query)
      .populate('asset', 'name assetNumber')
      .populate('assignedTo', 'firstName lastName')
      .populate('vendor', 'name')
      .sort({ scheduledDate: 1 });

    res.json({ success: true, data: maintenances });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/maintenance', authorize('super_admin', 'tenant_admin', 'asset_manager', 'maintenance_manager'), async (req, res) => {
  try {
    const maintenance = await AssetMaintenance.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    // Update asset status if in progress
    if (req.body.status === 'in_progress') {
      await Asset.findByIdAndUpdate(req.body.asset, { status: 'in_maintenance' });
    }

    const asset = await Asset.findById(req.body.asset);
    await createAssetAuditLog(req, 'asset_maintain', asset, { after: maintenance.toObject() });

    res.status(201).json({ success: true, data: maintenance });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/maintenance/:id', authorize('super_admin', 'tenant_admin', 'asset_manager', 'maintenance_manager'), async (req, res) => {
  try {
    const maintenance = await AssetMaintenance.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    if (!maintenance) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }

    // Update asset if maintenance completed
    if (req.body.status === 'completed') {
      const updateData = {
        status: 'active',
        lastMaintenanceDate: maintenance.actualEndDate || new Date(),
        condition: maintenance.conditionAfter || undefined,
      };

      if (maintenance.nextMaintenanceDate) {
        updateData.nextMaintenanceDate = maintenance.nextMaintenanceDate;
      }

      await Asset.findByIdAndUpdate(maintenance.asset, updateData);
    }

    res.json({ success: true, data: maintenance });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ TRANSFERS ============

router.get('/transfers', authorize('super_admin', 'tenant_admin', 'asset_manager', 'hr_manager'), async (req, res) => {
  try {
    const { status, asset } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (asset) query.asset = asset;

    const transfers = await AssetTransfer.find(query)
      .populate('asset', 'name assetNumber')
      .populate('fromDepartment', 'name')
      .populate('toDepartment', 'name')
      .populate('fromCustodian', 'firstName lastName')
      .populate('toCustodian', 'firstName lastName')
      .populate('requestedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: transfers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/transfers', authorize('super_admin', 'tenant_admin', 'asset_manager', 'hr_manager'), async (req, res) => {
  try {
    const asset = await Asset.findOne({ _id: req.body.asset, tenant: req.user.tenant });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    const transfer = await AssetTransfer.create({
      ...req.body,
      tenant: req.user.tenant,
      fromBranch: asset.branch,
      fromDepartment: asset.department,
      fromLocation: asset.location,
      fromCustodian: asset.custodian,
      requestedBy: req.user._id,
      createdBy: req.user._id,
    });

    await createAssetAuditLog(req, 'asset_transfer', asset, { after: transfer.toObject() }, {
      previousLocation: asset.location,
      newLocation: req.body.toLocation,
    });

    res.status(201).json({ success: true, data: transfer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/transfers/:id/approve', authorize('super_admin', 'tenant_admin', 'asset_manager'), async (req, res) => {
  try {
    const transfer = await AssetTransfer.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: 'pending' },
      {
        status: 'approved',
        approvedBy: req.user._id,
        approvedAt: new Date(),
      },
      { new: true }
    );

    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transfer not found' });
    }

    res.json({ success: true, data: transfer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/transfers/:id/complete', authorize('super_admin', 'tenant_admin', 'asset_manager'), async (req, res) => {
  try {
    const transfer = await AssetTransfer.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: { $in: ['approved', 'in_transit'] },
    });

    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transfer not found' });
    }

    // Update asset
    const asset = await Asset.findByIdAndUpdate(
      transfer.asset,
      {
        branch: transfer.toBranch,
        department: transfer.toDepartment,
        location: transfer.toLocation,
        custodian: transfer.toCustodian,
        assignedTo: transfer.toCustodian,
        assignedDate: new Date(),
      },
      { new: true }
    );

    transfer.status = 'completed';
    transfer.receivedBy = req.user._id;
    transfer.receivedAt = new Date();
    await transfer.save();

    await createAssetAuditLog(req, 'asset_transfer', asset, {}, {
      previousLocation: transfer.fromLocation,
      newLocation: transfer.toLocation,
      previousAssignee: transfer.fromCustodian,
      newAssignee: transfer.toCustodian,
    });

    res.json({ success: true, data: transfer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ DISPOSALS ============

router.get('/disposals', authorize('super_admin', 'tenant_admin', 'asset_manager', 'finance_manager'), async (req, res) => {
  try {
    const { status, method } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (method) query.method = method;

    const disposals = await AssetDisposal.find(query)
      .populate('asset', 'name assetNumber')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: disposals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/disposals', authorize('super_admin', 'tenant_admin', 'asset_manager', 'finance_manager'), async (req, res) => {
  try {
    const asset = await Asset.findOne({ _id: req.body.asset, tenant: req.user.tenant });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    const disposal = await AssetDisposal.create({
      ...req.body,
      tenant: req.user.tenant,
      bookValueAtDisposal: asset.bookValue,
      accumulatedDepreciationAtDisposal: asset.accumulatedDepreciation,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: disposal });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/disposals/:id/approve', authorize('super_admin', 'tenant_admin'), async (req, res) => {
  try {
    const disposal = await AssetDisposal.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: 'pending_approval',
    });

    if (!disposal) {
      return res.status(404).json({ success: false, message: 'Disposal not found' });
    }

    disposal.approvals.push({
      level: disposal.approvalLevel,
      approver: req.user._id,
      status: 'approved',
      comments: req.body.comments,
      approvedAt: new Date(),
    });

    disposal.status = 'approved';
    await disposal.save();

    res.json({ success: true, data: disposal });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/disposals/:id/complete', authorize('super_admin', 'tenant_admin', 'asset_manager'), async (req, res) => {
  try {
    const disposal = await AssetDisposal.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: 'approved',
    });

    if (!disposal) {
      return res.status(404).json({ success: false, message: 'Disposal not found or not approved' });
    }

    // Update asset status
    const asset = await Asset.findByIdAndUpdate(
      disposal.asset,
      {
        status: 'disposed',
        disposalDate: disposal.disposalDate || new Date(),
        disposalMethod: disposal.method,
        disposalValue: disposal.disposalValue,
        disposalReason: disposal.reason,
        disposalApprovedBy: req.user._id,
      },
      { new: true }
    );

    disposal.status = 'completed';
    disposal.disposalDate = new Date();
    await disposal.save();

    await createAssetAuditLog(req, 'asset_dispose', asset, {}, {
      previousValue: disposal.bookValueAtDisposal,
      newValue: 0,
    });

    res.json({ success: true, data: disposal });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ AUDITS ============

router.get('/audits', authorize('super_admin', 'tenant_admin', 'asset_manager', 'internal_auditor'), async (req, res) => {
  try {
    const { status, type } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (type) query.type = type;

    const audits = await AssetAudit.find(query)
      .populate('branch', 'name')
      .populate('department', 'name')
      .populate('leadAuditor', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: audits });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/audits', authorize('super_admin', 'tenant_admin', 'asset_manager', 'internal_auditor'), async (req, res) => {
  try {
    // Get assets for the audit scope
    const assetQuery = { tenant: req.user.tenant, status: { $ne: 'disposed' } };

    if (req.body.branch) assetQuery.branch = req.body.branch;
    if (req.body.department) assetQuery.department = req.body.department;
    if (req.body.categories && req.body.categories.length > 0) {
      assetQuery.category = { $in: req.body.categories };
    }

    const assets = await Asset.find(assetQuery).populate('custodian', 'firstName lastName');

    const items = assets.map(asset => ({
      asset: asset._id,
      expectedLocation: asset.location,
      expectedCondition: asset.condition,
      expectedCustodian: asset.custodian?._id,
      bookValue: asset.bookValue,
      status: 'pending',
    }));

    const audit = await AssetAudit.create({
      ...req.body,
      tenant: req.user.tenant,
      items,
      totalAssets: items.length,
      totalBookValue: items.reduce((sum, i) => sum + (i.bookValue || 0), 0),
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: audit });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/audits/:id/verify', authorize('super_admin', 'tenant_admin', 'asset_manager', 'internal_auditor'), async (req, res) => {
  try {
    const { itemId, found, actualLocation, actualCondition, actualCustodian, notes, photos } = req.body;

    const audit = await AssetAudit.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: { $in: ['planned', 'in_progress'] },
    });

    if (!audit) {
      return res.status(404).json({ success: false, message: 'Audit not found' });
    }

    const item = audit.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    item.found = found;
    item.actualLocation = actualLocation;
    item.actualCondition = found ? actualCondition : 'not_found';
    item.actualCustodian = actualCustodian;
    item.notes = notes;
    item.photos = photos;
    item.verifiedBy = req.user._id;
    item.verifiedAt = new Date();

    // Check for discrepancies
    if (!found) {
      item.hasDiscrepancy = true;
      item.discrepancyType = 'missing';
    } else if (
      actualLocation !== item.expectedLocation ||
      actualCondition !== item.expectedCondition ||
      actualCustodian?.toString() !== item.expectedCustodian?.toString()
    ) {
      item.hasDiscrepancy = true;
      if (actualLocation !== item.expectedLocation) item.discrepancyType = 'location';
      else if (actualCondition !== item.expectedCondition) item.discrepancyType = 'condition';
      else item.discrepancyType = 'custodian';
    }

    item.status = item.hasDiscrepancy ? 'discrepancy' : 'verified';

    if (audit.status === 'planned') {
      audit.status = 'in_progress';
      audit.actualStartDate = new Date();
    }

    await audit.save();

    res.json({ success: true, data: audit });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/audits/:id/complete', authorize('super_admin', 'tenant_admin', 'asset_manager'), async (req, res) => {
  try {
    const audit = await AssetAudit.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: 'in_progress',
    });

    if (!audit) {
      return res.status(404).json({ success: false, message: 'Audit not found' });
    }

    audit.status = 'completed';
    audit.actualEndDate = new Date();
    audit.findings = req.body.findings;
    audit.recommendations = req.body.recommendations;
    audit.approvedBy = req.user._id;
    audit.approvedAt = new Date();
    await audit.save();

    // Update assets with discrepancies
    for (const item of audit.items.filter(i => i.hasDiscrepancy && i.actualCondition !== 'not_found')) {
      await Asset.findByIdAndUpdate(item.asset, {
        location: item.actualLocation,
        condition: item.actualCondition,
        custodian: item.actualCustodian,
      });
    }

    res.json({ success: true, data: audit });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ CHECK-OUT / CHECK-IN ============

router.get('/checkouts', async (req, res) => {
  try {
    const { status, employee, asset } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (employee) query.checkedOutTo = employee;
    if (asset) query.asset = asset;

    const checkouts = await AssetCheckout.find(query)
      .populate('asset', 'name assetNumber')
      .populate('checkedOutTo', 'firstName lastName employeeId')
      .populate('checkedOutBy', 'firstName lastName')
      .sort({ checkoutDate: -1 });

    res.json({ success: true, data: checkouts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/checkouts', authorize('super_admin', 'tenant_admin', 'asset_manager', 'hr_manager'), async (req, res) => {
  try {
    const asset = await Asset.findOne({ _id: req.body.asset, tenant: req.user.tenant, status: 'active' });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found or not available' });
    }

    const checkout = await AssetCheckout.create({
      ...req.body,
      tenant: req.user.tenant,
      checkedOutBy: req.user._id,
      checkoutCondition: asset.condition,
      createdBy: req.user._id,
    });

    // Update asset
    asset.assignedTo = req.body.checkedOutTo;
    asset.assignedDate = new Date();
    await asset.save();

    await createAssetAuditLog(req, 'asset_checkout', asset, { after: checkout.toObject() }, {
      newAssignee: req.body.checkedOutTo,
    });

    res.status(201).json({ success: true, data: checkout });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/checkouts/:id/checkin', authorize('super_admin', 'tenant_admin', 'asset_manager', 'hr_manager'), async (req, res) => {
  try {
    const checkout = await AssetCheckout.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: 'checked_out',
    });

    if (!checkout) {
      return res.status(404).json({ success: false, message: 'Checkout not found' });
    }

    checkout.status = 'checked_in';
    checkout.checkedInBy = req.user._id;
    checkout.checkinDate = new Date();
    checkout.checkinCondition = req.body.condition;
    checkout.checkinNotes = req.body.notes;
    await checkout.save();

    // Update asset
    const asset = await Asset.findByIdAndUpdate(
      checkout.asset,
      {
        assignedTo: null,
        assignedDate: null,
        condition: req.body.condition,
      },
      { new: true }
    );

    await createAssetAuditLog(req, 'asset_checkin', asset, {}, {
      previousAssignee: checkout.checkedOutTo,
      newCondition: req.body.condition,
    });

    res.json({ success: true, data: checkout });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ REPORTS ============

router.get('/reports/register', authorize('super_admin', 'tenant_admin', 'asset_manager', 'finance_manager'), async (req, res) => {
  try {
    const { category, department, status } = req.query;
    const query = { tenant: req.user.tenant };

    if (category) query.category = category;
    if (department) query.department = department;
    if (status) query.status = status;

    const assets = await Asset.find(query)
      .populate('category', 'name code')
      .populate('department', 'name')
      .populate('branch', 'name')
      .populate('assignedTo', 'firstName lastName employeeId')
      .sort({ assetNumber: 1 });

    const summary = {
      totalAssets: assets.length,
      totalCost: assets.reduce((sum, a) => sum + a.totalCost, 0),
      totalBookValue: assets.reduce((sum, a) => sum + a.bookValue, 0),
      totalDepreciation: assets.reduce((sum, a) => sum + a.accumulatedDepreciation, 0),
    };

    res.json({ success: true, data: { assets, summary } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/reports/depreciation', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const schedules = await DepreciationSchedule.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          year: parseInt(currentYear),
        },
      },
      {
        $group: {
          _id: { month: '$month', status: '$status' },
          totalDepreciation: { $sum: '$depreciationAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    const yearly = await DepreciationSchedule.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          year: parseInt(currentYear),
        },
      },
      {
        $group: {
          _id: null,
          totalDepreciation: { $sum: '$depreciationAmount' },
          scheduled: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, '$depreciationAmount', 0] } },
          posted: { $sum: { $cond: [{ $eq: ['$status', 'posted'] }, '$depreciationAmount', 0] } },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        byMonth: schedules,
        yearly: yearly[0] || { totalDepreciation: 0, scheduled: 0, posted: 0 },
        year: parseInt(currentYear),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
