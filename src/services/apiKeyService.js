// src/services/apiKeyService.js
const prisma = require('../utils/prisma');
const {
    ApiError
} = require('../middleware/error');
const {
    STATUS_CODES
} = require('../config/constants');
const {
    ROLES
} = require('../config/constants');
const {
    generateApiKey
} = require('../utils/helpers');
const {
    logger
} = require('../utils/logger');

/**
 * Get all API keys with pagination and filtering
 * @param {Object} options - Query options (pagination, filters)
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Object} API keys and pagination metadata
 */
const getAllApiKeys = async (options, userId, userRole) => {
    const {
        page = 1, limit = 10, status
    } = options;
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};

    // Non-admin users can only see their own API keys
    if (userRole === ROLES.STAFF || userRole === ROLES.USER) {
        where.userId = userId;
    }

    // Filter by status if provided
    if (status !== undefined) {
        where.status = status === 'true' || status === true;
    }

    // Count total API keys
    const total = await prisma.apiKey.count({
        where
    });

    // Get API keys with pagination
    const apiKeys = await prisma.apiKey.findMany({
        where,
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            _count: {
                select: {
                    usageHistory: true
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
        apiKeys,
        meta: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get API key by ID
 * @param {String} apiKeyId - API key ID
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Object} API key object
 */
const getApiKeyById = async (apiKeyId, userId, userRole) => {
    // Build where clause
    const where = {
        id: apiKeyId
    };

    // Non-admin users can only see their own API keys
    if (userRole === ROLES.STAFF || userRole === ROLES.USER) {
        where.userId = userId;
    }

    // Find API key
    const apiKey = await prisma.apiKey.findFirst({
        where,
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            _count: {
                select: {
                    usageHistory: true
                }
            }
        }
    });

    if (!apiKey) {
        throw new ApiError('API key not found', STATUS_CODES.NOT_FOUND);
    }

    return apiKey;
};

/**
 * Create a new API key
 * @param {Object} apiKeyData - API key data (name, userId, expiresAt)
 * @param {String} creatorId - ID of user creating the API key
 * @param {String} creatorRole - Role of user creating the API key
 * @returns {Object} Created API key
 */
const createApiKey = async (apiKeyData, creatorId, creatorRole) => {
    const {
        name,
        userId,
        expiresAt
    } = apiKeyData;

    // Determine the owner of the API key
    const ownerId = (userId && creatorRole === ROLES.ADMIN || creatorRole === ROLES.SUPER_ADMIN) ? userId : creatorId;

    // Generate API key
    const apiKeyValue = generateApiKey();

    // Parse expiration date if provided
    let expiryDate = null;
    if (expiresAt) {
        expiryDate = new Date(expiresAt);
        if (isNaN(expiryDate.getTime())) {
            throw new ApiError('Invalid expiration date', STATUS_CODES.BAD_REQUEST);
        }
    }

    // Create API key
    const newApiKey = await prisma.apiKey.create({
        data: {
            name,
            key: apiKeyValue,
            userId: ownerId,
            expiresAt: expiryDate
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        }
    });

    return newApiKey;
};

/**
 * Update an API key
 * @param {String} apiKeyId - API key ID
 * @param {Object} updateData - Data to update (name, status, expiresAt)
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Object} Updated API key
 */
const updateApiKey = async (apiKeyId, updateData, userId, userRole) => {
    const {
        name,
        status,
        expiresAt
    } = updateData;

    // Build where clause
    const where = {
        id: apiKeyId
    };

    // Non-admin users can only update their own API keys
    if (userRole === ROLES.STAFF || userRole === ROLES.USER) {
        where.userId = userId;
    }

    // Check if API key exists
    const apiKey = await prisma.apiKey.findFirst({
        where
    });

    if (!apiKey) {
        throw new ApiError('API key not found or you do not have permission', STATUS_CODES.NOT_FOUND);
    }

    // Parse expiration date if provided
    let expiryDate = undefined;
    if (expiresAt !== undefined) {
        if (expiresAt === null) {
            expiryDate = null;
        } else {
            expiryDate = new Date(expiresAt);
            if (isNaN(expiryDate.getTime())) {
                throw new ApiError('Invalid expiration date', STATUS_CODES.BAD_REQUEST);
            }
        }
    }

    // Build update data
    const data = {};
    if (name !== undefined) data.name = name;
    if (status !== undefined) data.status = status;
    if (expiryDate !== undefined) data.expiresAt = expiryDate;

    // Update API key
    const updatedApiKey = await prisma.apiKey.update({
        where: {
            id: apiKeyId
        },
        data,
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        }
    });

    return updatedApiKey;
};

/**
 * Delete an API key
 * @param {String} apiKeyId - API key ID
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Boolean} Success status
 */
const deleteApiKey = async (apiKeyId, userId, userRole) => {
    // Build where clause
    const where = {
        id: apiKeyId
    };

    // Non-admin users can only delete their own API keys
    if (userRole === ROLES.STAFF || userRole === ROLES.USER) {
        where.userId = userId;
    }

    // Check if API key exists
    const apiKey = await prisma.apiKey.findFirst({
        where
    });

    if (!apiKey) {
        throw new ApiError('API key not found or you do not have permission', STATUS_CODES.NOT_FOUND);
    }

    // Delete API key
    await prisma.apiKey.delete({
        where: {
            id: apiKeyId
        }
    });

    return true;
};

/**
 * Get API key usage history
 * @param {String} apiKeyId - API key ID
 * @param {Object} options - Query options (pagination, filters)
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Object} API key usage history and pagination metadata
 */
const getApiKeyUsage = async (apiKeyId, options, userId, userRole) => {
    const {
        page = 1, limit = 10
    } = options;
    const skip = (page - 1) * limit;

    // Check if API key exists and user has access
    const apiKey = await prisma.apiKey.findFirst({
        where: {
            id: apiKeyId,
            ...(userRole === ROLES.STAFF || userRole === ROLES.USER ? {
                userId
            } : {})
        }
    });

    if (!apiKey) {
        throw new ApiError('API key not found or you do not have permission', STATUS_CODES.NOT_FOUND);
    }

    // Count total usage records
    const total = await prisma.apiKeyUsage.count({
        where: {
            apiKeyId
        }
    });

    // Get usage history with pagination
    const usage = await prisma.apiKeyUsage.findMany({
        where: {
            apiKeyId
        },
        skip,
        take: limit,
        orderBy: {
            timestamp: 'desc'
        }
    });

    return {
        usage,
        meta: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get API key statistics
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Object} API key statistics
 */
const getApiKeyStats = async (userId, userRole) => {
    // Build where clause
    const where = {};

    // Non-admin users can only see their own API keys
    if (userRole === ROLES.STAFF || userRole === ROLES.USER) {
        where.userId = userId;
    }

    // Calculate date 7 days from now for expiring soon
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Get API key counts
    const [total, active, expiringSoon] = await Promise.all([
        prisma.apiKey.count({
            where
        }),
        prisma.apiKey.count({
            where: {
                ...where,
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
            }
        }),
        prisma.apiKey.count({
            where: {
                ...where,
                status: true,
                expiresAt: {
                    gt: new Date(),
                    lte: sevenDaysFromNow
                }
            }
        })
    ]);

    // Recent API keys
    const recentApiKeys = await prisma.apiKey.findMany({
        where,
        orderBy: {
            createdAt: 'desc'
        },
        take: 5,
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        }
    });

    return {
        total,
        active,
        expiringSoon,
        recentApiKeys
    };
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