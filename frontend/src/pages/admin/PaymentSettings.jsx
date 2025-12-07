import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Admin.scss';

const PaymentSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingPaystack, setTestingPaystack] = useState(false);
  const [testingFlutterwave, setTestingFlutterwave] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/payments/settings');
      setSettings(response.data.data);
    } catch (error) {
      console.error('Error fetching payment settings:', error);
      toast.error('Failed to load payment settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/payments/settings', settings);
      toast.success('Payment settings saved successfully');
      fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestPaystack = async () => {
    try {
      setTestingPaystack(true);
      const response = await api.post('/payments/settings/test');
      toast.success(response.data.message || 'Paystack connection successful!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Paystack connection test failed');
    } finally {
      setTestingPaystack(false);
    }
  };

  const handleTestFlutterwave = async () => {
    try {
      setTestingFlutterwave(true);
      const response = await api.post('/payments/settings/test-flutterwave');
      toast.success(response.data.message || 'Flutterwave connection successful!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Flutterwave connection test failed');
    } finally {
      setTestingFlutterwave(false);
    }
  };

  const updatePaystack = (field, value) => {
    setSettings(prev => ({
      ...prev,
      paystack: {
        ...prev.paystack,
        [field]: value
      }
    }));
  };

  const updateFlutterwave = (field, value) => {
    setSettings(prev => ({
      ...prev,
      flutterwave: {
        ...prev.flutterwave,
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading-state">Loading payment settings...</div>
      </div>
    );
  }

  return (
    <div className="admin-page payment-settings-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Payment Gateway Settings</h1>
          <p>Configure your payment gateway credentials for subscription payments</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="settings-grid">
        {/* Paystack Settings */}
        <div className="settings-card">
          <div className="card-header">
            <div className="gateway-info">
              <div className="gateway-logo paystack">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                </svg>
              </div>
              <div>
                <h3>Paystack</h3>
                <p>Accept payments via cards, bank transfers, USSD</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings?.paystack?.isEnabled || false}
                onChange={(e) => updatePaystack('isEnabled', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="card-body">
            <div className="form-group">
              <label>Public Key</label>
              <input
                type="text"
                value={settings?.paystack?.publicKey || ''}
                onChange={(e) => updatePaystack('publicKey', e.target.value)}
                placeholder="pk_test_xxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>

            <div className="form-group">
              <label>Secret Key</label>
              <input
                type="password"
                value={settings?.paystack?.secretKey || ''}
                onChange={(e) => updatePaystack('secretKey', e.target.value)}
                placeholder="Enter your secret key"
              />
              <small>Leave unchanged to keep existing key</small>
            </div>

            <div className="form-group">
              <label>Webhook Secret (Optional)</label>
              <input
                type="password"
                value={settings?.paystack?.webhookSecret || ''}
                onChange={(e) => updatePaystack('webhookSecret', e.target.value)}
                placeholder="whsec_xxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={settings?.paystack?.isLive || false}
                  onChange={(e) => updatePaystack('isLive', e.target.checked)}
                />
                <span>Live Mode</span>
              </label>
              <small>Enable live mode when ready to accept real payments</small>
            </div>

            <div className="webhook-info">
              <strong>Webhook URL:</strong>
              <code>{window.location.origin.replace('localhost:5173', 'your-domain.com')}/api/payments/webhook/paystack</code>
              <p>Add this URL in your Paystack dashboard under Settings &rarr; API Keys & Webhooks</p>
            </div>

            <button
              className="btn-test"
              onClick={handleTestPaystack}
              disabled={testingPaystack || !settings?.paystack?.isEnabled}
            >
              {testingPaystack ? 'Testing...' : 'Test Paystack Connection'}
            </button>
          </div>
        </div>

        {/* Flutterwave Settings */}
        <div className="settings-card">
          <div className="card-header">
            <div className="gateway-info">
              <div className="gateway-logo flutterwave">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div>
                <h3>Flutterwave</h3>
                <p>Accept payments via cards, bank transfers, mobile money</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings?.flutterwave?.isEnabled || false}
                onChange={(e) => updateFlutterwave('isEnabled', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="card-body">
            <div className="form-group">
              <label>Public Key</label>
              <input
                type="text"
                value={settings?.flutterwave?.publicKey || ''}
                onChange={(e) => updateFlutterwave('publicKey', e.target.value)}
                placeholder="FLWPUBK_TEST-xxxxxxxxxxxxxxxx"
              />
            </div>

            <div className="form-group">
              <label>Secret Key</label>
              <input
                type="password"
                value={settings?.flutterwave?.secretKey || ''}
                onChange={(e) => updateFlutterwave('secretKey', e.target.value)}
                placeholder="FLWSECK_TEST-xxxxxxxxxxxxxxxx"
              />
              <small>Leave unchanged to keep existing key</small>
            </div>

            <div className="form-group">
              <label>Webhook Secret Hash (Optional)</label>
              <input
                type="password"
                value={settings?.flutterwave?.webhookSecret || ''}
                onChange={(e) => updateFlutterwave('webhookSecret', e.target.value)}
                placeholder="Your webhook secret hash"
              />
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={settings?.flutterwave?.isLive || false}
                  onChange={(e) => updateFlutterwave('isLive', e.target.checked)}
                />
                <span>Live Mode</span>
              </label>
              <small>Enable live mode when ready to accept real payments</small>
            </div>

            <div className="webhook-info">
              <strong>Webhook URL:</strong>
              <code>{window.location.origin.replace('localhost:5173', 'your-domain.com')}/api/payments/webhook/flutterwave</code>
              <p>Add this URL in your Flutterwave dashboard under Settings &rarr; Webhooks</p>
            </div>

            <button
              className="btn-test"
              onClick={handleTestFlutterwave}
              disabled={testingFlutterwave || !settings?.flutterwave?.isEnabled}
            >
              {testingFlutterwave ? 'Testing...' : 'Test Flutterwave Connection'}
            </button>
          </div>
        </div>

        {/* General Settings */}
        <div className="settings-card">
          <div className="card-header">
            <div className="gateway-info">
              <div className="gateway-logo general">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <div>
                <h3>General Settings</h3>
                <p>Configure tax and currency settings</p>
              </div>
            </div>
          </div>

          <div className="card-body">
            <div className="form-group">
              <label>Default Currency</label>
              <select
                value={settings?.defaultCurrency || 'NGN'}
                onChange={(e) => setSettings(prev => ({ ...prev, defaultCurrency: e.target.value }))}
              >
                <option value="NGN">Nigerian Naira (NGN)</option>
                <option value="USD">US Dollar (USD)</option>
                <option value="GBP">British Pound (GBP)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={settings?.taxEnabled || false}
                  onChange={(e) => setSettings(prev => ({ ...prev, taxEnabled: e.target.checked }))}
                />
                <span>Enable Tax/VAT</span>
              </label>
            </div>

            {settings?.taxEnabled && (
              <div className="form-group">
                <label>Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings?.taxRate || 7.5}
                  onChange={(e) => setSettings(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .payment-settings-page {
          .settings-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
            gap: 1.5rem;

            @media (max-width: 900px) {
              grid-template-columns: 1fr;
            }
          }

          .settings-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            overflow: hidden;

            &.disabled {
              opacity: 0.6;
              pointer-events: none;
            }

            .card-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 1.25rem 1.5rem;
              background: #f9fafb;
              border-bottom: 1px solid #e5e7eb;

              .gateway-info {
                display: flex;
                align-items: center;
                gap: 1rem;

                .gateway-logo {
                  width: 48px;
                  height: 48px;
                  border-radius: 10px;
                  display: flex;
                  align-items: center;
                  justify-content: center;

                  &.paystack {
                    background: #00c3f7;
                    color: white;
                  }

                  &.flutterwave {
                    background: #f5a623;
                    color: white;
                  }

                  &.general {
                    background: #6366f1;
                    color: white;
                  }

                  svg {
                    width: 24px;
                    height: 24px;
                  }
                }

                h3 {
                  font-size: 1rem;
                  font-weight: 600;
                  color: #111827;
                  margin-bottom: 0.125rem;
                }

                p {
                  font-size: 0.75rem;
                  color: #6b7280;
                }
              }

              .coming-soon-badge {
                background: #f3f4f6;
                color: #6b7280;
                padding: 0.375rem 0.75rem;
                border-radius: 20px;
                font-size: 0.75rem;
                font-weight: 500;
              }
            }

            .card-body {
              padding: 1.5rem;

              .form-group {
                margin-bottom: 1.25rem;

                &:last-child {
                  margin-bottom: 0;
                }

                label {
                  display: block;
                  font-size: 0.875rem;
                  font-weight: 500;
                  color: #374151;
                  margin-bottom: 0.5rem;
                }

                input[type="text"],
                input[type="password"],
                input[type="number"],
                select {
                  width: 100%;
                  padding: 0.75rem;
                  border: 1px solid #d1d5db;
                  border-radius: 8px;
                  font-size: 0.875rem;
                  transition: border-color 0.2s;

                  &:focus {
                    outline: none;
                    border-color: #3b82f6;
                  }
                }

                small {
                  display: block;
                  font-size: 0.75rem;
                  color: #6b7280;
                  margin-top: 0.375rem;
                }

                &.checkbox-group {
                  label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    margin-bottom: 0;

                    input[type="checkbox"] {
                      width: 18px;
                      height: 18px;
                      accent-color: #3b82f6;
                    }

                    span {
                      font-weight: 500;
                    }
                  }
                }
              }

              .webhook-info {
                background: #f3f4f6;
                border-radius: 8px;
                padding: 1rem;
                margin-top: 1rem;

                strong {
                  font-size: 0.75rem;
                  color: #374151;
                  display: block;
                  margin-bottom: 0.5rem;
                }

                code {
                  display: block;
                  background: white;
                  border: 1px solid #d1d5db;
                  border-radius: 4px;
                  padding: 0.5rem;
                  font-size: 0.75rem;
                  word-break: break-all;
                  margin-bottom: 0.5rem;
                }

                p {
                  font-size: 0.75rem;
                  color: #6b7280;
                }
              }

              .btn-test {
                width: 100%;
                padding: 0.75rem;
                margin-top: 1rem;
                background: #f3f4f6;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                font-size: 0.875rem;
                font-weight: 500;
                color: #374151;
                cursor: pointer;
                transition: all 0.2s;

                &:hover:not(:disabled) {
                  background: #e5e7eb;
                }

                &:disabled {
                  opacity: 0.5;
                  cursor: not-allowed;
                }
              }
            }
          }

          .toggle-switch {
            position: relative;
            display: inline-block;
            width: 48px;
            height: 24px;

            input {
              opacity: 0;
              width: 0;
              height: 0;
            }

            .toggle-slider {
              position: absolute;
              cursor: pointer;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background-color: #d1d5db;
              transition: 0.3s;
              border-radius: 24px;

              &::before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                transition: 0.3s;
                border-radius: 50%;
              }
            }

            input:checked + .toggle-slider {
              background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            }

            input:checked + .toggle-slider::before {
              transform: translateX(24px);
            }
          }
        }
      `}</style>
    </div>
  );
};

export default PaymentSettings;
