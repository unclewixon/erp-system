import mongoose from 'mongoose';

const reimbursementItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['travel', 'meals', 'accommodation', 'transport', 'office_supplies', 'communication', 'training', 'medical', 'other'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  receipt: {
    name: String,
    url: String,
  },
  notes: String,
});

const reimbursementSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  reimbursementNumber: {
    type: String,
    required: true,
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  items: [reimbursementItemSchema],
  totalAmount: {
    type: Number,
    required: true,
  },
  approvedAmount: Number,
  currency: {
    type: String,
    default: 'NGN',
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid', 'cancelled'],
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
  payment: {
    method: {
      type: String,
      enum: ['payroll', 'bank_transfer', 'cash', 'cheque'],
    },
    reference: String,
    paidAt: Date,
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  payrollId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payroll',
  },
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

reimbursementSchema.index({ tenant: 1, reimbursementNumber: 1 }, { unique: true });
reimbursementSchema.index({ tenant: 1, employee: 1 });
reimbursementSchema.index({ tenant: 1, status: 1 });

// Auto-generate reimbursement number
reimbursementSchema.pre('save', async function(next) {
  if (this.isNew && !this.reimbursementNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.reimbursementNumber = `RMB-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Calculate total before save
reimbursementSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  }
  next();
});

export default mongoose.model('Reimbursement', reimbursementSchema);
