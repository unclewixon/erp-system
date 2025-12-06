import { useState, useEffect } from 'react';
import { departmentAPI, branchAPI, employeeAPI } from '../../services/api';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineUserGroup,
} from 'react-icons/hi';

const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

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

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="departments-page">
      <div className="page-header">
        <h1>Departments</h1>
        <div className="actions">
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

export default Departments;
