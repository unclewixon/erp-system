import mongoose from 'mongoose';

const leaveRequestSchema = new mongoose.Schema({
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
  },

  // Leave Period
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
  },

  // Half Day Options
  isHalfDay: {
    type: Boolean,
    default: false,
  },
  halfDayType: {
    type: String,
    enum: ['first_half', 'second_half'],
  },

  // Duration
  totalDays: {
    type: Number,
    required: true,
    min: 0.5,
  },
  workingDays: {
    type: Number,
    required: true,
    min: 0.5,
  },

  // Request Details
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true,
  },

  // Emergency Contact During Leave
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String,
  },

  // Handover Details
  handover: {
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    notes: String,
  },

  // Documents
  documents: [{
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now },
  }],

  // Status
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected', 'cancelled', 'withdrawn'],
    default: 'pending',
    index: true,
  },

  // Approval Workflow
  approvalFlow: [{
    level: Number,
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    comments: String,
    actionAt: Date,
  }],

  // Current Approver
  currentApprover: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // Final Approval/Rejection
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  rejectedAt: Date,
  rejectionReason: String,

  // Cancellation
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  cancelledAt: Date,
  cancellationReason: String,

  // Application Details
  appliedAt: {
    type: Date,
    default: Date.now,
  },

  // Year for reporting
  year: {
    type: Number,
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
leaveRequestSchema.index({ tenant: 1, employee: 1, startDate: 1 });
leaveRequestSchema.index({ tenant: 1, status: 1 });
leaveRequestSchema.index({ tenant: 1, currentApprover: 1, status: 1 });

// Calculate working days before saving
leaveRequestSchema.pre('save', function(next) {
  if (!this.year) {
    this.year = new Date(this.startDate).getFullYear();
  }
  next();
});

// Virtual for duration display
leaveRequestSchema.virtual('durationDisplay').get(function() {
  if (this.isHalfDay) {
    return `Half Day (${this.halfDayType === 'first_half' ? 'Morning' : 'Afternoon'})`;
  }
  return `${this.totalDays} day${this.totalDays > 1 ? 's' : ''}`;
});

leaveRequestSchema.set('toJSON', { virtuals: true });
leaveRequestSchema.set('toObject', { virtuals: true });

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);

export default LeaveRequest;
