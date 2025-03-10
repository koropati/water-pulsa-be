// src/middleware/apiKey.js
const prisma = require('../utils/prisma');
const { ApiError } = require('./error');
const { STATUS_CODES } = require('../config/constants');
const { logger } = require('../utils/logger');

/**
 * Track API key usage
 * @param {Object} req - Express request object
 * @param {Object} apiKey - API key object
 * @returns {Promise} Promise that resolves when tracking is complete
 */
const trackApiKeyUsage = async (req, apiKey) => {
    try {
        // Log API key usage
        await prisma.apiKeyUsage.create({
            data: {
                apiKeyId: apiKey.id,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                method: req.method,
                path: req.path,
                metadata: req.body || {}
            }
        });

        // Update last used timestamp
        await prisma.apiKey.update({
            where: {
                id: apiKey.id
            },
            data: {
                lastUsedAt: new Date()
            }
        });
    } catch (error) {
        // Log error but don't interrupt the request flow
        logger.error(`Error tracking API key usage: ${error.message}`);
    }
};

/**
 * Validate API key
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateApiKey = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];

        if (!apiKey) {
            return next(
                new ApiError('API key is required', STATUS_CODES.UNAUTHORIZED)
            );
        }

        // Find the API key
        const key = await prisma.apiKey.findFirst({
            where: {
                key: apiKey,
                status: true,
                OR: [{
                        expiresAt: null
                    },
                    {
                        expiresAt: {
                            gt: new Date()
                        }
                    }
                ]
            },
            include: {
                user: {
                    select: {
                        id: true,
                        role: true,
                        isActive: true
                    }
                }
            }
        });

        if (!key) {
            return next(
                new ApiError('Invalid or expired API key', STATUS_CODES.UNAUTHORIZED)
            );
        }

        // Check if user associated with API key is active
        if (!key.user.isActive) {
            return next(
                new ApiError('User account is inactive', STATUS_CODES.FORBIDDEN)
            );
        }

        // Set user from API key
        req.user = key.user;
        req.apiKey = {
            id: key.id,
            name: key.name
        };

        // Track API key usage asynchronously (don't await to improve performance)
        trackApiKeyUsage(req, key).catch(err => {
            logger.error(`Error in trackApiKeyUsage: ${err.message}`);
        });

        next();
    } catch (error) {
        logger.error(`API key validation error: ${error.message}`);
        next(new ApiError('API key validation failed', STATUS_CODES.UNAUTHORIZED));
    }
};

module.exports = {
    validateApiKey,
    trackApiKeyUsage
};