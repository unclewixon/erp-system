// Telegram Bot API Provider
// https://core.telegram.org/bots/api

class TelegramProvider {
  constructor(channel) {
    this.channel = channel;
    this.credentials = channel.credentials;
    this.baseUrl = `https://api.telegram.org/bot${this.credentials.telegramBotToken}`;
  }

  async send(options) {
    const { to, content } = options;

    let endpoint = 'sendMessage';
    let payload = {
      chat_id: to,
      parse_mode: 'HTML',
    };

    switch (content.type) {
      case 'text':
        payload.text = content.text;
        if (content.buttons) {
          payload.reply_markup = this.formatKeyboard(content.buttons);
        }
        break;

      case 'image':
        endpoint = 'sendPhoto';
        payload.photo = content.mediaUrl;
        payload.caption = content.caption || content.text;
        break;

      case 'video':
        endpoint = 'sendVideo';
        payload.video = content.mediaUrl;
        payload.caption = content.caption || content.text;
        break;

      case 'audio':
        endpoint = 'sendAudio';
        payload.audio = content.mediaUrl;
        payload.caption = content.caption;
        break;

      case 'document':
        endpoint = 'sendDocument';
        payload.document = content.mediaUrl;
        payload.caption = content.caption;
        break;

      case 'location':
        endpoint = 'sendLocation';
        payload.latitude = content.location.latitude;
        payload.longitude = content.location.longitude;
        break;

      case 'contact':
        endpoint = 'sendContact';
        payload.phone_number = content.contact.phone;
        payload.first_name = content.contact.firstName;
        payload.last_name = content.contact.lastName;
        break;

      default:
        payload.text = content.text || 'Message';
    }

    try {
      const response = await fetch(`${this.baseUrl}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.description || 'Telegram API error');
      }

      return {
        messageId: String(data.result.message_id),
        status: 'sent',
        cost: { amount: 0, currency: 'USD', segments: 1 },
      };
    } catch (error) {
      console.error('Telegram send error:', error);
      throw error;
    }
  }

  formatKeyboard(buttons) {
    if (!buttons || buttons.length === 0) return undefined;

    // Check if inline or reply keyboard
    const isInline = buttons.some(b => b.type === 'url' || b.type === 'callback');

    if (isInline) {
      return {
        inline_keyboard: buttons.map(row => {
          if (Array.isArray(row)) {
            return row.map(btn => this.formatButton(btn));
          }
          return [this.formatButton(row)];
        }),
      };
    }

    return {
      keyboard: buttons.map(row => {
        if (Array.isArray(row)) {
          return row.map(btn => ({ text: btn.text || btn }));
        }
        return [{ text: row.text || row }];
      }),
      resize_keyboard: true,
      one_time_keyboard: true,
    };
  }

  formatButton(btn) {
    if (typeof btn === 'string') {
      return { text: btn, callback_data: btn };
    }

    const button = { text: btn.text };

    if (btn.type === 'url') {
      button.url = btn.value;
    } else if (btn.type === 'callback') {
      button.callback_data = btn.value || btn.text;
    } else if (btn.type === 'web_app') {
      button.web_app = { url: btn.value };
    } else {
      button.callback_data = btn.value || btn.text;
    }

    return button;
  }

  // Send message with inline keyboard
  async sendWithButtons(chatId, text, buttons) {
    return this.send({
      to: chatId,
      content: {
        type: 'text',
        text,
        buttons,
      },
    });
  }

  // Edit message
  async editMessage(chatId, messageId, text, buttons) {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
    };

    if (buttons) {
      payload.reply_markup = this.formatKeyboard(buttons);
    }

    const response = await fetch(`${this.baseUrl}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return response.json();
  }

  // Delete message
  async deleteMessage(chatId, messageId) {
    const response = await fetch(`${this.baseUrl}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
      }),
    });

    return response.json();
  }

  // Answer callback query (acknowledge button press)
  async answerCallbackQuery(callbackQueryId, text, showAlert = false) {
    const response = await fetch(`${this.baseUrl}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert,
      }),
    });

    return response.json();
  }

  // Get chat info
  async getChat(chatId) {
    const response = await fetch(`${this.baseUrl}/getChat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId }),
    });

    return response.json();
  }

  // Set webhook
  async setWebhook(url) {
    const payload = {
      url,
      allowed_updates: ['message', 'callback_query', 'edited_message'],
    };

    if (this.credentials.telegramWebhookSecret) {
      payload.secret_token = this.credentials.telegramWebhookSecret;
    }

    const response = await fetch(`${this.baseUrl}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return response.json();
  }

  // Delete webhook
  async deleteWebhook() {
    const response = await fetch(`${this.baseUrl}/deleteWebhook`, {
      method: 'POST',
    });

    return response.json();
  }

  // Get bot info
  async getMe() {
    const response = await fetch(`${this.baseUrl}/getMe`);
    return response.json();
  }

  parseIncoming(payload) {
    // Handle regular message
    if (payload.message) {
      const msg = payload.message;
      const chat = msg.chat;
      const from = msg.from;

      let type = 'text';
      let content = {
        text: msg.text,
        mediaUrl: null,
        caption: msg.caption,
      };

      if (msg.photo) {
        type = 'image';
        content.mediaUrl = msg.photo[msg.photo.length - 1].file_id; // Highest resolution
      } else if (msg.video) {
        type = 'video';
        content.mediaUrl = msg.video.file_id;
      } else if (msg.audio) {
        type = 'audio';
        content.mediaUrl = msg.audio.file_id;
      } else if (msg.voice) {
        type = 'audio';
        content.mediaUrl = msg.voice.file_id;
      } else if (msg.document) {
        type = 'document';
        content.mediaUrl = msg.document.file_id;
        content.fileName = msg.document.file_name;
      } else if (msg.location) {
        type = 'location';
        content.location = {
          latitude: msg.location.latitude,
          longitude: msg.location.longitude,
        };
      } else if (msg.contact) {
        type = 'contact';
        content.contact = {
          phone: msg.contact.phone_number,
          firstName: msg.contact.first_name,
          lastName: msg.contact.last_name,
        };
      }

      return {
        messageId: String(msg.message_id),
        from: String(chat.id),
        chatType: chat.type, // 'private', 'group', 'supergroup', 'channel'
        username: from.username,
        firstName: from.first_name,
        lastName: from.last_name,
        profileName: `${from.first_name || ''} ${from.last_name || ''}`.trim(),
        type,
        ...content,
      };
    }

    // Handle callback query (button press)
    if (payload.callback_query) {
      const query = payload.callback_query;
      const from = query.from;
      const msg = query.message;

      return {
        messageId: String(msg?.message_id),
        callbackQueryId: query.id,
        from: String(msg?.chat?.id || from.id),
        username: from.username,
        firstName: from.first_name,
        lastName: from.last_name,
        profileName: `${from.first_name || ''} ${from.last_name || ''}`.trim(),
        type: 'callback',
        text: query.data,
        callbackData: query.data,
      };
    }

    return null;
  }

  // Verify webhook secret
  verifyWebhook(secretToken) {
    return secretToken === this.credentials.telegramWebhookSecret;
  }
}

export default TelegramProvider;
