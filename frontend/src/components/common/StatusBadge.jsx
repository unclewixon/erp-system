const StatusBadge = ({ status, size = 'md', className = '' }) => {
  const getStatusConfig = (status) => {
    const configs = {
      active: { bg: '#d1fae5', color: '#065f46', label: 'Active' },
      trial: { bg: '#fef3c7', color: '#92400e', label: 'Trial' },
      expired: { bg: '#fee2e2', color: '#991b1b', label: 'Expired' },
      cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
      past_due: { bg: '#fee2e2', color: '#991b1b', label: 'Past Due' },
      pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
      inactive: { bg: '#f3f4f6', color: '#6b7280', label: 'Inactive' },
      success: { bg: '#d1fae5', color: '#065f46', label: 'Success' },
      error: { bg: '#fee2e2', color: '#991b1b', label: 'Error' },
      warning: { bg: '#fef3c7', color: '#92400e', label: 'Warning' },
      info: { bg: '#dbeafe', color: '#1e40af', label: 'Info' },
    };
    return configs[status?.toLowerCase()] || configs.inactive;
  };

  const config = getStatusConfig(status);

  const sizeStyles = {
    sm: { padding: '0.25rem 0.5rem', fontSize: '0.6875rem' },
    md: { padding: '0.375rem 0.75rem', fontSize: '0.75rem' },
    lg: { padding: '0.5rem 1rem', fontSize: '0.875rem' },
  };

  const styles = {
    display: 'inline-flex',
    alignItems: 'center',
    background: config.bg,
    color: config.color,
    fontWeight: 600,
    textTransform: 'capitalize',
    ...sizeStyles[size],
  };

  return (
    <span style={styles} className={className}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
