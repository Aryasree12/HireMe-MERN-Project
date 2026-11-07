const express = require('express');
const mongoose = require('mongoose');
const Application = require('../models/Application');
const Job = require('../models/Job');

const router = express.Router();

// Apply for a job
router.post('/', async (req, res) => {
  try {
    // Temporary development placeholder.
    // Replace with the verified logged-in user's ID
    // once authentication is implemented.
    const { jobId, applicantId } = req.body;

    if (
      !mongoose.isValidObjectId(jobId) ||
      !mongoose.isValidObjectId(applicantId)
    ) {
      return res.status(400).json({
        message: 'Valid job and applicant IDs are required',
      });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        message: 'Job not found',
      });
    }

    const application = await Application.create({
      job: jobId,
      applicant: applicantId,
    });

    res.status(201).json({
      message: 'Application submitted successfully',
      application,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'You have already applied for this job',
      });
    }

    console.error(error);
    res.status(500).json({
      message: 'Unable to submit application',
    });
  }
});

module.exports = router;
