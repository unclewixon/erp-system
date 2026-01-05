import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import { Job, Application, Interview, Offer } from '../models/index.js';

const router = express.Router();

// Apply middleware
router.use(protect);
router.use(tenantGuard);

// ============ JOBS ============

// Get all jobs
router.get('/jobs', async (req, res) => {
  try {
    // Super Admin has no tenant - return empty array
    if (!req.user.tenant) {
      return res.json({ success: true, data: [] });
    }

    const { status, department, employmentType } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (department) query.department = department;
    if (employmentType) query.employmentType = employmentType;

    const jobs = await Job.find(query)
      .populate('department', 'name')
      .populate('designation', 'title')
      .populate('branch', 'name')
      .populate('hiringManager', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get job by ID
router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('department', 'name')
      .populate('designation', 'title')
      .populate('branch', 'name city')
      .populate('hiringManager', 'firstName lastName email')
      .populate('recruiters', 'firstName lastName')
      .populate('interviewStages.interviewers', 'firstName lastName');

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create job
router.post('/jobs', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const job = await Job.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: job });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update job
router.put('/jobs/:id', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    res.json({ success: true, data: job });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Publish job
router.post('/jobs/:id/publish', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      { status: 'open', publishedAt: new Date() },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Close job
router.post('/jobs/:id/close', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      { status: 'closed' },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete job
router.delete('/jobs/:id', authorize('super_admin', 'tenant_admin'), async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    res.json({ success: true, message: 'Job deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ APPLICATIONS ============

// Get applications for a job
router.get('/jobs/:jobId/applications', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const { status } = req.query;
    const query = { tenant: req.user.tenant, job: req.params.jobId };

    if (status) query.status = status;

    const applications = await Application.find(query)
      .populate('job', 'title code')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: applications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all applications
router.get('/applications', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const { status, job } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (job) query.job = job;

    const applications = await Application.find(query)
      .populate('job', 'title code department')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: applications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get application by ID
router.get('/applications/:id', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('job')
      .populate('referredBy', 'firstName lastName')
      .populate('notes.createdBy', 'firstName lastName');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    res.json({ success: true, data: application });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create application
router.post('/applications', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const application = await Application.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    // Update job application count
    await Job.findByIdAndUpdate(req.body.job, { $inc: { applicationCount: 1 } });

    res.status(201).json({ success: true, data: application });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update application status
router.put('/applications/:id/status', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const { status, reason } = req.body;

    const updateData = { status };
    if (status === 'rejected') updateData.rejectionReason = reason;
    if (status === 'withdrawn') updateData.withdrawalReason = reason;

    const application = await Application.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      updateData,
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    res.json({ success: true, data: application });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Add note to application
router.post('/applications/:id/notes', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const application = await Application.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      {
        $push: {
          notes: {
            content: req.body.content,
            createdBy: req.user._id,
          },
        },
      },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    res.json({ success: true, data: application });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ INTERVIEWS ============

// Get interviews for an application
router.get('/applications/:applicationId/interviews', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const interviews = await Interview.find({
      tenant: req.user.tenant,
      application: req.params.applicationId,
    })
      .populate('interviewers.employee', 'firstName lastName')
      .sort({ stage: 1 });

    res.json({ success: true, data: interviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all upcoming interviews
router.get('/interviews', async (req, res) => {
  try {
    const query = { tenant: req.user.tenant };

    // If not HR, only show interviews where user is an interviewer
    if (!['super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'].includes(req.user.role)) {
      const Employee = (await import('../models/Employee.js')).default;
      const employee = await Employee.findOne({ user: req.user._id });
      if (employee) {
        query['interviewers.employee'] = employee._id;
      }
    }

    const interviews = await Interview.find({
      ...query,
      scheduledAt: { $gte: new Date() },
      status: { $in: ['scheduled', 'confirmed'] },
    })
      .populate('application')
      .populate('job', 'title')
      .populate('interviewers.employee', 'firstName lastName')
      .sort({ scheduledAt: 1 });

    res.json({ success: true, data: interviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Schedule interview
router.post('/interviews', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const application = await Application.findById(req.body.application);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const interview = await Interview.create({
      ...req.body,
      tenant: req.user.tenant,
      job: application.job,
      createdBy: req.user._id,
    });

    // Update application status
    await Application.findByIdAndUpdate(req.body.application, {
      status: 'interviewing',
      currentStage: req.body.stage,
    });

    res.status(201).json({ success: true, data: interview });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update interview
router.put('/interviews/:id', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const interview = await Interview.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    res.json({ success: true, data: interview });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Submit interview feedback
router.post('/interviews/:id/feedback', async (req, res) => {
  try {
    const Employee = (await import('../models/Employee.js')).default;
    const employee = await Employee.findOne({ user: req.user._id });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const interview = await Interview.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      {
        $push: {
          feedback: {
            interviewer: employee._id,
            ...req.body,
            submittedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    res.json({ success: true, data: interview });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Complete interview with result
router.post('/interviews/:id/complete', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const { result } = req.body;

    const interview = await Interview.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      { status: 'completed', result },
      { new: true }
    );

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    res.json({ success: true, data: interview });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ OFFERS ============

// Get offers
router.get('/offers', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const offers = await Offer.find({ tenant: req.user.tenant })
      .populate('application')
      .populate('job', 'title')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create offer
router.post('/offers', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const application = await Application.findById(req.body.application);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const offer = await Offer.create({
      ...req.body,
      tenant: req.user.tenant,
      job: application.job,
      createdBy: req.user._id,
    });

    // Update application status
    await Application.findByIdAndUpdate(req.body.application, { status: 'offered' });

    res.status(201).json({ success: true, data: offer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update offer status
router.put('/offers/:id/status', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const { status, reason } = req.body;
    const updateData = { status };

    if (status === 'approved') {
      updateData.approvedBy = req.user._id;
      updateData.approvedAt = new Date();
    } else if (status === 'sent') {
      updateData.sentAt = new Date();
    } else if (status === 'accepted' || status === 'declined') {
      updateData.respondedAt = new Date();
      if (status === 'declined') updateData.declineReason = reason;
    }

    const offer = await Offer.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      updateData,
      { new: true }
    );

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    // Update application status if accepted
    if (status === 'accepted') {
      await Application.findByIdAndUpdate(offer.application, { status: 'hired' });
      await Job.findByIdAndUpdate(offer.job, { $inc: { filledPositions: 1 } });
    }

    res.json({ success: true, data: offer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get recruitment stats
router.get('/stats', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const [openJobs, totalApplications, interviewsThisWeek, pendingOffers] = await Promise.all([
      Job.countDocuments({ tenant: req.user.tenant, status: 'open' }),
      Application.countDocuments({ tenant: req.user.tenant }),
      Interview.countDocuments({
        tenant: req.user.tenant,
        scheduledAt: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
      Offer.countDocuments({ tenant: req.user.tenant, status: { $in: ['sent', 'pending_approval'] } }),
    ]);

    const applicationsByStatus = await Application.aggregate([
      { $match: { tenant: req.user.tenant } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        openJobs,
        totalApplications,
        interviewsThisWeek,
        pendingOffers,
        applicationsByStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
