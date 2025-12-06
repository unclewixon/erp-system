// Twilio Provider - SMS and WhatsApp
// https://www.twilio.com/docs/sms/api

class TwilioProvider {
  constructor(channel) {
    this.channel = channel;
    this.credentials = channel.credentials;
    this.baseUrl = 'https://api.twilio.com/2010-04-01';
    this.isWhatsApp = channel.provider === 'twilio_whatsapp';
  }

  getAuthHeader() {
    const auth = Buffer.from(`${this.credentials.accountSid}:${this.credentials.authToken}`).toString('base64');
    return `Basic ${auth}`;
  }

  formatPhoneNumber(number) {
    // Ensure E.164 format
    let formatted = number.replace(/[^\d+]/g, '');
    if (!formatted.startsWith('+')) {
      // Assume Nigerian number if no country code
      if (formatted.startsWith('0')) {
        formatted = '+234' + formatted.substring(1);
      } else if (!formatted.startsWith('234')) {
        formatted = '+234' + formatted;
      } else {
        formatted = '+' + formatted;
      }
    }
    return this.isWhatsApp ? `whatsapp:${formatted}` : formatted;
  }

  async send(options) {
    const { to, content, template, templateVariables } = options;

    const formData = new URLSearchParams();
    formData.append('To', this.formatPhoneNumber(to));

    if (this.isWhatsApp) {
      formData.append('From', `whatsapp:${this.credentials.phoneNumber}`);
    } else {
      formData.append('From', this.credentials.phoneNumber);
      if (this.credentials.messagingServiceSid) {
        formData.append('MessagingServiceSid', this.credentials.messagingServiceSid);
      }
    }

    // Handle template messages for WhatsApp
    if (template && this.isWhatsApp) {
      formData.append('ContentSid', template.content?.whatsappTemplateId);
      if (templateVariables) {
        formData.append('ContentVariables', JSON.stringify(templateVariables));
      }
    } else {
      formData.append('Body', content.text);
    }

    // Handle media
    if (content.mediaUrl) {
      formData.append('MediaUrl', content.mediaUrl);
    }

    // Status callback
    formData.append('StatusCallback', `${process.env.API_URL}/api/webhooks/twilio/status`);

    try {
      const response = await fetch(
        `${this.baseUrl}/Accounts/${this.credentials.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Twilio API error');
      }

      return {
        messageId: data.sid,
        status: this.mapStatus(data.status),
        cost: {
          amount: parseFloat(data.price || 0),
          currency: data.price_unit || 'USD',
          segments: parseInt(data.num_segments || 1),
        },
      };
    } catch (error) {
      console.error('Twilio send error:', error);
      throw error;
    }
  }

  mapStatus(twilioStatus) {
    const statusMap = {
      'queued': 'queued',
      'sending': 'sending',
      'sent': 'sent',
      'delivered': 'delivered',
      'read': 'read',
      'failed': 'failed',
      'undelivered': 'failed',
    };
    return statusMap[twilioStatus] || 'sent';
  }

  parseIncoming(payload) {
    // Parse Twilio webhook payload
    const from = payload.From?.replace('whatsapp:', '') || payload.WaId;
    const profileName = payload.ProfileName;

    let type = 'text';
    let mediaUrl = null;

    if (payload.NumMedia && parseInt(payload.NumMedia) > 0) {
      type = 'image'; // Could be video, audio, etc.
      mediaUrl = payload.MediaUrl0;
    }

    return {
      messageId: payload.MessageSid || payload.SmsMessageSid,
      from,
      profileName,
      type,
      text: payload.Body,
      mediaUrl,
    };
  }

  parseStatusCallback(payload) {
    return {
      messageId: payload.MessageSid || payload.SmsSid,
      status: this.mapStatus(payload.MessageStatus || payload.SmsStatus),
      errorCode: payload.ErrorCode,
      errorMessage: payload.ErrorMessage,
    };
  }

  // Verify webhook signature
  verifySignature(signature, url, params) {
    // Twilio signature validation
    // In production, use twilio.validateRequest()
    return true; // Simplified for now
  }
}

export default TwilioProvider;
