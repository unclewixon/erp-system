// WhatsApp Business API Provider
// https://developers.facebook.com/docs/whatsapp/cloud-api

class WhatsAppProvider {
  constructor(channel) {
    this.channel = channel;
    this.credentials = channel.credentials;
    this.baseUrl = 'https://graph.facebook.com/v18.0';
  }

  formatPhoneNumber(number) {
    // WhatsApp requires number without + prefix
    let formatted = number.replace(/[^\d]/g, '');
    if (formatted.startsWith('0')) {
      formatted = '234' + formatted.substring(1);
    }
    return formatted;
  }

  async send(options) {
    const { to, content, template, templateVariables } = options;

    const phoneNumberId = this.credentials.whatsappPhoneNumberId;
    const accessToken = this.credentials.whatsappAccessToken;

    let messagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
    };

    // Template message
    if (template) {
      messagePayload.type = 'template';
      messagePayload.template = {
        name: template.content?.whatsappTemplateName || template.code,
        language: {
          code: template.content?.whatsappLanguage || 'en',
        },
      };

      // Template components (header, body, buttons)
      if (templateVariables) {
        const components = [];

        // Header variables
        if (templateVariables.header) {
          components.push({
            type: 'header',
            parameters: Array.isArray(templateVariables.header)
              ? templateVariables.header.map(v => this.formatParameter(v))
              : [this.formatParameter(templateVariables.header)],
          });
        }

        // Body variables
        if (templateVariables.body) {
          components.push({
            type: 'body',
            parameters: templateVariables.body.map(v => this.formatParameter(v)),
          });
        }

        // Button variables
        if (templateVariables.buttons) {
          templateVariables.buttons.forEach((btn, index) => {
            components.push({
              type: 'button',
              sub_type: btn.type || 'quick_reply',
              index,
              parameters: [this.formatParameter(btn.value)],
            });
          });
        }

        if (components.length > 0) {
          messagePayload.template.components = components;
        }
      }
    }
    // Text message
    else if (content.type === 'text' || content.text) {
      messagePayload.type = 'text';
      messagePayload.text = {
        preview_url: true,
        body: content.text,
      };
    }
    // Image message
    else if (content.type === 'image') {
      messagePayload.type = 'image';
      messagePayload.image = {
        link: content.mediaUrl,
        caption: content.caption,
      };
    }
    // Document message
    else if (content.type === 'document') {
      messagePayload.type = 'document';
      messagePayload.document = {
        link: content.mediaUrl,
        caption: content.caption,
        filename: content.fileName,
      };
    }
    // Video message
    else if (content.type === 'video') {
      messagePayload.type = 'video';
      messagePayload.video = {
        link: content.mediaUrl,
        caption: content.caption,
      };
    }
    // Audio message
    else if (content.type === 'audio') {
      messagePayload.type = 'audio';
      messagePayload.audio = {
        link: content.mediaUrl,
      };
    }
    // Location message
    else if (content.type === 'location') {
      messagePayload.type = 'location';
      messagePayload.location = {
        latitude: content.location.latitude,
        longitude: content.location.longitude,
        name: content.location.name,
        address: content.location.address,
      };
    }
    // Interactive message (buttons, list)
    else if (content.type === 'interactive') {
      messagePayload.type = 'interactive';
      messagePayload.interactive = content.interactive;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messagePayload),
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'WhatsApp API error');
      }

      return {
        messageId: data.messages?.[0]?.id,
        status: 'sent',
        cost: { amount: 0, currency: 'USD', segments: 1 },
      };
    } catch (error) {
      console.error('WhatsApp send error:', error);
      throw error;
    }
  }

  formatParameter(value) {
    if (typeof value === 'object' && value.type) {
      return value;
    }
    return { type: 'text', text: String(value) };
  }

  // Send interactive message with buttons
  async sendInteractive(to, type, content) {
    const phoneNumberId = this.credentials.whatsappPhoneNumberId;
    const accessToken = this.credentials.whatsappAccessToken;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: 'interactive',
      interactive: {
        type, // 'button' or 'list'
        ...content,
      },
    };

    const response = await fetch(
      `${this.baseUrl}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    return response.json();
  }

  // Mark message as read
  async markAsRead(messageId) {
    const phoneNumberId = this.credentials.whatsappPhoneNumberId;
    const accessToken = this.credentials.whatsappAccessToken;

    const response = await fetch(
      `${this.baseUrl}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      }
    );

    return response.json();
  }

  // Get media URL
  async getMediaUrl(mediaId) {
    const accessToken = this.credentials.whatsappAccessToken;

    const response = await fetch(
      `${this.baseUrl}/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();
    return data.url;
  }

  // Upload media
  async uploadMedia(file, mimeType) {
    const phoneNumberId = this.credentials.whatsappPhoneNumberId;
    const accessToken = this.credentials.whatsappAccessToken;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', mimeType);

    const response = await fetch(
      `${this.baseUrl}/${phoneNumberId}/media`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    return response.json();
  }

  parseIncoming(payload) {
    // Parse WhatsApp webhook payload
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return null;
    }

    const contact = value.contacts?.[0];

    let content = {
      type: message.type,
      text: null,
      mediaUrl: null,
      caption: null,
    };

    switch (message.type) {
      case 'text':
        content.text = message.text?.body;
        break;
      case 'image':
        content.mediaUrl = message.image?.id;
        content.caption = message.image?.caption;
        break;
      case 'video':
        content.mediaUrl = message.video?.id;
        content.caption = message.video?.caption;
        break;
      case 'audio':
        content.mediaUrl = message.audio?.id;
        break;
      case 'document':
        content.mediaUrl = message.document?.id;
        content.caption = message.document?.caption;
        content.fileName = message.document?.filename;
        break;
      case 'location':
        content.location = {
          latitude: message.location?.latitude,
          longitude: message.location?.longitude,
          name: message.location?.name,
          address: message.location?.address,
        };
        break;
      case 'button':
        content.text = message.button?.text;
        content.buttonPayload = message.button?.payload;
        break;
      case 'interactive':
        if (message.interactive?.type === 'button_reply') {
          content.text = message.interactive.button_reply?.title;
          content.buttonId = message.interactive.button_reply?.id;
        } else if (message.interactive?.type === 'list_reply') {
          content.text = message.interactive.list_reply?.title;
          content.listId = message.interactive.list_reply?.id;
        }
        break;
    }

    return {
      messageId: message.id,
      from: message.from,
      profileName: contact?.profile?.name,
      timestamp: message.timestamp,
      ...content,
    };
  }

  parseStatusCallback(payload) {
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const status = value?.statuses?.[0];

    if (!status) {
      return null;
    }

    const statusMap = {
      'sent': 'sent',
      'delivered': 'delivered',
      'read': 'read',
      'failed': 'failed',
    };

    return {
      messageId: status.id,
      status: statusMap[status.status] || status.status,
      timestamp: new Date(parseInt(status.timestamp) * 1000),
      recipientId: status.recipient_id,
      errors: status.errors,
    };
  }

  // Verify webhook
  verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === this.credentials.whatsappWebhookVerifyToken) {
      return challenge;
    }
    return null;
  }
}

export default WhatsAppProvider;
