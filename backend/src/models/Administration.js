import mongoose from 'mongoose';

// ============================================
// SYSTEM SETTINGS SCHEMA
// ============================================
const systemSettingSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'general', 'security', 'email', 'sms', 'notifications', 'payroll', 'leave',
        'attendance', 'workflow', 'approval', 'integration', 'localization',
        'branding', 'backup', 'audit', 'performance', 'recruitment', 'training',
      ],
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    value: mongoose.Schema.Types.Mixed,
    dataType: {
      type: String,
      enum: ['string', 'number', 'boolean', 'json', 'array', 'date', 'encrypted'],
      default: 'string',
    },
    label: String,
    description: String,
    defaultValue: mongoose.Schema.Types.Mixed,
    validation: {
      required: Boolean,
      min: Number,
      max: Number,
      pattern: String,
      options: [mongoose.Schema.Types.Mixed],
    },
    isSecret: {
      type: Boolean,
      default: false,
    },
    isEditable: {
      type: Boolean,
      default: true,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    requiresRestart: {
      type: Boolean,
      default: false,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    modificationHistory: [{
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
      modifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
      modifiedAt: {
        type: Date,
        default: Date.now,
      },
      reason: String,
    }],
  },
  {
    timestamps: true,
  }
);

systemSettingSchema.index({ tenant: 1, category: 1, key: 1 }, { unique: true });

// ============================================
// NOTIFICATION TEMPLATE SCHEMA
// ============================================
const notificationTemplateSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'leave', 'attendance', 'payroll', 'expense', 'approval', 'task', 'workflow',
        'recruitment', 'training', 'performance', 'announcement', 'system', 'custom',
      ],
    },
    event: {
      type: String,
      required: true,
    },
    channels: {
      email: {
        enabled: { type: Boolean, default: true },
        subject: String,
        body: String, // HTML with placeholders
        plainText: String,
      },
      sms: {
        enabled: { type: Boolean, default: false },
        message: String,
      },
      push: {
        enabled: { type: Boolean, default: true },
        title: String,
        body: String,
      },
      inApp: {
        enabled: { type: Boolean, default: true },
        title: String,
        message: String,
        actionUrl: String,
        icon: String,
      },
      whatsapp: {
        enabled: { type: Boolean, default: false },
        templateName: String,
        templateParams: [String],
      },
    },
    variables: [{
      name: String,
      description: String,
      example: String,
    }],
    recipients: {
      includeRequester: { type: Boolean, default: false },
      includeApprovers: { type: Boolean, default: false },
      includeManager: { type: Boolean, default: false },
      includeHR: { type: Boolean, default: false },
      roles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
      }],
      additionalEmails: [String],
    },
    schedule: {
      immediate: { type: Boolean, default: true },
      delayMinutes: Number,
      sendAt: String, // Time of day
      daysOfWeek: [Number],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
  },
  {
    timestamps: true,
  }
);

notificationTemplateSchema.index({ tenant: 1, code: 1 }, { unique: true });
notificationTemplateSchema.index({ tenant: 1, category: 1, event: 1 });

// ============================================
// NOTIFICATION LOG SCHEMA
// ============================================
const notificationLogSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NotificationTemplate',
    },
    event: String,
    channel: {
      type: String,
      enum: ['email', 'sms', 'push', 'in_app', 'whatsapp'],
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    recipientEmail: String,
    recipientPhone: String,
    subject: String,
    content: String,
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed', 'bounced'],
      default: 'pending',
    },
    sentAt: Date,
    deliveredAt: Date,
    readAt: Date,
    failedAt: Date,
    failureReason: String,
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    metadata: {
      referenceType: String,
      referenceId: mongoose.Schema.Types.ObjectId,
      provider: String,
      providerMessageId: String,
      cost: Number,
    },
  },
  {
    timestamps: true,
  }
);

notificationLogSchema.index({ tenant: 1, status: 1, createdAt: -1 });
notificationLogSchema.index({ tenant: 1, recipient: 1, createdAt: -1 });

