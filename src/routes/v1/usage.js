// src/routes/v1/usage.js
const express = require('express');
const {
    getAllUsageLogs,
    getUsageLogsByDevice,
    logDeviceUsage,
    getUsageStats
} = require('../../controllers/usageController');
const {
    validate,
    rules
} = require('../../middleware/validator');
const {
    protect,
    validateApiKey
} = require('../../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Usage
 *   description: Usage log management
 */

// Public routes with API key authentication
router.post('/log', validateApiKey, validate(rules.logUsage), logDeviceUsage);

// Protected routes
router.use(protect);

// Get all usage logs
router.get('/', getAllUsageLogs);

// Get usage statistics
router.get('/stats', getUsageStats);

// Get usage logs for a device
router.get('/device/:deviceId', getUsageLogsByDevice);

module.exports = router;