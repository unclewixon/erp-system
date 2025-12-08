import mongoose from 'mongoose';

const emailSettingsSchema = new mongoose.Schema({
  // Only one global email settings document
  isGlobal: {
    type: Boolean,
    default: true,
    unique: true,
  },
  // Brevo (Sendinblue) Settings
  provider: {
    type: String,
    enum: ['brevo', 'sendgrid', 'mailgun', 'smtp'],
    default: 'brevo',
  },
  brevo: {
    apiKey: {
      type: String,
      trim: true,
    },
    senderEmail: {
      type: String,
      trim: true,
    },
    senderName: {
      type: String,
      trim: true,
      default: 'ERP HR Manager',
    },
  },
  // Email Templates
  templates: {
    welcome: {
      subject: { type: String, default: 'Welcome to {{companyName}}!' },
      enabled: { type: Boolean, default: true },
    },
    passwordReset: {
      subject: { type: String, default: 'Reset Your Password - {{companyName}}' },
      enabled: { type: Boolean, default: true },
    },
    leaveApproval: {
      subject: { type: String, default: 'Leave Request {{status}} - {{companyName}}' },
      enabled: { type: Boolean, default: true },
    },
    payslip: {
      subject: { type: String, default: 'Your Payslip for {{month}} {{year}} - {{companyName}}' },
      enabled: { type: Boolean, default: true },
    },
    shiftAssignment: {
      subject: { type: String, default: 'New Shift Assignment - {{companyName}}' },
      enabled: { type: Boolean, default: true },
    },
    rosterLink: {
      subject: { type: String, default: 'Fill Duty Roster for {{month}} {{year}} - {{companyName}}' },
      enabled: { type: Boolean, default: true },
    },
    swapRequest: {
      subject: { type: String, default: 'Shift Swap Request - {{companyName}}' },
      enabled: { type: Boolean, default: true },
    },
    announcement: {
      subject: { type: String, default: '{{title}} - {{companyName}}' },
      enabled: { type: Boolean, default: true },
    },
  },
  // General Settings
  isEnabled: {
    type: Boolean,
    default: false,
  },
  testEmail: {
    type: String,
    trim: true,
  },
  // Tracking
  lastTestedAt: {
    type: Date,
  },
  lastTestResult: {
    success: Boolean,
    message: String,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Ensure only one settings document exists
emailSettingsSchema.statics.getSettings = async function() {
  try {
    let settings = await this.findOne({ isGlobal: true });
    if (!settings) {
      // Use findOneAndUpdate with upsert to avoid race conditions
      settings = await this.findOneAndUpdate(
        { isGlobal: true },
        { $setOnInsert: { isGlobal: true } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    return settings;
  } catch (error) {
    console.error('EmailSettings.getSettings error:', error);
    throw error;
  }
};

// Method to check if email is configured
emailSettingsSchema.methods.isConfigured = function() {
  if (this.provider === 'brevo') {
    return !!(this.brevo?.apiKey && this.brevo?.senderEmail);
  }
  return false;
};

// Hide sensitive data in JSON response
emailSettingsSchema.methods.toJSON = function() {
  const obj = this.toObject();
  // Mask API key
  if (obj.brevo?.apiKey) {
    obj.brevo.apiKey = obj.brevo.apiKey.substring(0, 8) + '...' + obj.brevo.apiKey.slice(-4);
  }
  return obj;
};

const EmailSettings = mongoose.model('EmailSettings', emailSettingsSchema);

export default EmailSettings;
