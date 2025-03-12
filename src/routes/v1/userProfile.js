// src/routes/v1/userProfile.js
const express = require('express');
const {
    getCurrentUser,
    updateUserProfile,
    updateUserProfilePartial,
    deleteUserAccount,
    changePassword,
    updateUserSettings
} = require('../../controllers/userProfileController');
const {
    validate,
    rules
} = require('../../middleware/validator');
const {
    protect
} = require('../../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: User Profile
 *   description: User profile management
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /user-profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [User Profile]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.get('/', getCurrentUser);

/**
 * @swagger
 * /user-profile:
 *   put:
 *     summary: Update user profile
 *     tags: [User Profile]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: User profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.put('/', validate(rules.updateUser), updateUserProfile);

router.patch('/', validate(rules.updateUserProfilePartial), updateUserProfilePartial);

/**
 * @swagger
 * /user-profile:
 *   delete:
 *     summary: Delete user account
 *     tags: [User Profile]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.delete('/', deleteUserAccount);

/**
 * @swagger
 * /user-profile/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [User Profile]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.post('/change-password', validate(rules.changePassword), changePassword);

/**
 * @swagger
 * /user-profile/settings:
 *   put:
 *     summary: Update user settings
 *     tags: [User Profile]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.put('/settings', updateUserSettings);

module.exports = router;