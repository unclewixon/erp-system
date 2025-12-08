import { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  HiOutlineSwitchHorizontal,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineFilter,
  HiOutlineRefresh,
} from 'react-icons/hi';
import './SwapRequests.scss';

const SwapRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending_admin');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalAction, setApprovalAction] = useState('');
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/duty-roster/swap-requests${filter ? `?status=${filter}` : ''}`);
      setRequests(res.data.data || []);
    } catch (error) {
      console.error('Error fetching swap requests:', error);
      toast.error('Failed to load swap requests');
    } finally {
      setLoading(false);
    }
  };

  const openApprovalModal = (request, action) => {
    setSelectedRequest(request);
    setApprovalAction(action);
    setComment('');
    setShowApprovalModal(true);
  };

  const handleApproval = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);
      await api.put(`/duty-roster/swap-requests/${selectedRequest._id}/admin-approval`, {
        status: approvalAction,
        comment,
      });
      toast.success(`Swap request ${approvalAction}`);
      setShowApprovalModal(false);
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process request');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved': return 'badge-success';
      case 'pending_colleague':
      case 'pending_admin': return 'badge-warning';
      case 'rejected':
      case 'cancelled': return 'badge-danger';
      default: return 'badge-info';
    }
  };

  const formatStatusLabel = (status) => {
    switch (status) {
      case 'pending_colleague': return 'Awaiting Colleague';
      case 'pending_admin': return 'Awaiting Approval';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="swap-requests-page">
      <div className="page-header">
        <div className="header-content">
          <h1><HiOutlineSwitchHorizontal /> Shift Swap Requests</h1>
          <p>Review and manage employee shift swap requests</p>
        </div>
        <div className="header-actions">
          <select
            className="filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">All Requests</option>
            <option value="pending_admin">Pending Approval</option>
            <option value="pending_colleague">Awaiting Colleague</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="btn btn-outline" onClick={fetchRequests}>
            <HiOutlineRefresh /> Refresh
          </button>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="empty-state">
          <HiOutlineSwitchHorizontal className="empty-icon" />
          <h3>No Swap Requests</h3>
          <p>There are no swap requests {filter ? `with status "${formatStatusLabel(filter)}"` : ''}</p>
        </div>
      ) : (
        <div className="requests-grid">
          {requests.map((request) => (
            <div key={request._id} className="request-card">
              <div className="request-header">
                <span className={`badge ${getStatusBadgeClass(request.status)}`}>
                  {formatStatusLabel(request.status)}
                </span>
                <span className="request-date">
                  {new Date(request.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="request-body">
                <div className="swap-parties">
                  <div className="party requester">
                    <div className="party-label">Requester</div>
                    <div className="party-name">
                      {request.requestedBy?.firstName} {request.requestedBy?.lastName}
                    </div>
                    <div className="party-id">{request.requestedBy?.employeeId}</div>
                    <div className="party-date">
                      {new Date(request.requesterDate).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric'
                      })}
                    </div>
                    <div className="party-shift">
                      {request.requesterSchedule?.shift?.name} ({request.requesterSchedule?.shift?.startTime} - {request.requesterSchedule?.shift?.endTime})
                    </div>
                  </div>

                  <div className="swap-arrow">
                    <HiOutlineSwitchHorizontal />
                  </div>

                  <div className="party target">
                    <div className="party-label">Swap With</div>
                    <div className="party-name">
                      {request.swapWith?.firstName} {request.swapWith?.lastName}
                    </div>
                    <div className="party-id">{request.swapWith?.employeeId}</div>
                    <div className="party-date">
                      {new Date(request.targetDate).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric'
                      })}
                    </div>
                    <div className="party-shift">
                      {request.targetSchedule?.shift?.name} ({request.targetSchedule?.shift?.startTime} - {request.targetSchedule?.shift?.endTime})
                    </div>
                  </div>
                </div>

                <div className="request-reason">
                  <strong>Reason:</strong> {request.reason}
                </div>

                {request.colleagueResponse?.status !== 'pending' && (
                  <div className="colleague-response">
                    <strong>Colleague Response:</strong>{' '}
                    <span className={request.colleagueResponse?.status === 'accepted' ? 'text-success' : 'text-danger'}>
                      {request.colleagueResponse?.status}
                    </span>
                    {request.colleagueResponse?.comment && (
                      <span className="response-comment"> - {request.colleagueResponse.comment}</span>
                    )}
                  </div>
                )}

                {request.adminApproval?.status !== 'pending' && (
                  <div className="admin-response">
                    <strong>Admin Decision:</strong>{' '}
                    <span className={request.adminApproval?.status === 'approved' ? 'text-success' : 'text-danger'}>
                      {request.adminApproval?.status}
                    </span>
                    {request.adminApproval?.comment && (
                      <span className="response-comment"> - {request.adminApproval.comment}</span>
                    )}
                  </div>
                )}
              </div>

              {request.status === 'pending_admin' && (
                <div className="request-actions">
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => openApprovalModal(request, 'approved')}
                  >
                    <HiOutlineCheck /> Approve
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => openApprovalModal(request, 'rejected')}
                  >
                    <HiOutlineX /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Approval Modal */}
      <Modal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        title={`${approvalAction === 'approved' ? 'Approve' : 'Reject'} Swap Request`}
        size="sm"
      >
        <div className="modal-body">
          <p>
            Are you sure you want to <strong>{approvalAction === 'approved' ? 'approve' : 'reject'}</strong> this swap request?
          </p>
          {approvalAction === 'approved' && (
            <p className="text-warning">
              This will swap the shifts between the two employees.
            </p>
          )}
          <div className="form-group">
            <label>Comment (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Add a comment..."
            />
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={() => setShowApprovalModal(false)}
            disabled={processing}
          >
            Cancel
          </button>
          <button
            className={`btn ${approvalAction === 'approved' ? 'btn-success' : 'btn-danger'}`}
            onClick={handleApproval}
            disabled={processing}
          >
            {processing ? 'Processing...' : (approvalAction === 'approved' ? 'Approve' : 'Reject')}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default SwapRequests;
