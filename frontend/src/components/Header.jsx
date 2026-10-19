import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { checkHealth } from '../api/api';
import { RefreshCw, Database } from 'lucide-react';

const pageTitles = {
  '/': 'Dashboard Overview',
  '/products': 'Product Catalog Management',
  '/sections': 'Warehouse Sections & Capacity',
  '/employees': 'Employee & Staff Directory',
  '/inventory': 'Inventory Stock Management',
  '/dispatches': 'Outbound Dispatch Records'
};

const Header = () => {
  const location = useLocation();
  const [dbStatus, setDbStatus] = useState({ online: true, checking: false, message: 'MySQL Connected' });

  const currentTitle = pageTitles[location.pathname] || 'Warehouse Management';

  const verifyHealth = async () => {
    setDbStatus((prev) => ({ ...prev, checking: true }));
    try {
      const res = await checkHealth();
      if (res.data?.database?.connected) {
        setDbStatus({ online: true, checking: false, message: 'MySQL 8.0 Connected' });
      } else {
        setDbStatus({ online: false, checking: false, message: 'DB Disconnected' });
      }
    } catch {
      setDbStatus({ online: false, checking: false, message: 'Backend Offline' });
    }
  };

  useEffect(() => {
    verifyHealth();
    const interval = setInterval(verifyHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="top-header">
      <div className="header-left">
        <h1 className="header-page-title">{currentTitle}</h1>
      </div>

      <div className="header-right">
        <div className={`system-status-pill ${dbStatus.online ? '' : 'offline'}`} title="Backend & MySQL status">
          <span className="status-dot"></span>
          <Database size={14} />
          <span>{dbStatus.message}</span>
        </div>

        <button
          className="btn-icon"
          onClick={verifyHealth}
          title="Refresh connection status"
        >
          <RefreshCw size={16} className={dbStatus.checking ? 'spin' : ''} />
        </button>
      </div>
    </header>
  );
};

export default Header;
