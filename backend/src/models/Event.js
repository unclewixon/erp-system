import mongoose from 'mongoose';

// ============ EVENT CATEGORY ============
const eventCategorySchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  description: String,
  color: String,
  icon: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

eventCategorySchema.index({ tenant: 1, code: 1 }, { unique: true });

// ============ EVENT ============
const eventSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  eventId: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'EventCategory' },

  // Type
  type: {
    type: String,
    enum: ['meeting', 'webinar', 'conference', 'workshop', 'training', 'social', 'company', 'holiday', 'other'],
    default: 'meeting',
  },

  // Visibility
  visibility: { type: String, enum: ['public', 'private', 'internal'], default: 'internal' },

  // Date & Time
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isAllDay: { type: Boolean, default: false },
  timezone: { type: String, default: 'Africa/Lagos' },

  // Recurring
  isRecurring: { type: Boolean, default: false },
  recurringPattern: {
    frequency: { type: String, enum: ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'] },
    interval: { type: Number, default: 1 },
    daysOfWeek: [Number], // 0-6
    dayOfMonth: Number,
    monthOfYear: Number,
    endType: { type: String, enum: ['never', 'date', 'occurrences'] },
    endDate: Date,
    occurrences: Number,
    exceptions: [Date], // Dates to skip
  },
  parentEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' }, // For recurring instances

  // Location
  location: {
    type: { type: String, enum: ['physical', 'virtual', 'hybrid'], default: 'physical' },
    venue: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
    },
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
    virtualLink: String, // Zoom, Teams, Meet link
    virtualPlatform: String,
    meetingId: String,
    meetingPassword: String,
    roomCapacity: Number,
  },

  // Organizer
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  organizerName: String,
  organizerEmail: String,
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

  // Attendees
  attendees: [{
    type: { type: String, enum: ['employee', 'contact', 'external'], default: 'employee' },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
    name: String,
    email: String,
    phone: String,

    // RSVP
    status: { type: String, enum: ['pending', 'accepted', 'declined', 'tentative', 'no_response'], default: 'pending' },
    respondedAt: Date,
    declineReason: String,

    // Check-in
    checkedIn: { type: Boolean, default: false },
    checkInTime: Date,
    checkInMethod: { type: String, enum: ['manual', 'qr_code', 'nfc', 'face_recognition'] },

    // Role
    role: { type: String, enum: ['attendee', 'speaker', 'host', 'moderator', 'vip'], default: 'attendee' },

    // Notifications
    notificationSent: { type: Boolean, default: false },
    reminderSent: { type: Boolean, default: false },
  }],

  // Capacity
  maxAttendees: Number,
  registrationRequired: { type: Boolean, default: false },
  registrationDeadline: Date,
  waitlistEnabled: { type: Boolean, default: false },
  waitlist: [{
    type: { type: String, enum: ['employee', 'contact', 'external'] },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
    name: String,
    email: String,
    addedAt: { type: Date, default: Date.now },
    position: Number,
  }],

  // Agenda
  agenda: [{
    startTime: Date,
    endTime: Date,
    title: String,
    description: String,
    speaker: String,
    speakerBio: String,
  }],

  // Resources
  resources: [{
    name: String,
    type: { type: String, enum: ['document', 'presentation', 'video', 'link', 'other'] },
    url: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: Date,
  }],

  // Cover image
  coverImage: String,
  gallery: [String],

  // Notifications & Reminders
  notifications: {
    sendInvites: { type: Boolean, default: true },
    sendReminders: { type: Boolean, default: true },
    reminderSchedule: [{
      type: { type: String, enum: ['minutes', 'hours', 'days'] },
      value: Number,
      sent: { type: Boolean, default: false },
    }],
    channels: [{ type: String, enum: ['email', 'sms', 'whatsapp', 'push'] }],
  },

  // Feedback
  feedbackEnabled: { type: Boolean, default: false },
  feedbackDeadline: Date,
  feedbackQuestions: [{
    question: String,
    type: { type: String, enum: ['rating', 'text', 'multiple_choice', 'yes_no'] },
    options: [String],
    required: { type: Boolean, default: false },
  }],

  // Tags
  tags: [String],

  // Status
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'ongoing', 'completed', 'cancelled', 'postponed'],
    default: 'draft',
  },
  cancellationReason: String,
  postponedTo: Date,

  // Metrics
  metrics: {
    invitesSent: { type: Number, default: 0 },
    accepted: { type: Number, default: 0 },
    declined: { type: Number, default: 0 },
    checkedIn: { type: Number, default: 0 },
    feedbackReceived: { type: Number, default: 0 },
    averageRating: Number,
  },

  // Cost tracking
  budget: { type: Number, default: 0 },
  actualCost: { type: Number, default: 0 },
  expenses: [{
    description: String,
    amount: Number,
    category: String,
    receipt: String,
  }],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
}, { timestamps: true });

eventSchema.index({ tenant: 1, eventId: 1 }, { unique: true });
eventSchema.index({ tenant: 1, startDate: 1, endDate: 1 });
eventSchema.index({ tenant: 1, status: 1, startDate: 1 });
eventSchema.index({ tenant: 1, organizer: 1 });
eventSchema.index({ tenant: 1, 'attendees.employee': 1 });
eventSchema.index({ tenant: 1, title: 'text', description: 'text' });

eventSchema.pre('save', async function(next) {
  if (this.isNew && !this.eventId) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.eventId = `EVT-${String(count + 1).padStart(6, '0')}`;
  }

  // Update metrics
  if (this.attendees && this.attendees.length > 0) {
    this.metrics.accepted = this.attendees.filter(a => a.status === 'accepted').length;
    this.metrics.declined = this.attendees.filter(a => a.status === 'declined').length;
    this.metrics.checkedIn = this.attendees.filter(a => a.checkedIn).length;
  }

  next();
});

