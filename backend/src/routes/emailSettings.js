import express from 'express';
import EmailSettings from '../models/EmailSettings.js';
import emailService from '../services/emailService.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// All routes require super admin
router.use(protect, authorize(ROLES.SUPER_ADMIN));

// @route   GET /api/email-settings
// @desc    Get email settings
// @access  Super Admin
router.get('/', async (req, res) => {
  try {
    console.log('Fetching email settings...');
    const settings = await EmailSettings.getSettings();
    console.log('Email settings fetched:', settings?._id);
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Error fetching email settings:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/email-settings
// @desc    Update email settings
// @access  Super Admin
router.put('/', async (req, res) => {
  try {
    const {
      provider,
      brevo,
      templates,
      isEnabled,
      testEmail,
    } = req.body;

    const settings = await EmailSettings.getSettings();

    if (provider) settings.provider = provider;
    if (brevo) {
      // Only update non-masked API key
      if (brevo.apiKey && !brevo.apiKey.includes('...')) {
        settings.brevo.apiKey = brevo.apiKey;
      }
      if (brevo.senderEmail) settings.brevo.senderEmail = brevo.senderEmail;
      if (brevo.senderName) settings.brevo.senderName = brevo.senderName;
    }
    if (templates) settings.templates = { ...settings.templates, ...templates };
    if (typeof isEnabled === 'boolean') settings.isEnabled = isEnabled;
    if (testEmail !== undefined) settings.testEmail = testEmail;

    settings.updatedBy = req.user._id;
    await settings.save();

    res.json({
      success: true,
      data: settings,
      message: 'Email settings updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   POST /api/email-settings/verify-api-key
// @desc    Verify Brevo API key
// @access  Super Admin
router.post('/verify-api-key', async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'API key is required',
      });
    }

    const result = await emailService.verifyApiKey(apiKey);

    if (result.success) {
      res.json({
        success: true,
        data: result.account,
        message: 'API key is valid',
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   POST /api/email-settings/send-test
// @desc    Send test email
// @access  Super Admin
router.post('/send-test', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required',
      });
    }

    const result = await emailService.sendTestEmail(email);

    if (result.success) {
      res.json({
        success: true,
        message: 'Test email sent successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/email-settings/stats
// @desc    Get email sending statistics
// @access  Super Admin
router.get('/stats', async (req, res) => {
  try {
    const settings = await EmailSettings.getSettings();

    if (!settings.isConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Email service is not configured',
      });
    }

    const stats = await emailService.getEmailStats(settings.brevo.apiKey);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/email-settings/templates/:templateName
// @desc    Update specific email template settings
// @access  Super Admin
router.put('/templates/:templateName', async (req, res) => {
  try {
    const { templateName } = req.params;
    const { subject, enabled } = req.body;

    const settings = await EmailSettings.getSettings();

    if (!settings.templates[templateName]) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    if (subject !== undefined) settings.templates[templateName].subject = subject;
    if (typeof enabled === 'boolean') settings.templates[templateName].enabled = enabled;

    settings.updatedBy = req.user._id;
    await settings.save();

    res.json({
      success: true,
      data: settings.templates[templateName],
      message: 'Template updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
