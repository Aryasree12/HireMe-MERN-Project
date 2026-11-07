const express = require('express');
const Job = require('../models/Job');

const router = express.Router();

// Get all jobs and search by title or company
router.get('/', async (req, res) => {
  try {
    const search = req.query.search || '';

    const jobs = await Job.find({
      $or: [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ],
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      jobs,
    });
  } catch (error) {
    console.error('Fetch jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch jobs',
    });
  }
});

// Post a new job to MongoDB
router.post('/', async (req, res) => {
  try {
    const {
      title,
      company,
      location,
      type,
      description,
      deadline,
      skillsRequired,
    } = req.body;

    if (!title || !company || !location || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title, company, location and description are required',
      });
    }

    const newJob = new Job({
      title,
      company,
      location,
      type,
      description,
      deadline,
      skillsRequired,
    });

    const savedJob = await newJob.save();

    res.status(201).json({
      success: true,
      message: 'Job saved successfully',
      job: savedJob,
    });
  } catch (error) {
    console.error('Post job error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to save job',
      error: error.message,
    });
  }
});

module.exports = router;
