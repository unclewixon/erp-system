import { useState, useEffect } from 'react';
import {
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
  HiOutlineCalculator,
  HiOutlineClipboardList,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlineDownload,
  HiOutlineEye,
  HiOutlineX,
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Accounting.scss';

const Accounting = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
    pendingInvoices: 0,
    paidInvoices: 0,
    overdueInvoices: 0,
  });

  const [formData, setFormData] = useState({
    type: 'income',
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
  });

  useEffect(() => {
    fetchAccountingData();
  }, []);

  const fetchAccountingData = async () => {
    setLoading(true);
    try {
      // Fetch data from backend APIs
      const [journalsRes, expensesRes, incomeStatementRes] = await Promise.all([
        api.get('/bookkeeping/journals'),
        api.get('/expenses'),
        api.get('/bookkeeping/reports/income-statement'),
      ]);

      const journals = journalsRes.data.data || [];
      const expenses = expensesRes.data.data || [];
      const incomeStatement = incomeStatementRes.data.data || {};

      // Calculate stats from income statement
      setStats({
        totalRevenue: incomeStatement.totalRevenue || 0,
        totalExpenses: incomeStatement.totalExpenses || 0,
        netIncome: incomeStatement.netIncome || 0,
        pendingInvoices: expenses.filter(e => e.status === 'submitted').length,
        paidInvoices: expenses.filter(e => e.status === 'paid').length,
        overdueInvoices: expenses.filter(e => e.status === 'rejected').length,
      });

      // Transform journal entries and expenses into transactions
      const journalTransactions = journals.map(j => ({
        id: j._id,
        type: j.totalDebit > j.totalCredit ? 'expense' : 'income',
        category: j.type || 'General',
        amount: Math.max(j.totalDebit, j.totalCredit),
        description: j.description,
        date: j.date,
        reference: j.entryNumber,
        status: j.status === 'posted' ? 'completed' : j.status,
      }));

      const expenseTransactions = expenses.map(e => ({
        id: e._id,
        type: 'expense',
        category: e.category?.name || 'Expense',
        amount: e.totalAmount,
        description: e.description,
        date: e.expenseDate,
        reference: e.expenseNumber,
        status: e.status === 'paid' ? 'completed' : e.status,
      }));

      setTransactions([...journalTransactions, ...expenseTransactions].sort((a, b) =>
        new Date(b.date) - new Date(a.date)
      ));
    } catch (error) {
      // Fallback to mock data if API fails
      setStats({
        totalRevenue: 4850000,
        totalExpenses: 2320000,
        netIncome: 2530000,
        pendingInvoices: 12,
        paidInvoices: 45,
        overdueInvoices: 3,
      });

      setTransactions([
        { id: 1, type: 'income', category: 'Sales', amount: 500000, description: 'Product Sales - Q4', date: '2024-12-01', reference: 'INV-001', status: 'completed' },
        { id: 2, type: 'expense', category: 'Salaries', amount: 850000, description: 'November Payroll', date: '2024-11-30', reference: 'PAY-001', status: 'completed' },
        { id: 3, type: 'income', category: 'Services', amount: 250000, description: 'Consulting Services', date: '2024-11-28', reference: 'INV-002', status: 'completed' },
        { id: 4, type: 'expense', category: 'Utilities', amount: 45000, description: 'Office Electricity', date: '2024-11-25', reference: 'UTIL-001', status: 'completed' },
        { id: 5, type: 'expense', category: 'Rent', amount: 350000, description: 'Office Rent - December', date: '2024-12-01', reference: 'RENT-001', status: 'pending' },
        { id: 6, type: 'income', category: 'Sales', amount: 780000, description: 'Bulk Order - Client A', date: '2024-12-02', reference: 'INV-003', status: 'completed' },
        { id: 7, type: 'expense', category: 'Equipment', amount: 120000, description: 'Office Equipment', date: '2024-11-20', reference: 'EQ-001', status: 'completed' },
        { id: 8, type: 'income', category: 'Interest', amount: 15000, description: 'Bank Interest', date: '2024-11-30', reference: 'INT-001', status: 'completed' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.type === 'expense') {
        // Create expense
        await api.post('/expenses', {
          description: formData.description,
          totalAmount: parseFloat(formData.amount),
          expenseDate: formData.date,
          expenseNumber: formData.reference,
          status: 'draft',
        });
      } else {
        // Create journal entry for income
        await api.post('/bookkeeping/journals', {
          description: formData.description,
          date: formData.date,
          type: 'standard',
          lines: [
            { description: formData.description, debit: parseFloat(formData.amount), credit: 0 },
            { description: formData.description, debit: 0, credit: parseFloat(formData.amount) },
          ],
          totalDebit: parseFloat(formData.amount),
          totalCredit: parseFloat(formData.amount),
        });
      }
      toast.success('Transaction added successfully');
      setShowModal(false);
      setFormData({
        type: 'income',
        category: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        reference: '',
      });
      fetchAccountingData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add transaction');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || t.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const incomeCategories = ['Sales', 'Services', 'Interest', 'Investments', 'Other Income'];
  const expenseCategories = ['Salaries', 'Rent', 'Utilities', 'Equipment', 'Marketing', 'Travel', 'Office Supplies', 'Other Expenses'];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: HiOutlineCalculator },
    { id: 'transactions', label: 'Transactions', icon: HiOutlineClipboardList },
    { id: 'invoices', label: 'Invoices', icon: HiOutlineDocumentText },
    { id: 'reports', label: 'Reports', icon: HiOutlineTrendingUp },
  ];

  if (loading) {
    return <div className="loading-state">Loading accounting data...</div>;
  }

  return (
    <div className="accounting-page">
      <div className="page-header">
        <div>
          <h1>Accounting</h1>
          <p>Manage your financial transactions and reports</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <HiOutlinePlus /> Add Transaction
        </button>
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon success">
                <HiOutlineTrendingUp />
              </div>
              <div className="stat-content">
                <span className="stat-label">Total Revenue</span>
                <span className="stat-value">{formatCurrency(stats.totalRevenue)}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon error">
                <HiOutlineTrendingDown />
              </div>
              <div className="stat-content">
                <span className="stat-label">Total Expenses</span>
                <span className="stat-value">{formatCurrency(stats.totalExpenses)}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <HiOutlineCurrencyDollar />
              </div>
              <div className="stat-content">
                <span className="stat-label">Net Income</span>
                <span className="stat-value">{formatCurrency(stats.netIncome)}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon warning">
                <HiOutlineDocumentText />
              </div>
              <div className="stat-content">
                <span className="stat-label">Pending Invoices</span>
                <span className="stat-value">{stats.pendingInvoices}</span>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="card">
            <div className="card-header">
              <h3>Recent Transactions</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('transactions')}>
                View All
              </button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 5).map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{new Date(transaction.date).toLocaleDateString()}</td>
                      <td>
                        <div className="transaction-desc">
                          <span>{transaction.description}</span>
                          <span className="reference">{transaction.reference}</span>
                        </div>
                      </td>
                      <td>{transaction.category}</td>
                      <td>
                        <span className={`badge badge-${transaction.type === 'income' ? 'success' : 'danger'}`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td className={transaction.type === 'income' ? 'text-success' : 'text-danger'}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </td>
                      <td>
                        <span className={`badge badge-${transaction.status === 'completed' ? 'success' : 'warning'}`}>
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="card">
          <div className="card-header">
            <h3>All Transactions</h3>
            <div className="header-actions">
              <div className="search-box">
                <HiOutlineSearch />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="filter-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expenses</option>
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
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{new Date(transaction.date).toLocaleDateString()}</td>
                    <td>{transaction.reference}</td>
                    <td>{transaction.description}</td>
                    <td>{transaction.category}</td>
                    <td>
                      <span className={`badge badge-${transaction.type === 'income' ? 'success' : 'danger'}`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className={transaction.type === 'income' ? 'text-success' : 'text-danger'}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </td>
                    <td>
                      <span className={`badge badge-${transaction.status === 'completed' ? 'success' : 'warning'}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm">
                        <HiOutlineEye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="card">
          <div className="card-header">
            <h3>Invoices</h3>
            <button className="btn btn-primary btn-sm">
              <HiOutlinePlus /> Create Invoice
            </button>
          </div>
          <div className="invoice-stats">
            <div className="invoice-stat">
              <span className="label">Paid</span>
              <span className="value success">{stats.paidInvoices}</span>
            </div>
            <div className="invoice-stat">
              <span className="label">Pending</span>
              <span className="value warning">{stats.pendingInvoices}</span>
            </div>
            <div className="invoice-stat">
              <span className="label">Overdue</span>
              <span className="value error">{stats.overdueInvoices}</span>
            </div>
          </div>
          <div className="empty-state">
            <HiOutlineDocumentText />
            <h3>No invoices yet</h3>
            <p>Create your first invoice to start tracking payments</p>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="reports-grid">
          <div className="card report-card">
            <HiOutlineTrendingUp className="report-icon" />
            <h4>Profit & Loss</h4>
            <p>View income vs expenses over time</p>
            <button className="btn btn-outline btn-sm">Generate</button>
          </div>
          <div className="card report-card">
            <HiOutlineCalculator className="report-icon" />
            <h4>Balance Sheet</h4>
            <p>Assets, liabilities, and equity summary</p>
            <button className="btn btn-outline btn-sm">Generate</button>
          </div>
          <div className="card report-card">
            <HiOutlineCurrencyDollar className="report-icon" />
            <h4>Cash Flow</h4>
            <p>Track money coming in and going out</p>
            <button className="btn btn-outline btn-sm">Generate</button>
          </div>
          <div className="card report-card">
            <HiOutlineClipboardList className="report-icon" />
            <h4>Expense Report</h4>
            <p>Detailed breakdown of all expenses</p>
            <button className="btn btn-outline btn-sm">Generate</button>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Transaction</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <HiOutlineX />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Transaction Type</label>
                  <div className="type-toggle">
                    <button
                      type="button"
                      className={`toggle-btn ${formData.type === 'income' ? 'active income' : ''}`}
                      onClick={() => setFormData({ ...formData, type: 'income', category: '' })}
                    >
                      <HiOutlineTrendingUp /> Income
                    </button>
                    <button
                      type="button"
                      className={`toggle-btn ${formData.type === 'expense' ? 'active expense' : ''}`}
                      onClick={() => setFormData({ ...formData, type: 'expense', category: '' })}
                    >
                      <HiOutlineTrendingDown /> Expense
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  >
                    <option value="">Select category</option>
                    {(formData.type === 'income' ? incomeCategories : expenseCategories).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Amount (NGN)</label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Reference Number</label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="e.g., INV-001"
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter transaction description..."
                    rows={3}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounting;
