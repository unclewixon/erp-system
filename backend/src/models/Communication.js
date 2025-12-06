import mongoose from 'mongoose';

// ============ COMMUNICATION CHANNEL ============
const channelSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['sms', 'whatsapp', 'telegram', 'facebook', 'instagram', 'email'],
    required: true,
  },
  provider: {
    type: String,
    enum: [
      // SMS providers
      'twilio', 'termii',
      // WhatsApp
      'whatsapp_business', 'twilio_whatsapp',
      // Social
      'meta', // Facebook & Instagram
      'telegram',
      // Email
      'sendgrid', 'mailgun', 'ses',
    ],
    required: true,
  },
  status: { type: String, enum: ['active', 'inactive', 'pending_verification', 'suspended'], default: 'pending_verification' },

  // Provider credentials (encrypted in production)
  credentials: {
    // Twilio
    accountSid: String,
    authToken: String,
    phoneNumber: String,
    messagingServiceSid: String,

    // Termii
    apiKey: String,
    senderId: String,

    // WhatsApp Business
    whatsappBusinessId: String,
    whatsappPhoneNumberId: String,
    whatsappAccessToken: String,
    whatsappWebhookVerifyToken: String,

    // Telegram
    telegramBotToken: String,
    telegramBotUsername: String,
    telegramWebhookSecret: String,

    // Meta (Facebook/Instagram)
    metaAppId: String,
    metaAppSecret: String,
    metaPageId: String,
    metaPageAccessToken: String,
    metaInstagramAccountId: String,

    // Email
    emailApiKey: String,
    emailDomain: String,
    fromEmail: String,
    fromName: String,
  },

  // Rate limits
  rateLimits: {
    messagesPerSecond: { type: Number, default: 10 },
    messagesPerMinute: { type: Number, default: 100 },
    messagesPerDay: { type: Number, default: 10000 },
  },

  // Usage tracking
  usage: {
    messagesSentToday: { type: Number, default: 0 },
    messagesSentThisMonth: { type: Number, default: 0 },
    lastMessageAt: Date,
    lastResetDate: Date,
  },

  // Webhook URL for this channel
  webhookUrl: String,
  webhookSecret: String,

  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

channelSchema.index({ tenant: 1, type: 1 });
channelSchema.index({ tenant: 1, provider: 1 });

// ============ MESSAGE TEMPLATE ============
const messageTemplateSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  description: String,

  channelType: {
    type: String,
    enum: ['sms', 'whatsapp', 'telegram', 'facebook', 'instagram', 'email', 'all'],
    required: true,
  },

  // Template content
  content: {
    // For SMS/Text
    text: String,

    // For WhatsApp
    whatsappTemplateId: String, // Meta-approved template ID
    whatsappTemplateName: String,
    whatsappCategory: { type: String, enum: ['marketing', 'utility', 'authentication'] },
    whatsappLanguage: { type: String, default: 'en' },

    // For rich messages (WhatsApp, Telegram, etc.)
    header: {
      type: { type: String, enum: ['text', 'image', 'video', 'document'] },
      content: String, // text or URL
    },
    body: String,
    footer: String,

    // Interactive elements
    buttons: [{
      type: { type: String, enum: ['quick_reply', 'url', 'phone', 'copy_code'] },
      text: String,
      value: String, // URL, phone number, or code
    }],

    // For email
    subject: String,
    htmlContent: String,
    plainTextContent: String,
  },

  // Variables/placeholders
  variables: [{
    name: String, // e.g., {{firstName}}
    description: String,
    required: { type: Boolean, default: false },
    defaultValue: String,
    sampleValue: String,
  }],

  // Approval status for WhatsApp templates
  approvalStatus: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected'],
    default: 'draft',
  },
  rejectionReason: String,
  approvedAt: Date,

  category: { type: String, enum: ['marketing', 'transactional', 'notification', 'reminder', 'otp', 'custom'], default: 'custom' },
  tags: [String],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

messageTemplateSchema.index({ tenant: 1, code: 1 }, { unique: true });
messageTemplateSchema.index({ tenant: 1, channelType: 1, category: 1 });

