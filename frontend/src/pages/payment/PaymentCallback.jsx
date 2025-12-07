import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Payment.scss';

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, failed
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');

    if (reference) {
      verifyPayment(reference);
    } else {
      setStatus('failed');
      setMessage('No payment reference found');
    }
  }, [searchParams]);

  const verifyPayment = async (reference) => {
    try {
      const response = await api.post('/payments/subscribe/verify', { reference });

      if (response.data.success) {
        setStatus('success');
        setMessage('Payment successful! Your subscription is now active.');
        toast.success('Payment successful!');

        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/app/dashboard');
        }, 3000);
      } else {
        setStatus('failed');
        setMessage(response.data.message || 'Payment verification failed');
        toast.error('Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('failed');
      setMessage(error.response?.data?.message || 'Payment verification failed. Please contact support.');
      toast.error('Payment verification failed');
    }
  };

  return (
    <div className="payment-callback-page">
      <div className="callback-card">
        {status === 'verifying' && (
          <>
            <div className="spinner-large"></div>
            <h2>Verifying Payment</h2>
            <p>{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="16 8 10 14 8 12" />
              </svg>
            </div>
            <h2>Payment Successful!</h2>
            <p>{message}</p>
            <p className="redirect-text">Redirecting to dashboard...</p>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="error-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2>Payment Failed</h2>
            <p>{message}</p>
            <div className="action-buttons">
              <button onClick={() => navigate('/app/subscription')} className="btn-primary">
                Try Again
              </button>
              <button onClick={() => navigate('/app/dashboard')} className="btn-secondary">
                Go to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback;
