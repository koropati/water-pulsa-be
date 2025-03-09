// src/middleware/auth.js
const {
    verifyToken,
    extractToken
} = require('../utils/jwt');
const {
    ApiError
} = require('./error');
const {
    STATUS_CODES
} = require('../config/constants');
const {
    ROLE_PERMISSIONS
} = require('../config/constants');
const prisma = require('../utils/prisma');
const {
    logger
} = require('../utils/logger');

/**
 * Protect routes - only authenticated users can access
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const protect = async (req, res, next) => {
    try {
        // 1) Get token
        const token = extractToken(req);

        if (!token) {
            return next(
                new ApiError('You are not logged in. Please log in to get access.', STATUS_CODES.UNAUTHORIZED)
            );
        }

        // 2) Verify token
        const decoded = verifyToken(token);

        if (!decoded) {
            return next(
                new ApiError('Invalid token. Please log in again.', STATUS_CODES.UNAUTHORIZED)
            );
        }

        // 3) Check if user still exists
        const user = await prisma.user.findUnique({
            where: {
                id: decoded.userId
            },
            select: {
                id: true,
                email: true,
                role: true,
                name: true,
                isActive: true
            }
        });

        if (!user) {
            return next(
                new ApiError('The user belonging to this token no longer exists.', STATUS_CODES.UNAUTHORIZED)
            );
        }

        // 4) Check if user is active
        if (!user.isActive) {
            return next(
                new ApiError('Your account has been deactivated. Please contact an administrator.', STATUS_CODES.FORBIDDEN)
            );
        }

        // 5) Grant access to protected route
        req.user = user;
        next();
    } catch (error) {
        logger.error(`Authentication error: ${error.message}`);
        next(new ApiError('Authentication failed', STATUS_CODES.UNAUTHORIZED));
    }
};

/**
 * Restrict access to certain roles
 * @param  {...String} roles - Allowed roles
 * @returns {Function} - Express middleware
 */
const restrictTo = (...roles) => {
    return (req, res, next) => {
        // roles ['ADMIN', 'STAFF']
        if (!roles.includes(req.user.role)) {
            return next(
                new ApiError('You do not have permission to perform this action', STATUS_CODES.FORBIDDEN)
            );
        }
        next();
    };
};

/**
 * Restrict access based on role permissions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const checkRolePermissions = (req, res, next) => {
    const userRole = req.user.role;
    const method = req.method;

    if (!ROLE_PERMISSIONS[userRole].includes(method)) {
        return next(
            new ApiError(`${userRole} role is not allowed to ${method} on this route`, STATUS_CODES.FORBIDDEN)
        );
    }

    next();
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

        // Log API key usage
        await prisma.apiKeyUsage.create({
            data: {
                apiKeyId: key.id,
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
                id: key.id
            },
            data: {
                lastUsedAt: new Date()
            }
        });

        // Set user from API key
        req.user = key.user;
        req.apiKey = {
            id: key.id,
            name: key.name
        };

        next();
    } catch (error) {
        logger.error(`API key validation error: ${error.message}`);
        next(new ApiError('API key validation failed', STATUS_CODES.UNAUTHORIZED));
    }
};

module.exports = {
    protect,
    restrictTo,
    checkRolePermissions,
    validateApiKey
};