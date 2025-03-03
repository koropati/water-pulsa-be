// src/controllers/profileController.js
const profileService = require('../services/profileService');
const {
    success,
    error
} = require('../utils/response');
const {
    STATUS_CODES
} = require('../config/constants');
const {
    logger
} = require('../utils/logger');

/**
 * @swagger
 * /profiles:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Profiles]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       404:
 *         description: Profile not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const getCurrentProfile = async (req, res, next) => {
    try {
        const profile = await profileService.getProfileByUserId(req.user.id);
        return success(res, STATUS_CODES.SUCCESS, 'Profile retrieved successfully', {
            profile
        });
    } catch (err) {
        logger.error(`Error getting profile: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /profiles:
 *   put:
 *     summary: Update user profile
 *     tags: [Profiles]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *               address:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const updateProfile = async (req, res, next) => {
    try {
        const profileData = {
            phoneNumber: req.body.phoneNumber,
            address: req.body.address
        };

        const fileData = req.file;

        const profile = await profileService.updateProfile(
            req.user.id,
            profileData,
            fileData
        );

        return success(res, STATUS_CODES.SUCCESS, 'Profile updated successfully', {
            profile
        });
    } catch (err) {
        logger.error(`Error updating profile: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /profiles/avatar:
 *   get:
 *     summary: Get user avatar
 *     tags: [Profiles]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Avatar URL
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const getProfileAvatar = async (req, res, next) => {
    try {
        const avatar = await profileService.getProfileAvatar(req.user.id);
        return success(res, STATUS_CODES.SUCCESS, 'Avatar retrieved successfully', {
            avatar
        });
    } catch (err) {
        logger.error(`Error getting avatar: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /profiles/avatar:
 *   delete:
 *     summary: Delete user avatar
 *     tags: [Profiles]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Avatar deleted successfully
 *       404:
 *         description: Profile not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const deleteProfileAvatar = async (req, res, next) => {
    try {
        const profile = await profileService.deleteProfileAvatar(req.user.id);
        return success(res, STATUS_CODES.SUCCESS, 'Avatar deleted successfully', {
            profile
        });
    } catch (err) {
        logger.error(`Error deleting avatar: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /profiles:
 *   delete:
 *     summary: Delete user profile
 *     tags: [Profiles]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile deleted successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const deleteProfile = async (req, res, next) => {
    try {
        await profileService.deleteProfile(req.user.id);
        return success(res, STATUS_CODES.SUCCESS, 'Profile deleted successfully');
    } catch (err) {
        logger.error(`Error deleting profile: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /profiles/{id}:
 *   get:
 *     summary: Get profile by ID (admin only)
 *     tags: [Profiles]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Profile ID
 *     responses:
 *       200:
 *         description: Profile details
 *       404:
 *         description: Profile not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
const getProfileById = async (req, res, next) => {
    try {
        const profile = await profileService.getProfileById(
            req.params.id,
            req.user.role
        );
        return success(res, STATUS_CODES.SUCCESS, 'Profile retrieved successfully', {
            profile
        });
    } catch (err) {
        logger.error(`Error getting profile by ID: ${err.message}`);
        return next(err);
    }
};

module.exports = {
    getCurrentProfile,
    updateProfile,
    getProfileAvatar,
    deleteProfileAvatar,
    deleteProfile,
    getProfileById
};