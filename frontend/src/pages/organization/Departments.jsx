import { useState, useEffect } from 'react';
import { departmentAPI, branchAPI, employeeAPI } from '../../services/api';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineUserGroup,
  HiOutlineCalendar,
  HiOutlineLink,
  HiOutlineClipboardCopy,
  HiOutlineEye,
} from 'react-icons/hi';

const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  // Roster link states
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [rosterLinks, setRosterLinks] = useState([]);
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [rosterFormData, setRosterFormData] = useState({
    department: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    expiresAt: '',
    notes: '',
  });

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    parent: '',
    branch: '',
    head: '',
    costCenter: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [deptRes, branchRes, empRes] = await Promise.all([
        departmentAPI.getAll(),
        branchAPI.getAll(),
        employeeAPI.getDirectory(),
      ]);
      setDepartments(deptRes.data.data);
      setBranches(branchRes.data.data);
      setEmployees(empRes.data.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData };
      if (!data.parent) delete data.parent;
      if (!data.branch) delete data.branch;
      if (!data.head) delete data.head;

      if (selectedDepartment) {
        await departmentAPI.update(selectedDepartment._id, data);
        toast.success('Department updated successfully');
      } else {
        await departmentAPI.create(data);
        toast.success('Department created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;

    try {
      await departmentAPI.delete(id);
      toast.success('Department deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete department');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      parent: '',
      branch: '',
      head: '',
      costCenter: '',
    });
    setSelectedDepartment(null);
  };

  const openEditModal = (department) => {
    setSelectedDepartment(department);
    setFormData({
      name: department.name,
      code: department.code,
      description: department.description || '',
      parent: department.parent?._id || '',
      branch: department.branch?._id || '',
      head: department.head?._id || '',
      costCenter: department.costCenter || '',
    });
    setShowModal(true);
  };

  // Roster Link Functions
  const fetchRosterLinks = async () => {
    try {
      const res = await api.get('/duty-roster/links');
      setRosterLinks(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch roster links:', error);
    }
  };

  const openRosterModal = (department) => {
    if (!department.head) {
      toast.error('Please assign a Head of Department first');
      return;
    }
    setSelectedDepartment(department);
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 7); // Default expiry in 7 days
    setRosterFormData({
      department: department._id,
      month: new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2, // Next month
      year: new Date().getMonth() + 2 > 12 ? new Date().getFullYear() + 1 : new Date().getFullYear(),
      expiresAt: nextMonth.toISOString().split('T')[0],
      notes: '',
    });
    setGeneratedLink(null);
    setShowRosterModal(true);
  };

  const handleRosterFormChange = (e) => {
    setRosterFormData({ ...rosterFormData, [e.target.name]: e.target.value });
  };

  const handleGenerateRosterLink = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/duty-roster/links', rosterFormData);
      setGeneratedLink(res.data.data);
      toast.success('Roster link generated successfully');
      fetchRosterLinks();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate link');
    }
  };

  const copyLinkToClipboard = (token) => {
    const link = `${window.location.origin}/roster/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard');
  };

  const openLinksModal = async () => {
    await fetchRosterLinks();
    setShowLinksModal(true);
  };

  const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed': return 'badge-success';
      case 'in_progress': return 'badge-warning';
      case 'expired': return 'badge-danger';
      default: return 'badge-info';
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="departments-page">
      <div className="page-header">
        <h1>Departments</h1>
        <div className="actions">
          <button className="btn btn-secondary" onClick={openLinksModal}>
            <HiOutlineEye /> View Roster Links
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <HiOutlinePlus /> Add Department
          </button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Code</th>
              <th>Head</th>
              <th>Branch</th>
              <th>Employees</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept) => (
              <tr key={dept._id}>
                <td>
                  <div className="dept-cell">
                    <div className="dept-icon">
                      <HiOutlineUserGroup />
                    </div>
                    <div>
                      <div className="dept-name">{dept.name}</div>
                      {dept.parent && (
                        <div className="dept-parent">Under {dept.parent.name}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td><span className="code-badge">{dept.code}</span></td>
                <td>{dept.head ? `${dept.head.firstName} ${dept.head.lastName}` : '-'}</td>
                <td>{dept.branch?.name || '-'}</td>
                <td>{dept.employeeCount || 0}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-icon roster"
                      onClick={() => openRosterModal(dept)}
                      title="Generate Roster Link"
                    >
                      <HiOutlineCalendar />
                    </button>
                    <button className="btn-icon" onClick={() => openEditModal(dept)}>
                      <HiOutlinePencil />
                    </button>
                    <button className="btn-icon danger" onClick={() => handleDelete(dept._id)}>
                      <HiOutlineTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {departments.length === 0 && (
          <div className="empty-state">
            <p>No departments found. Create your first department.</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={selectedDepartment ? 'Edit Department' : 'Add New Department'}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label>Department Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Department Code *</label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  required
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Parent Department</label>
                <select name="parent" value={formData.parent} onChange={handleChange}>
                  <option value="">None (Top Level)</option>
                  {departments
                    .filter(d => d._id !== selectedDepartment?._id)
                    .map((dept) => (
                      <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                </select>
              </div>
              <div className="form-group">
                <label>Branch</label>
                <select name="branch" value={formData.branch} onChange={handleChange}>
                  <option value="">Select Branch</option>
                  {branches.map((branch) => (
                    <option key={branch._id} value={branch._id}>{branch.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Department Head</label>
                <select name="head" value={formData.head} onChange={handleChange}>
                  <option value="">Select Head</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Cost Center</label>
                <input
                  type="text"
                  name="costCenter"
                  value={formData.costCenter}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {selectedDepartment ? 'Update' : 'Create'} Department
            </button>
          </div>
        </form>
      </Modal>

      {/* Generate Roster Link Modal */}
      <Modal
        isOpen={showRosterModal}
        onClose={() => setShowRosterModal(false)}
        title={`Generate Roster Link - ${selectedDepartment?.name || ''}`}
        size="md"
      >
        {generatedLink ? (
          <div className="generated-link-content">
            <div className="success-message">
              <div className="success-icon">✓</div>
              <h3>Roster Link Generated!</h3>
              <p>Share this link with {selectedDepartment?.head?.firstName} {selectedDepartment?.head?.lastName} to fill the duty roster.</p>
            </div>
            <div className="link-details">
              <div className="detail-row">
                <span className="label">Period:</span>
                <span className="value">{getMonthName(generatedLink.month)} {generatedLink.year}</span>
              </div>
              <div className="detail-row">
                <span className="label">Expires:</span>
                <span className="value">{new Date(generatedLink.expiresAt).toLocaleDateString()}</span>
              </div>
              <div className="detail-row">
                <span className="label">Status:</span>
                <span className={`badge ${getStatusBadgeClass(generatedLink.status)}`}>{generatedLink.status}</span>
              </div>
            </div>
            <div className="link-box">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/roster/${generatedLink.token}`}
              />
              <button
                className="btn btn-primary"
                onClick={() => copyLinkToClipboard(generatedLink.token)}
              >
                <HiOutlineClipboardCopy /> Copy
              </button>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRosterModal(false)}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGenerateRosterLink}>
            <div className="modal-body">
              <div className="info-box">
                <HiOutlineLink className="info-icon" />
                <p>Generate a unique link for the HOD to fill in the duty roster for their department members.</p>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Month *</label>
                  <select
                    name="month"
                    value={rosterFormData.month}
                    onChange={handleRosterFormChange}
                    required
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Year *</label>
                  <select
                    name="year"
                    value={rosterFormData.year}
                    onChange={handleRosterFormChange}
                    required
                  >
                    {[...Array(3)].map((_, i) => {
                      const year = new Date().getFullYear() + i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Link Expiry Date *</label>
                <input
                  type="date"
                  name="expiresAt"
                  value={rosterFormData.expiresAt}
                  onChange={handleRosterFormChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="form-group">
                <label>Notes for HOD</label>
                <textarea
                  name="notes"
                  value={rosterFormData.notes}
                  onChange={handleRosterFormChange}
                  rows={2}
                  placeholder="Any instructions or notes for the HOD..."
                />
              </div>

              <div className="hod-info">
                <strong>HOD:</strong> {selectedDepartment?.head?.firstName} {selectedDepartment?.head?.lastName}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowRosterModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <HiOutlineLink /> Generate Link
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* View All Roster Links Modal */}
      <Modal
        isOpen={showLinksModal}
        onClose={() => setShowLinksModal(false)}
        title="Duty Roster Links"
        size="lg"
      >
        <div className="modal-body">
          {rosterLinks.length === 0 ? (
            <div className="empty-state">
              <p>No roster links generated yet.</p>
            </div>
          ) : (
            <table className="table roster-links-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Period</th>
                  <th>HOD</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rosterLinks.map((link) => (
                  <tr key={link._id}>
                    <td>{link.department?.name}</td>
                    <td>{getMonthName(link.month)} {link.year}</td>
                    <td>{link.assignedTo?.firstName} {link.assignedTo?.lastName}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(link.status)}`}>
                        {link.status}
                      </span>
                    </td>
                    <td>{new Date(link.expiresAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn-icon"
                        onClick={() => copyLinkToClipboard(link.token)}
                        title="Copy Link"
                      >
                        <HiOutlineClipboardCopy />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowLinksModal(false)}>
            Close
          </button>
        </div>
      </Modal>

      <style>{`
        .dept-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .dept-icon {
          width: 2.25rem;
          height: 2.25rem;
          background: rgba(99, 102, 241, 0.1);
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6366f1;
          font-size: 1.125rem;
        }

        .dept-name {
          font-weight: 500;
          color: #111827;
        }

        .dept-parent {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .code-badge {
          background: #f3f4f6;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
          color: #4b5563;
        }

        .action-buttons {
          display: flex;
          gap: 0.25rem;
        }

        .btn-icon {
          width: 2rem;
          height: 2rem;
          border: none;
          background: #f9fafb;
          border-radius: 0.375rem;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .btn-icon:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .btn-icon.danger:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .btn-icon.roster:hover {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #6b7280;
        }

        /* Roster Link Modal Styles */
        .info-box {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 0.5rem;
          padding: 1rem;
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .info-box .info-icon {
          font-size: 1.25rem;
          color: #0284c7;
          flex-shrink: 0;
        }

        .info-box p {
          margin: 0;
          font-size: 0.875rem;
          color: #0369a1;
        }

        .hod-info {
          background: #f9fafb;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          color: #374151;
          margin-top: 1rem;
        }

        .generated-link-content {
          padding: 1.5rem;
        }

        .success-message {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .success-icon {
          width: 3rem;
          height: 3rem;
          background: #10b981;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          margin: 0 auto 1rem;
        }

        .success-message h3 {
          margin: 0 0 0.5rem;
          color: #111827;
        }

        .success-message p {
          margin: 0;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .link-details {
          background: #f9fafb;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .link-details .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.375rem 0;
        }

        .link-details .label {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .link-details .value {
          font-size: 0.875rem;
          font-weight: 500;
          color: #111827;
        }

        .link-box {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .link-box input {
          flex: 1;
          padding: 0.625rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.8125rem;
          background: #f9fafb;
          color: #374151;
        }

        .badge {
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .badge-success {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .badge-warning {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }

        .badge-danger {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .badge-info {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        .roster-links-table {
          font-size: 0.875rem;
        }

        .roster-links-table th {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
      `}</style>
    </div>
  );
};

export default Departments;
