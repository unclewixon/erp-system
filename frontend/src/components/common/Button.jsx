const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
  style = {},
  fullWidth = false,
}) => {
  const variants = {
    primary: {
      background: '#3b82f6',
      color: 'white',
      border: 'none',
    },
    secondary: {
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-color)',
    },
    danger: {
      background: '#ef4444',
      color: 'white',
      border: 'none',
    },
    success: {
      background: '#10b981',
      color: 'white',
      border: 'none',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-primary)',
      border: 'none',
    },
  };

  const sizes = {
    sm: { padding: '0.5rem 0.875rem', fontSize: '0.8125rem' },
    md: { padding: '0.75rem 1.25rem', fontSize: '0.875rem' },
    lg: { padding: '0.875rem 1.5rem', fontSize: '1rem' },
  };

  const buttonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontWeight: 600,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    opacity: disabled || loading ? 0.5 : 1,
    width: fullWidth ? '100%' : 'auto',
    ...variants[variant],
    ...sizes[size],
    ...style,
  };

  return (
    <button
      type={type}
      style={buttonStyle}
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};

export default Button;
