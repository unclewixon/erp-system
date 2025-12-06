import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['petty_cash', 'operating', 'savings', 'project', 'escrow', 'other'],
    default: 'operating',
  },
  balance: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: 'NGN',
  },
  accountNumber: String,
  bankDetails: {
    bankName: String,
    accountNumber: String,
    accountName: String,
    branchCode: String,
  },
  custodian: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  lowBalanceThreshold: Number,
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

walletSchema.index({ tenant: 1, name: 1 }, { unique: true });

const walletTransactionSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
  },
  transactionNumber: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true,
  },
  category: {
    type: String,
    enum: ['deposit', 'withdrawal', 'transfer', 'expense', 'refund', 'adjustment', 'other'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  balanceBefore: {
    type: Number,
    required: true,
  },
  balanceAfter: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  reference: String,
  relatedDocument: {
    type: {
      type: String,
      enum: ['expense', 'bill', 'invoice', 'reimbursement', 'transfer'],
    },
    documentId: mongoose.Schema.Types.ObjectId,
  },
  transferTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
  },
  transferFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque', 'card', 'other'],
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'reversed'],
    default: 'completed',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  attachments: [{
    name: String,
    url: String,
  }],
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

walletTransactionSchema.index({ tenant: 1, transactionNumber: 1 }, { unique: true });
walletTransactionSchema.index({ tenant: 1, wallet: 1, createdAt: -1 });
walletTransactionSchema.index({ tenant: 1, type: 1 });

// Auto-generate transaction number
walletTransactionSchema.pre('save', async function(next) {
  if (this.isNew && !this.transactionNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.transactionNumber = `TXN-${String(count + 1).padStart(8, '0')}`;
  }
  next();
});

// Fund Request Schema for petty cash etc.
const fundRequestSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  requestNumber: {
    type: String,
    required: true,
  },
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  purpose: {
    type: String,
    required: true,
  },
  category: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'disbursed', 'settled', 'cancelled'],
    default: 'pending',
  },
  approvedAmount: Number,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  rejectionReason: String,
  disbursedAt: Date,
  disbursedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  settlement: {
    amountUsed: Number,
    amountReturned: Number,
    settledAt: Date,
    settledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    receipts: [{
      description: String,
      amount: Number,
      receiptUrl: String,
    }],
  },
  dueDate: Date,
  attachments: [{
    name: String,
    url: String,
  }],
  notes: String,
}, {
  timestamps: true,
});

fundRequestSchema.index({ tenant: 1, requestNumber: 1 }, { unique: true });
fundRequestSchema.index({ tenant: 1, requestedBy: 1 });
fundRequestSchema.index({ tenant: 1, status: 1 });

// Auto-generate request number
fundRequestSchema.pre('save', async function(next) {
  if (this.isNew && !this.requestNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.requestNumber = `FR-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

export const Wallet = mongoose.model('Wallet', walletSchema);
export const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);
export const FundRequest = mongoose.model('FundRequest', fundRequestSchema);
