import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
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
  date: {
    type: Date,
    required: true,
    index: true,
  },

  // Clock In Details
  clockIn: {
    time: Date,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: [Number], // [longitude, latitude]
    },
    method: {
      type: String,
      enum: ['web', 'mobile', 'biometric', 'manual'],
      default: 'web',
    },
    withinGeofence: {
      type: Boolean,
      default: true,
    },
    ipAddress: String,
    deviceInfo: String,
    notes: String,
  },

  // Clock Out Details
  clockOut: {
    time: Date,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: [Number],
    },
    method: {
      type: String,
      enum: ['web', 'mobile', 'biometric', 'manual'],
      default: 'web',
    },
    withinGeofence: {
      type: Boolean,
      default: true,
    },
    ipAddress: String,
    deviceInfo: String,
    notes: String,
  },

  // Break Times
  breaks: [{
    startTime: Date,
    endTime: Date,
    type: {
      type: String,
      enum: ['lunch', 'tea', 'prayer', 'other'],
      default: 'lunch',
    },
    duration: Number, // in minutes
  }],

  // Work Hours Calculation
  workHours: {
    scheduled: { type: Number, default: 8 }, // Expected hours
    actual: { type: Number, default: 0 },    // Actual worked hours
    overtime: { type: Number, default: 0 },   // Overtime hours
    breakTime: { type: Number, default: 0 },  // Total break time
  },

  // Status Flags
  status: {
    type: String,
    enum: ['present', 'absent', 'half_day', 'late', 'early_leave', 'on_leave', 'holiday', 'weekend'],
    default: 'present',
  },
  isLate: {
    type: Boolean,
    default: false,
  },
  lateMinutes: {
    type: Number,
    default: 0,
  },
  isEarlyLeave: {
    type: Boolean,
    default: false,
  },
  earlyLeaveMinutes: {
    type: Number,
    default: 0,
  },

  // Overtime
  overtime: {
    requested: { type: Number, default: 0 },
    approved: { type: Number, default: 0 },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },

  // Regularization (for manual entries/corrections)
  regularization: {
    isRegularized: { type: Boolean, default: false },
    reason: String,
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    requestedAt: Date,
    approvedAt: Date,
  },

  // Shift Information
  shift: {
    name: String,
    startTime: String,
    endTime: String,
  },

  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
  },

  notes: String,
}, {
  timestamps: true,
});

// Compound index for unique attendance per employee per day
attendanceSchema.index({ tenant: 1, employee: 1, date: 1 }, { unique: true });

// Geospatial indexes
attendanceSchema.index({ 'clockIn.location': '2dsphere' });
attendanceSchema.index({ 'clockOut.location': '2dsphere' });

// Calculate work hours before saving
attendanceSchema.pre('save', function(next) {
  if (this.clockIn?.time && this.clockOut?.time) {
    const clockIn = new Date(this.clockIn.time);
    const clockOut = new Date(this.clockOut.time);

    // Calculate total minutes worked
    let totalMinutes = (clockOut - clockIn) / (1000 * 60);

    // Subtract break time
    const breakMinutes = this.breaks?.reduce((acc, b) => acc + (b.duration || 0), 0) || 0;
    totalMinutes -= breakMinutes;

    this.workHours.actual = Math.round((totalMinutes / 60) * 100) / 100;
    this.workHours.breakTime = breakMinutes;

    // Calculate overtime (if actual > scheduled)
    if (this.workHours.actual > this.workHours.scheduled) {
      this.workHours.overtime = Math.round((this.workHours.actual - this.workHours.scheduled) * 100) / 100;
    }
  }
  next();
});

// Virtual for formatted date
attendanceSchema.virtual('formattedDate').get(function() {
  return this.date?.toISOString().split('T')[0];
});

attendanceSchema.set('toJSON', { virtuals: true });
attendanceSchema.set('toObject', { virtuals: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
