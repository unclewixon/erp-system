import { useState, useEffect } from 'react';
import { payrollAPI } from '../../services/api';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineCheck,
  HiOutlineCash,
  HiOutlineEye,
} from 'react-icons/hi';
import './Payroll.scss';

const Payroll = () => {
  const [activeTab, setActiveTab] = useState('payrolls');
  const [payrolls, setPayrolls] = useState([]);
  const [grades, setGrades] = useState([]);
  const [myPayslips, setMyPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPayslipsModal, setShowPayslipsModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [processing, setProcessing] = useState(false);

  const [createForm, setCreateForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [payrollsRes, gradesRes, myPayslipsRes] = await Promise.all([
        payrollAPI.getAll(),
        payrollAPI.getGrades(),
        payrollAPI.getMyPayslips().catch(() => ({ data: { data: [] } })),
      ]);

      setPayrolls(payrollsRes.data.data);
      setGrades(gradesRes.data.data);
      setMyPayslips(myPayslipsRes.data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayroll = async (e) => {
    e.preventDefault();
    try {
      await payrollAPI.create(createForm);
      toast.success('Payroll created successfully');
      setShowCreateModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create payroll');
    }
  };

  const handleProcessPayroll = async (payrollId) => {
    if (!window.confirm('Are you sure you want to process this payroll?')) return;

    setProcessing(true);
    try {
      await payrollAPI.process(payrollId);
      toast.success('Payroll processed successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process payroll');
    } finally {
      setProcessing(false);
    }
  };

  const handleApprovePayroll = async (payrollId) => {
    if (!window.confirm('Are you sure you want to approve this payroll?')) return;

    try {
      await payrollAPI.approve(payrollId);
      toast.success('Payroll approved');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve payroll');
    }
  };

  const handlePayPayroll = async (payrollId) => {
    const reference = window.prompt('Enter payment reference:');
    if (!reference) return;

    try {
      await payrollAPI.pay(payrollId, { paymentReference: reference });
      toast.success('Payroll marked as paid');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark as paid');
    }
  };

  const viewPayslips = async (payroll) => {
    setSelectedPayroll(payroll);
    try {
      const res = await payrollAPI.getPayslips(payroll._id);
      setPayslips(res.data.data);
      setShowPayslipsModal(true);
    } catch (error) {
      toast.error('Failed to load payslips');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'badge-gray',
      processing: 'badge-warning',
      processed: 'badge-info',
      approved: 'badge-primary',
      paid: 'badge-success',
      cancelled: 'badge-danger',
    };
    return badges[status] || 'badge-gray';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount || 0);
  };

  const getMonthName = (month) => {
    return new Date(2000, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="payroll-page">
      <div className="page-header">
        <h1>Payroll Management</h1>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <HiOutlinePlus /> New Payroll
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <HiOutlineDocumentText />
          </div>
          <div className="stat-value">{payrolls.length}</div>
          <div className="stat-label">Total Payrolls</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <HiOutlineCurrencyDollar />
          </div>
          <div className="stat-value">{grades.length}</div>
          <div className="stat-label">Salary Grades</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <HiOutlineCash />
          </div>
          <div className="stat-value">
            {payrolls.filter(p => p.status === 'paid').length}
          </div>
          <div className="stat-label">Paid This Year</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'payrolls' ? 'active' : ''}`}
          onClick={() => setActiveTab('payrolls')}
        >
          Payroll Runs
        </button>
        <button
          className={`tab ${activeTab === 'grades' ? 'active' : ''}`}
          onClick={() => setActiveTab('grades')}
        >
          Salary Grades
        </button>
        <button
          className={`tab ${activeTab === 'my-payslips' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-payslips')}
        >
          My Payslips
        </button>
      </div>

      {/* Tab Content */}
      <div className="card">
        {activeTab === 'payrolls' && (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Employees</th>
                  <th>Total Gross</th>
                  <th>Total Net</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map((payroll) => (
                  <tr key={payroll._id}>
                    <td>
                      <strong>{getMonthName(payroll.month)} {payroll.year}</strong>
                    </td>
                    <td>{payroll.totalEmployees}</td>
                    <td>{formatCurrency(payroll.summary?.totalGross)}</td>
                    <td>{formatCurrency(payroll.summary?.totalNet)}</td>
                    <td>
                      <span className={`badge ${getStatusBadge(payroll.status)}`}>
                        {payroll.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => viewPayslips(payroll)}
                        >
                          <HiOutlineEye />
                        </button>
                        {payroll.status === 'draft' && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleProcessPayroll(payroll._id)}
                            disabled={processing}
                          >
                            Process
                          </button>
                        )}
                        {payroll.status === 'processed' && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleApprovePayroll(payroll._id)}
                          >
                            <HiOutlineCheck /> Approve
                          </button>
                        )}
                        {payroll.status === 'approved' && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handlePayPayroll(payroll._id)}
                          >
                            <HiOutlineCash /> Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {payrolls.length === 0 && (
              <div className="empty-state">No payroll runs found</div>
            )}
          </div>
        )}

        {activeTab === 'grades' && (
          <div className="grades-grid">
            {grades.map((grade) => (
              <div key={grade._id} className="grade-card">
                <div className="grade-header">
                  <h4>{grade.name}</h4>
                  <span className="grade-code">{grade.code}</span>
                </div>
                <div className="grade-level">Level {grade.level}</div>
                <div className="grade-range">
                  <span>{formatCurrency(grade.minSalary)}</span>
                  <span>-</span>
                  <span>{formatCurrency(grade.maxSalary)}</span>
                </div>
                <div className="grade-components">
                  {grade.components?.length || 0} components
                </div>
              </div>
            ))}
            {grades.length === 0 && (
              <div className="empty-state">No salary grades defined</div>
            )}
          </div>
        )}

        {activeTab === 'my-payslips' && (
          <div className="payslips-list">
            {myPayslips.map((slip) => (
              <div key={slip._id} className="payslip-card">
                <div className="payslip-period">
                  {getMonthName(slip.month)} {slip.year}
                </div>
                <div className="payslip-details">
                  <div className="payslip-item">
                    <span>Gross</span>
                    <strong>{formatCurrency(slip.summary?.grossSalary)}</strong>
                  </div>
                  <div className="payslip-item">
                    <span>Deductions</span>
                    <strong className="text-danger">-{formatCurrency(slip.summary?.totalDeductions)}</strong>
                  </div>
                  <div className="payslip-item net">
                    <span>Net Pay</span>
                    <strong className="text-success">{formatCurrency(slip.summary?.netSalary)}</strong>
                  </div>
                </div>
                <span className={`badge ${getStatusBadge(slip.status)}`}>
                  {slip.status}
                </span>
              </div>
            ))}
            {myPayslips.length === 0 && (
              <div className="empty-state">No payslips found</div>
            )}
          </div>
        )}
      </div>

      {/* Create Payroll Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Payroll"
        size="sm"
      >
        <form onSubmit={handleCreatePayroll}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label>Month</label>
                <select
                  value={createForm.month}
                  onChange={(e) => setCreateForm({ ...createForm, month: parseInt(e.target.value) })}
                  required
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Year</label>
                <select
                  value={createForm.year}
                  onChange={(e) => setCreateForm({ ...createForm, year: parseInt(e.target.value) })}
                  required
                >
                  {[2024, 2025, 2026].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Payroll
            </button>
          </div>
        </form>
      </Modal>

      {/* Payslips Modal */}
      <Modal
        isOpen={showPayslipsModal}
        onClose={() => setShowPayslipsModal(false)}
        title={`Payslips - ${selectedPayroll ? `${getMonthName(selectedPayroll.month)} ${selectedPayroll.year}` : ''}`}
        size="lg"
      >
        <div className="modal-body">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Basic</th>
                  <th>Gross</th>
                  <th>Deductions</th>
                  <th>Net</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map((slip) => (
                  <tr key={slip._id}>
                    <td>
                      <strong>{slip.employeeDetails?.firstName} {slip.employeeDetails?.lastName}</strong>
                      <div className="text-muted small">{slip.employeeDetails?.employeeId}</div>
                    </td>
                    <td>{formatCurrency(slip.summary?.basicSalary)}</td>
                    <td>{formatCurrency(slip.summary?.grossSalary)}</td>
                    <td className="text-danger">-{formatCurrency(slip.summary?.totalDeductions)}</td>
                    <td className="text-success">{formatCurrency(slip.summary?.netSalary)}</td>
                    <td>
                      <span className={`badge ${getStatusBadge(slip.status)}`}>
                        {slip.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Payroll;
