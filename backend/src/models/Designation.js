import mongoose from 'mongoose';

const designationSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Designation name is required'],
    trim: true,
  },
  code: {
    type: String,
    required: [true, 'Designation code is required'],
    uppercase: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  level: {
    type: Number,
    default: 1, // 1 = Entry, 2 = Junior, 3 = Mid, 4 = Senior, 5 = Lead, 6 = Manager, 7 = Director, 8 = Executive
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null,
  },
  salaryGrade: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
  },
  responsibilities: [{
    type: String,
    trim: true,
  }],
  requirements: [{
    type: String,
    trim: true,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Compound unique index for code per tenant
designationSchema.index({ tenant: 1, code: 1 }, { unique: true });

// Virtual for employee count
designationSchema.virtual('employeeCount', {
  ref: 'Employee',
  localField: '_id',
  foreignField: 'designation',
  count: true,
});

designationSchema.set('toJSON', { virtuals: true });
designationSchema.set('toObject', { virtuals: true });

const Designation = mongoose.model('Designation', designationSchema);

export default Designation;
