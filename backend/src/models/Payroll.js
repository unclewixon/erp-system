import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  year: {
    type: Number,
    required: true,
  },
  payPeriod: {
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
  },
  status: {
    type: String,
    enum: ['draft', 'processing', 'processed', 'approved', 'paid', 'cancelled'],
    default: 'draft',
  },
  totalEmployees: {
    type: Number,
    default: 0,
  },
  summary: {
    totalBasic: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    totalGross: { type: Number, default: 0 },
    totalNet: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  processedAt: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  paidAt: Date,
  paymentReference: String,
  notes: String,
}, {
  timestamps: true,
});

payrollSchema.index({ tenant: 1, year: 1, month: 1 }, { unique: true });

const payslipSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  payroll: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payroll',
    required: true,
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  month: {
    type: Number,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  payPeriod: {
    startDate: Date,
    endDate: Date,
  },
  employeeDetails: {
    employeeId: String,
    firstName: String,
    lastName: String,
    email: String,
    department: String,
    designation: String,
    dateOfJoining: Date,
  },
  earnings: [{
    name: String,
    code: String,
    category: String,
    amount: Number,
    isTaxable: Boolean,
  }],
  deductions: [{
    name: String,
    code: String,
    category: String,
    amount: Number,
  }],
  attendance: {
    workingDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 },
    holidays: { type: Number, default: 0 },
    overtime: { type: Number, default: 0 },
    lateDeductions: { type: Number, default: 0 },
  },
  summary: {
    basicSalary: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    grossSalary: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
  },
  bankDetails: {
    bankName: String,
    accountNumber: String,
    accountName: String,
  },
  status: {
    type: String,
    enum: ['pending', 'processed', 'paid', 'cancelled'],
    default: 'pending',
  },
  paymentDetails: {
    method: String,
    reference: String,
    paidAt: Date,
  },
  notes: String,
}, {
  timestamps: true,
});

payslipSchema.index({ tenant: 1, payroll: 1, employee: 1 }, { unique: true });
payslipSchema.index({ tenant: 1, employee: 1, year: 1, month: 1 });

export const Payroll = mongoose.model('Payroll', payrollSchema);
export const Payslip = mongoose.model('Payslip', payslipSchema);
