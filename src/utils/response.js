// src/utils/response.js
const {
    STATUS_CODES
} = require('../config/constants');

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code
 * @param {String} message - Success message
 * @param {Object} data - Response data
 * @returns {Object} - JSON response
 */
const success = (res, statusCode = STATUS_CODES.SUCCESS, message = 'Success', data = null) => {
    const response = {
        status: 'success',
        message
    };

    if (data !== null) {
        response.data = data;
    }

    return res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code
 * @param {String} message - Error message
 * @param {Object} errors - Validation errors
 * @returns {Object} - JSON response
 */
const error = (res, statusCode = STATUS_CODES.INTERNAL_ERROR, message = 'Error', errors = null) => {
    const response = {
        status: 'error',
        message
    };

    if (errors !== null) {
        response.errors = errors;
    }

    return res.status(statusCode).json(response);
};

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Data array
 * @param {Number} total - Total number of items
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 * @param {String} message - Success message
 * @returns {Object} - JSON response
 */
const paginate = (res, data, total, page, limit, message = 'Success') => {
    const totalPages = Math.ceil(total / limit);

    return success(res, STATUS_CODES.SUCCESS, message, {
        data,
        meta: {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    });
};

module.exports = {
    success,
    error,
    paginate
};