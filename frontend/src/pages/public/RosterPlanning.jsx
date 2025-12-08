import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  HiOutlineCalendar,
  HiOutlineSave,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
} from 'react-icons/hi';
import './RosterPlanning.scss';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const RosterPlanning = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [linkData, setLinkData] = useState(null);
  const [schedules, setSchedules] = useState({});
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    fetchRosterData();
  }, [token]);

  const fetchRosterData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/duty-roster/public/${token}`);
      setLinkData(res.data.data);

      // Initialize schedules from existing data
      const existingSchedules = {};
      res.data.data.existingSchedules?.forEach(schedule => {
        const key = `${schedule.employee}-${schedule.date.split('T')[0]}`;
        existingSchedules[key] = {
          shift: schedule.shift?._id,
          dayType: schedule.dayType || 'regular',
          notes: schedule.notes || '',
        };
      });
      setSchedules(existingSchedules);
    } catch (err) {
      console.error('Error fetching roster data:', err);
      setError(err.response?.data?.message || 'Failed to load roster data');
    } finally {
      setLoading(false);
    }
  };

  // Generate days of the month
  const daysInMonth = useMemo(() => {
    if (!linkData) return [];
    const { month, year } = linkData.link;
    const days = [];
    const numDays = new Date(year, month, 0).getDate();

    for (let i = 1; i <= numDays; i++) {
      const date = new Date(year, month - 1, i);
      days.push({
        date: i,
        fullDate: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      });
    }
    return days;
  }, [linkData]);

  const handleScheduleChange = (employeeId, fullDate, field, value) => {
    const key = `${employeeId}-${fullDate}`;
    setSchedules(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const getSchedule = (employeeId, fullDate) => {
    const key = `${employeeId}-${fullDate}`;
    return schedules[key] || { shift: '', dayType: 'regular', notes: '' };
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Convert schedules object to array
      const schedulesArray = [];
      Object.entries(schedules).forEach(([key, value]) => {
        if (value.shift || value.dayType !== 'regular') {
          const [employeeId, date] = key.split(/-(.+)/);
          schedulesArray.push({
            employee: employeeId,
            date,
            shift: value.shift || linkData.shifts[0]?._id,
            dayType: value.dayType,
            notes: value.notes,
          });
        }
      });

      await axios.post(`${API_URL}/duty-roster/public/${token}/save`, {
        schedules: schedulesArray,
      });

      toast.success('Roster saved successfully!');
    } catch (err) {
      console.error('Error saving roster:', err);
      toast.error(err.response?.data?.message || 'Failed to save roster');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Are you sure you want to mark this roster as complete? You may not be able to edit it afterwards.')) {
      return;
    }

    try {
      setCompleting(true);
      await handleSave();
      await axios.post(`${API_URL}/duty-roster/public/${token}/complete`);
      toast.success('Roster marked as complete!');
      fetchRosterData();
    } catch (err) {
      console.error('Error completing roster:', err);
      toast.error(err.response?.data?.message || 'Failed to complete roster');
    } finally {
      setCompleting(false);
    }
  };

  const getShiftColor = (shiftId) => {
    const shift = linkData?.shifts?.find(s => s._id === shiftId);
    return shift?.color || '#3b82f6';
  };

  const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
  };

  if (loading) {
    return (
      <div className="roster-planning-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading roster data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="roster-planning-page">
        <div className="error-state">
          <HiOutlineExclamationCircle className="error-icon" />
          <h2>Unable to Load Roster</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const isCompleted = linkData?.link?.status === 'completed';

  return (
    <div className="roster-planning-page">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="roster-header">
        <div className="header-content">
          <div className="header-info">
            <h1>
              <HiOutlineCalendar /> Duty Roster Planning
            </h1>
            <div className="meta">
              <span className="org-name">{linkData.organization}</span>
              <span className="separator">•</span>
              <span className="dept-name">{linkData.link.department?.name}</span>
              <span className="separator">•</span>
              <span className="period">
                {getMonthName(linkData.link.month)} {linkData.link.year}
              </span>
            </div>
          </div>
          <div className="header-actions">
            {!isCompleted && (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <HiOutlineSave />
                  {saving ? 'Saving...' : 'Save Progress'}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleComplete}
                  disabled={completing}
                >
                  <HiOutlineCheckCircle />
                  {completing ? 'Completing...' : 'Mark Complete'}
                </button>
              </>
            )}
            {isCompleted && (
              <span className="completed-badge">
                <HiOutlineCheckCircle /> Roster Completed
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Instructions */}
      {linkData.link.notes && (
        <div className="instructions-box">
          <strong>Notes from Admin:</strong> {linkData.link.notes}
        </div>
      )}

      {/* Legend */}
      <div className="legend">
        <span className="legend-title">Shifts:</span>
        {linkData.shifts?.map(shift => (
          <div key={shift._id} className="legend-item">
            <span
              className="color-dot"
              style={{ backgroundColor: shift.color }}
            />
            <span>{shift.name} ({shift.startTime} - {shift.endTime})</span>
          </div>
        ))}
        <div className="legend-item">
          <span className="color-dot day-off" />
          <span>Day Off</span>
        </div>
      </div>

      {/* Roster Grid */}
      <div className="roster-container">
        <div className="roster-grid-wrapper">
          <table className="roster-grid">
            <thead>
              <tr>
                <th className="employee-header">Employee</th>
                {daysInMonth.map(day => (
                  <th
                    key={day.fullDate}
                    className={`day-header ${day.isWeekend ? 'weekend' : ''}`}
                  >
                    <div className="day-name">{day.dayName}</div>
                    <div className="day-date">{day.date}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linkData.employees?.map(employee => (
                <tr key={employee._id}>
                  <td className="employee-cell">
                    <div className="employee-name">
                      {employee.firstName} {employee.lastName}
                    </div>
                    <div className="employee-id">{employee.employeeId}</div>
                  </td>
                  {daysInMonth.map(day => {
                    const schedule = getSchedule(employee._id, day.fullDate);
                    return (
                      <td
                        key={day.fullDate}
                        className={`schedule-cell ${day.isWeekend ? 'weekend' : ''} ${schedule.dayType === 'day_off' ? 'day-off' : ''}`}
                      >
                        {!isCompleted ? (
                          <select
                            value={schedule.dayType === 'day_off' ? 'off' : (schedule.shift || '')}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === 'off') {
                                handleScheduleChange(employee._id, day.fullDate, 'dayType', 'day_off');
                                handleScheduleChange(employee._id, day.fullDate, 'shift', '');
                              } else {
                                handleScheduleChange(employee._id, day.fullDate, 'dayType', 'regular');
                                handleScheduleChange(employee._id, day.fullDate, 'shift', value);
                              }
                            }}
                            className="shift-select"
                            style={{
                              backgroundColor: schedule.shift ? getShiftColor(schedule.shift) + '20' : 'transparent',
                              borderColor: schedule.shift ? getShiftColor(schedule.shift) : '#d1d5db',
                            }}
                          >
                            <option value="">-</option>
                            {linkData.shifts?.map(shift => (
                              <option key={shift._id} value={shift._id}>
                                {shift.code}
                              </option>
                            ))}
                            <option value="off">OFF</option>
                          </select>
                        ) : (
                          <div
                            className="shift-display"
                            style={{
                              backgroundColor: schedule.shift ? getShiftColor(schedule.shift) + '20' : '#f3f4f6',
                              borderColor: schedule.shift ? getShiftColor(schedule.shift) : '#d1d5db',
                              color: schedule.shift ? getShiftColor(schedule.shift) : '#6b7280',
                            }}
                          >
                            {schedule.dayType === 'day_off' ? 'OFF' : (
                              linkData.shifts?.find(s => s._id === schedule.shift)?.code || '-'
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <footer className="roster-footer">
        <p>
          Link expires on {new Date(linkData.link.expiresAt).toLocaleDateString()}
        </p>
      </footer>
    </div>
  );
};

export default RosterPlanning;
