import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
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
    enum: ['individual', 'company', 'government', 'other'],
    default: 'company',
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
  creditLimit: Number,
  paymentTerms: {
    type: Number,
    default: 30,
  },
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

customerSchema.index({ tenant: 1, code: 1 }, { unique: true });

const invoiceItemSchema = new mongoose.Schema({
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
  discount: {
    type: Number,
    default: 0,
  },
});

const invoicePaymentSchema = new mongoose.Schema({
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
    enum: ['bank_transfer', 'cash', 'cheque', 'card', 'online'],
    required: true,
  },
  reference: String,
  notes: String,
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const invoiceSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  invoiceNumber: {
    type: String,
    required: true,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  type: {
    type: String,
    enum: ['invoice', 'proforma', 'credit_note', 'debit_note'],
    default: 'invoice',
  },
  items: [invoiceItemSchema],
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
  invoiceDate: {
    type: Date,
    required: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled', 'refunded'],
    default: 'draft',
  },
  payments: [invoicePaymentSchema],
  paidAmount: {
    type: Number,
    default: 0,
  },
  balanceDue: {
    type: Number,
    required: true,
  },
  sentAt: Date,
  viewedAt: Date,
  notes: String,
  terms: String,
  footer: String,
  attachments: [{
    name: String,
    url: String,
  }],
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

invoiceSchema.index({ tenant: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ tenant: 1, customer: 1 });
invoiceSchema.index({ tenant: 1, status: 1 });
invoiceSchema.index({ tenant: 1, dueDate: 1 });

// Auto-generate invoice number
invoiceSchema.pre('save', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    const prefix = this.type === 'credit_note' ? 'CN' : this.type === 'proforma' ? 'PF' : 'INV';
    this.invoiceNumber = `${prefix}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Calculate totals
invoiceSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    this.taxAmount = this.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
    const itemDiscounts = this.items.reduce((sum, item) => sum + (item.discount || 0), 0);
    this.totalAmount = this.subtotal + this.taxAmount - this.discountAmount - itemDiscounts;
  }

  this.paidAmount = this.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  this.balanceDue = this.totalAmount - this.paidAmount;

  if (this.balanceDue <= 0 && this.status !== 'cancelled' && this.status !== 'refunded') {
    this.status = 'paid';
  } else if (this.paidAmount > 0 && this.balanceDue > 0) {
    this.status = 'partial';
  }

  next();
});

export const Customer = mongoose.model('Customer', customerSchema);
export const Invoice = mongoose.model('Invoice', invoiceSchema);
