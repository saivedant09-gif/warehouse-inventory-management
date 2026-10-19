import React from 'react';

const StatCard = ({ title, value, subtext, icon: Icon, colorClass = 'icon-blue' }) => {
  return (
    <div className="stat-card">
      <div className="stat-card-info">
        <span className="stat-card-title">{title}</span>
        <span className="stat-card-value">{value}</span>
        {subtext && <span className="stat-card-subtext">{subtext}</span>}
      </div>
      {Icon && (
        <div className={`stat-card-icon-box ${colorClass}`}>
          <Icon size={24} />
        </div>
      )}
    </div>
  );
};

export default StatCard;
