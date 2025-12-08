import { useState, useEffect } from 'react';
import { shiftAPI } from '../../services/api';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  HiOutlineClock,
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineMoon,
  HiOutlineSun,
  HiOutlineRefresh,
  HiOutlineCheck,
  HiOutlineX,
} from 'react-icons/hi';
import './Shifts.scss';

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
  { id: 'sunday', label: 'Sun' },
];

const COLOR_OPTIONS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

const DEFAULT_SHIFT = {
  name: '',
  code: '',
  startTime: '09:00',
  endTime: '17:00',
  gracePeriod: {
    lateArrival: 15,
    earlyDeparture: 0,
  },
  halfDay: {
    firstHalfEnd: '13:00',
    secondHalfStart: '14:00',
  },
  breakTime: {
    enabled: true,
    startTime: '13:00',
    endTime: '14:00',
    duration: 60,
    isPaid: false,
  },
  workingHours: 8,
  isNightShift: false,
  isFlexible: false,
  flexibleWindow: {
    startFrom: '08:00',
    startTo: '10:00',
  },
  overtime: {
    enabled: true,
    minMinutes: 30,
    maxHoursPerDay: 4,
    requiresApproval: true,
    multiplier: 1.5,
  },
  workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  color: '#3b82f6',
  isDefault: false,
};

