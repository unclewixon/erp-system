import { useState, useEffect } from 'react';
import { performanceAPI } from '../../services/api';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineFlag,
  HiOutlineClipboardCheck,
  HiOutlineStar,
  HiOutlineChartBar,
} from 'react-icons/hi';
import './Performance.scss';

const Performance = () => {
  const [activeTab, setActiveTab] = useState('my-goals');
  const [myGoals, setMyGoals] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);

  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    category: 'performance',
    priority: 'medium',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    keyResults: [],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [goalsRes, reviewsRes, cyclesRes, activeCycleRes, statsRes] = await Promise.all([
        performanceAPI.getMyGoals(),
        performanceAPI.getMyReviews().catch(() => ({ data: { data: [] } })),
        performanceAPI.getCycles(),
        performanceAPI.getActiveCycle().catch(() => ({ data: { data: null } })),
        performanceAPI.getStats().catch(() => ({ data: { data: {} } })),
      ]);

      setMyGoals(goalsRes.data.data);
      setMyReviews(reviewsRes.data.data);
      setCycles(cyclesRes.data.data);
      setActiveCycle(activeCycleRes.data.data);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    try {
      await performanceAPI.createGoal({
        ...goalForm,
        reviewCycle: activeCycle?._id,
      });
      toast.success('Goal created successfully');
      setShowGoalModal(false);
      setGoalForm({
        title: '',
        description: '',
        category: 'performance',
        priority: 'medium',
        startDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        keyResults: [],
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create goal');
    }
  };

  const handleUpdateProgress = async (goalId, progress) => {
    try {
      await performanceAPI.updateGoalProgress(goalId, { progress });
      toast.success('Progress updated');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update progress');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      not_started: 'badge-gray',
      in_progress: 'badge-info',
      on_hold: 'badge-warning',
      completed: 'badge-success',
      cancelled: 'badge-danger',
      pending: 'badge-warning',
      self_review: 'badge-info',
      manager_review: 'badge-primary',
      calibration: 'badge-warning',
      acknowledged: 'badge-success',
    };
    return badges[status] || 'badge-gray';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#6b7280',
      medium: '#3b82f6',
      high: '#f59e0b',
      critical: '#ef4444',
    };
    return colors[priority] || '#6b7280';
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="performance-page">
      <div className="page-header">
        <h1>Performance Management</h1>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => setShowGoalModal(true)}>
            <HiOutlinePlus /> Add Goal
          </button>
        </div>
      </div>

      {/* Active Cycle Banner */}
      {activeCycle && (
        <div className="cycle-banner">
          <div className="cycle-info">
            <HiOutlineClipboardCheck />
            <div>
              <strong>{activeCycle.name}</strong>
              <span>Review Cycle {activeCycle.year}</span>
            </div>
          </div>
          <span className={`badge ${getStatusBadge(activeCycle.status)}`}>
            {activeCycle.status}
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <HiOutlineFlag />
          </div>
          <div className="stat-value">{myGoals.length}</div>
          <div className="stat-label">My Goals</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <HiOutlineChartBar />
          </div>
          <div className="stat-value">
            {myGoals.filter(g => g.status === 'completed').length}
          </div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <HiOutlineClipboardCheck />
          </div>
          <div className="stat-value">{myReviews.length}</div>
          <div className="stat-label">Reviews</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <HiOutlineStar />
          </div>
          <div className="stat-value">
            {myReviews.find(r => r.finalRating)?.finalRating?.toFixed(1) || '-'}
          </div>
          <div className="stat-label">Last Rating</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'my-goals' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-goals')}
        >
          My Goals
        </button>
        <button
          className={`tab ${activeTab === 'my-reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-reviews')}
        >
          My Reviews
        </button>
        <button
          className={`tab ${activeTab === 'cycles' ? 'active' : ''}`}
          onClick={() => setActiveTab('cycles')}
        >
          Review Cycles
        </button>
      </div>

      {/* Tab Content */}
      <div className="card">
        {activeTab === 'my-goals' && (
          <div className="goals-list">
            {myGoals.map((goal) => (
              <div key={goal._id} className="goal-card">
                <div className="goal-header">
                  <div className="goal-priority" style={{ background: getPriorityColor(goal.priority) }} />
                  <h4>{goal.title}</h4>
                  <span className={`badge ${getStatusBadge(goal.status)}`}>
                    {goal.status?.replace('_', ' ')}
                  </span>
                </div>
                {goal.description && (
                  <p className="goal-description">{goal.description}</p>
                )}
                <div className="goal-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <span className="progress-text">{goal.progress}%</span>
                </div>
                <div className="goal-meta">
                  <span className="badge badge-outline">{goal.category}</span>
                  <span className="due-date">
                    Due: {new Date(goal.dueDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="goal-actions">
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => handleUpdateProgress(goal._id, Math.min(goal.progress + 10, 100))}
                  >
                    +10%
                  </button>
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => handleUpdateProgress(goal._id, 100)}
                  >
                    Complete
                  </button>
                </div>
              </div>
            ))}
            {myGoals.length === 0 && (
              <div className="empty-state">No goals found. Create your first goal!</div>
            )}
          </div>
        )}

        {activeTab === 'my-reviews' && (
          <div className="reviews-list">
            {myReviews.map((review) => (
              <div key={review._id} className="review-card">
                <div className="review-header">
                  <div>
                    <h4>{review.reviewCycle?.name}</h4>
                    <span className="review-type">{review.reviewCycle?.type}</span>
                  </div>
                  <span className={`badge ${getStatusBadge(review.status)}`}>
                    {review.status?.replace('_', ' ')}
                  </span>
                </div>
                <div className="review-details">
                  <div className="review-item">
                    <span>Reviewer</span>
                    <strong>{review.reviewer?.firstName} {review.reviewer?.lastName}</strong>
                  </div>
                  {review.finalRating && (
                    <div className="review-item">
                      <span>Final Rating</span>
                      <strong className="rating">{review.finalRating}/5</strong>
                    </div>
                  )}
                </div>
                {review.status === 'pending' && (
                  <div className="review-actions">
                    <button className="btn btn-sm btn-primary">
                      Start Self Review
                    </button>
                  </div>
                )}
              </div>
            ))}
            {myReviews.length === 0 && (
              <div className="empty-state">No reviews found</div>
            )}
          </div>
        )}

        {activeTab === 'cycles' && (
          <div className="cycles-list">
            {cycles.map((cycle) => (
              <div key={cycle._id} className="cycle-card">
                <div className="cycle-header">
                  <h4>{cycle.name}</h4>
                  <span className={`badge ${getStatusBadge(cycle.status)}`}>
                    {cycle.status}
                  </span>
                </div>
                <div className="cycle-meta">
                  <span>{cycle.type}</span>
                  <span>{cycle.year}</span>
                </div>
                <div className="cycle-dates">
                  <span>
                    {new Date(cycle.period.startDate).toLocaleDateString()} - {new Date(cycle.period.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
            {cycles.length === 0 && (
              <div className="empty-state">No review cycles found</div>
            )}
          </div>
        )}
      </div>

      {/* Create Goal Modal */}
      <Modal
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        title="Create Goal"
        size="md"
      >
        <form onSubmit={handleCreateGoal}>
          <div className="modal-body">
            <div className="form-group">
              <label>Goal Title *</label>
              <input
                type="text"
                value={goalForm.title}
                onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={goalForm.description}
                onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <select
                  value={goalForm.category}
                  onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value })}
                >
                  <option value="performance">Performance</option>
                  <option value="development">Development</option>
                  <option value="project">Project</option>
                  <option value="learning">Learning</option>
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={goalForm.priority}
                  onChange={(e) => setGoalForm({ ...goalForm, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  value={goalForm.startDate}
                  onChange={(e) => setGoalForm({ ...goalForm, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Due Date *</label>
                <input
                  type="date"
                  value={goalForm.dueDate}
                  onChange={(e) => setGoalForm({ ...goalForm, dueDate: e.target.value })}
                  min={goalForm.startDate}
                  required
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowGoalModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Goal
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Performance;
