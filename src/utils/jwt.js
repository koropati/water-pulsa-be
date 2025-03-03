// src/utils/jwt.js
const jwt = require('jsonwebtoken');
const {
    logger
} = require('./logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate a JWT token
 * @param {Object} payload - Data to include in token
 * @param {String} expiresIn - Token expiration time
 * @returns {String} - JWT token
 */
const generateToken = (payload, expiresIn = JWT_EXPIRES_IN) => {
    try {
        return jwt.sign(payload, JWT_SECRET, {
            expiresIn
        });
    } catch (error) {
        logger.error(`Error generating token: ${error.message}`);
        throw new Error('Failed to generate token');
    }
};

/**
 * Verify a JWT token
 * @param {String} token - Token to verify
 * @returns {Object} - Decoded token payload
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        logger.error(`Token verification failed: ${error.message}`);
        return null;
    }
};

/**
 * Extract token from request
 * @param {Object} req - Express request object
 * @returns {String|null} - JWT token or null
 */
const extractToken = (req) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        return req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        return req.cookies.token;
    }
    return null;
};

module.exports = {
    generateToken,
    verifyToken,
    extractToken
};