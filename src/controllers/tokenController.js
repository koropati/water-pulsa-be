// src/controllers/tokenController.js
const tokenService = require('../services/tokenService');
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
 * /tokens:
 *   get:
 *     summary: Get all tokens
 *     tags: [Tokens]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [used, unused]
 *         description: Filter by token status
 *     responses:
 *       200:
 *         description: List of tokens
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const getAllTokens = async (req, res, next) => {
    try {
        // Log the raw query parameter to see what's coming in
        console.log('Raw deviceId query param:', req.query.deviceId);
        
        // Properly handle the deviceId parameter
        let deviceId = undefined;
        if (req.query.deviceId) {
            // If it's an array, take the last item (most likely the intended value)
            if (Array.isArray(req.query.deviceId)) {
                deviceId = req.query.deviceId[req.query.deviceId.length - 1];
            } else {
                deviceId = req.query.deviceId;
            }
        }
        
        const options = {
            ...getPaginationParams(req),
            deviceId: deviceId,
            status: req.query.status
        };
        
        console.log('Processed deviceId:', deviceId);

        const result = await tokenService.getAllTokens(
            options,
            req.user.id,
            req.user.role
        );
        
        return paginate(
            res,
            result.tokens,
            result.meta.total,
            result.meta.page,
            result.meta.limit,
            'Tokens retrieved successfully'
        );
    } catch (err) {
        logger.error(`Error getting tokens: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /tokens/{id}:
 *   get:
 *     summary: Get token by ID
 *     tags: [Tokens]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Token ID
 *     responses:
 *       200:
 *         description: Token details
 *       404:
 *         description: Token not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
const getTokenById = async (req, res, next) => {
    try {
        const token = await tokenService.getTokenById(
            req.params.id,
            req.user.id,
            req.user.role
        );
        return success(res, STATUS_CODES.SUCCESS, 'Token retrieved successfully', token);
    } catch (err) {
        logger.error(`Error getting token: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /tokens/device/{deviceId}:
 *   get:
 *     summary: Get tokens for a specific device
 *     tags: [Tokens]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [used, unused]
 *         description: Filter by token status
 *     responses:
 *       200:
 *         description: List of tokens for the device
 *       404:
 *         description: Device not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
const getTokensByDevice = async (req, res, next) => {
    try {
        const options = {
            ...getPaginationParams(req),
            status: req.query.status
        };

        const result = await tokenService.getTokensByDevice(
            req.params.deviceId,
            options,
            req.user.id,
            req.user.role
        );

        return paginate(
            res,
            result.tokens,
            result.meta.total,
            result.meta.page,
            result.meta.limit,
            'Tokens retrieved successfully'
        );
    } catch (err) {
        logger.error(`Error getting tokens by device: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /tokens:
 *   post:
 *     summary: Create a new token
 *     tags: [Tokens]
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
 *                 minimum: 0.01
 *     responses:
 *       201:
 *         description: Token created successfully
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
const createToken = async (req, res, next) => {
    try {
        const newToken = await tokenService.createToken(
            req.body,
            req.user.id,
            req.user.role
        );
        return success(res, STATUS_CODES.CREATED, 'Token created successfully', {
            token: newToken
        });
    } catch (err) {
        logger.error(`Error creating token: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /tokens/validate:
 *   post:
 *     summary: Validate a token
 *     tags: [Tokens]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - deviceKey
 *             properties:
 *               token:
 *                 type: string
 *               deviceKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token validated successfully
 *       400:
 *         description: Invalid token or device key
 *       403:
 *         description: Device is inactive
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const validateToken = async (req, res, next) => {
    try {
        const {
            token,
            deviceKey
        } = req.body;

        if (!token || !deviceKey) {
            return error(res, STATUS_CODES.BAD_REQUEST, 'Token and device key are required');
        }

        const result = await tokenService.validateToken(token, deviceKey);
        return success(res, STATUS_CODES.SUCCESS, 'Token validated successfully', result);
    } catch (err) {
        logger.error(`Error validating token: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /tokens/stats:
 *   get:
 *     summary: Get token statistics
 *     tags: [Tokens]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Token statistics
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const getTokenStats = async (req, res, next) => {
    try {
        const stats = await tokenService.getTokenStats(
            req.user.id,
            req.user.role
        );
        return success(res, STATUS_CODES.SUCCESS, 'Token stats retrieved successfully', stats);
    } catch (err) {
        logger.error(`Error getting token stats: ${err.message}`);
        return next(err);
    }
};

module.exports = {
    getAllTokens,
    getTokenById,
    getTokensByDevice,
    createToken,
    validateToken,
    getTokenStats
};