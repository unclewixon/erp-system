import mongoose from 'mongoose';

// ============ AUDIT LOG ============
// Comprehensive audit trail for all system activities
const auditLogSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },

  // What happened
  action: {
    type: String,
    enum: [
      // CRUD operations
      'create', 'read', 'update', 'delete', 'bulk_create', 'bulk_update', 'bulk_delete',
      // Status changes
      'approve', 'reject', 'submit', 'cancel', 'close', 'reopen', 'archive', 'restore',
      // Inventory specific
      'stock_in', 'stock_out', 'stock_transfer', 'stock_adjust', 'stock_count', 'stock_reserve', 'stock_release',
      // Asset specific
      'asset_acquire', 'asset_transfer', 'asset_dispose', 'asset_checkout', 'asset_checkin', 'asset_depreciate', 'asset_maintain',
      // Financial
      'payment', 'refund', 'journal_post', 'journal_reverse',
      // User actions
      'login', 'logout', 'password_change', 'permission_change', 'role_change',
      // System
      'import', 'export', 'print', 'email', 'sync', 'backup', 'error',
    ],
    required: true,
  },

  // What entity
  entityType: {
    type: String,
    required: true,
    enum: [
      // Core
      'user', 'tenant', 'branch', 'department', 'employee',
      // HR
      'attendance', 'leave', 'payroll', 'performance', 'training',
      // Inventory
      'warehouse', 'product', 'stock', 'stock_movement', 'stock_take', 'batch', 'serial_number',
      // Assets
      'asset', 'asset_category', 'asset_maintenance', 'asset_transfer', 'asset_disposal', 'asset_audit', 'asset_checkout',
      // Finance
      'expense', 'bill', 'invoice', 'journal', 'account', 'budget', 'wallet',
      // Procurement
      'vendor', 'purchase_order', 'purchase_requisition', 'rfq', 'grn',
      // Other
      'document', 'report', 'setting', 'workflow', 'task',
    ],
  },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  entityNumber: String, // Human-readable reference (e.g., PO-000001)
  entityName: String, // For quick display

  // Who did it
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: String, // Denormalized for quick access
  userEmail: String,
  userRole: String,
  impersonatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // If action was done by admin impersonating

  // When & Where
  timestamp: { type: Date, default: Date.now, required: true },
  ipAddress: String,
  userAgent: String,
  sessionId: String,
  requestId: String, // For tracing API requests

  // Change details
  changes: {
    before: mongoose.Schema.Types.Mixed, // Previous state (for updates/deletes)
    after: mongoose.Schema.Types.Mixed, // New state (for creates/updates)
    changedFields: [String], // List of fields that changed
    summary: String, // Human-readable summary of changes
  },

  // Additional context
  metadata: {
    module: String, // e.g., 'inventory', 'assets', 'finance'
    subModule: String, // e.g., 'stock_movement', 'depreciation'
    workflow: String, // If part of a workflow
    workflowStep: String,
    batchId: String, // For bulk operations
    parentAction: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditLog' }, // For related actions
    relatedEntities: [{
      type: String,
      id: mongoose.Schema.Types.ObjectId,
      name: String,
    }],
    notes: String,
    tags: [String],
  },

  // For inventory movements
  inventoryDetails: {
    movementType: String,
    sourceWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    destinationWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    quantity: Number,
    previousQuantity: Number,
    newQuantity: Number,
    unitCost: Number,
    totalValue: Number,
  },

  // For asset changes
  assetDetails: {
    previousLocation: String,
    newLocation: String,
    previousAssignee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    newAssignee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    previousCondition: String,
    newCondition: String,
    previousValue: Number,
    newValue: Number,
    depreciationAmount: Number,
  },

  // Status & flags
  status: { type: String, enum: ['success', 'failed', 'pending', 'rolled_back'], default: 'success' },
  errorMessage: String,
  isSystemAction: { type: Boolean, default: false }, // Automated vs manual
  isSensitive: { type: Boolean, default: false }, // For sensitive data access
  requiresReview: { type: Boolean, default: false },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  reviewNotes: String,
}, {
  timestamps: true,
  // Prevent modification of audit logs
  strict: true,
});

// Compound indexes for efficient querying
auditLogSchema.index({ tenant: 1, timestamp: -1 });
auditLogSchema.index({ tenant: 1, entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ tenant: 1, user: 1, timestamp: -1 });
auditLogSchema.index({ tenant: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ tenant: 1, 'metadata.module': 1, timestamp: -1 });
auditLogSchema.index({ tenant: 1, status: 1, timestamp: -1 });

