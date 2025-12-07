import express from 'express';
import LiveChat from '../models/LiveChat.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// @route   POST /api/live-chat/start
// @desc    Start a new chat session (public - for visitors)
// @access  Public
router.post('/start', async (req, res) => {
  try {
    const { visitorName, visitorEmail, visitorPhone } = req.body;

    const sessionId = uuidv4();

    const chat = await LiveChat.create({
      sessionId,
      visitorName: visitorName || 'Visitor',
      visitorEmail: visitorEmail || '',
      visitorPhone: visitorPhone || '',
      status: 'waiting',
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        referrer: req.headers.referer || '',
      },
      messages: [{
        sender: 'admin',
        content: 'Welcome! How can we help you today?',
        timestamp: new Date(),
      }],
    });

    res.status(201).json({
      success: true,
      data: {
        sessionId: chat.sessionId,
        messages: chat.messages,
      },
    });
  } catch (error) {
    console.error('Start chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/live-chat/:sessionId/message
// @desc    Send a message in chat (public - for visitors)
// @access  Public
router.post('/:sessionId/message', async (req, res) => {
  try {
    const { content } = req.body;
    const { sessionId } = req.params;

    const chat = await LiveChat.findOne({ sessionId });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found',
      });
    }

    if (chat.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Chat session is closed',
      });
    }

    chat.messages.push({
      sender: 'visitor',
      content,
      timestamp: new Date(),
    });

    chat.lastMessageAt = new Date();
    await chat.save();

    res.json({
      success: true,
      data: {
        message: chat.messages[chat.messages.length - 1],
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/live-chat/:sessionId
// @desc    Get chat messages (public - for visitors)
// @access  Public
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const chat = await LiveChat.findOne({ sessionId });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found',
      });
    }

    res.json({
      success: true,
      data: {
        sessionId: chat.sessionId,
        status: chat.status,
        messages: chat.messages,
        visitorName: chat.visitorName,
      },
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/live-chat/:sessionId/close
// @desc    Close a chat session (public - for visitors)
// @access  Public
router.post('/:sessionId/close', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { rating, feedback } = req.body;

    const chat = await LiveChat.findOne({ sessionId });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found',
      });
    }

    chat.status = 'closed';
    chat.endedAt = new Date();

    if (rating) {
      chat.rating = {
        score: rating,
        feedback: feedback || '',
        submittedAt: new Date(),
      };
    }

    await chat.save();

    res.json({
      success: true,
      message: 'Chat closed successfully',
    });
  } catch (error) {
    console.error('Close chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ========== ADMIN ROUTES ==========

// @route   GET /api/live-chat/admin/all
// @desc    Get all chat sessions
// @access  Private (Admin only)
router.get('/admin/all', protect, authorize(ROLES.SUPER_ADMIN, ROLES.TENANT_ADMIN), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const chats = await LiveChat.find(query)
      .sort({ lastMessageAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('assignedAdmin', 'firstName lastName email');

    const total = await LiveChat.countDocuments(query);

    res.json({
      success: true,
      data: chats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get all chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/live-chat/admin/waiting
// @desc    Get waiting chats count
// @access  Private (Admin only)
router.get('/admin/waiting', protect, authorize(ROLES.SUPER_ADMIN, ROLES.TENANT_ADMIN), async (req, res) => {
  try {
    const waitingCount = await LiveChat.countDocuments({ status: 'waiting' });
    const activeCount = await LiveChat.countDocuments({ status: 'active' });
    const unreadCount = await LiveChat.getUnreadCount(req.user._id);

    res.json({
      success: true,
      data: {
        waiting: waitingCount,
        active: activeCount,
        unread: unreadCount,
      },
    });
  } catch (error) {
    console.error('Get waiting count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/live-chat/admin/:chatId/assign
// @desc    Assign chat to admin
// @access  Private (Admin only)
router.post('/admin/:chatId/assign', protect, authorize(ROLES.SUPER_ADMIN, ROLES.TENANT_ADMIN), async (req, res) => {
  try {
    const chat = await LiveChat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    chat.assignedAdmin = req.user._id;
    chat.status = 'active';
    await chat.save();

    res.json({
      success: true,
      message: 'Chat assigned successfully',
      data: chat,
    });
  } catch (error) {
    console.error('Assign chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/live-chat/admin/:chatId/reply
// @desc    Admin reply to chat
// @access  Private (Admin only)
router.post('/admin/:chatId/reply', protect, authorize(ROLES.SUPER_ADMIN, ROLES.TENANT_ADMIN), async (req, res) => {
  try {
    const { content } = req.body;
    const chat = await LiveChat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    // Mark all visitor messages as read
    chat.messages.forEach(msg => {
      if (msg.sender === 'visitor') {
        msg.isRead = true;
      }
    });

    chat.messages.push({
      sender: 'admin',
      content,
      timestamp: new Date(),
      isRead: true,
    });

    chat.lastMessageAt = new Date();

    if (!chat.assignedAdmin) {
      chat.assignedAdmin = req.user._id;
      chat.status = 'active';
    }

    await chat.save();

    res.json({
      success: true,
      data: {
        message: chat.messages[chat.messages.length - 1],
      },
    });
  } catch (error) {
    console.error('Admin reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/live-chat/admin/:chatId/close
// @desc    Admin close chat
// @access  Private (Admin only)
router.post('/admin/:chatId/close', protect, authorize(ROLES.SUPER_ADMIN, ROLES.TENANT_ADMIN), async (req, res) => {
  try {
    const chat = await LiveChat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    chat.status = 'closed';
    chat.endedAt = new Date();
    await chat.save();

    res.json({
      success: true,
      message: 'Chat closed successfully',
    });
  } catch (error) {
    console.error('Close chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;
