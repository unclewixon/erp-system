import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['supplier', 'contractor', 'service_provider', 'utility', 'other'],
    default: 'supplier',
  },
  email: String,
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
  },
  taxId: String,
  bankDetails: {
    bankName: String,
    accountNumber: String,
    accountName: String,
    bankCode: String,
  },
  paymentTerms: {
    type: Number,
    default: 30, // days
  },
  creditLimit: Number,
  contactPerson: {
    name: String,
    email: String,
    phone: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

vendorSchema.index({ tenant: 1, code: 1 }, { unique: true });

const billItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    default: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  taxRate: {
    type: Number,
    default: 0,
  },
  taxAmount: {
    type: Number,
    default: 0,
  },
  account: String,
  category: String,
});

const billPaymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  paymentDate: {
    type: Date,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cheque', 'cash', 'card'],
    required: true,
  },
  reference: String,
  notes: String,
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const billSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  billNumber: {
    type: String,
    required: true,
  },
  vendorBillNumber: String,
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
  type: {
    type: String,
    enum: ['invoice', 'utility', 'subscription', 'purchase', 'service', 'other'],
    default: 'invoice',
  },
  items: [billItemSchema],
  subtotal: {
    type: Number,
    required: true,
  },
  taxAmount: {
    type: Number,
    default: 0,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'NGN',
  },
  billDate: {
    type: Date,
    required: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'partial', 'paid', 'overdue', 'cancelled'],
    default: 'draft',
  },
  payments: [billPaymentSchema],
  paidAmount: {
    type: Number,
    default: 0,
  },
  balanceDue: {
    type: Number,
    required: true,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  attachments: [{
    name: String,
    url: String,
    type: String,
  }],
  notes: String,
  isRecurring: {
    type: Boolean,
    default: false,
  },
  recurrence: {
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
    },
    nextDate: Date,
    endDate: Date,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

billSchema.index({ tenant: 1, billNumber: 1 }, { unique: true });
billSchema.index({ tenant: 1, vendor: 1 });
billSchema.index({ tenant: 1, status: 1 });
billSchema.index({ tenant: 1, dueDate: 1 });

// Auto-generate bill number
billSchema.pre('save', async function(next) {
  if (this.isNew && !this.billNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.billNumber = `BILL-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Calculate totals and balance
billSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    this.taxAmount = this.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
    this.totalAmount = this.subtotal + this.taxAmount - this.discountAmount;
  }

  this.paidAmount = this.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  this.balanceDue = this.totalAmount - this.paidAmount;

  // Update status based on payment
  if (this.balanceDue <= 0 && this.status !== 'cancelled') {
    this.status = 'paid';
  } else if (this.paidAmount > 0 && this.balanceDue > 0) {
    this.status = 'partial';
  }

  next();
});

// Purchase Order Schema
const purchaseOrderSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  poNumber: {
    type: String,
    required: true,
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  items: [{
    description: String,
    quantity: Number,
    unitPrice: Number,
    amount: Number,
    taxAmount: Number,
    deliveryDate: Date,
  }],
  subtotal: Number,
  taxAmount: Number,
  totalAmount: Number,
  currency: {
    type: String,
    default: 'NGN',
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },
  expectedDelivery: Date,
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
  },
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'sent', 'partial_received', 'received', 'cancelled'],
    default: 'draft',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  receivedItems: [{
    itemIndex: Number,
    quantityReceived: Number,
    receivedDate: Date,
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: String,
  }],
  linkedBill: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill',
  },
  attachments: [{
    name: String,
    url: String,
  }],
  notes: String,
  terms: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

purchaseOrderSchema.index({ tenant: 1, poNumber: 1 }, { unique: true });

// Auto-generate PO number
purchaseOrderSchema.pre('save', async function(next) {
  if (this.isNew && !this.poNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.poNumber = `PO-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

export const Vendor = mongoose.model('Vendor', vendorSchema);
export const Bill = mongoose.model('Bill', billSchema);
export const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
