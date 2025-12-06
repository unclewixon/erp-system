import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Branch name is required'],
    trim: true,
  },
  code: {
    type: String,
    required: [true, 'Branch code is required'],
    uppercase: true,
    trim: true,
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0],
    },
  },
  geofence: {
    enabled: {
      type: Boolean,
      default: false,
    },
    radius: {
      type: Number,
      default: 100, // meters
    },
  },
  phone: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null,
  },
  workingHours: {
    start: { type: String, default: '09:00' },
    end: { type: String, default: '17:00' },
  },
  isHeadquarters: {
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

// Compound unique index for code per tenant
branchSchema.index({ tenant: 1, code: 1 }, { unique: true });

// Geospatial index for location-based queries
branchSchema.index({ location: '2dsphere' });

// Virtual for employee count
branchSchema.virtual('employeeCount', {
  ref: 'Employee',
  localField: '_id',
  foreignField: 'branch',
  count: true,
});

branchSchema.set('toJSON', { virtuals: true });
branchSchema.set('toObject', { virtuals: true });

const Branch = mongoose.model('Branch', branchSchema);

export default Branch;