// ============================================
// USER NOTIFICATION PREFERENCE SCHEMA
// ============================================
const notificationPreferenceSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    channels: {
      email: {
        enabled: { type: Boolean, default: true },
        address: String, // Override default
      },
      sms: {
        enabled: { type: Boolean, default: true },
        phone: String,
      },
      push: {
        enabled: { type: Boolean, default: true },
        devices: [{
          deviceId: String,
          deviceType: String,
          token: String,
          addedAt: Date,
        }],
      },
      inApp: {
        enabled: { type: Boolean, default: true },
      },
      whatsapp: {
        enabled: { type: Boolean, default: false },
        phone: String,
      },
    },
    categories: {
      leave: { email: Boolean, sms: Boolean, push: Boolean, inApp: Boolean },
      attendance: { email: Boolean, sms: Boolean, push: Boolean, inApp: Boolean },
      payroll: { email: Boolean, sms: Boolean, push: Boolean, inApp: Boolean },
      expense: { email: Boolean, sms: Boolean, push: Boolean, inApp: Boolean },
      approval: { email: Boolean, sms: Boolean, push: Boolean, inApp: Boolean },
      task: { email: Boolean, sms: Boolean, push: Boolean, inApp: Boolean },
      workflow: { email: Boolean, sms: Boolean, push: Boolean, inApp: Boolean },
      announcement: { email: Boolean, sms: Boolean, push: Boolean, inApp: Boolean },
      system: { email: Boolean, sms: Boolean, push: Boolean, inApp: Boolean },
    },
    quietHours: {
      enabled: { type: Boolean, default: false },
      start: String, // "22:00"
      end: String, // "07:00"
      timezone: String,
      exceptUrgent: { type: Boolean, default: true },
    },
    digestPreference: {
      enabled: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ['daily', 'weekly'],
        default: 'daily',
      },
      time: String, // "09:00"
    },
    language: {
      type: String,
      default: 'en',
    },
  },
  {
    timestamps: true,
  }
);

notificationPreferenceSchema.index({ tenant: 1, employee: 1 }, { unique: true });

// ============================================
// IN-APP NOTIFICATION SCHEMA
// ============================================
const inAppNotificationSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'error', 'action_required'],
      default: 'info',
    },
    category: String,
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    icon: String,
    actionUrl: String,
    actionLabel: String,
    reference: {
      type: {
        type: String,
      },
      id: mongoose.Schema.Types.ObjectId,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: Date,
    expiresAt: Date,
    groupKey: String, // For grouping similar notifications
  },
  {
    timestamps: true,
  }
);

inAppNotificationSchema.index({ tenant: 1, recipient: 1, isRead: 1, createdAt: -1 });
inAppNotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ============================================
// AUDIT PREFERENCE SCHEMA
// ============================================
const auditPreferenceSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    entity: {
      type: String,
      required: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    trackFields: [String],
    excludeFields: [String],
    trackActions: {
      create: { type: Boolean, default: true },
      update: { type: Boolean, default: true },
      delete: { type: Boolean, default: true },
      view: { type: Boolean, default: false },
      export: { type: Boolean, default: true },
    },
    retentionDays: {
      type: Number,
      default: 365,
    },
    notifyOnSensitive: {
      type: Boolean,
      default: true,
    },
    sensitiveFields: [String],
  },
  {
    timestamps: true,
  }
);

auditPreferenceSchema.index({ tenant: 1, entity: 1 }, { unique: true });

// ============================================
// SCHEDULED JOB SCHEMA
// ============================================
const scheduledJobSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    jobType: {
      type: String,
      required: true,
      enum: [
        'reminder', 'escalation', 'report_generation', 'data_cleanup', 'backup',
        'sync', 'notification_digest', 'attendance_process', 'leave_balance_update',
        'payroll_calculation', 'recurring_task', 'scheduled_message', 'custom',
      ],
    },
    schedule: {
      cron: String,
      timezone: String,
      runAt: Date, // For one-time jobs
      interval: Number, // In minutes for recurring
    },
    config: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'failed', 'disabled'],
      default: 'active',
    },
    lastRunAt: Date,
    lastRunStatus: {
      type: String,
      enum: ['success', 'failed', 'partial'],
    },
    lastRunDuration: Number, // In milliseconds
    lastError: String,
    nextRunAt: Date,
    runCount: {
      type: Number,
      default: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    notifyOnFailure: {
      type: Boolean,
      default: true,
    },
    notifyTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    }],
    isSystem: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
  },
  {
    timestamps: true,
  }
);

scheduledJobSchema.index({ status: 1, nextRunAt: 1 });

