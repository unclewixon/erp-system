import mongoose from 'mongoose';

// ============ ASSET CATEGORY ============
const assetCategorySchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  code: { type: String, required: true },
  name: { type: String, required: true },
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'AssetCategory' },
  description: String,

  // Default depreciation settings
  depreciationMethod: { type: String, enum: ['straight_line', 'declining_balance', 'double_declining', 'sum_of_years', 'units_of_production'], default: 'straight_line' },
  defaultUsefulLife: { type: Number, default: 60 }, // months
  defaultSalvageValuePercent: { type: Number, default: 10 },

  // Accounting
  assetAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  depreciationExpenseAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  accumulatedDepreciationAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },

  // Custom attributes template
  customFields: [{
    name: String,
    type: { type: String, enum: ['text', 'number', 'date', 'boolean', 'select'] },
    options: [String],
    required: Boolean,
  }],

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

assetCategorySchema.index({ tenant: 1, code: 1 }, { unique: true });

// ============ ASSET ============
const assetSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  assetNumber: { type: String, required: true },
  name: { type: String, required: true },
  description: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'AssetCategory', required: true },

  // Identification
  barcode: String,
  serialNumber: String,
  model: String,
  manufacturer: String,

  // Acquisition
  acquisitionDate: { type: Date, required: true },
  acquisitionMethod: { type: String, enum: ['purchase', 'lease', 'donation', 'transfer', 'construction'], default: 'purchase' },
  purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  invoiceNumber: String,
  invoiceDate: Date,

  // Cost
  acquisitionCost: { type: Number, required: true },
  additionalCost: { type: Number, default: 0 }, // installation, shipping, etc.
  totalCost: { type: Number, required: true },
  currency: { type: String, default: 'NGN' },

  // Depreciation
  depreciationMethod: { type: String, enum: ['straight_line', 'declining_balance', 'double_declining', 'sum_of_years', 'units_of_production', 'none'], default: 'straight_line' },
  usefulLifeMonths: { type: Number, required: true },
  salvageValue: { type: Number, default: 0 },
  depreciationStartDate: Date,
  accumulatedDepreciation: { type: Number, default: 0 },
  bookValue: { type: Number, required: true },
  lastDepreciationDate: Date,

  // For units of production method
  totalExpectedUnits: Number,
  unitsProducedToDate: { type: Number, default: 0 },

  // Location & Assignment
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  location: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  assignedDate: Date,
  custodian: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },

  // Warranty & Insurance
  warrantyStartDate: Date,
  warrantyEndDate: Date,
  warrantyProvider: String,
  warrantyNotes: String,
  insurancePolicy: String,
  insuranceProvider: String,
  insuranceExpiry: Date,
  insuredValue: Number,

  // Maintenance
  lastMaintenanceDate: Date,
  nextMaintenanceDate: Date,
  maintenanceFrequencyDays: Number,
  maintenanceNotes: String,

  // Status
  status: {
    type: String,
    enum: ['active', 'in_maintenance', 'in_repair', 'disposed', 'lost', 'stolen', 'transferred', 'retired', 'under_review'],
    default: 'active',
  },
  condition: { type: String, enum: ['excellent', 'good', 'fair', 'poor', 'non_functional'], default: 'excellent' },

  // Disposal
  disposalDate: Date,
  disposalMethod: { type: String, enum: ['sale', 'scrap', 'donation', 'trade_in', 'theft_loss', 'write_off'] },
  disposalValue: Number,
  disposalReason: String,
  disposalApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Documents
  documents: [{
    name: String,
    type: { type: String, enum: ['invoice', 'warranty', 'manual', 'certificate', 'insurance', 'photo', 'other'] },
    url: String,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],

  // Custom fields
  customFields: mongoose.Schema.Types.Mixed,

  // QR Code
  qrCode: String,

  notes: String,
  tags: [String],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

assetSchema.index({ tenant: 1, assetNumber: 1 }, { unique: true });
assetSchema.index({ tenant: 1, barcode: 1 }, { sparse: true });
assetSchema.index({ tenant: 1, serialNumber: 1 }, { sparse: true });
assetSchema.index({ tenant: 1, category: 1, status: 1 });
assetSchema.index({ tenant: 1, assignedTo: 1 });
assetSchema.index({ tenant: 1, department: 1 });
assetSchema.index({ tenant: 1, name: 'text', assetNumber: 'text', serialNumber: 'text' });

assetSchema.pre('save', async function(next) {
  if (this.isNew && !this.assetNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.assetNumber = `AST-${String(count + 1).padStart(6, '0')}`;
  }

  // Calculate total cost
  this.totalCost = (this.acquisitionCost || 0) + (this.additionalCost || 0);

  // Calculate book value
  this.bookValue = this.totalCost - this.accumulatedDepreciation;

  next();
});

// ============ ASSET DEPRECIATION SCHEDULE ============
const depreciationScheduleSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  period: { type: Number, required: true }, // period number (1, 2, 3...)
  year: Number,
  month: Number,

  openingBookValue: { type: Number, required: true },
  depreciationAmount: { type: Number, required: true },
  accumulatedDepreciation: { type: Number, required: true },
  closingBookValue: { type: Number, required: true },

  status: { type: String, enum: ['scheduled', 'posted', 'skipped'], default: 'scheduled' },
  journalEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
  postedAt: Date,
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

depreciationScheduleSchema.index({ tenant: 1, asset: 1, period: 1 }, { unique: true });
depreciationScheduleSchema.index({ tenant: 1, year: 1, month: 1, status: 1 });

// ============ ASSET MAINTENANCE ============
const assetMaintenanceSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  maintenanceNumber: { type: String, required: true },
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },

  type: { type: String, enum: ['preventive', 'corrective', 'emergency', 'inspection', 'calibration', 'upgrade'], default: 'preventive' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  status: { type: String, enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'deferred'], default: 'scheduled' },

  title: { type: String, required: true },
  description: String,

  // Scheduling
  scheduledDate: Date,
  scheduledEndDate: Date,
  actualStartDate: Date,
  actualEndDate: Date,

  // Assignment
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },

  // Costs
  estimatedCost: { type: Number, default: 0 },
  actualCost: { type: Number, default: 0 },
  laborCost: { type: Number, default: 0 },
  partsCost: { type: Number, default: 0 },

  // Parts used
  partsUsed: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    description: String,
    quantity: Number,
    unitCost: Number,
    totalCost: Number,
  }],

  // Work done
  workPerformed: String,
  findings: String,
  recommendations: String,

  // Next maintenance
  nextMaintenanceDate: Date,
  nextMaintenanceNotes: String,

  // Documents
  documents: [{
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now },
  }],

  // Condition assessment
  conditionBefore: { type: String, enum: ['excellent', 'good', 'fair', 'poor', 'non_functional'] },
  conditionAfter: { type: String, enum: ['excellent', 'good', 'fair', 'poor', 'non_functional'] },

  // Downtime
  downtimeHours: Number,

  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