// ============ EVENT REGISTRATION ============
const eventRegistrationSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  registrationId: { type: String, required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },

  // Registrant
  registrantType: { type: String, enum: ['employee', 'contact', 'external'], default: 'external' },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  company: String,
  jobTitle: String,

  // Custom fields
  customFields: mongoose.Schema.Types.Mixed,

  // Status
  status: { type: String, enum: ['pending', 'confirmed', 'waitlisted', 'cancelled', 'attended', 'no_show'], default: 'pending' },

  // Confirmation
  confirmationCode: String,
  confirmedAt: Date,
  qrCode: String,

  // Check-in
  checkedIn: { type: Boolean, default: false },
  checkInTime: Date,

  // Source
  source: { type: String, enum: ['web', 'api', 'manual', 'import'], default: 'web' },

  // Payment (if paid event)
  payment: {
    required: { type: Boolean, default: false },
    amount: Number,
    status: { type: String, enum: ['pending', 'paid', 'refunded', 'waived'] },
    paidAt: Date,
    transactionId: String,
  },

  // Communication
  inviteSent: { type: Boolean, default: false },
  remindersSent: [Date],

  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

eventRegistrationSchema.index({ tenant: 1, registrationId: 1 }, { unique: true });
eventRegistrationSchema.index({ tenant: 1, event: 1, email: 1 }, { unique: true });
eventRegistrationSchema.index({ tenant: 1, event: 1, status: 1 });

eventRegistrationSchema.pre('save', async function(next) {
  if (this.isNew) {
    if (!this.registrationId) {
      const count = await this.constructor.countDocuments({ tenant: this.tenant });
      this.registrationId = `REG-${String(count + 1).padStart(6, '0')}`;
    }
    if (!this.confirmationCode) {
      this.confirmationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
  }
  next();
});

// ============ EVENT FEEDBACK ============
const eventFeedbackSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  registration: { type: mongoose.Schema.Types.ObjectId, ref: 'EventRegistration' },

  // Respondent
  respondentType: { type: String, enum: ['employee', 'contact', 'anonymous'] },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
  name: String,
  email: String,

  // Responses
  responses: [{
    questionIndex: Number,
    question: String,
    type: String,
    answer: mongoose.Schema.Types.Mixed,
  }],

  // Ratings
  overallRating: { type: Number, min: 1, max: 5 },
  venueRating: { type: Number, min: 1, max: 5 },
  contentRating: { type: Number, min: 1, max: 5 },
  organizationRating: { type: Number, min: 1, max: 5 },

  // Comments
  highlights: String,
  improvements: String,
  additionalComments: String,

  // Would recommend
  wouldRecommend: Boolean,
  npsScore: { type: Number, min: 0, max: 10 },

  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

eventFeedbackSchema.index({ tenant: 1, event: 1 });
eventFeedbackSchema.index({ tenant: 1, event: 1, email: 1 }, { unique: true, sparse: true });

// ============ CALENDAR INTEGRATION ============
const calendarIntegrationSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  provider: { type: String, enum: ['google', 'outlook', 'apple'], required: true },

  // OAuth tokens
  accessToken: String,
  refreshToken: String,
  tokenExpiry: Date,

  // Settings
  calendarId: String, // External calendar ID
  syncEnabled: { type: Boolean, default: true },
  syncDirection: { type: String, enum: ['push', 'pull', 'both'], default: 'push' },
  lastSyncAt: Date,

  status: { type: String, enum: ['active', 'inactive', 'error'], default: 'active' },
  errorMessage: String,
}, { timestamps: true });

calendarIntegrationSchema.index({ tenant: 1, user: 1, provider: 1 }, { unique: true });

// ============ ANNOUNCEMENT ============
const announcementSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  announcementId: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  contentHtml: String,

  type: { type: String, enum: ['general', 'urgent', 'policy', 'event', 'update', 'maintenance'], default: 'general' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },

  // Targeting
  audience: {
    type: { type: String, enum: ['all', 'departments', 'branches', 'roles', 'employees'], default: 'all' },
    departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
    branches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
    roles: [String],
    employees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
  },

  // Scheduling
  publishAt: Date,
  expiresAt: Date,

  // Attachments
  attachments: [{
    name: String,
    url: String,
    type: String,
  }],

  // Acknowledgement
  requiresAcknowledgement: { type: Boolean, default: false },
  acknowledgements: [{
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    acknowledgedAt: Date,
  }],

  // Notification channels
  channels: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
    push: { type: Boolean, default: false },
  },

  // Engagement
  views: { type: Number, default: 0 },
  uniqueViews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],

  // Pin
  isPinned: { type: Boolean, default: false },
  pinnedUntil: Date,

  status: { type: String, enum: ['draft', 'scheduled', 'published', 'expired', 'archived'], default: 'draft' },
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  publishedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

announcementSchema.index({ tenant: 1, announcementId: 1 }, { unique: true });
announcementSchema.index({ tenant: 1, status: 1, publishAt: 1 });
announcementSchema.index({ tenant: 1, isPinned: 1, publishedAt: -1 });

announcementSchema.pre('save', async function(next) {
  if (this.isNew && !this.announcementId) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.announcementId = `ANN-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

export const EventCategory = mongoose.model('EventCategory', eventCategorySchema);
export const Event = mongoose.model('Event', eventSchema);
export const EventRegistration = mongoose.model('EventRegistration', eventRegistrationSchema);
export const EventFeedback = mongoose.model('EventFeedback', eventFeedbackSchema);
export const CalendarIntegration = mongoose.model('CalendarIntegration', calendarIntegrationSchema);
export const Announcement = mongoose.model('Announcement', announcementSchema);
