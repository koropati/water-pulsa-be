// src/routes/v1/profiles.js
const express = require('express');
const {
    getCurrentProfile,
    updateProfile,
    getProfileAvatar,
    deleteProfileAvatar,
    deleteProfile,
    getProfileById
} = require('../../controllers/profileController');
const {
    validate,
    rules
} = require('../../middleware/validator');
const {
    protect,
    restrictTo
} = require('../../middleware/auth');
const {
    ROLES
} = require('../../config/constants');
const {
    uploadAvatar
} = require('../../middleware/upload');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Profiles
 *   description: User profile management
 */

// All routes require authentication
router.use(protect);

// Get current user's profile
router.get('/', getCurrentProfile);

// Update user profile (with file upload)
router.put('/', uploadAvatar, updateProfile);

// Get user avatar
router.get('/avatar', getProfileAvatar);

// Delete user avatar
router.delete('/avatar', deleteProfileAvatar);

// Delete user profile
router.delete('/', deleteProfile);

// Get profile by ID (admin only)
router.get('/:id', restrictTo(ROLES.ADMIN), getProfileById);

module.exports = router;