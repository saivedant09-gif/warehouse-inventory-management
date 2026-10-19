import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="not-found-container">
      <div className="not-found-code">404</div>
      <h2 className="not-found-title">Page Not Found</h2>
      <p className="not-found-desc">
        The warehouse page or resource you requested does not exist or may have been relocated.
      </p>
      <Link to="/" className="btn btn-primary">
        <Home size={18} /> Back to Dashboard
      </Link>
    </div>
  );
};

export default NotFound;
