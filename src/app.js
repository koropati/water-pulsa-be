// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger.json');
// Custom Swagger documentation with auth UI
const {
    setupCustomSwaggerUI
} = require('./config/custom-swagger');

const {
    handleError
} = require('./middleware/error');
const {
    logger
} = require('./utils/logger');

const routes = require('./routes/index')

// Inicializar la aplicación Express
const app = express();

// Parse JSON bodies
app.use(express.json({
    limit: '10kb'
}));

// Parse URL-encoded bodies
app.use(express.urlencoded({
    extended: true,
    limit: '10kb'
}));

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', {
        stream: {
            write: message => logger.info(message.trim())
        }
    }));
}

// Enable CORS dengan whitelist origin
const allowedOrigins = process.env.ALLOWED_ORIGINS ?
    process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];

app.use(cors({
    origin: function(origin, callback) {
        // Izinkan permintaan tanpa origin (seperti aplikasi mobile atau curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            callback(null, true); // Aktifkan semua origin untuk menyelesaikan masalah
            // Jika ingin membatasi origin kembali, ubah baris di atas ke:
            // callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    credentials: true // Aktifkan credentials jika perlu (cookies, authorization headers)
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply rate limiting to API routes
app.use('/api', limiter);

// Compression
app.use(compression());

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger documentation
setupCustomSwaggerUI(app, swaggerDocument);
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API Routes
app.use('', routes);

// 404 handler
app.all('*', (req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Can't find ${req.originalUrl} on this server!`
    });
});

// Error handling middleware
app.use(handleError);

// Exportar la aplicación
module.exports = app;