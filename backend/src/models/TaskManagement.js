import mongoose from 'mongoose';

// ============================================
// TASK CATEGORY/PROJECT SCHEMA
// ============================================
const taskProjectSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
    },
    description: String,
    type: {
      type: String,
      enum: ['project', 'category', 'milestone', 'sprint'],
      default: 'project',
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskProject',
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    members: [{
      employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
      role: {
        type: String,
        enum: ['owner', 'manager', 'member', 'viewer'],
        default: 'member',
      },
      addedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    status: {
      type: String,
      enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled', 'archived'],
      default: 'planning',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent', 'critical'],
      default: 'normal',
    },
    startDate: Date,
    endDate: Date,
    actualStartDate: Date,
    actualEndDate: Date,
    budget: {
      estimated: Number,
      actual: Number,
      currency: {
        type: String,
        default: 'NGN',
      },
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    color: String,
    icon: String,
    tags: [String],
    settings: {
      allowSubtasks: {
        type: Boolean,
        default: true,
      },
      maxSubtaskDepth: {
        type: Number,
        default: 3,
      },
      requireTimeTracking: {
        type: Boolean,
        default: false,
      },
      defaultEstimateUnit: {
        type: String,
        enum: ['hours', 'days', 'points'],
        default: 'hours',
      },
      autoCalculateProgress: {
        type: Boolean,
        default: true,
      },
    },
    visibility: {
      type: String,
      enum: ['public', 'team', 'private'],
      default: 'team',
    },
    customFields: mongoose.Schema.Types.Mixed,
    isArchived: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    archivedAt: Date,
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
  },
  {
    timestamps: true,
  }
);

taskProjectSchema.index({ tenant: 1, code: 1 }, { unique: true });
taskProjectSchema.index({ tenant: 1, status: 1 });

// ============================================
// TASK LABEL SCHEMA
// ============================================
const taskLabelSchema = new mongoose.Schema(
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
    color: {
      type: String,
      default: '#3B82F6',
    },
    description: String,
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskProject',
    },
    isGlobal: {
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

taskLabelSchema.index({ tenant: 1, name: 1 });

// ============================================
// TASK SCHEMA (Enhanced)
// ============================================
const taskSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    taskNumber: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    description: String,
    richDescription: String, // HTML content
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskProject',
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    },
    subtasks: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    }],
    depth: {
      type: Number,
      default: 0,
    },
    type: {
      type: String,
      enum: ['task', 'bug', 'feature', 'improvement', 'story', 'epic', 'subtask', 'milestone'],
      default: 'task',
    },
    status: {
      type: String,
      enum: ['backlog', 'todo', 'in_progress', 'in_review', 'testing', 'blocked', 'done', 'cancelled'],
      default: 'todo',
    },
    statusHistory: [{
      status: String,
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
      changedAt: {
        type: Date,
        default: Date.now,
      },
      duration: Number, // Time spent in previous status (minutes)
    }],
    priority: {
      type: String,
      enum: ['lowest', 'low', 'normal', 'high', 'highest', 'urgent', 'critical'],
      default: 'normal',
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    assignees: [{
      employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
      role: {
        type: String,
        enum: ['primary', 'secondary', 'reviewer', 'tester'],
        default: 'secondary',
      },
      assignedAt: {
        type: Date,
        default: Date.now,
      },
      assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
    }],
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    watchers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    }],
    labels: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskLabel',
    }],
    tags: [String],
    // Scheduling
    startDate: Date,
    dueDate: Date,
    actualStartDate: Date,
    completedDate: Date,
    // Time Estimation
    estimate: {
      value: Number,
      unit: {
        type: String,
        enum: ['minutes', 'hours', 'days', 'points'],
        default: 'hours',
      },
    },
    originalEstimate: {
      value: Number,
      unit: String,
    },
    remainingEstimate: {
      value: Number,
      unit: String,
    },
    // Time Tracking
    timeTracking: {
      totalLogged: {
        type: Number,
        default: 0,
      }, // In minutes
      lastLoggedAt: Date,
    },
    timeLogs: [{
      employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
      startTime: Date,
      endTime: Date,
      duration: Number, // In minutes
      description: String,
      billable: {
        type: Boolean,
        default: true,
      },
      approved: {
        type: Boolean,
        default: false,
      },
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    // Dependencies
    dependencies: [{
      task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
      },
      type: {
        type: String,
        enum: ['blocks', 'blocked_by', 'relates_to', 'duplicates', 'clones'],
        default: 'relates_to',
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    blockedReason: String,
    blockedAt: Date,
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    // Progress
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    // Checklist
    checklist: [{
      title: String,
      isCompleted: {
        type: Boolean,
        default: false,
      },
      completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
      completedAt: Date,
      order: Number,
    }],
    // Attachments
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
    // Reference to other entities
    references: [{
      referenceType: {
        type: String,
        enum: ['approval_request', 'leave_request', 'expense', 'purchase_order', 'invoice', 'asset', 'employee', 'custom'],
      },
      referenceId: mongoose.Schema.Types.ObjectId,
      referenceModel: String,
      title: String,
    }],
    // Workflow Integration
    workflowInstance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkflowInstance',
    },
    approvalRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApprovalRequest',
    },
    // Recurring Task
    recurrence: {
      enabled: {
        type: Boolean,
        default: false,
      },
      pattern: {
        type: String,
        enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom'],
      },
      interval: Number,
      daysOfWeek: [Number],
      dayOfMonth: Number,
      monthOfYear: Number,
      endDate: Date,
      occurrences: Number,
      lastGenerated: Date,
      nextDue: Date,
    },
    isRecurringInstance: {
      type: Boolean,
      default: false,
    },
    recurringParent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    },
    // SLA
    sla: {
      responseTime: Number, // Minutes
      resolutionTime: Number, // Minutes
      responseDeadline: Date,
      resolutionDeadline: Date,
      responseBreached: {
        type: Boolean,
        default: false,
      },
      resolutionBreached: {
        type: Boolean,
        default: false,
      },
      firstResponseAt: Date,
    },
    // Activity
    activity: [{
      action: {
        type: String,
        enum: ['created', 'updated', 'status_changed', 'assigned', 'commented', 'attachment_added', 'time_logged', 'priority_changed', 'due_date_changed', 'progress_updated', 'label_added', 'label_removed', 'dependency_added', 'checklist_updated'],
      },
      performer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
      details: mongoose.Schema.Types.Mixed,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    }],
    // Custom Fields
    customFields: mongoose.Schema.Types.Mixed,
    // Sprint (for agile)
    sprint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskProject',
    },
    storyPoints: Number,
    // Visibility
    visibility: {
      type: String,
      enum: ['public', 'team', 'private', 'restricted'],
      default: 'team',
    },
    restrictedTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    }],
    // Meta
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: Date,
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
  },
  {
    timestamps: true,
  }
);

