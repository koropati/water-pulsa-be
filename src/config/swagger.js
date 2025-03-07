// src/config/swagger.js
const swaggerJSDoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');
const {
    logger
} = require('../utils/logger');

// Swagger definition
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Sipelayar API',
        version: '1.0.0',
        description: 'API documentation for Sipelayar application',
        license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT',
        },
        contact: {
            name: 'API Support',
            email: 'support@example.com',
        },
    },
    servers: [{
        url: '/api/v1',
        description: 'V1 Development server',
    }],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'JWT token issued on login'
            },
            ApiKeyAuth: {
                type: 'apiKey',
                in: 'header',
                name: 'x-api-key',
                description: 'API key issued to clients'
            }
        },
    },
    // Ensure these global security requirements are applied
    security: [{
            BearerAuth: []
        },
        {
            ApiKeyAuth: []
        }
    ]
};

// Options for the swagger docs
const options = {
    swaggerDefinition,
    // Path to the API docs
    apis: ['./src/routes/**/*.js', './src/controllers/**/*.js', './src/models/**/*.js'],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

/**
 * Generate Swagger documentation and save to file
 */
const generateSwaggerDocs = () => {
    const swaggerPath = path.join(__dirname, '../../swagger.json');

    // Check if the file already exists and compare content
    if (fs.existsSync(swaggerPath)) {
        try {
            const existingContent = fs.readFileSync(swaggerPath, 'utf8');
            const newContent = JSON.stringify(swaggerSpec, null, 2);

            // If content is identical, don't write the file (prevents nodemon restart)
            if (existingContent === newContent) {
                logger.info('Swagger documentation already up to date');
                return;
            }
        } catch (err) {
            logger.error(`Error reading existing Swagger file: ${err.message}`);
        }
    }

    // Write the swagger.json file
    try {
        fs.writeFileSync(
            swaggerPath,
            JSON.stringify(swaggerSpec, null, 2)
        );
        logger.info('Swagger documentation generated successfully');
    } catch (err) {
        logger.error(`Error generating Swagger documentation: ${err.message}`);
    }
};

module.exports = {
    generateSwaggerDocs,
    swaggerSpec // Export the spec for other modules to use
};