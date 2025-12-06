// Termii Provider - SMS for Nigeria/Africa
// https://developer.termii.com/

class TermiiProvider {
  constructor(channel) {
    this.channel = channel;
    this.credentials = channel.credentials;
    this.baseUrl = 'https://api.ng.termii.com/api';
  }

  formatPhoneNumber(number) {
    // Ensure Nigerian format without +
    let formatted = number.replace(/[^\d]/g, '');
    if (formatted.startsWith('+')) {
      formatted = formatted.substring(1);
    }
    if (formatted.startsWith('0')) {
      formatted = '234' + formatted.substring(1);
    }
    if (!formatted.startsWith('234')) {
      formatted = '234' + formatted;
    }
    return formatted;
  }

  async send(options) {
    const { to, content } = options;

    const payload = {
      api_key: this.credentials.apiKey,
      to: this.formatPhoneNumber(to),
      from: this.credentials.senderId,
      sms: content.text,
      type: 'plain',
      channel: 'generic', // or 'dnd' for DND-enabled, 'whatsapp'
    };

    try {
      const response = await fetch(`${this.baseUrl}/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.code !== 'ok') {
        throw new Error(data.message || 'Termii API error');
      }

      return {
        messageId: data.message_id,
        status: 'sent',
        cost: {
          amount: data.balance ? parseFloat(data.balance) : 0,
          currency: 'NGN',
          segments: 1,
        },
      };
    } catch (error) {
      console.error('Termii send error:', error);
      throw error;
    }
  }

  // Send OTP
  async sendOTP(options) {
    const { to, pinLength = 6, pinType = 'NUMERIC', pinTimeToLive = 5 } = options;

    const payload = {
      api_key: this.credentials.apiKey,
      message_type: 'NUMERIC',
      to: this.formatPhoneNumber(to),
      from: this.credentials.senderId,
      channel: 'generic',
      pin_attempts: 3,
      pin_time_to_live: pinTimeToLive,
      pin_length: pinLength,
      pin_placeholder: '< 1234 >',
      message_text: 'Your verification code is < 1234 >. Valid for ' + pinTimeToLive + ' minutes.',
      pin_type: pinType,
    };

    try {
      const response = await fetch(`${this.baseUrl}/sms/otp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.pinId) {
        throw new Error(data.message || 'Failed to send OTP');
      }

      return {
        pinId: data.pinId,
        to: data.to,
        status: data.status,
      };
    } catch (error) {
      console.error('Termii OTP error:', error);
      throw error;
    }
  }

  // Verify OTP
  async verifyOTP(pinId, pin) {
    const payload = {
      api_key: this.credentials.apiKey,
      pin_id: pinId,
      pin,
    };

    try {
      const response = await fetch(`${this.baseUrl}/sms/otp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      return {
        verified: data.verified === true || data.verified === 'True',
        pinId: data.pinId,
      };
    } catch (error) {
      console.error('Termii verify OTP error:', error);
      throw error;
    }
  }

  // Get account balance
  async getBalance() {
    try {
      const response = await fetch(
        `${this.baseUrl}/get-balance?api_key=${this.credentials.apiKey}`
      );

      const data = await response.json();

      return {
        balance: parseFloat(data.balance || 0),
        currency: data.currency || 'NGN',
      };
    } catch (error) {
      console.error('Termii balance error:', error);
      throw error;
    }
  }

  // Check phone number status (DND check)
  async checkNumber(phoneNumber) {
    const payload = {
      api_key: this.credentials.apiKey,
      phone_number: this.formatPhoneNumber(phoneNumber),
    };

    try {
      const response = await fetch(`${this.baseUrl}/check/dnd`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      return {
        number: data.number,
        status: data.status, // 'DND Active' or 'DND Not Active'
        network: data.network,
        networkCode: data.network_code,
      };
    } catch (error) {
      console.error('Termii check number error:', error);
      throw error;
    }
  }

  parseIncoming(payload) {
    // Termii doesn't support inbound SMS by default
    // This is a placeholder for potential webhook integration
    return {
      messageId: payload.message_id,
      from: payload.from,
      text: payload.message,
      type: 'text',
    };
  }

  parseStatusCallback(payload) {
    const statusMap = {
      'Message sent': 'sent',
      'Delivered': 'delivered',
      'Failed': 'failed',
      'Rejected': 'failed',
    };

    return {
      messageId: payload.message_id,
      status: statusMap[payload.status] || 'sent',
    };
  }
}

export default TermiiProvider;
