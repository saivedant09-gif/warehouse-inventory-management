// Utility formatters for Warehouse Inventory System

export const formatDate = (dateString) => {
  if (!dateString) return '—';
  // If date string contains ISO T, take date part
  const cleanDate = dateString.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = parseInt(month, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${months[monthIndex]} ${year}`;
    }
  }
  return cleanDate;
};

export const formatInputDate = (dateString) => {
  if (!dateString) return '';
  return dateString.split('T')[0];
};

export const formatNumber = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return Number(val).toLocaleString();
};

export const formatWeight = (weight) => {
  if (weight === null || weight === undefined || weight === '') return '—';
  return `${Number(weight).toFixed(2)} kg`;
};

export const formatTemperature = (temp) => {
  if (temp === null || temp === undefined || temp === '') return 'Ambient';
  return `${Number(temp).toFixed(1)} °C`;
};

export const getStatusBadge = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'stored':
      return { label: 'Stored (In-Stock)', class: 'badge-success' };
    case 'dispatched':
      return { label: 'Dispatched', class: 'badge-info' };
    case 'reserved':
      return { label: 'Reserved', class: 'badge-warning' };
    case 'damaged':
      return { label: 'Damaged', class: 'badge-danger' };
    default:
      return { label: status || 'Unknown', class: 'badge-default' };
  }
};
