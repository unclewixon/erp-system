const LoadingSpinner = ({ size = 'md', fullScreen = false }) => {
  const sizes = {
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
  };

  if (fullScreen) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100%',
        }}
      >
        <div
          className="spinner"
          style={{ width: sizes[size], height: sizes[size] }}
        />
      </div>
    );
  }

  return (
    <div
      className="spinner"
      style={{ width: sizes[size], height: sizes[size] }}
    />
  );
};

export default LoadingSpinner;
