import mongoose from 'mongoose';
import { EMPLOYEE_STATUS, EMPLOYMENT_TYPE, GENDER, MARITAL_STATUS } from '../config/constants.js';

const employeeSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    trim: true,
  },

  // Personal Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
  },
  middleName: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  alternatePhone: {
    type: String,
    trim: true,
  },
  dateOfBirth: {
    type: Date,
  },
  gender: {
    type: String,
    enum: Object.values(GENDER),
  },
  maritalStatus: {
    type: String,
    enum: Object.values(MARITAL_STATUS),
  },
  nationality: {
    type: String,
    trim: true,
  },
  stateOfOrigin: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String,
    default: null,
  },

  // Address
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
  },

  // Emergency Contact
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
    email: String,
    address: String,
  },

  // Employment Details
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
  },
  designation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation',
    required: true,
  },
  reportsTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null,
  },
  employmentType: {
    type: String,
    enum: Object.values(EMPLOYMENT_TYPE),
    default: EMPLOYMENT_TYPE.FULL_TIME,
  },
  status: {
    type: String,
    enum: Object.values(EMPLOYEE_STATUS),
    default: EMPLOYEE_STATUS.ACTIVE,
  },
  hireDate: {
    type: Date,
    required: [true, 'Hire date is required'],
  },
  confirmationDate: {
    type: Date,
  },
  terminationDate: {
    type: Date,
  },
  probationEndDate: {
    type: Date,
  },

  // Work Schedule
  workSchedule: {
    shiftStart: { type: String, default: '09:00' },
    shiftEnd: { type: String, default: '17:00' },
    workingDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    }],
  },

  // Salary & Banking
  salary: {
    basic: { type: Number, default: 0 },
    currency: { type: String, default: 'NGN' },
    paymentFrequency: {
      type: String,
      enum: ['weekly', 'bi-weekly', 'monthly'],
      default: 'monthly',
    },
  },
  bankDetails: {
    bankName: String,
    accountNumber: String,
    accountName: String,
    sortCode: String,
  },

  // Tax & Statutory
  taxId: {
    type: String,
    trim: true,
  },
  pensionId: {
    type: String,
    trim: true,
  },
  nhfId: {
    type: String,
    trim: true,
  },

  // Documents
  documents: [{
    name: String,
    type: {
      type: String,
      enum: ['resume', 'contract', 'id_card', 'certificate', 'passport', 'other'],
    },
    url: String,
    uploadedAt: { type: Date, default: Date.now },
  }],

  // Qualifications
  education: [{
    institution: String,
    degree: String,
    field: String,
    startYear: Number,
    endYear: Number,
    grade: String,
  }],

  certifications: [{
    name: String,
    issuer: String,
    issueDate: Date,
    expiryDate: Date,
    documentUrl: String,
  }],

  skills: [{
    name: String,
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    },
  }],

  // Previous Employment
  previousEmployment: [{
    company: String,
    position: String,
    startDate: Date,
    endDate: Date,
    responsibilities: String,
    reasonForLeaving: String,
  }],

  // Notes
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

// Compound unique index for employeeId per tenant
employeeSchema.index({ tenant: 1, employeeId: 1 }, { unique: true });

// Full name virtual
employeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.middleName ? this.middleName + ' ' : ''}${this.lastName}`;
});

// Years of service virtual
employeeSchema.virtual('yearsOfService').get(function() {
  if (!this.hireDate) return 0;
  const now = new Date();
  const diff = now - this.hireDate;
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
});

// Direct reports virtual
employeeSchema.virtual('directReports', {
  ref: 'Employee',
  localField: '_id',
  foreignField: 'reportsTo',
});

employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;
