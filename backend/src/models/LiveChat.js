import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['visitor', 'admin'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
});

const liveChatSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  visitorName: {
    type: String,
    default: 'Visitor',
  },
  visitorEmail: {
    type: String,
    default: '',
  },
  visitorPhone: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'closed'],
    default: 'waiting',
  },
  assignedAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  messages: [messageSchema],
  metadata: {
    userAgent: String,
    ipAddress: String,
    referrer: String,
    currentPage: String,
    country: String,
    city: String,
  },
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5,
    },
    feedback: String,
    submittedAt: Date,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  endedAt: Date,
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient querying
liveChatSchema.index({ status: 1, lastMessageAt: -1 });
liveChatSchema.index({ sessionId: 1 });
liveChatSchema.index({ assignedAdmin: 1, status: 1 });

// Pre-save hook
liveChatSchema.pre('save', function(next) {
  if (this.isModified('messages') && this.messages.length > 0) {
    this.lastMessageAt = this.messages[this.messages.length - 1].timestamp;
  }
  next();
});

// Static method to get unread count for admin
liveChatSchema.statics.getUnreadCount = async function(adminId) {
  const chats = await this.find({
    $or: [
      { status: 'waiting' },
      { assignedAdmin: adminId, status: 'active' }
    ]
  });

  let unreadCount = 0;
  chats.forEach(chat => {
    unreadCount += chat.messages.filter(m => m.sender === 'visitor' && !m.isRead).length;
  });

  return unreadCount;
};

const LiveChat = mongoose.model('LiveChat', liveChatSchema);

export default LiveChat;