const Shifts = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(DEFAULT_SHIFT);

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      const res = await shiftAPI.getAll();
      setShifts(res.data.data || []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      toast.error('Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedShift(null);
    setForm(DEFAULT_SHIFT);
    setShowModal(true);
  };

  const handleEdit = (shift) => {
    setSelectedShift(shift);
    setForm({
      name: shift.name || '',
      code: shift.code || '',
      startTime: shift.startTime || '09:00',
      endTime: shift.endTime || '17:00',
      gracePeriod: {
        lateArrival: shift.gracePeriod?.lateArrival ?? 15,
        earlyDeparture: shift.gracePeriod?.earlyDeparture ?? 0,
      },
      halfDay: {
        firstHalfEnd: shift.halfDay?.firstHalfEnd || '13:00',
        secondHalfStart: shift.halfDay?.secondHalfStart || '14:00',
      },
      breakTime: {
        enabled: shift.breakTime?.enabled ?? true,
        startTime: shift.breakTime?.startTime || '13:00',
        endTime: shift.breakTime?.endTime || '14:00',
        duration: shift.breakTime?.duration ?? 60,
        isPaid: shift.breakTime?.isPaid ?? false,
      },
      workingHours: shift.workingHours ?? 8,
      isNightShift: shift.isNightShift ?? false,
      isFlexible: shift.isFlexible ?? false,
      flexibleWindow: {
        startFrom: shift.flexibleWindow?.startFrom || '08:00',
        startTo: shift.flexibleWindow?.startTo || '10:00',
      },
      overtime: {
        enabled: shift.overtime?.enabled ?? true,
        minMinutes: shift.overtime?.minMinutes ?? 30,
        maxHoursPerDay: shift.overtime?.maxHoursPerDay ?? 4,
        requiresApproval: shift.overtime?.requiresApproval ?? true,
        multiplier: shift.overtime?.multiplier ?? 1.5,
      },
      workingDays: shift.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      color: shift.color || '#3b82f6',
      isDefault: shift.isDefault ?? false,
    });
    setShowModal(true);
  };

  const handleDelete = (shift) => {
    setSelectedShift(shift);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await shiftAPI.delete(selectedShift._id);
      toast.success('Shift deleted successfully');
      setShowDeleteModal(false);
      setSelectedShift(null);
      fetchShifts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete shift');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (selectedShift) {
        await shiftAPI.update(selectedShift._id, form);
        toast.success('Shift updated successfully');
      } else {
        await shiftAPI.create(form);
        toast.success('Shift created successfully');
      }
      setShowModal(false);
      fetchShifts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save shift');
    } finally {
      setSaving(false);
    }
  };

  const toggleWorkingDay = (day) => {
    const days = form.workingDays.includes(day)
      ? form.workingDays.filter(d => d !== day)
      : [...form.workingDays, day];
    setForm({ ...form, workingDays: days });
  };

  const formatTime = (time) => {
    if (!time) return '-';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return '-';
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let minutes = (eh * 60 + em) - (sh * 60 + sm);
    if (minutes < 0) minutes += 24 * 60; // Handle night shifts
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="shifts-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Shift Management</h1>
          <p>Configure work shifts, timings, and attendance rules</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={fetchShifts}>
            <HiOutlineRefresh /> Refresh
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>
            <HiOutlinePlus /> Add Shift
          </button>
        </div>
      </div>

      {/* Shifts Grid */}
      {shifts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <HiOutlineClock />
          </div>
          <h3>No Shifts Configured</h3>
          <p>Create your first shift to start managing employee work schedules</p>
          <button className="btn btn-primary" onClick={handleCreate}>
            <HiOutlinePlus /> Create Shift
          </button>
        </div>
      ) : (
        <div className="shifts-grid">
          {shifts.map((shift) => (
            <div
              key={shift._id}
              className={`shift-card ${shift.isDefault ? 'default' : ''}`}
              style={{ '--shift-color': shift.color || '#3b82f6' }}
            >
              <div className="shift-header">
                <div className="shift-color" style={{ background: shift.color || '#3b82f6' }} />
                <div className="shift-title">
                  <h3>{shift.name}</h3>
                  <span className="shift-code">{shift.code}</span>
                </div>
                <div className="shift-badges">
                  {shift.isNightShift && (
                    <span className="badge badge-night">
                      <HiOutlineMoon /> Night
                    </span>
                  )}
                  {shift.isFlexible && (
                    <span className="badge badge-flex">Flexible</span>
                  )}
                  {shift.isDefault && (
                    <span className="badge badge-default">Default</span>
                  )}
                </div>
              </div>

              <div className="shift-timing">
                <div className="time-block">
                  <span className="time-label">Start</span>
                  <span className="time-value">{formatTime(shift.startTime)}</span>
                </div>
                <div className="time-separator">→</div>
                <div className="time-block">
                  <span className="time-label">End</span>
                  <span className="time-value">{formatTime(shift.endTime)}</span>
                </div>
                <div className="time-block duration">
                  <span className="time-label">Duration</span>
                  <span className="time-value">{calculateDuration(shift.startTime, shift.endTime)}</span>
                </div>
              </div>

              <div className="shift-days">
                {DAYS_OF_WEEK.map((day) => (
                  <span
                    key={day.id}
                    className={`day ${shift.workingDays?.includes(day.id) ? 'active' : ''}`}
                  >
                    {day.label}
                  </span>
                ))}
              </div>

              <div className="shift-details">
                <div className="detail-row">
                  <span className="detail-label">Working Hours</span>
                  <span className="detail-value">{shift.workingHours}h</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Late Grace</span>
                  <span className="detail-value">{shift.gracePeriod?.lateArrival || 0} min</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Break</span>
                  <span className="detail-value">
                    {shift.breakTime?.enabled ? `${shift.breakTime.duration} min` : 'None'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Overtime</span>
                  <span className="detail-value">
                    {shift.overtime?.enabled ? (
                      <span className="overtime-enabled">
                        <HiOutlineCheck /> {shift.overtime.multiplier}x
                      </span>
                    ) : (
                      <span className="overtime-disabled"><HiOutlineX /></span>
                    )}
                  </span>
                </div>
              </div>

              <div className="shift-actions">
                <button className="btn btn-icon" onClick={() => handleEdit(shift)} title="Edit">
                  <HiOutlinePencil />
                </button>
                {!shift.isDefault && (
                  <button
                    className="btn btn-icon btn-danger"
                    onClick={() => handleDelete(shift)}
                    title="Delete"
                  >
                    <HiOutlineTrash />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedShift ? 'Edit Shift' : 'Create New Shift'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-body shift-form">
            {/* Basic Info */}
            <div className="form-section">
              <h4>Basic Information</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Shift Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Morning Shift"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Shift Code *</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., MORNING"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Color</label>
                <div className="color-picker">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`color-option ${form.color === color ? 'selected' : ''}`}
                      style={{ background: color }}
                      onClick={() => setForm({ ...form, color })}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Timing */}
            <div className="form-section">
              <h4>Work Timing</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Start Time *</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Time *</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Working Hours</label>
                  <input
                    type="number"
                    value={form.workingHours}
                    onChange={(e) => setForm({ ...form, workingHours: parseFloat(e.target.value) || 8 })}
                    min="1"
                    max="24"
                    step="0.5"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Working Days</label>
                <div className="days-selector">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.id}
                      type="button"
                      className={`day-btn ${form.workingDays.includes(day.id) ? 'selected' : ''}`}
                      onClick={() => toggleWorkingDay(day.id)}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.isNightShift}
                    onChange={(e) => setForm({ ...form, isNightShift: e.target.checked })}
                  />
                  <HiOutlineMoon />
                  Night Shift
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.isFlexible}
                    onChange={(e) => setForm({ ...form, isFlexible: e.target.checked })}
                  />
                  <HiOutlineClock />
                  Flexible Timing
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  />
                  <HiOutlineCheck />
                  Default Shift
                </label>
              </div>

              {form.isFlexible && (
                <div className="form-grid">
                  <div className="form-group">
                    <label>Flexible Start From</label>
                    <input
                      type="time"
                      value={form.flexibleWindow.startFrom}
                      onChange={(e) => setForm({
                        ...form,
                        flexibleWindow: { ...form.flexibleWindow, startFrom: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Flexible Start To</label>
                    <input
                      type="time"
                      value={form.flexibleWindow.startTo}
                      onChange={(e) => setForm({
                        ...form,
                        flexibleWindow: { ...form.flexibleWindow, startTo: e.target.value }
                      })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Grace Period */}
            <div className="form-section">
              <h4>Grace Period</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Late Arrival Grace (minutes)</label>
                  <input
                    type="number"
                    value={form.gracePeriod.lateArrival}
                    onChange={(e) => setForm({
                      ...form,
                      gracePeriod: { ...form.gracePeriod, lateArrival: parseInt(e.target.value) || 0 }
                    })}
                    min="0"
                    max="60"
                  />
                </div>
                <div className="form-group">
                  <label>Early Departure Grace (minutes)</label>
                  <input
                    type="number"
                    value={form.gracePeriod.earlyDeparture}
                    onChange={(e) => setForm({
                      ...form,
                      gracePeriod: { ...form.gracePeriod, earlyDeparture: parseInt(e.target.value) || 0 }
                    })}
                    min="0"
                    max="60"
                  />
                </div>
              </div>
            </div>

            {/* Break Time */}
            <div className="form-section">
              <h4>
                <label className="section-toggle">
                  <input
                    type="checkbox"
                    checked={form.breakTime.enabled}
                    onChange={(e) => setForm({
                      ...form,
                      breakTime: { ...form.breakTime, enabled: e.target.checked }
                    })}
                  />
                  Break Time
                </label>
              </h4>
              {form.breakTime.enabled && (
                <>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Break Start</label>
                      <input
                        type="time"
                        value={form.breakTime.startTime}
                        onChange={(e) => setForm({
                          ...form,
                          breakTime: { ...form.breakTime, startTime: e.target.value }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Break End</label>
                      <input
                        type="time"
                        value={form.breakTime.endTime}
                        onChange={(e) => setForm({
                          ...form,
                          breakTime: { ...form.breakTime, endTime: e.target.value }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Duration (minutes)</label>
                      <input
                        type="number"
                        value={form.breakTime.duration}
                        onChange={(e) => setForm({
                          ...form,
                          breakTime: { ...form.breakTime, duration: parseInt(e.target.value) || 60 }
                        })}
                        min="0"
                        max="180"
                      />
                    </div>
                  </div>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.breakTime.isPaid}
                      onChange={(e) => setForm({
                        ...form,
                        breakTime: { ...form.breakTime, isPaid: e.target.checked }
                      })}
                    />
                    Paid Break
                  </label>
                </>
              )}
            </div>

            {/* Half Day */}
            <div className="form-section">
              <h4>Half Day Settings</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>First Half Ends At</label>
                  <input
                    type="time"
                    value={form.halfDay.firstHalfEnd}
                    onChange={(e) => setForm({
                      ...form,
                      halfDay: { ...form.halfDay, firstHalfEnd: e.target.value }
                    })}
                  />
                </div>
                <div className="form-group">
                  <label>Second Half Starts At</label>
                  <input
                    type="time"
                    value={form.halfDay.secondHalfStart}
                    onChange={(e) => setForm({
                      ...form,
                      halfDay: { ...form.halfDay, secondHalfStart: e.target.value }
                    })}
                  />
                </div>
              </div>
            </div>

            {/* Overtime */}
            <div className="form-section">
              <h4>
                <label className="section-toggle">
                  <input
                    type="checkbox"
                    checked={form.overtime.enabled}
                    onChange={(e) => setForm({
                      ...form,
                      overtime: { ...form.overtime, enabled: e.target.checked }
                    })}
                  />
                  Overtime
                </label>
              </h4>
              {form.overtime.enabled && (
                <>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Min Minutes to Count OT</label>
                      <input
                        type="number"
                        value={form.overtime.minMinutes}
                        onChange={(e) => setForm({
                          ...form,
                          overtime: { ...form.overtime, minMinutes: parseInt(e.target.value) || 30 }
                        })}
                        min="0"
                        max="120"
                      />
                    </div>
                    <div className="form-group">
                      <label>Max OT Hours/Day</label>
                      <input
                        type="number"
                        value={form.overtime.maxHoursPerDay}
                        onChange={(e) => setForm({
                          ...form,
                          overtime: { ...form.overtime, maxHoursPerDay: parseInt(e.target.value) || 4 }
                        })}
                        min="1"
                        max="12"
                      />
                    </div>
                    <div className="form-group">
                      <label>OT Multiplier</label>
                      <input
                        type="number"
                        value={form.overtime.multiplier}
                        onChange={(e) => setForm({
                          ...form,
                          overtime: { ...form.overtime, multiplier: parseFloat(e.target.value) || 1.5 }
                        })}
                        min="1"
                        max="3"
                        step="0.25"
                      />
                    </div>
                  </div>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.overtime.requiresApproval}
                      onChange={(e) => setForm({
                        ...form,
                        overtime: { ...form.overtime, requiresApproval: e.target.checked }
                      })}
                    />
                    Requires Approval
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <LoadingSpinner size="sm" /> : (selectedShift ? 'Update Shift' : 'Create Shift')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Shift"
        size="sm"
      >
        <div className="modal-body">
          <p>Are you sure you want to delete <strong>{selectedShift?.name}</strong>?</p>
          <p className="text-muted">This action cannot be undone. Employees assigned to this shift may need to be reassigned.</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={confirmDelete}>
            Delete Shift
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Shifts;
