// src/utils/prisma.js
const {
    PrismaClient
} = require('@prisma/client');
const {
    logger
} = require('./logger');

// Create a singleton Prisma client instance
const prisma = new PrismaClient({
    log: [{
            emit: 'event',
            level: 'query',
        },
        {
            emit: 'event',
            level: 'error',
        },
        {
            emit: 'event',
            level: 'info',
        },
        {
            emit: 'event',
            level: 'warn',
        },
    ],
});

// Log queries in development mode
if (process.env.NODE_ENV === 'development') {
    prisma.$on('query', (e) => {
        logger.debug(`Query: ${e.query}`);
        logger.debug(`Duration: ${e.duration}ms`);
    });
}

// Log errors
prisma.$on('error', (e) => {
    logger.error(`Prisma Error: ${e.message}`);
});

module.exports = prisma;