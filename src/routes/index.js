// src/routes/index.js
const express = require('express');
const v1Routes = require('./v1');
const { error } = require('../utils/response');
const { STATUS_CODES } = require('../config/constants');

const router = express.Router();

// API version 1 routes
router.use('/api/v1', v1Routes);

// API status endpoint
router.get('/api/status', (req, res) => {
    res.status(STATUS_CODES.SUCCESS).json({
        status: 'success',
        message: 'API is running',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
router.get('/health', (req, res) => {
    // Get system health information
    const health = {
        uptime: process.uptime(),
        responseTime: process.hrtime(),
        message: 'OK',
        timestamp: Date.now(),
        environment: process.env.NODE_ENV || 'development',
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
    };

    try {
        res.status(STATUS_CODES.SUCCESS).json({
            status: 'success',
            serviceName: 'sipelayar-api',
            version: '1.0.0',
            health
        });
    } catch (error) {
        health.message = error.message;
        res.status(STATUS_CODES.INTERNAL_ERROR).json({
            status: 'error',
            serviceName: 'sipelayar-api',
            version: '1.0.0',
            health
        });
    }
});

// Handle 404 for API routes
router.all('/api/*', (req, res) => {
    error(res, STATUS_CODES.NOT_FOUND, 'API endpoint not found');
});

module.exports = router;