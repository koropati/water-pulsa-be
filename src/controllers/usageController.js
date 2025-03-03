// src/controllers/usageController.js
const usageService = require('../services/usageService');
const {
    success,
    error,
    paginate
} = require('../utils/response');
const {
    STATUS_CODES
} = require('../config/constants');
const {
    getPaginationParams
} = require('../utils/helpers');
const {
    logger
} = require('../utils/logger');

/**
 * @swagger
 * /usage:
 *   get:
 *     summary: Get all usage logs
 *     tags: [Usage]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *         description: Filter by device ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by start date (ISO 8601 format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by end date (ISO 8601 format)
 *     responses:
 *       200:
 *         description: List of usage logs
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const getAllUsageLogs = async (req, res, next) => {
    try {
        const options = {
            ...getPaginationParams(req),
            deviceId: req.query.deviceId,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const result = await usageService.getAllUsageLogs(
            options,
            req.user.id,
            req.user.role
        );

        return paginate(
            res,
            result.usageLogs,
            result.meta.total,
            result.meta.page,
            result.meta.limit,
            'Usage logs retrieved successfully'
        );
    } catch (err) {
        logger.error(`Error getting usage logs: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /usage/device/{deviceId}:
 *   get:
 *     summary: Get usage logs for a specific device
 *     tags: [Usage]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by start date (ISO 8601 format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by end date (ISO 8601 format)
 *     responses:
 *       200:
 *         description: List of usage logs for the device
 *       404:
 *         description: Device not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
const getUsageLogsByDevice = async (req, res, next) => {
    try {
        const options = {
            ...getPaginationParams(req),
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const result = await usageService.getUsageLogsByDevice(
            req.params.deviceId,
            options,
            req.user.id,
            req.user.role
        );

        return paginate(
            res,
            result.usageLogs,
            result.meta.total,
            result.meta.page,
            result.meta.limit,
            'Usage logs retrieved successfully'
        );
    } catch (err) {
        logger.error(`Error getting usage logs by device: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /usage/log:
 *   post:
 *     summary: Log device usage and update balance
 *     tags: [Usage]
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
 *                 format: float
 *                 minimum: 0.01
 *     responses:
 *       200:
 *         description: Usage logged successfully
 *       400:
 *         description: Validation error or insufficient balance
 *       404:
 *         description: Device not found
 *       403:
 *         description: Device is inactive
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const logDeviceUsage = async (req, res, next) => {
    try {
        const {
            deviceKey,
            usageAmount
        } = req.body;

        if (!deviceKey || usageAmount === undefined) {
            return error(res, STATUS_CODES.BAD_REQUEST, 'Device key and usage amount are required');
        }

        if (isNaN(parseFloat(usageAmount)) || parseFloat(usageAmount) <= 0) {
            return error(res, STATUS_CODES.BAD_REQUEST, 'Usage amount must be a positive number');
        }

        const result = await usageService.logDeviceUsage(
            deviceKey,
            parseFloat(usageAmount)
        );

        if (!result.valid) {
            return error(
                res,
                STATUS_CODES.BAD_REQUEST,
                result.error || 'Failed to log usage', {
                    remainingBalance: result.remainingBalance
                }
            );
        }

        return success(res, STATUS_CODES.SUCCESS, 'Usage logged successfully', result);
    } catch (err) {
        logger.error(`Error logging device usage: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /usage/stats:
 *   get:
 *     summary: Get usage statistics
 *     tags: [Usage]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Time range in days (default 30)
 *     responses:
 *       200:
 *         description: Usage statistics
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const getUsageStats = async (req, res, next) => {
    try {
        const timeRange = req.query.timeRange ? parseInt(req.query.timeRange) : 30;

        const stats = await usageService.getUsageStats(
            req.user.id,
            req.user.role, {
                timeRange
            }
        );

        return success(res, STATUS_CODES.SUCCESS, 'Usage stats retrieved successfully', {
            stats
        });
    } catch (err) {
        logger.error(`Error getting usage stats: ${err.message}`);
        return next(err);
    }
};

module.exports = {
    getAllUsageLogs,
    getUsageLogsByDevice,
    logDeviceUsage,
    getUsageStats
};