// TTL index - optionally auto-delete old logs (e.g., after 2 years)
// auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 });

// Text index for searching
auditLogSchema.index({
  entityName: 'text',
  entityNumber: 'text',
  'changes.summary': 'text',
  'metadata.notes': 'text',
});

// Static method to create audit log entry
auditLogSchema.statics.log = async function(data) {
  try {
    const log = await this.create(data);
    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main operation
    return null;
  }
};

// Static method to log with before/after comparison
auditLogSchema.statics.logChange = async function(data, beforeState, afterState) {
  const changedFields = [];
  const changes = { before: {}, after: {} };

  if (beforeState && afterState) {
    // Compare objects to find changed fields
    const allKeys = new Set([
      ...Object.keys(beforeState._doc || beforeState),
      ...Object.keys(afterState._doc || afterState),
    ]);

    for (const key of allKeys) {
      // Skip internal fields
      if (['_id', '__v', 'createdAt', 'updatedAt'].includes(key)) continue;

      const before = beforeState[key];
      const after = afterState[key];

      if (JSON.stringify(before) !== JSON.stringify(after)) {
        changedFields.push(key);
        changes.before[key] = before;
        changes.after[key] = after;
      }
    }
  } else if (afterState) {
    // Create - only after state
    changes.after = afterState._doc || afterState;
  } else if (beforeState) {
    // Delete - only before state
    changes.before = beforeState._doc || beforeState;
  }

  // Generate summary
  let summary = '';
  if (data.action === 'create') {
    summary = `Created ${data.entityType}: ${data.entityName || data.entityNumber}`;
  } else if (data.action === 'update') {
    summary = `Updated ${changedFields.length} field(s): ${changedFields.join(', ')}`;
  } else if (data.action === 'delete') {
    summary = `Deleted ${data.entityType}: ${data.entityName || data.entityNumber}`;
  } else {
    summary = `${data.action} on ${data.entityType}: ${data.entityName || data.entityNumber}`;
  }

  return this.log({
    ...data,
    changes: {
      ...changes,
      changedFields,
      summary,
    },
  });
};

// ============ AUDIT LOG RETENTION POLICY ============
const auditRetentionPolicySchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },

  // What to retain
  entityTypes: [String], // Empty means all
  actions: [String], // Empty means all
  modules: [String],

  // Retention period
  retentionPeriodDays: { type: Number, required: true, default: 730 }, // 2 years default

  // Archive settings
  archiveBeforeDelete: { type: Boolean, default: true },
  archiveLocation: String,

  // Exceptions
  neverDelete: { type: Boolean, default: false }, // For compliance
  neverDeleteActions: [String], // Specific actions to never delete

  isActive: { type: Boolean, default: true },
  lastCleanupDate: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// ============ AUDIT LOG REPORT ============
const auditReportSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  reportNumber: { type: String, required: true },
  name: { type: String, required: true },

  type: {
    type: String,
    enum: ['activity', 'access', 'changes', 'compliance', 'security', 'custom'],
    default: 'activity',
  },

  // Filters used
  filters: {
    startDate: Date,
    endDate: Date,
    entityTypes: [String],
    actions: [String],
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    modules: [String],
    status: [String],
  },

  // Report data
  generatedAt: { type: Date, default: Date.now },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  summary: {
    totalRecords: Number,
    byAction: mongoose.Schema.Types.Mixed,
    byEntityType: mongoose.Schema.Types.Mixed,
    byUser: mongoose.Schema.Types.Mixed,
    byModule: mongoose.Schema.Types.Mixed,
    topUsers: [{ user: String, count: Number }],
    topEntities: [{ entity: String, count: Number }],
  },

  // Output
  format: { type: String, enum: ['json', 'csv', 'pdf', 'excel'], default: 'pdf' },
  fileUrl: String,
  expiresAt: Date,

  notes: String,
}, { timestamps: true });

auditReportSchema.index({ tenant: 1, reportNumber: 1 }, { unique: true });

auditReportSchema.pre('save', async function(next) {
  if (this.isNew && !this.reportNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.reportNumber = `ARP-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export const AuditRetentionPolicy = mongoose.model('AuditRetentionPolicy', auditRetentionPolicySchema);
export const AuditReport = mongoose.model('AuditReport', auditReportSchema);
