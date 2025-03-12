// src/services/usageService.js
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
 * Get all usage logs with pagination and filtering
 * @param {Object} options - Query options (pagination, filters)
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Object} Usage logs and pagination metadata
 */
const getAllUsageLogs = async (options, userId, userRole) => {
    const {
        page = 1, limit = 10, deviceId, startDate, endDate
    } = options;
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};

    // Filter by device if specified
    if (deviceId) {
        where.deviceId = deviceId;
    }

    // Filter by date range if specified
    if (startDate || endDate) {
        where.timeStamp = {};
        if (startDate) {
            where.timeStamp.gte = new Date(startDate);
        }
        if (endDate) {
            where.timeStamp.lte = new Date(endDate);
        }
    }

    // Non-admin users can only see their own usage logs
    if (userRole === ROLES.STAFF || userRole === ROLES.USER) {
        where.device = {
            userId
        };
    }

    // Count total usage logs
    const total = await prisma.usageLog.count({
        where
    });

    // Get usage logs with pagination
    const usageLogs = await prisma.usageLog.findMany({
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
            timeStamp: 'desc'
        }
    });

    return {
        usageLogs,
        meta: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get usage logs for a specific device
 * @param {String} deviceId - Device ID
 * @param {Object} options - Query options (pagination, filters)
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Object} Usage logs and pagination metadata
 */
const getUsageLogsByDevice = async (deviceId, options, userId, userRole) => {
    const {
        page = 1, limit = 10, startDate, endDate
    } = options;
    const skip = (page - 1) * limit;

    // Check if device exists and user has access
    const device = await prisma.device.findFirst({
        where: {
            id: deviceId,
            ...(userRole === ROLES.STAFF || userRole === ROLES.USER ? {
                userId
            } : {})
        }
    });

    if (!device) {
        throw new ApiError('Device not found or you do not have permission', STATUS_CODES.NOT_FOUND);
    }

    // Build where clause
    const where = {
        deviceId
    };

    // Filter by date range if specified
    if (startDate || endDate) {
        where.timeStamp = {};
        if (startDate) {
            where.timeStamp.gte = new Date(startDate);
        }
        if (endDate) {
            where.timeStamp.lte = new Date(endDate);
        }
    }

    // Count total usage logs
    const total = await prisma.usageLog.count({
        where
    });

    // Get usage logs with pagination
    const usageLogs = await prisma.usageLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
            timeStamp: 'desc'
        }
    });

    return {
        usageLogs,
        meta: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * Log device usage and update balance
 * @param {String} deviceKey - Device key
 * @param {Number} usageAmount - Usage amount
 * @returns {Object} Usage log result
 */
const logDeviceUsage = async (deviceKey, usageAmount) => {
    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
        // Find device by key
        const device = await tx.device.findFirst({
            where: {
                deviceKey
            },
            include: {
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

        // Get or create balance
        let balance = device.Balance;
        if (!balance) {
            balance = await tx.balance.create({
                data: {
                    deviceId: device.id,
                    balance: 0,
                    lastToken: ''
                }
            });
        }

        // Check if balance is sufficient
        if (balance.balance < usageAmount) {
            return {
                valid: false,
                canUse: false,
                error: 'Insufficient balance',
                remainingBalance: balance.balance
            };
        }

        // Update balance
        const updatedBalance = await tx.balance.update({
            where: {
                deviceId: device.id
            },
            data: {
                balance: balance.balance - usageAmount
            }
        });

        // Create usage log
        const usageLog = await tx.usageLog.create({
            data: {
                deviceId: device.id,
                usageAmount,
                timeStamp: new Date()
            }
        });

        return {
            valid: true,
            canUse: true,
            remainingBalance: updatedBalance.balance,
            usageLog
        };
    });

    return result;
};

/**
 * Get usage statistics
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @param {Object} options - Options (timeRange)
 * @returns {Object} Usage statistics
 */
const getUsageStats = async (userId, userRole, options = {}) => {
    const {
        timeRange = 30
    } = options; // Default to 30 days

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - timeRange);

    // Build where clause
    const where = {
        timeStamp: {
            gte: startDate,
            lte: endDate
        }
    };

    // Non-admin users can only see their own usage logs
    if (userRole === ROLES.STAFF || userRole === ROLES.USER) {
        where.device = {
            userId
        };
    }

    // Get total usage amount
    const totalUsageResult = await prisma.usageLog.aggregate({
        where,
        _sum: {
            usageAmount: true
        },
        _count: true
    });

    const totalUsage = totalUsageResult._sum.usageAmount || 0;
    const usageCount = totalUsageResult._count || 0;

    // Get usage by device
    const usageByDevice = await prisma.usageLog.groupBy({
        by: ['deviceId'],
        where,
        _sum: {
            usageAmount: true
        },
        orderBy: {
            _sum: {
                usageAmount: 'desc'
            }
        },
        take: 5
    });

    // Enrich usage by device with device info
    const topDevices = await Promise.all(
        usageByDevice.map(async (item) => {
            const device = await prisma.device.findUnique({
                where: {
                    id: item.deviceId
                },
                select: {
                    deviceKey: true,
                    user: {
                        select: {
                            name: true,
                            email: true
                        }
                    }
                }
            });

            return {
                deviceId: item.deviceId,
                deviceKey: device.deviceKey,
                userName: device.user.name || device.user.email,
                usageAmount: item._sum.usageAmount
            };
        })
    );

    // Get usage by day for chart
    const usageByDay = await prisma.usageLog.groupBy({
        by: ['timeStamp'],
        where,
        _sum: {
            usageAmount: true
        },
        orderBy: {
            timeStamp: 'asc'
        }
    });

    // Format usage by day for chart
    const dailyUsage = [];
    const dayMap = new Map();

    // Create a map of days
    for (let i = 0; i < timeRange; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateString = date.toISOString().split('T')[0];
        dayMap.set(dateString, {
            date: dateString,
            usage: 0
        });
    }

    // Fill in actual usage data
    usageByDay.forEach((item) => {
        const dateString = item.timeStamp.toISOString().split('T')[0];
        if (dayMap.has(dateString)) {
            dayMap.set(dateString, {
                date: dateString,
                usage: item._sum.usageAmount
            });
        }
    });

    // Convert map to array
    dayMap.forEach((value) => {
        dailyUsage.push(value);
    });

    return {
        totalUsage,
        usageCount,
        topDevices,
        dailyUsage,
        timeRange
    };
};

module.exports = {
    getAllUsageLogs,
    getUsageLogsByDevice,
    logDeviceUsage,
    getUsageStats
};