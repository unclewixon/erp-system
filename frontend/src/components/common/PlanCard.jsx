const PlanCard = ({
  plan,
  isCurrentPlan = false,
  billingCycle = 'monthly',
  onSubscribe,
  processing = false,
  formatPrice,
}) => {
  const price = billingCycle === 'yearly' ? plan.price?.yearly : plan.price?.monthly;

  const getEmployeeRange = () => {
    if (plan.employeeRange?.max === null) {
      return `${plan.employeeRange.min}+ Employees`;
    }
    return `${plan.employeeRange.min}-${plan.employeeRange.max} Employees`;
  };

  const cardStyle = {
    background: 'var(--card-bg)',
    border: `1px solid ${plan.isPopular ? '#3b82f6' : isCurrentPlan ? '#10b981' : 'var(--border-color)'}`,
    padding: '1.5rem',
    position: 'relative',
    transition: 'all 0.3s',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: plan.isPopular ? '0 4px 20px rgba(59, 130, 246, 0.2)' : 'none',
  };

  const badgeStyle = {
    position: 'absolute',
    top: 0,
    right: 0,
    background: plan.isPopular ? '#3b82f6' : '#10b981',
    color: 'white',
    padding: '0.375rem 0.75rem',
    fontSize: '0.6875rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const headerStyle = {
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid var(--border-color)',
  };

  const titleStyle = {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: plan.isPopular ? '#3b82f6' : 'var(--text-primary)',
    marginBottom: '0.375rem',
  };

  const descStyle = {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
    margin: 0,
  };

  const priceStyle = {
    marginBottom: '1.25rem',
  };

  const amountStyle = {
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  };

  const periodStyle = {
    fontSize: '0.875rem',
    color: 'var(--text-tertiary)',
  };

  const rangeStyle = {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    marginTop: '0.375rem',
  };

  const featuresStyle = {
    marginBottom: '1.5rem',
    flex: 1,
  };

  const featureItemStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.625rem',
    padding: '0.375rem 0',
    fontSize: '0.8125rem',
  };

  const checkStyle = {
    width: 16,
    height: 16,
    minWidth: 16,
    color: '#10b981',
    flexShrink: 0,
    marginTop: 2,
  };

  const featureTextStyle = {
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  };

  const buttonStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: processing || isCurrentPlan ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    marginTop: 'auto',
    border: plan.isPopular ? 'none' : '1px solid var(--border-color)',
    background: plan.isPopular ? '#3b82f6' : 'var(--bg-secondary)',
    color: plan.isPopular ? 'white' : 'var(--text-primary)',
    opacity: processing || isCurrentPlan ? 0.5 : 1,
  };

  const includedFeatures = plan.features?.filter(f => f.included) || [];

  return (
    <div style={cardStyle}>
      {plan.isPopular && !isCurrentPlan && (
        <div style={badgeStyle}>Most Popular</div>
      )}
      {isCurrentPlan && (
        <div style={badgeStyle}>Current Plan</div>
      )}

      <div style={headerStyle}>
        <h3 style={titleStyle}>{plan.name}</h3>
        <p style={descStyle}>{plan.description}</p>
      </div>

      <div style={priceStyle}>
        <div>
          {plan.isEnterprise ? (
            <span style={amountStyle}>Custom</span>
          ) : (
            <>
              <span style={amountStyle}>{formatPrice(price || 0)}</span>
              <span style={periodStyle}>/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
            </>
          )}
        </div>
        <p style={rangeStyle}>{getEmployeeRange()}</p>
      </div>

      <div style={featuresStyle}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {includedFeatures.slice(0, 8).map((feature, idx) => (
            <li key={idx} style={featureItemStyle}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={checkStyle}>
                <path d="M5 13l4 4L19 7" />
              </svg>
              <span style={featureTextStyle}>
                {feature.name || feature.featureSlug?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Feature'}
              </span>
            </li>
          ))}
          {includedFeatures.length > 8 && (
            <li style={{ ...featureItemStyle, paddingTop: '0.5rem' }}>
              <span style={{ color: '#3b82f6', fontWeight: 500 }}>
                +{includedFeatures.length - 8} more features
              </span>
            </li>
          )}
        </ul>
      </div>

      <button
        style={buttonStyle}
        onClick={() => onSubscribe(plan)}
        disabled={processing || isCurrentPlan}
      >
        {processing
          ? 'Processing...'
          : isCurrentPlan
          ? 'Current Plan'
          : plan.isEnterprise
          ? 'Contact Sales'
          : 'Subscribe'}
      </button>
    </div>
  );
};

export default PlanCard;