// ============================================
// DATA EXPORT REQUEST SCHEMA
// ============================================
const dataExportRequestSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    exportType: {
      type: String,
      required: true,
      enum: [
        'employees', 'attendance', 'payroll', 'leaves', 'expenses', 'invoices',
        'assets', 'inventory', 'audit_logs', 'reports', 'full_backup', 'custom',
      ],
    },
    format: {
      type: String,
      enum: ['csv', 'xlsx', 'pdf', 'json', 'xml'],
      default: 'xlsx',
    },
    filters: mongoose.Schema.Types.Mixed,
    fields: [String],
    dateRange: {
      from: Date,
      to: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'expired'],
      default: 'pending',
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    filePath: String,
    fileSize: Number,
    recordCount: Number,
    completedAt: Date,
    expiresAt: Date,
    downloadCount: {
      type: Number,
      default: 0,
    },
    lastDownloadAt: Date,
    error: String,
  },
  {
    timestamps: true,
  }
);

dataExportRequestSchema.index({ tenant: 1, requestedBy: 1, createdAt: -1 });

// ============================================
// INTEGRATION LOG SCHEMA
// ============================================
const integrationLogSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    integration: {
      type: String,
      required: true,
      enum: [
        'paystack', 'flutterwave', 'remita', 'twilio', 'termii', 'whatsapp',
        'telegram', 'facebook', 'google', 'microsoft', 'slack', 'zoom', 'custom',
      ],
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true,
    },
    operation: String,
    endpoint: String,
    method: String,
    requestHeaders: mongoose.Schema.Types.Mixed,
    requestBody: mongoose.Schema.Types.Mixed,
    responseStatus: Number,
    responseHeaders: mongoose.Schema.Types.Mixed,
    responseBody: mongoose.Schema.Types.Mixed,
    duration: Number, // In milliseconds
    status: {
      type: String,
      enum: ['success', 'failed', 'timeout', 'error'],
    },
    error: {
      code: String,
      message: String,
      stack: String,
    },
    referenceType: String,
    referenceId: mongoose.Schema.Types.ObjectId,
    ipAddress: String,
    retryCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

integrationLogSchema.index({ tenant: 1, integration: 1, createdAt: -1 });
integrationLogSchema.index({ tenant: 1, status: 1 });

// ============================================
// FEATURE FLAG SCHEMA
// ============================================
const featureFlagSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
    },
    description: String,
    isEnabled: {
      type: Boolean,
      default: false,
    },
    isGlobal: {
      type: Boolean,
      default: false,
    },
    enabledFor: {
      branches: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
      }],
      departments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
      }],
      roles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
      }],
      users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      }],
    },
    rolloutPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },
    startDate: Date,
    endDate: Date,
    metadata: mongoose.Schema.Types.Mixed,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
  },
  {
    timestamps: true,
  }
);

featureFlagSchema.index({ code: 1, tenant: 1 }, { unique: true });

// ============================================
// ANNOUNCEMENT SCHEMA
// ============================================
const systemAnnouncementSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    richContent: String,
    type: {
      type: String,
      enum: ['info', 'warning', 'maintenance', 'update', 'policy', 'urgent'],
      default: 'info',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'critical'],
      default: 'normal',
    },
    targetAudience: {
      all: { type: Boolean, default: true },
      branches: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
      }],
      departments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
      }],
      roles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
      }],
    },
    publishAt: Date,
    expiresAt: Date,
    isPublished: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    requiresAcknowledgement: {
      type: Boolean,
      default: false,
    },
    acknowledgements: [{
      employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
      acknowledgedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    attachments: [{
      name: String,
      path: String,
      type: String,
    }],
    viewCount: {
      type: Number,
      default: 0,
    },
    isGlobal: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
  },
  {
    timestamps: true,
  }
);

systemAnnouncementSchema.index({ tenant: 1, isPublished: 1, publishAt: 1 });

export const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);
export const NotificationTemplate = mongoose.model('NotificationTemplate', notificationTemplateSchema);
export const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema);
export const NotificationPreference = mongoose.model('NotificationPreference', notificationPreferenceSchema);
export const InAppNotification = mongoose.model('InAppNotification', inAppNotificationSchema);
export const AuditPreference = mongoose.model('AuditPreference', auditPreferenceSchema);
export const ScheduledJob = mongoose.model('ScheduledJob', scheduledJobSchema);
export const DataExportRequest = mongoose.model('DataExportRequest', dataExportRequestSchema);
export const IntegrationLog = mongoose.model('IntegrationLog', integrationLogSchema);
export const FeatureFlag = mongoose.model('FeatureFlag', featureFlagSchema);
export const SystemAnnouncement = mongoose.model('SystemAnnouncement', systemAnnouncementSchema);
