// src/routes/v1/balances.js
const express = require('express');
const {
    getAllBalances,
    getBalanceByDevice,
    checkDeviceBalance,
    updateBalance,
    getBalanceStats
} = require('../../controllers/balanceController');
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
 *   name: Balances
 *   description: Balance management
 */

// Public routes with API key authentication
router.post('/check', validateApiKey, validate(rules.checkBalance), checkDeviceBalance);

// Protected routes
router.use(protect);

// Get all balances
router.get('/', getAllBalances);

// Get balance statistics
router.get('/stats', getBalanceStats);

// Get balance for a device
router.get('/device/:deviceId', getBalanceByDevice);

// Update balance
router.post('/update', validate(rules.updateBalance), updateBalance);

module.exports = router;