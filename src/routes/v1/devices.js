// src/routes/v1/devices.js
const express = require('express');
const {
    getAllDevices,
    getDeviceById,
    createDevice,
    updateDevice,
    updateDevicePartial,
    deleteDevice,
    getDevicesForDropdown,
    getDeviceStats,
    authenticateDevice
} = require('../../controllers/deviceController');
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
 *   name: Devices
 *   description: Device management
 */

// Public routes with API key authentication
router.post('/auth', validateApiKey, validate(rules.authenticateDevice), authenticateDevice);

// Protected routes
router.use(protect);

// Get all devices
router.get('/', getAllDevices);

// Get device statistics
router.get('/stats', getDeviceStats);

// Get devices for dropdown
router.get('/dropdown', getDevicesForDropdown);

// Get device by ID
router.get('/:id', getDeviceById);

// Create a new device
router.post('/', validate(rules.createDevice), createDevice);

// Update a device
router.put('/:id', validate(rules.updateDevice), updateDevice);

router.patch('/:id', validate(rules.updateDevicePartial), updateDevicePartial);

// Delete a device
router.delete('/:id', deleteDevice);

module.exports = router;