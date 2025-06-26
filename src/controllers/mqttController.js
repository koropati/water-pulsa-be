// src/controllers/mqttController.js
const mqttService = require('../services/mqttService');
const { success, error } = require('../utils/response');
const { STATUS_CODES } = require('../config/constants');
const { logger } = require('../utils/logger');
const prisma = require('../utils/prisma');

/**
 * @swagger
 * /mqtt/status:
 *   get:
 *     summary: Get MQTT service status
 *     tags: [MQTT]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: MQTT service status
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const getMQTTStatus = async (req, res, next) => {
    try {
        const status = mqttService.getStatus();
        return success(res, STATUS_CODES.SUCCESS, 'MQTT status retrieved successfully', status);
    } catch (err) {
        logger.error(`Error getting MQTT status: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /mqtt/send-command:
 *   post:
 *     summary: Send command to a specific device via MQTT
 *     tags: [MQTT]
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
 *               - command
 *             properties:
 *               deviceKey:
 *                 type: string
 *               command:
 *                 type: string
 *                 enum: [reboot, update_config, check_status, reset_balance]
 *               data:
 *                 type: object
 *                 description: Additional command data
 *     responses:
 *       200:
 *         description: Command sent successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Device not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const sendCommandToDevice = async (req, res, next) => {
    try {
        const { deviceKey, command, data = {} } = req.body;

        if (!deviceKey || !command) {
            return error(res, STATUS_CODES.BAD_REQUEST, 'Device key and command are required');
        }

        // Check if device exists and user has access
        const where = { deviceKey };
        if (req.user.role === 'STAFF' || req.user.role === 'USER') {
            where.userId = req.user.id;
        }

        const device = await prisma.device.findFirst({ where });

        if (!device) {
            return error(res, STATUS_CODES.NOT_FOUND, 'Device not found or you do not have permission');
        }

        // Send command via MQTT
        const sent = mqttService.sendCommandToDevice(deviceKey, command, data);

        if (!sent) {
            return error(res, STATUS_CODES.INTERNAL_ERROR, 'Failed to send command - MQTT not connected');
        }

        // Log the command for audit purposes
        logger.info(`Command '${command}' sent to device ${deviceKey} by user ${req.user.id}`);

        return success(res, STATUS_CODES.SUCCESS, 'Command sent successfully', {
            deviceKey,
            command,
            data,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        logger.error(`Error sending command to device: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /mqtt/broadcast:
 *   post:
 *     summary: Broadcast command to all devices via MQTT
 *     tags: [MQTT]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - command
 *             properties:
 *               command:
 *                 type: string
 *                 enum: [system_update, emergency_stop, config_update]
 *               data:
 *                 type: object
 *                 description: Additional command data
 *     responses:
 *       200:
 *         description: Broadcast sent successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 *       500:
 *         description: Server error
 */
