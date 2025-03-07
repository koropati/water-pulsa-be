// src/controllers/apiKeyController.js
const apiKeyService = require('../services/apiKeyService');
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
 * /api-keys:
 *   get:
 *     summary: Get all API keys
 *     tags: [API Keys]
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
 *         name: status
 *         schema:
 *           type: boolean
 *         description: Filter by status (true/false)
 *     responses:
 *       200:
 *         description: List of API keys
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const getAllApiKeys = async (req, res, next) => {
    try {
        const options = {
            ...getPaginationParams(req),
            status: req.query.status !== undefined ?
                req.query.status === 'true' :
                undefined
        };

        const result = await apiKeyService.getAllApiKeys(
            options,
            req.user.id,
            req.user.role
        );

        return paginate(
            res,
            result.apiKeys,
            result.meta.total,
            result.meta.page,
            result.meta.limit,
            'API keys retrieved successfully'
        );
    } catch (err) {
        logger.error(`Error getting API keys: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /api-keys/{id}:
 *   get:
 *     summary: Get API key by ID
 *     tags: [API Keys]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API key ID
 *     responses:
 *       200:
 *         description: API key details
 *       404:
 *         description: API key not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
const getApiKeyById = async (req, res, next) => {
    try {
        const apiKey = await apiKeyService.getApiKeyById(
            req.params.id,
            req.user.id,
            req.user.role
        );
        return success(res, STATUS_CODES.SUCCESS, 'API key retrieved successfully', apiKey);
    } catch (err) {
        logger.error(`Error getting API key: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /api-keys:
 *   post:
 *     summary: Create a new API key
 *     tags: [API Keys]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               userId:
 *                 type: string
 *                 description: Required for admins creating API key for other users
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Expiration date (ISO 8601 format)
 *     responses:
 *       201:
 *         description: API key created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const createApiKey = async (req, res, next) => {
    try {
        const newApiKey = await apiKeyService.createApiKey(
            req.body,
            req.user.id,
            req.user.role
        );
        return success(res, STATUS_CODES.CREATED, 'API key created successfully', {
            apiKey: newApiKey
        });
    } catch (err) {
        logger.error(`Error creating API key: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /api-keys/{id}:
 *   put:
 *     summary: Update an API key
 *     tags: [API Keys]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API key ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               status:
 *                 type: boolean
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Expiration date (ISO 8601 format) or null to remove expiration
 *     responses:
 *       200:
 *         description: API key updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: API key not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
const updateApiKey = async (req, res, next) => {
    try {
        const updatedApiKey = await apiKeyService.updateApiKey(
            req.params.id,
            req.body,
            req.user.id,
            req.user.role
        );
        return success(res, STATUS_CODES.SUCCESS, 'API key updated successfully', updatedApiKey);
    } catch (err) {
        logger.error(`Error updating API key: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /api-keys/{id}:
 *   delete:
 *     summary: Delete an API key
 *     tags: [API Keys]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API key ID
 *     responses:
 *       200:
 *         description: API key deleted successfully
 *       404:
 *         description: API key not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
const deleteApiKey = async (req, res, next) => {
    try {
        await apiKeyService.deleteApiKey(
            req.params.id,
            req.user.id,
            req.user.role
        );
        return success(res, STATUS_CODES.SUCCESS, 'API key deleted successfully');
    } catch (err) {
        logger.error(`Error deleting API key: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /api-keys/{id}/usage:
 *   get:
 *     summary: Get API key usage history
 *     tags: [API Keys]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API key ID
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
 *     responses:
 *       200:
 *         description: API key usage history
 *       404:
 *         description: API key not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
const getApiKeyUsage = async (req, res, next) => {
    try {
        const options = getPaginationParams(req);

        const result = await apiKeyService.getApiKeyUsage(
            req.params.id,
            options,
            req.user.id,
            req.user.role
        );

        return paginate(
            res,
            result.usage,
            result.meta.total,
            result.meta.page,
            result.meta.limit,
            'API key usage history retrieved successfully'
        );
    } catch (err) {
        logger.error(`Error getting API key usage: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /api-keys/stats:
 *   get:
 *     summary: Get API key statistics
 *     tags: [API Keys]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: API key statistics
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const getApiKeyStats = async (req, res, next) => {
    try {
        const stats = await apiKeyService.getApiKeyStats(
            req.user.id,
            req.user.role
        );
        return success(res, STATUS_CODES.SUCCESS, 'API key stats retrieved successfully', stats);
    } catch (err) {
        logger.error(`Error getting API key stats: ${err.message}`);
        return next(err);
    }
};

module.exports = {
    getAllApiKeys,
    getApiKeyById,
    createApiKey,
    updateApiKey,
    deleteApiKey,
    getApiKeyUsage,
    getApiKeyStats
};