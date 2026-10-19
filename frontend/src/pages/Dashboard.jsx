import React, { useState, useEffect } from 'react';
import {
  Package,
  Warehouse,
  Users,
  Boxes,
  Truck,
  AlertTriangle,
  Layers,
  Percent,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import StatCard from '../components/StatCard';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import {
  getDashboardStats,
  getInventoryStatusDistribution,
  getCategoryDistribution,
  getSectionCapacityMetrics,
  getRecentDispatches,
  getExpiryAlerts
} from '../api/api';
import { formatDate, formatNumber } from '../utils/formatters';

const STATUS_COLORS = {
  Stored: '#10b981',
  Dispatched: '#0ea5e9',
  Reserved: '#f59e0b',
  Damaged: '#ef4444'
};
const FALLBACK_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [statusDist, setStatusDist] = useState([]);
  const [categoryDist, setCategoryDist] = useState([]);
  const [sectionCapacity, setSectionCapacity] = useState([]);
  const [recentDispatches, setRecentDispatches] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [
        statsRes,
        statusRes,
        categoryRes,
        capacityRes,
        dispatchesRes,
        alertsRes
      ] = await Promise.all([
        getDashboardStats(),
        getInventoryStatusDistribution(),
        getCategoryDistribution(),
        getSectionCapacityMetrics(),
        getRecentDispatches(),
        getExpiryAlerts()
      ]);

      setStats(statsRes.data?.data || null);
      setStatusDist(statusRes.data?.data || []);
      setCategoryDist(categoryRes.data?.data || []);
      setSectionCapacity(capacityRes.data?.data || []);
      setRecentDispatches(dispatchesRes.data?.data || []);
      setExpiryAlerts(alertsRes.data?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data from MySQL backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return <Loading message="Querying live warehouse statistics from MySQL database..." />;
  }

  return (
    <div>
      <div className="page-header-row">
        <div className="page-intro">
          <h2 className="page-title">Warehouse Management Dashboard</h2>
          <p className="page-description">
            Real-time analytics and inventory operational metrics computed from MySQL database.
          </p>
        </div>
        <button onClick={fetchDashboardData} className="btn btn-secondary btn-sm">
          Refresh Data
        </button>
      </div>

      <ErrorMessage message={error} onDismiss={() => setError('')} />

      {/* KPI Stats Grid */}
      {stats && (
        <div className="stats-grid">
          <StatCard
            title="Total Products"
            value={stats.total_products}
            subtext="Catalog items"
            icon={Package}
            colorClass="icon-blue"
          />
          <StatCard
            title="Warehouse Sections"
            value={stats.total_sections}
            subtext={`${stats.overall_utilization_percent}% capacity used`}
            icon={Warehouse}
            colorClass="icon-purple"
          />
          <StatCard
            title="Total Employees"
            value={stats.total_employees}
            subtext="Operations & Dispatch"
            icon={Users}
            colorClass="icon-cyan"
          />
          <StatCard
            title="Active Inventory"
            value={formatNumber(stats.active_stock_quantity)}
            subtext={`${stats.active_batches} active batches`}
            icon={Boxes}
            colorClass="icon-green"
          />
          <StatCard
            title="Total Dispatches"
            value={stats.total_dispatches}
            subtext={`${stats.dispatched_batches} batches shipped`}
            icon={Truck}
            colorClass="icon-amber"
          />
          <StatCard
            title="Capacity Remaining"
            value={formatNumber(stats.total_available_space)}
            subtext={`of ${formatNumber(stats.total_capacity)} total units`}
            icon={Percent}
            colorClass="icon-rose"
          />
        </div>
      )}

      {/* Charts Section */}
      <div className="dashboard-charts-grid">
        {/* Chart 1: Inventory Status Distribution */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Inventory Status Distribution</h3>
              <span className="chart-subtitle">Active Stored vs Dispatched batches</span>
            </div>
          </div>
          <div className="chart-wrapper">
            {statusDist.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDist}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    innerRadius={45}
                    paddingAngle={4}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusDist.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[entry.status] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name, item) => [
                      `${val} batches (${formatNumber(item.payload.total_quantity)} units)`,
                      name
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ textAlign: 'center', color: '#94a3b8', paddingTop: '100px' }}>No inventory status data</p>
            )}
          </div>
        </div>

        {/* Chart 2: Product Category Distribution */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Category Stock Distribution</h3>
              <span className="chart-subtitle">Active stored units by category</span>
            </div>
          </div>
          <div className="chart-wrapper">
            {categoryDist.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryDist} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val) => [formatNumber(val) + ' units', 'Active Stock']} />
                  <Bar dataKey="active_quantity" name="Active Units" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ textAlign: 'center', color: '#94a3b8', paddingTop: '100px' }}>No category data</p>
            )}
          </div>
        </div>
      </div>

      {/* Section Capacity Utilization Chart */}
      <div className="chart-card" style={{ marginBottom: '28px' }}>
        <div className="chart-header">
          <div>
            <h3 className="chart-title">Warehouse Section Capacity & Space Allocation</h3>
            <span className="chart-subtitle">
              Used Space vs Available Space per Section (Maintains available_space = capacity - stock)
            </span>
          </div>
        </div>
        <div className="chart-wrapper" style={{ height: '300px' }}>
          {sectionCapacity.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectionCapacity} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="section_id" tickFormatter={(id) => `Section ${id}`} tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(val, name) => [`${formatNumber(val)} units`, name]}
                  labelFormatter={(id) => `Section ${id}`}
                />
                <Legend />
                <Bar dataKey="used_space" name="Allocated Stock" stackId="a" fill="#2563eb" />
                <Bar dataKey="available_space" name="Available Space" stackId="a" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: 'center', color: '#94a3b8', paddingTop: '100px' }}>No section capacity data</p>
          )}
        </div>
      </div>

      {/* Bottom Grid: Recent Dispatches & Product Expiry Alerts */}
      <div className="dashboard-bottom-grid">
        {/* Recent Dispatches */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Recent Dispatches</h3>
              <span className="chart-subtitle">Latest outbound shipments handled</span>
            </div>
          </div>
          {recentDispatches.length > 0 ? (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Vehicle</th>
                    <th>Handled By</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDispatches.map((d) => (
                    <tr key={d.dispatch_id}>
                      <td>{formatDate(d.date)}</td>
                      <td>
                        <strong>{d.product_name}</strong>
                      </td>
                      <td>{formatNumber(d.batch_quantity)}</td>
                      <td><code>{d.vehicle_no}</code></td>
                      <td>{d.employee_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No dispatches recorded yet.</p>
          )}
        </div>

        {/* Expiry Alerts */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Perishable Expiry Alerts</h3>
              <span className="chart-subtitle">Stock batches nearing expiration (&le; 60 days)</span>
            </div>
            <AlertTriangle size={18} color="#f59e0b" />
          </div>
          {expiryAlerts.length > 0 ? (
            <div className="alert-item-list">
              {expiryAlerts.map((item) => {
                const isExpired = item.days_until_expiry < 0;
                const isCritical = item.days_until_expiry >= 0 && item.days_until_expiry <= 15;
                const itemClass = isExpired
                  ? 'critical'
                  : isCritical
                  ? 'critical'
                  : item.days_until_expiry <= 30
                  ? 'urgent'
                  : 'upcoming';

                return (
                  <div key={item.inventory_id} className={`alert-item ${itemClass}`}>
                    <div className="alert-item-info">
                      <span className="alert-item-title">{item.product_name}</span>
                      <span className="alert-item-meta">
                        Batch #{item.inventory_id} • Section {item.section_id} ({item.section_temperature ? `${item.section_temperature}°C` : 'Ambient'}) • {item.quantity} units
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${isExpired || isCritical ? 'badge-danger' : 'badge-warning'}`}>
                        {item.alert_level}
                      </span>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Expires: {formatDate(item.expiry_date)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={32} color="#10b981" style={{ marginBottom: '8px' }} />
              <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>No active stock nearing expiration.</p>
              <p style={{ fontSize: '0.775rem' }}>All perishable inventory batches are well within safe shelf-life.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
