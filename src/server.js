// src/server.js - Updated with MQTT initialization
require('dotenv').config();
const app = require('./app');
const { logger } = require('./utils/logger');
const { generateSwaggerDocs } = require('./config/swagger');
const mqttService = require('./services/mqttService');

const PORT = process.env.PORT || 3000;

// Generate Swagger documentation on server start only if not skipped
if (!process.env.SKIP_SWAGGER) {
    generateSwaggerDocs();
}

// Initialize MQTT service
async function initializeMQTT() {
    try {
        if (process.env.ENABLE_MQTT !== 'false') {
            logger.info('Initializing MQTT service...');
            await mqttService.connect();
            logger.info('MQTT service initialized successfully');
        } else {
            logger.info('MQTT service disabled by configuration');
        }
    } catch (error) {
        logger.error(`Failed to initialize MQTT service: ${error.message}`);
        // Don't exit the process, let the HTTP server run without MQTT
        logger.warn('Continuing without MQTT service...');
    }
}

// Start server
const server = app.listen(PORT, async () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
    logger.info(`Health Check: http://localhost:${PORT}/health`);
    logger.info(`MQTT Status: http://localhost:${PORT}/mqtt-status`);
    
    // Initialize MQTT after server starts
    await initializeMQTT();
});

// Graceful shutdown handlers
process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
    logger.error(err.name, err.message);
    server.close(() => {
        // Disconnect MQTT before exiting
        mqttService.disconnect();
        process.exit(1);
    });
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM RECEIVED. Shutting down gracefully');
    server.close(() => {
        // Disconnect MQTT gracefully
        mqttService.disconnect();
        logger.info('Process terminated!');
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT RECEIVED. Shutting down gracefully');
    server.close(() => {
        // Disconnect MQTT gracefully
        mqttService.disconnect();
        logger.info('Process terminated!');
    });
});

// Handle MQTT reconnection on connection loss
setInterval(() => {
    const status = mqttService.getStatus();
    if (!status.connected && process.env.ENABLE_MQTT !== 'false') {
        logger.warn('MQTT disconnected. Attempting to reconnect...');
        mqttService.connect().catch((error) => {
            logger.error(`MQTT reconnection failed: ${error.message}`);
        });
    }
}, 30000); // Check every 30 seconds

module.exports = server;