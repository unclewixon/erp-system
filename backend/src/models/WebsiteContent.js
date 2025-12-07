import mongoose from 'mongoose';

const websiteContentSchema = new mongoose.Schema({
  page: {
    type: String,
    required: true,
    unique: true,
    default: 'home',
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

const WebsiteContent = mongoose.model('WebsiteContent', websiteContentSchema);

export default WebsiteContent;
