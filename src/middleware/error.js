// src/middleware/error.js
const {
    logger
} = require('../utils/logger');
const {
    STATUS_CODES
} = require('../config/constants');

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Handle development errors
 * @param {Error} err - Error object
 * @param {Object} res - Express response object
 */
const sendErrorDev = (err, res) => {
    logger.error('ERROR 💥', err);
    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        error: err,
        stack: err.stack,
    });
};

/**
 * Handle production errors
 * @param {Error} err - Error object
 * @param {Object} res - Express response object
 */
const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
    } else {
        // Programming or other unknown error: don't leak error details
        logger.error('ERROR 💥', err);

        res.status(STATUS_CODES.INTERNAL_ERROR).json({
            status: 'error',
            message: 'Something went wrong',
        });
    }
};

/**
 * Handle JWT validation errors
 * @param {Error} err - Error object
 * @returns {ApiError} - API error
 */
const handleJWTError = (err) =>
    new ApiError('Invalid token. Please log in again.', STATUS_CODES.UNAUTHORIZED);

/**
 * Handle JWT expiration errors
 * @param {Error} err - Error object
 * @returns {ApiError} - API error
 */
const handleJWTExpiredError = (err) =>
    new ApiError('Your token has expired. Please log in again.', STATUS_CODES.UNAUTHORIZED);

/**
 * Handle validation errors
 * @param {Error} err - Error object
 * @returns {ApiError} - API error
 */
const handleValidationError = (err) => {
    const errors = Object.values(err.errors).map((el) => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new ApiError(message, STATUS_CODES.BAD_REQUEST);
};

/**
 * Error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const handleError = (err, req, res, next) => {
    err.statusCode = err.statusCode || STATUS_CODES.INTERNAL_ERROR;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else {
        let error = {
            ...err
        };
        error.message = err.message;

        if (error.name === 'JsonWebTokenError') error = handleJWTError(error);
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError(error);
        if (error.name === 'ValidationError') error = handleValidationError(error);

        sendErrorProd(error, res);
    }
};

module.exports = {
    ApiError,
    handleError,
};