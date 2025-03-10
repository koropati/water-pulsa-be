// src/controllers/userController.js
const userService = require('../services/userService');
const {
    success,
    error,
    paginate
} = require('../utils/response');
const {
    STATUS_CODES
} = require('../config/constants');
const {
    getPaginationParams
} = require('../utils/helpers');
const {
    logger
} = require('../utils/logger');

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name or email
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const getAllUsers = async (req, res, next) => {
    try {
        const options = {
            ...getPaginationParams(req),
            search: req.query.search
        };

        const result = await userService.getAllUsers(options, req.user.role);

        return paginate(
            res,
            result.users,
            result.meta.total,
            result.meta.page,
            result.meta.limit,
            'Users retrieved successfully'
        );
    } catch (err) {
        logger.error(`Error getting users: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const getUserById = async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.params.id);
        return success(res, STATUS_CODES.SUCCESS, 'User retrieved successfully', user);
    } catch (err) {
        logger.error(`Error getting user: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
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
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const createUser = async (req, res, next) => {
    try {
        const newUser = await userService.createUser(req.body);
        return success(res, STATUS_CODES.CREATED, 'User created successfully', {
            user: newUser
        });
    } catch (err) {
        logger.error(`Error creating user: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update a user
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [ADMIN, STAFF, USER]
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 *       409:
 *         description: Email already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
const updateUser = async (req, res, next) => {
    try {
        const updatedUser = await userService.updateUser(
            req.params.id,
            req.body,
            req.user.role
        );
        return success(res, STATUS_CODES.SUCCESS, 'User updated successfully', updatedUser);
    } catch (err) {
        logger.error(`Error updating user: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
const deleteUser = async (req, res, next) => {
    try {
        await userService.deleteUser(req.params.id);
        return success(res, STATUS_CODES.SUCCESS, 'User deleted successfully');
    } catch (err) {
        logger.error(`Error deleting user: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /users/stats:
 *   get:
 *     summary: Get user statistics
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const getUserStats = async (req, res, next) => {
    try {
        const stats = await userService.getUserStats(req.user.role);
        return success(res, STATUS_CODES.SUCCESS, 'User stats retrieved successfully', stats);
    } catch (err) {
        logger.error(`Error getting user stats: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /users/dropdown:
 *   get:
 *     summary: Get users for dropdown selection
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name or email
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of users for dropdown
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires SUPER_ADMIN role
 *       500:
 *         description: Server error
 */
const getUsersForDropdown = async (req, res, next) => {
    try {

        const options = {
            ...getPaginationParams(req),
            search: req.query.search
        };

        // Get all users (filtered by search if provided)
        const result = await userService.getAllUsers(options, req.user.role);

        // Format users for dropdown
        const formattedUsers = result.users.map(user => ({
            value: user.id,
            label: `${user.name || 'User'} (${user.email})`
        }));

        return success(res, STATUS_CODES.SUCCESS, 'Users retrieved successfully', {
            users: formattedUsers,
            meta: {
                total: result.meta.total,
                page: result.meta.page,
                limit: result.meta.limit,
                hasMore: (result.meta.page * result.meta.limit) < result.meta.total
            }
        });
    } catch (err) {
        logger.error(`Error getting users for dropdown: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /users/{id}/toggle-status:
 *   patch:
 *     summary: Toggle user active status
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
const toggleUserActiveStatus = async (req, res, next) => {
    try {
        const {
            isActive
        } = req.body;

        if (typeof isActive !== 'boolean') {
            return error(res, STATUS_CODES.BAD_REQUEST, 'isActive must be a boolean value');
        }

        const updatedUser = await userService.toggleUserActiveStatus(
            req.params.id,
            isActive
        );

        return success(
            res,
            STATUS_CODES.SUCCESS,
            `User ${isActive ? 'activated' : 'deactivated'} successfully`,
            updatedUser
        );
    } catch (err) {
        logger.error(`Error toggling user status: ${err.message}`);
        return next(err);
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getUserStats,
    getUsersForDropdown,
    toggleUserActiveStatus
};