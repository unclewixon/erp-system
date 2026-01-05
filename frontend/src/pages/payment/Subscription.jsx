import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { PlanCard } from '../../components/common';
import './Payment.scss';

const Subscription = () => {
  const { user, logout, tenant } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [gateways, setGateways] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState('paystack');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plansRes, subRes, gatewaysRes] = await Promise.all([
        api.get('/plans'),
        api.get('/payments/subscription'),
        api.get('/payments/public-key').catch(() => ({ data: { data: { gateways: [] } } })),
      ]);
      setPlans(plansRes.data.data || []);
      setSubscription(subRes.data.data);

      // Set available gateways
      const availableGateways = gatewaysRes.data.data?.gateways || [];
      setGateways(availableGateways);

      // Set default gateway
      if (availableGateways.length > 0) {
        setSelectedGateway(availableGateways[0].provider);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getEmployeeRange = (plan) => {
    if (plan.employeeRange?.max === null) {
      return `${plan.employeeRange.min}+ Employees`;
    }
    return `${plan.employeeRange.min}-${plan.employeeRange.max} Employees`;
  };

  const handleSubscribe = async (plan) => {
    if (plan.isEnterprise) {
      // Redirect to contact for enterprise plans
      navigate('/contact');
      return;
    }

    try {
      setProcessingPlan(plan._id);

      const response = await api.post('/payments/subscribe/initialize', {
        planId: plan._id,
        billingCycle,
        gateway: selectedGateway,
      });

      if (response.data.success && response.data.data.authorizationUrl) {
        // Store gateway in localStorage for callback verification
        localStorage.setItem('payment_gateway', response.data.data.gateway || selectedGateway);
        localStorage.setItem('payment_reference', response.data.data.reference);

        // Redirect to payment checkout
        window.location.href = response.data.data.authorizationUrl;
      } else {
        toast.error('Failed to initialize payment');
      }
    } catch (error) {
      console.error('Error initializing payment:', error);
      toast.error(error.response?.data?.message || 'Failed to initialize payment');
    } finally {
      setProcessingPlan(null);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active': return 'active';
      case 'trial': return 'trial';
      case 'expired':
      case 'cancelled':
      case 'past_due':
        return 'expired';
      default: return '';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="subscription-page-wrapper">
        <header className="subscription-header">
          <div className="logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span>StaffTrack</span>
          </div>
        </header>
        <div className="subscription-page">
          <div className="loading-state">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="subscription-page-wrapper">
      {/* Header with Logo and Logout */}
      <header className="subscription-header">
        <div className="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span>StaffTrack</span>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="org-name">{tenant?.name || 'Organization'}</span>
            <span className="user-email">{user?.email}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Logout
          </button>
        </div>
      </header>

      <div className="subscription-page">
        <div className="page-header">
          <h1>Choose Your Plan</h1>
          <p>Select a plan that works best for your organization</p>
        </div>

      {/* Current Subscription */}
      {subscription && (
        <div className="current-subscription">
          <div className="subscription-header">
            <div>
              <h2>Current Subscription</h2>
              <p className="plan-name">{subscription.plan?.name || 'No Plan'}</p>
            </div>
            <span className={`status-badge ${getStatusBadgeClass(subscription.status)}`}>
              {subscription.status?.charAt(0).toUpperCase() + subscription.status?.slice(1)}
            </span>
          </div>
          <div className="subscription-details">
            <div className="detail-item">
              <label>Billing Cycle</label>
              <span>{subscription.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}</span>
            </div>
            <div className="detail-item">
              <label>Period Ends</label>
              <span>{formatDate(subscription.currentPeriodEnd)}</span>
            </div>
            <div className="detail-item">
              <label>Days Remaining</label>
              <span>{subscription.daysRemaining} days</span>
            </div>
            <div className="detail-item">
              <label>Amount</label>
              <span>{formatPrice(subscription.priceAtSubscription)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Billing Toggle */}
      <div className="billing-toggle">
        <div className="toggle-wrapper">
          <button
            className={billingCycle === 'monthly' ? 'active' : ''}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button
            className={billingCycle === 'yearly' ? 'active' : ''}
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly
            <span className="discount">Save 17%</span>
          </button>
        </div>
      </div>

      {/* Payment Gateway Selection */}
      {gateways.length > 1 && (
        <div className="gateway-selection">
          <h3>Select Payment Method</h3>
          <div className="gateway-options">
            {gateways.map((gateway) => (
              <button
                key={gateway.provider}
                className={`gateway-option ${selectedGateway === gateway.provider ? 'active' : ''}`}
                onClick={() => setSelectedGateway(gateway.provider)}
              >
                <div className={`gateway-logo ${gateway.provider}`}>
                  {gateway.provider === 'paystack' ? (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  )}
                </div>
                <span className="gateway-name">
                  {gateway.provider.charAt(0).toUpperCase() + gateway.provider.slice(1)}
                </span>
                {selectedGateway === gateway.provider && (
                  <span className="check-icon">&#10003;</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="plans-grid">
        {plans.map((plan) => {
          const isCurrentPlan = subscription?.plan?._id === plan._id ||
                               subscription?.plan?.slug === plan.slug;

          return (
            <PlanCard
              key={plan._id}
              plan={plan}
              isCurrentPlan={isCurrentPlan}
              billingCycle={billingCycle}
              onSubscribe={handleSubscribe}
              processing={processingPlan === plan._id}
              formatPrice={formatPrice}
            />
          );
        })}
      </div>
      </div>

      {/* Footer */}
      <footer className="subscription-footer">
        <div className="footer-content">
          <div className="footer-left">
            <p>&copy; {new Date().getFullYear()} StaffTrack. All rights reserved.</p>
          </div>
          <div className="footer-links">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/contact">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Subscription;
