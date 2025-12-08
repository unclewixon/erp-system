import { Link } from 'react-router-dom';
import {
  HiOutlineExclamationCircle,
  HiOutlineCreditCard,
  HiOutlineSparkles,
  HiOutlineClock,
} from 'react-icons/hi';
import './TrialExpiredModal.css';

const TrialExpiredModal = ({ isOpen, tenant, onClose }) => {
  if (!isOpen) return null;

  const trialEndDate = tenant?.trial?.trialEndDate
    ? new Date(tenant.trial.trialEndDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'N/A';

  return (
    <div className="trial-modal-overlay">
      <div className="trial-modal">
        <div className="trial-modal-icon">
          <HiOutlineClock />
        </div>

        <h2>Your Free Trial Has Ended</h2>

        <p className="trial-message">
          Your {tenant?.trial?.trialDays || 3}-day free trial expired on <strong>{trialEndDate}</strong>.
          To continue accessing all features, please choose a subscription plan.
        </p>

        <div className="trial-features">
          <h3>What you'll unlock with a subscription:</h3>
          <ul>
            <li>
              <HiOutlineSparkles />
              <span>Unlimited employee management</span>
            </li>
            <li>
              <HiOutlineSparkles />
              <span>Advanced HR modules</span>
            </li>
            <li>
              <HiOutlineSparkles />
              <span>Payroll & attendance tracking</span>
            </li>
            <li>
              <HiOutlineSparkles />
              <span>Priority customer support</span>
            </li>
          </ul>
        </div>

        <div className="trial-actions">
          <Link to="/app/subscription" className="btn-subscribe">
            <HiOutlineCreditCard />
            Choose a Plan
          </Link>
        </div>

        <p className="trial-contact">
          Need help? <a href="mailto:support@erp.com">Contact our support team</a>
        </p>
      </div>
    </div>
  );
};

export default TrialExpiredModal;
