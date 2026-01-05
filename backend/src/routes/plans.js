import express from 'express';
import Plan from '../models/Plan.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// Helper function to enrich plan features with names
const enrichPlanFeatures = (plans) => {
  const allFeatures = Plan.getAllFeatures();
  const featureMap = {};
  allFeatures.forEach(f => {
    featureMap[f.slug] = f;
  });

  return plans.map(plan => {
    const planObj = plan.toObject();
    planObj.features = planObj.features.map(f => ({
      ...f,
      name: featureMap[f.featureSlug]?.name || f.featureSlug,
      category: featureMap[f.featureSlug]?.category || 'other',
      description: featureMap[f.featureSlug]?.description || '',
    }));
    return planObj;
  });
};

// @route   GET /api/plans
// @desc    Get all active plans (public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    let plans = await Plan.find({ isActive: true }).sort({ order: 1 });

    // If no plans exist, create default ones
    if (plans.length === 0) {
      await Plan.createDefaultPlans();
      plans = await Plan.find({ isActive: true }).sort({ order: 1 });
    }

    // Enrich features with names from the feature definitions
    const enrichedPlans = enrichPlanFeatures(plans);

    res.json({
      success: true,
      data: enrichedPlans,
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/plans/features
// @desc    Get all available features
// @access  Public
router.get('/features', async (req, res) => {
  try {
    const features = Plan.getAllFeatures();
    res.json({
      success: true,
      data: features,
    });
  } catch (error) {
    console.error('Get features error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/plans/:id
// @desc    Get single plan
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/plans
// @desc    Create new plan
// @access  Private (Super Admin only)
router.post('/', protect, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const plan = await Plan.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: plan,
    });
  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
});

// @route   PUT /api/plans/:id
// @desc    Update plan
// @access  Private (Super Admin only)
router.put('/:id', protect, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    res.json({
      success: true,
      message: 'Plan updated successfully',
      data: plan,
    });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
});

// @route   DELETE /api/plans/:id
// @desc    Delete plan (soft delete by setting isActive to false)
// @access  Private (Super Admin only)
router.delete('/:id', protect, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    res.json({
      success: true,
      message: 'Plan deleted successfully',
    });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/plans/seed
// @desc    Seed default plans
// @access  Private (Super Admin only)
router.post('/seed', protect, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    // Delete existing plans if force is true
    if (req.body.force) {
      await Plan.deleteMany({});
    }

    await Plan.createDefaultPlans();
    const plans = await Plan.find({ isActive: true }).sort({ order: 1 });

    res.json({
      success: true,
      message: 'Default plans created successfully',
      data: plans,
    });
  } catch (error) {
    console.error('Seed plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;
