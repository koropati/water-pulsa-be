// src/controllers/deviceController.js
const deviceService = require('../services/deviceService');
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
 * /devices:
 *   get:
 *     summary: Get all devices
 *     tags: [Devices]
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
 *         description: Search term for device key
 *       - in: query
 *         name: status
 *         schema:
 *           type: boolean
 *         description: Filter by status (true/false)
 *     responses:
 *       200:
 *         description: List of devices
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const getAllDevices = async (req, res, next) => {
    try {
        const options = {
            ...getPaginationParams(req),
            search: req.query.search,
            status: req.query.status
        };

        const result = await deviceService.getAllDevices(
            options,
            req.user.id,
            req.user.role
        );

        return paginate(
            res,
            result.devices,
            result.meta.total,
            result.meta.page,
            result.meta.limit,
            'Devices retrieved successfully'
        );
    } catch (err) {
        logger.error(`Error getting devices: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /devices/{id}:
 *   get:
 *     summary: Get device by ID
 *     tags: [Devices]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     responses:
 *       200:
 *         description: Device details
 *       404:
 *         description: Device not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
const getDeviceById = async (req, res, next) => {
    try {
        const device = await deviceService.getDeviceById(
            req.params.id,
            req.user.id,
            req.user.role
        );
        return success(res, STATUS_CODES.SUCCESS, 'Device retrieved successfully', device);
    } catch (err) {
        logger.error(`Error getting device: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /devices:
 *   post:
 *     summary: Create a new device
 *     tags: [Devices]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceKey
 *             properties:
 *               deviceKey:
 *                 type: string
 *               userId:
 *                 type: string
 *                 description: Required for admins creating device for other users
 *     responses:
 *       201:
 *         description: Device created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Device key already exists
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const createDevice = async (req, res, next) => {
    try {
        const newDevice = await deviceService.createDevice(
            req.body,
            req.user.id,
            req.user.role
        );
        return success(res, STATUS_CODES.CREATED, 'Device created successfully', {
            device: newDevice
        });
    } catch (err) {
        logger.error(`Error creating device: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /devices/{id}:
 *   put:
 *     summary: Update a device
 *     tags: [Devices]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deviceKey:
 *                 type: string
 *               status:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Device updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Device not found
 *       409:
 *         description: Device key already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
const updateDevice = async (req, res, next) => {
    try {
        const updatedDevice = await deviceService.updateDevice(
            req.params.id,
            req.body,
            req.user.id,
            req.user.role
        );
        return success(res, STATUS_CODES.SUCCESS, 'Device updated successfully', updatedDevice);
    } catch (err) {
        logger.error(`Error updating device: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /devices/{id}:
 *   delete:
 *     summary: Delete a device
 *     tags: [Devices]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     responses:
 *       200:
 *         description: Device deleted successfully
 *       404:
 *         description: Device not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
const deleteDevice = async (req, res, next) => {
    try {
        await deviceService.deleteDevice(
            req.params.id,
            req.user.id,
            req.user.role
        );
        return success(res, STATUS_CODES.SUCCESS, 'Device deleted successfully');
    } catch (err) {
        logger.error(`Error deleting device: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /devices/dropdown:
 *   get:
 *     summary: Get devices for dropdown selection
 *     tags: [Devices]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for device key or user
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
 *         description: List of devices for dropdown
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const getDevicesForDropdown = async (req, res, next) => {
    try {
        const options = {
            ...getPaginationParams(req),
            search: req.query.search
        };

        const result = await deviceService.getDevicesForDropdown(
            options,
            req.user.id,
            req.user.role
        );

        return success(res, STATUS_CODES.SUCCESS, 'Devices retrieved successfully', {
            devices: result.devices,
            meta: result.meta
        });
    } catch (err) {
        logger.error(`Error getting devices for dropdown: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /devices/stats:
 *   get:
 *     summary: Get device statistics
 *     tags: [Devices]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Device statistics
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const getDeviceStats = async (req, res, next) => {
    try {
        const stats = await deviceService.getDeviceStats(
            req.user.id,
            req.user.role
        );
        return success(res, STATUS_CODES.SUCCESS, 'Device stats retrieved successfully', stats);
    } catch (err) {
        logger.error(`Error getting device stats: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /devices/auth:
 *   post:
 *     summary: Authenticate a device by device key
 *     tags: [Devices]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceKey
 *             properties:
 *               deviceKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Device authenticated successfully
 *       400:
 *         description: Invalid device key
 *       404:
 *         description: Device not found
 *       403:
 *         description: Device is inactive
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const authenticateDevice = async (req, res, next) => {
    try {
        const {
            deviceKey
        } = req.body;

        if (!deviceKey) {
            return error(res, STATUS_CODES.BAD_REQUEST, 'Device key is required');
        }

        const result = await deviceService.authenticateDevice(deviceKey);
        return success(res, STATUS_CODES.SUCCESS, 'Device authenticated successfully', result);
    } catch (err) {
        logger.error(`Error authenticating device: ${err.message}`);
        return next(err);
    }
};

module.exports = {
    getAllDevices,
    getDeviceById,
    createDevice,
    updateDevice,
    deleteDevice,
    getDevicesForDropdown,
    getDeviceStats,
    authenticateDevice
};