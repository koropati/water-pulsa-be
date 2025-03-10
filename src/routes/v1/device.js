// src/routes/v1/device.js
const express = require('express');
const {
    authenticateDevice,
    checkDeviceBalance,
    logDeviceUsage,
    validateDeviceToken
} = require('../../controllers/deviceIoTController');
const {
    validateApiKey
} = require('../../middleware/apiKey');
const {
    validate,
    rules
} = require('../../middleware/validator');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Device
 *   description: IoT Device API
 */

/**
 * @swagger
 * /device/auth:
 *   post:
 *     summary: Authenticate a device
 *     tags: [Device]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceKey
 *             properties:
 *               deviceKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Device authentication successful
 *       401:
 *         description: Invalid API key
 *       404:
 *         description: Device not found or inactive
 *       500:
 *         description: Server error
 */
router.post('/auth', validateApiKey, validate(rules.authenticateDevice), authenticateDevice);

/**
 * @swagger
 * /device/balance:
 *   post:
 *     summary: Check device balance
 *     tags: [Device]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceKey
 *             properties:
 *               deviceKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Device balance retrieved successfully
 *       401:
 *         description: Invalid API key
 *       404:
 *         description: Device not found
 *       403:
 *         description: Device is inactive
 *       500:
 *         description: Server error
 */
router.post('/balance', validateApiKey, validate(rules.checkDeviceBalance), checkDeviceBalance);

/**
 * @swagger
 * /device/usage:
 *   post:
 *     summary: Log device usage
 *     tags: [Device]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceKey
 *               - usageAmount
 *             properties:
 *               deviceKey:
 *                 type: string
 *               usageAmount:
 *                 type: number
 *                 description: Amount of usage to log
 *     responses:
 *       200:
 *         description: Usage logged successfully
 *       400:
 *         description: Invalid usage amount
 *       401:
 *         description: Invalid API key
 *       404:
 *         description: Device not found
 *       403:
 *         description: Device is inactive
 *       500:
 *         description: Server error
 */
router.post('/usage', validateApiKey, validate(rules.logDeviceUsage), logDeviceUsage);

/**
 * @swagger
 * /device/token/validate:
 *   post:
 *     summary: Validate a device token
 *     tags: [Device]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceKey
 *               - token
 *             properties:
 *               deviceKey:
 *                 type: string
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token validated successfully
 *       401:
 *         description: Invalid API key
 *       404:
 *         description: Device not found
 *       403:
 *         description: Device is inactive
 *       500:
 *         description: Server error
 */
router.post('/token/validate', validateApiKey, validate(rules.validateDeviceToken), validateDeviceToken);

module.exports = router;