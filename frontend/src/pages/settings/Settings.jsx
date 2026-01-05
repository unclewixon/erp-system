import { useState, useRef, useCallback, useEffect } from 'react';
import {
  HiOutlineUser,
  HiOutlineLockClosed,
  HiOutlineBell,
  HiOutlineCog,
  HiOutlineMoon,
  HiOutlineSun,
  HiOutlineOfficeBuilding,
  HiOutlineUpload,
  HiOutlineTrash,
} from 'react-icons/hi';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Settings.scss';

const Settings = () => {
  const { user, tenant, refreshUser, isTenantAdmin, isSuperAdmin } = useAuth();
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

  // Organization state
  const [orgData, setOrgData] = useState({
    name: tenant?.name || '',
    email: tenant?.email || '',
    phone: tenant?.phone || '',
    industry: tenant?.industry || '',
    address: {
      street: tenant?.address?.street || '',
      city: tenant?.address?.city || '',
      state: tenant?.address?.state || '',
      country: tenant?.address?.country || '',
    },
  });

  // Logo upload state
  const [logoPreview, setLogoPreview] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', width: 50, aspect: 1 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const imageRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (tenant?.logo) {
      const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';
      setLogoPreview(`${apiUrl}${tenant.logo}`);
    }
  }, [tenant]);

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

  // Organization handlers
  const handleOrgUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/tenants/current', orgData);
      toast.success('Organization updated successfully');
      if (refreshUser) refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update organization');
    } finally {
      setLoading(false);
    }
  };

  // Logo upload handlers
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const onImageLoad = useCallback((e) => {
    imageRef.current = e.currentTarget;
    const { width, height } = e.currentTarget;
    const cropSize = Math.min(width, height, 300);
    const x = (width - cropSize) / 2;
    const y = (height - cropSize) / 2;
    setCrop({
      unit: 'px',
      width: cropSize,
      height: cropSize,
      x,
      y,
    });
  }, []);

  const getCroppedImg = useCallback(() => {
    return new Promise((resolve) => {
      const image = imageRef.current;
      const canvas = document.createElement('canvas');
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      canvas.width = completedCrop.width;
      canvas.height = completedCrop.height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width,
        completedCrop.height
      );

      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.9);
    });
  }, [completedCrop]);

  const handleCropConfirm = async () => {
    if (!completedCrop) {
      toast.error('Please select an area to crop');
      return;
    }

    setLoading(true);
    try {
      const croppedBlob = await getCroppedImg();
      const formData = new FormData();
      formData.append('logo', croppedBlob, 'logo.jpg');

      const response = await api.post('/tenants/current/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';
      setLogoPreview(`${apiUrl}${response.data.data.logo}?t=${Date.now()}`);
      setShowCropModal(false);
      setImageSrc(null);
      toast.success('Logo uploaded successfully');
      if (refreshUser) refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload logo');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!confirm('Are you sure you want to delete the logo?')) return;

    setLoading(true);
    try {
      await api.delete('/tenants/current/logo');
      setLogoPreview(null);
      toast.success('Logo deleted successfully');
      if (refreshUser) refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete logo');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: HiOutlineUser },
    { id: 'organization', label: 'Organization', icon: HiOutlineOfficeBuilding },
    { id: 'password', label: 'Password', icon: HiOutlineLockClosed },
    { id: 'notifications', label: 'Notifications', icon: HiOutlineBell },
    { id: 'preferences', label: 'Preferences', icon: HiOutlineCog },
  ];

  // Check if user is admin using AuthContext helpers or direct role check
  const isAdmin = isTenantAdmin || isSuperAdmin ||
    user?.role === 'tenant_admin' || user?.role === 'super_admin' ||
    user?.role?.toLowerCase()?.includes('admin');

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your account settings and preferences</p>
      </div>

      <div className="settings-layout">
        <div className="settings-sidebar">
          {tabs.map((tab) => {
            // Only show Organization tab to admins
            if (tab.id === 'organization' && !isAdmin) return null;
            return (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon />
                <span>{tab.label}</span>
              </button>
            );
          })}
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

          {/* Organization Tab */}
          {activeTab === 'organization' && isAdmin && (
            <div className="card">
              <h2>Organization Settings</h2>
              <p className="description">Manage your organization details and branding.</p>

              {/* Logo Section */}
              <div className="logo-section">
                <h3>Organization Logo</h3>
                <div className="logo-upload-area">
                  <div className="logo-preview-container">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Organization Logo" className="logo-image" />
                    ) : (
                      <div className="logo-placeholder">
                        <HiOutlineOfficeBuilding />
                        <span>No Logo</span>
                      </div>
                    )}
                  </div>
                  <div className="logo-actions">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <HiOutlineUpload />
                      Upload Logo
                    </button>
                    {logoPreview && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={handleDeleteLogo}
                        disabled={loading}
                      >
                        <HiOutlineTrash />
                        Remove
                      </button>
                    )}
                    <p className="logo-hint">Recommended: Square image, at least 200x200px. Max 5MB.</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleOrgUpdate} className="organization-form">
                <h3 className="section-title">Basic Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Organization Name</label>
                    <input
                      type="text"
                      value={orgData.name}
                      onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                      placeholder="Enter organization name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Industry</label>
                    <input
                      type="text"
                      value={orgData.industry}
                      onChange={(e) => setOrgData({ ...orgData, industry: e.target.value })}
                      placeholder="e.g. Technology, Healthcare"
                    />
                  </div>
                </div>

                <h3 className="section-title">Contact Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={orgData.email}
                      onChange={(e) => setOrgData({ ...orgData, email: e.target.value })}
                      placeholder="contact@organization.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="text"
                      value={orgData.phone}
                      onChange={(e) => setOrgData({ ...orgData, phone: e.target.value })}
                      placeholder="+1 (234) 567-8900"
                    />
                  </div>
                </div>

                <h3 className="section-title">Address</h3>

                <div className="form-group">
                  <label>Street Address</label>
                  <input
                    type="text"
                    value={orgData.address.street}
                    onChange={(e) => setOrgData({
                      ...orgData,
                      address: { ...orgData.address, street: e.target.value }
                    })}
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      value={orgData.address.city}
                      onChange={(e) => setOrgData({
                        ...orgData,
                        address: { ...orgData.address, city: e.target.value }
                      })}
                      placeholder="City"
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      value={orgData.address.state}
                      onChange={(e) => setOrgData({
                        ...orgData,
                        address: { ...orgData.address, state: e.target.value }
                      })}
                      placeholder="State/Province"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Country</label>
                  <input
                    type="text"
                    value={orgData.address.country}
                    onChange={(e) => setOrgData({
                      ...orgData,
                      address: { ...orgData.address, country: e.target.value }
                    })}
                    placeholder="Country"
                  />
                </div>

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

      {/* Crop Modal */}
      {showCropModal && (
        <div className="modal-overlay">
          <div className="modal crop-modal">
            <div className="modal-header">
              <h3>Crop Logo</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowCropModal(false);
                  setImageSrc(null);
                }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="crop-container">
                {imageSrc && (
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={1}
                    circularCrop={false}
                  >
                    <img
                      src={imageSrc}
                      alt="Crop preview"
                      onLoad={onImageLoad}
                      style={{ maxWidth: '100%', maxHeight: '400px' }}
                    />
                  </ReactCrop>
                )}
              </div>
              <p className="crop-hint">Drag to select the area you want to use as your logo.</p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowCropModal(false);
                  setImageSrc(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCropConfirm}
                disabled={loading}
              >
                {loading ? 'Uploading...' : 'Save Logo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
