import mongoose from 'mongoose';

const leaveBalanceSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true,
  },
  leaveType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveType',
    required: true,
    index: true,
  },
  year: {
    type: Number,
    required: true,
    index: true,
  },

  // Balance Details
  allocated: {
    type: Number,
    default: 0,
    min: 0,
  },
  carriedForward: {
    type: Number,
    default: 0,
    min: 0,
  },
  adjustments: {
    type: Number,
    default: 0, // Can be positive or negative
  },
  used: {
    type: Number,
    default: 0,
    min: 0,
  },
  pending: {
    type: Number,
    default: 0,
    min: 0,
  },
  encashed: {
    type: Number,
    default: 0,
    min: 0,
  },
  lapsed: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Accrual tracking
  accrued: {
    type: Number,
    default: 0,
    min: 0,
  },
  lastAccrualDate: Date,

  // Adjustment History
  adjustmentHistory: [{
    amount: Number,
    reason: String,
    adjustedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    adjustedAt: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
});

// Compound unique index
leaveBalanceSchema.index({ tenant: 1, employee: 1, leaveType: 1, year: 1 }, { unique: true });

// Virtual for available balance
leaveBalanceSchema.virtual('available').get(function() {
  return this.allocated + this.carriedForward + this.adjustments + this.accrued - this.used - this.pending - this.encashed - this.lapsed;
});

// Virtual for total entitled
leaveBalanceSchema.virtual('total').get(function() {
  return this.allocated + this.carriedForward + this.adjustments + this.accrued;
});

leaveBalanceSchema.set('toJSON', { virtuals: true });
leaveBalanceSchema.set('toObject', { virtuals: true });

const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema);

export default LeaveBalance;
