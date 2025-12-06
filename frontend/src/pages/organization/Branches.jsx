import { useState, useEffect } from 'react';
import { branchAPI } from '../../services/api';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineLocationMarker,
} from 'react-icons/hi';

const Branches = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    phone: '',
    email: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
    },
    latitude: '',
    longitude: '',
    isHeadquarters: false,
    geofence: {
      enabled: false,
      radius: 100,
    },
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await branchAPI.getAll();
      setBranches(res.data.data);
    } catch (error) {
      toast.error('Failed to fetch branches');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedBranch) {
        await branchAPI.update(selectedBranch._id, formData);
        toast.success('Branch updated successfully');
      } else {
        await branchAPI.create(formData);
        toast.success('Branch created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchBranches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this branch?')) return;

    try {
      await branchAPI.delete(id);
      toast.success('Branch deleted successfully');
      fetchBranches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete branch');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      phone: '',
      email: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
      },
      latitude: '',
      longitude: '',
      isHeadquarters: false,
      geofence: {
        enabled: false,
        radius: 100,
      },
    });
    setSelectedBranch(null);
  };

  const openEditModal = (branch) => {
    setSelectedBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code,
      phone: branch.phone || '',
      email: branch.email || '',
      address: branch.address || { street: '', city: '', state: '', country: '' },
      latitude: branch.location?.coordinates?.[1] || '',
      longitude: branch.location?.coordinates?.[0] || '',
      isHeadquarters: branch.isHeadquarters || false,
      geofence: branch.geofence || { enabled: false, radius: 100 },
    });
    setShowModal(true);
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="branches-page">
      <div className="page-header">
        <h1>Branches</h1>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <HiOutlinePlus /> Add Branch
          </button>
        </div>
      </div>

      <div className="card">
        <div className="branches-grid">
          {branches.map((branch) => (
            <div key={branch._id} className="branch-card">
              <div className="branch-header">
                <div className="branch-icon">
                  <HiOutlineLocationMarker />
                </div>
                <div className="branch-info">
                  <h3>{branch.name}</h3>
                  <span className="branch-code">{branch.code}</span>
                </div>
                {branch.isHeadquarters && (
                  <span className="badge badge-info">HQ</span>
                )}
              </div>

              <div className="branch-details">
                {branch.address?.city && (
                  <p>{branch.address.city}, {branch.address.state}</p>
                )}
                <p className="employee-count">{branch.employeeCount || 0} employees</p>
                {branch.geofence?.enabled && (
                  <span className="badge badge-success">Geofence Active</span>
                )}
              </div>

              <div className="branch-actions">
                <button className="btn btn-outline btn-sm" onClick={() => openEditModal(branch)}>
                  <HiOutlinePencil /> Edit
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => handleDelete(branch._id)}>
                  <HiOutlineTrash /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {branches.length === 0 && (
          <div className="empty-state">
            <p>No branches found. Create your first branch.</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={selectedBranch ? 'Edit Branch' : 'Add New Branch'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label>Branch Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Branch Code *</label>
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

            <div className="form-row">
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Street Address</label>
              <input
                type="text"
                name="address.street"
                value={formData.address.street}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Latitude</label>
                <input
                  type="number"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  step="any"
                  placeholder="e.g., 6.5244"
                />
              </div>
              <div className="form-group">
                <label>Longitude</label>
                <input
                  type="number"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  step="any"
                  placeholder="e.g., 3.3792"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="isHeadquarters"
                    checked={formData.isHeadquarters}
                    onChange={handleChange}
                  />
                  Headquarters
                </label>
              </div>
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="geofence.enabled"
                    checked={formData.geofence.enabled}
                    onChange={handleChange}
                  />
                  Enable Geofencing
                </label>
              </div>
            </div>

            {formData.geofence.enabled && (
              <div className="form-group">
                <label>Geofence Radius (meters)</label>
                <input
                  type="number"
                  name="geofence.radius"
                  value={formData.geofence.radius}
                  onChange={handleChange}
                  min="10"
                  max="1000"
                />
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {selectedBranch ? 'Update' : 'Create'} Branch
            </button>
          </div>
        </form>
      </Modal>

      <style>{`
        .branches-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }

        .branch-card {
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 1.25rem;
          transition: box-shadow 0.2s;
        }

        .branch-card:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .branch-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .branch-icon {
          width: 2.5rem;
          height: 2.5rem;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.25rem;
        }

        .branch-info {
          flex: 1;
        }

        .branch-info h3 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
        }

        .branch-code {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .branch-details {
          margin-bottom: 1rem;
          font-size: 0.875rem;
          color: #4b5563;
        }

        .employee-count {
          color: #6b7280;
          margin-top: 0.25rem;
        }

        .branch-actions {
          display: flex;
          gap: 0.5rem;
        }

        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .checkbox-group input[type="checkbox"] {
          width: auto;
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

export default Branches;
