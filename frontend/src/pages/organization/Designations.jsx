import { useState, useEffect } from 'react';
import { designationAPI, departmentAPI } from '../../services/api';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineBriefcase,
} from 'react-icons/hi';

const Designations = () => {
  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDesignation, setSelectedDesignation] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    level: 1,
    department: '',
    salaryGrade: {
      min: '',
      max: '',
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [desigRes, deptRes] = await Promise.all([
        designationAPI.getAll(),
        departmentAPI.getAll(),
      ]);
      setDesignations(desigRes.data.data);
      setDepartments(deptRes.data.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData };
      if (!data.department) delete data.department;

      if (selectedDesignation) {
        await designationAPI.update(selectedDesignation._id, data);
        toast.success('Designation updated successfully');
      } else {
        await designationAPI.create(data);
        toast.success('Designation created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this designation?')) return;

    try {
      await designationAPI.delete(id);
      toast.success('Designation deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete designation');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      level: 1,
      department: '',
      salaryGrade: {
        min: '',
        max: '',
      },
    });
    setSelectedDesignation(null);
  };

  const openEditModal = (designation) => {
    setSelectedDesignation(designation);
    setFormData({
      name: designation.name,
      code: designation.code,
      description: designation.description || '',
      level: designation.level || 1,
      department: designation.department?._id || '',
      salaryGrade: designation.salaryGrade || { min: '', max: '' },
    });
    setShowModal(true);
  };

  const getLevelLabel = (level) => {
    const levels = {
      1: 'Entry',
      2: 'Junior',
      3: 'Mid',
      4: 'Senior',
      5: 'Lead',
      6: 'Manager',
      7: 'Director',
      8: 'Executive',
    };
    return levels[level] || `Level ${level}`;
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="designations-page">
      <div className="page-header">
        <h1>Designations</h1>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <HiOutlinePlus /> Add Designation
          </button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Designation</th>
              <th>Code</th>
              <th>Level</th>
              <th>Department</th>
              <th>Employees</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {designations.map((desig) => (
              <tr key={desig._id}>
                <td>
                  <div className="desig-cell">
                    <div className="desig-icon">
                      <HiOutlineBriefcase />
                    </div>
                    <div>
                      <div className="desig-name">{desig.name}</div>
                      {desig.description && (
                        <div className="desig-desc">{desig.description}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td><span className="code-badge">{desig.code}</span></td>
                <td>
                  <span className={`level-badge level-${desig.level}`}>
                    {getLevelLabel(desig.level)}
                  </span>
                </td>
                <td>{desig.department?.name || 'All Departments'}</td>
                <td>{desig.employeeCount || 0}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-icon" onClick={() => openEditModal(desig)}>
                      <HiOutlinePencil />
                    </button>
                    <button className="btn-icon danger" onClick={() => handleDelete(desig._id)}>
                      <HiOutlineTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {designations.length === 0 && (
          <div className="empty-state">
            <p>No designations found. Create your first designation.</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={selectedDesignation ? 'Edit Designation' : 'Add New Designation'}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label>Designation Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Designation Code *</label>
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
                <label>Level</label>
                <select name="level" value={formData.level} onChange={handleChange}>
                  <option value={1}>1 - Entry</option>
                  <option value={2}>2 - Junior</option>
                  <option value={3}>3 - Mid</option>
                  <option value={4}>4 - Senior</option>
                  <option value={5}>5 - Lead</option>
                  <option value={6}>6 - Manager</option>
                  <option value={7}>7 - Director</option>
                  <option value={8}>8 - Executive</option>
                </select>
              </div>
              <div className="form-group">
                <label>Department</label>
                <select name="department" value={formData.department} onChange={handleChange}>
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Min Salary</label>
                <input
                  type="number"
                  name="salaryGrade.min"
                  value={formData.salaryGrade.min}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label>Max Salary</label>
                <input
                  type="number"
                  name="salaryGrade.max"
                  value={formData.salaryGrade.max}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {selectedDesignation ? 'Update' : 'Create'} Designation
            </button>
          </div>
        </form>
      </Modal>

      <style>{`
        .desig-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .desig-icon {
          width: 2.25rem;
          height: 2.25rem;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
          font-size: 1.125rem;
        }

        .desig-name {
          font-weight: 500;
          color: #111827;
        }

        .desig-desc {
          font-size: 0.75rem;
          color: #6b7280;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .code-badge {
          background: #f3f4f6;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
          color: #4b5563;
        }

        .level-badge {
          padding: 0.25rem 0.625rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .level-1, .level-2 {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .level-3, .level-4 {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        .level-5, .level-6 {
          background: rgba(99, 102, 241, 0.1);
          color: #6366f1;
        }

        .level-7, .level-8 {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
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
      `}</style>
    </div>
  );
};

export default Designations;
