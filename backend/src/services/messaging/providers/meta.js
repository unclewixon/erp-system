// Meta Provider - Facebook Messenger & Instagram DM
// https://developers.facebook.com/docs/messenger-platform

class MetaProvider {
  constructor(channel) {
    this.channel = channel;
    this.credentials = channel.credentials;
    this.baseUrl = 'https://graph.facebook.com/v18.0';
  }

  async send(options) {
    const { to, content, isInstagram = false } = options;

    const pageAccessToken = this.credentials.metaPageAccessToken;
    const pageId = isInstagram
      ? this.credentials.metaInstagramAccountId
      : this.credentials.metaPageId;

    let messagePayload = {
      recipient: { id: to },
      messaging_type: 'RESPONSE',
    };

    // Text message
    if (content.type === 'text' || content.text) {
      messagePayload.message = {
        text: content.text,
      };

      // Add quick replies if provided
      if (content.quickReplies) {
        messagePayload.message.quick_replies = content.quickReplies.map(qr => ({
          content_type: 'text',
          title: qr.text || qr.title,
          payload: qr.payload || qr.text,
        }));
      }
    }
    // Image attachment
    else if (content.type === 'image') {
      messagePayload.message = {
        attachment: {
          type: 'image',
          payload: {
            url: content.mediaUrl,
            is_reusable: true,
          },
        },
      };
    }
    // Video attachment
    else if (content.type === 'video') {
      messagePayload.message = {
        attachment: {
          type: 'video',
          payload: {
            url: content.mediaUrl,
            is_reusable: true,
          },
        },
      };
    }
    // File attachment
    else if (content.type === 'document' || content.type === 'file') {
      messagePayload.message = {
        attachment: {
          type: 'file',
          payload: {
            url: content.mediaUrl,
            is_reusable: true,
          },
        },
      };
    }
    // Generic template (carousel)
    else if (content.type === 'template' || content.type === 'generic') {
      messagePayload.message = {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: content.elements?.map(el => ({
              title: el.title,
              subtitle: el.subtitle,
              image_url: el.imageUrl,
              default_action: el.defaultAction ? {
                type: 'web_url',
                url: el.defaultAction.url,
                webview_height_ratio: 'tall',
              } : undefined,
              buttons: el.buttons?.map(btn => this.formatButton(btn)),
            })),
          },
        },
      };
    }
    // Button template
    else if (content.type === 'buttons') {
      messagePayload.message = {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: content.text,
            buttons: content.buttons?.map(btn => this.formatButton(btn)),
          },
        },
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${pageId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${pageAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messagePayload),
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'Meta API error');
      }

      return {
        messageId: data.message_id,
        recipientId: data.recipient_id,
        status: 'sent',
        cost: { amount: 0, currency: 'USD', segments: 1 },
      };
    } catch (error) {
      console.error('Meta send error:', error);
      throw error;
    }
  }

  formatButton(btn) {
    switch (btn.type) {
      case 'url':
      case 'web_url':
        return {
          type: 'web_url',
          url: btn.value || btn.url,
          title: btn.text || btn.title,
          webview_height_ratio: btn.height || 'tall',
        };
      case 'postback':
      case 'callback':
        return {
          type: 'postback',
          title: btn.text || btn.title,
          payload: btn.value || btn.payload,
        };
      case 'phone':
      case 'phone_number':
        return {
          type: 'phone_number',
          title: btn.text || btn.title,
          payload: btn.value || btn.phone,
        };
      default:
        return {
          type: 'postback',
          title: btn.text || btn.title,
          payload: btn.value || btn.text,
        };
    }
  }

  // Send to Facebook Messenger
  async sendToMessenger(psid, content) {
    return this.send({ to: psid, content, isInstagram: false });
  }

  // Send to Instagram
  async sendToInstagram(igsid, content) {
    return this.send({ to: igsid, content, isInstagram: true });
  }

  // Get user profile
  async getUserProfile(userId, isInstagram = false) {
    const pageAccessToken = this.credentials.metaPageAccessToken;
    const fields = isInstagram
      ? 'name,username,profile_pic'
      : 'first_name,last_name,profile_pic,locale,timezone,gender';

    try {
      const response = await fetch(
        `${this.baseUrl}/${userId}?fields=${fields}&access_token=${pageAccessToken}`
      );

      return response.json();
    } catch (error) {
      console.error('Meta get profile error:', error);
      throw error;
    }
  }

  // Send sender action (typing indicator)
  async sendAction(recipientId, action = 'typing_on') {
    const pageAccessToken = this.credentials.metaPageAccessToken;
    const pageId = this.credentials.metaPageId;

    const response = await fetch(
      `${this.baseUrl}/${pageId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pageAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          sender_action: action, // 'typing_on', 'typing_off', 'mark_seen'
        }),
      }
    );

    return response.json();
  }

  // Set persistent menu
  async setPersistentMenu(menuItems) {
    const pageAccessToken = this.credentials.metaPageAccessToken;
    const pageId = this.credentials.metaPageId;

    const response = await fetch(
      `${this.baseUrl}/${pageId}/messenger_profile`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pageAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          persistent_menu: [{
            locale: 'default',
            composer_input_disabled: false,
            call_to_actions: menuItems.map(item => this.formatButton(item)),
          }],
        }),
      }
    );

    return response.json();
  }

  // Set greeting text
  async setGreeting(greetingText) {
    const pageAccessToken = this.credentials.metaPageAccessToken;
    const pageId = this.credentials.metaPageId;

    const response = await fetch(
      `${this.baseUrl}/${pageId}/messenger_profile`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pageAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          greeting: [{
            locale: 'default',
            text: greetingText,
          }],
        }),
      }
    );

    return response.json();
  }

  // Set get started button
  async setGetStarted(payload = 'GET_STARTED') {
    const pageAccessToken = this.credentials.metaPageAccessToken;
    const pageId = this.credentials.metaPageId;

    const response = await fetch(
      `${this.baseUrl}/${pageId}/messenger_profile`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pageAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          get_started: { payload },
        }),
      }
    );

    return response.json();
  }

  parseIncoming(payload) {
    const entry = payload.entry?.[0];
    const messaging = entry?.messaging?.[0] || entry?.changes?.[0]?.value;

    if (!messaging) {
      return null;
    }

    // Determine if Instagram or Facebook
    const isInstagram = payload.object === 'instagram' || !!messaging.sender?.id?.startsWith('17');

    const senderId = messaging.sender?.id;
    const messageData = messaging.message;
    const postback = messaging.postback;

    let type = 'text';
    let content = {
      text: null,
      mediaUrl: null,
    };

    if (messageData) {
      if (messageData.text) {
        content.text = messageData.text;
      }

      if (messageData.attachments) {
        const attachment = messageData.attachments[0];
        type = attachment.type; // 'image', 'video', 'audio', 'file', 'location'
        content.mediaUrl = attachment.payload?.url;

        if (type === 'location') {
          content.location = {
            latitude: attachment.payload?.coordinates?.lat,
            longitude: attachment.payload?.coordinates?.long,
          };
        }
      }

      if (messageData.quick_reply) {
        content.quickReplyPayload = messageData.quick_reply.payload;
      }
    }

    if (postback) {
      type = 'postback';
      content.text = postback.title;
      content.postbackPayload = postback.payload;
    }

    return {
      messageId: messageData?.mid,
      from: senderId,
      isInstagram,
      type,
      ...content,
      timestamp: messaging.timestamp,
    };
  }

  parseStatusCallback(payload) {
    const entry = payload.entry?.[0];
    const messaging = entry?.messaging?.[0];

    if (!messaging?.delivery && !messaging?.read) {
      return null;
    }

    if (messaging.delivery) {
      return {
        messageIds: messaging.delivery.mids,
        status: 'delivered',
        watermark: messaging.delivery.watermark,
      };
    }

    if (messaging.read) {
      return {
        status: 'read',
        watermark: messaging.read.watermark,
      };
    }

    return null;
  }

  // Verify webhook
  verifyWebhook(mode, token, challenge) {
    const verifyToken = this.credentials.metaAppSecret; // Or use a dedicated verify token
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    return null;
  }

  // Verify request signature
  verifySignature(signature, body) {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.credentials.metaAppSecret)
      .update(body)
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  }
}

export default MetaProvider;
