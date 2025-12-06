import { useState, useEffect } from 'react';
import { recruitmentAPI, departmentAPI } from '../../services/api';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineBriefcase,
  HiOutlineUsers,
  HiOutlineCalendar,
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlineCheck,
  HiOutlineX,
} from 'react-icons/hi';
import './Recruitment.scss';

const Recruitment = () => {
  const [activeTab, setActiveTab] = useState('jobs');
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);

  const [jobForm, setJobForm] = useState({
    title: '',
    code: '',
    department: '',
    description: '',
    employmentType: 'full_time',
    workMode: 'onsite',
    positions: 1,
    priority: 'medium',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [jobsRes, appsRes, interviewsRes, statsRes, deptRes] = await Promise.all([
        recruitmentAPI.getJobs(),
        recruitmentAPI.getApplications(),
        recruitmentAPI.getInterviews(),
        recruitmentAPI.getStats(),
        departmentAPI.getAll(),
      ]);

      setJobs(jobsRes.data.data);
      setApplications(appsRes.data.data);
      setInterviews(interviewsRes.data.data);
      setStats(statsRes.data.data);
      setDepartments(deptRes.data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      await recruitmentAPI.createJob(jobForm);
      toast.success('Job created successfully');
      setShowJobModal(false);
      setJobForm({
        title: '',
        code: '',
        department: '',
        description: '',
        employmentType: 'full_time',
        workMode: 'onsite',
        positions: 1,
        priority: 'medium',
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create job');
    }
  };

  const handlePublishJob = async (jobId) => {
    try {
      await recruitmentAPI.publishJob(jobId);
      toast.success('Job published');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to publish job');
    }
  };

  const handleCloseJob = async (jobId) => {
    try {
      await recruitmentAPI.closeJob(jobId);
      toast.success('Job closed');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to close job');
    }
  };

  const handleUpdateApplicationStatus = async (appId, status) => {
    try {
      await recruitmentAPI.updateApplicationStatus(appId, { status });
      toast.success('Application status updated');
      fetchData();
      setShowApplicationModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const viewApplication = async (app) => {
    try {
      const res = await recruitmentAPI.getApplication(app._id);
      setSelectedApplication(res.data.data);
      setShowApplicationModal(true);
    } catch (error) {
      toast.error('Failed to load application');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'badge-gray',
      open: 'badge-success',
      on_hold: 'badge-warning',
      closed: 'badge-danger',
      new: 'badge-info',
      screening: 'badge-warning',
      shortlisted: 'badge-primary',
      interviewing: 'badge-info',
      offered: 'badge-success',
      hired: 'badge-success',
      rejected: 'badge-danger',
    };
    return badges[status] || 'badge-gray';
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      low: 'badge-gray',
      medium: 'badge-info',
      high: 'badge-warning',
      urgent: 'badge-danger',
    };
    return badges[priority] || 'badge-gray';
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="recruitment-page">
      <div className="page-header">
        <h1>Recruitment</h1>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => setShowJobModal(true)}>
            <HiOutlinePlus /> Post Job
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <HiOutlineBriefcase />
          </div>
          <div className="stat-value">{stats?.openJobs || 0}</div>
          <div className="stat-label">Open Positions</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <HiOutlineUsers />
          </div>
          <div className="stat-value">{stats?.totalApplications || 0}</div>
          <div className="stat-label">Total Applications</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <HiOutlineCalendar />
          </div>
          <div className="stat-value">{stats?.interviewsThisWeek || 0}</div>
          <div className="stat-label">Interviews This Week</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <HiOutlineDocumentText />
          </div>
          <div className="stat-value">{stats?.pendingOffers || 0}</div>
          <div className="stat-label">Pending Offers</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          Jobs ({jobs.length})
        </button>
        <button
          className={`tab ${activeTab === 'applications' ? 'active' : ''}`}
          onClick={() => setActiveTab('applications')}
        >
          Applications ({applications.length})
        </button>
        <button
          className={`tab ${activeTab === 'interviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('interviews')}
        >
          Upcoming Interviews ({interviews.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="card">
        {activeTab === 'jobs' && (
          <div className="jobs-list">
            {jobs.map((job) => (
              <div key={job._id} className="job-card">
                <div className="job-main">
                  <div className="job-header">
                    <h3>{job.title}</h3>
                    <div className="job-badges">
                      <span className={`badge ${getStatusBadge(job.status)}`}>{job.status}</span>
                      <span className={`badge ${getPriorityBadge(job.priority)}`}>{job.priority}</span>
                    </div>
                  </div>
                  <div className="job-meta">
                    <span>{job.code}</span>
                    <span>{job.department?.name}</span>
                    <span>{job.employmentType?.replace('_', ' ')}</span>
                    <span>{job.workMode}</span>
                  </div>
                  <div className="job-stats">
                    <div>
                      <strong>{job.positions - job.filledPositions}</strong> open of {job.positions}
                    </div>
                    <div>
                      <strong>{job.applicationCount}</strong> applications
                    </div>
                  </div>
                </div>
                <div className="job-actions">
                  {job.status === 'draft' && (
                    <button className="btn btn-sm btn-success" onClick={() => handlePublishJob(job._id)}>
                      Publish
                    </button>
                  )}
                  {job.status === 'open' && (
                    <button className="btn btn-sm btn-outline" onClick={() => handleCloseJob(job._id)}>
                      Close
                    </button>
                  )}
                </div>
              </div>
            ))}
            {jobs.length === 0 && (
              <div className="empty-state">No jobs found</div>
            )}
          </div>
        )}

        {activeTab === 'applications' && (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Job</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Applied</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app._id}>
                    <td>
                      <strong>{app.applicant?.firstName} {app.applicant?.lastName}</strong>
                      <div className="text-muted small">{app.applicant?.email}</div>
                    </td>
                    <td>{app.job?.title}</td>
                    <td>{app.source}</td>
                    <td>
                      <span className={`badge ${getStatusBadge(app.status)}`}>{app.status}</span>
                    </td>
                    <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-sm btn-outline" onClick={() => viewApplication(app)}>
                        <HiOutlineEye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {applications.length === 0 && (
              <div className="empty-state">No applications found</div>
            )}
          </div>
        )}

        {activeTab === 'interviews' && (
          <div className="interviews-list">
            {interviews.map((interview) => (
              <div key={interview._id} className="interview-card">
                <div className="interview-date">
                  <span className="day">{new Date(interview.scheduledAt).getDate()}</span>
                  <span className="month">
                    {new Date(interview.scheduledAt).toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                </div>
                <div className="interview-details">
                  <h4>{interview.job?.title}</h4>
                  <div className="interview-meta">
                    <span>{interview.type}</span>
                    <span>{interview.duration} mins</span>
                    <span>
                      {new Date(interview.scheduledAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                <span className={`badge ${getStatusBadge(interview.status)}`}>
                  {interview.status}
                </span>
              </div>
            ))}
            {interviews.length === 0 && (
              <div className="empty-state">No upcoming interviews</div>
            )}
          </div>
        )}
      </div>

      {/* Create Job Modal */}
      <Modal
        isOpen={showJobModal}
        onClose={() => setShowJobModal(false)}
        title="Post New Job"
        size="md"
      >
        <form onSubmit={handleCreateJob}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label>Job Title *</label>
                <input
                  type="text"
                  value={jobForm.title}
                  onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Job Code *</label>
                <input
                  type="text"
                  value={jobForm.code}
                  onChange={(e) => setJobForm({ ...jobForm, code: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Department</label>
              <select
                value={jobForm.department}
                onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea
                value={jobForm.description}
                onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                rows={4}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Employment Type</label>
                <select
                  value={jobForm.employmentType}
                  onChange={(e) => setJobForm({ ...jobForm, employmentType: e.target.value })}
                >
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
              <div className="form-group">
                <label>Work Mode</label>
                <select
                  value={jobForm.workMode}
                  onChange={(e) => setJobForm({ ...jobForm, workMode: e.target.value })}
                >
                  <option value="onsite">On-site</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Positions</label>
                <input
                  type="number"
                  value={jobForm.positions}
                  onChange={(e) => setJobForm({ ...jobForm, positions: parseInt(e.target.value) })}
                  min={1}
                />
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={jobForm.priority}
                  onChange={(e) => setJobForm({ ...jobForm, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowJobModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Job
            </button>
          </div>
        </form>
      </Modal>

      {/* Application Modal */}
      <Modal
        isOpen={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
        title="Application Details"
        size="md"
      >
        {selectedApplication && (
          <div className="modal-body">
            <div className="application-header">
              <h3>{selectedApplication.applicant?.firstName} {selectedApplication.applicant?.lastName}</h3>
              <span className={`badge ${getStatusBadge(selectedApplication.status)}`}>
                {selectedApplication.status}
              </span>
            </div>
            <div className="application-contact">
              <p>{selectedApplication.applicant?.email}</p>
              <p>{selectedApplication.applicant?.phone}</p>
            </div>

            {selectedApplication.coverLetter && (
              <div className="application-section">
                <h4>Cover Letter</h4>
                <p>{selectedApplication.coverLetter}</p>
              </div>
            )}

            {selectedApplication.experience?.length > 0 && (
              <div className="application-section">
                <h4>Experience</h4>
                {selectedApplication.experience.map((exp, i) => (
                  <div key={i} className="experience-item">
                    <strong>{exp.title}</strong> at {exp.company}
                  </div>
                ))}
              </div>
            )}

            <div className="application-actions">
              {selectedApplication.status === 'new' && (
                <>
                  <button
                    className="btn btn-success"
                    onClick={() => handleUpdateApplicationStatus(selectedApplication._id, 'shortlisted')}
                  >
                    <HiOutlineCheck /> Shortlist
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleUpdateApplicationStatus(selectedApplication._id, 'rejected')}
                  >
                    <HiOutlineX /> Reject
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Recruitment;
