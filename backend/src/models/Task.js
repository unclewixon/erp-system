import mongoose from 'mongoose';

const taskCommentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  comment: {
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

const taskChecklistSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  completedAt: Date,
});

const taskSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  taskNumber: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  type: {
    type: String,
    enum: ['task', 'bug', 'feature', 'improvement', 'other'],
    default: 'task',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'review', 'completed', 'cancelled', 'on_hold'],
    default: 'todo',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  project: String,
  dueDate: Date,
  startDate: Date,
  completedAt: Date,
  estimatedHours: Number,
  actualHours: Number,
  tags: [String],
  checklist: [taskChecklistSchema],
  comments: [taskCommentSchema],
  attachments: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: Date,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
  parentTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
  },
  dependencies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
  }],
  watchers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  reminderDate: Date,
  isRecurring: {
    type: Boolean,
    default: false,
  },
  recurrence: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
    },
    interval: Number,
    endDate: Date,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

taskSchema.index({ tenant: 1, taskNumber: 1 }, { unique: true });
taskSchema.index({ tenant: 1, assignedTo: 1, status: 1 });
taskSchema.index({ tenant: 1, department: 1 });
taskSchema.index({ tenant: 1, status: 1 });
taskSchema.index({ tenant: 1, dueDate: 1 });

// Auto-generate task number
taskSchema.pre('save', async function(next) {
  if (this.isNew && !this.taskNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.taskNumber = `TSK-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Virtual for progress
taskSchema.virtual('progress').get(function() {
  if (!this.checklist || this.checklist.length === 0) return 0;
  const completed = this.checklist.filter(item => item.isCompleted).length;
  return Math.round((completed / this.checklist.length) * 100);
});

taskSchema.set('toJSON', { virtuals: true });
taskSchema.set('toObject', { virtuals: true });

export default mongoose.model('Task', taskSchema);
