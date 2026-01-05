import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import {
  Channel,
  MessageTemplate,
  Contact,
  ContactGroup,
  Message,
  Conversation,
  Campaign,
  ScheduledMessage,
  AutoReply,
  BroadcastList,
} from '../models/Communication.js';
import { SystemAnnouncement } from '../models/Administration.js';
import MessagingService from '../services/messaging/index.js';
import MessageScheduler from '../services/messaging/scheduler.js';

const router = express.Router();

router.use(protect);
router.use(tenantGuard);

// ============ ANNOUNCEMENTS ============
// Announcements route for dashboard and general access

router.get('/announcements', async (req, res) => {
  try {
    // Super Admin has no tenant - return global announcements only
    if (!req.user.tenant) {
      const announcements = await SystemAnnouncement.find({
        isGlobal: true,
        isPublished: true,
        publishAt: { $lte: new Date() },
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } },
        ],
      })
        .populate('createdBy', 'firstName lastName')
        .sort('-isPinned -priority -publishAt');

      return res.json({ success: true, data: announcements });
    }

    const { includeExpired } = req.query;

    const query = {
      $or: [{ tenant: req.user.tenant }, { isGlobal: true }],
      isPublished: true,
      publishAt: { $lte: new Date() },
    };

    if (includeExpired !== 'true') {
      query.$and = [
        {
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } },
          ],
        },
      ];
    }

    const announcements = await SystemAnnouncement.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort('-isPinned -priority -publishAt');

    res.json({ success: true, data: announcements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ CHANNELS ============

router.get('/channels', authorize('super_admin', 'tenant_admin', 'marketing_manager'), async (req, res) => {
  try {
    const { type, provider, status } = req.query;
    const query = { tenant: req.user.tenant };

    if (type) query.type = type;
    if (provider) query.provider = provider;
    if (status) query.status = status;

    const channels = await Channel.find(query)
      .select('-credentials.authToken -credentials.apiKey -credentials.whatsappAccessToken -credentials.metaPageAccessToken -credentials.telegramBotToken')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: channels });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/channels/:id', authorize('super_admin', 'tenant_admin'), async (req, res) => {
  try {
    const channel = await Channel.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    res.json({ success: true, data: channel });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/channels', authorize('super_admin', 'tenant_admin'), async (req, res) => {
  try {
    const channel = await Channel.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: channel });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/channels/:id', authorize('super_admin', 'tenant_admin'), async (req, res) => {
  try {
    const channel = await Channel.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    res.json({ success: true, data: channel });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/channels/:id/test', authorize('super_admin', 'tenant_admin'), async (req, res) => {
  try {
    const channel = await Channel.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    // Send test message
    const result = await MessagingService.sendMessage({
      channelId: channel._id,
      to: req.body.to,
      content: { type: 'text', text: req.body.message || 'Test message from ERP' },
      createdBy: req.user._id,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ TEMPLATES ============

router.get('/templates', async (req, res) => {
  try {
    const { channelType, category, status } = req.query;
    const query = { tenant: req.user.tenant, isActive: true };

    if (channelType) query.channelType = channelType;
    if (category) query.category = category;
    if (status) query.approvalStatus = status;

    const templates = await MessageTemplate.find(query).sort({ name: 1 });

    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/templates', authorize('super_admin', 'tenant_admin', 'marketing_manager'), async (req, res) => {
  try {
    const template = await MessageTemplate.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/templates/:id', authorize('super_admin', 'tenant_admin', 'marketing_manager'), async (req, res) => {
  try {
    const template = await MessageTemplate.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
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

// ============ CONTACTS ============

router.get('/contacts', async (req, res) => {
  try {
    const { search, group, tags, status, page = 1, limit = 50 } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (group) query.groups = group;
    if (tags) query.tags = { $in: tags.split(',') };
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Contact.countDocuments(query);
    const contacts = await Contact.find(query)
      .populate('groups', 'name')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: contacts,
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

router.get('/contacts/:id', async (req, res) => {
  try {
    const contact = await Contact.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    }).populate('groups', 'name');

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    // Get recent messages
    const recentMessages = await Message.find({
      tenant: req.user.tenant,
      contact: contact._id,
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, data: { ...contact.toObject(), recentMessages } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/contacts', async (req, res) => {
  try {
    const contact = await Contact.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: contact });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/contacts/:id', async (req, res) => {
  try {
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    res.json({ success: true, data: contact });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/contacts/import', authorize('super_admin', 'tenant_admin', 'marketing_manager'), async (req, res) => {
  try {
    const { contacts, groupId, tags } = req.body;

    const results = {
      imported: 0,
      skipped: 0,
      errors: [],
    };

    for (const contactData of contacts) {
      try {
        // Check for duplicates
        const existing = await Contact.findOne({
          tenant: req.user.tenant,
          $or: [
            { phone: contactData.phone },
            { email: contactData.email },
          ],
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        await Contact.create({
          ...contactData,
          tenant: req.user.tenant,
          groups: groupId ? [groupId] : [],
          tags: tags || [],
          source: 'import',
          createdBy: req.user._id,
        });

        results.imported++;
      } catch (error) {
        results.errors.push({ contact: contactData.phone || contactData.email, error: error.message });
      }
    }

    // Update group member count
    if (groupId) {
      const count = await Contact.countDocuments({
        tenant: req.user.tenant,
        groups: groupId,
        status: 'active',
      });
      await ContactGroup.findByIdAndUpdate(groupId, { memberCount: count });
    }

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ CONTACT GROUPS ============

router.get('/groups', async (req, res) => {
  try {
    const groups = await ContactGroup.find({
      tenant: req.user.tenant,
      isActive: true,
    }).sort({ name: 1 });

    res.json({ success: true, data: groups });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/groups', async (req, res) => {
  try {
    const group = await ContactGroup.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: group });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/groups/:id/add-contacts', async (req, res) => {
  try {
    const { contactIds } = req.body;

    await Contact.updateMany(
      { _id: { $in: contactIds }, tenant: req.user.tenant },
      { $addToSet: { groups: req.params.id } }
    );

    // Update member count
    const count = await Contact.countDocuments({
      tenant: req.user.tenant,
      groups: req.params.id,
      status: 'active',
    });
    await ContactGroup.findByIdAndUpdate(req.params.id, { memberCount: count });

    res.json({ success: true, message: 'Contacts added to group' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ MESSAGES ============

router.get('/messages', async (req, res) => {
  try {
    const { contact, channel, direction, status, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query = { tenant: req.user.tenant };

    if (contact) query.contact = contact;
    if (channel) query.channel = channel;
    if (direction) query.direction = direction;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await Message.countDocuments(query);
    const messages = await Message.find(query)
      .populate('contact', 'firstName lastName phone')
      .populate('channel', 'name type')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: messages,
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

router.post('/messages/send', authorize('super_admin', 'tenant_admin', 'marketing_manager'), async (req, res) => {
  try {
    const { channelId, to, content, templateId, templateVariables, contactId, scheduledFor } = req.body;

    let template = null;
    if (templateId) {
      template = await MessageTemplate.findOne({ _id: templateId, tenant: req.user.tenant });
    }

    let contact = null;
    if (contactId) {
      contact = await Contact.findOne({ _id: contactId, tenant: req.user.tenant });
    }

    const result = await MessagingService.sendMessage({
      channelId,
      to,
      content,
      template,
      templateVariables,
      contact,
      scheduledFor,
      createdBy: req.user._id,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/messages/send-bulk', authorize('super_admin', 'tenant_admin', 'marketing_manager'), async (req, res) => {
  try {
    const { channelId, recipients, content, templateId, templateVariables, throttle } = req.body;

    let template = null;
    if (templateId) {
      template = await MessageTemplate.findOne({ _id: templateId, tenant: req.user.tenant });
    }

    const result = await MessagingService.sendBulk({
      channelId,
      recipients,
      content,
      template,
      templateVariables,
      throttle,
      createdBy: req.user._id,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ SCHEDULED MESSAGES ============

router.get('/scheduled', async (req, res) => {
  try {
    const { status, channelType } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (channelType) query.channelType = channelType;

    const scheduled = await ScheduledMessage.find(query)
      .populate('contact', 'firstName lastName phone')
      .populate('channel', 'name type')
      .populate('template', 'name')
      .sort({ scheduledFor: 1 });

    res.json({ success: true, data: scheduled });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/scheduled', authorize('super_admin', 'tenant_admin', 'marketing_manager'), async (req, res) => {
  try {
    const scheduled = await MessageScheduler.scheduleMessage({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: scheduled });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/scheduled/:id', authorize('super_admin', 'tenant_admin', 'marketing_manager'), async (req, res) => {
  try {
    const scheduled = await MessageScheduler.cancelScheduled(req.params.id, req.user.tenant);

    if (!scheduled) {
      return res.status(404).json({ success: false, message: 'Scheduled message not found' });
    }

    res.json({ success: true, message: 'Scheduled message cancelled' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ CONVERSATIONS ============

router.get('/conversations', async (req, res) => {
  try {
    const { status, channel, assignedTo, unread } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (channel) query.channel = channel;
    if (assignedTo) query.assignedTo = assignedTo;
    if (unread === 'true') query.unreadCount = { $gt: 0 };

    const conversations = await Conversation.find(query)
      .populate('contact', 'firstName lastName phone email')
      .populate('channel', 'name type')
      .populate('assignedTo', 'firstName lastName')
      .sort({ lastMessageAt: -1 });

    res.json({ success: true, data: conversations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/conversations/:id', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('contact')
      .populate('channel', 'name type')
      .populate('assignedTo', 'firstName lastName');

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Get messages for this conversation
    const messages = await Message.find({
      conversation: conversation._id,
    }).sort({ createdAt: 1 });

    // Mark as read
    if (conversation.unreadCount > 0) {
      conversation.unreadCount = 0;
      await conversation.save();
    }

    res.json({ success: true, data: { ...conversation.toObject(), messages } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/conversations/:id/assign', async (req, res) => {
  try {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      {
        assignedTo: req.body.userId,
        assignedAt: new Date(),
      },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    res.json({ success: true, data: conversation });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/conversations/:id/resolve', async (req, res) => {
  try {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: req.user._id,
      },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    res.json({ success: true, data: conversation });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ CAMPAIGNS ============

router.get('/campaigns', authorize('super_admin', 'tenant_admin', 'marketing_manager'), async (req, res) => {
  try {
    const { status, type, channelType } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (type) query.type = type;
    if (channelType) query.channelType = channelType;

    const campaigns = await Campaign.find(query)
      .populate('channel', 'name type')
      .populate('template', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: campaigns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/campaigns/:id', authorize('super_admin', 'tenant_admin', 'marketing_manager'), async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('channel', 'name type')
      .populate('template')
      .populate('audience.groups', 'name');

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    // Get message stats
    const messageStats = await Message.aggregate([
      { $match: { campaign: campaign._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({ success: true, data: { ...campaign.toObject(), messageStats } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/campaigns', authorize('super_admin', 'tenant_admin', 'marketing_manager'), async (req, res) => {
  try {
    const campaign = await Campaign.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/campaigns/:id', authorize('super_admin', 'tenant_admin', 'marketing_manager'), async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: 'draft',
    });

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found or cannot be edited' });
    }

    Object.assign(campaign, req.body);
    await campaign.save();

    res.json({ success: true, data: campaign });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/campaigns/:id/schedule', authorize('super_admin', 'tenant_admin', 'marketing_manager'), async (req, res) => {
  try {
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: 'draft' },
      {
        status: 'scheduled',
        'schedule.scheduledAt': req.body.scheduledAt,
      },
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    res.json({ success: true, data: campaign });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/campaigns/:id/pause', authorize('super_admin', 'tenant_admin', 'marketing_manager'), async (req, res) => {
  try {
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: 'running' },
      { status: 'paused', pausedAt: new Date() },
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    res.json({ success: true, data: campaign });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/campaigns/:id/cancel', authorize('super_admin', 'tenant_admin'), async (req, res) => {
  try {
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: { $in: ['scheduled', 'running', 'paused'] } },
      { status: 'cancelled' },
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    // Cancel queued messages
    await Message.updateMany(
      { campaign: campaign._id, status: 'queued' },
      { status: 'cancelled' }
    );

    res.json({ success: true, data: campaign });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ AUTO REPLIES ============

router.get('/auto-replies', authorize('super_admin', 'tenant_admin', 'marketing_manager'), async (req, res) => {
  try {
    const autoReplies = await AutoReply.find({
      tenant: req.user.tenant,
    })
      .populate('response.template', 'name')
      .sort({ priority: -1 });

    res.json({ success: true, data: autoReplies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/auto-replies', authorize('super_admin', 'tenant_admin', 'marketing_manager'), async (req, res) => {
  try {
    const autoReply = await AutoReply.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: autoReply });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/auto-replies/:id', authorize('super_admin', 'tenant_admin', 'marketing_manager'), async (req, res) => {
  try {
    const autoReply = await AutoReply.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    if (!autoReply) {
      return res.status(404).json({ success: false, message: 'Auto reply not found' });
    }

    res.json({ success: true, data: autoReply });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ BROADCAST LISTS ============

router.get('/broadcast-lists', async (req, res) => {
  try {
    const lists = await BroadcastList.find({
      tenant: req.user.tenant,
      isActive: true,
    }).sort({ name: 1 });

    res.json({ success: true, data: lists });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/broadcast-lists', async (req, res) => {
  try {
    const list = await BroadcastList.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: list });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ ANALYTICS ============

router.get('/analytics/summary', authorize('super_admin', 'tenant_admin', 'marketing_manager'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateQuery = {};

    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) dateQuery.$lte = new Date(endDate);

    const [messageStats, channelStats, campaignStats, contactStats] = await Promise.all([
      // Message stats
      Message.aggregate([
        {
          $match: {
            tenant: req.user.tenant,
            ...(Object.keys(dateQuery).length && { createdAt: dateQuery }),
          },
        },
        {
          $group: {
            _id: { direction: '$direction', status: '$status' },
            count: { $sum: 1 },
          },
        },
      ]),

      // By channel type
      Message.aggregate([
        {
          $match: {
            tenant: req.user.tenant,
            ...(Object.keys(dateQuery).length && { createdAt: dateQuery }),
          },
        },
        {
          $group: {
            _id: '$channelType',
            sent: { $sum: { $cond: [{ $eq: ['$direction', 'outbound'] }, 1, 0] } },
            received: { $sum: { $cond: [{ $eq: ['$direction', 'inbound'] }, 1, 0] } },
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            read: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          },
        },
      ]),

      // Campaign stats
      Campaign.aggregate([
        { $match: { tenant: req.user.tenant } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalSent: { $sum: '$progress.sent' },
            totalDelivered: { $sum: '$progress.delivered' },
            totalCost: { $sum: '$totalCost' },
          },
        },
      ]),

      // Contact stats
      Contact.aggregate([
        { $match: { tenant: req.user.tenant } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        messages: messageStats,
        byChannel: channelStats,
        campaigns: campaignStats,
        contacts: contactStats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/analytics/trends', authorize('super_admin', 'tenant_admin', 'marketing_manager'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const trends = await Message.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            direction: '$direction',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    res.json({ success: true, data: trends });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