const broadcastCommand = async (req, res, next) => {
    try {
        // Only admin can broadcast commands
        if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
            return error(res, STATUS_CODES.FORBIDDEN, 'Only administrators can broadcast commands');
        }

        const { command, data = {} } = req.body;

        if (!command) {
            return error(res, STATUS_CODES.BAD_REQUEST, 'Command is required');
        }

        // Send broadcast via MQTT
        const sent = mqttService.broadcastToAllDevices(command, data);

        if (!sent) {
            return error(res, STATUS_CODES.INTERNAL_ERROR, 'Failed to send broadcast - MQTT not connected');
        }

        // Log the broadcast for audit purposes
        logger.info(`Broadcast command '${command}' sent by admin ${req.user.id}`);

        return success(res, STATUS_CODES.SUCCESS, 'Broadcast sent successfully', {
            command,
            data,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        logger.error(`Error broadcasting command: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /mqtt/device-status:
 *   get:
 *     summary: Get online/offline status of devices
 *     tags: [MQTT]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeThreshold
 *         schema:
 *           type: integer
 *           default: 300
 *         description: Time threshold in seconds to consider device offline
 *     responses:
 *       200:
 *         description: Device status list
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const getDeviceStatus = async (req, res, next) => {
    try {
        const timeThreshold = parseInt(req.query.timeThreshold) || 300; // 5 minutes default
        const thresholdTime = new Date(Date.now() - (timeThreshold * 1000));

        // Build where clause based on user role
        const where = {};
        if (req.user.role === 'STAFF' || req.user.role === 'USER') {
            where.userId = req.user.id;
        }

        const devices = await prisma.device.findMany({
            where,
            select: {
                id: true,
                deviceKey: true,
                status: true,
                updatedAt: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        const deviceStatus = devices.map(device => ({
            deviceKey: device.deviceKey,
            status: device.status,
            lastSeen: device.updatedAt,
            isOnline: device.updatedAt > thresholdTime && device.status,
            user: device.user
        }));

        const summary = {
            total: devices.length,
            online: deviceStatus.filter(d => d.isOnline).length,
            offline: deviceStatus.filter(d => !d.isOnline).length,
            inactive: deviceStatus.filter(d => !d.status).length
        };

        return success(res, STATUS_CODES.SUCCESS, 'Device status retrieved successfully', {
            summary,
            devices: deviceStatus
        });
    } catch (err) {
        logger.error(`Error getting device status: ${err.message}`);
        return next(err);
    }
};

/**
 * @swagger
 * /mqtt/reconnect:
 *   post:
 *     summary: Reconnect MQTT service
 *     tags: [MQTT]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: MQTT reconnection initiated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 *       500:
 *         description: Server error
 */
const reconnectMQTT = async (req, res, next) => {
    try {
        // Only admin can reconnect MQTT
        if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
            return error(res, STATUS_CODES.FORBIDDEN, 'Only administrators can reconnect MQTT');
        }

        // Disconnect and reconnect
        mqttService.disconnect();
        
        setTimeout(async () => {
            try {
                await mqttService.connect();
                logger.info(`MQTT reconnection initiated by admin ${req.user.id}`);
            } catch (error) {
                logger.error(`MQTT reconnection failed: ${error.message}`);
            }
        }, 2000);

        return success(res, STATUS_CODES.SUCCESS, 'MQTT reconnection initiated');
    } catch (err) {
        logger.error(`Error reconnecting MQTT: ${err.message}`);
        return next(err);
    }
};

/**
 * Get MQTT message history/logs
 */
const getMQTTLogs = async (req, res, next) => {
    try {
        const { page = 1, limit = 50, deviceKey, startDate, endDate } = req.query;
        const skip = (page - 1) * limit;

        // Build where clause for user access control
        const where = {};
        if (req.user.role === 'STAFF' || req.user.role === 'USER') {
            where.device = { userId: req.user.id };
        }

        if (deviceKey) {
            where.device = { ...where.device, deviceKey };
        }

        if (startDate || endDate) {
            where.timeStamp = {};
            if (startDate) where.timeStamp.gte = new Date(startDate);
            if (endDate) where.timeStamp.lte = new Date(endDate);
        }

        // Get usage logs as a proxy for MQTT activity
        const total = await prisma.usageLog.count({ where });
        
        const logs = await prisma.usageLog.findMany({
            where,
            include: {
                device: {
                    select: {
                        deviceKey: true,
                        user: {
                            select: {
                                name: true,
                                email: true
                            }
                        }
                    }
                }
            },
            skip,
            take: parseInt(limit),
            orderBy: {
                timeStamp: 'desc'
            }
        });

        return success(res, STATUS_CODES.SUCCESS, 'MQTT logs retrieved successfully', {
            logs,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        logger.error(`Error getting MQTT logs: ${err.message}`);
        return next(err);
    }
};

module.exports = {
    getMQTTStatus,
    sendCommandToDevice,
    broadcastCommand,
    getDeviceStatus,
    reconnectMQTT,
    getMQTTLogs
};