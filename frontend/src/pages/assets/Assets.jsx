import { useState, useEffect } from 'react';
import {
  HiOutlineDesktopComputer,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineClipboardCheck,
  HiOutlineExclamation,
  HiOutlineRefresh,
  HiOutlineDownload,
  HiOutlineQrcode,
  HiOutlineLocationMarker,
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Assets.scss';

const Assets = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [stats, setStats] = useState({
    totalAssets: 0,
    assignedAssets: 0,
    maintenanceDue: 0,
    totalValue: 0,
  });

  const [formData, setFormData] = useState({
    name: '',
    assetTag: '',
    category: '',
    serialNumber: '',
    purchaseDate: '',
    purchasePrice: '',
    location: '',
    assignedTo: '',
    status: 'available',
    warrantyExpiry: '',
    notes: '',
  });

  const categories = ['Computers', 'Furniture', 'Vehicles', 'Equipment', 'Software', 'Electronics', 'Other'];

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const response = await api.get('/assets');
      setAssets(response.data.data || []);

      const data = response.data.data || [];
      setStats({
        totalAssets: data.length,
        assignedAssets: data.filter(a => a.status === 'assigned').length,
        maintenanceDue: data.filter(a => a.status === 'maintenance').length,
        totalValue: data.reduce((sum, a) => sum + (a.purchasePrice || 0), 0),
      });
    } catch (error) {
      console.error('Failed to load assets:', error);
      // Fallback mock data
      const mockAssets = [
        { _id: '1', name: 'MacBook Pro 16"', assetTag: 'AST-001', category: 'Computers', serialNumber: 'SN12345', status: 'assigned', assignedTo: { firstName: 'John', lastName: 'Doe' }, purchasePrice: 850000, location: 'Head Office' },
        { _id: '2', name: 'Dell Monitor 27"', assetTag: 'AST-002', category: 'Electronics', serialNumber: 'SN12346', status: 'available', purchasePrice: 185000, location: 'IT Store' },
        { _id: '3', name: 'Executive Chair', assetTag: 'AST-003', category: 'Furniture', serialNumber: 'SN12347', status: 'assigned', assignedTo: { firstName: 'Jane', lastName: 'Smith' }, purchasePrice: 75000, location: 'Head Office' },
        { _id: '4', name: 'HP LaserJet Printer', assetTag: 'AST-004', category: 'Equipment', serialNumber: 'SN12348', status: 'maintenance', purchasePrice: 250000, location: 'IT Store' },
        { _id: '5', name: 'Toyota Camry', assetTag: 'AST-005', category: 'Vehicles', serialNumber: 'VIN12349', status: 'assigned', assignedTo: { firstName: 'Mike', lastName: 'Johnson' }, purchasePrice: 15000000, location: 'Parking' },
      ];
      setAssets(mockAssets);
      setStats({
        totalAssets: 5,
        assignedAssets: 3,
        maintenanceDue: 1,
        totalValue: mockAssets.reduce((sum, a) => sum + a.purchasePrice, 0),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAsset) {
        await api.put(`/assets/${editingAsset._id}`, formData);
        toast.success('Asset updated successfully');
      } else {
        await api.post('/assets', formData);
        toast.success('Asset created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchAssets();
    } catch (error) {
      toast.error('Failed to save asset');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      assetTag: '',
      category: '',
      serialNumber: '',
      purchaseDate: '',
      purchasePrice: '',
      location: '',
      assignedTo: '',
      status: 'available',
      warrantyExpiry: '',
      notes: '',
    });
    setEditingAsset(null);
  };

  const openEditModal = (asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      assetTag: asset.assetTag,
      category: asset.category,
      serialNumber: asset.serialNumber || '',
      purchaseDate: asset.purchaseDate?.split('T')[0] || '',
      purchasePrice: asset.purchasePrice?.toString() || '',
      location: asset.location || '',
      assignedTo: asset.assignedTo?._id || '',
      status: asset.status,
      warrantyExpiry: asset.warrantyExpiry?.split('T')[0] || '',
      notes: asset.notes || '',
    });
    setShowModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const styles = {
      available: 'success',
      assigned: 'primary',
      maintenance: 'warning',
      retired: 'secondary',
    };
    return <span className={`badge badge-${styles[status] || 'primary'}`}>{status}</span>;
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.assetTag.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || asset.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || asset.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const tabs = [
    { id: 'all', label: 'All Assets', count: assets.length },
    { id: 'assigned', label: 'Assigned', count: assets.filter(a => a.status === 'assigned').length },
    { id: 'available', label: 'Available', count: assets.filter(a => a.status === 'available').length },
    { id: 'maintenance', label: 'Maintenance', count: assets.filter(a => a.status === 'maintenance').length },
  ];

  if (loading) {
    return <div className="loading-state">Loading assets...</div>;
  }

  return (
    <div className="assets-page">
      <div className="page-header">
        <div>
          <h1>Asset Management</h1>
          <p>Track and manage company assets</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={fetchAssets}>
            <HiOutlineRefresh /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <HiOutlinePlus /> Add Asset
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><HiOutlineDesktopComputer /></div>
          <div className="stat-content">
            <span className="stat-label">Total Assets</span>
            <span className="stat-value">{stats.totalAssets}</span>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon"><HiOutlineClipboardCheck /></div>
          <div className="stat-content">
            <span className="stat-label">Assigned</span>
            <span className="stat-value">{stats.assignedAssets}</span>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon"><HiOutlineExclamation /></div>
          <div className="stat-content">
            <span className="stat-label">Maintenance Due</span>
            <span className="stat-value">{stats.maintenanceDue}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon primary"><HiOutlineLocationMarker /></div>
          <div className="stat-content">
            <span className="stat-label">Total Value</span>
            <span className="stat-value">{formatCurrency(stats.totalValue)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label} <span className="tab-count">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Assets Table */}
      <div className="card">
        <div className="card-header">
          <h3>Assets</h3>
          <div className="header-actions">
            <div className="search-box">
              <HiOutlineSearch />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="filter-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <button className="btn btn-outline btn-sm">
              <HiOutlineDownload /> Export
            </button>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Tag</th>
                <th>Category</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Location</th>
                <th>Value</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets
                .filter(a => activeTab === 'all' || a.status === activeTab)
                .map((asset) => (
                <tr key={asset._id}>
                  <td>
                    <div className="asset-info">
                      <strong>{asset.name}</strong>
                      <span className="serial">{asset.serialNumber}</span>
                    </div>
                  </td>
                  <td><code>{asset.assetTag}</code></td>
                  <td>{asset.category}</td>
                  <td>{getStatusBadge(asset.status)}</td>
                  <td>{asset.assignedTo ? `${asset.assignedTo.firstName} ${asset.assignedTo.lastName}` : '-'}</td>
                  <td>{asset.location}</td>
                  <td>{formatCurrency(asset.purchasePrice)}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(asset)}>
                        <HiOutlinePencil />
                      </button>
                      <button className="btn btn-ghost btn-sm">
                        <HiOutlineQrcode />
                      </button>
                      <button className="btn btn-ghost btn-sm text-danger">
                        <HiOutlineTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingAsset ? 'Edit Asset' : 'Add Asset'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}><HiOutlineX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Asset Name</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Asset Tag</label>
                    <input type="text" value={formData.assetTag} onChange={(e) => setFormData({ ...formData, assetTag: e.target.value })} placeholder="AST-XXX" required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required>
                      <option value="">Select category</option>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Serial Number</label>
                    <input type="text" value={formData.serialNumber} onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Purchase Date</label>
                    <input type="date" value={formData.purchaseDate} onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Purchase Price (NGN)</label>
                    <input type="number" value={formData.purchasePrice} onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Location</label>
                    <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                      <option value="available">Available</option>
                      <option value="assigned">Assigned</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="retired">Retired</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Warranty Expiry</label>
                  <input type="date" value={formData.warrantyExpiry} onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingAsset ? 'Update' : 'Add'} Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assets;
