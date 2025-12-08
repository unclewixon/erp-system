import { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  HiOutlineMail,
  HiOutlineKey,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlinePaperAirplane,
  HiOutlineRefresh,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineCog,
} from 'react-icons/hi';
import './EmailSettings.scss';

const EmailSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [settings, setSettings] = useState(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [accountInfo, setAccountInfo] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/email-settings');
      setSettings(res.data.data);
      setTestEmail(res.data.data.testEmail || '');
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        setAccessDenied(true);
      } else {
        toast.error('Failed to load email settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        brevo: {
          senderEmail: settings.brevo?.senderEmail,
          senderName: settings.brevo?.senderName,
        },
        isEnabled: settings.isEnabled,
        testEmail,
      };

      // Only include API key if it was changed (not masked)
      if (apiKeyInput && !apiKeyInput.includes('...')) {
        updateData.brevo.apiKey = apiKeyInput;
      }

      await api.put('/email-settings', updateData);
      toast.success('Settings saved successfully');
      fetchSettings();
      setApiKeyInput('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyApiKey = async () => {
    if (!apiKeyInput) {
      toast.error('Please enter an API key');
      return;
    }

    setVerifying(true);
    try {
      const res = await api.post('/email-settings/verify-api-key', { apiKey: apiKeyInput });
      setAccountInfo(res.data.data);
      toast.success('API key verified successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid API key');
      setAccountInfo(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    setTesting(true);
    try {
      await api.post('/email-settings/send-test', { email: testEmail });
      toast.success('Test email sent successfully');
      fetchSettings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send test email');
    } finally {
      setTesting(false);
    }
  };

  const handleTemplateToggle = async (templateName, enabled) => {
    try {
      await api.put(`/email-settings/templates/${templateName}`, { enabled });
      setSettings({
        ...settings,
        templates: {
          ...settings.templates,
          [templateName]: {
            ...settings.templates[templateName],
            enabled,
          },
        },
      });
      toast.success(`Template ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update template');
    }
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
          <p>You do not have permission to access email settings. This page is only available to super administrators.</p>
        </div>
      </div>
    );
  }

  const isConfigured = settings?.brevo?.apiKey && settings?.brevo?.senderEmail;

  return (
    <div className="email-settings-page">
      <div className="page-header">
        <div className="header-content">
          <h1><HiOutlineMail /> Email Settings</h1>
          <p>Configure Brevo (Sendinblue) to send emails from the system</p>
        </div>
        <div className="header-actions">
          <button
            className={`toggle-btn ${settings?.isEnabled ? 'active' : ''}`}
            onClick={() => setSettings({ ...settings, isEnabled: !settings?.isEnabled })}
          >
            {settings?.isEnabled ? <HiOutlineCheck /> : <HiOutlineX />}
            {settings?.isEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      <div className="settings-grid">
        {/* API Configuration */}
        <div className="settings-card">
          <div className="card-header">
            <h2><HiOutlineKey /> API Configuration</h2>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label>Brevo API Key</label>
              <div className="input-with-action">
                <input
                  type="password"
                  placeholder={settings?.brevo?.apiKey ? 'API key is set (enter new to change)' : 'Enter your Brevo API key'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                />
                <button
                  className="btn btn-secondary"
                  onClick={handleVerifyApiKey}
                  disabled={verifying || !apiKeyInput}
                >
                  {verifying ? <HiOutlineRefresh className="spin" /> : <HiOutlineCheckCircle />}
                  Verify
                </button>
              </div>
              <span className="help-text">
                Get your API key from <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noopener noreferrer">Brevo Dashboard</a>
              </span>
            </div>

            {accountInfo && (
              <div className="account-info">
                <HiOutlineCheckCircle className="success-icon" />
                <div>
                  <strong>Verified Account:</strong> {accountInfo.email}
                  <br />
                  <span className="plan-info">Plan: {accountInfo.plan}</span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Sender Email *</label>
              <input
                type="email"
                placeholder="noreply@yourcompany.com"
                value={settings?.brevo?.senderEmail || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  brevo: { ...settings.brevo, senderEmail: e.target.value }
                })}
              />
              <span className="help-text">Must be a verified sender in Brevo</span>
            </div>

            <div className="form-group">
              <label>Sender Name</label>
              <input
                type="text"
                placeholder="ERP HR Manager"
                value={settings?.brevo?.senderName || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  brevo: { ...settings.brevo, senderName: e.target.value }
                })}
              />
            </div>

            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <HiOutlineRefresh className="spin" /> : <HiOutlineCheck />}
              Save Settings
            </button>
          </div>
        </div>

        {/* Test Email */}
        <div className="settings-card">
          <div className="card-header">
            <h2><HiOutlinePaperAirplane /> Test Email</h2>
            {settings?.lastTestedAt && (
              <span className={`test-status ${settings?.lastTestResult?.success ? 'success' : 'error'}`}>
                {settings?.lastTestResult?.success ? <HiOutlineCheckCircle /> : <HiOutlineExclamationCircle />}
                Last tested: {new Date(settings?.lastTestedAt).toLocaleString()}
              </span>
            )}
          </div>
          <div className="card-body">
            {!isConfigured ? (
              <div className="warning-box">
                <HiOutlineExclamationCircle />
                <p>Please configure API key and sender email first</p>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label>Test Email Address</label>
                  <div className="input-with-action">
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={handleSendTest}
                      disabled={testing || !testEmail}
                    >
                      {testing ? <HiOutlineRefresh className="spin" /> : <HiOutlinePaperAirplane />}
                      Send Test
                    </button>
                  </div>
                </div>
                <p className="info-text">
                  Send a test email to verify your configuration is working correctly.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Email Templates */}
        <div className="settings-card full-width">
          <div className="card-header">
            <h2><HiOutlineCog /> Email Templates</h2>
            <p>Enable or disable automatic emails for different events</p>
          </div>
          <div className="card-body">
            <div className="templates-grid">
              {settings?.templates && Object.entries(settings.templates).map(([key, template]) => (
                <div key={key} className="template-item">
                  <div className="template-info">
                    <h4>{formatTemplateName(key)}</h4>
                    <p className="template-subject">{template.subject}</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={template.enabled}
                      onChange={(e) => handleTemplateToggle(key, e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`status-banner ${isConfigured && settings?.isEnabled ? 'active' : 'inactive'}`}>
        {isConfigured && settings?.isEnabled ? (
          <>
            <HiOutlineCheckCircle />
            <span>Email service is active and ready to send</span>
          </>
        ) : (
          <>
            <HiOutlineExclamationCircle />
            <span>
              {!isConfigured
                ? 'Email service is not configured - please add API key and sender email'
                : 'Email service is disabled - enable it above to send emails'}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

const formatTemplateName = (key) => {
  const names = {
    welcome: 'Welcome Email',
    passwordReset: 'Password Reset',
    leaveApproval: 'Leave Approval/Rejection',
    payslip: 'Payslip Notification',
    shiftAssignment: 'Shift Assignment',
    rosterLink: 'Roster Link for HOD',
    swapRequest: 'Shift Swap Request',
    announcement: 'Announcements',
  };
  return names[key] || key;
};

export default EmailSettings;
