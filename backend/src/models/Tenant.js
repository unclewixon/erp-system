import mongoose from 'mongoose';
import { SUBSCRIPTION_PLANS, MODULES } from '../config/constants.js';

const tenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Organization email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  logo: {
    type: String,
    default: null,
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
  },
  industry: {
    type: String,
    trim: true,
  },
  size: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
    default: '1-10',
  },
  subscription: {
    plan: {
      type: String,
      enum: Object.values(SUBSCRIPTION_PLANS),
      default: SUBSCRIPTION_PLANS.STARTER,
    },
    modules: [{
      type: String,
      enum: Object.values(MODULES),
    }],
    maxEmployees: {
      type: Number,
      default: 25,
    },
    maxBranches: {
      type: Number,
      default: 1,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  // Trial Information
  trial: {
    isOnTrial: {
      type: Boolean,
      default: true,
    },
    trialStartDate: {
      type: Date,
      default: Date.now,
    },
    trialEndDate: {
      type: Date,
    },
    trialDays: {
      type: Number,
      default: 3,
    },
    hasExpired: {
      type: Boolean,
      default: false,
    },
    convertedToPaid: {
      type: Boolean,
      default: false,
    },
  },
  settings: {
    timezone: {
      type: String,
      default: 'Africa/Lagos',
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY',
    },
    currency: {
      type: String,
      default: 'NGN',
    },
    workingDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    }],
    workingHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '17:00' },
    },
    fiscalYearStart: {
      type: Number,
      default: 1, // January
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Generate slug from name before saving
tenantSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // Set default modules based on plan
  if (this.isModified('subscription.plan')) {
    switch (this.subscription.plan) {
      case SUBSCRIPTION_PLANS.STARTER:
        this.subscription.modules = [MODULES.HR, MODULES.ATTENDANCE];
        this.subscription.maxEmployees = 25;
        this.subscription.maxBranches = 1;
        break;
      case SUBSCRIPTION_PLANS.PROFESSIONAL:
        this.subscription.modules = [
          MODULES.HR, MODULES.ATTENDANCE, MODULES.LEAVE,
          MODULES.PAYROLL, MODULES.PERFORMANCE
        ];
        this.subscription.maxEmployees = 100;
        this.subscription.maxBranches = 5;
        break;
      case SUBSCRIPTION_PLANS.ENTERPRISE:
        this.subscription.modules = Object.values(MODULES);
        this.subscription.maxEmployees = -1; // Unlimited
        this.subscription.maxBranches = -1;
        break;
    }
  }

  // Calculate trial end date for new tenants on trial
  if (this.isNew && this.trial.isOnTrial) {
    const trialDays = this.trial.trialDays || 3;
    const startDate = this.trial.trialStartDate || new Date();
    this.trial.trialStartDate = startDate;
    this.trial.trialEndDate = new Date(startDate.getTime() + (trialDays * 24 * 60 * 60 * 1000));
  }

  // Update trial end date if trial days changed
  if (this.isModified('trial.trialDays') && !this.isNew && this.trial.isOnTrial) {
    const startDate = this.trial.trialStartDate || new Date();
    this.trial.trialEndDate = new Date(startDate.getTime() + (this.trial.trialDays * 24 * 60 * 60 * 1000));
  }

  next();
});

// Method to check if trial has expired
tenantSchema.methods.checkTrialStatus = function() {
  if (!this.trial.isOnTrial || this.trial.convertedToPaid) {
    return { isExpired: false, daysRemaining: null };
  }

  const now = new Date();
  const endDate = new Date(this.trial.trialEndDate);
  const isExpired = now > endDate;
  const daysRemaining = isExpired ? 0 : Math.ceil((endDate - now) / (24 * 60 * 60 * 1000));

  return { isExpired, daysRemaining, endDate };
};

// Static method to update expired trials
tenantSchema.statics.updateExpiredTrials = async function() {
  const now = new Date();
  const result = await this.updateMany(
    {
      'trial.isOnTrial': true,
      'trial.hasExpired': false,
      'trial.convertedToPaid': false,
      'trial.trialEndDate': { $lt: now },
    },
    {
      $set: { 'trial.hasExpired': true },
    }
  );
  return result;
};

// Virtual for employee count
tenantSchema.virtual('employeeCount', {
  ref: 'Employee',
  localField: '_id',
  foreignField: 'tenant',
  count: true,
});

tenantSchema.set('toJSON', { virtuals: true });
tenantSchema.set('toObject', { virtuals: true });

const Tenant = mongoose.model('Tenant', tenantSchema);

export default Tenant;
