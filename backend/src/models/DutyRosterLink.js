import mongoose from 'mongoose';
import crypto from 'crypto';

const dutyRosterLinkSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
  },
  // The HOD who will fill the roster (from department.head)
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  // Unique token for the link
  token: {
    type: String,
    required: true,
    default: () => crypto.randomBytes(32).toString('hex'),
  },
  // Month and year for the roster
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
  // Link expiry
  expiresAt: {
    type: Date,
    required: true,
  },
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'expired'],
    default: 'pending',
  },
  // When the HOD started filling
  startedAt: {
    type: Date,
  },
  // When the HOD completed filling
  completedAt: {
    type: Date,
  },
  // Created by admin
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Notes for the HOD
  notes: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Compound index for unique roster link per department/month/year
dutyRosterLinkSchema.index({ tenant: 1, department: 1, month: 1, year: 1 }, { unique: true });

// Index for token lookup
dutyRosterLinkSchema.index({ token: 1 });

// Check if link is expired
dutyRosterLinkSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Check if link is valid (not expired and active)
dutyRosterLinkSchema.methods.isValid = function() {
  return this.isActive && !this.isExpired() && this.status !== 'expired';
};

// Pre-save hook to auto-expire
dutyRosterLinkSchema.pre('save', function(next) {
  if (this.isExpired() && this.status === 'pending') {
    this.status = 'expired';
  }
  next();
});

const DutyRosterLink = mongoose.model('DutyRosterLink', dutyRosterLinkSchema);

export default DutyRosterLink;
