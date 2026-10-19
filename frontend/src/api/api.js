import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Response interceptor for consistent error extraction
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const customMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(customMessage));
  }
);

// Health Check
export const checkHealth = () => apiClient.get('/health');

// Dashboard APIs
export const getDashboardStats = () => apiClient.get('/dashboard/stats');
export const getInventoryStatusDistribution = () => apiClient.get('/dashboard/inventory-status');
export const getCategoryDistribution = () => apiClient.get('/dashboard/category-distribution');
export const getSectionCapacityMetrics = () => apiClient.get('/dashboard/section-capacity');
export const getRecentDispatches = () => apiClient.get('/dashboard/recent-dispatches');
export const getExpiryAlerts = () => apiClient.get('/dashboard/expiry-alerts');

// Product APIs
export const getProducts = (params) => apiClient.get('/products', { params });
export const getProduct = (id) => apiClient.get(`/products/${id}`);
export const createProduct = (data) => apiClient.post('/products', data);
export const updateProduct = (id, data) => apiClient.put(`/products/${id}`, data);
export const deleteProduct = (id) => apiClient.delete(`/products/${id}`);

// Warehouse Section APIs
export const getSections = () => apiClient.get('/sections');
export const getSection = (id) => apiClient.get(`/sections/${id}`);
export const createSection = (data) => apiClient.post('/sections', data);
export const updateSection = (id, data) => apiClient.put(`/sections/${id}`, data);
export const deleteSection = (id) => apiClient.delete(`/sections/${id}`);

// Employee APIs
export const getEmployees = () => apiClient.get('/employees');
export const getEmployee = (id) => apiClient.get(`/employees/${id}`);
export const createEmployee = (data) => apiClient.post('/employees', data);
export const updateEmployee = (id, data) => apiClient.put(`/employees/${id}`, data);
export const deleteEmployee = (id) => apiClient.delete(`/employees/${id}`);

// Inventory APIs
export const getInventory = (params) => apiClient.get('/inventory', { params });
export const getInventoryItem = (id) => apiClient.get(`/inventory/${id}`);
export const createInventory = (data) => apiClient.post('/inventory', data);
export const updateInventory = (id, data) => apiClient.put(`/inventory/${id}`, data);
export const deleteInventory = (id) => apiClient.delete(`/inventory/${id}`);

// Dispatch APIs
export const getDispatches = (params) => apiClient.get('/dispatches', { params });
export const getDispatch = (id) => apiClient.get(`/dispatches/${id}`);
export const createDispatch = (data) => apiClient.post('/dispatches', data);
export const updateDispatch = (id, data) => apiClient.put(`/dispatches/${id}`, data);
export const deleteDispatch = (id) => apiClient.delete(`/dispatches/${id}`);

export default apiClient;
