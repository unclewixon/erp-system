import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import { TrainingProgram, TrainingSession, TrainingEnrollment, Skill, EmployeeSkill } from '../models/index.js';
import Employee from '../models/Employee.js';

const router = express.Router();

// Apply middleware
router.use(protect);
router.use(tenantGuard);

// ============ TRAINING PROGRAMS ============

// Get all training programs
router.get('/programs', async (req, res) => {
  try {
    const { category, status, type } = req.query;
    const query = { tenant: req.user.tenant };

    if (category) query.category = category;
    if (status) query.status = status;
    if (type) query.type = type;

    const programs = await TrainingProgram.find(query)
      .populate('targetDepartments', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: programs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get program by ID
router.get('/programs/:id', async (req, res) => {
  try {
    const program = await TrainingProgram.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('targetDepartments', 'name')
      .populate('targetDesignations', 'title');

    if (!program) {
      return res.status(404).json({ success: false, message: 'Training program not found' });
    }

    res.json({ success: true, data: program });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create training program
router.post('/programs', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const program = await TrainingProgram.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: program });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update training program
router.put('/programs/:id', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const program = await TrainingProgram.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    if (!program) {
      return res.status(404).json({ success: false, message: 'Training program not found' });
    }

    res.json({ success: true, data: program });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete training program
router.delete('/programs/:id', authorize('super_admin', 'tenant_admin'), async (req, res) => {
  try {
    const program = await TrainingProgram.findOneAndDelete({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!program) {
      return res.status(404).json({ success: false, message: 'Training program not found' });
    }

    res.json({ success: true, message: 'Training program deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ TRAINING SESSIONS ============

// Get all sessions
router.get('/sessions', async (req, res) => {
  try {
    const { program, status, upcoming } = req.query;
    const query = { tenant: req.user.tenant };

    if (program) query.program = program;
    if (status) query.status = status;
    if (upcoming === 'true') {
      query['schedule.startDate'] = { $gte: new Date() };
    }

    const sessions = await TrainingSession.find(query)
      .populate('program', 'title code category')
      .populate('trainer.employee', 'firstName lastName')
      .sort({ 'schedule.startDate': 1 });

    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get session by ID
router.get('/sessions/:id', async (req, res) => {
  try {
    const session = await TrainingSession.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('program')
      .populate('trainer.employee', 'firstName lastName email');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Training session not found' });
    }

    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create training session
router.post('/sessions', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const session = await TrainingSession.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update training session
router.put('/sessions/:id', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const session = await TrainingSession.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    if (!session) {
      return res.status(404).json({ success: false, message: 'Training session not found' });
    }

    res.json({ success: true, data: session });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Cancel training session
router.post('/sessions/:id/cancel', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const session = await TrainingSession.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      { status: 'cancelled' },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ success: false, message: 'Training session not found' });
    }

    // Update all enrollments
    await TrainingEnrollment.updateMany(
      { session: session._id },
      { status: 'cancelled' }
    );

    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ ENROLLMENTS ============

// Get my enrollments
router.get('/enrollments/my', async (req, res) => {
  try {
    // Super Admin has no tenant/employee - return empty array
    if (!req.user.tenant) {
      return res.json({ success: true, data: [] });
    }

    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.json({ success: true, data: [] });
    }

    const enrollments = await TrainingEnrollment.find({
      tenant: req.user.tenant,
      employee: employee._id,
    })
      .populate('session')
      .populate('program', 'title code category')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: enrollments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get enrollments for a session
router.get('/sessions/:sessionId/enrollments', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const enrollments = await TrainingEnrollment.find({
      tenant: req.user.tenant,
      session: req.params.sessionId,
    })
      .populate('employee', 'firstName lastName employeeId department')
      .sort({ createdAt: 1 });

    res.json({ success: true, data: enrollments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Enroll in training
router.post('/sessions/:sessionId/enroll', async (req, res) => {
  try {
    const session = await TrainingSession.findOne({
      _id: req.params.sessionId,
      tenant: req.user.tenant,
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Training session not found' });
    }

    if (session.status !== 'open' && session.status !== 'scheduled') {
      return res.status(400).json({ success: false, message: 'Session is not open for enrollment' });
    }

    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Check if already enrolled
    const existing = await TrainingEnrollment.findOne({
      session: session._id,
      employee: employee._id,
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Already enrolled in this session' });
    }

    // Check capacity
    const status = session.enrollmentCount >= session.capacity.max ? 'waitlisted' : 'enrolled';

    const enrollment = await TrainingEnrollment.create({
      tenant: req.user.tenant,
      session: session._id,
      program: session.program,
      employee: employee._id,
      enrollmentType: 'self',
      enrolledBy: req.user._id,
      status,
    });

    // Update session counts
    if (status === 'enrolled') {
      session.enrollmentCount += 1;
      if (session.enrollmentCount >= session.capacity.max) {
        session.status = 'full';
      }
    } else {
      session.waitlistCount += 1;
    }
    await session.save();

    res.status(201).json({ success: true, data: enrollment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Enroll employee (HR action)
router.post('/enrollments', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const { session: sessionId, employees } = req.body;

    const session = await TrainingSession.findOne({
      _id: sessionId,
      tenant: req.user.tenant,
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Training session not found' });
    }

    const enrollments = [];
    for (const empId of employees) {
      const existing = await TrainingEnrollment.findOne({
        session: sessionId,
        employee: empId,
      });

      if (!existing) {
        const enrollment = await TrainingEnrollment.create({
          tenant: req.user.tenant,
          session: sessionId,
          program: session.program,
          employee: empId,
          enrollmentType: 'hr',
          enrolledBy: req.user._id,
          status: 'enrolled',
        });
        enrollments.push(enrollment);
      }
    }

    session.enrollmentCount += enrollments.length;
    await session.save();

    res.status(201).json({ success: true, data: enrollments, count: enrollments.length });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Cancel enrollment
router.delete('/enrollments/:id', async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    const isHR = ['super_admin', 'tenant_admin', 'hr_manager'].includes(req.user.role);

    const query = { _id: req.params.id, tenant: req.user.tenant };
    if (!isHR) {
      query.employee = employee?._id;
    }

    const enrollment = await TrainingEnrollment.findOne(query);
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    if (enrollment.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel completed enrollment' });
    }

    enrollment.status = 'cancelled';
    await enrollment.save();

    // Update session count
    await TrainingSession.findByIdAndUpdate(enrollment.session, {
      $inc: { enrollmentCount: -1 },
    });

    res.json({ success: true, message: 'Enrollment cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark attendance
router.post('/enrollments/:id/attendance', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const { date, status } = req.body;

    const enrollment = await TrainingEnrollment.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      {
        $push: {
          attendance: { date: new Date(date), status },
        },
      },
      { new: true }
    );

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    res.json({ success: true, data: enrollment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Complete enrollment
router.post('/enrollments/:id/complete', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const { assessment, certificate } = req.body;

    const enrollment = await TrainingEnrollment.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      {
        status: 'completed',
        completedAt: new Date(),
        progress: 100,
        assessment,
        certificate: certificate ? {
          issued: true,
          issuedAt: new Date(),
          ...certificate,
        } : undefined,
      },
      { new: true }
    );

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    res.json({ success: true, data: enrollment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Submit feedback
router.post('/enrollments/:id/feedback', async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });

    const enrollment = await TrainingEnrollment.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, employee: employee?._id },
      {
        feedback: {
          ...req.body,
          submittedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    res.json({ success: true, data: enrollment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ SKILLS ============

// Get all skills
router.get('/skills', async (req, res) => {
  try {
    const { category } = req.query;
    const query = { tenant: req.user.tenant, isActive: true };

    if (category) query.category = category;

    const skills = await Skill.find(query).sort({ name: 1 });

    res.json({ success: true, data: skills });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create skill
router.post('/skills', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const skill = await Skill.create({
      ...req.body,
      tenant: req.user.tenant,
    });

    res.status(201).json({ success: true, data: skill });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update skill
router.put('/skills/:id', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const skill = await Skill.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    if (!skill) {
      return res.status(404).json({ success: false, message: 'Skill not found' });
    }

    res.json({ success: true, data: skill });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get my skills
router.get('/employee-skills/my', async (req, res) => {
  try {
    // Super Admin has no tenant/employee - return empty array
    if (!req.user.tenant) {
      return res.json({ success: true, data: [] });
    }

    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.json({ success: true, data: [] });
    }

    const skills = await EmployeeSkill.find({
      tenant: req.user.tenant,
      employee: employee._id,
    })
      .populate('skill', 'name category levels')
      .sort({ level: -1 });

    res.json({ success: true, data: skills });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get employee skills
router.get('/employee-skills/:employeeId', authorize('super_admin', 'tenant_admin', 'hr_manager', 'hr_officer'), async (req, res) => {
  try {
    const skills = await EmployeeSkill.find({
      tenant: req.user.tenant,
      employee: req.params.employeeId,
    })
      .populate('skill', 'name category levels')
      .sort({ level: -1 });

    res.json({ success: true, data: skills });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add/Update employee skill
router.post('/employee-skills', async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const existingSkill = await EmployeeSkill.findOne({
      tenant: req.user.tenant,
      employee: employee._id,
      skill: req.body.skill,
    });

    let employeeSkill;
    if (existingSkill) {
      employeeSkill = await EmployeeSkill.findByIdAndUpdate(
        existingSkill._id,
        { ...req.body, selfAssessed: true },
        { new: true }
      );
    } else {
      employeeSkill = await EmployeeSkill.create({
        ...req.body,
        tenant: req.user.tenant,
        employee: employee._id,
        selfAssessed: true,
      });
    }

    res.status(201).json({ success: true, data: employeeSkill });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Verify employee skill (HR action)
router.post('/employee-skills/:id/verify', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const { level } = req.body;

    const employeeSkill = await EmployeeSkill.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      {
        level,
        selfAssessed: false,
        verifiedBy: req.user._id,
        verifiedAt: new Date(),
      },
      { new: true }
    );

    if (!employeeSkill) {
      return res.status(404).json({ success: false, message: 'Employee skill not found' });
    }

    res.json({ success: true, data: employeeSkill });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete employee skill
router.delete('/employee-skills/:id', async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    const isHR = ['super_admin', 'tenant_admin', 'hr_manager'].includes(req.user.role);

    const query = { _id: req.params.id, tenant: req.user.tenant };
    if (!isHR) {
      query.employee = employee?._id;
    }

    const employeeSkill = await EmployeeSkill.findOneAndDelete(query);

    if (!employeeSkill) {
      return res.status(404).json({ success: false, message: 'Employee skill not found' });
    }

    res.json({ success: true, message: 'Skill removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get training stats
router.get('/stats', authorize('super_admin', 'tenant_admin', 'hr_manager'), async (req, res) => {
  try {
    const [
      totalPrograms,
      activePrograms,
      upcomingSessions,
      totalEnrollments,
      completedEnrollments,
    ] = await Promise.all([
      TrainingProgram.countDocuments({ tenant: req.user.tenant }),
      TrainingProgram.countDocuments({ tenant: req.user.tenant, status: 'active' }),
      TrainingSession.countDocuments({
        tenant: req.user.tenant,
        'schedule.startDate': { $gte: new Date() },
        status: { $in: ['scheduled', 'open'] },
      }),
      TrainingEnrollment.countDocuments({ tenant: req.user.tenant }),
      TrainingEnrollment.countDocuments({ tenant: req.user.tenant, status: 'completed' }),
    ]);

    const enrollmentsByCategory = await TrainingEnrollment.aggregate([
      { $match: { tenant: req.user.tenant } },
      {
        $lookup: {
          from: 'trainingprograms',
          localField: 'program',
          foreignField: '_id',
          as: 'programData',
        },
      },
      { $unwind: '$programData' },
      { $group: { _id: '$programData.category', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        totalPrograms,
        activePrograms,
        upcomingSessions,
        totalEnrollments,
        completedEnrollments,
        completionRate: totalEnrollments > 0
          ? ((completedEnrollments / totalEnrollments) * 100).toFixed(1)
          : 0,
        enrollmentsByCategory,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
