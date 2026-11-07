const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    phone: {
      type: String,
      default: '',
    },
    qualification: {
      type: String,
      default: 'BCA',
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    portfolio: {
      headline: { type: String, default: '' },
      about: { type: String, default: '' },
      skills: [{ type: String }],
      projects: [
        {
          title: String,
          description: String,
          link: String,
        },
      ],
      certifications: [{ type: String }],
      resumeUrl: { type: String, default: '' },
      profileImage: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
