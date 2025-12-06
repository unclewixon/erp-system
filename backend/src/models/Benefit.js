import mongoose from 'mongoose';

const benefitPlanSchema = new mongoose.Schema({
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
    enum: ['health_insurance', 'life_insurance', 'pension', 'hmo', 'allowance', 'other'],
    required: true,
  },
  description: String,
  provider: {
    name: String,
    contact: String,
    email: String,
  },
  coverage: {
    employeeOnly: Boolean,
    employeeAndSpouse: Boolean,
    employeeAndChildren: Boolean,
    family: Boolean,
  },
  contribution: {
    employerAmount: { type: Number, default: 0 },
    employerPercentage: { type: Number, default: 0 },
    employeeAmount: { type: Number, default: 0 },
    employeePercentage: { type: Number, default: 0 },
    contributionType: {
      type: String,
      enum: ['fixed', 'percentage', 'mixed'],
      default: 'fixed',
    },
  },
  eligibility: {
    minServiceMonths: { type: Number, default: 0 },
    employmentTypes: [String],
    departments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    }],
    designations: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Designation',
    }],
    salaryGrades: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalaryGrade',
    }],
  },
  enrollmentPeriod: {
    startDate: Date,
    endDate: Date,
    isOpenEnrollment: { type: Boolean, default: false },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

benefitPlanSchema.index({ tenant: 1, code: 1 }, { unique: true });

const employeeBenefitSchema = new mongoose.Schema({
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
  benefitPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BenefitPlan',
    required: true,
  },
  enrollmentDate: {
    type: Date,
    required: true,
  },
  effectiveDate: {
    type: Date,
    required: true,
  },
  endDate: Date,
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'terminated', 'expired'],
    default: 'pending',
  },
  coverageType: {
    type: String,
    enum: ['employee_only', 'employee_spouse', 'employee_children', 'family'],
    default: 'employee_only',
  },
  dependents: [{
    name: String,
    relationship: String,
    dateOfBirth: Date,
    gender: String,
  }],
  contribution: {
    employerAmount: Number,
    employeeAmount: Number,
  },
  documents: [{
    name: String,
    url: String,
    uploadedAt: Date,
  }],
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  notes: String,
}, {
  timestamps: true,
});

employeeBenefitSchema.index({ tenant: 1, employee: 1 });
employeeBenefitSchema.index({ tenant: 1, benefitPlan: 1 });

export const BenefitPlan = mongoose.model('BenefitPlan', benefitPlanSchema);
export const EmployeeBenefit = mongoose.model('EmployeeBenefit', employeeBenefitSchema);
