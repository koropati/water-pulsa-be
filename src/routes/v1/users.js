// src/routes/v1/users.js
const express = require('express');
const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getUserStats
} = require('../../controllers/userController');
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

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

// All routes require authentication
router.use(protect);

// Get all users (admin only)
router.get('/', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), getAllUsers);

// Get user stats (admin only)
router.get('/stats', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), getUserStats);

// Get user by ID (admin only)
router.get('/:id', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), getUserById);

// Create a new user (admin only)
router.post('/', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), validate(rules.createUser), createUser);

// Update a user (admin only)
router.put('/:id', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), validate(rules.updateUser), updateUser);

// Delete a user (admin only)
router.delete('/:id', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteUser);

module.exports = router;