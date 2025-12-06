import mongoose from 'mongoose';

const approvalStepSchema = new mongoose.Schema({
  order: {
    type: Number,
    required: true,
  },
  name: String,
  approverType: {
    type: String,
    enum: ['user', 'role', 'department_head', 'reporting_manager', 'hr', 'finance'],
    required: true,
  },
  approver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approverRole: String,
  isRequired: {
    type: Boolean,
    default: true,
  },
  canDelegate: {
    type: Boolean,
    default: false,
  },
  autoApproveAfterDays: Number,
  escalateAfterDays: Number,
  escalateTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

const workflowTemplateSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  module: {
    type: String,
    enum: ['leave', 'expense', 'loan', 'reimbursement', 'purchase', 'recruitment', 'payroll', 'general'],
    required: true,
  },
  description: String,
  steps: [approvalStepSchema],
  conditions: [{
    field: String,
    operator: {
      type: String,
      enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in'],
    },
    value: mongoose.Schema.Types.Mixed,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  isDefault: {
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

workflowTemplateSchema.index({ tenant: 1, code: 1 }, { unique: true });
workflowTemplateSchema.index({ tenant: 1, module: 1 });

const approvalHistorySchema = new mongoose.Schema({
  step: Number,
  stepName: String,
  approver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  action: {
    type: String,
    enum: ['approved', 'rejected', 'delegated', 'escalated', 'auto_approved', 'returned'],
  },
  comments: String,
  delegatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  actionDate: {
    type: Date,
    default: Date.now,
  },
});

const approvalRequestSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  requestNumber: {
    type: String,
    required: true,
  },
  workflow: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkflowTemplate',
    required: true,
  },
  module: {
    type: String,
    required: true,
  },
  documentType: {
    type: String,
    required: true,
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  documentRef: String,
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  currentStep: {
    type: Number,
    default: 1,
  },
  currentApprover: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'approved', 'rejected', 'cancelled', 'returned'],
    default: 'pending',
  },
  history: [approvalHistorySchema],
  completedAt: Date,
  summary: {
    title: String,
    amount: Number,
    description: String,
  },
  metadata: mongoose.Schema.Types.Mixed,
}, {
  timestamps: true,
});

approvalRequestSchema.index({ tenant: 1, requestNumber: 1 }, { unique: true });
approvalRequestSchema.index({ tenant: 1, currentApprover: 1, status: 1 });
approvalRequestSchema.index({ tenant: 1, requestedBy: 1 });
approvalRequestSchema.index({ tenant: 1, documentType: 1, documentId: 1 });

// Auto-generate request number
approvalRequestSchema.pre('save', async function(next) {
  if (this.isNew && !this.requestNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.requestNumber = `APR-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

export const WorkflowTemplate = mongoose.model('WorkflowTemplate', workflowTemplateSchema);
export const ApprovalRequest = mongoose.model('ApprovalRequest', approvalRequestSchema);
