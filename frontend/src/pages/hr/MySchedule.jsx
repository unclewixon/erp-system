import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  HiOutlineCalendar,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineSwitchHorizontal,
  HiOutlineClock,
  HiOutlineLocationMarker,
} from 'react-icons/hi';
import './MySchedule.scss';

const MySchedule = () => {
  const [schedules, setSchedules] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [colleagues, setColleagues] = useState([]);
  const [colleagueSchedules, setColleagueSchedules] = useState([]);
  const [swapFormData, setSwapFormData] = useState({
    swapWith: '',
    targetSchedule: '',
    reason: '',
  });

  useEffect(() => {
    fetchData();
  }, [currentMonth, currentYear]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [scheduleRes, swapRes] = await Promise.all([
        api.get(`/duty-roster/my-schedule?month=${currentMonth}&year=${currentYear}`),
        api.get('/duty-roster/swap-requests?type=my'),
      ]);
      setSchedules(scheduleRes.data.data || []);
      setSwapRequests(swapRes.data.data || []);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const daysInMonth = useMemo(() => {
    const days = [];
    const numDays = new Date(currentYear, currentMonth, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();

    // Add empty slots for days before the first day
    for (let i = 0; i < firstDay; i++) {
      days.push({ empty: true });
    }

    for (let i = 1; i <= numDays; i++) {
      const date = new Date(currentYear, currentMonth - 1, i);
      const dateStr = date.toISOString().split('T')[0];
      const schedule = schedules.find(s => s.date?.split('T')[0] === dateStr);

      days.push({
        date: i,
        fullDate: dateStr,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        isToday: dateStr === new Date().toISOString().split('T')[0],
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        schedule,
      });
    }
    return days;
  }, [schedules, currentMonth, currentYear]);

  const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
  };

  const navigateMonth = (direction) => {
    if (direction === 'prev') {
      if (currentMonth === 1) {
        setCurrentMonth(12);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 12) {
        setCurrentMonth(1);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const openSwapModal = async (schedule) => {
    setSelectedSchedule(schedule);
    setSwapFormData({ swapWith: '', targetSchedule: '', reason: '' });

    try {
      // Fetch colleagues (same department)
      const colleagueRes = await api.get(`/duty-roster/schedules?department=${schedule.department?._id}&month=${currentMonth}&year=${currentYear}`);
      const allSchedules = colleagueRes.data.data || [];
      // Get unique colleagues
      const uniqueColleagues = {};
      allSchedules.forEach(s => {
        if (s.employee?._id !== schedule.employee?._id) {
          uniqueColleagues[s.employee?._id] = s.employee;
        }
      });
      setColleagues(Object.values(uniqueColleagues));
      setColleagueSchedules(allSchedules.filter(s => s.employee?._id !== schedule.employee?._id));
    } catch (error) {
      console.error('Error fetching colleagues:', error);
    }

    setShowSwapModal(true);
  };

  const handleSwapFormChange = (e) => {
    const { name, value } = e.target;
    setSwapFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'swapWith') {
      // Reset target schedule when colleague changes
      setSwapFormData(prev => ({ ...prev, targetSchedule: '' }));
    }
  };

  const getColleagueSchedulesForSwap = () => {
    if (!swapFormData.swapWith) return [];
    return colleagueSchedules.filter(s => s.employee?._id === swapFormData.swapWith);
  };

  const handleSwapSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/duty-roster/swap-requests', {
        swapWith: swapFormData.swapWith,
        requesterSchedule: selectedSchedule._id,
        targetSchedule: swapFormData.targetSchedule,
        reason: swapFormData.reason,
      });
      toast.success('Swap request submitted');
      setShowSwapModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit swap request');
    }
  };

  const handleRespondToSwap = async (requestId, status) => {
    try {
      await api.put(`/duty-roster/swap-requests/${requestId}/colleague-response`, {
        status,
      });
      toast.success(`Swap request ${status}`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to respond to swap request');
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
      case 'pending_admin': return 'Awaiting Admin';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="my-schedule-page">
      <div className="page-header">
        <div className="header-content">
          <h1><HiOutlineCalendar /> My Duty Schedule</h1>
          <p>View your assigned shifts and request swaps</p>
        </div>
        <div className="month-navigation">
          <button className="btn-nav" onClick={() => navigateMonth('prev')}>
            <HiOutlineChevronLeft />
          </button>
          <span className="current-month">
            {getMonthName(currentMonth)} {currentYear}
          </span>
          <button className="btn-nav" onClick={() => navigateMonth('next')}>
            <HiOutlineChevronRight />
          </button>
        </div>
      </div>

      {/* Calendar View */}
      <div className="schedule-calendar">
        <div className="calendar-header">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="day-header">{day}</div>
          ))}
        </div>
        <div className="calendar-body">
          {daysInMonth.map((day, index) => (
            <div
              key={index}
              className={`calendar-day ${day.empty ? 'empty' : ''} ${day.isToday ? 'today' : ''} ${day.isWeekend ? 'weekend' : ''} ${day.schedule?.dayType === 'day_off' ? 'day-off' : ''}`}
            >
              {!day.empty && (
                <>
                  <div className="day-number">{day.date}</div>
                  {day.schedule ? (
                    <div
                      className="shift-info"
                      style={{ backgroundColor: day.schedule.shift?.color + '20', borderColor: day.schedule.shift?.color }}
                    >
                      {day.schedule.dayType === 'day_off' ? (
                        <span className="off-label">OFF</span>
                      ) : (
                        <>
                          <div className="shift-name">{day.schedule.shift?.name}</div>
                          <div className="shift-time">
                            <HiOutlineClock />
                            {day.schedule.shift?.startTime} - {day.schedule.shift?.endTime}
                          </div>
                        </>
                      )}
                      {day.schedule.dayType !== 'day_off' && (
                        <button
                          className="btn-swap"
                          onClick={() => openSwapModal(day.schedule)}
                          title="Request Swap"
                        >
                          <HiOutlineSwitchHorizontal />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="no-schedule">-</div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Swap Requests Section */}
      <div className="swap-requests-section">
        <h2>Swap Requests</h2>
        {swapRequests.length === 0 ? (
          <div className="empty-state">
            <p>No swap requests</p>
          </div>
        ) : (
          <div className="swap-requests-list">
            {swapRequests.map(request => (
              <div key={request._id} className="swap-request-card">
                <div className="request-header">
                  <span className={`badge ${getStatusBadgeClass(request.status)}`}>
                    {formatStatusLabel(request.status)}
                  </span>
                  <span className="request-date">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="request-body">
                  <div className="swap-details">
                    <div className="swap-from">
                      <strong>From:</strong>
                      <div>{request.requestedBy?.firstName} {request.requestedBy?.lastName}</div>
                      <div className="date">{new Date(request.requesterDate).toLocaleDateString()}</div>
                    </div>
                    <HiOutlineSwitchHorizontal className="swap-icon" />
                    <div className="swap-to">
                      <strong>To:</strong>
                      <div>{request.swapWith?.firstName} {request.swapWith?.lastName}</div>
                      <div className="date">{new Date(request.targetDate).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="request-reason">
                    <strong>Reason:</strong> {request.reason}
                  </div>
                </div>
                {request.status === 'pending_colleague' && request.swapWith?._id === request.requestedBy?._id && (
                  <div className="request-actions">
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleRespondToSwap(request._id, 'accepted')}
                    >
                      Accept
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRespondToSwap(request._id, 'declined')}
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Swap Request Modal */}
      <Modal
        isOpen={showSwapModal}
        onClose={() => setShowSwapModal(false)}
        title="Request Shift Swap"
        size="md"
      >
        <form onSubmit={handleSwapSubmit}>
          <div className="modal-body">
            <div className="current-shift-info">
              <strong>Your Shift:</strong>
              <div className="shift-details">
                <span>{new Date(selectedSchedule?.date).toLocaleDateString()}</span>
                <span>{selectedSchedule?.shift?.name}</span>
                <span>{selectedSchedule?.shift?.startTime} - {selectedSchedule?.shift?.endTime}</span>
              </div>
            </div>

            <div className="form-group">
              <label>Swap With *</label>
              <select
                name="swapWith"
                value={swapFormData.swapWith}
                onChange={handleSwapFormChange}
                required
              >
                <option value="">Select Colleague</option>
                {colleagues.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </div>

            {swapFormData.swapWith && (
              <div className="form-group">
                <label>Their Shift Date *</label>
                <select
                  name="targetSchedule"
                  value={swapFormData.targetSchedule}
                  onChange={handleSwapFormChange}
                  required
                >
                  <option value="">Select Date</option>
                  {getColleagueSchedulesForSwap().map(s => (
                    <option key={s._id} value={s._id}>
                      {new Date(s.date).toLocaleDateString()} - {s.shift?.name} ({s.shift?.startTime} - {s.shift?.endTime})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Reason for Swap *</label>
              <textarea
                name="reason"
                value={swapFormData.reason}
                onChange={handleSwapFormChange}
                rows={3}
                placeholder="Explain why you need this swap..."
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowSwapModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Submit Request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MySchedule;
