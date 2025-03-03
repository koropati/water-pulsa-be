// src/middleware/validator.js
const {
    validationResult,
    body,
    param,
    query
} = require('express-validator');
const {
    ApiError
} = require('./error');
const {
    STATUS_CODES
} = require('../config/constants');

/**
 * Validate request with express-validator
 * @param {Array} validations - Array of validation rules
 * @returns {Function} - Express middleware
 */
const validate = (validations) => {
    return async (req, res, next) => {
        // Execute validations
        await Promise.all(validations.map(validation => validation.run(req)));

        // Check for validation errors
        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        // Format error messages
        const extractedErrors = errors.array().map(err => ({
            [err.path]: err.msg
        }));

        // Return error response
        next(new ApiError('Validation failed', STATUS_CODES.BAD_REQUEST, extractedErrors));
    };
};

/**
 * Common validation rules
 */
const rules = {
    // Auth
    login: [
        body('email')
        .isEmail()
        .withMessage('Please provide a valid email'),
        body('password')
        .isLength({
            min: 6
        })
        .withMessage('Password must be at least 6 characters long')
    ],

    register: [
        body('name')
        .optional()
        .isLength({
            min: 2
        })
        .withMessage('Name must be at least 2 characters long'),
        body('email')
        .isEmail()
        .withMessage('Please provide a valid email'),
        body('password')
        .isLength({
            min: 6
        })
        .withMessage('Password must be at least 6 characters long'),
        body('role')
        .optional()
        .isIn(['ADMIN', 'STAFF', 'USER'])
        .withMessage('Invalid role')
    ],

    // User
    changePassword: [
        body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
        body('newPassword')
        .isLength({
            min: 6
        })
        .withMessage('New password must be at least 6 characters long')
    ],

    updateUser: [
        body('name')
        .optional()
        .isLength({
            min: 2
        })
        .withMessage('Name must be at least 2 characters long'),
        body('email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email')
    ],

    // Device
    createDevice: [
        body('deviceKey')
        .notEmpty()
        .withMessage('Device key is required')
        .isLength({
            min: 3
        })
        .withMessage('Device key must be at least 3 characters long'),
        body('userId')
        .optional()
        .isString()
        .withMessage('User ID must be a string')
    ],

    updateDevice: [
        body('status')
        .optional()
        .isBoolean()
        .withMessage('Status must be a boolean'),
        body('deviceKey')
        .optional()
        .isLength({
            min: 3
        })
        .withMessage('Device key must be at least 3 characters long')
    ],

    // Token
    createToken: [
        body('deviceId')
        .notEmpty()
        .withMessage('Device ID is required'),
        body('amount')
        .isFloat({
            min: 0.01
        })
        .withMessage('Amount must be a positive number')
    ],

    // API Key
    createApiKey: [
        body('name')
        .notEmpty()
        .withMessage('Name is required')
        .isLength({
            min: 3
        })
        .withMessage('Name must be at least 3 characters long'),
        body('userId')
        .optional()
        .isString()
        .withMessage('User ID must be a string'),
        body('expiresAt')
        .optional()
        .isISO8601()
        .withMessage('Expiration date must be a valid ISO 8601 date')
    ],

    updateApiKey: [
        body('name')
        .optional()
        .isLength({
            min: 3
        })
        .withMessage('Name must be at least 3 characters long'),
        body('status')
        .optional()
        .isBoolean()
        .withMessage('Status must be a boolean'),
        body('expiresAt')
        .optional()
        .isISO8601()
        .withMessage('Expiration date must be a valid ISO 8601 date')
    ],

    // Usage Log
    createUsageLog: [
        body('deviceId')
        .notEmpty()
        .withMessage('Device ID is required'),
        body('usageAmount')
        .isFloat({
            min: 0.01
        })
        .withMessage('Usage amount must be a positive number')
    ],

    // Profile
    updateProfile: [
        body('phoneNumber')
        .optional()
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),
        body('address')
        .optional()
        .isString()
        .withMessage('Address must be a string')
    ],

    // Device IoT API
    authenticateDevice: [
        body('deviceKey')
        .notEmpty()
        .withMessage('Device key is required')
    ],

    checkDeviceBalance: [
        body('deviceKey')
        .notEmpty()
        .withMessage('Device key is required')
    ],

    logDeviceUsage: [
        body('deviceKey')
        .notEmpty()
        .withMessage('Device key is required'),
        body('usageAmount')
        .notEmpty()
        .withMessage('Usage amount is required')
        .isFloat({
            min: 0.01
        })
        .withMessage('Usage amount must be a positive number')
    ],

    validateDeviceToken: [
        body('deviceKey')
        .notEmpty()
        .withMessage('Device key is required'),
        body('token')
        .notEmpty()
        .withMessage('Token is required')
    ],

    updateUserProfile: [
        body('name')
        .optional()
        .isString()
        .withMessage('Name must be a string')
        .isLength({
            min: 2
        })
        .withMessage('Name must be at least 2 characters'),
        body('email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email')
    ],

    changePassword: [
        body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
        body('newPassword')
        .notEmpty()
        .withMessage('New password is required')
        .isLength({
            min: 6
        })
        .withMessage('New password must be at least 6 characters')
    ],

    updateUserSettings: [
        body('name')
        .optional()
        .isString()
        .withMessage('Name must be a string')
        .isLength({
            min: 2
        })
        .withMessage('Name must be at least 2 characters'),
        body('email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email'),
        body('currentPassword')
        .optional()
        .isString()
        .withMessage('Current password must be a string'),
        body('newPassword')
        .optional()
        .isLength({
            min: 6
        })
        .withMessage('New password must be at least 6 characters')
    ],

    // Common ID parameter
    id: [
        param('id')
        .notEmpty()
        .withMessage('ID is required')
        .isString()
        .withMessage('ID must be a string')
    ],

    // Pagination
    pagination: [
        query('page')
        .optional()
        .isInt({
            min: 1
        })
        .withMessage('Page must be a positive integer'),
        query('limit')
        .optional()
        .isInt({
            min: 1,
            max: 100
        })
        .withMessage('Limit must be a positive integer (max 100)')
    ]
};

module.exports = {
    validate,
    rules
};