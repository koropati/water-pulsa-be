// src/controllers/balanceController.js
const balanceService = require('../services/balanceService');
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
 * /balances:
 *   get:
 *     summary: Get all balances
 *     tags: [Balances]
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
 *         name: minBalance
 *         schema:
 *           type: number
 *           format: float
 *         description: Minimum balance filter
 *       - in: query
 *         name: maxBalance
 *         schema:
 *           type: number
 *           format: float
 *         description: Maximum balance filter
 *     responses:
 *       200:
 *         description: List of balances
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const getAllBalances = async (req, res, next) => {
    try {
        const options = {
            ...getPaginationParams(req),
            minBalance: req.query.minBalance,
            maxBalance: req.query.maxBalance
        };

        const result = await balanceService.getAllBalances(
            options,
            req.user.id,
            req.user.role
        );

        return paginate(
            res,
            result.balances,
            result.meta.total,
            result.meta.page,
            result.meta.limit,
            'Balances retrieved successfully'
        );
    } catch (err) {
        logger.error(`Error getting balances: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /balances/device/{deviceId}:
 *   get:
 *     summary: Get balance for a specific device
 *     tags: [Balances]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     responses:
 *       200:
 *         description: Device balance details
 *       404:
 *         description: Device not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
const getBalanceByDevice = async (req, res, next) => {
    try {
        const balance = await balanceService.getBalanceByDevice(
            req.params.deviceId,
            req.user.id,
            req.user.role
        );
        return success(res, STATUS_CODES.SUCCESS, 'Balance retrieved successfully', balance);
    } catch (err) {
        logger.error(`Error getting balance: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /balances/check:
 *   post:
 *     summary: Check device balance by device key
 *     tags: [Balances]
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
 *         description: Device balance checked successfully
 *       400:
 *         description: Device key is required
 *       404:
 *         description: Device not found
 *       403:
 *         description: Device is inactive
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const checkDeviceBalance = async (req, res, next) => {
    try {
        const {
            deviceKey
        } = req.body;

        if (!deviceKey) {
            return error(res, STATUS_CODES.BAD_REQUEST, 'Device key is required');
        }

        const result = await balanceService.checkDeviceBalance(deviceKey);
        return success(res, STATUS_CODES.SUCCESS, 'Balance checked successfully', result);
    } catch (err) {
        logger.error(`Error checking balance: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /balances/update:
 *   post:
 *     summary: Update balance for a device
 *     tags: [Balances]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *               - amount
 *             properties:
 *               deviceId:
 *                 type: string
 *               amount:
 *                 type: number
 *                 format: float
 *                 description: Positive or negative amount to update
 *     responses:
 *       200:
 *         description: Balance updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Device not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
const updateBalance = async (req, res, next) => {
    try {
        const {
            deviceId,
            amount
        } = req.body;

        if (!deviceId || amount === undefined) {
            return error(res, STATUS_CODES.BAD_REQUEST, 'Device ID and amount are required');
        }

        if (isNaN(parseFloat(amount))) {
            return error(res, STATUS_CODES.BAD_REQUEST, 'Amount must be a number');
        }

        const balance = await balanceService.updateBalance(
            deviceId,
            parseFloat(amount),
            req.user.id,
            req.user.role
        );

        return success(res, STATUS_CODES.SUCCESS, 'Balance updated successfully', balance);
    } catch (err) {
        logger.error(`Error updating balance: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /balances/{deviceId}:
 *   patch:
 *     summary: Partially update device balance
 *     tags: [Balances]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 description: Amount to add (positive) or subtract (negative)
 *               lastToken:
 *                 type: string
 *                 description: Last token used (optional)
 *     responses:
 *       200:
 *         description: Balance partially updated successfully
 *       400:
 *         description: Validation error or no fields to update
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - no permission to update this balance
 *       404:
 *         description: Device or balance not found
 *       500:
 *         description: Server error
 */
const updateBalancePartial = async (req, res, next) => {
    try {
        const deviceId = req.params.deviceId;
        const updateData = {};

        // Only process fields that are explicitly sent
        if (req.body.amount !== undefined) {
            if (isNaN(parseFloat(req.body.amount))) {
                return error(res, STATUS_CODES.BAD_REQUEST, 'Amount must be a number');
            }
            updateData.amount = parseFloat(req.body.amount);
        }

        if (req.body.lastToken !== undefined) {
            updateData.lastToken = req.body.lastToken;
        }

        // Don't proceed if no fields to update
        if (Object.keys(updateData).length === 0) {
            return error(res, STATUS_CODES.BAD_REQUEST, 'No valid fields to update provided');
        }

        const balance = await balanceService.updateBalancePartial(
            deviceId,
            updateData,
            req.user.id,
            req.user.role
        );

        return success(res, STATUS_CODES.SUCCESS, 'Balance partially updated successfully', balance);
    } catch (err) {
        logger.error(`Error partially updating balance: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /balances/stats:
 *   get:
 *     summary: Get balance statistics
 *     tags: [Balances]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Balance statistics
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const getBalanceStats = async (req, res, next) => {
    try {
        const stats = await balanceService.getBalanceStats(
            req.user.id,
            req.user.role
        );
        return success(res, STATUS_CODES.SUCCESS, 'Balance stats retrieved successfully', stats);
    } catch (err) {
        logger.error(`Error getting balance stats: ${err.message}`);
        return next(err);
    }
};

module.exports = {
    getAllBalances,
    getBalanceByDevice,
    checkDeviceBalance,
    updateBalance,
    updateBalancePartial,
    getBalanceStats
};