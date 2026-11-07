const dns = require('node:dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

dotenv.config();

const connectDB = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is missing from your .env file.');
}

const JWT_SECRET = process.env.JWT_SECRET;

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Upload folders
const uploadDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    cb(
      null,
      `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`
    );
  },
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
const resumeUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Resume must be a PDF, DOC, or DOCX file.'));
  },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['student', 'employer', 'admin'],
      default: 'student',
    },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    bio: { type: String, default: '' },
    headline: { type: String, default: '' },
    github: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    skills: { type: [String], default: [] },
    education: { type: [mongoose.Schema.Types.Mixed], default: [] },
    projects: { type: [mongoose.Schema.Types.Mixed], default: [] },
    resume: { type: String, default: '' },
    avatar: { type: String, default: '' },
  },
  { timestamps: true }
);
const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String, default: '' },
    type: { type: String, default: 'Full-time' },
    salary: { type: String, default: '' },
    description: { type: String, default: '' },
    requirements: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['Open', 'Closed'],
      default: 'Open',
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    coverLetter: { type: String, default: '' },
    resume: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Pending', 'Reviewed', 'Shortlisted', 'Rejected', 'Accepted'],
      default: 'Pending',
    },
  },
  { timestamps: true }
);

applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);
const Job = mongoose.model('Job', jobSchema);
const Application = mongoose.model('Application', applicationSchema);

const companyProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    companyName: { type: String, default: '' },
    industry: { type: String, default: '' },
    website: { type: String, default: '' },
    location: { type: String, default: '' },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

const CompanyProfile = mongoose.model('CompanyProfile', companyProfileSchema);

async function authenticateToken(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token required.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
}

function createToken(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

function publicUser(user) {
  return {
    id: user._id,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    location: user.location,
    bio: user.bio,
    headline: user.headline,
    github: user.github,
    linkedin: user.linkedin,
    skills: user.skills,
    education: user.education,
    projects: user.projects,
    resume: user.resume,
    avatar: user.avatar,
  };
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'HireMe API is running.',
  });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least 8 characters.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: ['student', 'employer'].includes(role) ? role : 'student',
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token: createToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    console.error('Registration error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to register. Please try again.',
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select('+password');

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    return res.json({
      success: true,
      message: 'Login successful.',
      token: createToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to log in. Please try again.',
    });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
});

app.get('/api/users/profile', authenticateToken, (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
});

app.patch('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const allowedFields = [
      'name',
      'phone',
      'location',
      'bio',
      'headline',
      'github',
      'linkedin',
      'skills',
      'education',
      'projects',
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Profile update error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Unable to update profile.',
    });
  }
});

app.post(
  '/api/users/resume',
  authenticateToken,
  resumeUpload.single('resume'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please select a resume file.',
        });
      }

      const filePath = `/uploads/${req.file.filename}`;

      const user = await User.findByIdAndUpdate(
        req.user._id,
        { resume: filePath },
        { new: true }
      );

      res.json({
        success: true,
        message: 'Resume uploaded successfully.',
        resume: filePath,
        user: publicUser(user),
      });
    } catch (error) {
      console.error('Resume upload error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Resume upload failed.',
      });
    }
  }
);

app.post(
  '/api/users/avatar',
  authenticateToken,
  upload.single('avatar'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please select an image file.',
        });
      }

      const filePath = `/uploads/${req.file.filename}`;

      const user = await User.findByIdAndUpdate(
        req.user._id,
        { avatar: filePath },
        { new: true }
      );

      res.json({
        success: true,
        message: 'Profile image uploaded successfully.',
        avatar: filePath,
        user: publicUser(user),
      });
    } catch (error) {
      console.error('Avatar upload error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Image upload failed.',
      });
    }
  }
);

app.use('/uploads', express.static(uploadDir));

app.get('/api/jobs', async (req, res) => {
  try {
    const filter = {};

    if (req.query.search) {
      const search = req.query.search.trim();
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    const jobs = await Job.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, jobs });
  } catch (error) {
    console.error('Get jobs error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch jobs.',
    });
  }
});

app.get('/api/jobs/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID.',
      });
    }

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found.',
      });
    }

    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to fetch job.',
    });
  }
});

app.post('/api/jobs', authenticateToken, async (req, res) => {
  try {
    if (!['employer', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only employers can post jobs.',
      });
    }

    const {
      title,
      company,
      location,
      type,
      salary,
      description,
      requirements,
    } = req.body;

    if (!title || !company) {
      return res.status(400).json({
        success: false,
        message: 'Job title and company are required.',
      });
    }

    const job = await Job.create({
      title,
      company,
      location,
      type,
      salary,
      description,
      requirements,
      postedBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Job created successfully.',
      job,
    });
  } catch (error) {
    console.error('Create job error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Unable to create job.',
    });
  }
});

