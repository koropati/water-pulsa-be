// src/server.js
require('dotenv').config();
const app = require('./app');
const {
    logger
} = require('./utils/logger');
const {
    generateSwaggerDocs
} = require('./config/swagger');

const PORT = process.env.PORT || 3000;

// Generate Swagger documentation on server start only if not skipped
if (!process.env.SKIP_SWAGGER) {
    generateSwaggerDocs();
}

const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
});

process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
    logger.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM RECEIVED. Shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated!');
    });
});