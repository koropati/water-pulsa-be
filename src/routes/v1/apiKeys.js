// src/routes/v1/apiKeys.js
const express = require('express');
const {
    getAllApiKeys,
    getApiKeyById,
    createApiKey,
    updateApiKey,
    deleteApiKey,
    getApiKeyUsage,
    getApiKeyStats
} = require('../../controllers/apiKeyController');
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
 *   name: API Keys
 *   description: API Key management
 */

// All routes require authentication
router.use(protect);

// Get all API keys
router.get('/', getAllApiKeys);

// Get API key statistics
router.get('/stats', getApiKeyStats);

// Get API key by ID
router.get('/:id', getApiKeyById);

// Get API key usage history
router.get('/:id/usage', getApiKeyUsage);

// Create a new API key
router.post('/', validate(rules.createApiKey), createApiKey);

// Update an API key
router.put('/:id', validate(rules.updateApiKey), updateApiKey);

// Delete an API key
router.delete('/:id', deleteApiKey);

module.exports = router;