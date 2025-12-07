import mongoose from 'mongoose';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-char-key-change-this!';
const IV_LENGTH = 16;

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!text) return null;
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    return null;
  }
}

const paymentSettingsSchema = new mongoose.Schema({
  // Paystack Settings
  paystack: {
    publicKey: String,
    secretKey: String, // Encrypted
    isEnabled: {
      type: Boolean,
      default: false,
    },
    isLive: {
      type: Boolean,
      default: false,
    },
    webhookSecret: String, // Encrypted
  },
  // Flutterwave settings
  flutterwave: {
    publicKey: String,
    secretKey: String, // Encrypted
    webhookSecret: String, // Encrypted
    isEnabled: {
      type: Boolean,
      default: false,
    },
    isLive: {
      type: Boolean,
      default: false,
    },
  },
  // Default currency
  defaultCurrency: {
    type: String,
    default: 'NGN',
  },
  // VAT/Tax settings
  taxEnabled: {
    type: Boolean,
    default: false,
  },
  taxRate: {
    type: Number,
    default: 7.5,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Encrypt secret keys before saving
paymentSettingsSchema.pre('save', function(next) {
  if (this.isModified('paystack.secretKey') && this.paystack.secretKey) {
    // Only encrypt if not already encrypted (check if it has the encrypted format)
    if (!this.paystack.secretKey.includes(':')) {
      this.paystack.secretKey = encrypt(this.paystack.secretKey);
    }
  }
  if (this.isModified('paystack.webhookSecret') && this.paystack.webhookSecret) {
    if (!this.paystack.webhookSecret.includes(':')) {
      this.paystack.webhookSecret = encrypt(this.paystack.webhookSecret);
    }
  }
  if (this.isModified('flutterwave.secretKey') && this.flutterwave?.secretKey) {
    if (!this.flutterwave.secretKey.includes(':')) {
      this.flutterwave.secretKey = encrypt(this.flutterwave.secretKey);
    }
  }
  if (this.isModified('flutterwave.webhookSecret') && this.flutterwave?.webhookSecret) {
    if (!this.flutterwave.webhookSecret.includes(':')) {
      this.flutterwave.webhookSecret = encrypt(this.flutterwave.webhookSecret);
    }
  }
  next();
});

// Method to get decrypted Paystack secret key
paymentSettingsSchema.methods.getPaystackSecretKey = function() {
  return decrypt(this.paystack.secretKey);
};

// Method to get decrypted webhook secret
paymentSettingsSchema.methods.getPaystackWebhookSecret = function() {
  return decrypt(this.paystack.webhookSecret);
};

// Method to get decrypted Flutterwave secret key
paymentSettingsSchema.methods.getFlutterwaveSecretKey = function() {
  return decrypt(this.flutterwave?.secretKey);
};

// Method to get decrypted Flutterwave webhook secret
paymentSettingsSchema.methods.getFlutterwaveWebhookSecret = function() {
  return decrypt(this.flutterwave?.webhookSecret);
};

// Static method to get or create settings (singleton pattern)
paymentSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

// Return safe version without encrypted keys
paymentSettingsSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  // Mask secret keys
  if (obj.paystack?.secretKey) {
    obj.paystack.secretKey = '••••••••' + (this.paystack.secretKey ? this.paystack.secretKey.slice(-8) : '');
  }
  if (obj.paystack?.webhookSecret) {
    obj.paystack.webhookSecret = obj.paystack.webhookSecret ? '••••••••' : '';
  }
  if (obj.flutterwave?.secretKey) {
    obj.flutterwave.secretKey = '••••••••' + (this.flutterwave.secretKey ? this.flutterwave.secretKey.slice(-8) : '');
  }
  if (obj.flutterwave?.webhookSecret) {
    obj.flutterwave.webhookSecret = obj.flutterwave.webhookSecret ? '••••••••' : '';
  }
  return obj;
};

const PaymentSettings = mongoose.model('PaymentSettings', paymentSettingsSchema);

export default PaymentSettings;
