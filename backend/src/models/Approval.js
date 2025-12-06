import mongoose from 'mongoose';

// ============================================
// APPROVAL CHAIN SCHEMA
// ============================================
const approvalChainSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Approval chain name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    description: String,
    category: {
      type: String,
      enum: ['leave', 'expense', 'purchase', 'travel', 'loan', 'recruitment', 'payroll', 'asset', 'general'],
      required: true,
    },
    levels: [{
      level: {
        type: Number,
        required: true,
      },
      name: String,
      approverType: {
        type: String,
        enum: ['user', 'role', 'designation', 'department_head', 'reporting_manager', 'dynamic'],
        required: true,
      },
      approvers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      }],
      roles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
      }],
      designations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Designation',
      }],
      dynamicField: String, // Field path for dynamic approver
      approvalMode: {
        type: String,
        enum: ['any', 'all', 'majority', 'sequential'],
        default: 'any',
      },
      requiredCount: Number, // For majority mode
      canSkip: {
        type: Boolean,
        default: false,
      },
      skipConditions: [{
        field: String,
        operator: {
          type: String,
          enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in'],
        },
        value: mongoose.Schema.Types.Mixed,
      }],
      autoApproveAfter: Number, // Hours
      escalateAfter: Number, // Hours
      escalateTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
      notifyOnPending: {
        type: Boolean,
        default: true,
      },
      reminderInterval: Number, // Hours
      maxReminders: {
        type: Number,
        default: 3,
      },
    }],
    conditions: [{
      field: String,
      operator: {
        type: String,
        enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'between', 'in', 'contains'],
      },
      value: mongoose.Schema.Types.Mixed,
      minValue: mongoose.Schema.Types.Mixed,
      maxValue: mongoose.Schema.Types.Mixed,
    }],
    priority: {
      type: Number,
      default: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    branches: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    }],
    departments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    }],
    validFrom: Date,
    validTo: Date,
    isActive: {
      type: Boolean,
      default: true,
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

approvalChainSchema.index({ tenant: 1, code: 1 }, { unique: true });
approvalChainSchema.index({ tenant: 1, category: 1, isActive: 1 });

// ============================================
// APPROVAL REQUEST SCHEMA
// ============================================
const approvalRequestSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    requestNumber: {
      type: String,
      required: true,
    },
    chain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApprovalChain',
      required: true,
    },
    referenceType: {
      type: String,
      required: true,
      enum: [
        'leave_request', 'expense_claim', 'purchase_request', 'purchase_order',
        'travel_request', 'loan_application', 'job_requisition', 'offer_letter',
        'asset_request', 'reimbursement', 'payroll_change', 'salary_revision',
        'bonus_request', 'training_request', 'transfer_request', 'promotion',
        'termination', 'contract_renewal', 'budget_approval', 'invoice_approval',
        'vendor_approval', 'custom',
      ],
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'referenceModel',
    },
    referenceModel: {
      type: String,
      required: true,
    },
    referenceNumber: String,
    referenceData: mongoose.Schema.Types.Mixed, // Snapshot of reference data
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    amount: Number,
    currency: {
      type: String,
      default: 'NGN',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    currentLevel: {
      type: Number,
      default: 1,
    },
    totalLevels: Number,
    status: {
      type: String,
      enum: ['draft', 'pending', 'in_progress', 'approved', 'rejected', 'cancelled', 'returned', 'expired'],
      default: 'draft',
    },
    levels: [{
      level: Number,
      levelName: String,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'skipped', 'auto_approved', 'escalated'],
        default: 'pending',
      },
      approvers: [{
        employee: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Employee',
        },
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected', 'delegated', 'abstained'],
          default: 'pending',
        },
        action: {
          type: String,
          enum: ['approve', 'reject', 'return', 'delegate', 'abstain'],
        },
        comments: String,
        attachments: [{
          name: String,
          path: String,
          type: String,
        }],
        delegatedTo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Employee',
        },
        delegationReason: String,
        actionDate: Date,
        ipAddress: String,
        deviceInfo: String,
      }],
      requiredApprovals: Number,
      receivedApprovals: {
        type: Number,
        default: 0,
      },
      approvalMode: String,
      startedAt: Date,
      completedAt: Date,
      dueDate: Date,
      escalatedAt: Date,
      escalatedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
      remindersSent: {
        type: Number,
        default: 0,
      },
      lastReminderAt: Date,
    }],
    history: [{
      action: {
        type: String,
        enum: ['created', 'submitted', 'approved', 'rejected', 'returned', 'cancelled', 'escalated', 'delegated', 'reminder_sent', 'auto_approved', 'resubmitted', 'modified'],
      },
      level: Number,
      performer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
      comments: String,
      oldStatus: String,
      newStatus: String,
      metadata: mongoose.Schema.Types.Mixed,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    }],
    attachments: [{
      name: String,
      path: String,
      type: String,
      size: Number,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    comments: [{
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
      content: String,
      isInternal: {
        type: Boolean,
        default: false,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    returnReason: String,
    returnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    returnedAt: Date,
    cancelReason: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    cancelledAt: Date,
    approvedAt: Date,
    rejectedAt: Date,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    rejectionReason: String,
    submittedAt: Date,
    dueDate: Date,
    expiresAt: Date,
    slaHours: Number,
    slaBreached: {
      type: Boolean,
      default: false,
    },
    slaBreachedAt: Date,
    tags: [String],
    customFields: mongoose.Schema.Types.Mixed,
    isUrgent: {
      type: Boolean,
      default: false,
    },
    notificationsSent: [{
      type: {
        type: String,
        enum: ['submission', 'approval', 'rejection', 'reminder', 'escalation', 'return', 'expiry'],
      },
      recipients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      }],
      sentAt: Date,
      channel: {
        type: String,
        enum: ['email', 'sms', 'push', 'in_app'],
      },
    }],
  },
  {
    timestamps: true,
  }
);

approvalRequestSchema.index({ tenant: 1, requestNumber: 1 }, { unique: true });
approvalRequestSchema.index({ tenant: 1, status: 1 });
approvalRequestSchema.index({ tenant: 1, requester: 1, status: 1 });
approvalRequestSchema.index({ tenant: 1, referenceType: 1, referenceId: 1 });
approvalRequestSchema.index({ 'levels.approvers.employee': 1, status: 1 });

// Generate request number
approvalRequestSchema.pre('save', async function (next) {
  if (this.isNew && !this.requestNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    const year = new Date().getFullYear().toString().slice(-2);
    this.requestNumber = `APR${year}${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// ============================================
// APPROVAL DELEGATION HISTORY SCHEMA
// ============================================
const delegationHistorySchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    delegation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApprovalDelegation',
      required: true,
    },
    approvalRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApprovalRequest',
      required: true,
    },
    delegator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    delegate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    action: {
      type: String,
      enum: ['approved', 'rejected', 'returned'],
      required: true,
    },
    comments: String,
    actionDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// APPROVAL POLICY SCHEMA
// ============================================
const approvalPolicySchema = new mongoose.Schema(
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
    description: String,
    category: {
      type: String,
      enum: ['leave', 'expense', 'purchase', 'travel', 'loan', 'recruitment', 'payroll', 'asset', 'general'],
      required: true,
    },
    rules: [{
      name: String,
      priority: Number,
      conditions: [{
        field: String,
        operator: {
          type: String,
          enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'between', 'in', 'not_in', 'contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'],
        },
        value: mongoose.Schema.Types.Mixed,
        minValue: mongoose.Schema.Types.Mixed,
        maxValue: mongoose.Schema.Types.Mixed,
      }],
      conditionLogic: {
        type: String,
        enum: ['and', 'or'],
        default: 'and',
      },
      action: {
        type: {
          type: String,
          enum: ['use_chain', 'auto_approve', 'auto_reject', 'require_additional', 'skip_level', 'notify'],
        },
        chainId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ApprovalChain',
        },
        skipLevels: [Number],
        additionalApprovers: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Employee',
        }],
        notifyUsers: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Employee',
        }],
        reason: String,
      },
    }],
    defaultChain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApprovalChain',
    },
    maxAmount: Number,
    minAmount: Number,
    requiresDocuments: {
      type: Boolean,
      default: false,
    },
    requiredDocuments: [String],
    allowBulkApproval: {
      type: Boolean,
      default: true,
    },
    maxBulkCount: {
      type: Number,
      default: 50,
    },
    requireComments: {
      rejection: {
        type: Boolean,
        default: true,
      },
      approval: {
        type: Boolean,
        default: false,
      },
      return: {
        type: Boolean,
        default: true,
      },
    },
    expiryDays: Number,
    reminderSettings: {
      enabled: {
        type: Boolean,
        default: true,
      },
      firstReminderAfter: {
        type: Number,
        default: 24,
      }, // Hours
      reminderInterval: {
        type: Number,
        default: 24,
      }, // Hours
      maxReminders: {
        type: Number,
        default: 3,
      },
      escalateAfterReminders: {
        type: Boolean,
        default: true,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    branches: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    }],
    departments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    }],
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

approvalPolicySchema.index({ tenant: 1, code: 1 }, { unique: true });
approvalPolicySchema.index({ tenant: 1, category: 1, isActive: 1 });

// ============================================
// APPROVAL LIMIT SCHEMA
// ============================================
const approvalLimitSchema = new mongoose.Schema(
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
    category: {
      type: String,
      enum: ['expense', 'purchase', 'travel', 'loan', 'budget', 'petty_cash', 'general'],
      required: true,
    },
    limitType: {
      type: String,
      enum: ['user', 'role', 'designation', 'department'],
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
    },
    designation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Designation',
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    limits: {
      perTransaction: Number,
      daily: Number,
      weekly: Number,
      monthly: Number,
      quarterly: Number,
      yearly: Number,
    },
    currency: {
      type: String,
      default: 'NGN',
    },
    requiresApprovalAbove: Number,
    autoApproveBelow: Number,
    utilization: {
      daily: {
        amount: { type: Number, default: 0 },
        count: { type: Number, default: 0 },
        lastReset: Date,
      },
      weekly: {
        amount: { type: Number, default: 0 },
        count: { type: Number, default: 0 },
        lastReset: Date,
      },
      monthly: {
        amount: { type: Number, default: 0 },
        count: { type: Number, default: 0 },
        lastReset: Date,
      },
      quarterly: {
        amount: { type: Number, default: 0 },
        count: { type: Number, default: 0 },
        lastReset: Date,
      },
      yearly: {
        amount: { type: Number, default: 0 },
        count: { type: Number, default: 0 },
        lastReset: Date,
      },
    },
    validFrom: Date,
    validTo: Date,
    isActive: {
      type: Boolean,
      default: true,
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

approvalLimitSchema.index({ tenant: 1, category: 1, limitType: 1 });
approvalLimitSchema.index({ tenant: 1, user: 1 });

// ============================================
// APPROVAL QUEUE SCHEMA (For bulk processing)
// ============================================
const approvalQueueSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    requests: [{
      request: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApprovalRequest',
      },
      level: Number,
      addedAt: {
        type: Date,
        default: Date.now,
      },
      dueDate: Date,
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
    }],
    stats: {
      pending: { type: Number, default: 0 },
      overdue: { type: Number, default: 0 },
      urgent: { type: Number, default: 0 },
      approvedToday: { type: Number, default: 0 },
      rejectedToday: { type: Number, default: 0 },
    },
    lastUpdated: Date,
  },
  {
    timestamps: true,
  }
);

approvalQueueSchema.index({ tenant: 1, approver: 1 }, { unique: true });

// ============================================
// APPROVAL REMINDER SCHEMA
// ============================================
const approvalReminderSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    approvalRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApprovalRequest',
      required: true,
    },
    level: Number,
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    reminderNumber: {
      type: Number,
      default: 1,
    },
    scheduledFor: {
      type: Date,
      required: true,
    },
    sentAt: Date,
    status: {
      type: String,
      enum: ['scheduled', 'sent', 'cancelled', 'failed'],
      default: 'scheduled',
    },
    channels: [{
      type: String,
      enum: ['email', 'sms', 'push', 'in_app'],
    }],
    message: String,
    failureReason: String,
  },
  {
    timestamps: true,
  }
);

approvalReminderSchema.index({ tenant: 1, status: 1, scheduledFor: 1 });

export const ApprovalChain = mongoose.model('ApprovalChain', approvalChainSchema);
export const ApprovalRequest = mongoose.model('ApprovalRequest', approvalRequestSchema);
export const DelegationHistory = mongoose.model('DelegationHistory', delegationHistorySchema);
export const ApprovalPolicy = mongoose.model('ApprovalPolicy', approvalPolicySchema);
export const ApprovalLimit = mongoose.model('ApprovalLimit', approvalLimitSchema);
export const ApprovalQueue = mongoose.model('ApprovalQueue', approvalQueueSchema);
export const ApprovalReminder = mongoose.model('ApprovalReminder', approvalReminderSchema);
