import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Holiday name is required'],
    trim: true,
  },
  date: {
    type: Date,
    required: [true, 'Holiday date is required'],
    index: true,
  },
  year: {
    type: Number,
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['public', 'company', 'optional', 'restricted'],
    default: 'public',
  },
  description: {
    type: String,
    trim: true,
  },

  // Applicability
  applicableTo: {
    allBranches: { type: Boolean, default: true },
    branches: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    }],
    allDepartments: { type: Boolean, default: true },
    departments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    }],
  },

  // For optional holidays
  optional: {
    isOptional: { type: Boolean, default: false },
    maxOptional: { type: Number, default: 0 }, // Max employees who can take this
  },

  isRecurring: {
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
holidaySchema.index({ tenant: 1, date: 1, name: 1 }, { unique: true });

// Set year from date before saving
holidaySchema.pre('save', function(next) {
  if (this.date) {
    this.year = new Date(this.date).getFullYear();
  }
  next();
});

const Holiday = mongoose.model('Holiday', holidaySchema);

export default Holiday;