app.get('/api/jobs/mine', authenticateToken, async (req, res) => {
  try {
    if (!['employer', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only employers can manage jobs.',
      });
    }

    const filter = req.user.role === 'admin' ? {} : { postedBy: req.user._id };

    const jobs = await Job.find(filter).sort({ createdAt: -1 });

    const jobsWithApplicantCount = await Promise.all(
      jobs.map(async job => ({
        ...job.toObject(),
        applicantCount: await Application.countDocuments({ job: job._id }),
      }))
    );

    res.json({ success: true, jobs: jobsWithApplicantCount });
  } catch (error) {
    console.error('Fetch my jobs error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch your job postings.',
    });
  }
});

app.patch('/api/jobs/:id', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID.',
      });
    }

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found.',
      });
    }

    if (
      req.user.role !== 'admin' &&
      String(job.postedBy) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'You cannot edit this job.',
      });
    }

    const allowedFields = [
      'title',
      'company',
      'location',
      'type',
      'salary',
      'description',
      'requirements',
      'status',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        job[field] = req.body[field];
      }
    }

    await job.save();

    res.json({
      success: true,
      message: 'Job updated successfully.',
      job,
    });
  } catch (error) {
    console.error('Update job error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Unable to update job.',
    });
  }
});

app.delete('/api/jobs/:id', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID.',
      });
    }

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found.',
      });
    }

    if (
      req.user.role !== 'admin' &&
      String(job.postedBy) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'You cannot delete this job.',
      });
    }

    await Application.deleteMany({ job: job._id });
    await job.deleteOne();

    res.json({
      success: true,
      message: 'Job deleted successfully.',
    });
  } catch (error) {
    console.error('Delete job error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Unable to delete job.',
    });
  }
});

app.post('/api/applications', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only student accounts can apply for jobs.',
      });
    }

    const { jobId, coverLetter } = req.body;

    if (!jobId || !mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid job ID is required.',
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found.',
      });
    }

    const application = await Application.create({
      job: job._id,
      applicant: req.user._id,
      coverLetter: coverLetter || '',
      resume: req.user.resume || '',
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully.',
      application,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'You have already applied for this job.',
      });
    }

    console.error('Application error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Unable to submit application.',
    });
  }
});

app.get('/api/applications/mine', authenticateToken, async (req, res) => {
  try {
    const applications = await Application.find({
      applicant: req.user._id,
    })
      .populate('job')
      .sort({ createdAt: -1 });

    res.json({ success: true, applications });
  } catch (error) {
    console.error('My applications error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch your applications.',
    });
  }
});

app.get('/api/applications/job/:jobId', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.jobId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID.',
      });
    }

    const job = await Job.findById(req.params.jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found.',
      });
    }

    if (
      req.user.role !== 'admin' &&
      String(job.postedBy) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'You cannot view these applications.',
      });
    }

    const applications = await Application.find({ job: job._id })
      .populate('applicant', 'name email phone resume')
      .populate('job')
      .sort({ createdAt: -1 });

    res.json({ success: true, applications });
  } catch (error) {
    console.error('Job applications error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch applications.',
    });
  }
});

app.patch(
  '/api/applications/:id/status',
  authenticateToken,
  async (req, res) => {
    try {
      const { status } = req.body;
      const allowedStatuses = [
        'Pending',
        'Reviewed',
        'Shortlisted',
        'Rejected',
        'Accepted',
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid application status.',
        });
      }

      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid application ID.',
        });
      }

      const application = await Application.findById(req.params.id).populate(
        'job'
      );

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found.',
        });
      }

      const ownsJob =
        application.job &&
        String(application.job.postedBy) === String(req.user._id);

      if (req.user.role !== 'admin' && !ownsJob) {
        return res.status(403).json({
          success: false,
          message: 'You cannot update this application.',
        });
      }

      application.status = status;
      await application.save();

      res.json({
        success: true,
        message: 'Application status updated.',
        application,
      });
    } catch (error) {
      console.error('Update status error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Unable to update application status.',
      });
    }
  }
);

app.get('/api/company-profile', authenticateToken, async (req, res) => {
  try {
    let profile = await CompanyProfile.findOne({ user: req.user._id });

    if (!profile) {
      profile = await CompanyProfile.create({
        user: req.user._id,
      });
    }

    res.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error('Get company profile error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch company profile.',
    });
  }
});

app.put('/api/company-profile', authenticateToken, async (req, res) => {
  try {
    const allowedFields = [
      'companyName',
      'industry',
      'website',
      'location',
      'description',
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const profile = await CompanyProfile.findOneAndUpdate(
      { user: req.user._id },
      { $set: updates, $setOnInsert: { user: req.user._id } },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      success: true,
      message: 'Company profile saved successfully.',
      profile,
    });
  } catch (error) {
    console.error('Save company profile error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Unable to save company profile.',
    });
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found.',
  });
});

app.use((error, req, res, next) => {
  console.error('Server error:', error.message);

  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: 'File upload error.',
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error.',
  });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(error => {
    console.error('Unable to start server:', error.message);
    process.exit(1);
  });
