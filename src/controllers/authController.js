// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const {
    success,
    error
} = require('../utils/response');
const {
    generateToken
} = require('../utils/jwt');
const {
    ApiError
} = require('../middleware/error');
const {
    STATUS_CODES
} = require('../config/constants');
const {
    ROLES
} = require('../config/constants');
const prisma = require('../utils/prisma');
const {
    logger
} = require('../utils/logger');

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               role:
 *                 type: string
 *                 enum: [ADMIN, STAFF, USER]
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Server error
 */
const register = async (req, res, next) => {
    try {
        const {
            name,
            email,
            password,
            role = ROLES.STAFF
        } = req.body;

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: {
                email
            }
        });

        if (existingUser) {
            return next(
                new ApiError('Email already in use', STATUS_CODES.CONFLICT)
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                profile: {
                    create: {} // Create empty profile
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            }
        });

        // Generate token
        const token = generateToken({
            userId: newUser.id,
            email: newUser.email,
            role: newUser.role
        });

        return success(
            res,
            STATUS_CODES.CREATED,
            'User registered successfully', {
                user: newUser,
                token
            }
        );
    } catch (err) {
        logger.error(`Registration error: ${err.message}`);
        return next(new ApiError('Registration failed', STATUS_CODES.INTERNAL_ERROR));
    }
};

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
const login = async (req, res, next) => {
    try {
        const {
            email,
            password
        } = req.body;

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: {
                email
            },
            select: {
                id: true,
                email: true,
                password: true,
                name: true,
                role: true
            }
        });

        if (!user) {
            return next(
                new ApiError('Invalid email or password', STATUS_CODES.UNAUTHORIZED)
            );
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return next(
                new ApiError('Invalid email or password', STATUS_CODES.UNAUTHORIZED)
            );
        }

        // Generate token
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role
        });

        // Remove password from response
        const {
            password: _,
            ...userWithoutPassword
        } = user;

        return success(res, STATUS_CODES.SUCCESS, 'Login successful', {
            user: userWithoutPassword,
            token
        });
    } catch (err) {
        logger.error(`Login error: ${err.message}`);
        return next(new ApiError('Login failed', STATUS_CODES.INTERNAL_ERROR));
    }
};

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logout successful
 */
const logout = (req, res) => {
    return success(res, STATUS_CODES.SUCCESS, 'Logout successful');
};

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Return current user
 *       401:
 *         description: Not authenticated
 */
const getCurrentUser = (req, res) => {
    return success(res, STATUS_CODES.SUCCESS, 'Current user', {
        user: req.user
    });
};

module.exports = {
    register,
    login,
    logout,
    getCurrentUser
};