const mongoose = require('mongoose');

const familySchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'member', 'viewer'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  inviteCodes: [{
    code: String,
    role: { type: String, default: 'member' },
    expiresAt: Date,
    used: { type: Boolean, default: false }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Family', familySchema);
