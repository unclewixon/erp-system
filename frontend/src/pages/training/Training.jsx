import { useState, useEffect } from 'react';
import { trainingAPI } from '../../services/api';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineAcademicCap,
  HiOutlineUserGroup,
  HiOutlineClipboardCheck,
  HiOutlineBadgeCheck,
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineLocationMarker,
} from 'react-icons/hi';
import './Training.scss';

const Training = () => {
  const [activeTab, setActiveTab] = useState('programs');
  const [programs, setPrograms] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [skills, setSkills] = useState([]);
  const [mySkills, setMySkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);

  const [programForm, setProgramForm] = useState({
    name: '',
    description: '',
    category: 'technical',
    type: 'online',
    duration: { value: 1, unit: 'hours' },
    instructor: { name: '', email: '' },
    maxParticipants: 20,
    isRequired: false,
  });

  const [skillForm, setSkillForm] = useState({
    name: '',
    category: 'technical',
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [programsRes, enrollmentsRes, skillsRes, mySkillsRes] = await Promise.all([
        trainingAPI.getPrograms(),
        trainingAPI.getMyEnrollments().catch(() => ({ data: { data: [] } })),
        trainingAPI.getSkills(),
        trainingAPI.getMySkills().catch(() => ({ data: { data: [] } })),
      ]);

      setPrograms(programsRes.data.data);
      setMyEnrollments(enrollmentsRes.data.data);
      setSkills(skillsRes.data.data);
      setMySkills(mySkillsRes.data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProgram = async (e) => {
    e.preventDefault();
    try {
      await trainingAPI.createProgram(programForm);
      toast.success('Training program created successfully');
      setShowProgramModal(false);
      setProgramForm({
        name: '',
        description: '',
        category: 'technical',
        type: 'online',
        duration: { value: 1, unit: 'hours' },
        instructor: { name: '', email: '' },
        maxParticipants: 20,
        isRequired: false,
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create program');
    }
  };

  const handleCreateSkill = async (e) => {
    e.preventDefault();
    try {
      await trainingAPI.createSkill(skillForm);
      toast.success('Skill created successfully');
      setShowSkillModal(false);
      setSkillForm({ name: '', category: 'technical', description: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create skill');
    }
  };

  const handleEnroll = async (programId) => {
    try {
      await trainingAPI.enrollInProgram(programId);
      toast.success('Enrolled successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to enroll');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'badge-gray',
      published: 'badge-success',
      archived: 'badge-warning',
      enrolled: 'badge-info',
      in_progress: 'badge-primary',
      completed: 'badge-success',
      dropped: 'badge-danger',
      beginner: 'badge-gray',
      intermediate: 'badge-info',
      advanced: 'badge-primary',
      expert: 'badge-success',
    };
    return badges[status] || 'badge-gray';
  };

  const getCategoryColor = (category) => {
    const colors = {
      technical: '#3b82f6',
      soft_skills: '#8b5cf6',
      compliance: '#ef4444',
      leadership: '#f59e0b',
      product: '#10b981',
      other: '#6b7280',
    };
    return colors[category] || '#6b7280';
  };

  const isEnrolled = (programId) => {
    return myEnrollments.some(e => e.program?._id === programId);
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="training-page">
      <div className="page-header">
        <h1>Training & Development</h1>
        <div className="actions">
          <button className="btn btn-outline" onClick={() => setShowSkillModal(true)}>
            <HiOutlineBadgeCheck /> Add Skill
          </button>
          <button className="btn btn-primary" onClick={() => setShowProgramModal(true)}>
            <HiOutlinePlus /> Create Program
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <HiOutlineAcademicCap />
          </div>
          <div className="stat-value">{programs.length}</div>
          <div className="stat-label">Training Programs</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <HiOutlineClipboardCheck />
          </div>
          <div className="stat-value">{myEnrollments.filter(e => e.status === 'completed').length}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <HiOutlineUserGroup />
          </div>
          <div className="stat-value">{myEnrollments.filter(e => e.status === 'in_progress').length}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <HiOutlineBadgeCheck />
          </div>
          <div className="stat-value">{mySkills.length}</div>
          <div className="stat-label">My Skills</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'programs' ? 'active' : ''}`}
          onClick={() => setActiveTab('programs')}
        >
          Training Programs
        </button>
        <button
          className={`tab ${activeTab === 'my-training' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-training')}
        >
          My Training
        </button>
        <button
          className={`tab ${activeTab === 'skills' ? 'active' : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          Skills Matrix
        </button>
      </div>

      {/* Tab Content */}
      <div className="card">
        {activeTab === 'programs' && (
          <div className="programs-grid">
            {programs.map((program) => (
              <div key={program._id} className="program-card">
                <div className="program-header">
                  <span
                    className="category-badge"
                    style={{ background: `${getCategoryColor(program.category)}20`, color: getCategoryColor(program.category) }}
                  >
                    {program.category?.replace('_', ' ')}
                  </span>
                  <span className={`badge ${getStatusBadge(program.status)}`}>
                    {program.status}
                  </span>
                </div>
                <h3>{program.name}</h3>
                {program.description && (
                  <p className="program-description">{program.description}</p>
                )}
                <div className="program-meta">
                  <span>
                    <HiOutlineClock />
                    {program.duration?.value} {program.duration?.unit}
                  </span>
                  <span>
                    <HiOutlineUserGroup />
                    {program.enrollmentCount || 0}/{program.maxParticipants}
                  </span>
                </div>
                {program.instructor?.name && (
                  <div className="instructor">
                    <strong>Instructor:</strong> {program.instructor.name}
                  </div>
                )}
                <div className="program-actions">
                  {isEnrolled(program._id) ? (
                    <button className="btn btn-success btn-block" disabled>
                      <HiOutlineClipboardCheck /> Enrolled
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary btn-block"
                      onClick={() => handleEnroll(program._id)}
                      disabled={program.status !== 'published'}
                    >
                      Enroll Now
                    </button>
                  )}
                </div>
              </div>
            ))}
            {programs.length === 0 && (
              <div className="empty-state">No training programs available</div>
            )}
          </div>
        )}

        {activeTab === 'my-training' && (
          <div className="enrollments-list">
            {myEnrollments.map((enrollment) => (
              <div key={enrollment._id} className="enrollment-card">
                <div className="enrollment-header">
                  <div>
                    <h4>{enrollment.program?.name}</h4>
                    <span className="program-type">{enrollment.program?.type}</span>
                  </div>
                  <span className={`badge ${getStatusBadge(enrollment.status)}`}>
                    {enrollment.status?.replace('_', ' ')}
                  </span>
                </div>
                <div className="enrollment-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${enrollment.progress || 0}%` }}
                    />
                  </div>
                  <span className="progress-text">{enrollment.progress || 0}%</span>
                </div>
                <div className="enrollment-meta">
                  <span>
                    <HiOutlineCalendar />
                    Enrolled: {new Date(enrollment.enrolledAt).toLocaleDateString()}
                  </span>
                  {enrollment.completedAt && (
                    <span>
                      <HiOutlineClipboardCheck />
                      Completed: {new Date(enrollment.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {enrollment.status === 'enrolled' && (
                  <div className="enrollment-actions">
                    <button className="btn btn-sm btn-primary">
                      Start Training
                    </button>
                  </div>
                )}
              </div>
            ))}
            {myEnrollments.length === 0 && (
              <div className="empty-state">You haven't enrolled in any training programs yet</div>
            )}
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="skills-section">
            <div className="skills-header">
              <h3>My Skills</h3>
            </div>
            <div className="skills-grid">
              {mySkills.map((skill) => (
                <div key={skill._id} className="skill-card">
                  <div className="skill-header">
                    <h4>{skill.skill?.name}</h4>
                    <span className={`badge ${getStatusBadge(skill.proficiencyLevel)}`}>
                      {skill.proficiencyLevel}
                    </span>
                  </div>
                  <div className="skill-meta">
                    <span className="category">{skill.skill?.category?.replace('_', ' ')}</span>
                    {skill.isVerified && (
                      <span className="verified">
                        <HiOutlineBadgeCheck /> Verified
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {mySkills.length === 0 && (
                <div className="empty-state">No skills added yet</div>
              )}
            </div>

            <div className="skills-header" style={{ marginTop: '2rem' }}>
              <h3>All Skills</h3>
            </div>
            <div className="all-skills-list">
              {skills.map((skill) => (
                <div key={skill._id} className="skill-item">
                  <span className="skill-name">{skill.name}</span>
                  <span
                    className="skill-category"
                    style={{ color: getCategoryColor(skill.category) }}
                  >
                    {skill.category?.replace('_', ' ')}
                  </span>
                </div>
              ))}
              {skills.length === 0 && (
                <div className="empty-state">No skills defined yet</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Program Modal */}
      <Modal
        isOpen={showProgramModal}
        onClose={() => setShowProgramModal(false)}
        title="Create Training Program"
        size="lg"
      >
        <form onSubmit={handleCreateProgram}>
          <div className="modal-body">
            <div className="form-group">
              <label>Program Name *</label>
              <input
                type="text"
                value={programForm.name}
                onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={programForm.description}
                onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <select
                  value={programForm.category}
                  onChange={(e) => setProgramForm({ ...programForm, category: e.target.value })}
                >
                  <option value="technical">Technical</option>
                  <option value="soft_skills">Soft Skills</option>
                  <option value="compliance">Compliance</option>
                  <option value="leadership">Leadership</option>
                  <option value="product">Product</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Type</label>
                <select
                  value={programForm.type}
                  onChange={(e) => setProgramForm({ ...programForm, type: e.target.value })}
                >
                  <option value="online">Online</option>
                  <option value="classroom">Classroom</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="self_paced">Self-Paced</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Duration</label>
                <div className="duration-input">
                  <input
                    type="number"
                    value={programForm.duration.value}
                    onChange={(e) => setProgramForm({
                      ...programForm,
                      duration: { ...programForm.duration, value: parseInt(e.target.value) }
                    })}
                    min={1}
                  />
                  <select
                    value={programForm.duration.unit}
                    onChange={(e) => setProgramForm({
                      ...programForm,
                      duration: { ...programForm.duration, unit: e.target.value }
                    })}
                  >
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Max Participants</label>
                <input
                  type="number"
                  value={programForm.maxParticipants}
                  onChange={(e) => setProgramForm({ ...programForm, maxParticipants: parseInt(e.target.value) })}
                  min={1}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Instructor Name</label>
                <input
                  type="text"
                  value={programForm.instructor.name}
                  onChange={(e) => setProgramForm({
                    ...programForm,
                    instructor: { ...programForm.instructor, name: e.target.value }
                  })}
                />
              </div>
              <div className="form-group">
                <label>Instructor Email</label>
                <input
                  type="email"
                  value={programForm.instructor.email}
                  onChange={(e) => setProgramForm({
                    ...programForm,
                    instructor: { ...programForm.instructor, email: e.target.value }
                  })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={programForm.isRequired}
                  onChange={(e) => setProgramForm({ ...programForm, isRequired: e.target.checked })}
                />
                Required Training
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowProgramModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Program
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Skill Modal */}
      <Modal
        isOpen={showSkillModal}
        onClose={() => setShowSkillModal(false)}
        title="Add Skill"
        size="sm"
      >
        <form onSubmit={handleCreateSkill}>
          <div className="modal-body">
            <div className="form-group">
              <label>Skill Name *</label>
              <input
                type="text"
                value={skillForm.name}
                onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                value={skillForm.category}
                onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value })}
              >
                <option value="technical">Technical</option>
                <option value="soft_skills">Soft Skills</option>
                <option value="leadership">Leadership</option>
                <option value="domain">Domain</option>
                <option value="tools">Tools</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={skillForm.description}
                onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowSkillModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Skill
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Training;
