const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  darkMode: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  lastLogin: { type: Date, default: Date.now },
  family: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    default: null,
  },
  familyRole: {
    type: String,
    validate: {
      validator: function (v) {
        return v === null || ['owner', 'admin', 'member', 'viewer'].includes(v);
      },
    },
    default: null,
  },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
