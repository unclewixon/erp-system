import mongoose from 'mongoose';

// ============ WORKFLOW TEMPLATE ============
// Defines the blueprint for a workflow process
const workflowTemplateSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  code: { type: String, required: true },
  name: { type: String, required: true },
  description: String,
  version: { type: Number, default: 1 },

  // What this workflow applies to
  entityType: {
    type: String,
    required: true,
    enum: [
      'leave_request', 'expense_claim', 'reimbursement', 'purchase_requisition',
      'purchase_order', 'loan_request', 'asset_disposal', 'asset_transfer',
      'travel_request', 'overtime_request', 'salary_advance', 'document_approval',
      'policy_change', 'budget_approval', 'vendor_registration', 'invoice_approval',
      'payment_request', 'employee_termination', 'promotion', 'transfer',
      'recruitment_approval', 'training_request', 'custom'
    ],
  },
  customEntityType: String, // If entityType is 'custom'

  // Trigger conditions
  triggers: {
    onSubmit: { type: Boolean, default: true },
    onUpdate: { type: Boolean, default: false },
    conditions: [{
      field: String,
      operator: { type: String, enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains', 'exists'] },
      value: mongoose.Schema.Types.Mixed,
    }],
  },

  // Workflow steps/nodes
  steps: [{
    stepId: { type: String, required: true },
    name: { type: String, required: true },
    description: String,
    type: {
      type: String,
      enum: ['start', 'approval', 'review', 'task', 'notification', 'condition', 'parallel', 'end'],
      required: true,
    },
    order: { type: Number, required: true },

    // Approval settings
    approval: {
      approverType: {
        type: String,
        enum: ['user', 'role', 'department_head', 'reporting_manager', 'dynamic', 'group', 'hierarchy'],
      },
      approvers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      roles: [String],
      department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
      dynamicField: String, // Field path to get approver from entity
      hierarchyLevels: Number, // Number of management levels

      // Multi-approval settings
      approvalType: { type: String, enum: ['any', 'all', 'majority', 'sequential'], default: 'any' },
      minApprovals: Number, // Minimum approvals needed
      quorum: Number, // Percentage for majority

      // Delegation
      allowDelegation: { type: Boolean, default: true },
      allowReassign: { type: Boolean, default: true },
    },

    // Conditional routing
    conditions: [{
      condition: {
        field: String,
        operator: String,
        value: mongoose.Schema.Types.Mixed,
      },
      nextStep: String, // stepId to go to if condition is true
    }],
    defaultNextStep: String, // stepId if no conditions match

    // SLA settings
    sla: {
      enabled: { type: Boolean, default: false },
      durationHours: Number,
      warningHours: Number, // Warning before SLA breach
      escalateTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      autoApprove: { type: Boolean, default: false }, // Auto-approve on SLA breach
      autoReject: { type: Boolean, default: false },
    },

    // Notifications
    notifications: {
      onEntry: {
        enabled: { type: Boolean, default: true },
        template: String,
        channels: [{ type: String, enum: ['email', 'sms', 'push', 'in_app'] }],
      },
      onReminder: {
        enabled: { type: Boolean, default: true },
        intervalHours: Number,
        maxReminders: Number,
      },
      onEscalation: {
        enabled: { type: Boolean, default: true },
        template: String,
      },
    },

    // Actions on completion
    onComplete: {
      updateFields: [{ field: String, value: mongoose.Schema.Types.Mixed }],
      triggerWebhook: String,
      createTask: {
        enabled: Boolean,
        title: String,
        assignTo: String, // 'submitter', 'approver', 'role:xxx'
      },
    },

    // Form fields to show/require at this step
    formFields: [{
      field: String,
      required: Boolean,
      readonly: Boolean,
      visible: Boolean,
    }],

    // Parallel execution branches
    parallelBranches: [{
      branchId: String,
      name: String,
      steps: [String], // stepIds in this branch
      required: { type: Boolean, default: true }, // Must complete for workflow to proceed
    }],
  }],

  // Global settings
  settings: {
    allowRecall: { type: Boolean, default: true }, // Submitter can recall
    allowResubmit: { type: Boolean, default: true }, // Can resubmit after rejection
    requireComments: {
      onApprove: { type: Boolean, default: false },
      onReject: { type: Boolean, default: true },
    },
    notifySubmitter: { type: Boolean, default: true },
    trackHistory: { type: Boolean, default: true },
    skipWeekends: { type: Boolean, default: true },
    skipHolidays: { type: Boolean, default: true },
  },

  // Variables available in workflow
  variables: [{
    name: String,
    type: { type: String, enum: ['string', 'number', 'boolean', 'date', 'array'] },
    source: String, // Field path or 'input'
    defaultValue: mongoose.Schema.Types.Mixed,
  }],

  status: { type: String, enum: ['draft', 'active', 'inactive', 'archived'], default: 'draft' },
  publishedAt: Date,
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

workflowTemplateSchema.index({ tenant: 1, code: 1, version: 1 }, { unique: true });
workflowTemplateSchema.index({ tenant: 1, entityType: 1, status: 1 });

// ============ WORKFLOW INSTANCE ============
// A running instance of a workflow
const workflowInstanceSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  instanceId: { type: String, required: true },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowTemplate', required: true },
  templateVersion: Number,

  // The entity being processed
  entityType: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  entityNumber: String, // Human-readable reference

  // Current state
  currentStep: String, // stepId
  currentStepName: String,
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'rejected', 'cancelled', 'on_hold', 'escalated'],
    default: 'pending',
  },

  // Parallel branch tracking
  activeBranches: [{
    branchId: String,
    status: { type: String, enum: ['active', 'completed', 'cancelled'] },
    completedAt: Date,
  }],

  // Progress tracking
  progress: {
    totalSteps: Number,
    completedSteps: Number,
    percentComplete: Number,
  },

  // Participants
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currentApprovers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // History of all actions
  history: [{
    stepId: String,
    stepName: String,
    action: {
      type: String,
      enum: ['submitted', 'approved', 'rejected', 'returned', 'delegated', 'reassigned',
             'escalated', 'recalled', 'resubmitted', 'auto_approved', 'auto_rejected',
             'commented', 'attachment_added', 'task_completed', 'sla_warning', 'sla_breached'],
    },
    actionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actionByName: String,
    actionAt: { type: Date, default: Date.now },
    comments: String,
    attachments: [String],

    // For delegation/reassignment
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
  }],

  // SLA tracking
  sla: {
    startedAt: Date,
    dueAt: Date,
    warningAt: Date,
    isBreached: { type: Boolean, default: false },
    breachedAt: Date,
    warnings: [{ stepId: String, sentAt: Date }],
  },

  // Outcome
  outcome: {
    finalStatus: String,
    completedAt: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
  },

  // Variables snapshot
  variables: mongoose.Schema.Types.Mixed,

  // Timestamps per step
  stepTimestamps: [{
    stepId: String,
    enteredAt: Date,
    completedAt: Date,
    duration: Number, // seconds
  }],

  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  dueDate: Date,
  notes: String,
  tags: [String],
}, { timestamps: true });

