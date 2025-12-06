// Messaging Service Factory
// Provides unified interface for all messaging providers

import TwilioProvider from './providers/twilio.js';
import TermiiProvider from './providers/termii.js';
import WhatsAppProvider from './providers/whatsapp.js';
import TelegramProvider from './providers/telegram.js';
import MetaProvider from './providers/meta.js';
import { Channel, Message, Contact, Conversation } from '../../models/Communication.js';

class MessagingService {
  constructor() {
    this.providers = {};
  }

  // Get or create provider instance
  getProvider(channel) {
    const key = `${channel.provider}-${channel._id}`;

    if (!this.providers[key]) {
      switch (channel.provider) {
        case 'twilio':
        case 'twilio_whatsapp':
          this.providers[key] = new TwilioProvider(channel);
          break;
        case 'termii':
          this.providers[key] = new TermiiProvider(channel);
          break;
        case 'whatsapp_business':
          this.providers[key] = new WhatsAppProvider(channel);
          break;
        case 'telegram':
          this.providers[key] = new TelegramProvider(channel);
          break;
        case 'meta':
          this.providers[key] = new MetaProvider(channel);
          break;
        default:
          throw new Error(`Unknown provider: ${channel.provider}`);
      }
    }

    return this.providers[key];
  }

  // Send message through appropriate provider
  async sendMessage(options) {
    const { channelId, to, content, template, templateVariables, contact, scheduledFor, campaign, createdBy } = options;

    // Get channel
    const channel = await Channel.findById(channelId);
    if (!channel || !channel.isActive) {
      throw new Error('Channel not found or inactive');
    }

    // Check rate limits
    if (channel.usage.messagesSentToday >= channel.rateLimits.messagesPerDay) {
      throw new Error('Daily message limit exceeded');
    }

    // Get provider
    const provider = this.getProvider(channel);

    // Create message record
    const message = new Message({
      tenant: channel.tenant,
      direction: 'outbound',
      channel: channel._id,
      channelType: channel.type,
      from: channel.credentials.phoneNumber || channel.credentials.senderId,
      to,
      content: {
        type: content?.type || 'text',
        text: content?.text,
        mediaUrl: content?.mediaUrl,
        template: template ? {
          name: template.code,
          language: template.content?.whatsappLanguage || 'en',
          components: templateVariables,
        } : undefined,
      },
      template: template?._id,
      campaign,
      scheduledFor,
      isScheduled: !!scheduledFor,
      status: scheduledFor ? 'scheduled' : 'queued',
      statusHistory: [{ status: scheduledFor ? 'scheduled' : 'queued', timestamp: new Date() }],
      createdBy,
    });

    // Link contact if provided
    if (contact) {
      message.contact = contact._id || contact;
    }

    await message.save();

    // If scheduled, don't send now
    if (scheduledFor && new Date(scheduledFor) > new Date()) {
      return message;
    }

    try {
      // Send through provider
      message.status = 'sending';
      message.statusHistory.push({ status: 'sending', timestamp: new Date() });
      await message.save();

      const result = await provider.send({
        to,
        content,
        template,
        templateVariables,
      });

      // Update message with result
      message.externalId = result.messageId;
      message.status = result.status || 'sent';
      message.sentAt = new Date();
      message.cost = result.cost || { amount: 0, currency: 'NGN', segments: 1 };
      message.statusHistory.push({ status: message.status, timestamp: new Date() });
      await message.save();

      // Update channel usage
      channel.usage.messagesSentToday += 1;
      channel.usage.messagesSentThisMonth += 1;
      channel.usage.lastMessageAt = new Date();
      await channel.save();

      // Update or create conversation
      await this.updateConversation(channel, contact, message);

      return message;
    } catch (error) {
      message.status = 'failed';
      message.failedAt = new Date();
      message.failureReason = error.message;
      message.errorCode = error.code;
      message.statusHistory.push({ status: 'failed', timestamp: new Date(), details: error.message });
      await message.save();

      throw error;
    }
  }

  // Send bulk messages (for campaigns)
  async sendBulk(options) {
    const { channelId, recipients, content, template, templateVariables, campaign, createdBy, throttle } = options;

    const results = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      messages: [],
    };

    const delay = throttle?.messagesPerMinute
      ? (60 * 1000) / throttle.messagesPerMinute
      : 100; // Default 100ms between messages

    for (const recipient of recipients) {
      try {
        const message = await this.sendMessage({
          channelId,
          to: recipient.to,
          content: this.replaceVariables(content, recipient.variables),
          template,
          templateVariables: { ...templateVariables, ...recipient.variables },
          contact: recipient.contact,
          campaign,
          createdBy,
        });

        results.sent++;
        results.messages.push({ recipient: recipient.to, status: 'sent', messageId: message.messageId });

        // Throttle
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        results.failed++;
        results.messages.push({ recipient: recipient.to, status: 'failed', error: error.message });
      }
    }

