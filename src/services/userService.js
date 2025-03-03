// src/services/userService.js
const bcrypt = require('bcryptjs');
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
 * Get all users
 * @param {Object} options - Query options (pagination, filters)
 * @param {String} userRole - Role of the requesting user
 * @returns {Object} Users and pagination metadata
 */
const getAllUsers = async (options, userRole) => {
    const {
        page = 1, limit = 10, search = ''
    } = options;
    const skip = (page - 1) * limit;

    // Build search conditions
    const where = {};

    // Admin can see all users, others can only see themselves and users they created
    if (userRole !== ROLES.ADMIN) {
        where.role = {
            not: ROLES.ADMIN
        };
    }

    // Add search if provided
    if (search) {
        where.OR = [{
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
        ];
    }

    // Count total users for pagination
    const total = await prisma.user.count({
        where
    });

    // Get users with pagination
    const users = await prisma.user.findMany({
        where,
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            _count: {
                select: {
                    devices: true,
                    apiKeys: true
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
        users,
        meta: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get user by ID
 * @param {String} userId - User ID
 * @returns {Object} User object
 */
const getUserById = async (userId) => {
    const user = await prisma.user.findUnique({
        where: {
            id: userId
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            profile: true,
            _count: {
                select: {
                    devices: true,
                    apiKeys: true
                }
            }
        }
    });

    if (!user) {
        throw new ApiError('User not found', STATUS_CODES.NOT_FOUND);
    }

    return user;
};

/**
 * Create a new user
 * @param {Object} userData - User data (name, email, password, role)
 * @returns {Object} Created user
 */
const createUser = async (userData) => {
    const {
        name,
        email,
        password,
        role = ROLES.STAFF
    } = userData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: {
            email
        }
    });

    if (existingUser) {
        throw new ApiError('Email already in use', STATUS_CODES.CONFLICT);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            role,
            profile: {
                create: {} // Create empty profile
            }
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
        }
    });

    return newUser;
};

/**
 * Update a user
 * @param {String} userId - User ID
 * @param {Object} updateData - Data to update (name, email, role)
 * @param {String} currentUserRole - Role of the user making the update
 * @returns {Object} Updated user
 */
const updateUser = async (userId, updateData, currentUserRole) => {
    const {
        name,
        email,
        role
    } = updateData;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
        where: {
            id: userId
        }
    });

    if (!existingUser) {
        throw new ApiError('User not found', STATUS_CODES.NOT_FOUND);
    }

    // Check permissions (only admins can change roles)
    if (role && currentUserRole !== ROLES.ADMIN) {
        throw new ApiError('You do not have permission to change roles', STATUS_CODES.FORBIDDEN);
    }

    // Check if email is already in use by another user
    if (email && email !== existingUser.email) {
        const emailExists = await prisma.user.findFirst({
            where: {
                email,
                NOT: {
                    id: userId
                }
            }
        });

        if (emailExists) {
            throw new ApiError('Email already in use', STATUS_CODES.CONFLICT);
        }
    }

    // Build update data object
    const data = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (role && currentUserRole === ROLES.ADMIN) data.role = role;

    // Update user
    const updatedUser = await prisma.user.update({
        where: {
            id: userId
        },
        data,
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true
        }
    });

    return updatedUser;
};

/**
 * Delete a user
 * @param {String} userId - User ID
 * @returns {Boolean} Success status
 */
const deleteUser = async (userId) => {
    // Check if user exists
    const user = await prisma.user.findUnique({
        where: {
            id: userId
        }
    });

    if (!user) {
        throw new ApiError('User not found', STATUS_CODES.NOT_FOUND);
    }

    // Delete user
    await prisma.user.delete({
        where: {
            id: userId
        }
    });

    return true;
};

/**
 * Get user stats
 * @param {String} role - User role
 * @returns {Object} User statistics
 */
const getUserStats = async (role) => {
    const where = {};

    // Non-admins can't see admin stats
    if (role !== ROLES.ADMIN) {
        where.role = {
            not: ROLES.ADMIN
        };
    }

    // Get total counts
    const [total, admins, staff, users] = await Promise.all([
        prisma.user.count({
            where
        }),
        prisma.user.count({
            where: {
                ...where,
                role: ROLES.ADMIN
            }
        }),
        prisma.user.count({
            where: {
                ...where,
                role: ROLES.STAFF
            }
        }),
        prisma.user.count({
            where: {
                ...where,
                role: ROLES.USER
            }
        })
    ]);

    // Get recent users
    const recentUsers = await prisma.user.findMany({
        where,
        orderBy: {
            createdAt: 'desc'
        },
        take: 5,
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
        }
    });

    return {
        total,
        admins,
        staff,
        users,
        recentUsers
    };
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getUserStats
};