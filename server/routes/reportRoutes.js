const express = require('express');
const router = express.Router();
const rc = require('../controllers/reportController');
const cc = require('../controllers/cronController');
const { protect, protectCron } = require('../middleware/auth');

// Protected report routes
router.get('/summary', protect, rc.getSummary);
router.get('/export/pdf', protect, rc.exportPDF);
router.get('/export/excel', protect, rc.exportExcel);

// Notification routes — read-all MUST come before /:id to avoid param shadowing
router.get('/notifications', protect, rc.getNotifications);
router.patch('/notifications/read-all', protect, rc.markAllNotificationsRead);
router.patch('/notifications/:id/read', protect, rc.markNotificationRead);

// Vercel Cron endpoints (protected by CRON_SECRET)
router.get('/cron/recurring', protectCron, cc.processRecurringTransactions);
router.get('/cron/budget-check', protectCron, cc.runBudgetAlerts);

module.exports = router;

