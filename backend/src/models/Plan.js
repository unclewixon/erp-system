import mongoose from 'mongoose';

const featureSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['hr', 'finance', 'inventory', 'procurement', 'communication', 'workflow', 'other'],
    default: 'other',
  },
  description: String,
  order: {
    type: Number,
    default: 0,
  },
});

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  description: {
    type: String,
    default: '',
  },
  price: {
    monthly: {
      type: Number,
      required: true,
      default: 0,
    },
    yearly: {
      type: Number,
      default: 0,
    },
  },
  currency: {
    type: String,
    default: 'NGN',
  },
  employeeRange: {
    min: {
      type: Number,
      required: true,
      default: 1,
    },
    max: {
      type: Number,
      default: null, // null means unlimited
    },
  },
  maxBranches: {
    type: Number,
    default: 1,
  },
  features: [{
    featureSlug: String,
    included: {
      type: Boolean,
      default: false,
    },
  }],
  isPopular: {
    type: Boolean,
    default: false,
  },
  isEnterprise: {
    type: Boolean,
    default: false,
  },
  order: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  trialDays: {
    type: Number,
    default: 14,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save hook to generate slug
planSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }
  this.updatedAt = new Date();
  next();
});

// Static method to get all features list
planSchema.statics.getAllFeatures = function() {
  return [
    // HR Features
    { name: 'Employee Management', slug: 'employee-management', category: 'hr' },
    { name: 'Leave Management', slug: 'leave-management', category: 'hr' },
    { name: 'Attendance Management', slug: 'attendance-management', category: 'hr' },
    { name: 'Department Management', slug: 'department-management', category: 'hr' },
    { name: 'Branch Management', slug: 'branch-management', category: 'hr' },
    { name: 'Payroll', slug: 'payroll', category: 'hr' },
    { name: 'Recruitment', slug: 'recruitment', category: 'hr' },
    { name: 'On-boarding', slug: 'onboarding', category: 'hr' },
    { name: 'Performance Appraisal', slug: 'performance', category: 'hr' },
    { name: 'Training Management', slug: 'training', category: 'hr' },
    { name: 'Benefits Management', slug: 'benefits', category: 'hr' },
    { name: 'Loan Management', slug: 'loans', category: 'hr' },
    { name: 'Query Management', slug: 'queries', category: 'hr' },

    // Finance Features
    { name: 'Expense Management', slug: 'expenses', category: 'finance' },
    { name: 'Reimbursement', slug: 'reimbursement', category: 'finance' },
    { name: 'Wallet', slug: 'wallet', category: 'finance' },
    { name: 'Bill Payment', slug: 'bills', category: 'finance' },
    { name: 'Invoicing', slug: 'invoicing', category: 'finance' },
    { name: 'Book Keeping', slug: 'bookkeeping', category: 'finance' },
    { name: 'Financial Reporting', slug: 'financial-reporting', category: 'finance' },
    { name: 'Vendor Management', slug: 'vendors', category: 'finance' },

    // Inventory & Assets
    { name: 'Inventory', slug: 'inventory', category: 'inventory' },
    { name: 'Asset Management', slug: 'assets', category: 'inventory' },
    { name: 'Purchase Expenses', slug: 'purchase-expenses', category: 'inventory' },

    // Procurement
    { name: 'Procurement', slug: 'procurement', category: 'procurement' },
    { name: 'Purchase Orders', slug: 'purchase-orders', category: 'procurement' },

    // Communication & Workflow
    { name: 'Work Flow Approval', slug: 'workflow-approval', category: 'workflow' },
    { name: 'Approval Matrix', slug: 'approval-matrix', category: 'workflow' },
    { name: 'Task Management', slug: 'tasks', category: 'workflow' },
    { name: 'Events', slug: 'events', category: 'communication' },
    { name: 'Messaging', slug: 'messaging', category: 'communication' },
    { name: 'SMS Marketing', slug: 'sms-marketing', category: 'communication' },
    { name: 'Announcements', slug: 'announcements', category: 'communication' },
  ];
};

// Create default plans
planSchema.statics.createDefaultPlans = async function() {
  const Plan = this;
  const existingPlans = await Plan.countDocuments();

  if (existingPlans > 0) return;

  const allFeatures = Plan.getAllFeatures();

  const defaultPlans = [
    {
      name: 'SME Plan',
      slug: 'sme',
      description: 'Perfect for small businesses just getting started',
      price: { monthly: 5000, yearly: 50000 },
      employeeRange: { min: 1, max: 5 },
      maxBranches: 1,
      order: 1,
      features: allFeatures.map(f => ({
        featureSlug: f.slug,
        included: ['employee-management', 'attendance-management', 'department-management',
                   'branch-management', 'expenses', 'bills', 'workflow-approval',
                   'wallet', 'approval-matrix'].includes(f.slug),
      })),
    },
    {
      name: 'Basic Plan',
      slug: 'basic',
      description: 'For growing teams that need more features',
      price: { monthly: 10000, yearly: 100000 },
      employeeRange: { min: 6, max: 10 },
      maxBranches: 2,
      order: 2,
      features: allFeatures.map(f => ({
        featureSlug: f.slug,
        included: ['employee-management', 'leave-management', 'attendance-management',
                   'department-management', 'branch-management', 'expenses', 'bills',
                   'workflow-approval', 'wallet', 'approval-matrix', 'reimbursement',
                   'invoicing'].includes(f.slug),
      })),
    },
    {
      name: 'Growth Plan',
      slug: 'growth',
      description: 'For established businesses ready to scale',
      price: { monthly: 25000, yearly: 250000 },
      employeeRange: { min: 11, max: 25 },
      maxBranches: 5,
      order: 3,
      isPopular: true,
      features: allFeatures.map(f => ({
        featureSlug: f.slug,
        included: ['employee-management', 'leave-management', 'attendance-management',
                   'department-management', 'branch-management', 'expenses', 'bills',
                   'workflow-approval', 'wallet', 'approval-matrix', 'reimbursement',
                   'invoicing', 'procurement', 'inventory', 'events', 'onboarding',
                   'loans', 'bookkeeping'].includes(f.slug),
      })),
    },
    {
      name: 'Premium Plan',
      slug: 'premium',
      description: 'Full-featured solution for medium enterprises',
      price: { monthly: 50000, yearly: 500000 },
      employeeRange: { min: 26, max: 50 },
      maxBranches: 10,
      order: 4,
      features: allFeatures.map(f => ({
        featureSlug: f.slug,
        included: ['employee-management', 'leave-management', 'attendance-management',
                   'department-management', 'branch-management', 'expenses', 'bills',
                   'workflow-approval', 'wallet', 'approval-matrix', 'reimbursement',
                   'invoicing', 'procurement', 'inventory', 'events', 'onboarding',
                   'loans', 'bookkeeping', 'payroll', 'recruitment', 'performance',
                   'training', 'benefits', 'assets', 'purchase-orders', 'tasks',
                   'financial-reporting', 'vendors', 'queries'].includes(f.slug),
      })),
    },
    {
      name: 'Enterprise Plan',
      slug: 'enterprise',
      description: 'Unlimited access for large organizations',
      price: { monthly: 100000, yearly: 1000000 },
      employeeRange: { min: 51, max: null },
      maxBranches: null,
      order: 5,
      isEnterprise: true,
      features: allFeatures.map(f => ({
        featureSlug: f.slug,
        included: true, // All features included
      })),
    },
  ];

  await Plan.insertMany(defaultPlans);
  console.log('Default plans created');
};

const Plan = mongoose.model('Plan', planSchema);

export default Plan;
