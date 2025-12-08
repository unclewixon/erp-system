import express from 'express';
import GlobalSettings from '../models/GlobalSettings.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// @route   GET /api/global-settings
// @desc    Get global settings
// @access  Super Admin
router.get('/', protect, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const settings = await GlobalSettings.getSettings();
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Error fetching global settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch global settings',
    });
  }
});

// @route   GET /api/global-settings/trial
// @desc    Get trial settings (public for registration)
// @access  Public
router.get('/trial', async (req, res) => {
  try {
    const settings = await GlobalSettings.getSettings();
    res.json({
      success: true,
      data: {
        defaultTrialDays: settings.trial.defaultTrialDays,
        enableTrial: settings.trial.enableTrial,
      },
    });
  } catch (error) {
    console.error('Error fetching trial settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trial settings',
    });
  }
});

// @route   PUT /api/global-settings
// @desc    Update global settings
// @access  Super Admin
router.put('/', protect, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const settings = await GlobalSettings.updateSettings(req.body, req.user._id);
    res.json({
      success: true,
      data: settings,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating global settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update global settings',
    });
  }
});

// @route   PUT /api/global-settings/trial
// @desc    Update trial settings only
// @access  Super Admin
router.put('/trial', protect, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const { defaultTrialDays, enableTrial, trialFeatures } = req.body;

    const settings = await GlobalSettings.updateSettings(
      { trial: { defaultTrialDays, enableTrial, trialFeatures } },
      req.user._id
    );

    res.json({
      success: true,
      data: settings.trial,
      message: 'Trial settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating trial settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update trial settings',
    });
  }
});

export default router;
