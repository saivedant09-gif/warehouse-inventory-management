const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getInventoryStatusDistribution,
  getCategoryDistribution,
  getSectionCapacityMetrics,
  getRecentDispatches,
  getExpiryAlerts
} = require('../controllers/dashboardController');

router.get('/stats', getDashboardStats);
router.get('/inventory-status', getInventoryStatusDistribution);
router.get('/category-distribution', getCategoryDistribution);
router.get('/section-capacity', getSectionCapacityMetrics);
router.get('/recent-dispatches', getRecentDispatches);
router.get('/expiry-alerts', getExpiryAlerts);

module.exports = router;
