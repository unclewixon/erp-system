import mongoose from 'mongoose';

const leaveTypeSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Leave type name is required'],
    trim: true,
  },
  code: {
    type: String,
    required: [true, 'Leave type code is required'],
    uppercase: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },

  // Leave Allocation
  defaultDays: {
    type: Number,
    default: 0,
    min: 0,
  },
  maxDays: {
    type: Number,
    default: 30,
    min: 0,
  },

  // Accrual Settings
  accrual: {
    enabled: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      default: 'monthly',
    },
    daysPerPeriod: { type: Number, default: 0 },
  },

  // Carry Forward Settings
  carryForward: {
    enabled: { type: Boolean, default: false },
    maxDays: { type: Number, default: 0 },
    expiryMonths: { type: Number, default: 3 }, // Carried days expire after X months
  },

  // Encashment Settings
  encashment: {
    enabled: { type: Boolean, default: false },
    maxDays: { type: Number, default: 0 },
    ratePercentage: { type: Number, default: 100 }, // % of daily salary
  },

  // Eligibility
  eligibility: {
    minServiceMonths: { type: Number, default: 0 }, // Minimum service required
    gender: {
      type: String,
      enum: ['all', 'male', 'female'],
      default: 'all',
    },
    employmentTypes: [{
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'intern', 'consultant'],
    }],
    departments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    }],
    designations: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Designation',
    }],
  },

  // Rules
  rules: {
    requiresApproval: { type: Boolean, default: true },
    minDaysNotice: { type: Number, default: 0 },
    maxConsecutiveDays: { type: Number, default: 0 }, // 0 = no limit
    canBeHalfDay: { type: Boolean, default: true },
    includesToday: { type: Boolean, default: false }, // Can apply for today
    requiresDocument: { type: Boolean, default: false },
    documentAfterDays: { type: Number, default: 2 }, // Document required if leave > X days
    clubbingAllowed: { type: Boolean, default: true }, // Can be combined with other leave types
    sandwichRule: { type: Boolean, default: false }, // Count weekends/holidays between leaves
  },

  // Appearance
  color: {
    type: String,
    default: '#3b82f6',
  },

  isPaid: {
    type: Boolean,
    default: true,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  sortOrder: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Compound unique index for code per tenant
leaveTypeSchema.index({ tenant: 1, code: 1 }, { unique: true });

const LeaveType = mongoose.model('LeaveType', leaveTypeSchema);

export default LeaveType;