assetMaintenanceSchema.index({ tenant: 1, maintenanceNumber: 1 }, { unique: true });
assetMaintenanceSchema.index({ tenant: 1, asset: 1, status: 1 });
assetMaintenanceSchema.index({ tenant: 1, scheduledDate: 1, status: 1 });

assetMaintenanceSchema.pre('save', async function(next) {
  if (this.isNew && !this.maintenanceNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.maintenanceNumber = `MNT-${String(count + 1).padStart(6, '0')}`;
  }

  // Calculate total actual cost
  this.actualCost = (this.laborCost || 0) + (this.partsCost || 0);

  next();
});

// ============ ASSET TRANSFER ============
const assetTransferSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  transferNumber: { type: String, required: true },
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },

  transferDate: { type: Date, default: Date.now },
  effectiveDate: Date,

  // From
  fromBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  fromDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  fromLocation: String,
  fromCustodian: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },

  // To
  toBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  toDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  toLocation: String,
  toCustodian: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },

  reason: String,
  status: { type: String, enum: ['pending', 'approved', 'in_transit', 'completed', 'rejected', 'cancelled'], default: 'pending' },

  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receivedAt: Date,

  conditionAtTransfer: { type: String, enum: ['excellent', 'good', 'fair', 'poor', 'non_functional'] },
  conditionNotes: String,

  documents: [{
    name: String,
    url: String,
  }],

  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

