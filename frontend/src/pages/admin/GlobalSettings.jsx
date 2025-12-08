import { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  HiOutlineCog,
  HiOutlineClock,
  HiOutlineCheck,
  HiOutlineExclamationCircle,
  HiOutlineRefresh,
  HiOutlineGlobe,
  HiOutlineCalendar,
} from 'react-icons/hi';
import './EmailSettings.scss';

const GlobalSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/global-settings');
      setSettings(res.data.data);
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        setAccessDenied(true);
      } else {
        toast.error('Failed to load global settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/global-settings', settings);
      toast.success('Settings saved successfully');
      fetchSettings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTrialDaysChange = (value) => {
    const days = parseInt(value) || 1;
    setSettings({
      ...settings,
      trial: {
        ...settings.trial,
        defaultTrialDays: Math.min(Math.max(days, 1), 30),
      },
    });
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (accessDenied) {
    return (
      <div className="email-settings-page">
        <div className="access-denied">
          <HiOutlineExclamationCircle className="denied-icon" />
          <h2>Access Denied</h2>
          <p>You do not have permission to access global settings. This page is only available to super administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="email-settings-page">
      <div className="page-header">
        <div className="header-content">
          <h1><HiOutlineCog /> Global Settings</h1>
          <p>Configure system-wide settings for your platform</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* Trial Settings */}
        <div className="settings-card">
          <div className="card-header">
            <h2><HiOutlineClock /> Trial Settings</h2>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label>Default Trial Duration (Days)</label>
              <div className="input-with-info">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings?.trial?.defaultTrialDays || 3}
                  onChange={(e) => handleTrialDaysChange(e.target.value)}
                />
                <span className="info-badge">
                  <HiOutlineCalendar />
                  {settings?.trial?.defaultTrialDays || 3} days
                </span>
              </div>
              <span className="help-text">
                New organizations will receive this many days of free trial (1-30 days)
              </span>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings?.trial?.enableTrial ?? true}
                  onChange={(e) => setSettings({
                    ...settings,
                    trial: { ...settings.trial, enableTrial: e.target.checked },
                  })}
                />
                <span className="checkbox-text">
                  Enable Free Trial
                </span>
              </label>
              <span className="help-text">
                When disabled, new organizations must select a plan immediately
              </span>
            </div>

            <div className="trial-info-box">
              <HiOutlineExclamationCircle />
              <div>
                <strong>Current Trial Settings:</strong>
                <ul>
                  <li>Trial Duration: {settings?.trial?.defaultTrialDays || 3} days</li>
                  <li>Trial Enabled: {settings?.trial?.enableTrial !== false ? 'Yes' : 'No'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* General Settings */}
        <div className="settings-card">
          <div className="card-header">
            <h2><HiOutlineGlobe /> General Settings</h2>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label>Site Name</label>
              <input
                type="text"
                placeholder="ERP System"
                value={settings?.general?.siteName || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  general: { ...settings.general, siteName: e.target.value },
                })}
              />
            </div>

            <div className="form-group">
              <label>Site Description</label>
              <textarea
                placeholder="Brief description of your platform"
                rows={3}
                value={settings?.general?.siteDescription || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  general: { ...settings.general, siteDescription: e.target.value },
                })}
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings?.general?.maintenanceMode ?? false}
                  onChange={(e) => setSettings({
                    ...settings,
                    general: { ...settings.general, maintenanceMode: e.target.checked },
                  })}
                />
                <span className="checkbox-text warning">
                  Maintenance Mode
                </span>
              </label>
              <span className="help-text">
                When enabled, users will see a maintenance page
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
          {saving ? <HiOutlineRefresh className="spin" /> : <HiOutlineCheck />}
          Save All Settings
        </button>
      </div>
    </div>
  );
};

export default GlobalSettings;