// ============ CONTACT / AUDIENCE ============
const contactSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },

  // Basic info
  firstName: String,
  lastName: String,
  email: String,
  phone: String, // Primary phone (E.164 format)

  // Channel-specific identifiers
  channels: {
    whatsapp: {
      phoneNumber: String,
      waId: String, // WhatsApp ID
      profileName: String,
      optedIn: { type: Boolean, default: false },
      optInDate: Date,
      lastInteraction: Date,
    },
    telegram: {
      chatId: String,
      username: String,
      firstName: String,
      lastName: String,
      optedIn: { type: Boolean, default: false },
      lastInteraction: Date,
    },
    facebook: {
      pageScoppedId: String, // PSID
      profileName: String,
      optedIn: { type: Boolean, default: false },
      lastInteraction: Date,
    },
    instagram: {
      igScopedId: String, // IGSID
      username: String,
      optedIn: { type: Boolean, default: false },
      lastInteraction: Date,
    },
    sms: {
      phoneNumber: String,
      optedIn: { type: Boolean, default: true },
      optOutDate: Date,
    },
    email: {
      address: String,
      verified: { type: Boolean, default: false },
      optedIn: { type: Boolean, default: false },
      optOutDate: Date,
    },
  },

  // Segmentation
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ContactGroup' }],
  tags: [String],

  // Custom fields
  customFields: mongoose.Schema.Types.Mixed,

  // Engagement metrics
  metrics: {
    totalMessagesSent: { type: Number, default: 0 },
    totalMessagesReceived: { type: Number, default: 0 },
    lastMessageSent: Date,
    lastMessageReceived: Date,
    openRate: Number,
    clickRate: Number,
  },

  // Source tracking
  source: { type: String, enum: ['manual', 'import', 'api', 'whatsapp', 'telegram', 'facebook', 'instagram', 'website', 'event'], default: 'manual' },

  // Employee link (if contact is also an employee)
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },

  status: { type: String, enum: ['active', 'inactive', 'blocked', 'unsubscribed'], default: 'active' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

contactSchema.index({ tenant: 1, phone: 1 });
contactSchema.index({ tenant: 1, email: 1 });
contactSchema.index({ tenant: 1, 'channels.whatsapp.waId': 1 });
contactSchema.index({ tenant: 1, 'channels.telegram.chatId': 1 });
contactSchema.index({ tenant: 1, 'channels.facebook.pageScoppedId': 1 });
contactSchema.index({ tenant: 1, groups: 1 });
contactSchema.index({ tenant: 1, firstName: 'text', lastName: 'text', email: 'text', phone: 'text' });

// ============ CONTACT GROUP ============
const contactGroupSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['static', 'dynamic'], default: 'static' },

  // For dynamic groups - filter criteria
  filters: {
    tags: [String],
    channels: [String],
    customFields: mongoose.Schema.Types.Mixed,
    dateRange: {
      field: String,
      from: Date,
      to: Date,
    },
  },

  memberCount: { type: Number, default: 0 },
  color: String,
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

contactGroupSchema.index({ tenant: 1, name: 1 }, { unique: true });

// ============ MESSAGE ============
const messageSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  messageId: { type: String, required: true }, // Internal ID
  externalId: String, // Provider's message ID

  // Direction
  direction: { type: String, enum: ['outbound', 'inbound'], required: true },

  // Channel & Provider
  channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  channelType: { type: String, enum: ['sms', 'whatsapp', 'telegram', 'facebook', 'instagram', 'email'], required: true },

  // Parties
  from: String, // Sender ID/number
  to: String, // Recipient ID/number
  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },

  // Content
  content: {
    type: { type: String, enum: ['text', 'image', 'video', 'audio', 'document', 'location', 'contact', 'sticker', 'template', 'interactive'], default: 'text' },
    text: String,
    caption: String,
    mediaUrl: String,
    mediaType: String,
    fileName: String,
    location: {
      latitude: Number,
      longitude: Number,
      name: String,
      address: String,
    },
    template: {
      name: String,
      language: String,
      components: mongoose.Schema.Types.Mixed,
    },
    interactive: mongoose.Schema.Types.Mixed,
  },

  // Template used
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'MessageTemplate' },

  // Campaign reference
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },

  // Scheduling
  scheduledFor: Date,
  isScheduled: { type: Boolean, default: false },

  // Status tracking
  status: {
    type: String,
    enum: ['queued', 'scheduled', 'sending', 'sent', 'delivered', 'read', 'failed', 'cancelled'],
    default: 'queued',
  },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    details: String,
  }],

  // Delivery info
  sentAt: Date,
  deliveredAt: Date,
  readAt: Date,
  failedAt: Date,
  failureReason: String,
  errorCode: String,

  // Engagement
  clicked: { type: Boolean, default: false },
  clickedAt: Date,
  clickedLinks: [String],

  // Cost tracking
  cost: {
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'NGN' },
    segments: { type: Number, default: 1 }, // SMS segments
  },

  // Reply tracking
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],

  // Conversation
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },

  metadata: mongoose.Schema.Types.Mixed,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

messageSchema.index({ tenant: 1, messageId: 1 }, { unique: true });
messageSchema.index({ tenant: 1, externalId: 1 });
messageSchema.index({ tenant: 1, contact: 1, createdAt: -1 });
messageSchema.index({ tenant: 1, campaign: 1 });
messageSchema.index({ tenant: 1, status: 1, scheduledFor: 1 });
messageSchema.index({ tenant: 1, channelType: 1, createdAt: -1 });

