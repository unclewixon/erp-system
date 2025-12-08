import mongoose from 'mongoose';

const globalSettingsSchema = new mongoose.Schema({
  // Trial Settings
  trial: {
    defaultTrialDays: {
      type: Number,
      default: 3,
      min: 1,
      max: 30,
    },
    enableTrial: {
      type: Boolean,
      default: true,
    },
    trialFeatures: [{
      type: String,
    }],
  },
  // General Settings
  general: {
    siteName: {
      type: String,
      default: 'ERP System',
    },
    siteDescription: {
      type: String,
      default: '',
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
  },
  // Email Settings
  email: {
    fromName: {
      type: String,
      default: 'ERP System',
    },
    fromEmail: {
      type: String,
      default: 'noreply@erp.com',
    },
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Ensure only one document exists (singleton pattern)
globalSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

globalSettingsSchema.statics.updateSettings = async function(updates, userId) {
  let settings = await this.findOne();
  if (!settings) {
    settings = new this({});
  }

  // Deep merge updates
  if (updates.trial) {
    settings.trial = { ...settings.trial.toObject(), ...updates.trial };
  }
  if (updates.general) {
    settings.general = { ...settings.general.toObject(), ...updates.general };
  }
  if (updates.email) {
    settings.email = { ...settings.email.toObject(), ...updates.email };
  }

  settings.updatedBy = userId;
  await settings.save();
  return settings;
};

const GlobalSettings = mongoose.model('GlobalSettings', globalSettingsSchema);

export default GlobalSettings;
