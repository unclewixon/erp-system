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
  const [searchTerm, setSearchTerm] = useState('');

  const [stats, setStats] = useState({
    totalReceivables: 0,
    totalPayables: 0,
    pendingReimbursements: 0,
    walletBalance: 0,
  });

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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
  };

  const getStatusBadge = (status) => {
    const styles = { paid: 'success', pending: 'warning', overdue: 'danger', approved: 'info' };
    return <span className={`badge badge-${styles[status] || 'primary'}`}>{status}</span>;
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
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
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
                    <td><button className="btn btn-ghost btn-sm"><HiOutlineEye /></button></td>
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
            <button className="btn btn-primary btn-sm"><HiOutlinePlus /> Submit Request</button>
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
              <button className="btn btn-primary">Fund Wallet</button>
              <button className="btn btn-outline">Withdraw</button>
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
    </div>
  );
};

export default Finance;