messageSchema.pre('save', async function(next) {
  if (this.isNew && !this.messageId) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.messageId = `MSG-${Date.now()}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// ============ CONVERSATION ============
const conversationSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  conversationId: { type: String, required: true },

  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
  channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  channelType: { type: String, enum: ['sms', 'whatsapp', 'telegram', 'facebook', 'instagram', 'email'], required: true },

  // WhatsApp conversation window
  windowExpiry: Date, // 24-hour window for WhatsApp
  isWindowOpen: { type: Boolean, default: true },

  // Assignment
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedAt: Date,
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },

  // Status
  status: { type: String, enum: ['active', 'pending', 'resolved', 'closed'], default: 'active' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },

  // Tracking
  lastMessageAt: Date,
  lastMessagePreview: String,
  lastMessageDirection: String,
  messageCount: { type: Number, default: 0 },
  unreadCount: { type: Number, default: 0 },

  // First response time
  firstResponseAt: Date,
  firstResponseTime: Number, // seconds

  // Resolution
  resolvedAt: Date,
  resolutionTime: Number, // seconds
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Tags & notes
  tags: [String],
  notes: [{
    text: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  }],

  // Bot handling
  isHandledByBot: { type: Boolean, default: false },
  botHandoverAt: Date,
}, { timestamps: true });

conversationSchema.index({ tenant: 1, conversationId: 1 }, { unique: true });
conversationSchema.index({ tenant: 1, contact: 1, channelType: 1 });
conversationSchema.index({ tenant: 1, status: 1, assignedTo: 1 });
conversationSchema.index({ tenant: 1, lastMessageAt: -1 });

// ============ CAMPAIGN ============
const campaignSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  campaignId: { type: String, required: true },
  name: { type: String, required: true },
  description: String,

  type: { type: String, enum: ['broadcast', 'drip', 'triggered', 'ab_test'], default: 'broadcast' },
  channelType: { type: String, enum: ['sms', 'whatsapp', 'telegram', 'facebook', 'instagram', 'email', 'multi'], required: true },
  channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel' },

  // Audience
  audience: {
    type: { type: String, enum: ['all', 'groups', 'tags', 'filter', 'import'], default: 'all' },
    groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ContactGroup' }],
    tags: [String],
    filters: mongoose.Schema.Types.Mixed,
    excludeGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ContactGroup' }],
    excludeTags: [String],
  },

  // Content
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'MessageTemplate' },
  content: {
    text: String,
    mediaUrl: String,
    buttons: mongoose.Schema.Types.Mixed,
  },

  // For A/B testing
  variants: [{
    name: String,
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'MessageTemplate' },
    content: mongoose.Schema.Types.Mixed,
    percentage: Number,
  }],

  // Scheduling
  schedule: {
    type: { type: String, enum: ['immediate', 'scheduled', 'recurring'], default: 'immediate' },
    scheduledAt: Date,
    timezone: { type: String, default: 'Africa/Lagos' },

    // Recurring
    recurring: {
      frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
      days: [Number], // 0-6 for weekly, 1-31 for monthly
      time: String, // HH:mm
      endDate: Date,
    },

    // Send window (only send during these hours)
    sendWindow: {
      enabled: { type: Boolean, default: false },
      startTime: String, // HH:mm
      endTime: String,
      timezone: String,
    },
  },

  // Throttling
  throttle: {
    enabled: { type: Boolean, default: false },
    messagesPerMinute: Number,
    messagesPerHour: Number,
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled', 'failed'],
    default: 'draft',
  },

  // Progress
  progress: {
    total: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    read: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    unsubscribed: { type: Number, default: 0 },
  },

  // Timing
  startedAt: Date,
  completedAt: Date,
  pausedAt: Date,

  // Cost
  totalCost: { type: Number, default: 0 },
  currency: { type: String, default: 'NGN' },

  // Settings
  settings: {
    trackClicks: { type: Boolean, default: true },
    trackOpens: { type: Boolean, default: true },
    stopOnReply: { type: Boolean, default: false },
    removeDuplicates: { type: Boolean, default: true },
  },

  tags: [String],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

campaignSchema.index({ tenant: 1, campaignId: 1 }, { unique: true });
campaignSchema.index({ tenant: 1, status: 1, 'schedule.scheduledAt': 1 });
campaignSchema.index({ tenant: 1, channelType: 1, status: 1 });

campaignSchema.pre('save', async function(next) {
  if (this.isNew && !this.campaignId) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.campaignId = `CMP-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// ============ SCHEDULED MESSAGE ============
const scheduledMessageSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  scheduleId: { type: String, required: true },

  // What to send
  message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'MessageTemplate' },
  content: mongoose.Schema.Types.Mixed,

  // Who to send to
  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
  channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  channelType: String,

  // When to send
  scheduledFor: { type: Date, required: true },
  timezone: { type: String, default: 'Africa/Lagos' },

  // Recurring
  isRecurring: { type: Boolean, default: false },
  recurringPattern: {
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
    interval: { type: Number, default: 1 },
    daysOfWeek: [Number],
    dayOfMonth: Number,
    endDate: Date,
    occurrences: Number,
  },
  nextOccurrence: Date,
  occurrenceCount: { type: Number, default: 0 },

  // Status
  status: { type: String, enum: ['pending', 'processing', 'sent', 'failed', 'cancelled'], default: 'pending' },
  sentAt: Date,
  failedAt: Date,
  failureReason: String,

  // Reference
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

scheduledMessageSchema.index({ tenant: 1, scheduleId: 1 }, { unique: true });
scheduledMessageSchema.index({ tenant: 1, status: 1, scheduledFor: 1 });
scheduledMessageSchema.index({ tenant: 1, contact: 1 });

scheduledMessageSchema.pre('save', async function(next) {
  if (this.isNew && !this.scheduleId) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.scheduleId = `SCH-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// ============ AUTO REPLY / BOT RULE ============
const autoReplySchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  description: String,

  // Channels this applies to
  channels: [{
    type: String,
    enum: ['sms', 'whatsapp', 'telegram', 'facebook', 'instagram', 'email', 'all'],
  }],

  // Trigger conditions
  trigger: {
    type: { type: String, enum: ['keyword', 'first_message', 'no_reply', 'schedule', 'always'], required: true },

    // Keyword triggers
    keywords: [String],
    matchType: { type: String, enum: ['exact', 'contains', 'starts_with', 'regex'], default: 'contains' },
    caseSensitive: { type: Boolean, default: false },

    // No reply trigger
    noReplyMinutes: Number,

    // Schedule trigger
    schedule: {
      days: [Number], // 0-6
      startTime: String,
      endTime: String,
      timezone: String,
    },
  },

  // Response
  response: {
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'MessageTemplate' },
    text: String,
    mediaUrl: String,
    buttons: mongoose.Schema.Types.Mixed,
    delay: { type: Number, default: 0 }, // seconds to wait before replying
  },

  // Actions
  actions: {
    assignTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addTags: [String],
    addToGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ContactGroup' }],
    markAsResolved: { type: Boolean, default: false },
    notifyUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },

  // Limits
  limits: {
    maxPerContact: Number, // Max times to trigger per contact
    maxPerDay: Number,
    cooldownMinutes: Number, // Min time between triggers for same contact
  },

  priority: { type: Number, default: 0 }, // Higher = checked first
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

autoReplySchema.index({ tenant: 1, isActive: 1, priority: -1 });

// ============ BROADCAST LIST ============
const broadcastListSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  description: String,

  channelType: { type: String, enum: ['whatsapp', 'telegram'], required: true },

  // Members
  members: [{
    contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
    channelId: String, // WhatsApp number or Telegram chat ID
    addedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'removed', 'blocked'], default: 'active' },
  }],

  memberCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

broadcastListSchema.index({ tenant: 1, name: 1 }, { unique: true });

// ============ OPT-OUT LOG ============
const optOutLogSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
  channel: { type: String, enum: ['sms', 'whatsapp', 'telegram', 'facebook', 'instagram', 'email'], required: true },
  identifier: String, // Phone/email/ID

  action: { type: String, enum: ['opt_out', 'opt_in'], required: true },
  method: { type: String, enum: ['keyword', 'link', 'manual', 'api', 'complaint'], default: 'keyword' },
  keyword: String, // e.g., "STOP"

  previousStatus: String,
  newStatus: String,

  ipAddress: String,
  userAgent: String,
}, { timestamps: true });

optOutLogSchema.index({ tenant: 1, contact: 1, channel: 1 });
optOutLogSchema.index({ tenant: 1, createdAt: -1 });

export const Channel = mongoose.model('Channel', channelSchema);
export const MessageTemplate = mongoose.model('MessageTemplate', messageTemplateSchema);
export const Contact = mongoose.model('Contact', contactSchema);
export const ContactGroup = mongoose.model('ContactGroup', contactGroupSchema);
export const Message = mongoose.model('Message', messageSchema);
export const Conversation = mongoose.model('Conversation', conversationSchema);
export const Campaign = mongoose.model('Campaign', campaignSchema);
export const ScheduledMessage = mongoose.model('ScheduledMessage', scheduledMessageSchema);
export const AutoReply = mongoose.model('AutoReply', autoReplySchema);
export const BroadcastList = mongoose.model('BroadcastList', broadcastListSchema);
export const OptOutLog = mongoose.model('OptOutLog', optOutLogSchema);
