import mongoose from 'mongoose';

const queryResponseSchema = new mongoose.Schema({
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  response: {
    type: String,
    required: true,
  },
  attachments: [{
    name: String,
    url: String,
    type: String,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const querySchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  queryNumber: {
    type: String,
    required: true,
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  type: {
    type: String,
    enum: ['disciplinary', 'grievance', 'complaint', 'inquiry', 'feedback', 'other'],
    required: true,
  },
  category: {
    type: String,
    enum: ['attendance', 'performance', 'conduct', 'policy', 'harassment', 'salary', 'leave', 'other'],
    default: 'other',
  },
  subject: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['open', 'under_review', 'pending_response', 'resolved', 'closed', 'escalated'],
    default: 'open',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  responses: [queryResponseSchema],
  attachments: [{
    name: String,
    url: String,
    type: String,
  }],
  resolution: {
    summary: String,
    actionTaken: String,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: Date,
  },
  escalation: {
    escalatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    escalatedAt: Date,
    reason: String,
  },
  isConfidential: {
    type: Boolean,
    default: false,
  },
  dueDate: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

querySchema.index({ tenant: 1, queryNumber: 1 }, { unique: true });
querySchema.index({ tenant: 1, employee: 1 });
querySchema.index({ tenant: 1, status: 1 });
querySchema.index({ tenant: 1, type: 1 });

// Auto-generate query number
querySchema.pre('save', async function(next) {
  if (this.isNew && !this.queryNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.queryNumber = `QRY-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

export default mongoose.model('Query', querySchema);
