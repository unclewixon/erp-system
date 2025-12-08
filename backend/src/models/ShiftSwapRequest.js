import mongoose from 'mongoose';

const shiftSwapRequestSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  // Employee requesting the swap
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  // Employee to swap with
  swapWith: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  // The original schedule of the requester
  requesterSchedule: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeShiftSchedule',
    required: true,
  },
  // The schedule of the swap target
  targetSchedule: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeShiftSchedule',
    required: true,
  },
  // Dates being swapped
  requesterDate: {
    type: Date,
    required: true,
  },
  targetDate: {
    type: Date,
    required: true,
  },
  // Reason for swap
  reason: {
    type: String,
    required: [true, 'Reason for swap request is required'],
    trim: true,
  },
  // Status workflow
  status: {
    type: String,
    enum: ['pending_colleague', 'pending_admin', 'approved', 'rejected', 'cancelled'],
    default: 'pending_colleague',
  },
  // Colleague (swap target) response
  colleagueResponse: {
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
    respondedAt: Date,
    comment: String,
  },
  // Admin approval
  adminApproval: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    comment: String,
  },
  // Cancellation details
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  cancelledAt: Date,
  cancellationReason: String,
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
shiftSwapRequestSchema.index({ tenant: 1, requestedBy: 1 });
shiftSwapRequestSchema.index({ tenant: 1, swapWith: 1 });
shiftSwapRequestSchema.index({ tenant: 1, status: 1 });
shiftSwapRequestSchema.index({ tenant: 1, requesterDate: 1 });
shiftSwapRequestSchema.index({ tenant: 1, targetDate: 1 });

// Check if request can be cancelled
shiftSwapRequestSchema.methods.canBeCancelled = function() {
  return ['pending_colleague', 'pending_admin'].includes(this.status);
};

// Check if request is awaiting admin approval
shiftSwapRequestSchema.methods.isAwaitingAdmin = function() {
  return this.status === 'pending_admin';
};

const ShiftSwapRequest = mongoose.model('ShiftSwapRequest', shiftSwapRequestSchema);

export default ShiftSwapRequest;
