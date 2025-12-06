import mongoose from 'mongoose';

const loanTypeSchema = new mongoose.Schema({
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
  maxAmount: {
    type: Number,
    required: true,
  },
  maxAmountMultiplier: {
    type: Number,
    default: 0, // e.g., 3 = 3x monthly salary
  },
  interestRate: {
    type: Number,
    default: 0,
  },
  interestType: {
    type: String,
    enum: ['flat', 'reducing', 'none'],
    default: 'flat',
  },
  minTenureMonths: {
    type: Number,
    default: 1,
  },
  maxTenureMonths: {
    type: Number,
    required: true,
  },
  eligibility: {
    minServiceMonths: { type: Number, default: 6 },
    minSalary: Number,
    employmentTypes: [String],
  },
  requiresGuarantor: {
    type: Boolean,
    default: false,
  },
  maxConcurrentLoans: {
    type: Number,
    default: 1,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

loanTypeSchema.index({ tenant: 1, code: 1 }, { unique: true });

const loanRepaymentSchema = new mongoose.Schema({
  dueDate: Date,
  amount: Number,
  principal: Number,
  interest: Number,
  status: {
    type: String,
    enum: ['pending', 'paid', 'partial', 'overdue', 'waived'],
    default: 'pending',
  },
  paidAmount: { type: Number, default: 0 },
  paidDate: Date,
  payrollId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payroll',
  },
  notes: String,
});

const loanSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  loanNumber: {
    type: String,
    required: true,
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  loanType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LoanType',
    required: true,
  },
  requestedAmount: {
    type: Number,
    required: true,
  },
  approvedAmount: Number,
  disbursedAmount: Number,
  interestRate: {
    type: Number,
    default: 0,
  },
  tenureMonths: {
    type: Number,
    required: true,
  },
  monthlyDeduction: Number,
  purpose: String,
  status: {
    type: String,
    enum: ['draft', 'pending', 'under_review', 'approved', 'rejected', 'disbursed', 'active', 'completed', 'defaulted', 'cancelled'],
    default: 'draft',
  },
  applicationDate: {
    type: Date,
    default: Date.now,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  rejectionReason: String,
  disbursementDate: Date,
  disbursementMethod: {
    type: String,
    enum: ['bank_transfer', 'cheque', 'cash'],
    default: 'bank_transfer',
  },
  disbursementReference: String,
  repaymentStartDate: Date,
  repayments: [loanRepaymentSchema],
  totalRepaid: {
    type: Number,
    default: 0,
  },
  outstandingBalance: Number,
  guarantors: [{
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedAt: Date,
  }],
  documents: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: Date,
  }],
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

loanSchema.index({ tenant: 1, loanNumber: 1 }, { unique: true });
loanSchema.index({ tenant: 1, employee: 1 });
loanSchema.index({ tenant: 1, status: 1 });

// Auto-generate loan number
loanSchema.pre('save', async function(next) {
  if (this.isNew && !this.loanNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.loanNumber = `LN-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Calculate repayment schedule
loanSchema.methods.calculateRepayments = function() {
  const principal = this.approvedAmount || this.requestedAmount;
  const rate = this.interestRate / 100 / 12;
  const tenure = this.tenureMonths;

  let monthlyPayment;
  if (this.interestRate === 0 || rate === 0) {
    monthlyPayment = principal / tenure;
  } else {
    monthlyPayment = principal * (rate * Math.pow(1 + rate, tenure)) / (Math.pow(1 + rate, tenure) - 1);
  }

  this.monthlyDeduction = Math.round(monthlyPayment * 100) / 100;
  this.outstandingBalance = principal;

  const repayments = [];
  let balance = principal;
  const startDate = this.repaymentStartDate || new Date();

  for (let i = 0; i < tenure; i++) {
    const interest = balance * rate;
    const principalPortion = monthlyPayment - interest;

    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i + 1);

    repayments.push({
      dueDate,
      amount: Math.round(monthlyPayment * 100) / 100,
      principal: Math.round(principalPortion * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      status: 'pending',
    });

    balance -= principalPortion;
  }

  this.repayments = repayments;
  return this;
};

export const LoanType = mongoose.model('LoanType', loanTypeSchema);
export const Loan = mongoose.model('Loan', loanSchema);
