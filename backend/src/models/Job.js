import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
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
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  designation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation',
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
  },
  description: {
    type: String,
    required: true,
  },
  requirements: [{
    type: String,
  }],
  responsibilities: [{
    type: String,
  }],
  skills: [{
    name: String,
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    },
    required: Boolean,
  }],
  qualifications: [{
    type: String,
  }],
  experience: {
    min: Number,
    max: Number,
    unit: {
      type: String,
      enum: ['months', 'years'],
      default: 'years',
    },
  },
  salary: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'NGN',
    },
    isNegotiable: {
      type: Boolean,
      default: true,
    },
    showInPosting: {
      type: Boolean,
      default: false,
    },
  },
  employmentType: {
    type: String,
    enum: ['full_time', 'part_time', 'contract', 'internship', 'temporary'],
    default: 'full_time',
  },
  workMode: {
    type: String,
    enum: ['onsite', 'remote', 'hybrid'],
    default: 'onsite',
  },
  positions: {
    type: Number,
    default: 1,
  },
  filledPositions: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['draft', 'open', 'on_hold', 'closed', 'cancelled'],
    default: 'draft',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  publishedAt: Date,
  closingDate: Date,
  hiringManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  recruiters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  }],
  interviewStages: [{
    name: String,
    order: Number,
    type: {
      type: String,
      enum: ['screening', 'phone', 'technical', 'hr', 'panel', 'final'],
    },
    interviewers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    }],
  }],
  applicationCount: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

jobSchema.index({ tenant: 1, code: 1 }, { unique: true });
jobSchema.index({ tenant: 1, status: 1 });
jobSchema.index({ tenant: 1, department: 1 });

const applicationSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  applicant: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    address: String,
    city: String,
    state: String,
    country: String,
  },
  resume: {
    url: String,
    filename: String,
    uploadedAt: Date,
  },
  coverLetter: String,
  experience: [{
    company: String,
    title: String,
    startDate: Date,
    endDate: Date,
    current: Boolean,
    description: String,
  }],
  education: [{
    institution: String,
    degree: String,
    field: String,
    startDate: Date,
    endDate: Date,
    grade: String,
  }],
  skills: [{
    name: String,
    level: String,
    yearsOfExperience: Number,
  }],
  source: {
    type: String,
    enum: ['website', 'linkedin', 'indeed', 'referral', 'agency', 'job_fair', 'other'],
    default: 'website',
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  status: {
    type: String,
    enum: ['new', 'screening', 'shortlisted', 'interviewing', 'offered', 'hired', 'rejected', 'withdrawn'],
    default: 'new',
  },
  currentStage: {
    type: Number,
    default: 0,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  notes: [{
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
  rejectionReason: String,
  withdrawalReason: String,
  expectedSalary: Number,
  noticePeriod: {
    value: Number,
    unit: {
      type: String,
      enum: ['days', 'weeks', 'months'],
    },
  },
  availableFrom: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

applicationSchema.index({ tenant: 1, job: 1 });
applicationSchema.index({ tenant: 1, 'applicant.email': 1 });
applicationSchema.index({ tenant: 1, status: 1 });

const interviewSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true,
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  stage: {
    type: Number,
    required: true,
  },
  stageName: String,
  type: {
    type: String,
    enum: ['screening', 'phone', 'video', 'in_person', 'technical', 'panel', 'final'],
    required: true,
  },
  scheduledAt: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number,
    default: 60, // minutes
  },
  location: {
    type: {
      type: String,
      enum: ['office', 'video_call', 'phone'],
    },
    details: String,
    meetingLink: String,
  },
  interviewers: [{
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    role: String,
    confirmed: {
      type: Boolean,
      default: false,
    },
  }],
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'],
    default: 'scheduled',
  },
  feedback: [{
    interviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    rating: {
      overall: { type: Number, min: 1, max: 5 },
      technical: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      cultural: { type: Number, min: 1, max: 5 },
    },
    strengths: [String],
    weaknesses: [String],
    recommendation: {
      type: String,
      enum: ['strong_hire', 'hire', 'maybe', 'no_hire', 'strong_no_hire'],
    },
    comments: String,
    submittedAt: Date,
  }],
  result: {
    type: String,
    enum: ['passed', 'failed', 'pending'],
    default: 'pending',
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

interviewSchema.index({ tenant: 1, application: 1 });
interviewSchema.index({ tenant: 1, scheduledAt: 1 });

const offerSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true,
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  offerDate: {
    type: Date,
    required: true,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  position: {
    title: String,
    department: String,
    branch: String,
    reportingTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
  },
  compensation: {
    basicSalary: Number,
    currency: {
      type: String,
      default: 'NGN',
    },
    salaryGrade: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalaryGrade',
    },
    components: [{
      name: String,
      type: String,
      amount: Number,
    }],
    totalCTC: Number,
  },
  joiningDate: Date,
  probationPeriod: {
    duration: Number,
    unit: {
      type: String,
      enum: ['days', 'months'],
      default: 'months',
    },
  },
  benefits: [String],
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'sent', 'accepted', 'declined', 'expired', 'withdrawn'],
    default: 'draft',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  sentAt: Date,
  respondedAt: Date,
  declineReason: String,
  letterUrl: String,
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

offerSchema.index({ tenant: 1, application: 1 });

export const Job = mongoose.model('Job', jobSchema);
export const Application = mongoose.model('Application', applicationSchema);
export const Interview = mongoose.model('Interview', interviewSchema);
export const Offer = mongoose.model('Offer', offerSchema);
