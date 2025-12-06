import mongoose from 'mongoose';

const salaryComponentSchema = new mongoose.Schema({
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
    enum: ['earning', 'deduction'],
    required: true,
  },
  category: {
    type: String,
    enum: ['basic', 'allowance', 'bonus', 'tax', 'insurance', 'statutory', 'other'],
    default: 'other',
  },
  calculationType: {
    type: String,
    enum: ['fixed', 'percentage', 'formula'],
    default: 'fixed',
  },
  value: {
    type: Number,
    default: 0,
  },
  percentageOf: {
    type: String,
    enum: ['basic', 'gross', 'net', 'ctc'],
  },
  formula: String,
  isTaxable: {
    type: Boolean,
    default: true,
  },
  isStatutory: {
    type: Boolean,
    default: false,
  },
  description: String,
});

const salaryGradeSchema = new mongoose.Schema({
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
  level: {
    type: Number,
    required: true,
  },
  minSalary: {
    type: Number,
    required: true,
  },
  maxSalary: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'NGN',
  },
  components: [salaryComponentSchema],
  isActive: {
    type: Boolean,
    default: true,
  },
  description: String,
}, {
  timestamps: true,
});

salaryGradeSchema.index({ tenant: 1, code: 1 }, { unique: true });

const employeeSalarySchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  salaryGrade: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryGrade',
  },
  effectiveDate: {
    type: Date,
    required: true,
  },
  endDate: Date,
  basicSalary: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'NGN',
  },
  components: [salaryComponentSchema],
  bankDetails: {
    bankName: String,
    accountNumber: String,
    accountName: String,
    branchCode: String,
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cash', 'cheque'],
    default: 'bank_transfer',
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

employeeSalarySchema.index({ tenant: 1, employee: 1, effectiveDate: -1 });

// Virtual for gross salary
employeeSalarySchema.virtual('grossSalary').get(function() {
  const earnings = this.components
    .filter(c => c.type === 'earning')
    .reduce((sum, c) => sum + (c.value || 0), 0);
  return this.basicSalary + earnings;
});

// Virtual for total deductions
employeeSalarySchema.virtual('totalDeductions').get(function() {
  return this.components
    .filter(c => c.type === 'deduction')
    .reduce((sum, c) => sum + (c.value || 0), 0);
});

// Virtual for net salary
employeeSalarySchema.virtual('netSalary').get(function() {
  return this.grossSalary - this.totalDeductions;
});

employeeSalarySchema.set('toJSON', { virtuals: true });
employeeSalarySchema.set('toObject', { virtuals: true });

export const SalaryGrade = mongoose.model('SalaryGrade', salaryGradeSchema);
export const EmployeeSalary = mongoose.model('EmployeeSalary', employeeSalarySchema);
