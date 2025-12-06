import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: true,
  },
  description: String,
  category: {
    type: String,
    enum: ['performance', 'development', 'project', 'learning', 'other'],
    default: 'performance',
  },
  type: {
    type: String,
    enum: ['individual', 'team', 'department', 'organization'],
    default: 'individual',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  startDate: {
    type: Date,
    required: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  completedDate: Date,
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'on_hold', 'completed', 'cancelled'],
    default: 'not_started',
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  keyResults: [{
    title: String,
    target: Number,
    current: { type: Number, default: 0 },
    unit: String,
    weight: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['pending', 'achieved', 'missed'],
      default: 'pending',
    },
  }],
  milestones: [{
    title: String,
    dueDate: Date,
    completedDate: Date,
    status: {
      type: String,
      enum: ['pending', 'completed', 'missed'],
      default: 'pending',
    },
  }],
  alignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
  },
  reviewCycle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReviewCycle',
  },
  weight: {
    type: Number,
    default: 1,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  comments: [{
    content: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

goalSchema.index({ tenant: 1, employee: 1 });
goalSchema.index({ tenant: 1, status: 1 });
goalSchema.index({ tenant: 1, reviewCycle: 1 });

const reviewCycleSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['annual', 'semi_annual', 'quarterly', 'monthly', 'probation', 'project'],
    default: 'annual',
  },
  year: {
    type: Number,
    required: true,
  },
  period: {
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
  },
  phases: {
    goalSetting: {
      startDate: Date,
      endDate: Date,
    },
    selfReview: {
      startDate: Date,
      endDate: Date,
    },
    managerReview: {
      startDate: Date,
      endDate: Date,
    },
    calibration: {
      startDate: Date,
      endDate: Date,
    },
    feedback: {
      startDate: Date,
      endDate: Date,
    },
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'in_review', 'calibration', 'completed', 'closed'],
    default: 'draft',
  },
  ratingScale: {
    type: {
      type: String,
      enum: ['numeric', 'descriptive'],
      default: 'numeric',
    },
    min: { type: Number, default: 1 },
    max: { type: Number, default: 5 },
    labels: [{
      value: Number,
      label: String,
      description: String,
    }],
  },
  settings: {
    selfReviewRequired: { type: Boolean, default: true },
    peerReviewEnabled: { type: Boolean, default: false },
    goalsRequired: { type: Boolean, default: true },
    minGoals: { type: Number, default: 3 },
    maxGoals: { type: Number, default: 10 },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

reviewCycleSchema.index({ tenant: 1, year: 1, type: 1 });

const performanceReviewSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  reviewCycle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReviewCycle',
    required: true,
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'self_review', 'manager_review', 'calibration', 'completed', 'acknowledged'],
    default: 'pending',
  },
  selfReview: {
    goals: [{
      goal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Goal',
      },
      rating: Number,
      achievements: String,
      challenges: String,
    }],
    competencies: [{
      name: String,
      rating: Number,
      comments: String,
    }],
    overallComments: String,
    achievements: [String],
    areasOfImprovement: [String],
    trainingNeeds: [String],
    careerAspirations: String,
    submittedAt: Date,
  },
  managerReview: {
    goals: [{
      goal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Goal',
      },
      rating: Number,
      comments: String,
    }],
    competencies: [{
      name: String,
      rating: Number,
      comments: String,
    }],
    overallRating: Number,
    strengths: [String],
    areasOfImprovement: [String],
    recommendations: String,
    promotionRecommendation: {
      type: String,
      enum: ['not_ready', 'ready_next_cycle', 'ready_now', 'high_potential'],
    },
    developmentPlan: String,
    submittedAt: Date,
  },
  calibratedRating: Number,
  calibrationNotes: String,
  calibratedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  calibratedAt: Date,
  finalRating: Number,
  feedback: {
    content: String,
    deliveredAt: Date,
    acknowledgedAt: Date,
  },
  peerReviews: [{
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    rating: Number,
    strengths: [String],
    areasOfImprovement: [String],
    comments: String,
    submittedAt: Date,
  }],
  notes: String,
}, {
  timestamps: true,
});

performanceReviewSchema.index({ tenant: 1, reviewCycle: 1, employee: 1 }, { unique: true });
performanceReviewSchema.index({ tenant: 1, employee: 1 });

export const Goal = mongoose.model('Goal', goalSchema);
export const ReviewCycle = mongoose.model('ReviewCycle', reviewCycleSchema);
export const PerformanceReview = mongoose.model('PerformanceReview', performanceReviewSchema);
