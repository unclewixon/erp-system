import mongoose from 'mongoose';

const trainingProgramSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  description: String,
  category: {
    type: String,
    enum: ['technical', 'soft_skills', 'leadership', 'compliance', 'onboarding', 'product', 'other'],
    default: 'technical',
  },
  type: {
    type: String,
    enum: ['online', 'classroom', 'workshop', 'webinar', 'self_paced', 'blended'],
    default: 'classroom',
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'all_levels'],
    default: 'all_levels',
  },
  duration: {
    value: Number,
    unit: {
      type: String,
      enum: ['hours', 'days', 'weeks'],
      default: 'hours',
    },
  },
  objectives: [String],
  curriculum: [{
    module: String,
    topics: [String],
    duration: Number,
    order: Number,
  }],
  prerequisites: [String],
  targetAudience: [{
    type: String,
    enum: ['all', 'managers', 'new_hires', 'technical', 'sales', 'custom'],
  }],
  targetDepartments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  }],
  targetDesignations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation',
  }],
  skills: [{
    name: String,
    level: String,
  }],
  provider: {
    type: {
      type: String,
      enum: ['internal', 'external', 'vendor'],
      default: 'internal',
    },
    name: String,
    contact: String,
  },
  cost: {
    amount: Number,
    currency: {
      type: String,
      default: 'NGN',
    },
    perParticipant: Boolean,
  },
  materials: [{
    name: String,
    type: {
      type: String,
      enum: ['document', 'video', 'presentation', 'link', 'other'],
    },
    url: String,
  }],
  certification: {
    enabled: Boolean,
    name: String,
    validityPeriod: {
      value: Number,
      unit: {
        type: String,
        enum: ['months', 'years'],
      },
    },
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'draft',
  },
  isMandatory: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

trainingProgramSchema.index({ tenant: 1, code: 1 }, { unique: true });
trainingProgramSchema.index({ tenant: 1, status: 1, category: 1 });

const trainingSessionSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  program: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingProgram',
    required: true,
  },
  title: String,
  schedule: {
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    startTime: String,
    endTime: String,
    timezone: {
      type: String,
      default: 'Africa/Lagos',
    },
  },
  location: {
    type: {
      type: String,
      enum: ['physical', 'virtual', 'hybrid'],
      default: 'physical',
    },
    venue: String,
    address: String,
    meetingLink: String,
    platform: String,
  },
  trainer: {
    name: String,
    email: String,
    phone: String,
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    bio: String,
  },
  capacity: {
    min: { type: Number, default: 1 },
    max: { type: Number, default: 50 },
  },
  enrollmentDeadline: Date,
  status: {
    type: String,
    enum: ['scheduled', 'open', 'full', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  enrollmentCount: {
    type: Number,
    default: 0,
  },
  waitlistCount: {
    type: Number,
    default: 0,
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

trainingSessionSchema.index({ tenant: 1, program: 1 });
trainingSessionSchema.index({ tenant: 1, 'schedule.startDate': 1 });

const trainingEnrollmentSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingSession',
    required: true,
  },
  program: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingProgram',
    required: true,
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  enrollmentType: {
    type: String,
    enum: ['self', 'manager', 'hr', 'system'],
    default: 'self',
  },
  enrolledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['enrolled', 'waitlisted', 'attended', 'completed', 'no_show', 'cancelled'],
    default: 'enrolled',
  },
  attendance: [{
    date: Date,
    status: {
      type: String,
      enum: ['present', 'absent', 'late'],
    },
  }],
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  assessment: {
    score: Number,
    maxScore: Number,
    percentage: Number,
    passed: Boolean,
    attemptedAt: Date,
  },
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    contentRating: Number,
    trainerRating: Number,
    comments: String,
    improvements: String,
    submittedAt: Date,
  },
  certificate: {
    issued: Boolean,
    issuedAt: Date,
    expiresAt: Date,
    certificateUrl: String,
    certificateNumber: String,
  },
  completedAt: Date,
  notes: String,
}, {
  timestamps: true,
});

trainingEnrollmentSchema.index({ tenant: 1, session: 1, employee: 1 }, { unique: true });
trainingEnrollmentSchema.index({ tenant: 1, employee: 1 });

const skillSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['technical', 'soft_skills', 'leadership', 'domain', 'tools', 'language', 'other'],
    default: 'technical',
  },
  description: String,
  levels: [{
    level: Number,
    name: String,
    description: String,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

skillSchema.index({ tenant: 1, name: 1 }, { unique: true });

const employeeSkillSchema = new mongoose.Schema({
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
  skill: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    required: true,
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  yearsOfExperience: Number,
  selfAssessed: {
    type: Boolean,
    default: true,
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  verifiedAt: Date,
  certifications: [{
    name: String,
    issuer: String,
    issuedAt: Date,
    expiresAt: Date,
    url: String,
  }],
  lastUsed: Date,
  notes: String,
}, {
  timestamps: true,
});

employeeSkillSchema.index({ tenant: 1, employee: 1, skill: 1 }, { unique: true });

export const TrainingProgram = mongoose.model('TrainingProgram', trainingProgramSchema);
export const TrainingSession = mongoose.model('TrainingSession', trainingSessionSchema);
export const TrainingEnrollment = mongoose.model('TrainingEnrollment', trainingEnrollmentSchema);
export const Skill = mongoose.model('Skill', skillSchema);
export const EmployeeSkill = mongoose.model('EmployeeSkill', employeeSkillSchema);
