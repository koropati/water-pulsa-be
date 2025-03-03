// src/routes/v1/auth.js
const express = require('express');
const { register, login, logout, getCurrentUser } = require('../../controllers/authController');
const { validate, rules } = require('../../middleware/validator');
const { protect } = require('../../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and registration
 */

// Register new user
router.post('/register', validate(rules.register), register);

// Login user
router.post('/login', validate(rules.login), login);

// Logout user
router.post('/logout', logout);

// Get current user (requires authentication)
router.get('/me', protect, getCurrentUser);

module.exports = router;