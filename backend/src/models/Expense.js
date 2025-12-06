import mongoose from 'mongoose';

const expenseCategorySchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['operating', 'capital', 'payroll', 'travel', 'utilities', 'office', 'marketing', 'other'],
    default: 'operating',
  },
  accountCode: String,
  budgetLimit: Number,
  requiresApproval: {
    type: Boolean,
    default: true,
  },
  approvalThreshold: Number,
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

expenseCategorySchema.index({ tenant: 1, code: 1 }, { unique: true });

const expenseItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExpenseCategory',
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
  taxAmount: {
    type: Number,
    default: 0,
  },
  receipt: {
    name: String,
    url: String,
  },
  notes: String,
});

const expenseSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  expenseNumber: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  type: {
    type: String,
    enum: ['general', 'travel', 'purchase', 'petty_cash', 'project', 'other'],
    default: 'general',
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExpenseCategory',
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  project: String,
  items: [expenseItemSchema],
  subtotal: {
    type: Number,
    required: true,
  },
  taxAmount: {
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
  expenseDate: {
    type: Date,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'card', 'cheque', 'petty_cash', 'other'],
    default: 'bank_transfer',
  },
  paymentReference: String,
  vendor: {
    name: String,
    email: String,
    phone: String,
    address: String,
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid', 'cancelled'],
    default: 'draft',
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  submittedAt: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  approvedAmount: Number,
  rejectionReason: String,
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  paidAt: Date,
  attachments: [{
    name: String,
    url: String,
    type: String,
  }],
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

expenseSchema.index({ tenant: 1, expenseNumber: 1 }, { unique: true });
expenseSchema.index({ tenant: 1, status: 1 });
expenseSchema.index({ tenant: 1, expenseDate: -1 });
expenseSchema.index({ tenant: 1, category: 1 });

// Auto-generate expense number
expenseSchema.pre('save', async function(next) {
  if (this.isNew && !this.expenseNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.expenseNumber = `EXP-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Calculate totals before save
expenseSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    this.taxAmount = this.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
    this.totalAmount = this.subtotal + this.taxAmount;
  }
  next();
});

export const ExpenseCategory = mongoose.model('ExpenseCategory', expenseCategorySchema);
export const Expense = mongoose.model('Expense', expenseSchema);
