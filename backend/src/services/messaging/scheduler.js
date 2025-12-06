// Message Scheduler Service
// Handles scheduled messages and recurring campaigns

import { ScheduledMessage, Campaign, Message } from '../../models/Communication.js';
import MessagingService from './index.js';

class MessageScheduler {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.checkInterval = 60000; // Check every minute
  }

  // Start the scheduler
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('Message scheduler started');

    // Initial run
    this.processScheduledMessages();
    this.processCampaigns();

    // Set up interval
    this.intervalId = setInterval(() => {
      this.processScheduledMessages();
      this.processCampaigns();
    }, this.checkInterval);
  }

  // Stop the scheduler
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Message scheduler stopped');
  }

  // Process pending scheduled messages
  async processScheduledMessages() {
    try {
      const now = new Date();

      // Find messages due to be sent
      const pendingMessages = await ScheduledMessage.find({
        status: 'pending',
        scheduledFor: { $lte: now },
      })
        .populate('channel')
        .populate('template')
        .populate('contact')
        .limit(100);

      for (const scheduled of pendingMessages) {
        try {
          // Mark as processing
          scheduled.status = 'processing';
          await scheduled.save();

          // Send the message
          await MessagingService.sendMessage({
            channelId: scheduled.channel._id,
            to: scheduled.contact?.phone || scheduled.contact?.channels?.[scheduled.channelType]?.phoneNumber,
            content: scheduled.content,
            template: scheduled.template,
            contact: scheduled.contact,
            campaign: scheduled.campaign,
            createdBy: scheduled.createdBy,
          });

          // Update status
          scheduled.status = 'sent';
          scheduled.sentAt = new Date();

          // Handle recurring
          if (scheduled.isRecurring && scheduled.recurringPattern) {
            const nextDate = this.calculateNextOccurrence(scheduled);
            if (nextDate) {
              scheduled.nextOccurrence = nextDate;
              scheduled.occurrenceCount += 1;
              scheduled.status = 'pending';
              scheduled.scheduledFor = nextDate;
            }
          }

          await scheduled.save();
        } catch (error) {
          console.error(`Failed to send scheduled message ${scheduled.scheduleId}:`, error);
          scheduled.status = 'failed';
          scheduled.failedAt = new Date();
          scheduled.failureReason = error.message;
          await scheduled.save();
        }
      }
    } catch (error) {
      console.error('Error processing scheduled messages:', error);
    }
  }

  // Process scheduled campaigns
  async processCampaigns() {
    try {
      const now = new Date();

      // Find campaigns ready to start
      const scheduledCampaigns = await Campaign.find({
        status: 'scheduled',
        'schedule.scheduledAt': { $lte: now },
      });

      for (const campaign of scheduledCampaigns) {
        try {
          await this.startCampaign(campaign);
        } catch (error) {
          console.error(`Failed to start campaign ${campaign.campaignId}:`, error);
          campaign.status = 'failed';
          await campaign.save();
        }
      }

      // Process running campaigns with throttling
      const runningCampaigns = await Campaign.find({
        status: 'running',
        'progress.sent': { $lt: '$progress.total' },
      });

      for (const campaign of runningCampaigns) {
        try {
          await this.continueCampaign(campaign);
        } catch (error) {
          console.error(`Error in campaign ${campaign.campaignId}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing campaigns:', error);
    }
  }

  // Start a campaign
  async startCampaign(campaign) {
    campaign.status = 'running';
    campaign.startedAt = new Date();
    await campaign.save();

    // Get recipients based on audience settings
    const recipients = await this.getAudienceRecipients(campaign);

    campaign.progress.total = recipients.length;
    await campaign.save();

    // Queue messages for each recipient
    for (const recipient of recipients) {
      await this.queueCampaignMessage(campaign, recipient);
    }
  }

  // Continue processing a running campaign
  async continueCampaign(campaign) {
    // Find queued messages for this campaign
    const pendingMessages = await Message.find({
      campaign: campaign._id,
      status: 'queued',
    })
      .limit(campaign.throttle?.messagesPerMinute || 60)
      .populate('contact');

    for (const message of pendingMessages) {
      try {
        // Send the message
        message.status = 'sending';
        await message.save();

        const result = await MessagingService.sendMessage({
          channelId: campaign.channel,
          to: message.to,
          content: message.content,
          template: campaign.template,
          contact: message.contact,
          campaign: campaign._id,
        });

        // Update campaign progress
        campaign.progress.sent += 1;
        if (result.status === 'delivered') {
          campaign.progress.delivered += 1;
        }
        campaign.totalCost += result.cost?.amount || 0;
        await campaign.save();
      } catch (error) {
        campaign.progress.failed += 1;
        await campaign.save();
      }
    }

    // Check if campaign is complete
    if (campaign.progress.sent >= campaign.progress.total) {
      campaign.status = 'completed';
      campaign.completedAt = new Date();
      await campaign.save();
    }
  }

  // Get recipients based on audience settings
  async getAudienceRecipients(campaign) {
    const { Contact, ContactGroup } = await import('../../models/Communication.js');

    let query = { tenant: campaign.tenant, status: 'active' };

    switch (campaign.audience.type) {
      case 'all':
        // All opted-in contacts for the channel
        if (campaign.channelType === 'whatsapp') {
          query['channels.whatsapp.optedIn'] = true;
        } else if (campaign.channelType === 'sms') {
          query['channels.sms.optedIn'] = { $ne: false };
        } else if (campaign.channelType === 'telegram') {
          query['channels.telegram.optedIn'] = true;
        }
        break;

      case 'groups':
        query.groups = { $in: campaign.audience.groups };
        break;

      case 'tags':
        query.tags = { $in: campaign.audience.tags };
        break;

      case 'filter':
        Object.assign(query, campaign.audience.filters);
        break;
    }

    // Apply exclusions
    if (campaign.audience.excludeGroups?.length) {
      query.groups = { ...query.groups, $nin: campaign.audience.excludeGroups };
    }
    if (campaign.audience.excludeTags?.length) {
      query.tags = { ...query.tags, $nin: campaign.audience.excludeTags };
    }

    const contacts = await Contact.find(query);

    // Format recipients
    return contacts.map(contact => ({
      contact: contact._id,
      to: this.getContactChannel(contact, campaign.channelType),
      variables: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        phone: contact.phone,
        email: contact.email,
      },
    })).filter(r => r.to); // Only include contacts with valid channel
  }

  // Get contact's channel identifier
  getContactChannel(contact, channelType) {
    switch (channelType) {
      case 'sms':
        return contact.phone || contact.channels?.sms?.phoneNumber;
      case 'whatsapp':
        return contact.channels?.whatsapp?.phoneNumber || contact.phone;
      case 'telegram':
        return contact.channels?.telegram?.chatId;
      case 'facebook':
        return contact.channels?.facebook?.pageScoppedId;
      case 'instagram':
        return contact.channels?.instagram?.igScopedId;
      case 'email':
        return contact.email || contact.channels?.email?.address;
      default:
        return contact.phone;
    }
  }

  // Queue a campaign message
  async queueCampaignMessage(campaign, recipient) {
    await Message.create({
      tenant: campaign.tenant,
      direction: 'outbound',
      channel: campaign.channel,
      channelType: campaign.channelType,
      to: recipient.to,
      contact: recipient.contact,
      content: MessagingService.replaceVariables(campaign.content, recipient.variables),
      template: campaign.template,
      campaign: campaign._id,
      status: 'queued',
      statusHistory: [{ status: 'queued', timestamp: new Date() }],
      createdBy: campaign.createdBy,
    });
  }

  // Calculate next occurrence for recurring messages
  calculateNextOccurrence(scheduled) {
    const pattern = scheduled.recurringPattern;
    const lastDate = scheduled.scheduledFor;
    const interval = pattern.interval || 1;

    // Check if we've reached the end
    if (pattern.endDate && lastDate >= pattern.endDate) {
      return null;
    }
    if (pattern.occurrences && scheduled.occurrenceCount >= pattern.occurrences) {
      return null;
    }

    let nextDate = new Date(lastDate);

    switch (pattern.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + interval);
        break;

      case 'weekly':
        if (pattern.daysOfWeek?.length) {
          // Find next matching day
          do {
            nextDate.setDate(nextDate.getDate() + 1);
          } while (!pattern.daysOfWeek.includes(nextDate.getDay()));
        } else {
          nextDate.setDate(nextDate.getDate() + (7 * interval));
        }
        break;

      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + interval);
        if (pattern.dayOfMonth) {
          nextDate.setDate(pattern.dayOfMonth);
        }
        break;

      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        break;
    }

    return nextDate;
  }

  // Schedule a single message
  async scheduleMessage(options) {
    const {
      tenant,
      channelId,
      to,
      content,
      template,
      contact,
      scheduledFor,
      isRecurring,
      recurringPattern,
      createdBy,
    } = options;

    const scheduled = await ScheduledMessage.create({
      tenant,
      channel: channelId,
      channelType: options.channelType,
      content,
      template,
      contact,
      scheduledFor,
      isRecurring,
      recurringPattern,
      nextOccurrence: isRecurring ? scheduledFor : undefined,
      createdBy,
    });

    return scheduled;
  }

  // Cancel a scheduled message
  async cancelScheduled(scheduleId, tenant) {
    const scheduled = await ScheduledMessage.findOneAndUpdate(
      { scheduleId, tenant, status: 'pending' },
      { status: 'cancelled' },
      { new: true }
    );

    return scheduled;
  }

  // Reschedule a message
  async reschedule(scheduleId, tenant, newScheduledFor) {
    const scheduled = await ScheduledMessage.findOneAndUpdate(
      { scheduleId, tenant, status: { $in: ['pending', 'failed'] } },
      { scheduledFor: newScheduledFor, status: 'pending' },
      { new: true }
    );

    return scheduled;
  }
}

export default new MessageScheduler();
