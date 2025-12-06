import mongoose from 'mongoose';

// Chart of Accounts
const accountSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
    required: true,
  },
  category: {
    type: String,
    enum: [
      // Asset
      'current_asset', 'fixed_asset', 'other_asset',
      // Liability
      'current_liability', 'long_term_liability',
      // Equity
      'equity', 'retained_earnings',
      // Revenue
      'operating_revenue', 'other_revenue',
      // Expense
      'cost_of_goods', 'operating_expense', 'other_expense'
    ],
    required: true,
  },
  parentAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
  },
  description: String,
  balance: {
    type: Number,
    default: 0,
  },
  normalBalance: {
    type: String,
    enum: ['debit', 'credit'],
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isSystemAccount: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

accountSchema.index({ tenant: 1, code: 1 }, { unique: true });

// Journal Entry
const journalLineSchema = new mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  description: String,
  debit: {
    type: Number,
    default: 0,
  },
  credit: {
    type: Number,
    default: 0,
  },
});

const journalEntrySchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  entryNumber: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['general', 'adjusting', 'closing', 'reversing', 'opening'],
    default: 'general',
  },
  lines: [journalLineSchema],
  totalDebit: {
    type: Number,
    required: true,
  },
  totalCredit: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'posted', 'reversed'],
    default: 'draft',
  },
  reference: {
    type: {
      type: String,
      enum: ['invoice', 'bill', 'expense', 'payment', 'transfer', 'payroll', 'manual'],
    },
    documentId: mongoose.Schema.Types.ObjectId,
    documentNumber: String,
  },
  reversedEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry',
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  postedAt: Date,
  notes: String,
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

journalEntrySchema.index({ tenant: 1, entryNumber: 1 }, { unique: true });
journalEntrySchema.index({ tenant: 1, date: -1 });
journalEntrySchema.index({ tenant: 1, status: 1 });

// Auto-generate entry number
journalEntrySchema.pre('save', async function(next) {
  if (this.isNew && !this.entryNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.entryNumber = `JE-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Validate debits equal credits
journalEntrySchema.pre('save', function(next) {
  this.totalDebit = this.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  this.totalCredit = this.lines.reduce((sum, line) => sum + (line.credit || 0), 0);

  if (Math.abs(this.totalDebit - this.totalCredit) > 0.01) {
    next(new Error('Debits must equal credits'));
  }
  next();
});

// Fiscal Period
const fiscalPeriodSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  period: {
    type: Number, // 1-12 for months or 1-4 for quarters
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'locked'],
    default: 'open',
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  closedAt: Date,
}, {
  timestamps: true,
});

fiscalPeriodSchema.index({ tenant: 1, year: 1, period: 1 }, { unique: true });

// Budget
const budgetLineSchema = new mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  notes: String,
});

const budgetSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  fiscalYear: {
    type: Number,
    required: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  type: {
    type: String,
    enum: ['annual', 'quarterly', 'monthly', 'project'],
    default: 'annual',
  },
  lines: [budgetLineSchema],
  totalBudget: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'active', 'closed'],
    default: 'draft',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

budgetSchema.index({ tenant: 1, fiscalYear: 1, department: 1 });

// Calculate total
budgetSchema.pre('save', function(next) {
  this.totalBudget = this.lines.reduce((sum, line) => sum + (line.amount || 0), 0);
  next();
});

export const Account = mongoose.model('Account', accountSchema);
export const JournalEntry = mongoose.model('JournalEntry', journalEntrySchema);
export const FiscalPeriod = mongoose.model('FiscalPeriod', fiscalPeriodSchema);
export const Budget = mongoose.model('Budget', budgetSchema);
