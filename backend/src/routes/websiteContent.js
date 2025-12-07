import express from 'express';
import WebsiteContent from '../models/WebsiteContent.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';
import { uploadWebsiteImage } from '../middleware/upload.js';

const router = express.Router();

// Public - Get content for home page
router.get('/home', async (req, res) => {
  try {
    const content = await WebsiteContent.findOne({ page: 'home' });

    res.json({
      success: true,
      data: content ? content.content : null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Admin - Update home page content
router.put('/home', protect, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const { content } = req.body;

    const updated = await WebsiteContent.findOneAndUpdate(
      { page: 'home' },
      {
        page: 'home',
        content,
        updatedBy: req.user._id,
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Content saved',
      data: updated.content,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Admin - Upload hero image
router.post('/upload-image', protect, authorize(ROLES.SUPER_ADMIN), uploadWebsiteImage.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
      });
    }

    const imageUrl = `/uploads/website/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: { imageUrl },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
