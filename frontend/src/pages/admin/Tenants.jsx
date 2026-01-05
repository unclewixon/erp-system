import { useState, useEffect } from 'react';
import { HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineTrash, HiOutlineEye } from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import './Tenants.scss';

const Tenants = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    industry: '',
    size: '1-10',
    plan: 'starter',
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await api.get('/admin/tenants');
      setTenants(response.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedTenant) {
        await api.put(`/admin/tenants/${selectedTenant._id}`, formData);
        toast.success('Organization updated successfully');
      } else {
        await api.post('/admin/tenants', formData);
        toast.success('Organization created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchTenants();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this organization?')) return;
    try {
      await api.delete(`/admin/tenants/${id}`);
      toast.success('Organization deleted successfully');
      fetchTenants();
    } catch (error) {
      toast.error('Failed to delete organization');
    }
  };

  const handleEdit = (tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone || '',
      industry: tenant.industry || '',
      size: tenant.size || '1-10',
      plan: tenant.subscription?.plan || 'starter',
    });
    setShowModal(true);
  };

  const handleView = (tenant) => {
    setSelectedTenant(tenant);
    setShowViewModal(true);
  };

  const resetForm = () => {
    setSelectedTenant(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      industry: '',
      size: '1-10',
      plan: 'starter',
    });
  };

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = !filterPlan || tenant.subscription?.plan === filterPlan;
    const matchesStatus = !filterStatus ||
      (filterStatus === 'active' ? tenant.isActive : !tenant.isActive);
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const getPlanBadgeClass = (plan) => {
    switch (plan) {
      case 'enterprise': return 'badge-primary';
      case 'professional': return 'badge-info';
      default: return 'badge-secondary';
    }
  };

  if (loading) {
    return <div className="loading-state">Loading organizations...</div>;
  }

  return (
    <div className="tenants-page">
      <div className="page-header">
        <div>
          <h1>Organizations</h1>
          <p>Manage all tenant organizations on the platform</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <HiOutlinePlus /> Add Organization
        </button>
      </div>

      <div className="card">
        <div className="filters-bar">
          <div className="search-box">
            <HiOutlineSearch />
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filters">
            <select value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)}>
              <option value="">All Plans</option>
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Organization</th>
                <th>Industry</th>
                <th>Plan</th>
                <th>Employees</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-state">No organizations found</td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <tr key={tenant._id}>
                    <td>
                      <div className="org-cell">
                        <div className="org-avatar">{tenant.name.charAt(0)}</div>
                        <div>
                          <div className="org-name">{tenant.name}</div>
                          <div className="org-email">{tenant.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{tenant.industry || '-'}</td>
                    <td>
                      <span className={`badge ${getPlanBadgeClass(tenant.subscription?.plan)}`}>
                        {tenant.subscription?.plan || 'starter'}
                      </span>
                    </td>
                    <td>{tenant.employeeCount || 0}</td>
                    <td>
                      <span className={`badge ${tenant.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {tenant.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{new Date(tenant.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon" onClick={() => handleView(tenant)} title="View">
                          <HiOutlineEye />
                        </button>
                        <button className="btn-icon" onClick={() => handleEdit(tenant)} title="Edit">
                          <HiOutlinePencil />
                        </button>
                        <button className="btn-icon btn-danger" onClick={() => handleDelete(tenant._id)} title="Delete">
                          <HiOutlineTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={selectedTenant ? 'Edit Organization' : 'Add Organization'}
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Organization Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Industry</label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Company Size</label>
                <select
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                >
                  <option value="1-10">1-10</option>
                  <option value="11-50">11-50</option>
                  <option value="51-200">51-200</option>
                  <option value="201-500">201-500</option>
                  <option value="501-1000">501-1000</option>
                  <option value="1000+">1000+</option>
                </select>
              </div>
              <div className="form-group">
                <label>Subscription Plan</label>
                <select
                  value={formData.plan}
                  onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                >
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {selectedTenant ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Organization Details"
        size="lg"
      >
        <div className="modal-body">
          {selectedTenant && (
            <div className="tenant-details">
              {/* Header with Avatar */}
              <div className="detail-header">
                <div className="org-avatar">{selectedTenant.name.charAt(0)}</div>
                <div className="header-info">
                  <h2>{selectedTenant.name}</h2>
                  <p>{selectedTenant.email}</p>
                </div>
              </div>

              {/* Organization Info Section */}
              <div className="detail-section">
                <h4>Organization Information</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Phone</label>
                    <span>{selectedTenant.phone || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Industry</label>
                    <span>{selectedTenant.industry || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Company Size</label>
                    <span>{selectedTenant.size || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Status</label>
                    <span className={`badge ${selectedTenant.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {selectedTenant.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Subscription Section */}
              <div className="detail-section subscription-info">
                <h4>Subscription Details</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Plan</label>
                    <span className={`badge ${getPlanBadgeClass(selectedTenant.subscription?.plan)}`}>
                      {selectedTenant.subscription?.plan || 'starter'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Created</label>
                    <span>{new Date(selectedTenant.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-item">
                    <label>Max Employees</label>
                    <span>{selectedTenant.subscription?.maxEmployees === -1 ? 'Unlimited' : selectedTenant.subscription?.maxEmployees || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Max Branches</label>
                    <span>{selectedTenant.subscription?.maxBranches === -1 ? 'Unlimited' : selectedTenant.subscription?.maxBranches || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Modules Section */}
              {selectedTenant.subscription?.modules?.length > 0 && (
                <div className="detail-section">
                  <h4>Enabled Modules</h4>
                  <div className="modules-section">
                    <div className="modules-list">
                      {selectedTenant.subscription?.modules?.map((module) => (
                        <span key={module} className="badge badge-info">{module}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Tenants;
