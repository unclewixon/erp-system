import mongoose from 'mongoose';

// Procurement Category
const procurementCategorySchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  description: String,
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProcurementCategory',
  },
  glAccount: String,
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

procurementCategorySchema.index({ tenant: 1, code: 1 }, { unique: true });

// Purchase Requisition (Internal Request)
const requisitionItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProcurementCategory',
  },
  quantity: {
    type: Number,
    required: true,
  },
  unit: {
    type: String,
    default: 'unit',
  },
  estimatedUnitPrice: Number,
  estimatedAmount: Number,
  specifications: String,
  preferredVendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
  },
  requiredDate: Date,
  status: {
    type: String,
    enum: ['pending', 'approved', 'ordered', 'received', 'cancelled'],
    default: 'pending',
  },
});

const purchaseRequisitionSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  requisitionNumber: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [requisitionItemSchema],
  totalEstimatedAmount: Number,
  currency: {
    type: String,
    default: 'NGN',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  justification: String,
  requiredDate: Date,
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'converted', 'cancelled'],
    default: 'draft',
  },
  submittedAt: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: Date,
  reviewComments: String,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  rejectionReason: String,
  linkedPurchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
  },
  linkedRFQ: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RFQ',
  },
  attachments: [{
    name: String,
    url: String,
    type: String,
  }],
  notes: String,
}, {
  timestamps: true,
});

purchaseRequisitionSchema.index({ tenant: 1, requisitionNumber: 1 }, { unique: true });
purchaseRequisitionSchema.index({ tenant: 1, department: 1 });
purchaseRequisitionSchema.index({ tenant: 1, status: 1 });

// Auto-generate requisition number
purchaseRequisitionSchema.pre('save', async function(next) {
  if (this.isNew && !this.requisitionNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.requisitionNumber = `PR-${String(count + 1).padStart(6, '0')}`;
  }
  // Calculate total
  this.totalEstimatedAmount = this.items.reduce((sum, item) => {
    item.estimatedAmount = (item.quantity || 0) * (item.estimatedUnitPrice || 0);
    return sum + item.estimatedAmount;
  }, 0);
  next();
});

// Request for Quotation (RFQ)
const rfqVendorResponseSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
  invitedAt: {
    type: Date,
    default: Date.now,
  },
  respondedAt: Date,
  status: {
    type: String,
    enum: ['invited', 'viewed', 'responded', 'declined', 'selected', 'rejected'],
    default: 'invited',
  },
  quotation: {
    items: [{
      itemIndex: Number,
      unitPrice: Number,
      amount: Number,
      deliveryDays: Number,
      notes: String,
    }],
    totalAmount: Number,
    validUntil: Date,
    termsAndConditions: String,
    attachments: [{
      name: String,
      url: String,
    }],
  },
  evaluationScore: Number,
  evaluationNotes: String,
});

const rfqSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  rfqNumber: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  requisition: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseRequisition',
  },
  items: [{
    description: String,
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProcurementCategory',
    },
    quantity: Number,
    unit: String,
    specifications: String,
    requiredDate: Date,
  }],
  vendors: [rfqVendorResponseSchema],
  deadline: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'closed', 'evaluated', 'awarded', 'cancelled'],
    default: 'draft',
  },
  publishedAt: Date,
  closedAt: Date,
  evaluationCriteria: [{
    criterion: String,
    weight: Number, // percentage
  }],
  selectedVendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
  },
  linkedPurchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
  },
  termsAndConditions: String,
  attachments: [{
    name: String,
    url: String,
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

rfqSchema.index({ tenant: 1, rfqNumber: 1 }, { unique: true });
rfqSchema.index({ tenant: 1, status: 1 });

// Auto-generate RFQ number
rfqSchema.pre('save', async function(next) {
  if (this.isNew && !this.rfqNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.rfqNumber = `RFQ-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Goods Receipt Note (GRN)
const grnItemSchema = new mongoose.Schema({
  poItemIndex: Number,
  description: String,
  orderedQuantity: Number,
  receivedQuantity: Number,
  previouslyReceived: Number,
  unit: String,
  condition: {
    type: String,
    enum: ['good', 'damaged', 'defective', 'partial'],
    default: 'good',
  },
  batchNumber: String,
  expiryDate: Date,
  storageLocation: String,
  notes: String,
});

const goodsReceiptNoteSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  grnNumber: {
    type: String,
    required: true,
  },
  purchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
    required: true,
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
  deliveryNote: String,
  invoiceNumber: String,
  receivedDate: {
    type: Date,
    required: true,
  },
  items: [grnItemSchema],
  status: {
    type: String,
    enum: ['draft', 'pending_inspection', 'inspected', 'accepted', 'rejected', 'partial_accepted'],
    default: 'draft',
  },
  inspectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  inspectedAt: Date,
  inspectionNotes: String,
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  storageLocation: String,
  attachments: [{
    name: String,
    url: String,
    type: String,
  }],
  notes: String,
}, {
  timestamps: true,
});

goodsReceiptNoteSchema.index({ tenant: 1, grnNumber: 1 }, { unique: true });
goodsReceiptNoteSchema.index({ tenant: 1, purchaseOrder: 1 });
goodsReceiptNoteSchema.index({ tenant: 1, vendor: 1 });

// Auto-generate GRN number
goodsReceiptNoteSchema.pre('save', async function(next) {
  if (this.isNew && !this.grnNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.grnNumber = `GRN-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Vendor Evaluation
const vendorEvaluationSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
  evaluationPeriod: {
    startDate: Date,
    endDate: Date,
  },
  purchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
  },
  criteria: [{
    name: {
      type: String,
      required: true,
    },
    weight: {
      type: Number,
      default: 1,
    },
    score: {
      type: Number,
      min: 1,
      max: 5,
    },
    comments: String,
  }],
  overallScore: Number,
  overallRating: {
    type: String,
    enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'poor'],
  },
  strengths: [String],
  weaknesses: [String],
  recommendations: String,
  status: {
    type: String,
    enum: ['draft', 'submitted', 'reviewed'],
    default: 'draft',
  },
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: Date,
}, {
  timestamps: true,
});

vendorEvaluationSchema.index({ tenant: 1, vendor: 1, createdAt: -1 });

// Calculate overall score
vendorEvaluationSchema.pre('save', function(next) {
  if (this.criteria && this.criteria.length > 0) {
    const totalWeight = this.criteria.reduce((sum, c) => sum + (c.weight || 1), 0);
    const weightedSum = this.criteria.reduce((sum, c) => sum + ((c.score || 0) * (c.weight || 1)), 0);
    this.overallScore = Math.round((weightedSum / totalWeight) * 100) / 100;

    if (this.overallScore >= 4.5) this.overallRating = 'excellent';
    else if (this.overallScore >= 3.5) this.overallRating = 'good';
    else if (this.overallScore >= 2.5) this.overallRating = 'satisfactory';
    else if (this.overallScore >= 1.5) this.overallRating = 'needs_improvement';
    else this.overallRating = 'poor';
  }
  next();
});

// Vendor Contract
const vendorContractSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  contractNumber: {
    type: String,
    required: true,
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['supply', 'service', 'framework', 'maintenance', 'subscription', 'other'],
    default: 'supply',
  },
  description: String,
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  value: Number,
  currency: {
    type: String,
    default: 'NGN',
  },
  paymentTerms: String,
  deliveryTerms: String,
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'active', 'expired', 'terminated', 'renewed'],
    default: 'draft',
  },
  autoRenew: {
    type: Boolean,
    default: false,
  },
  renewalNoticeDays: {
    type: Number,
    default: 30,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  documents: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: Date,
  }],
  keyContacts: [{
    name: String,
    role: String,
    email: String,
    phone: String,
  }],
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

vendorContractSchema.index({ tenant: 1, contractNumber: 1 }, { unique: true });
vendorContractSchema.index({ tenant: 1, vendor: 1 });
vendorContractSchema.index({ tenant: 1, status: 1 });
vendorContractSchema.index({ tenant: 1, endDate: 1 });

// Auto-generate contract number
vendorContractSchema.pre('save', async function(next) {
  if (this.isNew && !this.contractNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.contractNumber = `VC-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Vendor Price List
const vendorPriceListSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  effectiveDate: {
    type: Date,
    required: true,
  },
  expiryDate: Date,
  currency: {
    type: String,
    default: 'NGN',
  },
  items: [{
    itemCode: String,
    description: String,
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProcurementCategory',
    },
    unit: String,
    unitPrice: Number,
    minOrderQuantity: Number,
    leadTimeDays: Number,
  }],
  discountTiers: [{
    minAmount: Number,
    discountPercent: Number,
  }],
  status: {
    type: String,
    enum: ['draft', 'active', 'expired', 'superseded'],
    default: 'draft',
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

vendorPriceListSchema.index({ tenant: 1, vendor: 1, effectiveDate: -1 });

export const ProcurementCategory = mongoose.model('ProcurementCategory', procurementCategorySchema);
export const PurchaseRequisition = mongoose.model('PurchaseRequisition', purchaseRequisitionSchema);
export const RFQ = mongoose.model('RFQ', rfqSchema);
export const GoodsReceiptNote = mongoose.model('GoodsReceiptNote', goodsReceiptNoteSchema);
export const VendorEvaluation = mongoose.model('VendorEvaluation', vendorEvaluationSchema);
export const VendorContract = mongoose.model('VendorContract', vendorContractSchema);
export const VendorPriceList = mongoose.model('VendorPriceList', vendorPriceListSchema);
