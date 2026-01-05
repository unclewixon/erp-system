const Card = ({
  children,
  title,
  description,
  className = '',
  style = {},
  padding = '1.5rem',
}) => {
  const cardStyle = {
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    padding,
    ...style,
  };

  const titleStyle = {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: description ? '0.25rem' : '1rem',
  };

  const descStyle = {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    marginBottom: '1.5rem',
  };

  return (
    <div style={cardStyle} className={className}>
      {title && <h2 style={titleStyle}>{title}</h2>}
      {description && <p style={descStyle}>{description}</p>}
      {children}
    </div>
  );
};

export default Card;