    return results;
  }

  // Replace template variables
  replaceVariables(content, variables) {
    if (!content || !variables) return content;

    let text = content.text || '';
    for (const [key, value] of Object.entries(variables)) {
      text = text.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
    }

    return { ...content, text };
  }

  // Update or create conversation
  async updateConversation(channel, contact, message) {
    if (!contact) return;

    const contactId = contact._id || contact;

    let conversation = await Conversation.findOne({
      tenant: channel.tenant,
      contact: contactId,
      channelType: channel.type,
    });

    if (!conversation) {
      const count = await Conversation.countDocuments({ tenant: channel.tenant });
      conversation = new Conversation({
        tenant: channel.tenant,
        conversationId: `CNV-${String(count + 1).padStart(6, '0')}`,
        contact: contactId,
        channel: channel._id,
        channelType: channel.type,
        status: 'active',
      });
    }

    conversation.lastMessageAt = new Date();
    conversation.lastMessagePreview = message.content.text?.substring(0, 100) || '[Media]';
    conversation.lastMessageDirection = message.direction;
    conversation.messageCount += 1;

    // Update window expiry for WhatsApp
    if (channel.type === 'whatsapp') {
      conversation.windowExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      conversation.isWindowOpen = true;
    }

    await conversation.save();

    // Link message to conversation
    message.conversation = conversation._id;
    await message.save();

    return conversation;
  }

  // Process incoming message (webhook)
  async processIncoming(channelId, payload) {
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    const provider = this.getProvider(channel);
    const parsed = provider.parseIncoming(payload);

    // Find or create contact
    let contact = await Contact.findOne({
      tenant: channel.tenant,
      $or: [
        { phone: parsed.from },
        { [`channels.${channel.type}.phoneNumber`]: parsed.from },
        { [`channels.${channel.type}.chatId`]: parsed.from },
        { [`channels.${channel.type}.pageScoppedId`]: parsed.from },
      ],
    });

    if (!contact) {
      contact = await Contact.create({
        tenant: channel.tenant,
        phone: parsed.from,
        firstName: parsed.profileName?.split(' ')[0] || 'Unknown',
        lastName: parsed.profileName?.split(' ').slice(1).join(' ') || '',
        channels: {
          [channel.type]: {
            phoneNumber: channel.type === 'sms' || channel.type === 'whatsapp' ? parsed.from : undefined,
            chatId: channel.type === 'telegram' ? parsed.from : undefined,
            pageScoppedId: channel.type === 'facebook' ? parsed.from : undefined,
            igScopedId: channel.type === 'instagram' ? parsed.from : undefined,
            optedIn: true,
            lastInteraction: new Date(),
          },
        },
        source: channel.type,
      });
    }

    // Update contact metrics
    contact.metrics.totalMessagesReceived += 1;
    contact.metrics.lastMessageReceived = new Date();
    contact.channels[channel.type].lastInteraction = new Date();
    await contact.save();

    // Create message record
    const message = await Message.create({
      tenant: channel.tenant,
      externalId: parsed.messageId,
      direction: 'inbound',
      channel: channel._id,
      channelType: channel.type,
      from: parsed.from,
      to: channel.credentials.phoneNumber || channel.credentials.senderId,
      contact: contact._id,
      content: {
        type: parsed.type,
        text: parsed.text,
        mediaUrl: parsed.mediaUrl,
        caption: parsed.caption,
      },
      status: 'delivered',
      deliveredAt: new Date(),
      statusHistory: [{ status: 'delivered', timestamp: new Date() }],
    });

    // Update conversation
    const conversation = await this.updateConversation(channel, contact, message);

    if (conversation) {
      conversation.unreadCount += 1;
      if (!conversation.firstResponseAt && conversation.messageCount === 1) {
        // First message from contact
      }
      await conversation.save();
    }

    return { message, contact, conversation };
  }

  // Update message status (delivery reports)
  async updateStatus(channelId, externalId, status, timestamp) {
    const message = await Message.findOne({
      channel: channelId,
      externalId,
    });

    if (!message) return null;

    const statusMap = {
      'sent': 'sent',
      'delivered': 'delivered',
      'read': 'read',
      'failed': 'failed',
      'undelivered': 'failed',
    };

    const normalizedStatus = statusMap[status.toLowerCase()] || status;

    message.status = normalizedStatus;
    message.statusHistory.push({ status: normalizedStatus, timestamp: timestamp || new Date() });

    if (normalizedStatus === 'delivered') {
      message.deliveredAt = timestamp || new Date();
    } else if (normalizedStatus === 'read') {
      message.readAt = timestamp || new Date();
    } else if (normalizedStatus === 'failed') {
      message.failedAt = timestamp || new Date();
    }

    await message.save();

    return message;
  }
}

export default new MessagingService();
