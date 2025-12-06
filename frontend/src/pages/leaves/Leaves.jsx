import { useState, useEffect } from 'react';
import { leaveAPI } from '../../services/api';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineCalendar,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineClock,
} from 'react-icons/hi';
import './Leaves.scss';

const Leaves = () => {
  const [activeTab, setActiveTab] = useState('my-leaves');
  const [balances, setBalances] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [applyForm, setApplyForm] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    isHalfDay: false,
    halfDayType: 'first_half',
    reason: '',
  });

  const [approvalForm, setApprovalForm] = useState({
    action: '',
    comments: '',
    reason: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [balancesRes, requestsRes, typesRes, holidaysRes, pendingRes] = await Promise.all([
        leaveAPI.getMyBalances(),
        leaveAPI.getMyRequests(),
        leaveAPI.getTypes(),
        leaveAPI.getHolidays(),
        leaveAPI.getPendingRequests().catch(() => ({ data: { data: [] } })),
      ]);

      setBalances(balancesRes.data.data);
      setMyRequests(requestsRes.data.data);
      setLeaveTypes(typesRes.data.data);
      setHolidays(holidaysRes.data.data);
      setPendingRequests(pendingRes.data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    try {
      await leaveAPI.createRequest(applyForm);
      toast.success('Leave request submitted successfully');
      setShowApplyModal(false);
      setApplyForm({
        leaveType: '',
        startDate: '',
        endDate: '',
        isHalfDay: false,
        halfDayType: 'first_half',
        reason: '',
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit request');
    }
  };

  const handleApproval = async () => {
    try {
      if (approvalForm.action === 'approve') {
        await leaveAPI.approveRequest(selectedRequest._id, { comments: approvalForm.comments });
        toast.success('Leave request approved');
      } else {
        await leaveAPI.rejectRequest(selectedRequest._id, {
          reason: approvalForm.reason,
          comments: approvalForm.comments,
        });
        toast.success('Leave request rejected');
      }
      setShowApprovalModal(false);
      setSelectedRequest(null);
      setApprovalForm({ action: '', comments: '', reason: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) return;

    try {
      await leaveAPI.cancelRequest(requestId, { reason: 'Cancelled by user' });
      toast.success('Leave request cancelled');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel request');
    }
  };

  const openApprovalModal = (request, action) => {
    setSelectedRequest(request);
    setApprovalForm({ action, comments: '', reason: '' });
    setShowApprovalModal(true);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-warning',
      approved: 'badge-success',
      rejected: 'badge-danger',
      cancelled: 'badge-gray',
    };
    return badges[status] || 'badge-gray';
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="leaves-page">
      <div className="page-header">
        <h1>Leave Management</h1>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => setShowApplyModal(true)}>
            <HiOutlinePlus /> Apply for Leave
          </button>
        </div>
      </div>

      {/* Leave Balances */}
      <div className="balances-grid">
        {balances.map((bal) => (
          <div key={bal._id} className="balance-card" style={{ borderColor: bal.leaveType?.color }}>
            <div className="balance-header">
              <span className="balance-type" style={{ color: bal.leaveType?.color }}>
                {bal.leaveType?.name}
              </span>
              <span className="balance-code">{bal.leaveType?.code}</span>
            </div>
            <div className="balance-numbers">
              <div className="balance-available">
                <span className="value">{bal.available}</span>
                <span className="label">Available</span>
              </div>
              <div className="balance-details">
                <div><span>{bal.used}</span> Used</div>
                <div><span>{bal.pending}</span> Pending</div>
                <div><span>{bal.total}</span> Total</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'my-leaves' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-leaves')}
        >
          My Requests
        </button>
        <button
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Approval
          {pendingRequests.length > 0 && (
            <span className="badge badge-warning">{pendingRequests.length}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'holidays' ? 'active' : ''}`}
          onClick={() => setActiveTab('holidays')}
        >
          Holidays
        </button>
      </div>

      {/* Tab Content */}
      <div className="card tab-content">
        {activeTab === 'my-leaves' && (
          <div className="requests-list">
            {myRequests.length === 0 ? (
              <div className="empty-state">No leave requests found</div>
            ) : (
              myRequests.map((req) => (
                <div key={req._id} className="request-card">
                  <div className="request-dates">
                    <HiOutlineCalendar />
                    <span>
                      {formatDate(req.startDate)}
                      {req.startDate !== req.endDate && ` - ${formatDate(req.endDate)}`}
                    </span>
                    <span className="days">({req.workingDays} {req.workingDays === 1 ? 'day' : 'days'})</span>
                  </div>
                  <div className="request-info">
                    <span
                      className="leave-type"
                      style={{ background: `${req.leaveType?.color}20`, color: req.leaveType?.color }}
                    >
                      {req.leaveType?.name}
                    </span>
                    <span className={`badge ${getStatusBadge(req.status)}`}>
                      {req.status}
                    </span>
                  </div>
                  <div className="request-reason">{req.reason}</div>
                  {req.status === 'pending' && (
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => handleCancelRequest(req._id)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="requests-list">
            {pendingRequests.length === 0 ? (
              <div className="empty-state">No pending requests</div>
            ) : (
              pendingRequests.map((req) => (
                <div key={req._id} className="request-card pending">
                  <div className="request-employee">
                    <div className="avatar">
                      {req.employee?.firstName?.charAt(0)}{req.employee?.lastName?.charAt(0)}
                    </div>
                    <div>
                      <div className="name">{req.employee?.firstName} {req.employee?.lastName}</div>
                      <div className="id">{req.employee?.employeeId}</div>
                    </div>
                  </div>
                  <div className="request-dates">
                    <HiOutlineCalendar />
                    <span>
                      {formatDate(req.startDate)}
                      {req.startDate !== req.endDate && ` - ${formatDate(req.endDate)}`}
                    </span>
                    <span className="days">({req.workingDays} days)</span>
                  </div>
                  <div className="request-info">
                    <span
                      className="leave-type"
                      style={{ background: `${req.leaveType?.color}20`, color: req.leaveType?.color }}
                    >
                      {req.leaveType?.name}
                    </span>
                  </div>
                  <div className="request-reason">{req.reason}</div>
                  <div className="request-actions">
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => openApprovalModal(req, 'approve')}
                    >
                      <HiOutlineCheck /> Approve
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => openApprovalModal(req, 'reject')}
                    >
                      <HiOutlineX /> Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'holidays' && (
          <div className="holidays-list">
            {holidays.map((holiday) => (
              <div key={holiday._id} className="holiday-item">
                <div className="holiday-date">
                  <span className="day">{new Date(holiday.date).getDate()}</span>
                  <span className="month">
                    {new Date(holiday.date).toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                </div>
                <div className="holiday-info">
                  <div className="holiday-name">{holiday.name}</div>
                  <div className="holiday-day">
                    {new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'long' })}
                  </div>
                </div>
                <span className={`badge badge-${holiday.type === 'public' ? 'success' : 'info'}`}>
                  {holiday.type}
                </span>
              </div>
            ))}
            {holidays.length === 0 && (
              <div className="empty-state">No holidays found for this year</div>
            )}
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        title="Apply for Leave"
        size="md"
      >
        <form onSubmit={handleApplySubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Leave Type *</label>
              <select
                value={applyForm.leaveType}
                onChange={(e) => setApplyForm({ ...applyForm, leaveType: e.target.value })}
                required
              >
                <option value="">Select Leave Type</option>
                {leaveTypes.map((type) => (
                  <option key={type._id} value={type._id}>{type.name}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  value={applyForm.startDate}
                  onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="form-group">
                <label>End Date *</label>
                <input
                  type="date"
                  value={applyForm.endDate}
                  onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                  required
                  min={applyForm.startDate || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={applyForm.isHalfDay}
                  onChange={(e) => setApplyForm({ ...applyForm, isHalfDay: e.target.checked })}
                />
                Half Day Leave
              </label>
            </div>

            {applyForm.isHalfDay && (
              <div className="form-group">
                <label>Half Day Type</label>
                <select
                  value={applyForm.halfDayType}
                  onChange={(e) => setApplyForm({ ...applyForm, halfDayType: e.target.value })}
                >
                  <option value="first_half">First Half (Morning)</option>
                  <option value="second_half">Second Half (Afternoon)</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Reason *</label>
              <textarea
                value={applyForm.reason}
                onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                rows={3}
                placeholder="Please provide a reason for your leave request..."
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowApplyModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Submit Request
            </button>
          </div>
        </form>
      </Modal>

      {/* Approval Modal */}
      <Modal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        title={approvalForm.action === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
        size="sm"
      >
        <div className="modal-body">
          {approvalForm.action === 'reject' && (
            <div className="form-group">
              <label>Rejection Reason *</label>
              <textarea
                value={approvalForm.reason}
                onChange={(e) => setApprovalForm({ ...approvalForm, reason: e.target.value })}
                rows={2}
                placeholder="Please provide a reason for rejection..."
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Comments (Optional)</label>
            <textarea
              value={approvalForm.comments}
              onChange={(e) => setApprovalForm({ ...approvalForm, comments: e.target.value })}
              rows={2}
              placeholder="Any additional comments..."
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowApprovalModal(false)}>
            Cancel
          </button>
          <button
            className={`btn ${approvalForm.action === 'approve' ? 'btn-success' : 'btn-danger'}`}
            onClick={handleApproval}
          >
            {approvalForm.action === 'approve' ? 'Approve' : 'Reject'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Leaves;
