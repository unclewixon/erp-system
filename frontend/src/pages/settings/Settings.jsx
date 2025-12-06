import { useState } from 'react';
import {
  HiOutlineUser,
  HiOutlineLockClosed,
  HiOutlineBell,
  HiOutlineCog,
  HiOutlineMoon,
  HiOutlineSun,
} from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Settings.scss';

const Settings = () => {
  const { user, tenant } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    leaveRequests: true,
    payrollUpdates: true,
    attendanceAlerts: true,
    systemUpdates: false,
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/users/profile', profileData);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await api.put('/users/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationChange = (key) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const saveNotifications = async () => {
    setLoading(true);
    try {
      await api.put('/users/notifications', notifications);
      toast.success('Notification preferences saved');
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    toast.success(`${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} mode enabled`);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: HiOutlineUser },
    { id: 'password', label: 'Password', icon: HiOutlineLockClosed },
    { id: 'notifications', label: 'Notifications', icon: HiOutlineBell },
    { id: 'preferences', label: 'Preferences', icon: HiOutlineCog },
  ];

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your account settings and preferences</p>
      </div>

      <div className="settings-layout">
        <div className="settings-sidebar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="settings-content">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="card">
              <h2>Profile Information</h2>
              <p className="description">Update your personal information and contact details.</p>

              <form onSubmit={handleProfileUpdate}>
                <div className="avatar-section">
                  <div className="avatar-preview">
                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                  </div>
                  <div className="avatar-info">
                    <h4>{user?.firstName} {user?.lastName}</h4>
                    <p>{user?.role}</p>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="+234 800 000 0000"
                  />
                </div>

                {tenant && (
                  <div className="info-box">
                    <strong>Organization:</strong> {tenant.name}
                    <br />
                    <strong>Plan:</strong> {tenant.subscription?.plan}
                  </div>
                )}

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <div className="card">
              <h2>Change Password</h2>
              <p className="description">Ensure your account is using a strong, secure password.</p>

              <form onSubmit={handlePasswordChange}>
                <div className="form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                    minLength={8}
                  />
                  <small>Must be at least 8 characters</small>
                </div>

                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="card">
              <h2>Notification Preferences</h2>
              <p className="description">Choose what notifications you want to receive.</p>

              <div className="notification-options">
                <div className="notification-group">
                  <h4>General</h4>

                  <div className="toggle-item">
                    <div className="toggle-info">
                      <span className="toggle-label">Email Notifications</span>
                      <span className="toggle-description">Receive notifications via email</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notifications.emailNotifications}
                        onChange={() => handleNotificationChange('emailNotifications')}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  <div className="toggle-item">
                    <div className="toggle-info">
                      <span className="toggle-label">Push Notifications</span>
                      <span className="toggle-description">Receive push notifications in browser</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notifications.pushNotifications}
                        onChange={() => handleNotificationChange('pushNotifications')}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>

                <div className="notification-group">
                  <h4>Activity</h4>

                  <div className="toggle-item">
                    <div className="toggle-info">
                      <span className="toggle-label">Leave Requests</span>
                      <span className="toggle-description">Notifications for leave request updates</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notifications.leaveRequests}
                        onChange={() => handleNotificationChange('leaveRequests')}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  <div className="toggle-item">
                    <div className="toggle-info">
                      <span className="toggle-label">Payroll Updates</span>
                      <span className="toggle-description">Notifications when payroll is processed</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notifications.payrollUpdates}
                        onChange={() => handleNotificationChange('payrollUpdates')}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  <div className="toggle-item">
                    <div className="toggle-info">
                      <span className="toggle-label">Attendance Alerts</span>
                      <span className="toggle-description">Reminders for clock-in/clock-out</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notifications.attendanceAlerts}
                        onChange={() => handleNotificationChange('attendanceAlerts')}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  <div className="toggle-item">
                    <div className="toggle-info">
                      <span className="toggle-label">System Updates</span>
                      <span className="toggle-description">News about product updates and features</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notifications.systemUpdates}
                        onChange={() => handleNotificationChange('systemUpdates')}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button className="btn btn-primary" onClick={saveNotifications} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="card">
              <h2>Display Preferences</h2>
              <p className="description">Customize how the application looks and feels.</p>

              <div className="preference-options">
                <div className="preference-item">
                  <div className="preference-info">
                    <span className="preference-label">Theme</span>
                    <span className="preference-description">
                      Switch between light and dark mode
                    </span>
                  </div>
                  <button className="theme-toggle" onClick={toggleTheme}>
                    {theme === 'light' ? (
                      <>
                        <HiOutlineMoon /> Dark Mode
                      </>
                    ) : (
                      <>
                        <HiOutlineSun /> Light Mode
                      </>
                    )}
                  </button>
                </div>

                <div className="preference-item">
                  <div className="preference-info">
                    <span className="preference-label">Language</span>
                    <span className="preference-description">
                      Select your preferred language
                    </span>
                  </div>
                  <select defaultValue="en">
                    <option value="en">English</option>
                    <option value="fr">French</option>
                    <option value="es">Spanish</option>
                  </select>
                </div>

                <div className="preference-item">
                  <div className="preference-info">
                    <span className="preference-label">Date Format</span>
                    <span className="preference-description">
                      How dates are displayed
                    </span>
                  </div>
                  <select defaultValue="DD/MM/YYYY">
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                <div className="preference-item">
                  <div className="preference-info">
                    <span className="preference-label">Timezone</span>
                    <span className="preference-description">
                      Your local timezone
                    </span>
                  </div>
                  <select defaultValue="Africa/Lagos">
                    <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
