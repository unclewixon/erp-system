import { useState, useEffect } from 'react';
import { employeeAPI, departmentAPI, branchAPI, designationAPI } from '../../services/api';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlinePencil,
  HiOutlineEye,
  HiOutlineFilter,
} from 'react-icons/hi';
import './Employees.scss';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    department: '',
    branch: '',
    status: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    branch: '',
    designation: '',
    hireDate: '',
    employmentType: 'full_time',
  });

  useEffect(() => {
    fetchData();
  }, [pagination.page, filters]);

  const fetchData = async () => {
    try {
      const [empRes, deptRes, branchRes, desigRes] = await Promise.all([
        employeeAPI.getAll({
          page: pagination.page,
          limit: pagination.limit,
          search,
          ...filters
        }),
        departmentAPI.getAll(),
        branchAPI.getAll(),
        designationAPI.getAll(),
      ]);

      setEmployees(empRes.data.data);
      setPagination(empRes.data.pagination);
      setDepartments(deptRes.data.data);
      setBranches(branchRes.data.data);
      setDesignations(desigRes.data.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchData();
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedEmployee) {
        await employeeAPI.update(selectedEmployee._id, formData);
        toast.success('Employee updated successfully');
      } else {
        const res = await employeeAPI.create(formData);
        toast.success('Employee created successfully');
        if (res.data.tempPassword) {
          toast.success(`Temporary password: ${res.data.tempPassword}`, { duration: 10000 });
        }
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: '',
      branch: '',
      designation: '',
      hireDate: '',
      employmentType: 'full_time',
    });
    setSelectedEmployee(null);
  };

  const openEditModal = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone || '',
      department: employee.department?._id || '',
      branch: employee.branch?._id || '',
      designation: employee.designation?._id || '',
      hireDate: employee.hireDate?.split('T')[0] || '',
      employmentType: employee.employmentType || 'full_time',
    });
    setShowModal(true);
  };

  const openViewModal = async (employeeId) => {
    try {
      const res = await employeeAPI.getById(employeeId);
      setSelectedEmployee(res.data.data);
      setShowViewModal(true);
    } catch (error) {
      toast.error('Failed to fetch employee details');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: 'badge-success',
      on_leave: 'badge-warning',
      suspended: 'badge-danger',
      terminated: 'badge-gray',
      probation: 'badge-info',
    };
    return badges[status] || 'badge-gray';
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="employees-page">
      <div className="page-header">
        <h1>Employees</h1>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <HiOutlinePlus /> Add Employee
          </button>
        </div>
      </div>

      <div className="card">
        <div className="filters-bar">
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input">
              <HiOutlineSearch />
              <input
                type="text"
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary">Search</button>
          </form>

          <div className="filters">
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </select>

            <select
              value={filters.branch}
              onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
            >
              <option value="">All Branches</option>
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id}>{branch.name}</option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="probation">Probation</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp._id}>
                  <td>
                    <div className="employee-cell">
                      <div className="avatar">
                        {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                      </div>
                      <div>
                        <div className="name">{emp.firstName} {emp.lastName}</div>
                        <div className="email">{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{emp.department?.name}</td>
                  <td>{emp.designation?.name}</td>
                  <td>{emp.branch?.name}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(emp.status)}`}>
                      {emp.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" onClick={() => openViewModal(emp._id)}>
                        <HiOutlineEye />
                      </button>
                      <button className="btn-icon" onClick={() => openEditModal(emp)}>
                        <HiOutlinePencil />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="pagination">
            <button
              className="btn btn-outline btn-sm"
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
            </button>
            <span>Page {pagination.page} of {pagination.pages}</span>
            <button
              className="btn btn-outline btn-sm"
              disabled={pagination.page === pagination.pages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={selectedEmployee ? 'Edit Employee' : 'Add New Employee'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={!!selectedEmployee}
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Department *</label>
                <select name="department" value={formData.department} onChange={handleChange} required>
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Branch *</label>
                <select name="branch" value={formData.branch} onChange={handleChange} required>
                  <option value="">Select Branch</option>
                  {branches.map((branch) => (
                    <option key={branch._id} value={branch._id}>{branch.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Designation *</label>
                <select name="designation" value={formData.designation} onChange={handleChange} required>
                  <option value="">Select Designation</option>
                  {designations.map((desig) => (
                    <option key={desig._id} value={desig._id}>{desig.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Employment Type</label>
                <select name="employmentType" value={formData.employmentType} onChange={handleChange}>
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="intern">Intern</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Hire Date *</label>
              <input
                type="date"
                name="hireDate"
                value={formData.hireDate}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {selectedEmployee ? 'Update' : 'Create'} Employee
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => { setShowViewModal(false); setSelectedEmployee(null); }}
        title="Employee Details"
        size="lg"
      >
        {selectedEmployee && (
          <div className="modal-body employee-details">
            <div className="detail-header">
              <div className="avatar-large">
                {selectedEmployee.firstName?.charAt(0)}{selectedEmployee.lastName?.charAt(0)}
              </div>
              <div>
                <h2>{selectedEmployee.fullName}</h2>
                <p>{selectedEmployee.designation?.name} - {selectedEmployee.department?.name}</p>
                <span className={`badge ${getStatusBadge(selectedEmployee.status)}`}>
                  {selectedEmployee.status?.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <label>Employee ID</label>
                <span>{selectedEmployee.employeeId}</span>
              </div>
              <div className="detail-item">
                <label>Email</label>
                <span>{selectedEmployee.email}</span>
              </div>
              <div className="detail-item">
                <label>Phone</label>
                <span>{selectedEmployee.phone || '-'}</span>
              </div>
              <div className="detail-item">
                <label>Branch</label>
                <span>{selectedEmployee.branch?.name}</span>
              </div>
              <div className="detail-item">
                <label>Hire Date</label>
                <span>{new Date(selectedEmployee.hireDate).toLocaleDateString()}</span>
              </div>
              <div className="detail-item">
                <label>Employment Type</label>
                <span>{selectedEmployee.employmentType?.replace('_', ' ')}</span>
              </div>
              <div className="detail-item">
                <label>Reports To</label>
                <span>{selectedEmployee.reportsTo?.fullName || '-'}</span>
              </div>
              <div className="detail-item">
                <label>Years of Service</label>
                <span>{selectedEmployee.yearsOfService} years</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Employees;
