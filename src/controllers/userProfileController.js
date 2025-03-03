// src/controllers/userProfileController.js
const bcrypt = require('bcryptjs');
const {
    success,
    error
} = require('../utils/response');
const {
    STATUS_CODES
} = require('../config/constants');
const prisma = require('../utils/prisma');
const {
    logger
} = require('../utils/logger');

/**
 * Get current user profile information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getCurrentUser = async (req, res, next) => {
    try {
        // User information is already in req.user from the protect middleware
        const {
            id,
            name,
            email,
            role
        } = req.user;

        return success(res, STATUS_CODES.SUCCESS, 'User profile retrieved successfully', {
            user: {
                id,
                name,
                email,
                role
            }
        });
    } catch (err) {
        logger.error(`Get user profile error: ${err.message}`);
        return next(err);
    }
};

/**
 * Update current user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const updateUserProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const {
            name,
            email
        } = req.body;

        // Build update data
        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;

        // Check if email is already in use by another user
        if (email && email !== req.user.email) {
            const emailExists = await prisma.user.findFirst({
                where: {
                    email,
                    NOT: {
                        id: userId
                    }
                }
            });

            if (emailExists) {
                return error(res, STATUS_CODES.BAD_REQUEST, 'Email already in use');
            }
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: {
                id: userId
            },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            }
        });

        return success(res, STATUS_CODES.SUCCESS, 'User profile updated successfully', {
            user: updatedUser
        });
    } catch (err) {
        logger.error(`Update user profile error: ${err.message}`);
        return next(err);
    }
};

/**
 * Delete current user account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const deleteUserAccount = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Delete user
        await prisma.user.delete({
            where: {
                id: userId
            }
        });

        return success(res, STATUS_CODES.SUCCESS, 'Account deleted successfully');
    } catch (err) {
        logger.error(`Delete account error: ${err.message}`);
        return next(err);
    }
};

/**
 * Change user password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const changePassword = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const {
            currentPassword,
            newPassword
        } = req.body;

        // Get user
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!user) {
            return error(res, STATUS_CODES.NOT_FOUND, 'User not found');
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return error(res, STATUS_CODES.BAD_REQUEST, 'Current password is incorrect');
        }

        // Validate new password
        if (newPassword.length < 6) {
            return error(res, STATUS_CODES.BAD_REQUEST, 'New password must be at least 6 characters');
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

        return success(res, STATUS_CODES.SUCCESS, 'Password changed successfully');
    } catch (err) {
        logger.error(`Change password error: ${err.message}`);
        return next(err);
    }
};

/**
 * Update user settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const updateUserSettings = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const {
            name,
            email,
            currentPassword,
            newPassword
        } = req.body;

        // Email format validation
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return error(res, STATUS_CODES.BAD_REQUEST, 'Invalid email format');
            }

            // Check if email is already used by another account
            const existingUser = await prisma.user.findFirst({
                where: {
                    email,
                    NOT: {
                        id: userId
                    }
                }
            });

            if (existingUser) {
                return error(res, STATUS_CODES.BAD_REQUEST, 'Email already in use');
            }
        }

        // Build update data
        let updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;

        // If changing password
        if (currentPassword && newPassword) {
            // Get user for password validation
            const user = await prisma.user.findUnique({
                where: {
                    id: userId
                }
            });

            if (!user) {
                return error(res, STATUS_CODES.NOT_FOUND, 'User not found');
            }

            // Verify current password
            const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isPasswordValid) {
                return error(res, STATUS_CODES.BAD_REQUEST, 'Current password is incorrect');
            }

            // Validate new password
            if (newPassword.length < 6) {
                return error(res, STATUS_CODES.BAD_REQUEST, 'New password must be at least 6 characters');
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 12);
            updateData.password = hashedPassword;
        }

        // Update user
        await prisma.user.update({
            where: {
                id: userId
            },
            data: updateData
        });

        return success(res, STATUS_CODES.SUCCESS, 'Settings updated successfully');
    } catch (err) {
        logger.error(`Update settings error: ${err.message}`);
        return next(err);
    }
};

module.exports = {
    getCurrentUser,
    updateUserProfile,
    deleteUserAccount,
    changePassword,
    updateUserSettings
};