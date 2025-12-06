import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Shift name is required'],
    trim: true,
  },
  code: {
    type: String,
    required: [true, 'Shift code is required'],
    uppercase: true,
    trim: true,
  },

  // Timing
  startTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  },
  endTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  },

  // Grace Period
  gracePeriod: {
    lateArrival: { type: Number, default: 15 }, // minutes
    earlyDeparture: { type: Number, default: 0 },
  },

  // Half Day Timing
  halfDay: {
    firstHalfEnd: { type: String, default: '13:00' },
    secondHalfStart: { type: String, default: '14:00' },
  },

  // Break Time
  breakTime: {
    enabled: { type: Boolean, default: true },
    startTime: { type: String, default: '13:00' },
    endTime: { type: String, default: '14:00' },
    duration: { type: Number, default: 60 }, // minutes
    isPaid: { type: Boolean, default: false },
  },

  // Working Hours
  workingHours: {
    type: Number,
    default: 8,
  },

  // Night Shift
  isNightShift: {
    type: Boolean,
    default: false,
  },

  // Flexibility
  isFlexible: {
    type: Boolean,
    default: false,
  },
  flexibleWindow: {
    startFrom: String, // e.g., "08:00"
    startTo: String,   // e.g., "10:00"
  },

  // Overtime Rules
  overtime: {
    enabled: { type: Boolean, default: true },
    minMinutes: { type: Number, default: 30 }, // Minimum OT to count
    maxHoursPerDay: { type: Number, default: 4 },
    requiresApproval: { type: Boolean, default: true },
    multiplier: { type: Number, default: 1.5 }, // 1.5x pay
  },

  // Applicable Days
  workingDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  }],

  // Color for UI
  color: {
    type: String,
    default: '#3b82f6',
  },

  isDefault: {
    type: Boolean,
    default: false,
  },

  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Compound unique index
shiftSchema.index({ tenant: 1, code: 1 }, { unique: true });

const Shift = mongoose.model('Shift', shiftSchema);

export default Shift;
