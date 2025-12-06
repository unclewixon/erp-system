import mongoose from 'mongoose';

const onboardingTaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  category: {
    type: String,
    enum: ['documentation', 'training', 'equipment', 'access', 'introduction', 'other'],
    default: 'other',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  dueDate: Date,
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'skipped'],
    default: 'pending',
  },
  completedAt: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  notes: String,
  order: {
    type: Number,
    default: 0,
  },
});

const onboardingSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  expectedEndDate: Date,
  actualEndDate: Date,
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'cancelled'],
    default: 'not_started',
  },
  tasks: [onboardingTaskSchema],
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  welcomeKit: {
    sent: { type: Boolean, default: false },
    sentAt: Date,
    items: [String],
  },
  documents: [{
    name: String,
    type: String,
    status: {
      type: String,
      enum: ['pending', 'submitted', 'verified', 'rejected'],
      default: 'pending',
    },
    submittedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

onboardingSchema.index({ tenant: 1, employee: 1 });
onboardingSchema.index({ tenant: 1, status: 1 });

// Onboarding template for reuse
const onboardingTemplateSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: String,
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  designation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation',
  },
  tasks: [{
    title: String,
    description: String,
    category: String,
    defaultAssigneeRole: String,
    daysFromStart: Number,
    order: Number,
  }],
  documents: [{
    name: String,
    type: String,
    required: Boolean,
  }],
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

export const Onboarding = mongoose.model('Onboarding', onboardingSchema);
export const OnboardingTemplate = mongoose.model('OnboardingTemplate', onboardingTemplateSchema);
