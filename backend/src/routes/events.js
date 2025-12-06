import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import {
  EventCategory,
  Event,
  EventRegistration,
  EventFeedback,
  Announcement,
} from '../models/Event.js';

const router = express.Router();

router.use(protect);
router.use(tenantGuard);

// ============ EVENT CATEGORIES ============

router.get('/categories', async (req, res) => {
  try {
    const categories = await EventCategory.find({
      tenant: req.user.tenant,
      isActive: true,
    }).sort({ name: 1 });

    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/categories', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const category = await EventCategory.create({
      ...req.body,
      tenant: req.user.tenant,
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ EVENTS ============

router.get('/', async (req, res) => {
  try {
    const { type, status, category, startDate, endDate, organizer, upcoming } = req.query;
    const query = { tenant: req.user.tenant };

    if (type) query.type = type;
    if (status) query.status = status;
    if (category) query.category = category;
    if (organizer) query.organizer = organizer;

    if (upcoming === 'true') {
      query.startDate = { $gte: new Date() };
      query.status = { $in: ['scheduled', 'draft'] };
    }

    if (startDate || endDate) {
      query.startDate = query.startDate || {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    const events = await Event.find(query)
      .populate('category', 'name color')
      .populate('organizer', 'firstName lastName')
      .populate('department', 'name')
      .sort({ startDate: 1 });

    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/calendar', async (req, res) => {
  try {
    const { year, month } = req.query;

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const events = await Event.find({
      tenant: req.user.tenant,
      status: { $nin: ['cancelled'] },
      $or: [
        { startDate: { $gte: startOfMonth, $lte: endOfMonth } },
        { endDate: { $gte: startOfMonth, $lte: endOfMonth } },
        { startDate: { $lte: startOfMonth }, endDate: { $gte: endOfMonth } },
      ],
    })
      .populate('category', 'name color')
      .select('eventId title type startDate endDate isAllDay location.type status category');

    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/my-events', async (req, res) => {
  try {
    // Events where user is attendee or organizer
    const events = await Event.find({
      tenant: req.user.tenant,
      status: { $nin: ['cancelled', 'completed'] },
      $or: [
        { organizer: req.user.employee },
        { 'attendees.employee': req.user.employee },
      ],
    })
      .populate('category', 'name color')
      .sort({ startDate: 1 });

    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('category', 'name color')
      .populate('organizer', 'firstName lastName email')
      .populate('department', 'name')
      .populate('branch', 'name')
      .populate('attendees.employee', 'firstName lastName email employeeId')
      .populate('attendees.contact', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', authorize('super_admin', 'tenant_admin', 'hr_manager', 'dept_head'), async (req, res) => {
  try {
    const event = await Event.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/:id', authorize('super_admin', 'tenant_admin', 'hr_manager', 'dept_head'), async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Only organizer or admin can edit
    if (event.organizer?.toString() !== req.user.employee?.toString() &&
        !['super_admin', 'tenant_admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this event' });
    }

    Object.assign(event, req.body);
    await event.save();

    res.json({ success: true, data: event });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/:id/publish', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: 'draft' },
      { status: 'scheduled' },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // TODO: Send invitations to attendees

    res.json({ success: true, data: event });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/:id/cancel', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: { $nin: ['completed', 'cancelled'] } },
      {
        status: 'cancelled',
        cancellationReason: req.body.reason,
      },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // TODO: Notify attendees of cancellation

    res.json({ success: true, data: event });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/:id/postpone', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: 'scheduled' },
      {
        status: 'postponed',
        postponedTo: req.body.newDate,
      },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({ success: true, data: event });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ ATTENDEES ============

router.post('/:id/attendees', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const { attendees } = req.body;

    for (const attendee of attendees) {
      // Check if already added
      const existing = event.attendees.find(a =>
        a.employee?.toString() === attendee.employee ||
        a.email === attendee.email
      );

      if (!existing) {
        event.attendees.push({
          ...attendee,
          status: 'pending',
        });
      }
    }

    await event.save();

    res.json({ success: true, data: event });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/:id/rsvp', async (req, res) => {
  try {
    const { status, declineReason } = req.body;

    const event = await Event.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Find attendee
    const attendee = event.attendees.find(a =>
      a.employee?.toString() === req.user.employee?.toString() ||
      a.email === req.user.email
    );

    if (!attendee) {
      return res.status(404).json({ success: false, message: 'You are not invited to this event' });
    }

    attendee.status = status;
    attendee.respondedAt = new Date();
    if (status === 'declined') {
      attendee.declineReason = declineReason;
    }

    await event.save();

    res.json({ success: true, message: 'RSVP recorded' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/:id/check-in', authorize('super_admin', 'tenant_admin', 'hr_manager', 'event_staff'), async (req, res) => {
  try {
    const { attendeeId, method } = req.body;

    const event = await Event.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const attendee = event.attendees.id(attendeeId);
    if (!attendee) {
      return res.status(404).json({ success: false, message: 'Attendee not found' });
    }

    attendee.checkedIn = true;
    attendee.checkInTime = new Date();
    attendee.checkInMethod = method || 'manual';

    await event.save();

    res.json({ success: true, message: 'Check-in successful' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ EVENT REGISTRATION (Public/External) ============

router.post('/:id/register', async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      registrationRequired: true,
      status: 'scheduled',
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found or registration not available' });
    }

    // Check capacity
    const registrationCount = await EventRegistration.countDocuments({
      event: event._id,
      status: { $in: ['pending', 'confirmed', 'attended'] },
    });

    if (event.maxAttendees && registrationCount >= event.maxAttendees) {
      if (event.waitlistEnabled) {
        // Add to waitlist
        const position = event.waitlist.length + 1;
        event.waitlist.push({
          ...req.body,
          addedAt: new Date(),
          position,
        });
        await event.save();

        return res.json({ success: true, message: 'Added to waitlist', position });
      }
      return res.status(400).json({ success: false, message: 'Event is full' });
    }

    // Check registration deadline
    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      return res.status(400).json({ success: false, message: 'Registration deadline has passed' });
    }

    // Create registration
    const registration = await EventRegistration.create({
      ...req.body,
      tenant: req.user.tenant,
      event: event._id,
      employee: req.user.employee,
      registrantType: req.user.employee ? 'employee' : 'external',
      status: 'confirmed',
      confirmedAt: new Date(),
    });

    res.status(201).json({ success: true, data: registration });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/:id/registrations', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const registrations = await EventRegistration.find({
      event: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('employee', 'firstName lastName employeeId')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: registrations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ FEEDBACK ============

router.post('/:id/feedback', async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      feedbackEnabled: true,
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found or feedback not enabled' });
    }

    // Check if already submitted
    const existing = await EventFeedback.findOne({
      event: event._id,
      $or: [
        { employee: req.user.employee },
        { email: req.user.email },
      ],
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Feedback already submitted' });
    }

    const feedback = await EventFeedback.create({
      ...req.body,
      tenant: req.user.tenant,
      event: event._id,
      employee: req.user.employee,
      email: req.user.email,
      respondentType: req.user.employee ? 'employee' : 'anonymous',
    });

    // Update event metrics
    const allFeedback = await EventFeedback.find({ event: event._id });
    event.metrics.feedbackReceived = allFeedback.length;
    event.metrics.averageRating = allFeedback.reduce((sum, f) => sum + (f.overallRating || 0), 0) / allFeedback.length;
    await event.save();

    res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/:id/feedback', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const feedback = await EventFeedback.find({
      event: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('employee', 'firstName lastName')
      .sort({ submittedAt: -1 });

    // Calculate summary
    const summary = {
      total: feedback.length,
      averageOverall: 0,
      averageVenue: 0,
      averageContent: 0,
      averageOrganization: 0,
      npsScore: 0,
      recommendPercent: 0,
    };

    if (feedback.length > 0) {
      summary.averageOverall = feedback.reduce((sum, f) => sum + (f.overallRating || 0), 0) / feedback.length;
      summary.averageVenue = feedback.filter(f => f.venueRating).reduce((sum, f) => sum + f.venueRating, 0) / feedback.filter(f => f.venueRating).length || 0;
      summary.averageContent = feedback.filter(f => f.contentRating).reduce((sum, f) => sum + f.contentRating, 0) / feedback.filter(f => f.contentRating).length || 0;
      summary.averageOrganization = feedback.filter(f => f.organizationRating).reduce((sum, f) => sum + f.organizationRating, 0) / feedback.filter(f => f.organizationRating).length || 0;
      summary.recommendPercent = (feedback.filter(f => f.wouldRecommend).length / feedback.length) * 100;

      const npsResponses = feedback.filter(f => f.npsScore !== undefined);
      if (npsResponses.length > 0) {
        const promoters = npsResponses.filter(f => f.npsScore >= 9).length;
        const detractors = npsResponses.filter(f => f.npsScore <= 6).length;
        summary.npsScore = ((promoters - detractors) / npsResponses.length) * 100;
      }
    }

    res.json({ success: true, data: { feedback, summary } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ ANNOUNCEMENTS ============

router.get('/announcements/list', async (req, res) => {
  try {
    const { type, status } = req.query;
    const now = new Date();

    const query = {
      tenant: req.user.tenant,
      status: 'published',
      $or: [
        { expiresAt: null },
        { expiresAt: { $gte: now } },
      ],
    };

    if (type) query.type = type;

    // Filter by audience
    const employee = req.user.employee;
    if (employee) {
      query.$or = [
        { 'audience.type': 'all' },
        { 'audience.departments': employee.department },
        { 'audience.branches': employee.branch },
        { 'audience.employees': employee._id },
      ];
    }

    const announcements = await Announcement.find(query)
      .populate('publishedBy', 'firstName lastName')
      .sort({ isPinned: -1, publishedAt: -1 });

    res.json({ success: true, data: announcements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/announcements/:id', async (req, res) => {
  try {
    const announcement = await Announcement.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    }).populate('publishedBy', 'firstName lastName');

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    // Track view
    if (req.user.employee && !announcement.uniqueViews.includes(req.user.employee)) {
      announcement.views += 1;
      announcement.uniqueViews.push(req.user.employee);
      await announcement.save();
    }

    res.json({ success: true, data: announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/announcements', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const announcement = await Announcement.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: announcement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/announcements/:id', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const announcement = await Announcement.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    res.json({ success: true, data: announcement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/announcements/:id/publish', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const announcement = await Announcement.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: 'draft' },
      {
        status: 'published',
        publishedAt: new Date(),
        publishedBy: req.user._id,
      },
      { new: true }
    );

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    // TODO: Send notifications based on channels

    res.json({ success: true, data: announcement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/announcements/:id/acknowledge', async (req, res) => {
  try {
    const announcement = await Announcement.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      requiresAcknowledgement: true,
    });

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    // Check if already acknowledged
    const already = announcement.acknowledgements.find(
      a => a.employee?.toString() === req.user.employee?.toString()
    );

    if (!already) {
      announcement.acknowledgements.push({
        employee: req.user.employee,
        acknowledgedAt: new Date(),
      });
      await announcement.save();
    }

    res.json({ success: true, message: 'Acknowledged' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ STATS ============

router.get('/stats/summary', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [upcomingEvents, thisMonthEvents, totalAttendees, avgRating] = await Promise.all([
      Event.countDocuments({
        tenant: req.user.tenant,
        status: 'scheduled',
        startDate: { $gte: now },
      }),

      Event.countDocuments({
        tenant: req.user.tenant,
        startDate: { $gte: startOfMonth },
      }),

      Event.aggregate([
        { $match: { tenant: req.user.tenant, status: { $ne: 'cancelled' } } },
        { $project: { attendeeCount: { $size: { $ifNull: ['$attendees', []] } } } },
        { $group: { _id: null, total: { $sum: '$attendeeCount' } } },
      ]),

      Event.aggregate([
        { $match: { tenant: req.user.tenant, 'metrics.averageRating': { $exists: true, $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$metrics.averageRating' } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        upcomingEvents,
        thisMonthEvents,
        totalAttendees: totalAttendees[0]?.total || 0,
        averageRating: avgRating[0]?.avg || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