assetTransferSchema.index({ tenant: 1, transferNumber: 1 }, { unique: true });
assetTransferSchema.index({ tenant: 1, asset: 1, status: 1 });

assetTransferSchema.pre('save', async function(next) {
  if (this.isNew && !this.transferNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.transferNumber = `ATR-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// ============ ASSET DISPOSAL ============
const assetDisposalSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  disposalNumber: { type: String, required: true },
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },

  disposalDate: Date,
  requestDate: { type: Date, default: Date.now },

  method: { type: String, enum: ['sale', 'scrap', 'donation', 'trade_in', 'theft_loss', 'write_off'], required: true },
  reason: { type: String, required: true },
  reasonDetail: String,

  // Financial
  bookValueAtDisposal: { type: Number, required: true },
  accumulatedDepreciationAtDisposal: { type: Number, required: true },
  disposalValue: { type: Number, default: 0 }, // sale price or recovered value
  gainLoss: { type: Number, default: 0 },

  // Sale details
  buyer: String,
  buyerContact: String,
  saleInvoiceNumber: String,
  paymentReceived: { type: Boolean, default: false },
  paymentDate: Date,

  // Trade-in
  tradeInAsset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
  tradeInValue: Number,

  // Approval workflow
  status: { type: String, enum: ['draft', 'pending_approval', 'approved', 'completed', 'rejected', 'cancelled'], default: 'draft' },
  approvalLevel: { type: Number, default: 1 },
  approvals: [{
    level: Number,
    approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'] },
    comments: String,
    approvedAt: Date,
  }],

  // Journal entry
  journalEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },

  // Documentation
  documents: [{
    name: String,
    type: { type: String, enum: ['approval', 'invoice', 'certificate', 'photo', 'report', 'other'] },
    url: String,
    uploadedAt: Date,
  }],

  inspectionReport: String,
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

assetDisposalSchema.index({ tenant: 1, disposalNumber: 1 }, { unique: true });
assetDisposalSchema.index({ tenant: 1, asset: 1 });
assetDisposalSchema.index({ tenant: 1, status: 1 });

assetDisposalSchema.pre('save', async function(next) {
  if (this.isNew && !this.disposalNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.disposalNumber = `DSP-${String(count + 1).padStart(6, '0')}`;
  }

  // Calculate gain/loss
  this.gainLoss = (this.disposalValue || 0) - this.bookValueAtDisposal;

  next();
});

// ============ ASSET AUDIT ============
const assetAuditSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  auditNumber: { type: String, required: true },
  name: { type: String, required: true },

  type: { type: String, enum: ['full', 'partial', 'spot', 'compliance', 'valuation'], default: 'full' },
  status: { type: String, enum: ['planned', 'in_progress', 'completed', 'cancelled'], default: 'planned' },

  // Scope
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AssetCategory' }],

  // Schedule
  plannedStartDate: Date,
  plannedEndDate: Date,
  actualStartDate: Date,
  actualEndDate: Date,

  // Team
  leadAuditor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  auditors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Items
  items: [{
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },

    // Expected
    expectedLocation: String,
    expectedCondition: String,
    expectedCustodian: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    bookValue: Number,

    // Found
    found: { type: Boolean, default: null },
    actualLocation: String,
    actualCondition: { type: String, enum: ['excellent', 'good', 'fair', 'poor', 'non_functional', 'not_found'] },
    actualCustodian: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },

    // Discrepancies
    hasDiscrepancy: { type: Boolean, default: false },
    discrepancyType: { type: String, enum: ['location', 'condition', 'custodian', 'missing', 'unregistered', 'multiple'] },
    discrepancyNotes: String,

    // Photos
    photos: [String],

    // Verification
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,

    notes: String,
    status: { type: String, enum: ['pending', 'verified', 'discrepancy', 'resolved'], default: 'pending' },
  }],

  // Unregistered assets found
  unregisteredAssets: [{
    description: String,
    location: String,
    condition: String,
    estimatedValue: Number,
    photos: [String],
    notes: String,
  }],

  // Summary
  totalAssets: { type: Number, default: 0 },
  assetsVerified: { type: Number, default: 0 },
  assetsWithDiscrepancy: { type: Number, default: 0 },
  assetsMissing: { type: Number, default: 0 },
  unregisteredCount: { type: Number, default: 0 },
  totalBookValue: { type: Number, default: 0 },
  missingValue: { type: Number, default: 0 },

  // Report
  findings: String,
  recommendations: String,
  reportUrl: String,

  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

assetAuditSchema.index({ tenant: 1, auditNumber: 1 }, { unique: true });
assetAuditSchema.index({ tenant: 1, status: 1 });

assetAuditSchema.pre('save', async function(next) {
  if (this.isNew && !this.auditNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.auditNumber = `AUD-${String(count + 1).padStart(6, '0')}`;
  }

  // Calculate summary
  if (this.items && this.items.length > 0) {
    this.totalAssets = this.items.length;
    this.assetsVerified = this.items.filter(i => i.status === 'verified' || i.status === 'resolved').length;
    this.assetsWithDiscrepancy = this.items.filter(i => i.hasDiscrepancy).length;
    this.assetsMissing = this.items.filter(i => i.actualCondition === 'not_found').length;
    this.missingValue = this.items
      .filter(i => i.actualCondition === 'not_found')
      .reduce((sum, i) => sum + (i.bookValue || 0), 0);
  }

  if (this.unregisteredAssets) {
    this.unregisteredCount = this.unregisteredAssets.length;
  }

  next();
});

// ============ ASSET CHECK-OUT / CHECK-IN ============
const assetCheckoutSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  checkoutNumber: { type: String, required: true },
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },

  checkoutType: { type: String, enum: ['temporary', 'permanent', 'project'], default: 'temporary' },
  status: { type: String, enum: ['checked_out', 'checked_in', 'overdue', 'lost'], default: 'checked_out' },

  // Check out
  checkedOutTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  checkedOutBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  checkoutDate: { type: Date, default: Date.now },
  expectedReturnDate: Date,
  checkoutNotes: String,
  checkoutCondition: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },

  // Check in
  checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  checkinDate: Date,
  checkinNotes: String,
  checkinCondition: { type: String, enum: ['excellent', 'good', 'fair', 'poor', 'damaged'] },

  // Purpose
  purpose: String,
  project: String,

  // Documents
  documents: [{
    name: String,
    url: String,
    type: String,
  }],

  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

assetCheckoutSchema.index({ tenant: 1, checkoutNumber: 1 }, { unique: true });
assetCheckoutSchema.index({ tenant: 1, asset: 1, status: 1 });
assetCheckoutSchema.index({ tenant: 1, checkedOutTo: 1, status: 1 });

assetCheckoutSchema.pre('save', async function(next) {
  if (this.isNew && !this.checkoutNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.checkoutNumber = `CHK-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

export const AssetCategory = mongoose.model('AssetCategory', assetCategorySchema);
export const Asset = mongoose.model('Asset', assetSchema);
export const DepreciationSchedule = mongoose.model('DepreciationSchedule', depreciationScheduleSchema);
export const AssetMaintenance = mongoose.model('AssetMaintenance', assetMaintenanceSchema);
export const AssetTransfer = mongoose.model('AssetTransfer', assetTransferSchema);
export const AssetDisposal = mongoose.model('AssetDisposal', assetDisposalSchema);
export const AssetAudit = mongoose.model('AssetAudit', assetAuditSchema);
export const AssetCheckout = mongoose.model('AssetCheckout', assetCheckoutSchema);
