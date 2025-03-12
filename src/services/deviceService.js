// src/services/deviceService.js
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

const { buildOwnershipFilter, enforceOwnership } = require('../utils/authorization');

/**
 * Get all devices with pagination and filtering
 * @param {Object} options - Query options (pagination, filters)
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Object} Devices and pagination metadata
 */
const getAllDevices = async (options, userId, userRole) => {
    const {
        page = 1, limit = 10, search = '', status
    } = options;
    const skip = (page - 1) * limit;

    // Build where clause with ownership filter
    const where = buildOwnershipFilter(userId, userRole);

    // Filter by device status if provided
    if (status !== undefined) {
        where.status = status === 'true' || status === true;
    }

    // Search in deviceKey
    if (search) {
        where.deviceKey = {
            contains: search,
            mode: 'insensitive'
        };
    }

    // Count total devices
    const total = await prisma.device.count({ where });

    // Get devices with pagination
    const devices = await prisma.device.findMany({
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
                    tokens: true,
                    UsageLog: true
                }
            },
            Balance: true
        },
        skip,
        take: limit,
        orderBy: {
            createdAt: 'desc'
        }
    });

    return {
        devices,
        meta: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get device by ID
 * @param {String} deviceId - Device ID
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Object} Device object
 */
const getDeviceById = async (deviceId, userId, userRole) => {
    // Build where clause with ownership filter
    const where = buildOwnershipFilter(userId, userRole, { id: deviceId });

    // Find device
    const device = await prisma.device.findFirst({
        where,
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            Balance: true,
            _count: {
                select: {
                    tokens: true,
                    UsageLog: true
                }
            }
        }
    });

    if (!device) {
        throw new ApiError('Device not found or you do not have permission', STATUS_CODES.NOT_FOUND);
    }

    return device;
};

/**
 * Create a new device
 * @param {Object} deviceData - Device data (deviceKey, userId)
 * @param {String} creatorId - ID of user creating the device
 * @param {String} creatorRole - Role of user creating the device
 * @returns {Object} Created device
 */
const createDevice = async (deviceData, creatorId, creatorRole) => {
    const {
        deviceKey,
        userId
    } = deviceData;

    // Determine the owner of the device
    const ownerId = (userId && creatorRole === ROLES.ADMIN || creatorRole == ROLES.SUPER_ADMIN) ? userId : creatorId;

    // Check if device key already exists
    const existingDevice = await prisma.device.findFirst({
        where: {
            deviceKey
        }
    });

    if (existingDevice) {
        throw new ApiError('Device key already exists', STATUS_CODES.CONFLICT);
    }

    // Create device
    const newDevice = await prisma.device.create({
        data: {
            deviceKey,
            userId: ownerId,
            Balance: {
                create: {
                    balance: 0,
                    lastToken: ''
                }
            }
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            Balance: true
        }
    });

    return newDevice;
};

/**
 * Update a device
 * @param {String} deviceId - Device ID
 * @param {Object} updateData - Data to update (deviceKey, status)
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Object} Updated device
 */
const updateDevice = async (deviceId, updateData, userId, userRole) => {
    const { deviceKey, status } = updateData;

    // Get the device first to check ownership
    const device = await prisma.device.findUnique({
        where: { id: deviceId }
    });

    // Check if device exists and user has permission to update it
    enforceOwnership(device, userId, userRole, null, 'Device');

    // Check if deviceKey is already in use
    if (deviceKey && deviceKey !== device.deviceKey) {
        const existingDevice = await prisma.device.findFirst({
            where: {
                deviceKey,
                NOT: {
                    id: deviceId
                }
            }
        });

        if (existingDevice) {
            throw new ApiError('Device key already exists', STATUS_CODES.CONFLICT);
        }
    }

    // Build update data
    const data = {};
    if (deviceKey !== undefined) data.deviceKey = deviceKey;
    if (status !== undefined) data.status = status;

    // Update device
    const updatedDevice = await prisma.device.update({
        where: {
            id: deviceId
        },
        data,
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            Balance: true
        }
    });

    return updatedDevice;
};

/**
 * Delete a device
 * @param {String} deviceId - Device ID
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Boolean} Success status
 */
const deleteDevice = async (deviceId, userId, userRole) => {
    // Get the device first to check ownership
    const device = await prisma.device.findUnique({
        where: { id: deviceId }
    });

    // Check if device exists and user has permission to delete it
    enforceOwnership(device, userId, userRole, null, 'Device');

    // Delete device
    await prisma.device.delete({
        where: {
            id: deviceId
        }
    });

    return true;
};

/**
 * Get device dropdown list for selection
 * @param {Object} options - Query options (search, pagination)
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Object} Devices for dropdown
 */
const getDevicesForDropdown = async (options, userId, userRole) => {
    const {
        search = '', page = 1, limit = 10
    } = options;
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};

    // STAFF users can only see their own devices
    if (userRole === ROLES.STAFF) {
        where.userId = userId;
    }

    // Add search if provided
    if (search) {
        where.OR = [
            {
                deviceKey: {
                    contains: search,
                    mode: 'insensitive'
                }
            },
            {
                user: {
                    OR: [
                        {
                            name: {
                                contains: search,
                                mode: 'insensitive'
                            }
                        },
                        {
                            email: {
                                contains: search,
                                mode: 'insensitive'
                            }
                        }
                    ]
                }
            }
        ];
    }

    // Count total devices
    const total = await prisma.device.count({
        where
    });

    // Get devices for dropdown
    const devices = await prisma.device.findMany({
        where,
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true
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
        devices,
        meta: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            hasMore: skip + devices.length < total
        }
    };
};

/**
 * Get device statistics
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Object} Device statistics
 */
const getDeviceStats = async (userId, userRole) => {
    // Build where clause
    const where = {};

    // Non-admin users can only see their own devices
    if (userRole === ROLES.STAFF || userRole === ROLES.USER) {
        where.userId = userId;
    }

    // Get device counts
    const [total, active, inactive] = await Promise.all([
        prisma.device.count({
            where
        }),
        prisma.device.count({
            where: {
                ...where,
                status: true
            }
        }),
        prisma.device.count({
            where: {
                ...where,
                status: false
            }
        })
    ]);

    // Recent devices
    const recentDevices = await prisma.device.findMany({
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
            },
            Balance: true
        }
    });

    return {
        total,
        active,
        inactive,
        recentDevices
    };
};

/**
 * Authenticate a device by device key
 * @param {String} deviceKey - Device key
 * @returns {Object} Device authentication result
 */
const authenticateDevice = async (deviceKey) => {
    // Find device by key
    const device = await prisma.device.findFirst({
        where: {
            deviceKey
        },
        select: {
            id: true,
            deviceKey: true,
            status: true,
            userId: true
        }
    });

    if (!device) {
        throw new ApiError('Device not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if device is active
    if (!device.status) {
        throw new ApiError('Device is inactive', STATUS_CODES.FORBIDDEN);
    }

    return {
        valid: true,
        deviceId: device.id,
        status: device.status
    };
};

module.exports = {
    getAllDevices,
    getDeviceById,
    createDevice,
    updateDevice,
    deleteDevice,
    getDevicesForDropdown,
    getDeviceStats,
    authenticateDevice
};