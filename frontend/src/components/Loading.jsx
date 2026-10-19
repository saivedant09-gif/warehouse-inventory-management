import React from 'react';

const Loading = ({ message = 'Loading data...' }) => {
  return (
    <div className="loading-box">
      <div className="spinner"></div>
      <p>{message}</p>
    </div>
  );
};

export default Loading;