workflowInstanceSchema.index({ tenant: 1, instanceId: 1 }, { unique: true });
workflowInstanceSchema.index({ tenant: 1, entityType: 1, entityId: 1 });
workflowInstanceSchema.index({ tenant: 1, status: 1, currentStep: 1 });
workflowInstanceSchema.index({ tenant: 1, submittedBy: 1, status: 1 });
workflowInstanceSchema.index({ tenant: 1, currentApprovers: 1, status: 1 });
workflowInstanceSchema.index({ tenant: 1, 'sla.dueAt': 1, status: 1 });

workflowInstanceSchema.pre('save', async function(next) {
  if (this.isNew && !this.instanceId) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.instanceId = `WF-${Date.now().toString(36).toUpperCase()}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// ============ APPROVAL DELEGATION ============
const approvalDelegationSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },

  // Who is delegating
  delegator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Who receives the delegation
  delegate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Scope
  scope: {
    type: { type: String, enum: ['all', 'specific_workflows', 'specific_types', 'amount_range'], default: 'all' },
    workflows: [{ type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowTemplate' }],
    entityTypes: [String],
    maxAmount: Number, // Maximum monetary value delegate can approve
  },

  // Time period
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: String,

  // Status
  status: { type: String, enum: ['active', 'expired', 'revoked'], default: 'active' },
  revokedAt: Date,
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  revokeReason: String,

  // Audit
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

approvalDelegationSchema.index({ tenant: 1, delegator: 1, status: 1 });
approvalDelegationSchema.index({ tenant: 1, delegate: 1, status: 1, startDate: 1, endDate: 1 });

// ============ APPROVAL SUBSTITUTE ============
// For when someone is out of office
const approvalSubstituteSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },

  // Who is away
  absentee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Who covers
  substitute: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Period
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, enum: ['leave', 'travel', 'sick', 'training', 'other'] },
  notes: String,

  // What they can handle
  scope: {
    allApprovals: { type: Boolean, default: true },
    workflows: [{ type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowTemplate' }],
    entityTypes: [String],
  },

  // Notification
  notifyOnAction: { type: Boolean, default: true }, // Notify absentee when substitute acts

  status: { type: String, enum: ['scheduled', 'active', 'completed', 'cancelled'], default: 'scheduled' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

approvalSubstituteSchema.index({ tenant: 1, absentee: 1, status: 1, startDate: 1, endDate: 1 });

// ============ APPROVAL MATRIX ============
// Defines approval requirements based on conditions
const approvalMatrixSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  description: String,

  entityType: { type: String, required: true },

  // Rules - evaluated in order
  rules: [{
    ruleId: String,
    name: String,
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    // Conditions (AND logic)
    conditions: [{
      field: String,
      operator: { type: String, enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'between', 'contains'] },
      value: mongoose.Schema.Types.Mixed,
      value2: mongoose.Schema.Types.Mixed, // For 'between'
    }],

    // Approval requirements when conditions match
    approvals: [{
      level: Number,
      name: String,
      approverType: { type: String, enum: ['user', 'role', 'department_head', 'reporting_manager', 'dynamic'] },
      approvers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      roles: [String],
      dynamicField: String,
      required: { type: Boolean, default: true },
      approvalType: { type: String, enum: ['any', 'all'], default: 'any' },
      slaHours: Number,
    }],

    // Skip conditions (bypass approval)
    skipIf: [{
      field: String,
      operator: String,
      value: mongoose.Schema.Types.Mixed,
    }],
  }],

  // Default approvals if no rules match
  defaultApprovals: [{
    level: Number,
    name: String,
    approverType: String,
    approvers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    roles: [String],
    required: Boolean,
  }],

  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

approvalMatrixSchema.index({ tenant: 1, code: 1 }, { unique: true });
approvalMatrixSchema.index({ tenant: 1, entityType: 1, isActive: 1 });

// ============ ESCALATION RULE ============
const escalationRuleSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },

  // What to monitor
  scope: {
    allWorkflows: { type: Boolean, default: false },
    workflows: [{ type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowTemplate' }],
    entityTypes: [String],
    steps: [String], // Specific step IDs
  },

  // Trigger
  trigger: {
    type: { type: String, enum: ['sla_warning', 'sla_breach', 'pending_duration', 'no_action'], required: true },
    thresholdHours: Number,
    conditions: mongoose.Schema.Types.Mixed,
  },

  // Actions
  actions: [{
    order: Number,
    type: { type: String, enum: ['notify', 'reassign', 'escalate_level', 'auto_approve', 'auto_reject', 'webhook'] },
    delayHours: { type: Number, default: 0 },

    // Notify
    notifyUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    notifyRoles: [String],
    notifySubmitter: Boolean,
    notifyCurrentApprover: Boolean,

    // Reassign/Escalate
    escalateTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    escalateToRole: String,
    escalateToManager: Boolean,

    // Webhook
    webhookUrl: String,
    webhookPayload: mongoose.Schema.Types.Mixed,

    // Message
    message: String,
    messageTemplate: String,
  }],

  // Limits
  maxEscalations: { type: Number, default: 3 },
  repeatIntervalHours: Number,

  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

escalationRuleSchema.index({ tenant: 1, isActive: 1 });

// ============ WORKFLOW CATEGORY ============
const workflowCategorySchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  description: String,
  icon: String,
  color: String,
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

workflowCategorySchema.index({ tenant: 1, code: 1 }, { unique: true });

export const WorkflowTemplate = mongoose.model('WorkflowEngineTemplate', workflowTemplateSchema);
export const WorkflowInstance = mongoose.model('WorkflowInstance', workflowInstanceSchema);
export const ApprovalDelegation = mongoose.model('ApprovalDelegation', approvalDelegationSchema);
export const ApprovalSubstitute = mongoose.model('ApprovalSubstitute', approvalSubstituteSchema);
export const ApprovalMatrix = mongoose.model('ApprovalMatrix', approvalMatrixSchema);
export const EscalationRule = mongoose.model('EscalationRule', escalationRuleSchema);
export const WorkflowCategory = mongoose.model('WorkflowCategory', workflowCategorySchema);
