// src/services/tokenService.js
const prisma = require('../utils/prisma');
const {
    ApiError
} = require('../middleware/error');
const {
    STATUS_CODES
} = require('../config/constants');
const {
    ROLES,
    TOKEN_STATUS
} = require('../config/constants');
const {
    generateDeviceToken
} = require('../utils/helpers');
const {
    logger
} = require('../utils/logger');

/**
 * Get all tokens with pagination and filtering
 * @param {Object} options - Query options (pagination, filters)
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Object} Tokens and pagination metadata
 */
const getAllTokens = async (options, userId, userRole) => {
    const {
        page = 1, limit = 10, deviceId, status
    } = options;
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};

    // Filter by device if specified
    if (deviceId) {
        where.deviceId = deviceId;
    }

    // Filter by status if specified
    if (status && Object.values(TOKEN_STATUS).includes(status)) {
        where.status = status;
    }

    // Non-admin users can only see their own tokens
    if (userRole !== ROLES.ADMIN) {
        where.device = {
            userId
        };
    }

    // Count total tokens
    const total = await prisma.token.count({
        where
    });

    // Get tokens with pagination
    const tokens = await prisma.token.findMany({
        where,
        include: {
            device: {
                select: {
                    deviceKey: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            }
        },
        skip,
        take: limit,
        orderBy: {
            createdAt: 'desc'
        }
    });

    return {
        tokens,
        meta: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get token by ID
 * @param {String} tokenId - Token ID
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Object} Token object
 */
const getTokenById = async (tokenId, userId, userRole) => {
    // Build where clause
    const where = {
        id: tokenId
    };

    // Non-admin users can only see their own tokens
    if (userRole !== ROLES.ADMIN) {
        where.device = {
            userId
        };
    }

    // Find token
    const token = await prisma.token.findFirst({
        where,
        include: {
            device: {
                select: {
                    id: true,
                    deviceKey: true,
                    userId: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            }
        }
    });

    if (!token) {
        throw new ApiError('Token not found', STATUS_CODES.NOT_FOUND);
    }

    return token;
};

/**
 * Get tokens for a specific device
 * @param {String} deviceId - Device ID
 * @param {Object} options - Query options (pagination, filters)
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Object} Tokens and pagination metadata
 */
const getTokensByDevice = async (deviceId, options, userId, userRole) => {
    const {
        page = 1, limit = 10, status
    } = options;
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
        deviceId
    };

    // Filter by status if specified
    if (status && Object.values(TOKEN_STATUS).includes(status)) {
        where.status = status;
    }

    // Non-admin users can only see their own tokens
    if (userRole !== ROLES.ADMIN) {
        where.device = {
            userId
        };
    }

    // Verify device exists and user has access
    const device = await prisma.device.findFirst({
        where: {
            id: deviceId,
            ...(userRole !== ROLES.ADMIN ? {
                userId
            } : {})
        }
    });

    if (!device) {
        throw new ApiError('Device not found or you do not have access', STATUS_CODES.NOT_FOUND);
    }

    // Count total tokens
    const total = await prisma.token.count({
        where
    });

    // Get tokens with pagination
    const tokens = await prisma.token.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
            createdAt: 'desc'
        }
    });

    return {
        tokens,
        meta: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * Create a new token
 * @param {Object} tokenData - Token data (deviceId, amount)
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Object} Created token
 */
const createToken = async (tokenData, userId, userRole) => {
    const {
        deviceId,
        amount
    } = tokenData;

    // Verify device exists and user has access
    const device = await prisma.device.findFirst({
        where: {
            id: deviceId,
            ...(userRole !== ROLES.ADMIN ? {
                userId
            } : {})
        }
    });

    if (!device) {
        throw new ApiError('Device not found or you do not have access', STATUS_CODES.NOT_FOUND);
    }

    // Generate unique token
    const tokenValue = generateDeviceToken();

    // Create token
    const newToken = await prisma.token.create({
        data: {
            deviceId,
            token: tokenValue,
            amount: parseFloat(amount),
            status: TOKEN_STATUS.UNUSED
        },
        include: {
            device: {
                select: {
                    deviceKey: true
                }
            }
        }
    });

    return newToken;
};

/**
 * Validate token (use token and update balance)
 * @param {String} tokenValue - Token value
 * @param {String} deviceKey - Device key
 * @returns {Object} Validation result
 */
const validateToken = async (tokenValue, deviceKey) => {
    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
        // Find token
        const token = await tx.token.findUnique({
            where: {
                token: tokenValue
            },
            include: {
                device: true
            }
        });

        if (!token) {
            throw new ApiError('Invalid token', STATUS_CODES.BAD_REQUEST);
        }

        // Check if token is already used
        if (token.status === TOKEN_STATUS.USED) {
            throw new ApiError('Token has already been used', STATUS_CODES.BAD_REQUEST);
        }

        // Verify device key matches
        if (token.device.deviceKey !== deviceKey) {
            throw new ApiError('Token does not belong to this device', STATUS_CODES.BAD_REQUEST);
        }

        // Check if device is active
        if (!token.device.status) {
            throw new ApiError('Device is inactive', STATUS_CODES.FORBIDDEN);
        }

        // Update token status
        await tx.token.update({
            where: {
                id: token.id
            },
            data: {
                status: TOKEN_STATUS.USED,
                used_at: new Date()
            }
        });

        // Update balance
        let balance = await tx.balance.findUnique({
            where: {
                deviceId: token.deviceId
            }
        });

        if (!balance) {
            // Create balance if not exists
            balance = await tx.balance.create({
                data: {
                    deviceId: token.deviceId,
                    balance: token.amount,
                    lastToken: tokenValue
                }
            });
        } else {
            // Update existing balance
            balance = await tx.balance.update({
                where: {
                    deviceId: token.deviceId
                },
                data: {
                    balance: balance.balance + token.amount,
                    lastToken: tokenValue
                }
            });
        }

        return {
            valid: true,
            amount: token.amount,
            balance: balance.balance
        };
    });

    return result;
};

/**
 * Get token statistics
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Object} Token statistics
 */
const getTokenStats = async (userId, userRole) => {
    // Build where clause
    const where = {};

    // Non-admin users can only see their own tokens
    if (userRole !== ROLES.ADMIN) {
        where.device = {
            userId
        };
    }

    // Get token counts
    const [total, used, unused] = await Promise.all([
        prisma.token.count({
            where
        }),
        prisma.token.count({
            where: {
                ...where,
                status: TOKEN_STATUS.USED
            }
        }),
        prisma.token.count({
            where: {
                ...where,
                status: TOKEN_STATUS.UNUSED
            }
        })
    ]);

    // Calculate total amount
    const totalAmountResult = await prisma.token.aggregate({
        where,
        _sum: {
            amount: true
        }
    });

    const totalAmount = totalAmountResult._sum.amount || 0;

    // Recent tokens
    const recentTokens = await prisma.token.findMany({
        where,
        orderBy: {
            createdAt: 'desc'
        },
        take: 5,
        include: {
            device: {
                select: {
                    deviceKey: true,
                    user: {
                        select: {
                            name: true,
                            email: true
                        }
                    }
                }
            }
        }
    });

    return {
        total,
        used,
        unused,
        totalAmount,
        recentTokens
    };
};

module.exports = {
    getAllTokens,
    getTokenById,
    getTokensByDevice,
    createToken,
    validateToken,
    getTokenStats
};