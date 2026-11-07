const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error(
    'Error: Add a JWT_SECRET of at least 32 characters to your .env file.'
  );
  process.exit(1);
}

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// --------------------------------------------------
// TEMPORARY IN-MEMORY DATA
// Data resets whenever the server restarts.
// MongoDB will be added later.
// --------------------------------------------------

const users = [];
const jobs = [];
const applications = [];

const id = () => crypto.randomUUID();

const publicUser = user => {
  const { password, ...safeUser } = user;
  return safeUser;
};

const signToken = user =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: '7d',
  });

function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

// --------------------------------------------------
// AUTHENTICATION MIDDLEWARE
// --------------------------------------------------

function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return sendError(res, 401, 'Please log in to continue.');
  }

  try {
    const token = header.split(' ')[1];
    req.auth = jwt.verify(token, JWT_SECRET);

    const user = users.find(u => u.id === req.auth.id);

    if (!user) {
      return sendError(res, 401, 'User account not found.');
    }

    req.user = user;
    next();
  } catch {
    return sendError(res, 401, 'Invalid or expired login session.');
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return sendError(res, 403, 'You do not have permission.');
    }
    next();
  };
}

// --------------------------------------------------
// FILE UPLOADS
// --------------------------------------------------

const uploadDir = path.join(__dirname, 'uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDir);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

const allowedExtensions = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
]);

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.has(extension)) {
      return callback(
        new Error('Only PDF, DOC, DOCX, PNG, JPG and WEBP files are allowed.')
      );
    }

    callback(null, true);
  },
});

app.use('/uploads', express.static(uploadDir));

// --------------------------------------------------
// HEALTH CHECK
// GET /api/health
// --------------------------------------------------

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'HireMe API is working.',
  });
});

// --------------------------------------------------
// REGISTER
// POST /api/auth/register
// --------------------------------------------------

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { name, email, password, role = 'student' } = req.body;

    if (!name || !email || !password) {
      return sendError(res, 400, 'Name, email and password are required.');
    }

    if (String(name).trim().length < 2) {
      return sendError(res, 400, 'Please enter your full name.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return sendError(res, 400, 'Please enter a valid email address.');
    }

    if (String(password).length < 8) {
      return sendError(
        res,
        400,
        'Password must contain at least 8 characters.'
      );
    }

    if (!['student', 'recruiter'].includes(role)) {
      return sendError(res, 400, 'Invalid account role.');
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (users.some(u => u.email === normalizedEmail)) {
      return sendError(res, 409, 'An account with this email already exists.');
    }

    const hashedPassword = await bcrypt.hash(String(password), 12);

    const user = {
      id: id(),
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
      headline: '',
      bio: '',
      skills: [],
      education: '',
      location: '',
      phone: '',
      resume: '',
      profileImage: '',
      company: '',
      createdAt: new Date().toISOString(),
    };

    users.push(user);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// LOGIN
// POST /api/auth/login
// --------------------------------------------------

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'Email and password are required.');
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = users.find(u => u.email === normalizedEmail);

    if (!user || !(await bcrypt.compare(String(password), user.password))) {
      return sendError(res, 401, 'Incorrect email or password.');
    }

    if (role && user.role !== role) {
      return sendError(res, 403, `This account is registered as ${user.role}.`);
    }

    res.json({
      success: true,
      message: 'Login successful.',
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// CURRENT USER
// GET /api/auth/me
// --------------------------------------------------

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({
    success: true,
    user: publicUser(req.user),
  });
});

// --------------------------------------------------
// PROFILE
// GET /api/users/profile
// PATCH /api/users/profile
// --------------------------------------------------

app.get('/api/users/profile', authenticate, (req, res) => {
  res.json({
    success: true,
    user: publicUser(req.user),
  });
});

app.patch('/api/users/profile', authenticate, (req, res) => {
  const allowedFields = [
    'name',
    'headline',
    'bio',
    'skills',
    'education',
    'location',
    'phone',
    'company',
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      req.user[field] = req.body[field];
    }
  }

  res.json({
    success: true,
    message: 'Profile updated successfully.',
    user: publicUser(req.user),
  });
});

// --------------------------------------------------
// RESUME AND PROFILE IMAGE UPLOADS
// POST /api/users/resume
// POST /api/users/avatar
// --------------------------------------------------

app.post(
  '/api/users/resume',
  authenticate,
  upload.single('file'),
  (req, res) => {
    if (!req.file) {
      return sendError(res, 400, 'Please select a resume file.');
    }

    req.user.resume = `/uploads/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Resume uploaded successfully.',
      resume: req.user.resume,
      user: publicUser(req.user),
    });
  }
);

app.post(
  '/api/users/avatar',
  authenticate,
  upload.single('file'),
  (req, res) => {
    if (!req.file) {
      return sendError(res, 400, 'Please select an image file.');
    }

    const extension = path.extname(req.file.originalname).toLowerCase();

    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) {
      fs.unlinkSync(req.file.path);
      return sendError(res, 400, 'Please upload an image file.');
    }

    req.user.profileImage = `/uploads/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Profile image uploaded successfully.',
      profileImage: req.user.profileImage,
      user: publicUser(req.user),
    });
  }
);

// --------------------------------------------------
// JOBS
// GET /api/jobs
// GET /api/jobs/:id
// POST /api/jobs
// DELETE /api/jobs/:id
// --------------------------------------------------

