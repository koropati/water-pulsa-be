// src/services/balanceService.js
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
    logger
} = require('../utils/logger');

/**
 * Get all balances with pagination and filtering
 * @param {Object} options - Query options (pagination, filters)
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Object} Balances and pagination metadata
 */
const getAllBalances = async (options, userId, userRole) => {
    const {
        page = 1, limit = 10, minBalance, maxBalance
    } = options;
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};

    // Non-admin users can only see their own balances
    if (userRole !== ROLES.ADMIN) {
        where.device = {
            userId
        };
    }

    // Filter by balance range if provided
    if (minBalance !== undefined || maxBalance !== undefined) {
        where.balance = {};
        if (minBalance !== undefined) {
            where.balance.gte = parseFloat(minBalance);
        }
        if (maxBalance !== undefined) {
            where.balance.lte = parseFloat(maxBalance);
        }
    }

    // Count total balances
    const total = await prisma.balance.count({
        where
    });

    // Get balances with pagination
    const balances = await prisma.balance.findMany({
        where,
        include: {
            device: {
                select: {
                    deviceKey: true,
                    status: true,
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
            updatedAt: 'desc'
        }
    });

    return {
        balances,
        meta: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get balance by device ID
 * @param {String} deviceId - Device ID
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Object} Balance object
 */
const getBalanceByDevice = async (deviceId, userId, userRole) => {
    // Check if device exists and user has access
    const device = await prisma.device.findFirst({
        where: {
            id: deviceId,
            ...(userRole !== ROLES.ADMIN ? {
                userId
            } : {})
        }
    });

    if (!device) {
        throw new ApiError('Device not found or you do not have permission', STATUS_CODES.NOT_FOUND);
    }

    // Get balance
    const balance = await prisma.balance.findUnique({
        where: {
            deviceId
        },
        include: {
            device: {
                select: {
                    deviceKey: true,
                    status: true
                }
            }
        }
    });

    // If no balance entry exists, return a default one
    if (!balance) {
        return {
            deviceId,
            balance: 0,
            lastToken: '',
            device: {
                deviceKey: device.deviceKey,
                status: device.status
            }
        };
    }

    return balance;
};

/**
 * Check device balance by device key
 * @param {String} deviceKey - Device key
 * @returns {Object} Balance check result
 */
const checkDeviceBalance = async (deviceKey) => {
    // Find device by key
    const device = await prisma.device.findFirst({
        where: {
            deviceKey
        },
        select: {
            id: true,
            deviceKey: true,
            status: true,
            Balance: true
        }
    });

    if (!device) {
        throw new ApiError('Device not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if device is active
    if (!device.status) {
        throw new ApiError('Device is inactive', STATUS_CODES.FORBIDDEN);
    }

    // Return balance
    return {
        valid: true,
        balance: device.Balance ? device.Balance.balance : 0,
        lastToken: device.Balance ? device.Balance.lastToken : ''
    };
};

/**
 * Update balance for a device
 * @param {String} deviceId - Device ID
 * @param {Number} amount - Amount to update (positive or negative)
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Object} Updated balance
 */
const updateBalance = async (deviceId, amount, userId, userRole) => {
    // Check if device exists and user has access
    const device = await prisma.device.findFirst({
        where: {
            id: deviceId,
            ...(userRole !== ROLES.ADMIN ? {
                userId
            } : {})
        }
    });

    if (!device) {
        throw new ApiError('Device not found or you do not have permission', STATUS_CODES.NOT_FOUND);
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
        // Get current balance
        let balance = await tx.balance.findUnique({
            where: {
                deviceId
            }
        });

        if (!balance) {
            // Create balance if not exists
            balance = await tx.balance.create({
                data: {
                    deviceId,
                    balance: amount,
                    lastToken: ''
                }
            });
        } else {
            // Update existing balance
            balance = await tx.balance.update({
                where: {
                    deviceId
                },
                data: {
                    balance: balance.balance + amount
                }
            });
        }

        return balance;
    });

    return result;
};

/**
 * Get balance statistics
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Object} Balance statistics
 */
const getBalanceStats = async (userId, userRole) => {
    // Build where clause
    const where = {};

    // Non-admin users can only see their own balances
    if (userRole !== ROLES.ADMIN) {
        where.device = {
            userId
        };
    }

    // Calculate total balance
    const totalBalanceResult = await prisma.balance.aggregate({
        where,
        _sum: {
            balance: true
        }
    });

    const totalBalance = totalBalanceResult._sum.balance || 0;

    // Get device count
    const totalDevices = await prisma.device.count({
        where: userRole !== ROLES.ADMIN ? {
            userId
        } : {}
    });

    // Get low balance devices (less than 10 units)
    const lowBalanceDevices = await prisma.balance.count({
        where: {
            ...where,
            balance: {
                lt: 10
            }
        }
    });

    // Calculate average usage per day over the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usageResult = await prisma.usageLog.aggregate({
        where: {
            timeStamp: {
                gte: thirtyDaysAgo
            },
            ...(userRole !== ROLES.ADMIN ? {
                device: {
                    userId
                }
            } : {})
        },
        _sum: {
            usageAmount: true
        }
    });

    const totalUsage = usageResult._sum.usageAmount || 0;
    const avgUsagePerDay = totalUsage / 30;

    return {
        totalBalance,
        avgUsagePerDay,
        totalDevices,
        lowBalanceDevices
    };
};

module.exports = {
    getAllBalances,
    getBalanceByDevice,
    checkDeviceBalance,
    updateBalance,
    getBalanceStats
};