taskSchema.index({ tenant: 1, taskNumber: 1 }, { unique: true });
taskSchema.index({ tenant: 1, project: 1, status: 1 });
taskSchema.index({ tenant: 1, assignee: 1, status: 1 });
taskSchema.index({ tenant: 1, dueDate: 1 });
taskSchema.index({ tenant: 1, parent: 1 });

// Generate task number
taskSchema.pre('save', async function (next) {
  if (this.isNew && !this.taskNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    const prefix = this.type === 'bug' ? 'BUG' : 'TSK';
    this.taskNumber = `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Update progress based on checklist
taskSchema.methods.updateChecklistProgress = function () {
  if (this.checklist && this.checklist.length > 0) {
    const completed = this.checklist.filter((item) => item.isCompleted).length;
    this.progress = Math.round((completed / this.checklist.length) * 100);
  }
};

// ============================================
// TASK COMMENT SCHEMA
// ============================================
const taskCommentSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskComment',
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    richContent: String, // HTML
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    }],
    attachments: [{
      name: String,
      path: String,
      type: String,
      size: Number,
    }],
    reactions: [{
      emoji: String,
      users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      }],
    }],
    isInternal: {
      type: Boolean,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: Date,
    isPinned: {
      type: Boolean,
      default: false,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    resolvedAt: Date,
  },
  {
    timestamps: true,
  }
);

taskCommentSchema.index({ tenant: 1, task: 1 });

// ============================================
// TASK BOARD SCHEMA (Kanban)
// ============================================
const taskBoardSchema = new mongoose.Schema(
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
    description: String,
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskProject',
    },
    type: {
      type: String,
      enum: ['kanban', 'scrum', 'custom'],
      default: 'kanban',
    },
    columns: [{
      id: String,
      name: String,
      status: String, // Maps to task status
      color: String,
      order: Number,
      wipLimit: Number, // Work in progress limit
      isCollapsed: {
        type: Boolean,
        default: false,
      },
    }],
    swimlanes: [{
      id: String,
      name: String,
      type: {
        type: String,
        enum: ['assignee', 'priority', 'label', 'project', 'none'],
      },
      isCollapsed: {
        type: Boolean,
        default: false,
      },
    }],
    filters: {
      assignees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      }],
      labels: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TaskLabel',
      }],
      priorities: [String],
      types: [String],
    },
    settings: {
      showSubtasks: {
        type: Boolean,
        default: true,
      },
      showLabels: {
        type: Boolean,
        default: true,
      },
      showEstimates: {
        type: Boolean,
        default: true,
      },
      showProgress: {
        type: Boolean,
        default: true,
      },
      cardSize: {
        type: String,
        enum: ['compact', 'normal', 'detailed'],
        default: 'normal',
      },
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    sharedWith: [{
      employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
      permission: {
        type: String,
        enum: ['view', 'edit'],
        default: 'view',
      },
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
  },
  {
    timestamps: true,
  }
);

taskBoardSchema.index({ tenant: 1, project: 1 });

// ============================================
// TASK TEMPLATE SCHEMA
// ============================================
const taskTemplateSchema = new mongoose.Schema(
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
    description: String,
    category: String,
    template: {
      title: String,
      description: String,
      type: String,
      priority: String,
      labels: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TaskLabel',
      }],
      checklist: [{
        title: String,
        order: Number,
      }],
      estimate: {
        value: Number,
        unit: String,
      },
      subtasks: [{
        title: String,
        description: String,
        estimate: {
          value: Number,
          unit: String,
        },
      }],
      customFields: mongoose.Schema.Types.Mixed,
    },
    isGlobal: {
      type: Boolean,
      default: false,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskProject',
    },
    usageCount: {
      type: Number,
      default: 0,
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

// ============================================
// TASK AUTOMATION SCHEMA
// ============================================
const taskAutomationSchema = new mongoose.Schema(
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
    description: String,
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskProject',
    },
    trigger: {
      type: {
        type: String,
        enum: ['task_created', 'task_updated', 'status_changed', 'assigned', 'due_date_approaching', 'due_date_passed', 'comment_added', 'all_subtasks_done', 'checklist_completed', 'time_logged'],
        required: true,
      },
      conditions: [{
        field: String,
        operator: {
          type: String,
          enum: ['equals', 'not_equals', 'contains', 'in', 'greater_than', 'less_than'],
        },
        value: mongoose.Schema.Types.Mixed,
      }],
    },
    actions: [{
      type: {
        type: String,
        enum: ['change_status', 'assign_to', 'add_label', 'remove_label', 'set_priority', 'add_comment', 'send_notification', 'create_subtask', 'update_field', 'move_to_project'],
      },
      config: mongoose.Schema.Types.Mixed,
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    runCount: {
      type: Number,
      default: 0,
    },
    lastRunAt: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
  },
  {
    timestamps: true,
  }
);

taskAutomationSchema.index({ tenant: 1, isActive: 1 });

export const TaskProject = mongoose.model('TaskProject', taskProjectSchema);
export const TaskLabel = mongoose.model('TaskLabel', taskLabelSchema);
export const Task = mongoose.model('TaskEnhanced', taskSchema);
export const TaskComment = mongoose.model('TaskComment', taskCommentSchema);
export const TaskBoard = mongoose.model('TaskBoard', taskBoardSchema);
export const TaskTemplate = mongoose.model('TaskTemplate', taskTemplateSchema);
export const TaskAutomation = mongoose.model('TaskAutomation', taskAutomationSchema);
