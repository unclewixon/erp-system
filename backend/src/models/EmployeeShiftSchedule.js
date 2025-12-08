import mongoose from 'mongoose';

const employeeShiftScheduleSchema = new mongoose.Schema({
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
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
  },
  // The shift assigned
  shift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift',
    required: true,
  },
  // Specific date for this schedule
  date: {
    type: Date,
    required: true,
  },
  // Month and year for easier querying
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
  // Day off indicator
  isDayOff: {
    type: Boolean,
    default: false,
  },
  // Special designation for the day
  dayType: {
    type: String,
    enum: ['regular', 'day_off', 'public_holiday', 'leave', 'sick_leave'],
    default: 'regular',
  },
  // Override times (if different from shift defaults)
  customTiming: {
    startTime: String,
    endTime: String,
  },
  // Notes for this specific schedule
  notes: {
    type: String,
    trim: true,
  },
  // Who created this schedule entry
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // Reference to the duty roster link that created this
  dutyRosterLink: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DutyRosterLink',
  },
  // For swap tracking
  isSwapped: {
    type: Boolean,
    default: false,
  },
  swappedWith: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  swapRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShiftSwapRequest',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Compound index for unique schedule per employee/date
employeeShiftScheduleSchema.index({ tenant: 1, employee: 1, date: 1 }, { unique: true });

// Index for querying by department and month/year
employeeShiftScheduleSchema.index({ tenant: 1, department: 1, month: 1, year: 1 });

// Index for querying employee schedules
employeeShiftScheduleSchema.index({ tenant: 1, employee: 1, month: 1, year: 1 });

// Virtual to get the day of week
employeeShiftScheduleSchema.virtual('dayOfWeek').get(function() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date(this.date).getDay()];
});

employeeShiftScheduleSchema.set('toJSON', { virtuals: true });
employeeShiftScheduleSchema.set('toObject', { virtuals: true });

const EmployeeShiftSchedule = mongoose.model('EmployeeShiftSchedule', employeeShiftScheduleSchema);

export default EmployeeShiftSchedule;
