import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import {
  SystemSetting,
  NotificationTemplate,
  NotificationLog,
  NotificationPreference,
  InAppNotification,
  AuditPreference,
  ScheduledJob,
  DataExportRequest,
  IntegrationLog,
  FeatureFlag,
  SystemAnnouncement,
} from '../models/Administration.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// ============================================
// SYSTEM SETTINGS ROUTES
// ============================================

// @route   GET /api/administration/settings
router.get('/settings', tenantGuard, authorize('admin'), async (req, res) => {
  try {
    const { category } = req.query;

    const query = { tenant: req.user.tenant };
    if (category) query.category = category;

    const settings = await SystemSetting.find(query)
      .select('-modificationHistory')
      .sort('category key');

    // Group by category
    const grouped = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) acc[setting.category] = [];
      acc[setting.category].push(setting);
      return acc;
    }, {});

    res.json({ success: true, data: grouped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/administration/settings/:category/:key
router.get('/settings/:category/:key', tenantGuard, authorize('admin'), async (req, res) => {
  try {
    const setting = await SystemSetting.findOne({
      tenant: req.user.tenant,
      category: req.params.category,
      key: req.params.key,
    });

    if (!setting) {
      return res.status(404).json({ success: false, message: 'Setting not found' });
    }

    res.json({ success: true, data: setting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/administration/settings/:category/:key
router.put('/settings/:category/:key', tenantGuard, authorize('admin'), async (req, res) => {
  try {
    const { value, reason } = req.body;

    const setting = await SystemSetting.findOne({
      tenant: req.user.tenant,
      category: req.params.category,
      key: req.params.key,
    });

    if (!setting) {
      return res.status(404).json({ success: false, message: 'Setting not found' });
    }

    if (!setting.isEditable) {
      return res.status(403).json({ success: false, message: 'Setting is not editable' });
    }

    // Add to modification history
    setting.modificationHistory.push({
      oldValue: setting.value,
      newValue: value,
      modifiedBy: req.user.employee,
      reason,
    });

    setting.value = value;
    setting.lastModifiedBy = req.user.employee;
    await setting.save();

    res.json({ success: true, data: setting });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/administration/settings/bulk
router.post('/settings/bulk', tenantGuard, authorize('admin'), async (req, res) => {
  try {
    const { settings } = req.body;

    const results = [];
    for (const item of settings) {
      const setting = await SystemSetting.findOneAndUpdate(
        {
          tenant: req.user.tenant,
          category: item.category,
          key: item.key,
        },
        {
          value: item.value,
          lastModifiedBy: req.user.employee,
          $push: {
            modificationHistory: {
              newValue: item.value,
              modifiedBy: req.user.employee,
            },
          },
        },
        { new: true, upsert: true }
      );
      results.push(setting);
    }

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// NOTIFICATION TEMPLATE ROUTES
// ============================================

// @route   GET /api/administration/notification-templates
router.get('/notification-templates', tenantGuard, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { category, event } = req.query;

    const query = { tenant: req.user.tenant };
    if (category) query.category = category;
    if (event) query.event = event;

    const templates = await NotificationTemplate.find(query).sort('category event');

    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/administration/notification-templates/:id
router.get('/notification-templates/:id', tenantGuard, authorize('admin', 'hr'), async (req, res) => {
  try {
    const template = await NotificationTemplate.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('recipients.roles', 'name')
      .populate('createdBy', 'firstName lastName');

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/administration/notification-templates
router.post('/notification-templates', tenantGuard, authorize('admin'), async (req, res) => {
  try {
    const template = await NotificationTemplate.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user.employee,
    });

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/administration/notification-templates/:id
router.put('/notification-templates/:id', tenantGuard, authorize('admin'), async (req, res) => {
  try {
    const template = await NotificationTemplate.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      { ...req.body, updatedBy: req.user.employee },
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/administration/notification-templates/:id/test
router.post('/notification-templates/:id/test', tenantGuard, authorize('admin'), async (req, res) => {
  try {
    const { channel, testData } = req.body;

    const template = await NotificationTemplate.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    // Create test notification log
    await NotificationLog.create({
      tenant: req.user.tenant,
      template: template._id,
      event: 'test',
      channel,
      recipient: req.user.employee,
      subject: template.channels[channel]?.subject || template.channels[channel]?.title,
      content: template.channels[channel]?.body || template.channels[channel]?.message,
      status: 'pending',
      metadata: {
        isTest: true,
        testData,
      },
    });

    res.json({ success: true, message: 'Test notification queued' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// NOTIFICATION LOG ROUTES
// ============================================

// @route   GET /api/administration/notification-logs
router.get('/notification-logs', tenantGuard, authorize('admin'), async (req, res) => {
  try {
    const { channel, status, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = { tenant: req.user.tenant };
    if (channel) query.channel = channel;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await NotificationLog.find(query)
      .populate('template', 'name code')
      .populate('recipient', 'firstName lastName email')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await NotificationLog.countDocuments(query);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/administration/notification-logs/stats
router.get('/notification-logs/stats', tenantGuard, authorize('admin'), async (req, res) => {
  try {
    const stats = await NotificationLog.aggregate([
      { $match: { tenant: req.user.tenant } },
      {
        $group: {
          _id: {
            channel: '$channel',
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// NOTIFICATION PREFERENCE ROUTES
// ============================================

// @route   GET /api/administration/notification-preferences
router.get('/notification-preferences', tenantGuard, async (req, res) => {
  try {
    let preferences = await NotificationPreference.findOne({
      tenant: req.user.tenant,
      employee: req.user.employee,
    });

    if (!preferences) {
      // Return default preferences
      preferences = {
        channels: {
          email: { enabled: true },
          sms: { enabled: true },
          push: { enabled: true },
          inApp: { enabled: true },
        },
        categories: {},
        quietHours: { enabled: false },
        digestPreference: { enabled: false },
      };
    }

    res.json({ success: true, data: preferences });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/administration/notification-preferences
router.put('/notification-preferences', tenantGuard, async (req, res) => {
  try {
    const preferences = await NotificationPreference.findOneAndUpdate(
      { tenant: req.user.tenant, employee: req.user.employee },
      { ...req.body, tenant: req.user.tenant, employee: req.user.employee },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, data: preferences });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/administration/notification-preferences/devices
router.post('/notification-preferences/devices', tenantGuard, async (req, res) => {
  try {
    const { deviceId, deviceType, token } = req.body;

    const preferences = await NotificationPreference.findOneAndUpdate(
      { tenant: req.user.tenant, employee: req.user.employee },
      {
        $push: {
          'channels.push.devices': {
            deviceId,
            deviceType,
            token,
            addedAt: new Date(),
          },
        },
      },
      { new: true, upsert: true }
    );

    res.json({ success: true, data: preferences.channels.push.devices });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// IN-APP NOTIFICATION ROUTES
// ============================================

// @route   GET /api/administration/notifications
router.get('/notifications', tenantGuard, async (req, res) => {
  try {
    const { unreadOnly, page = 1, limit = 20 } = req.query;

    const query = {
      tenant: req.user.tenant,
      recipient: req.user.employee,
      isArchived: false,
    };

    if (unreadOnly === 'true') query.isRead = false;

    const notifications = await InAppNotification.find(query)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const unreadCount = await InAppNotification.countDocuments({
      ...query,
      isRead: false,
    });

    res.json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/administration/notifications/:id/read
router.put('/notifications/:id/read', tenantGuard, async (req, res) => {
  try {
    const notification = await InAppNotification.findOneAndUpdate(
      {
        _id: req.params.id,
        tenant: req.user.tenant,
        recipient: req.user.employee,
      },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/administration/notifications/read-all
router.put('/notifications/read-all', tenantGuard, async (req, res) => {
  try {
    await InAppNotification.updateMany(
      {
        tenant: req.user.tenant,
        recipient: req.user.employee,
        isRead: false,
      },
      { isRead: true, readAt: new Date() }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/administration/notifications/:id
router.delete('/notifications/:id', tenantGuard, async (req, res) => {
  try {
    await InAppNotification.findOneAndUpdate(
      {
        _id: req.params.id,
        tenant: req.user.tenant,
        recipient: req.user.employee,
      },
      { isArchived: true, archivedAt: new Date() }
    );

    res.json({ success: true, message: 'Notification archived' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// AUDIT PREFERENCE ROUTES
// ============================================

// @route   GET /api/administration/audit-preferences
router.get('/audit-preferences', tenantGuard, authorize('admin'), async (req, res) => {
  try {
    const preferences = await AuditPreference.find({
      tenant: req.user.tenant,
    }).sort('entity');

    res.json({ success: true, data: preferences });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/administration/audit-preferences/:entity
router.put('/audit-preferences/:entity', tenantGuard, authorize('admin'), async (req, res) => {
  try {
    const preference = await AuditPreference.findOneAndUpdate(
      { tenant: req.user.tenant, entity: req.params.entity },
      { ...req.body, tenant: req.user.tenant, entity: req.params.entity },
      { new: true, upsert: true }
    );

    res.json({ success: true, data: preference });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// SCHEDULED JOB ROUTES
// ============================================

// @route   GET /api/administration/scheduled-jobs
router.get('/scheduled-jobs', tenantGuard, authorize('admin'), async (req, res) => {
  try {
    const { status, type } = req.query;

    const query = { tenant: req.user.tenant };
    if (status) query.status = status;
    if (type) query.jobType = type;

    const jobs = await ScheduledJob.find(query)
      .populate('notifyTo', 'firstName lastName email')
      .sort('nextRunAt');

    res.json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/administration/scheduled-jobs
router.post('/scheduled-jobs', tenantGuard, authorize('admin'), async (req, res) => {
  try {
    const job = await ScheduledJob.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user.employee,
    });

    res.status(201).json({ success: true, data: job });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/administration/scheduled-jobs/:id
router.put('/scheduled-jobs/:id', tenantGuard, authorize('admin'), async (req, res) => {
  try {
    const job = await ScheduledJob.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    res.json({ success: true, data: job });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/administration/scheduled-jobs/:id/run
router.post('/scheduled-jobs/:id/run', tenantGuard, authorize('admin'), async (req, res) => {
  try {
    const job = await ScheduledJob.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Mark as running
    job.lastRunAt = new Date();
    await job.save();

    // In a real implementation, this would trigger the actual job
    res.json({ success: true, message: 'Job triggered' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// DATA EXPORT ROUTES
// ============================================

// @route   GET /api/administration/exports
router.get('/exports', tenantGuard, async (req, res) => {
  try {
    const exports = await DataExportRequest.find({
      tenant: req.user.tenant,
      requestedBy: req.user.employee,
    }).sort('-createdAt');

    res.json({ success: true, data: exports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/administration/exports
router.post('/exports', tenantGuard, async (req, res) => {
  try {
    const exportRequest = await DataExportRequest.create({
      ...req.body,
      tenant: req.user.tenant,
      requestedBy: req.user.employee,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // In a real implementation, this would trigger an async export job
    res.status(201).json({ success: true, data: exportRequest });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   GET /api/administration/exports/:id/download
router.get('/exports/:id/download', tenantGuard, async (req, res) => {
  try {
    const exportRequest = await DataExportRequest.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      requestedBy: req.user.employee,
      status: 'completed',
    });

    if (!exportRequest) {
      return res.status(404).json({ success: false, message: 'Export not found' });
    }

    if (new Date() > exportRequest.expiresAt) {
      return res.status(410).json({ success: false, message: 'Export has expired' });
    }

    // Update download stats
    exportRequest.downloadCount += 1;
    exportRequest.lastDownloadAt = new Date();
    await exportRequest.save();

    // In a real implementation, this would stream the file
    res.json({
      success: true,
      data: { downloadUrl: exportRequest.filePath },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// INTEGRATION LOG ROUTES
// ============================================

// @route   GET /api/administration/integration-logs
router.get('/integration-logs', tenantGuard, authorize('admin'), async (req, res) => {
  try {
    const { integration, status, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = { tenant: req.user.tenant };
    if (integration) query.integration = integration;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await IntegrationLog.find(query)
      .select('-requestBody -responseBody')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await IntegrationLog.countDocuments(query);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/administration/integration-logs/:id
router.get('/integration-logs/:id', tenantGuard, authorize('admin'), async (req, res) => {
  try {
    const log = await IntegrationLog.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!log) {
      return res.status(404).json({ success: false, message: 'Log not found' });
    }

    res.json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// FEATURE FLAG ROUTES
// ============================================

// @route   GET /api/administration/feature-flags
router.get('/feature-flags', tenantGuard, authorize('admin'), async (req, res) => {
  try {
    const flags = await FeatureFlag.find({
      $or: [{ tenant: req.user.tenant }, { isGlobal: true }],
    })
      .populate('enabledFor.branches', 'name')
      .populate('enabledFor.departments', 'name')
      .sort('name');

    res.json({ success: true, data: flags });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/administration/feature-flags
router.post('/feature-flags', tenantGuard, authorize('admin'), async (req, res) => {
  try {
    const flag = await FeatureFlag.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user.employee,
    });

    res.status(201).json({ success: true, data: flag });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/administration/feature-flags/:id
router.put('/feature-flags/:id', tenantGuard, authorize('admin'), async (req, res) => {
  try {
    const flag = await FeatureFlag.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true }
    );

    if (!flag) {
      return res.status(404).json({ success: false, message: 'Feature flag not found' });
    }

    res.json({ success: true, data: flag });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   GET /api/administration/feature-flags/check/:code
router.get('/feature-flags/check/:code', tenantGuard, async (req, res) => {
  try {
    const flag = await FeatureFlag.findOne({
      code: req.params.code.toUpperCase(),
      $or: [{ tenant: req.user.tenant }, { isGlobal: true }],
    });

    if (!flag) {
      return res.json({ success: true, data: { enabled: false } });
    }

    // Check if enabled for user
    let enabled = flag.isEnabled;

    // Check rollout percentage
    if (enabled && flag.rolloutPercentage < 100) {
      const userHash = req.user.employee.toString().split('').reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0);
      enabled = Math.abs(userHash % 100) < flag.rolloutPercentage;
    }

    // Check date range
    if (enabled && flag.startDate && new Date() < flag.startDate) {
      enabled = false;
    }
    if (enabled && flag.endDate && new Date() > flag.endDate) {
      enabled = false;
    }

    res.json({ success: true, data: { enabled, metadata: flag.metadata } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// SYSTEM ANNOUNCEMENT ROUTES
// ============================================

// @route   GET /api/administration/announcements
router.get('/announcements', tenantGuard, async (req, res) => {
  try {
    const { includeExpired } = req.query;

    const query = {
      $or: [{ tenant: req.user.tenant }, { isGlobal: true }],
      isPublished: true,
      publishAt: { $lte: new Date() },
    };

    if (includeExpired !== 'true') {
      query.$or.push(
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      );
    }

    const announcements = await SystemAnnouncement.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort('-isPinned -priority -publishAt');

    res.json({ success: true, data: announcements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/administration/announcements
router.post('/announcements', tenantGuard, authorize('admin', 'hr'), async (req, res) => {
  try {
    const announcement = await SystemAnnouncement.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user.employee,
    });

    res.status(201).json({ success: true, data: announcement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/administration/announcements/:id
router.put('/announcements/:id', tenantGuard, authorize('admin', 'hr'), async (req, res) => {
  try {
    const announcement = await SystemAnnouncement.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      { ...req.body, updatedBy: req.user.employee },
      { new: true }
    );

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    res.json({ success: true, data: announcement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/administration/announcements/:id/acknowledge
router.post('/announcements/:id/acknowledge', tenantGuard, async (req, res) => {
  try {
    const announcement = await SystemAnnouncement.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [{ tenant: req.user.tenant }, { isGlobal: true }],
        requiresAcknowledgement: true,
      },
      {
        $addToSet: {
          acknowledgements: {
            employee: req.user.employee,
          },
        },
      },
      { new: true }
    );

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    res.json({ success: true, message: 'Acknowledged' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/administration/announcements/:id
router.delete('/announcements/:id', tenantGuard, authorize('admin'), async (req, res) => {
  try {
    await SystemAnnouncement.findOneAndDelete({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    res.json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// DASHBOARD / ANALYTICS
// ============================================

// @route   GET /api/administration/dashboard
router.get('/dashboard', tenantGuard, authorize('admin'), async (req, res) => {
  try {
    const [
      notificationStats,
      integrationHealth,
      activeJobs,
      pendingExports,
      recentAnnouncements,
    ] = await Promise.all([
      // Notification stats (last 24 hours)
      NotificationLog.aggregate([
        {
          $match: {
            tenant: req.user.tenant,
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),

      // Integration health (last 24 hours)
      IntegrationLog.aggregate([
        {
          $match: {
            tenant: req.user.tenant,
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { integration: '$integration', status: '$status' },
            count: { $sum: 1 },
          },
        },
      ]),

      // Active scheduled jobs
      ScheduledJob.countDocuments({
        tenant: req.user.tenant,
        status: 'active',
      }),

      // Pending exports
      DataExportRequest.countDocuments({
        tenant: req.user.tenant,
        status: { $in: ['pending', 'processing'] },
      }),

      // Recent announcements
      SystemAnnouncement.find({
        tenant: req.user.tenant,
        isPublished: true,
      })
        .sort('-createdAt')
        .limit(5)
        .select('title type priority createdAt'),
    ]);

    res.json({
      success: true,
      data: {
        notificationStats,
        integrationHealth,
        activeJobs,
        pendingExports,
        recentAnnouncements,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
