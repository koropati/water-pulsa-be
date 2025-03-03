// src/services/authService.js
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const {
    generateToken
} = require('../utils/jwt');
const {
    ROLES
} = require('../config/constants');
const {
    ApiError
} = require('../middleware/error');
const {
    STATUS_CODES
} = require('../config/constants');
const {
    logger
} = require('../utils/logger');

/**
 * Register a new user
 * @param {Object} userData - User data (name, email, password, role)
 * @returns {Object} User and token
 */
const register = async (userData) => {
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

    // Generate token
    const token = generateToken({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role
    });

    return {
        user: newUser,
        token
    };
};

/**
 * Login a user
 * @param {String} email - User email
 * @param {String} password - User password
 * @returns {Object} User and token
 */
const login = async (email, password) => {
    // Check if user exists
    const user = await prisma.user.findUnique({
        where: {
            email
        },
        select: {
            id: true,
            email: true,
            password: true,
            name: true,
            role: true
        }
    });

    if (!user) {
        throw new ApiError('Invalid email or password', STATUS_CODES.UNAUTHORIZED);
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new ApiError('Invalid email or password', STATUS_CODES.UNAUTHORIZED);
    }

    // Generate token
    const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role
    });

    // Remove password from response
    const {
        password: _,
        ...userWithoutPassword
    } = user;

    return {
        user: userWithoutPassword,
        token
    };
};

/**
 * Change user password
 * @param {String} userId - User ID
 * @param {String} currentPassword - Current password
 * @param {String} newPassword - New password
 * @returns {Boolean} Success status
 */
const changePassword = async (userId, currentPassword, newPassword) => {
    // Get user
    const user = await prisma.user.findUnique({
        where: {
            id: userId
        }
    });

    if (!user) {
        throw new ApiError('User not found', STATUS_CODES.NOT_FOUND);
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
        throw new ApiError('Current password is incorrect', STATUS_CODES.BAD_REQUEST);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
        where: {
            id: userId
        },
        data: {
            password: hashedPassword
        }
    });

    return true;
};

/**
 * Get current user
 * @param {String} userId - User ID
 * @returns {Object} User object
 */
const getCurrentUser = async (userId) => {
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
            updatedAt: true
        }
    });

    if (!user) {
        throw new ApiError('User not found', STATUS_CODES.NOT_FOUND);
    }

    return user;
};

module.exports = {
    register,
    login,
    changePassword,
    getCurrentUser
};