app.get('/api/jobs', (_req, res) => {
  const { search, location, type } = _req.query;
  let result = [...jobs];

  if (search) {
    const term = String(search).toLowerCase();

    result = result.filter(job =>
      [job.title, job.company, job.description, ...(job.skills || [])]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }

  if (location) {
    result = result.filter(job =>
      String(job.location || '')
        .toLowerCase()
        .includes(String(location).toLowerCase())
    );
  }

  if (type) {
    result = result.filter(
      job => String(job.type || '').toLowerCase() === String(type).toLowerCase()
    );
  }

  res.json({
    success: true,
    count: result.length,
    jobs: result,
  });
});

app.get('/api/jobs/:id', (req, res) => {
  const job = jobs.find(j => j.id === req.params.id);

  if (!job) {
    return sendError(res, 404, 'Job not found.');
  }

  res.json({ success: true, job });
});

app.post('/api/jobs', authenticate, requireRole('recruiter'), (req, res) => {
  const {
    title,
    company,
    location = '',
    type = 'Full-time',
    description = '',
    salary = '',
    skills = [],
  } = req.body;

  if (!title || !company || !description) {
    return sendError(
      res,
      400,
      'Job title, company and description are required.'
    );
  }

  const job = {
    id: id(),
    title: String(title).trim(),
    company: String(company).trim(),
    location,
    type,
    description,
    salary,
    skills: Array.isArray(skills) ? skills : [],
    postedBy: req.user.email,
    postedAt: new Date().toISOString(),
  };

  jobs.unshift(job);

  res.status(201).json({
    success: true,
    message: 'Job posted successfully.',
    job,
  });
});

app.delete(
  '/api/jobs/:id',
  authenticate,
  requireRole('recruiter'),
  (req, res) => {
    const index = jobs.findIndex(j => j.id === req.params.id);

    if (index === -1) {
      return sendError(res, 404, 'Job not found.');
    }

    if (jobs[index].postedBy !== req.user.email) {
      return sendError(res, 403, 'You can only delete your own job posts.');
    }

    jobs.splice(index, 1);

    res.json({
      success: true,
      message: 'Job deleted successfully.',
    });
  }
);

// --------------------------------------------------
// APPLY FOR A JOB
// POST /api/applications
// GET /api/applications/mine
// --------------------------------------------------

app.post(
  '/api/applications',
  authenticate,
  requireRole('student'),
  (req, res) => {
    const { jobId, coverNote = '' } = req.body;

    const job = jobs.find(j => j.id === jobId);

    if (!job) {
      return sendError(res, 404, 'Job not found.');
    }

    const alreadyApplied = applications.some(
      a => a.jobId === jobId && a.userId === req.user.id
    );

    if (alreadyApplied) {
      return sendError(res, 409, 'You have already applied for this job.');
    }

    const application = {
      id: id(),
      jobId: job.id,
      userId: req.user.id,
      email: req.user.email,
      name: req.user.name,
      title: job.title,
      company: job.company,
      coverNote,
      status: 'Applied',
      appliedAt: new Date().toISOString(),
    };

    applications.unshift(application);

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully.',
      application,
    });
  }
);

app.get(
  '/api/applications/mine',
  authenticate,
  requireRole('student'),
  (req, res) => {
    const mine = applications.filter(a => a.userId === req.user.id);

    res.json({
      success: true,
      count: mine.length,
      applications: mine,
    });
  }
);

// --------------------------------------------------
// RECRUITER: VIEW APPLICANTS
// GET /api/applications/job/:jobId
// PATCH /api/applications/:id/status
// --------------------------------------------------

app.get(
  '/api/applications/job/:jobId',
  authenticate,
  requireRole('recruiter'),
  (req, res) => {
    const job = jobs.find(j => j.id === req.params.jobId);

    if (!job) {
      return sendError(res, 404, 'Job not found.');
    }

    if (job.postedBy !== req.user.email) {
      return sendError(res, 403, 'You can only view applicants for your jobs.');
    }

    const result = applications
      .filter(a => a.jobId === job.id)
      .map(application => {
        const applicant = users.find(u => u.id === application.userId);

        return {
          ...application,
          applicant: applicant ? publicUser(applicant) : null,
        };
      });

    res.json({
      success: true,
      count: result.length,
      applications: result,
    });
  }
);

app.patch(
  '/api/applications/:id/status',
  authenticate,
  requireRole('recruiter'),
  (req, res) => {
    const { status } = req.body;
    const allowedStatuses = [
      'Applied',
      'Under Review',
      'Shortlisted',
      'Rejected',
      'Accepted',
    ];

    if (!allowedStatuses.includes(status)) {
      return sendError(res, 400, 'Invalid application status.');
    }

    const application = applications.find(a => a.id === req.params.id);

    if (!application) {
      return sendError(res, 404, 'Application not found.');
    }

    const job = jobs.find(j => j.id === application.jobId);

    if (!job || job.postedBy !== req.user.email) {
      return sendError(res, 403, 'You cannot update this application.');
    }

    application.status = status;

    res.json({
      success: true,
      message: 'Application status updated.',
      application,
    });
  }
);

// --------------------------------------------------
// NOT FOUND
// --------------------------------------------------

app.use((_req, res) => {
  sendError(res, 404, 'API route not found.');
});

// --------------------------------------------------
// ERROR HANDLER
// --------------------------------------------------

app.use((error, _req, res, _next) => {
  console.error(error.message);

  if (error instanceof multer.MulterError) {
    return sendError(res, 400, 'File upload failed. Maximum size is 5 MB.');
  }

  if (error.message.startsWith('Only PDF')) {
    return sendError(res, 400, error.message);
  }

  sendError(res, 500, 'An unexpected server error occurred.');
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, () => {
  console.log(`HireMe backend running at http://localhost:${PORT}`);
});
