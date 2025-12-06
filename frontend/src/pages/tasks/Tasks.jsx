import { useState, useEffect } from 'react';
import {
  HiOutlineClipboardList,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineCheck,
  HiOutlineClock,
  HiOutlineFlag,
  HiOutlineCalendar,
  HiOutlineUser,
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Tasks.scss';

const Tasks = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    dueDate: '',
    assignedTo: '',
    category: 'general',
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tasks');
      setTasks(response.data.data || []);
      const data = response.data.data || [];
      setStats({
        total: data.length,
        pending: data.filter(t => t.status === 'pending').length,
        inProgress: data.filter(t => t.status === 'in_progress').length,
        completed: data.filter(t => t.status === 'completed').length,
      });
    } catch (error) {
      // Mock data
      const mockTasks = [
        { _id: '1', title: 'Review Q4 Budget Report', description: 'Analyze and review the quarterly budget allocations', priority: 'high', status: 'pending', dueDate: '2024-12-15', assignedTo: { firstName: 'John', lastName: 'Doe' }, category: 'finance' },
        { _id: '2', title: 'Update Employee Handbook', description: 'Incorporate new policies into the handbook', priority: 'medium', status: 'in_progress', dueDate: '2024-12-20', assignedTo: { firstName: 'Jane', lastName: 'Smith' }, category: 'hr' },
        { _id: '3', title: 'Onboard New Developers', description: 'Complete onboarding for 3 new team members', priority: 'high', status: 'in_progress', dueDate: '2024-12-10', assignedTo: { firstName: 'Mike', lastName: 'Johnson' }, category: 'it' },
        { _id: '4', title: 'Quarterly Performance Reviews', description: 'Conduct Q4 performance reviews', priority: 'medium', status: 'pending', dueDate: '2024-12-18', assignedTo: { firstName: 'Sarah', lastName: 'Wilson' }, category: 'hr' },
        { _id: '5', title: 'IT Infrastructure Audit', description: 'Complete annual IT security audit', priority: 'low', status: 'completed', dueDate: '2024-12-01', assignedTo: { firstName: 'Tom', lastName: 'Brown' }, category: 'it' },
      ];
      setTasks(mockTasks);
      setStats({ total: 5, pending: 2, inProgress: 2, completed: 1 });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask._id}`, formData);
        toast.success('Task updated');
      } else {
        await api.post('/tasks', formData);
        toast.success('Task created');
      }
      setShowModal(false);
      resetForm();
      fetchTasks();
    } catch (error) {
      toast.error('Failed to save task');
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status });
      toast.success('Task status updated');
      fetchTasks();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', priority: 'medium', status: 'pending', dueDate: '', assignedTo: '', category: 'general' });
    setEditingTask(null);
  };

  const getPriorityBadge = (priority) => {
    const colors = { high: 'danger', medium: 'warning', low: 'secondary' };
    return <span className={`priority-badge ${priority}`}>{priority}</span>;
  };

  const getStatusBadge = (status) => {
    const styles = { pending: 'warning', in_progress: 'primary', completed: 'success' };
    return <span className={`badge badge-${styles[status]}`}>{status.replace('_', ' ')}</span>;
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || t.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const tabs = [
    { id: 'all', label: 'All Tasks', count: stats.total },
    { id: 'pending', label: 'Pending', count: stats.pending },
    { id: 'in_progress', label: 'In Progress', count: stats.inProgress },
    { id: 'completed', label: 'Completed', count: stats.completed },
  ];

  if (loading) return <div className="loading-state">Loading tasks...</div>;

  return (
    <div className="tasks-page">
      <div className="page-header">
        <div>
          <h1>Task Management</h1>
          <p>Manage and track team tasks</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <HiOutlinePlus /> New Task
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><HiOutlineClipboardList /></div>
          <div className="stat-content">
            <span className="stat-label">Total Tasks</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon"><HiOutlineClock /></div>
          <div className="stat-content">
            <span className="stat-label">Pending</span>
            <span className="stat-value">{stats.pending}</span>
          </div>
        </div>
        <div className="stat-card primary">
          <div className="stat-icon"><HiOutlineFlag /></div>
          <div className="stat-content">
            <span className="stat-label">In Progress</span>
            <span className="stat-value">{stats.inProgress}</span>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon"><HiOutlineCheck /></div>
          <div className="stat-content">
            <span className="stat-label">Completed</span>
            <span className="stat-value">{stats.completed}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(tab => (
          <button key={tab.id} className={`tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Tasks */}
      <div className="card">
        <div className="card-header">
          <h3>Tasks</h3>
          <div className="search-box">
            <HiOutlineSearch />
            <input type="text" placeholder="Search tasks..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="tasks-list">
          {filteredTasks.map(task => (
            <div key={task._id} className={`task-card ${task.status}`}>
              <div className="task-header">
                <h4>{task.title}</h4>
                <div className="task-meta">
                  {getPriorityBadge(task.priority)}
                  {getStatusBadge(task.status)}
                </div>
              </div>
              <p className="task-description">{task.description}</p>
              <div className="task-footer">
                <div className="task-info">
                  <span><HiOutlineUser /> {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : 'Unassigned'}</span>
                  <span><HiOutlineCalendar /> {new Date(task.dueDate).toLocaleDateString()}</span>
                </div>
                <div className="task-actions">
                  {task.status !== 'completed' && (
                    <button className="btn btn-ghost btn-sm" onClick={() => updateTaskStatus(task._id, task.status === 'pending' ? 'in_progress' : 'completed')}>
                      <HiOutlineCheck />
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditingTask(task); setFormData({ ...task, dueDate: task.dueDate?.split('T')[0] }); setShowModal(true); }}>
                    <HiOutlinePencil />
                  </button>
                  <button className="btn btn-ghost btn-sm text-danger"><HiOutlineTrash /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTask ? 'Edit Task' : 'New Task'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}><HiOutlineX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Title</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Priority</label>
                    <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Due Date</label>
                    <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingTask ? 'Update' : 'Create'} Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
