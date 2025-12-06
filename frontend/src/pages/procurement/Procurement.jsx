import { useState, useEffect } from 'react';
import {
  HiOutlineShoppingCart,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlineDownload,
  HiOutlineEye,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineClock,
  HiOutlineTruck,
  HiOutlineDocumentText,
  HiOutlineUsers,
  HiOutlineCurrencyDollar,
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Procurement.scss';

const Procurement = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const [loading, setLoading] = useState(true);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('order'); // 'order' or 'supplier'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    approvedOrders: 0,
    totalSpend: 0,
  });

  const [formData, setFormData] = useState({
    supplier: '',
    items: [{ description: '', quantity: '', unitPrice: '' }],
    expectedDelivery: '',
    notes: '',
    priority: 'normal',
  });

  useEffect(() => {
    fetchProcurementData();
  }, []);

  const fetchProcurementData = async () => {
    setLoading(true);
    try {
      // Fetch from backend APIs
      const [vendorsRes, posRes, statsRes] = await Promise.all([
        api.get('/bills/vendors'),
        api.get('/bills/purchase-orders'),
        api.get('/procurement/stats/summary'),
      ]);

      const fetchedSuppliers = (vendorsRes.data.data || []).map(v => ({
        id: v._id,
        name: v.name,
        email: v.contactEmail || v.email || '',
        phone: v.contactPhone || v.phone || '',
        category: v.category || 'General',
        rating: v.performance?.rating || 0,
        ordersCount: v.performance?.evaluationCount || 0,
      }));

      const fetchedOrders = (posRes.data.data || []).map(po => ({
        id: po.poNumber || po._id,
        supplier: po.vendor?.name || 'Unknown',
        items: po.items?.length || 0,
        totalAmount: po.totalAmount || 0,
        status: po.status || 'draft',
        priority: po.priority || 'normal',
        createdAt: po.orderDate || po.createdAt,
        expectedDelivery: po.expectedDelivery,
        createdBy: po.createdBy ? `${po.createdBy.firstName} ${po.createdBy.lastName}` : 'System',
      }));

      const statsData = statsRes.data.data || {};
      const poStats = statsData.purchaseOrders || [];

      setSuppliers(fetchedSuppliers);
      setPurchaseOrders(fetchedOrders);

      setStats({
        totalOrders: fetchedOrders.length,
        pendingOrders: poStats.find(s => s._id === 'pending')?.count || fetchedOrders.filter(o => o.status === 'pending').length,
        approvedOrders: poStats.find(s => s._id === 'approved')?.count || fetchedOrders.filter(o => o.status === 'approved').length,
        totalSpend: poStats.reduce((sum, s) => sum + (s.total || 0), 0) || fetchedOrders.filter(o => o.status !== 'rejected').reduce((sum, o) => sum + o.totalAmount, 0),
      });
    } catch (error) {
      // Fallback to mock data
      const mockSuppliers = [
        { id: 1, name: 'ABC Electronics Ltd', email: 'sales@abcelectronics.com', phone: '+234 801 234 5678', category: 'Electronics', rating: 4.5, ordersCount: 25 },
        { id: 2, name: 'Office Mart Nigeria', email: 'info@officemart.ng', phone: '+234 802 345 6789', category: 'Office Supplies', rating: 4.2, ordersCount: 42 },
        { id: 3, name: 'Steel & Sons Industries', email: 'procurement@steelsons.com', phone: '+234 803 456 7890', category: 'Raw Materials', rating: 4.8, ordersCount: 18 },
        { id: 4, name: 'FurniCraft Solutions', email: 'orders@furnicraft.com', phone: '+234 804 567 8901', category: 'Furniture', rating: 4.0, ordersCount: 12 },
      ];

      const mockOrders = [
        { id: 'PO-2024-001', supplier: 'ABC Electronics Ltd', items: 3, totalAmount: 2500000, status: 'approved', priority: 'high', createdAt: '2024-12-01', expectedDelivery: '2024-12-10', createdBy: 'John Doe' },
        { id: 'PO-2024-002', supplier: 'Office Mart Nigeria', items: 8, totalAmount: 450000, status: 'pending', priority: 'normal', createdAt: '2024-12-02', expectedDelivery: '2024-12-08', createdBy: 'Jane Smith' },
        { id: 'PO-2024-003', supplier: 'Steel & Sons Industries', items: 2, totalAmount: 1850000, status: 'delivered', priority: 'high', createdAt: '2024-11-28', expectedDelivery: '2024-12-05', createdBy: 'John Doe' },
        { id: 'PO-2024-004', supplier: 'FurniCraft Solutions', items: 5, totalAmount: 780000, status: 'approved', priority: 'normal', createdAt: '2024-12-03', expectedDelivery: '2024-12-15', createdBy: 'Jane Smith' },
        { id: 'PO-2024-005', supplier: 'ABC Electronics Ltd', items: 1, totalAmount: 350000, status: 'rejected', priority: 'low', createdAt: '2024-12-01', expectedDelivery: '2024-12-12', createdBy: 'Mike Johnson' },
        { id: 'PO-2024-006', supplier: 'Office Mart Nigeria', items: 12, totalAmount: 125000, status: 'pending', priority: 'high', createdAt: '2024-12-04', expectedDelivery: '2024-12-09', createdBy: 'Sarah Wilson' },
      ];

      setSuppliers(mockSuppliers);
      setPurchaseOrders(mockOrders);

      setStats({
        totalOrders: mockOrders.length,
        pendingOrders: mockOrders.filter(o => o.status === 'pending').length,
        approvedOrders: mockOrders.filter(o => o.status === 'approved').length,
        totalSpend: mockOrders.filter(o => o.status !== 'rejected').reduce((sum, o) => sum + o.totalAmount, 0),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const poItems = formData.items.map(item => ({
        description: item.description,
        quantity: parseInt(item.quantity) || 1,
        unitPrice: parseFloat(item.unitPrice) || 0,
        amount: (parseInt(item.quantity) || 1) * (parseFloat(item.unitPrice) || 0),
      }));

      const totalAmount = poItems.reduce((sum, item) => sum + item.amount, 0);

      await api.post('/bills/purchase-orders', {
        vendor: formData.supplier,
        items: poItems,
        subtotal: totalAmount,
        totalAmount: totalAmount,
        expectedDelivery: formData.expectedDelivery,
        priority: formData.priority,
        notes: formData.notes,
        status: 'draft',
      });

      toast.success('Purchase order created successfully');
      setShowModal(false);
      resetForm();
      fetchProcurementData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create purchase order');
    }
  };

  const resetForm = () => {
    setFormData({
      supplier: '',
      items: [{ description: '', quantity: '', unitPrice: '' }],
      expectedDelivery: '',
      notes: '',
      priority: 'normal',
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: '', unitPrice: '' }],
    });
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-warning">Pending</span>;
      case 'approved':
        return <span className="badge badge-success">Approved</span>;
      case 'rejected':
        return <span className="badge badge-danger">Rejected</span>;
      case 'delivered':
        return <span className="badge badge-info">Delivered</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return <span className="priority-badge high">High</span>;
      case 'normal':
        return <span className="priority-badge normal">Normal</span>;
      case 'low':
        return <span className="priority-badge low">Low</span>;
      default:
        return <span className="priority-badge">{priority}</span>;
    }
  };

  const filteredOrders = purchaseOrders.filter((order) => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const tabs = [
    { id: 'orders', label: 'Purchase Orders', icon: HiOutlineShoppingCart },
    { id: 'suppliers', label: 'Suppliers', icon: HiOutlineUsers },
    { id: 'requisitions', label: 'Requisitions', icon: HiOutlineDocumentText },
    { id: 'reports', label: 'Reports', icon: HiOutlineCurrencyDollar },
  ];

  if (loading) {
    return <div className="loading-state">Loading procurement data...</div>;
  }

  return (
    <div className="procurement-page">
      <div className="page-header">
        <div>
          <h1>Procurement</h1>
          <p>Manage purchase orders, suppliers, and requisitions</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={() => { setModalType('supplier'); setShowModal(true); }}>
            <HiOutlinePlus /> Add Supplier
          </button>
          <button className="btn btn-primary" onClick={() => { resetForm(); setModalType('order'); setShowModal(true); }}>
            <HiOutlinePlus /> Create PO
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <HiOutlineShoppingCart />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Orders</span>
            <span className="stat-value">{stats.totalOrders}</span>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <HiOutlineClock />
          </div>
          <div className="stat-content">
            <span className="stat-label">Pending Approval</span>
            <span className="stat-value">{stats.pendingOrders}</span>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <HiOutlineCheck />
          </div>
          <div className="stat-content">
            <span className="stat-label">Approved Orders</span>
            <span className="stat-value">{stats.approvedOrders}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon primary">
            <HiOutlineCurrencyDollar />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Spend</span>
            <span className="stat-value">{formatCurrency(stats.totalSpend)}</span>
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
            <tab.icon />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Purchase Orders Tab */}
      {activeTab === 'orders' && (
        <div className="card">
          <div className="card-header">
            <h3>Purchase Orders</h3>
            <div className="header-actions">
              <div className="search-box">
                <HiOutlineSearch />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="filter-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="delivered">Delivered</option>
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
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Expected Delivery</th>
                  <th>Created By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td><strong>{order.id}</strong></td>
                    <td>{order.supplier}</td>
                    <td>{order.items} items</td>
                    <td>{formatCurrency(order.totalAmount)}</td>
                    <td>{getPriorityBadge(order.priority)}</td>
                    <td>{getStatusBadge(order.status)}</td>
                    <td>{new Date(order.expectedDelivery).toLocaleDateString()}</td>
                    <td>{order.createdBy}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn btn-ghost btn-sm">
                          <HiOutlineEye />
                        </button>
                        {order.status === 'pending' && (
                          <>
                            <button className="btn btn-ghost btn-sm text-success">
                              <HiOutlineCheck />
                            </button>
                            <button className="btn btn-ghost btn-sm text-danger">
                              <HiOutlineX />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Suppliers Tab */}
      {activeTab === 'suppliers' && (
        <div className="card">
          <div className="card-header">
            <h3>Supplier Directory</h3>
            <div className="header-actions">
              <div className="search-box">
                <HiOutlineSearch />
                <input
                  type="text"
                  placeholder="Search suppliers..."
                />
              </div>
            </div>
          </div>
          <div className="suppliers-grid">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="supplier-card">
                <div className="supplier-header">
                  <div className="supplier-avatar">
                    {supplier.name.charAt(0)}
                  </div>
                  <div className="supplier-info">
                    <h4>{supplier.name}</h4>
                    <span className="supplier-category">{supplier.category}</span>
                  </div>
                </div>
                <div className="supplier-details">
                  <p><strong>Email:</strong> {supplier.email}</p>
                  <p><strong>Phone:</strong> {supplier.phone}</p>
                  <p><strong>Orders:</strong> {supplier.ordersCount}</p>
                </div>
                <div className="supplier-rating">
                  <span className="stars">{'★'.repeat(Math.floor(supplier.rating))}{'☆'.repeat(5 - Math.floor(supplier.rating))}</span>
                  <span className="rating-value">{supplier.rating}</span>
                </div>
                <div className="supplier-actions">
                  <button className="btn btn-outline btn-sm">View Details</button>
                  <button className="btn btn-primary btn-sm">Create Order</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requisitions Tab */}
      {activeTab === 'requisitions' && (
        <div className="card">
          <div className="card-header">
            <h3>Purchase Requisitions</h3>
            <button className="btn btn-primary btn-sm">
              <HiOutlinePlus /> New Requisition
            </button>
          </div>
          <div className="empty-state">
            <HiOutlineDocumentText />
            <h3>No requisitions yet</h3>
            <p>Create a purchase requisition to request items from the procurement team</p>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="reports-grid">
          <div className="card report-card">
            <HiOutlineCurrencyDollar className="report-icon" />
            <h4>Spend Analysis</h4>
            <p>Breakdown of procurement spending</p>
            <button className="btn btn-outline btn-sm">Generate</button>
          </div>
          <div className="card report-card">
            <HiOutlineUsers className="report-icon" />
            <h4>Supplier Performance</h4>
            <p>Ratings and delivery metrics</p>
            <button className="btn btn-outline btn-sm">Generate</button>
          </div>
          <div className="card report-card">
            <HiOutlineShoppingCart className="report-icon" />
            <h4>Order History</h4>
            <p>All purchase orders by date</p>
            <button className="btn btn-outline btn-sm">Generate</button>
          </div>
          <div className="card report-card">
            <HiOutlineTruck className="report-icon" />
            <h4>Delivery Report</h4>
            <p>On-time delivery tracking</p>
            <button className="btn btn-outline btn-sm">Generate</button>
          </div>
        </div>
      )}

      {/* Create Purchase Order Modal */}
      {showModal && modalType === 'order' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Purchase Order</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <HiOutlineX />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Supplier</label>
                    <select
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      required
                    >
                      <option value="">Select supplier</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Expected Delivery Date</label>
                  <input
                    type="date"
                    value={formData.expectedDelivery}
                    onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Order Items</label>
                  <div className="items-list">
                    {formData.items.map((item, index) => (
                      <div key={index} className="item-row">
                        <input
                          type="text"
                          placeholder="Item description"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          required
                        />
                        <input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          required
                        />
                        <input
                          type="number"
                          placeholder="Unit price"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                          required
                        />
                        {formData.items.length > 1 && (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeItem(index)}>
                            <HiOutlineX />
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" className="btn btn-outline btn-sm" onClick={addItem}>
                      <HiOutlinePlus /> Add Item
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes or special instructions..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showModal && modalType === 'supplier' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Supplier</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <HiOutlineX />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); toast.success('Supplier added'); setShowModal(false); }}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Company Name</label>
                  <input type="text" placeholder="Enter company name" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" placeholder="Email address" required />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input type="tel" placeholder="Phone number" required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select required>
                    <option value="">Select category</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Raw Materials">Raw Materials</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <textarea placeholder="Supplier address..." rows={2} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Procurement;
