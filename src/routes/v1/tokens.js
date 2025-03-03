// src/routes/v1/tokens.js
const express = require('express');
const {
    getAllTokens,
    getTokenById,
    getTokensByDevice,
    createToken,
    validateToken,
    getTokenStats
} = require('../../controllers/tokenController');
const {
    validate,
    rules
} = require('../../middleware/validator');
const {
    protect,
    validateApiKey
} = require('../../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Tokens
 *   description: Token management
 */

// Public routes with API key authentication
router.post('/validate', validateApiKey, validate(rules.validateToken), validateToken);

// Protected routes
router.use(protect);

// Get all tokens
router.get('/', getAllTokens);

// Get token statistics
router.get('/stats', getTokenStats);

// Get tokens for a device
router.get('/device/:deviceId', getTokensByDevice);

// Get token by ID
router.get('/:id', getTokenById);

// Create a new token
router.post('/', validate(rules.createToken), createToken);

module.exports = router;