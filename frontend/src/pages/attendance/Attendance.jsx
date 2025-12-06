import { useState, useEffect } from 'react';
import { attendanceAPI, departmentAPI, branchAPI, employeeAPI } from '../../services/api';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  HiOutlineClock,
  HiOutlineCalendar,
  HiOutlineLocationMarker,
  HiOutlineFilter,
  HiOutlineDownload,
} from 'react-icons/hi';
import './Attendance.scss';

const Attendance = () => {
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [summary, setSummary] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    department: '',
    branch: '',
    status: '',
  });

  const [manualForm, setManualForm] = useState({
    employee: '',
    date: new Date().toISOString().split('T')[0],
    clockIn: '09:00',
    clockOut: '17:00',
    status: 'present',
    notes: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchAttendanceList();
  }, [filters]);

  const fetchInitialData = async () => {
    try {
      const [todayRes, deptRes, branchRes, empRes] = await Promise.all([
        attendanceAPI.getToday(),
        departmentAPI.getAll(),
        branchAPI.getAll(),
        employeeAPI.getDirectory(),
      ]);

      setTodayAttendance(todayRes.data.data);
      setDepartments(deptRes.data.data);
      setBranches(branchRes.data.data);
      setEmployees(empRes.data.data);

      // Fetch summary for current month
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const summaryRes = await attendanceAPI.getSummary({
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
      });
      setSummary(summaryRes.data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceList = async () => {
    try {
      const res = await attendanceAPI.getAll(filters);
      setAttendanceList(res.data.data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const handleClockIn = async () => {
    setClockingIn(true);
    try {
      // Get current location
      let locationData = {};
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
            });
          });
          locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        } catch (locError) {
          console.log('Location not available:', locError);
        }
      }

      const res = await attendanceAPI.clockIn(locationData);
      setTodayAttendance(res.data.data);
      toast.success(res.data.message);
      fetchAttendanceList();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to clock in');
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    setClockingOut(true);
    try {
      let locationData = {};
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
            });
          });
          locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        } catch (locError) {
          console.log('Location not available:', locError);
        }
      }

      const res = await attendanceAPI.clockOut(locationData);
      setTodayAttendance(res.data.data);
      toast.success(res.data.message);
      fetchAttendanceList();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to clock out');
    } finally {
      setClockingOut(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      const clockInDateTime = `${manualForm.date}T${manualForm.clockIn}:00`;
      const clockOutDateTime = manualForm.clockOut ? `${manualForm.date}T${manualForm.clockOut}:00` : null;

      await attendanceAPI.createManual({
        employee: manualForm.employee,
        date: manualForm.date,
        clockIn: clockInDateTime,
        clockOut: clockOutDateTime,
        status: manualForm.status,
        notes: manualForm.notes,
      });

      toast.success('Manual attendance created successfully');
      setShowManualModal(false);
      setManualForm({
        employee: '',
        date: new Date().toISOString().split('T')[0],
        clockIn: '09:00',
        clockOut: '17:00',
        status: 'present',
        notes: '',
      });
      fetchAttendanceList();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create attendance');
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      present: 'badge-success',
      absent: 'badge-danger',
      late: 'badge-warning',
      early_leave: 'badge-warning',
      half_day: 'badge-info',
      on_leave: 'badge-info',
      holiday: 'badge-gray',
    };
    return badges[status] || 'badge-gray';
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="attendance-page">
      <div className="page-header">
        <h1>Attendance</h1>
        <div className="actions">
          <button className="btn btn-outline" onClick={() => setShowManualModal(true)}>
            <HiOutlineCalendar /> Manual Entry
          </button>
        </div>
      </div>

      {/* Clock In/Out Card */}
      <div className="clock-card">
        <div className="clock-info">
          <HiOutlineClock className="clock-icon" />
          <div>
            <h3>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
            <p className="clock-status">
              {todayAttendance?.clockIn?.time
                ? `Clocked in at ${formatTime(todayAttendance.clockIn.time)}`
                : 'Not clocked in yet'}
              {todayAttendance?.clockOut?.time && ` • Clocked out at ${formatTime(todayAttendance.clockOut.time)}`}
            </p>
          </div>
        </div>
        <div className="clock-actions">
          {!todayAttendance?.clockIn?.time ? (
            <button
              className="btn btn-primary btn-lg"
              onClick={handleClockIn}
              disabled={clockingIn}
            >
              {clockingIn ? <LoadingSpinner size="sm" /> : <><HiOutlineLocationMarker /> Clock In</>}
            </button>
          ) : !todayAttendance?.clockOut?.time ? (
            <button
              className="btn btn-danger btn-lg"
              onClick={handleClockOut}
              disabled={clockingOut}
            >
              {clockingOut ? <LoadingSpinner size="sm" /> : <><HiOutlineClock /> Clock Out</>}
            </button>
          ) : (
            <div className="work-hours">
              <span className="hours">{todayAttendance.workHours?.actual?.toFixed(1) || 0}h</span>
              <span className="label">worked today</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <HiOutlineClock />
          </div>
          <div className="stat-value">
            {summary?.byStatus?.find(s => s._id === 'present')?.count || 0}
          </div>
          <div className="stat-label">Present This Month</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <HiOutlineClock />
          </div>
          <div className="stat-value">
            {summary?.byStatus?.find(s => s._id === 'late')?.count || 0}
          </div>
          <div className="stat-label">Late Arrivals</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <HiOutlineClock />
          </div>
          <div className="stat-value">
            {summary?.byStatus?.find(s => s._id === 'absent')?.count || 0}
          </div>
          <div className="stat-label">Absences</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <HiOutlineClock />
          </div>
          <div className="stat-value">
            {(summary?.byStatus?.reduce((acc, s) => acc + (s.totalOvertime || 0), 0) || 0).toFixed(1)}h
          </div>
          <div className="stat-label">Overtime Hours</div>
        </div>
      </div>

      {/* Attendance List */}
      <div className="card">
        <div className="card-header">
          <h3>Attendance Records</h3>
          <div className="filters">
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            />
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="half_day">Half Day</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Work Hours</th>
                <th>Status</th>
                <th>Overtime</th>
              </tr>
            </thead>
            <tbody>
              {attendanceList.map((att) => (
                <tr key={att._id}>
                  <td>
                    <div className="employee-cell">
                      <div className="avatar">
                        {att.employee?.firstName?.charAt(0)}{att.employee?.lastName?.charAt(0)}
                      </div>
                      <div>
                        <div className="name">{att.employee?.firstName} {att.employee?.lastName}</div>
                        <div className="id">{att.employee?.employeeId}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="time-cell">
                      <span className="time">{formatTime(att.clockIn?.time)}</span>
                      {att.isLate && <span className="late-badge">+{att.lateMinutes}m</span>}
                    </div>
                  </td>
                  <td>
                    <div className="time-cell">
                      <span className="time">{formatTime(att.clockOut?.time)}</span>
                      {att.isEarlyLeave && <span className="early-badge">-{att.earlyLeaveMinutes}m</span>}
                    </div>
                  </td>
                  <td>{att.workHours?.actual?.toFixed(1) || 0}h</td>
                  <td>
                    <span className={`badge ${getStatusBadge(att.status)}`}>
                      {att.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    {att.workHours?.overtime > 0 ? (
                      <span className="overtime">+{att.workHours.overtime.toFixed(1)}h</span>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {attendanceList.length === 0 && (
            <div className="empty-state">No attendance records found for this date.</div>
          )}
        </div>
      </div>

      {/* Manual Entry Modal */}
      <Modal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        title="Manual Attendance Entry"
        size="md"
      >
        <form onSubmit={handleManualSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Employee *</label>
              <select
                value={manualForm.employee}
                onChange={(e) => setManualForm({ ...manualForm, employee: e.target.value })}
                required
              >
                <option value="">Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeId})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                value={manualForm.date}
                onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Clock In Time *</label>
                <input
                  type="time"
                  value={manualForm.clockIn}
                  onChange={(e) => setManualForm({ ...manualForm, clockIn: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Clock Out Time</label>
                <input
                  type="time"
                  value={manualForm.clockOut}
                  onChange={(e) => setManualForm({ ...manualForm, clockOut: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={manualForm.status}
                onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
              >
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="half_day">Half Day</option>
                <option value="absent">Absent</option>
              </select>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={manualForm.notes}
                onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                rows={2}
                placeholder="Reason for manual entry..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowManualModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Entry
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Attendance;
