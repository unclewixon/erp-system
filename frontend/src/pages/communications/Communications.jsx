import { useState, useEffect } from 'react';
import {
  HiOutlineSpeakerphone,
  HiOutlineMail,
  HiOutlineCalendar,
  HiOutlineTemplate,
  HiOutlineUserGroup,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineX,
  HiOutlinePaperAirplane,
  HiOutlineChatAlt2,
  HiOutlineChartBar,
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Communications.scss';

const Communications = () => {
  const [activeTab, setActiveTab] = useState('announcements');
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('announcement');
  const [searchTerm, setSearchTerm] = useState('');

  const [stats, setStats] = useState({
    totalAnnouncements: 0,
    activeTemplates: 0,
    campaignsSent: 0,
    totalReach: 0,
  });

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'general',
    priority: 'normal',
    targetAudience: 'all',
    scheduledAt: '',
  });

  const [editingAnnouncement, setEditingAnnouncement] = useState(null);

  useEffect(() => {
    fetchCommunicationsData();
  }, []);

  const fetchCommunicationsData = async () => {
    setLoading(true);
    try {
      // Fetch announcements
      const announcementsRes = await api.get('/communications/announcements');
      setAnnouncements(announcementsRes.data.data || []);

      // Fetch templates
      const templatesRes = await api.get('/communications/templates');
      setTemplates(templatesRes.data.data || []);

      // Fetch campaigns
      const campaignsRes = await api.get('/communications/campaigns');
      setCampaigns(campaignsRes.data.data || []);

      // Calculate stats
      setStats({
        totalAnnouncements: announcementsRes.data.data?.length || 0,
        activeTemplates: templatesRes.data.data?.filter(t => t.status === 'active').length || 0,
        campaignsSent: campaignsRes.data.data?.filter(c => c.status === 'sent').length || 0,
        totalReach: campaignsRes.data.data?.reduce((sum, c) => sum + (c.recipientCount || 0), 0) || 0,
      });
    } catch (error) {
      console.error('Failed to load communications data:', error);
      // Use mock data as fallback
      setAnnouncements([
        { _id: '1', title: 'Holiday Schedule 2024', content: 'Company will be closed from Dec 24-26 for Christmas holidays.', type: 'general', priority: 'high', status: 'active', createdAt: '2024-12-01' },
        { _id: '2', title: 'New Health Insurance Policy', content: 'Updated health insurance benefits effective January 2025.', type: 'hr', priority: 'normal', status: 'active', createdAt: '2024-11-28' },
        { _id: '3', title: 'Q4 Performance Reviews', content: 'Performance reviews will be conducted from Dec 15-20.', type: 'hr', priority: 'normal', status: 'active', createdAt: '2024-11-25' },
      ]);
      setTemplates([
        { _id: '1', name: 'Welcome Email', type: 'email', category: 'onboarding', status: 'active', usageCount: 45 },
        { _id: '2', name: 'Leave Approval', type: 'email', category: 'hr', status: 'active', usageCount: 120 },
        { _id: '3', name: 'Birthday Greeting', type: 'email', category: 'engagement', status: 'active', usageCount: 89 },
      ]);
      setCampaigns([
        { _id: '1', name: 'December Newsletter', type: 'email', status: 'sent', recipientCount: 250, openRate: 45, sentAt: '2024-12-01' },
        { _id: '2', name: 'Holiday Greetings', type: 'email', status: 'scheduled', recipientCount: 300, scheduledAt: '2024-12-24' },
      ]);
      setStats({
        totalAnnouncements: 3,
        activeTemplates: 3,
        campaignsSent: 1,
        totalReach: 250,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === 'announcement') {
        if (editingAnnouncement) {
          await api.put(`/communications/announcements/${editingAnnouncement._id}`, formData);
          toast.success('Announcement updated successfully');
        } else {
          await api.post('/communications/announcements', formData);
          toast.success('Announcement created successfully');
        }
      } else if (modalType === 'template') {
        await api.post('/communications/templates', {
          name: formData.title,
          content: formData.content,
          type: 'email',
          category: formData.type,
          status: 'active',
        });
        toast.success('Template created successfully');
      } else if (modalType === 'campaign') {
        await api.post('/communications/campaigns', {
          name: formData.title,
          type: 'email',
          subject: formData.title,
          content: formData.content,
          targetAudience: formData.targetAudience,
          scheduledAt: formData.scheduledAt || null,
          status: formData.scheduledAt ? 'scheduled' : 'draft',
        });
        toast.success('Campaign created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchCommunicationsData();
    } catch (error) {
      toast.error('Failed to create: ' + (error.response?.data?.message || error.message));
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'general',
      priority: 'normal',
      targetAudience: 'all',
      scheduledAt: '',
    });
    setEditingAnnouncement(null);
  };

  const handleEditAnnouncement = (announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type || 'general',
      priority: announcement.priority || 'normal',
      targetAudience: announcement.targetAudience || 'all',
      scheduledAt: '',
    });
    setModalType('announcement');
    setShowModal(true);
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }
    try {
      await api.delete(`/communications/announcements/${announcementId}`);
      toast.success('Announcement deleted successfully');
      fetchCommunicationsData();
    } catch (error) {
      toast.error('Failed to delete announcement');
    }
  };

  const getTypeBadge = (type) => {
    const colors = {
      general: 'primary',
      hr: 'info',
      finance: 'success',
      it: 'warning',
      urgent: 'danger',
    };
    return <span className={`badge badge-${colors[type] || 'primary'}`}>{type}</span>;
  };

  const getPriorityBadge = (priority) => {
    const colors = { high: 'danger', normal: 'primary', low: 'secondary' };
    return <span className={`priority-badge ${priority}`}>{priority}</span>;
  };

  const tabs = [
    { id: 'announcements', label: 'Announcements', icon: HiOutlineSpeakerphone },
    { id: 'templates', label: 'Templates', icon: HiOutlineTemplate },
    { id: 'campaigns', label: 'Campaigns', icon: HiOutlineMail },
    { id: 'analytics', label: 'Analytics', icon: HiOutlineChartBar },
  ];

  if (loading) {
    return <div className="loading-state">Loading communications...</div>;
  }

  return (
    <div className="communications-page">
      <div className="page-header">
        <div>
          <h1>Communications</h1>
          <p>Manage announcements, templates, and campaigns</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => { resetForm(); setModalType('announcement'); setShowModal(true); }}>
            <HiOutlinePlus /> New Announcement
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <HiOutlineSpeakerphone />
          </div>
          <div className="stat-content">
            <span className="stat-label">Announcements</span>
            <span className="stat-value">{stats.totalAnnouncements}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <HiOutlineTemplate />
          </div>
          <div className="stat-content">
            <span className="stat-label">Active Templates</span>
            <span className="stat-value">{stats.activeTemplates}</span>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">
            <HiOutlinePaperAirplane />
          </div>
          <div className="stat-content">
            <span className="stat-label">Campaigns Sent</span>
            <span className="stat-value">{stats.campaignsSent}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <HiOutlineUserGroup />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Reach</span>
            <span className="stat-value">{stats.totalReach}</span>
          </div>
        </div>
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

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div className="card">
          <div className="card-header">
            <h3>Company Announcements</h3>
            <div className="search-box">
              <HiOutlineSearch />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="announcements-list">
            {announcements.filter(a =>
              a.title.toLowerCase().includes(searchTerm.toLowerCase())
            ).map((announcement) => (
              <div key={announcement._id} className="announcement-card">
                <div className="announcement-header">
                  <h4>{announcement.title}</h4>
                  <div className="announcement-meta">
                    {getTypeBadge(announcement.type)}
                    {getPriorityBadge(announcement.priority)}
                  </div>
                </div>
                <p className="announcement-content">{announcement.content}</p>
                <div className="announcement-footer">
                  <span className="date">{new Date(announcement.createdAt).toLocaleDateString()}</span>
                  <div className="actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => handleEditAnnouncement(announcement)}><HiOutlinePencil /></button>
                    <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDeleteAnnouncement(announcement._id)}><HiOutlineTrash /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="card">
          <div className="card-header">
            <h3>Message Templates</h3>
            <button className="btn btn-primary btn-sm" onClick={() => { setModalType('template'); setShowModal(true); }}>
              <HiOutlinePlus /> Create Template
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Template Name</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Usage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template._id}>
                    <td><strong>{template.name}</strong></td>
                    <td>{template.type}</td>
                    <td>{template.category}</td>
                    <td><span className={`badge badge-${template.status === 'active' ? 'success' : 'secondary'}`}>{template.status}</span></td>
                    <td>{template.usageCount} times</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn btn-ghost btn-sm"><HiOutlineEye /></button>
                        <button className="btn btn-ghost btn-sm"><HiOutlinePencil /></button>
                        <button className="btn btn-ghost btn-sm text-danger"><HiOutlineTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="card">
          <div className="card-header">
            <h3>Email Campaigns</h3>
            <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setModalType('campaign'); setShowModal(true); }}>
              <HiOutlinePlus /> New Campaign
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Campaign Name</th>
                  <th>Type</th>
                  <th>Recipients</th>
                  <th>Open Rate</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign._id}>
                    <td><strong>{campaign.name}</strong></td>
                    <td>{campaign.type}</td>
                    <td>{campaign.recipientCount}</td>
                    <td>{campaign.openRate ? `${campaign.openRate}%` : '-'}</td>
                    <td>
                      <span className={`badge badge-${campaign.status === 'sent' ? 'success' : campaign.status === 'scheduled' ? 'warning' : 'secondary'}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td>{new Date(campaign.sentAt || campaign.scheduledAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn btn-ghost btn-sm"><HiOutlineEye /></button>
                        <button className="btn btn-ghost btn-sm"><HiOutlineChartBar /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="analytics-grid">
          <div className="card analytics-card">
            <h4>Announcement Engagement</h4>
            <div className="chart-placeholder">
              <HiOutlineChartBar />
              <p>Engagement metrics will be displayed here</p>
            </div>
          </div>
          <div className="card analytics-card">
            <h4>Campaign Performance</h4>
            <div className="chart-placeholder">
              <HiOutlineChartBar />
              <p>Campaign analytics will be displayed here</p>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Announcement Modal */}
      {showModal && modalType === 'announcement' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <HiOutlineX />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Announcement title"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="general">General</option>
                      <option value="hr">HR</option>
                      <option value="finance">Finance</option>
                      <option value="it">IT</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Target Audience</label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  >
                    <option value="all">All Employees</option>
                    <option value="department">Specific Department</option>
                    <option value="branch">Specific Branch</option>
                    <option value="managers">Managers Only</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Content</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Announcement content..."
                    rows={5}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingAnnouncement ? 'Update Announcement' : 'Publish Announcement'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {showModal && modalType === 'template' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Template</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <HiOutlineX />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Template Name</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Template name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="general">General</option>
                    <option value="onboarding">Onboarding</option>
                    <option value="hr">HR</option>
                    <option value="engagement">Engagement</option>
                    <option value="notification">Notification</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Template Content</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Enter template content... Use {{name}}, {{date}} as placeholders"
                    rows={6}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Template</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showModal && modalType === 'campaign' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Campaign</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <HiOutlineX />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Campaign Name</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Campaign name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Target Audience</label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  >
                    <option value="all">All Employees</option>
                    <option value="department">Specific Department</option>
                    <option value="branch">Specific Branch</option>
                    <option value="managers">Managers Only</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Schedule (Optional)</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  />
                  <span className="help-text">Leave empty to send immediately</span>
                </div>
                <div className="form-group">
                  <label>Email Content</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Enter campaign content..."
                    rows={6}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {formData.scheduledAt ? 'Schedule Campaign' : 'Save as Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Communications;
