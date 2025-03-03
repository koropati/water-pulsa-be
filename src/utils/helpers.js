// src/utils/helpers.js
const crypto = require('crypto');
const {
    PAGINATION
} = require('../config/constants');

/**
 * Generate a random token
 * @param {Number} length - Token length
 * @returns {String} - Random token
 */
const generateRandomToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate unique device token
 * @returns {String} - Device token
 */
const generateDeviceToken = () => {
    return `dt_${crypto.randomBytes(16).toString('hex')}`;
};

/**
 * Generate API key
 * @returns {String} - API key
 */
const generateApiKey = () => {
    const prefix = process.env.API_KEY_PREFIX || 'sk_';
    return `${prefix}${crypto.randomBytes(24).toString('hex')}`;
};

/**
 * Extract pagination parameters from request
 * @param {Object} req - Express request object
 * @returns {Object} - Pagination parameters
 */
const getPaginationParams = (req) => {
    const page = parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE;
    const limit = parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT;

    return {
        page,
        limit,
        skip: (page - 1) * limit
    };
};

/**
 * Sanitize object by removing specified fields
 * @param {Object} obj - Object to sanitize
 * @param {Array} fieldsToRemove - Fields to remove
 * @returns {Object} - Sanitized object
 */
const sanitizeObject = (obj, fieldsToRemove = ['password']) => {
    const sanitized = {
        ...obj
    };
    fieldsToRemove.forEach(field => {
        delete sanitized[field];
    });
    return sanitized;
};

/**
 * Check if string is valid JSON
 * @param {String} str - String to check
 * @returns {Boolean} - True if valid JSON
 */
const isValidJson = (str) => {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
};

/**
 * Get current timestamp in ISO format
 * @returns {String} - Current timestamp
 */
const getCurrentTimestamp = () => {
    return new Date().toISOString();
};

module.exports = {
    generateRandomToken,
    generateDeviceToken,
    generateApiKey,
    getPaginationParams,
    sanitizeObject,
    isValidJson,
    getCurrentTimestamp
};