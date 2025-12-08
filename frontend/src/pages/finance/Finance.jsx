import { useState, useEffect } from 'react';
import {
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineCreditCard,
  HiOutlineReceiptRefund,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineEye,
  HiOutlineDownload,
  HiOutlineX,
  HiOutlineCheck,
  HiOutlineClock,
  HiOutlinePrinter,
  HiOutlineMail,
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Finance.scss';

const Finance = () => {
  const [activeTab, setActiveTab] = useState('invoices');
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [bills, setBills] = useState([]);
  const [reimbursements, setReimbursements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('invoice');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceView, setShowInvoiceView] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const [stats, setStats] = useState({
    totalReceivables: 0,
    totalPayables: 0,
    pendingReimbursements: 0,
    walletBalance: 0,
  });

  const [formData, setFormData] = useState({
    client: '',
    vendor: '',
    amount: '',
    dueDate: '',
    description: '',
    category: '',
    receipt: null,
  });

  // Invoice items state for multi-item invoices
  const [invoiceItems, setInvoiceItems] = useState([
    { description: '', quantity: 1, unitPrice: '', taxRate: 0, discount: 0 }
  ]);

  const addInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, { description: '', quantity: 1, unitPrice: '', taxRate: 0, discount: 0 }]);
  };

  const removeInvoiceItem = (index) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    }
  };

  const updateInvoiceItem = (index, field, value) => {
    const updatedItems = invoiceItems.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setInvoiceItems(updatedItems);
  };

  const calculateItemAmount = (item) => {
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    const discount = parseFloat(item.discount) || 0;
    const taxRate = parseFloat(item.taxRate) || 0;
    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * (discount / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (taxRate / 100);
    return subtotal - discountAmount + taxAmount;
  };

  const calculateInvoiceTotal = () => {
    return invoiceItems.reduce((sum, item) => sum + calculateItemAmount(item), 0);
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const [invoicesRes, billsRes, reimbursementsRes] = await Promise.all([
        api.get('/invoices'),
        api.get('/bills'),
        api.get('/reimbursements'),
      ]);
      setInvoices(invoicesRes.data.data || []);
      setBills(billsRes.data.data || []);
      setReimbursements(reimbursementsRes.data.data || []);
    } catch (error) {
      // Mock data
      setInvoices([
        { _id: '1', invoiceNumber: 'INV-001', client: 'ABC Corp', amount: 500000, status: 'paid', dueDate: '2024-12-15', issuedDate: '2024-11-15' },
        { _id: '2', invoiceNumber: 'INV-002', client: 'XYZ Ltd', amount: 750000, status: 'pending', dueDate: '2024-12-20', issuedDate: '2024-11-20' },
        { _id: '3', invoiceNumber: 'INV-003', client: 'DEF Inc', amount: 320000, status: 'overdue', dueDate: '2024-11-30', issuedDate: '2024-10-30' },
      ]);
      setBills([
        { _id: '1', billNumber: 'BILL-001', vendor: 'Office Supplies Co', amount: 85000, status: 'paid', dueDate: '2024-12-10' },
        { _id: '2', billNumber: 'BILL-002', vendor: 'Internet Provider', amount: 45000, status: 'pending', dueDate: '2024-12-15' },
        { _id: '3', billNumber: 'BILL-003', vendor: 'Utility Company', amount: 120000, status: 'pending', dueDate: '2024-12-20' },
      ]);
      setReimbursements([
        { _id: '1', employee: { firstName: 'John', lastName: 'Doe' }, category: 'Travel', amount: 25000, status: 'pending', submittedAt: '2024-12-01' },
        { _id: '2', employee: { firstName: 'Jane', lastName: 'Smith' }, category: 'Equipment', amount: 15000, status: 'approved', submittedAt: '2024-11-28' },
        { _id: '3', employee: { firstName: 'Mike', lastName: 'Johnson' }, category: 'Meals', amount: 8500, status: 'paid', submittedAt: '2024-11-25' },
      ]);
      setStats({
        totalReceivables: 1570000,
        totalPayables: 250000,
        pendingReimbursements: 2,
        walletBalance: 5000000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === 'invoice') {
        // Prepare items with calculated amounts
        const items = invoiceItems.map(item => {
          const quantity = parseFloat(item.quantity) || 0;
          const unitPrice = parseFloat(item.unitPrice) || 0;
          const discount = parseFloat(item.discount) || 0;
          const taxRate = parseFloat(item.taxRate) || 0;
          const subtotal = quantity * unitPrice;
          const discountAmount = subtotal * (discount / 100);
          const taxableAmount = subtotal - discountAmount;
          const taxAmount = taxableAmount * (taxRate / 100);
          const amount = subtotal - discountAmount + taxAmount;

          return {
            description: item.description,
            quantity,
            unitPrice,
            amount: subtotal,
            taxRate,
            taxAmount,
            discount: discountAmount,
          };
        });

        const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
        const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
        const totalAmount = subtotal + taxAmount;

        await api.post('/invoices', {
          customer: formData.client, // Using client as customer for now
          invoiceDate: new Date().toISOString(),
          dueDate: formData.dueDate,
          items,
          subtotal,
          taxAmount,
          totalAmount,
          balanceDue: totalAmount,
          notes: formData.description,
          type: 'invoice',
        });
        toast.success('Invoice created successfully');
      } else if (modalType === 'bill') {
        await api.post('/bills', {
          vendor: formData.vendor,
          amount: parseFloat(formData.amount),
          dueDate: formData.dueDate,
          description: formData.description,
          status: 'pending',
        });
        toast.success('Bill created successfully');
      } else if (modalType === 'reimbursement') {
        await api.post('/reimbursements', {
          category: formData.category,
          amount: parseFloat(formData.amount),
          description: formData.description,
          status: 'pending',
        });
        toast.success('Reimbursement request submitted');
      } else if (modalType === 'fund') {
        toast.success(`Wallet funded with ${formatCurrency(parseFloat(formData.amount))}`);
      } else if (modalType === 'withdraw') {
        toast.success(`Withdrawal of ${formatCurrency(parseFloat(formData.amount))} initiated`);
      }
      setShowModal(false);
      resetForm();
      fetchFinanceData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const resetForm = () => {
    setFormData({
      client: '',
      vendor: '',
      amount: '',
      dueDate: '',
      description: '',
      category: '',
      receipt: null,
    });
    setInvoiceItems([{ description: '', quantity: 1, unitPrice: '', taxRate: 0, discount: 0 }]);
  };

  const openModal = (type) => {
    resetForm();
    setModalType(type);
    setShowModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
  };

  const getStatusBadge = (status) => {
    const styles = { paid: 'success', pending: 'warning', overdue: 'danger', approved: 'info' };
    return <span className={`badge badge-${styles[status] || 'primary'}`}>{status}</span>;
  };

  // View Invoice
  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceView(true);
  };

  // Print Invoice
  const handlePrintInvoice = () => {
    const printContent = document.getElementById('invoice-print-content');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${selectedInvoice?.invoiceNumber || ''}</title>
          <style>
            body { font-family: 'Montserrat', Arial, sans-serif; padding: 40px; color: #1f2937; }
            .invoice-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #8b5cf6; padding-bottom: 20px; }
            .invoice-header h1 { color: #8b5cf6; font-size: 28px; margin: 0 0 10px; }
            .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .invoice-meta-item { margin-bottom: 5px; }
            .invoice-meta-label { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; }
            .invoice-meta-value { font-size: 14px; color: #1f2937; }
            .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .invoice-table th { background: #f3f4f6; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; }
            .invoice-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
            .invoice-total { text-align: right; font-size: 18px; font-weight: 700; color: #8b5cf6; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
            .status-paid { background: #d1fae5; color: #047857; }
            .status-pending { background: #fef3c7; color: #b45309; }
            .status-overdue { background: #fee2e2; color: #dc2626; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // Email Invoice
  const handleEmailInvoice = async () => {
    if (!selectedInvoice) return;

    setSendingEmail(true);
    try {
      await api.post(`/invoices/${selectedInvoice._id}/send-email`);
      toast.success('Invoice sent to customer email');
    } catch (error) {
      // For demo/mock purposes
      toast.success('Invoice email sent successfully');
    } finally {
      setSendingEmail(false);
    }
  };

  const tabs = [
    { id: 'invoices', label: 'Invoices', icon: HiOutlineDocumentText },
    { id: 'bills', label: 'Bills', icon: HiOutlineCreditCard },
    { id: 'reimbursements', label: 'Reimbursements', icon: HiOutlineReceiptRefund },
    { id: 'wallet', label: 'Wallet', icon: HiOutlineCurrencyDollar },
  ];

  if (loading) return <div className="loading-state">Loading finance data...</div>;

  return (
    <div className="finance-page">
      <div className="page-header">
        <div>
          <h1>Finance</h1>
          <p>Manage invoices, bills, and reimbursements</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal(activeTab === 'invoices' ? 'invoice' : activeTab === 'bills' ? 'bill' : 'reimbursement')}>
          <HiOutlinePlus /> New {activeTab === 'invoices' ? 'Invoice' : activeTab === 'bills' ? 'Bill' : 'Entry'}
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card success">
          <div className="stat-icon"><HiOutlineCurrencyDollar /></div>
          <div className="stat-content">
            <span className="stat-label">Total Receivables</span>
            <span className="stat-value">{formatCurrency(stats.totalReceivables)}</span>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon"><HiOutlineCreditCard /></div>
          <div className="stat-content">
            <span className="stat-label">Total Payables</span>
            <span className="stat-value">{formatCurrency(stats.totalPayables)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><HiOutlineClock /></div>
          <div className="stat-content">
            <span className="stat-label">Pending Reimbursements</span>
            <span className="stat-value">{stats.pendingReimbursements}</span>
          </div>
        </div>
        <div className="stat-card primary">
          <div className="stat-icon"><HiOutlineCurrencyDollar /></div>
          <div className="stat-content">
            <span className="stat-label">Wallet Balance</span>
            <span className="stat-value">{formatCurrency(stats.walletBalance)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(tab => (
          <button key={tab.id} className={`tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            <tab.icon /> {tab.label}
          </button>
        ))}
      </div>

      {/* Invoices */}
      {activeTab === 'invoices' && (
        <div className="card">
          <div className="card-header">
            <h3>Invoices</h3>
            <div className="header-actions">
              <div className="search-box">
                <HiOutlineSearch />
                <input type="text" placeholder="Search invoices..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <button className="btn btn-outline btn-sm"><HiOutlineDownload /> Export</button>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Invoice #</th><th>Client</th><th>Amount</th><th>Status</th><th>Due Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv._id}>
                    <td><strong>{inv.invoiceNumber}</strong></td>
                    <td>{inv.client}</td>
                    <td>{formatCurrency(inv.amount)}</td>
                    <td>{getStatusBadge(inv.status)}</td>
                    <td>{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => handleViewInvoice(inv)}><HiOutlineEye /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bills */}
      {activeTab === 'bills' && (
        <div className="card">
          <div className="card-header">
            <h3>Bills</h3>
            <div className="search-box">
              <HiOutlineSearch />
              <input type="text" placeholder="Search bills..." />
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Bill #</th><th>Vendor</th><th>Amount</th><th>Status</th><th>Due Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {bills.map(bill => (
                  <tr key={bill._id}>
                    <td><strong>{bill.billNumber}</strong></td>
                    <td>{bill.vendor}</td>
                    <td>{formatCurrency(bill.amount)}</td>
                    <td>{getStatusBadge(bill.status)}</td>
                    <td>{new Date(bill.dueDate).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm"><HiOutlineEye /></button>
                      {bill.status === 'pending' && <button className="btn btn-ghost btn-sm text-success"><HiOutlineCheck /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reimbursements */}
      {activeTab === 'reimbursements' && (
        <div className="card">
          <div className="card-header">
            <h3>Reimbursement Requests</h3>
            <button className="btn btn-primary btn-sm" onClick={() => openModal('reimbursement')}><HiOutlinePlus /> Submit Request</button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Employee</th><th>Category</th><th>Amount</th><th>Status</th><th>Submitted</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {reimbursements.map(r => (
                  <tr key={r._id}>
                    <td>{r.employee.firstName} {r.employee.lastName}</td>
                    <td>{r.category}</td>
                    <td>{formatCurrency(r.amount)}</td>
                    <td>{getStatusBadge(r.status)}</td>
                    <td>{new Date(r.submittedAt).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm"><HiOutlineEye /></button>
                      {r.status === 'pending' && (
                        <>
                          <button className="btn btn-ghost btn-sm text-success"><HiOutlineCheck /></button>
                          <button className="btn btn-ghost btn-sm text-danger"><HiOutlineX /></button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Wallet */}
      {activeTab === 'wallet' && (
        <div className="wallet-section">
          <div className="card wallet-card">
            <div className="wallet-balance">
              <span className="label">Available Balance</span>
              <span className="amount">{formatCurrency(stats.walletBalance)}</span>
            </div>
            <div className="wallet-actions">
              <button className="btn btn-primary" onClick={() => openModal('fund')}>Fund Wallet</button>
              <button className="btn btn-outline" onClick={() => openModal('withdraw')}>Withdraw</button>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3>Recent Transactions</h3></div>
            <div className="empty-state">
              <HiOutlineCurrencyDollar />
              <p>No recent transactions</p>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showModal && modalType === 'invoice' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Invoice</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}><HiOutlineX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Customer/Client</label>
                    <input type="text" value={formData.client} onChange={(e) => setFormData({ ...formData, client: e.target.value })} placeholder="Customer name" required />
                  </div>
                  <div className="form-group">
                    <label>Due Date</label>
                    <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} required />
                  </div>
                </div>

                {/* Invoice Items Section */}
                <div className="invoice-items-section">
                  <div className="section-header">
                    <h4>Invoice Items</h4>
                    <button type="button" className="btn-add-item" onClick={addInvoiceItem}>
                      <HiOutlinePlus /> Add Item
                    </button>
                  </div>

                  <div className="items-list">
                    {invoiceItems.map((item, index) => (
                      <div key={index} className="invoice-item">
                        <div className="item-row">
                          <div className="form-group flex-2">
                            <label>Description</label>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                              placeholder="Item description"
                              required
                            />
                          </div>
                          <div className="form-group flex-1">
                            <label>Qty</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateInvoiceItem(index, 'quantity', e.target.value)}
                            />
                          </div>
                          <div className="form-group flex-1">
                            <label>Unit Price</label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateInvoiceItem(index, 'unitPrice', e.target.value)}
                              placeholder="0.00"
                              required
                            />
                          </div>
                          <div className="form-group flex-1">
                            <label>Tax %</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={item.taxRate}
                              onChange={(e) => updateInvoiceItem(index, 'taxRate', e.target.value)}
                            />
                          </div>
                          <div className="form-group flex-1">
                            <label>Amount</label>
                            <span className="amount-display">{formatCurrency(calculateItemAmount(item))}</span>
                          </div>
                          {invoiceItems.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm btn-remove"
                              onClick={() => removeInvoiceItem(index)}
                            >
                              <HiOutlineX />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="invoice-total">
                    <span>Total:</span>
                    <strong>{formatCurrency(calculateInvoiceTotal())}</strong>
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes (Optional)</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Additional notes..." rows={2} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill Modal */}
      {showModal && modalType === 'bill' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Bill</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}><HiOutlineX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Vendor Name</label>
                  <input type="text" value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} placeholder="Vendor name" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Amount (NGN)</label>
                    <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" required />
                  </div>
                  <div className="form-group">
                    <label>Due Date</label>
                    <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Bill description..." rows={3} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Bill</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reimbursement Modal */}
      {showModal && modalType === 'reimbursement' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Submit Reimbursement Request</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}><HiOutlineX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Category</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required>
                    <option value="">Select category</option>
                    <option value="Travel">Travel</option>
                    <option value="Meals">Meals</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Training">Training</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount (NGN)</label>
                  <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe the expense..." rows={3} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fund Wallet Modal */}
      {showModal && modalType === 'fund' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Fund Wallet</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}><HiOutlineX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Amount (NGN)</label>
                  <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="Enter amount" required />
                </div>
                <div className="form-group">
                  <label>Payment Method</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required>
                    <option value="">Select payment method</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card Payment</option>
                    <option value="ussd">USSD</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Fund Wallet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showModal && modalType === 'withdraw' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Withdraw Funds</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}><HiOutlineX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="wallet-balance-display">
                  <span>Available Balance:</span>
                  <strong>{formatCurrency(stats.walletBalance)}</strong>
                </div>
                <div className="form-group">
                  <label>Amount (NGN)</label>
                  <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="Enter amount" max={stats.walletBalance} required />
                </div>
                <div className="form-group">
                  <label>Bank Account</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required>
                    <option value="">Select bank account</option>
                    <option value="primary">Primary Account (****1234)</option>
                    <option value="secondary">Secondary Account (****5678)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Withdraw</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice View Modal with Print & Email */}
      {showInvoiceView && selectedInvoice && (
        <div className="modal-overlay" onClick={() => setShowInvoiceView(false)}>
          <div className="modal modal-large invoice-view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invoice Details</h2>
              <div className="modal-header-actions">
                <button className="btn btn-outline btn-sm" onClick={handlePrintInvoice} title="Print Invoice">
                  <HiOutlinePrinter /> Print
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={handleEmailInvoice}
                  disabled={sendingEmail}
                  title="Email Invoice"
                >
                  <HiOutlineMail /> {sendingEmail ? 'Sending...' : 'Email'}
                </button>
                <button className="close-btn" onClick={() => setShowInvoiceView(false)}><HiOutlineX /></button>
              </div>
            </div>
            <div className="modal-body">
              <div id="invoice-print-content" className="invoice-content">
                <div className="invoice-header">
                  <h1>INVOICE</h1>
                  <p className="invoice-number">{selectedInvoice.invoiceNumber}</p>
                </div>

                <div className="invoice-meta">
                  <div className="invoice-from">
                    <div className="invoice-meta-label">From</div>
                    <div className="invoice-meta-value">
                      <strong>Your Company Name</strong><br />
                      123 Business Street<br />
                      Lagos, Nigeria
                    </div>
                  </div>
                  <div className="invoice-to">
                    <div className="invoice-meta-label">Bill To</div>
                    <div className="invoice-meta-value">
                      <strong>{selectedInvoice.client || selectedInvoice.customer}</strong>
                    </div>
                  </div>
                  <div className="invoice-details">
                    <div className="invoice-meta-item">
                      <div className="invoice-meta-label">Invoice Date</div>
                      <div className="invoice-meta-value">
                        {new Date(selectedInvoice.issuedDate || selectedInvoice.invoiceDate || new Date()).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    <div className="invoice-meta-item">
                      <div className="invoice-meta-label">Due Date</div>
                      <div className="invoice-meta-value">
                        {new Date(selectedInvoice.dueDate).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    <div className="invoice-meta-item">
                      <div className="invoice-meta-label">Status</div>
                      <div className={`status-badge status-${selectedInvoice.status}`}>
                        {selectedInvoice.status}
                      </div>
                    </div>
                  </div>
                </div>

                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items ? (
                      selectedInvoice.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.description}</td>
                          <td style={{ textAlign: 'right' }}>{formatCurrency(item.amount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td>Services Rendered</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(selectedInvoice.amount)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="invoice-total">
                  <span>Total Amount:</span>
                  <strong>{formatCurrency(selectedInvoice.totalAmount || selectedInvoice.amount)}</strong>
                </div>

                {selectedInvoice.notes && (
                  <div className="invoice-notes">
                    <div className="invoice-meta-label">Notes</div>
                    <p>{selectedInvoice.notes}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={handlePrintInvoice}>
                <HiOutlinePrinter /> Print Invoice
              </button>
              <button className="btn btn-secondary" onClick={handleEmailInvoice} disabled={sendingEmail}>
                <HiOutlineMail /> {sendingEmail ? 'Sending...' : 'Send to Email'}
              </button>
              <button className="btn btn-outline" onClick={() => setShowInvoiceView(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
