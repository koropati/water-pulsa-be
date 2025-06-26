// src/routes/v1/mqtt.js
const express = require('express');
const {
    getMQTTStatus,
    sendCommandToDevice,
    broadcastCommand,
    getDeviceStatus,
    reconnectMQTT,
    getMQTTLogs
} = require('../../controllers/mqttController');
const { validate, rules } = require('../../middleware/validator');
const { protect } = require('../../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: MQTT
 *   description: MQTT communication management
 */

// All MQTT routes require authentication
router.use(protect);

// Get MQTT service status
router.get('/status', getMQTTStatus);

// Get device online/offline status
router.get('/device-status', getDeviceStatus);

// Get MQTT logs
router.get('/logs', getMQTTLogs);

// Send command to specific device
router.post('/send-command', validate(rules.sendMQTTCommand), sendCommandToDevice);

// Broadcast command to all devices (admin only)
router.post('/broadcast', validate(rules.broadcastMQTTCommand), broadcastCommand);

// Reconnect MQTT service (admin only)
router.post('/reconnect', reconnectMQTT);

module.exports = router;