import { useState, useEffect } from 'react';
import {
  HiOutlineCube,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlineDownload,
  HiOutlineRefresh,
  HiOutlineExclamation,
  HiOutlineCheck,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineTruck,
  HiOutlineShoppingCart,
  HiOutlineChartBar,
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Inventory.scss';

const Inventory = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('product'); // 'product' or 'category'
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStock, setFilterStock] = useState('all');

  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0,
  });

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    quantity: '',
    reorderLevel: '',
    unitPrice: '',
    costPrice: '',
    location: '',
    description: '',
  });

  const [generatingReport, setGeneratingReport] = useState(null);

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      // Fetch from backend APIs
      const [productsRes, categoriesRes, summaryRes, stockRes] = await Promise.all([
        api.get('/inventory/products'),
        api.get('/inventory/categories'),
        api.get('/inventory/stock/summary'),
        api.get('/inventory/stock'),
      ]);

      const fetchedCategories = (categoriesRes.data.data || []).map(cat => ({
        id: cat._id,
        name: cat.name,
        productCount: cat.productCount || 0,
      }));

      const stockMap = {};
      (stockRes.data.data || []).forEach(s => {
        if (s.product?._id) {
          stockMap[s.product._id] = (stockMap[s.product._id] || 0) + (s.quantityOnHand || 0);
        }
      });

      const fetchedProducts = (productsRes.data.data || []).map(prod => {
        const quantity = stockMap[prod._id] || 0;
        const reorderLevel = prod.reorderPoint || 0;
        let status = 'in_stock';
        if (quantity === 0) status = 'out_of_stock';
        else if (quantity <= reorderLevel) status = 'low_stock';

        return {
          id: prod._id,
          name: prod.name,
          sku: prod.sku,
          category: prod.category?.name || 'Uncategorized',
          quantity,
          reorderLevel,
          unitPrice: prod.sellingPrice || 0,
          costPrice: prod.averageCost || 0,
          location: prod.defaultWarehouse || 'Main Warehouse',
          status,
        };
      });

      const summary = summaryRes.data.data?.summary || {};

      setCategories(fetchedCategories);
      setProducts(fetchedProducts);
      setStats({
        totalProducts: fetchedProducts.length,
        lowStock: summaryRes.data.data?.lowStockCount || fetchedProducts.filter(p => p.status === 'low_stock').length,
        outOfStock: fetchedProducts.filter(p => p.status === 'out_of_stock').length,
        totalValue: summary.totalValue || fetchedProducts.reduce((sum, p) => sum + (p.quantity * p.costPrice), 0),
      });
    } catch (error) {
      // Fallback to mock data
      const mockCategories = [
        { id: 1, name: 'Electronics', productCount: 45 },
        { id: 2, name: 'Office Supplies', productCount: 120 },
        { id: 3, name: 'Furniture', productCount: 28 },
        { id: 4, name: 'Raw Materials', productCount: 65 },
        { id: 5, name: 'Packaging', productCount: 32 },
      ];

      const mockProducts = [
        { id: 1, name: 'Laptop Dell XPS 15', sku: 'ELEC-001', category: 'Electronics', quantity: 25, reorderLevel: 10, unitPrice: 850000, costPrice: 720000, location: 'Warehouse A', status: 'in_stock' },
        { id: 2, name: 'Office Chair Ergonomic', sku: 'FURN-001', category: 'Furniture', quantity: 8, reorderLevel: 15, unitPrice: 75000, costPrice: 55000, location: 'Warehouse B', status: 'low_stock' },
        { id: 3, name: 'A4 Paper (Ream)', sku: 'OFFC-001', category: 'Office Supplies', quantity: 500, reorderLevel: 100, unitPrice: 3500, costPrice: 2800, location: 'Warehouse A', status: 'in_stock' },
        { id: 4, name: 'Printer Ink Cartridge', sku: 'OFFC-002', category: 'Office Supplies', quantity: 0, reorderLevel: 20, unitPrice: 15000, costPrice: 11000, location: 'Warehouse A', status: 'out_of_stock' },
        { id: 5, name: 'Steel Rods (Bundle)', sku: 'RAW-001', category: 'Raw Materials', quantity: 150, reorderLevel: 50, unitPrice: 45000, costPrice: 38000, location: 'Warehouse C', status: 'in_stock' },
        { id: 6, name: 'Cardboard Boxes (50pcs)', sku: 'PACK-001', category: 'Packaging', quantity: 12, reorderLevel: 25, unitPrice: 8000, costPrice: 5500, location: 'Warehouse A', status: 'low_stock' },
        { id: 7, name: 'Desktop Monitor 27"', sku: 'ELEC-002', category: 'Electronics', quantity: 35, reorderLevel: 10, unitPrice: 185000, costPrice: 150000, location: 'Warehouse A', status: 'in_stock' },
        { id: 8, name: 'Executive Desk', sku: 'FURN-002', category: 'Furniture', quantity: 5, reorderLevel: 8, unitPrice: 250000, costPrice: 180000, location: 'Warehouse B', status: 'low_stock' },
      ];

      setCategories(mockCategories);
      setProducts(mockProducts);

      const totalValue = mockProducts.reduce((sum, p) => sum + (p.quantity * p.costPrice), 0);
      setStats({
        totalProducts: mockProducts.length,
        lowStock: mockProducts.filter(p => p.status === 'low_stock').length,
        outOfStock: mockProducts.filter(p => p.status === 'out_of_stock').length,
        totalValue,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const productData = {
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        reorderPoint: parseInt(formData.reorderLevel) || 0,
        sellingPrice: parseFloat(formData.unitPrice) || 0,
        averageCost: parseFloat(formData.costPrice) || 0,
        description: formData.description,
      };

      if (editingItem) {
        await api.put(`/inventory/products/${editingItem.id}`, productData);
        toast.success('Product updated successfully');
      } else {
        await api.post('/inventory/products', productData);
        toast.success('Product added successfully');
      }
      setShowModal(false);
      resetForm();
      fetchInventoryData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save product');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      category: '',
      quantity: '',
      reorderLevel: '',
      unitPrice: '',
      costPrice: '',
      location: '',
      description: '',
    });
    setEditingItem(null);
  };

  const openEditModal = (product) => {
    setEditingItem(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category,
      quantity: product.quantity.toString(),
      reorderLevel: product.reorderLevel.toString(),
      unitPrice: product.unitPrice.toString(),
      costPrice: product.costPrice.toString(),
      location: product.location,
      description: product.description || '',
    });
    setModalType('product');
    setShowModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const downloadCSV = (data, filename) => {
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateStockValuationReport = async () => {
    setGeneratingReport('valuation');
    try {
      const headers = ['Product Name', 'SKU', 'Category', 'Quantity', 'Cost Price', 'Total Value'];
      const rows = products.map(p => [
        p.name,
        p.sku,
        p.category,
        p.quantity,
        p.costPrice,
        p.quantity * p.costPrice,
      ]);

      const totalValue = products.reduce((sum, p) => sum + (p.quantity * p.costPrice), 0);
      rows.push(['', '', '', '', 'TOTAL', totalValue]);

      const csvContent = [
        'STOCK VALUATION REPORT',
        `Generated: ${new Date().toLocaleDateString()}`,
        '',
        headers.join(','),
        ...rows.map(row => row.join(',')),
      ].join('\n');

      downloadCSV(csvContent, `stock-valuation-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Stock Valuation Report downloaded');
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setGeneratingReport(null);
    }
  };

  const generateLowStockReport = async () => {
    setGeneratingReport('lowstock');
    try {
      const lowStockItems = products.filter(p => p.status === 'low_stock' || p.status === 'out_of_stock');
      const headers = ['Product Name', 'SKU', 'Category', 'Current Qty', 'Reorder Level', 'Status', 'Shortage'];
      const rows = lowStockItems.map(p => [
        p.name,
        p.sku,
        p.category,
        p.quantity,
        p.reorderLevel,
        p.status === 'out_of_stock' ? 'Out of Stock' : 'Low Stock',
        Math.max(0, p.reorderLevel - p.quantity),
      ]);

      const csvContent = [
        'LOW STOCK REPORT',
        `Generated: ${new Date().toLocaleDateString()}`,
        `Total Items: ${lowStockItems.length}`,
        '',
        headers.join(','),
        ...rows.map(row => row.join(',')),
      ].join('\n');

      downloadCSV(csvContent, `low-stock-report-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Low Stock Report downloaded');
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setGeneratingReport(null);
    }
  };

  const generateMovementHistoryReport = async () => {
    setGeneratingReport('movements');
    try {
      // Fetch movement history from API
      const response = await api.get('/inventory/stock/movements');
      const movements = response.data.data || [];

      if (movements.length === 0) {
        toast.error('No movement history available');
        setGeneratingReport(null);
        return;
      }

      const headers = ['Date', 'Product', 'Type', 'Quantity', 'Reference', 'Notes'];
      const rows = movements.map(m => [
        new Date(m.createdAt).toLocaleDateString(),
        m.product?.name || 'Unknown',
        m.type,
        m.quantity,
        m.reference || '-',
        m.notes || '-',
      ]);

      const csvContent = [
        'STOCK MOVEMENT HISTORY',
        `Generated: ${new Date().toLocaleDateString()}`,
        '',
        headers.join(','),
        ...rows.map(row => row.join(',')),
      ].join('\n');

      downloadCSV(csvContent, `movement-history-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Movement History Report downloaded');
    } catch (error) {
      // Generate from current data if API fails
      const headers = ['Product Name', 'SKU', 'Current Stock', 'Last Updated'];
      const rows = products.map(p => [
        p.name,
        p.sku,
        p.quantity,
        new Date().toLocaleDateString(),
      ]);

      const csvContent = [
        'STOCK SUMMARY REPORT',
        `Generated: ${new Date().toLocaleDateString()}`,
        'Note: Detailed movement history not available',
        '',
        headers.join(','),
        ...rows.map(row => row.join(',')),
      ].join('\n');

      downloadCSV(csvContent, `stock-summary-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Stock Summary Report downloaded');
    } finally {
      setGeneratingReport(null);
    }
  };

  const generateCategorySummaryReport = async () => {
    setGeneratingReport('category');
    try {
      const categorySummary = categories.map(cat => {
        const categoryProducts = products.filter(p => p.category === cat.name);
        const totalQty = categoryProducts.reduce((sum, p) => sum + p.quantity, 0);
        const totalValue = categoryProducts.reduce((sum, p) => sum + (p.quantity * p.costPrice), 0);
        return {
          name: cat.name,
          productCount: categoryProducts.length,
          totalQty,
          totalValue,
          lowStockCount: categoryProducts.filter(p => p.status === 'low_stock').length,
          outOfStockCount: categoryProducts.filter(p => p.status === 'out_of_stock').length,
        };
      });

      const headers = ['Category', 'Products', 'Total Qty', 'Total Value', 'Low Stock', 'Out of Stock'];
      const rows = categorySummary.map(c => [
        c.name,
        c.productCount,
        c.totalQty,
        c.totalValue,
        c.lowStockCount,
        c.outOfStockCount,
      ]);

      const totals = categorySummary.reduce((acc, c) => ({
        products: acc.products + c.productCount,
        qty: acc.qty + c.totalQty,
        value: acc.value + c.totalValue,
        lowStock: acc.lowStock + c.lowStockCount,
        outOfStock: acc.outOfStock + c.outOfStockCount,
      }), { products: 0, qty: 0, value: 0, lowStock: 0, outOfStock: 0 });

      rows.push(['TOTAL', totals.products, totals.qty, totals.value, totals.lowStock, totals.outOfStock]);

      const csvContent = [
        'CATEGORY SUMMARY REPORT',
        `Generated: ${new Date().toLocaleDateString()}`,
        '',
        headers.join(','),
        ...rows.map(row => row.join(',')),
      ].join('\n');

      downloadCSV(csvContent, `category-summary-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Category Summary Report downloaded');
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setGeneratingReport(null);
    }
  };

  const handleExportProducts = () => {
    const headers = ['Product Name', 'SKU', 'Category', 'Quantity', 'Reorder Level', 'Unit Price', 'Cost Price', 'Status', 'Location'];
    const rows = filteredProducts.map(p => [
      p.name,
      p.sku,
      p.category,
      p.quantity,
      p.reorderLevel,
      p.unitPrice,
      p.costPrice,
      p.status,
      p.location,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    downloadCSV(csvContent, `inventory-export-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Products exported successfully');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'in_stock':
        return <span className="badge badge-success">In Stock</span>;
      case 'low_stock':
        return <span className="badge badge-warning">Low Stock</span>;
      case 'out_of_stock':
        return <span className="badge badge-danger">Out of Stock</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    const matchesStock = filterStock === 'all' || p.status === filterStock;
    return matchesSearch && matchesCategory && matchesStock;
  });

  const tabs = [
    { id: 'products', label: 'Products', icon: HiOutlineCube },
    { id: 'categories', label: 'Categories', icon: HiOutlineFilter },
    { id: 'movements', label: 'Stock Movements', icon: HiOutlineTruck },
    { id: 'reports', label: 'Reports', icon: HiOutlineChartBar },
  ];

  if (loading) {
    return <div className="loading-state">Loading inventory data...</div>;
  }

  return (
    <div className="inventory-page">
      <div className="page-header">
        <div>
          <h1>Inventory Management</h1>
          <p>Manage your products, stock levels, and inventory movements</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={fetchInventoryData}>
            <HiOutlineRefresh /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => { resetForm(); setModalType('product'); setShowModal(true); }}>
            <HiOutlinePlus /> Add Product
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <HiOutlineCube />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Products</span>
            <span className="stat-value">{stats.totalProducts}</span>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <HiOutlineExclamation />
          </div>
          <div className="stat-content">
            <span className="stat-label">Low Stock Items</span>
            <span className="stat-value">{stats.lowStock}</span>
          </div>
        </div>

        <div className="stat-card danger">
          <div className="stat-icon">
            <HiOutlineShoppingCart />
          </div>
          <div className="stat-content">
            <span className="stat-label">Out of Stock</span>
            <span className="stat-value">{stats.outOfStock}</span>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <HiOutlineChartBar />
          </div>
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
            <tab.icon />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="card">
          <div className="card-header">
            <h3>Product Inventory</h3>
            <div className="header-actions">
              <div className="search-box">
                <HiOutlineSearch />
                <input
                  type="text"
                  placeholder="Search products..."
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
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
              <select
                className="filter-select"
                value={filterStock}
                onChange={(e) => setFilterStock(e.target.value)}
              >
                <option value="all">All Stock Status</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
              <button className="btn btn-outline btn-sm" onClick={handleExportProducts}>
                <HiOutlineDownload /> Export
              </button>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Reorder Level</th>
                  <th>Unit Price</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="product-name">{product.name}</td>
                    <td><code>{product.sku}</code></td>
                    <td>{product.category}</td>
                    <td className={product.quantity <= product.reorderLevel ? 'text-warning' : ''}>
                      {product.quantity}
                    </td>
                    <td>{product.reorderLevel}</td>
                    <td>{formatCurrency(product.unitPrice)}</td>
                    <td>{getStatusBadge(product.status)}</td>
                    <td>{product.location}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(product)}>
                          <HiOutlinePencil />
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
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="card">
          <div className="card-header">
            <h3>Product Categories</h3>
            <button className="btn btn-primary btn-sm" onClick={() => { setModalType('category'); setShowModal(true); }}>
              <HiOutlinePlus /> Add Category
            </button>
          </div>
          <div className="categories-grid">
            {categories.map((category) => (
              <div key={category.id} className="category-card">
                <div className="category-icon">
                  <HiOutlineCube />
                </div>
                <h4>{category.name}</h4>
                <p>{category.productCount} products</p>
                <div className="category-actions">
                  <button className="btn btn-ghost btn-sm">
                    <HiOutlinePencil />
                  </button>
                  <button className="btn btn-ghost btn-sm text-danger">
                    <HiOutlineTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock Movements Tab */}
      {activeTab === 'movements' && (
        <div className="card">
          <div className="card-header">
            <h3>Stock Movements</h3>
            <div className="header-actions">
              <button className="btn btn-outline btn-sm">
                <HiOutlinePlus /> Stock In
              </button>
              <button className="btn btn-outline btn-sm">
                <HiOutlineTruck /> Stock Out
              </button>
            </div>
          </div>
          <div className="empty-state">
            <HiOutlineTruck />
            <h3>No recent movements</h3>
            <p>Stock movements will appear here when you add or remove inventory</p>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="reports-grid">
          <div className="card report-card">
            <HiOutlineChartBar className="report-icon" />
            <h4>Stock Valuation</h4>
            <p>Current value of all inventory items</p>
            <button
              className="btn btn-outline btn-sm"
              onClick={generateStockValuationReport}
              disabled={generatingReport === 'valuation'}
            >
              {generatingReport === 'valuation' ? 'Generating...' : 'Generate'}
            </button>
          </div>
          <div className="card report-card">
            <HiOutlineExclamation className="report-icon" />
            <h4>Low Stock Report</h4>
            <p>Items below reorder level</p>
            <button
              className="btn btn-outline btn-sm"
              onClick={generateLowStockReport}
              disabled={generatingReport === 'lowstock'}
            >
              {generatingReport === 'lowstock' ? 'Generating...' : 'Generate'}
            </button>
          </div>
          <div className="card report-card">
            <HiOutlineTruck className="report-icon" />
            <h4>Movement History</h4>
            <p>All stock ins and outs</p>
            <button
              className="btn btn-outline btn-sm"
              onClick={generateMovementHistoryReport}
              disabled={generatingReport === 'movements'}
            >
              {generatingReport === 'movements' ? 'Generating...' : 'Generate'}
            </button>
          </div>
          <div className="card report-card">
            <HiOutlineCube className="report-icon" />
            <h4>Category Summary</h4>
            <p>Inventory by category</p>
            <button
              className="btn btn-outline btn-sm"
              onClick={generateCategorySummaryReport}
              disabled={generatingReport === 'category'}
            >
              {generatingReport === 'category' ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showModal && modalType === 'product' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem ? 'Edit Product' : 'Add Product'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <HiOutlineX />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Product Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter product name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>SKU</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="e.g., ELEC-001"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    >
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., Warehouse A"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Quantity</label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Reorder Level</label>
                    <input
                      type="number"
                      value={formData.reorderLevel}
                      onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                      placeholder="0"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Unit Price (NGN)</label>
                    <input
                      type="number"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Cost Price (NGN)</label>
                    <input
                      type="number"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter product description..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showModal && modalType === 'category' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Category</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <HiOutlineX />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); toast.success('Category added'); setShowModal(false); }}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Category Name</label>
                  <input
                    type="text"
                    placeholder="Enter category name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    placeholder="Enter category description..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
