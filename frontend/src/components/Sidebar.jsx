import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Users,
  Boxes,
  Truck,
  Layers
} from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/products', label: 'Products', icon: Package },
    { to: '/sections', label: 'Warehouse Sections', icon: Warehouse },
    { to: '/employees', label: 'Employees', icon: Users },
    { to: '/inventory', label: 'Inventory Stock', icon: Boxes },
    { to: '/dispatches', label: 'Dispatches', icon: Truck },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">
          <Warehouse size={22} />
        </div>
        <div className="sidebar-title-container">
          <span className="sidebar-title">WAREHOUSE</span>
          <span className="sidebar-subtitle">Inventory System</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Navigation Modules</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              end={item.to === '/'}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="dbms-tag">
          <Layers size={14} />
          <span>DBMS Project • 5 Entities</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
