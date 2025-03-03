// src/controllers/deviceIoTController.js
const prisma = require('../utils/prisma');
const {
    success,
    error
} = require('../utils/response');
const {
    STATUS_CODES
} = require('../config/constants');
const {
    logger
} = require('../utils/logger');

/**
 * Authenticate a device by device key
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateDevice = async (req, res, next) => {
    try {
        const {
            deviceKey
        } = req.body;

        if (!deviceKey) {
            return error(res, STATUS_CODES.BAD_REQUEST, 'Device key is required');
        }

        // Find device by key
        const device = await prisma.device.findFirst({
            where: {
                deviceKey,
                status: true
            }
        });

        if (!device) {
            return error(res, STATUS_CODES.NOT_FOUND, 'Device not found or inactive');
        }

        return success(res, STATUS_CODES.SUCCESS, 'Device authenticated successfully', {
            valid: true,
            deviceId: device.id,
            status: device.status
        });
    } catch (err) {
        logger.error(`Device authentication error: ${err.message}`);
        return next(err);
    }
};

/**
 * Check device balance
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const checkDeviceBalance = async (req, res, next) => {
    try {
        const {
            deviceKey
        } = req.body;

        if (!deviceKey) {
            return error(res, STATUS_CODES.BAD_REQUEST, 'Device key is required');
        }

        // Get device and balance
        const device = await prisma.device.findFirst({
            where: {
                deviceKey
            },
            include: {
                Balance: true
            }
        });

        if (!device) {
            return error(res, STATUS_CODES.NOT_FOUND, 'Device not found');
        }

        if (!device.status) {
            return error(res, STATUS_CODES.FORBIDDEN, 'Device is inactive');
        }

        if (!device.Balance) {
            return success(res, STATUS_CODES.SUCCESS, 'Balance retrieved successfully', {
                valid: true,
                balance: 0,
                lastToken: ''
            });
        }

        return success(res, STATUS_CODES.SUCCESS, 'Balance retrieved successfully', {
            valid: true,
            balance: device.Balance.balance,
            lastToken: device.Balance.lastToken
        });
    } catch (err) {
        logger.error(`Check device balance error: ${err.message}`);
        return next(err);
    }
};

/**
 * Log device usage
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const logDeviceUsage = async (req, res, next) => {
    try {
        const {
            deviceKey,
            usageAmount
        } = req.body;

        if (!deviceKey) {
            return error(res, STATUS_CODES.BAD_REQUEST, 'Device key is required');
        }

        // Get device
        const device = await prisma.device.findFirst({
            where: {
                deviceKey
            },
            include: {
                Balance: true
            }
        });

        if (!device) {
            return error(res, STATUS_CODES.NOT_FOUND, 'Device not found');
        }

        if (!device.status) {
            return error(res, STATUS_CODES.FORBIDDEN, 'Device is inactive');
        }

        // Validate usage amount
        if (typeof usageAmount !== 'number' || usageAmount <= 0) {
            return error(res, STATUS_CODES.BAD_REQUEST, 'Invalid usage amount');
        }

        // Log the usage
        await prisma.usageLog.create({
            data: {
                deviceId: device.id,
                usageAmount,
                timeStamp: new Date()
            }
        });

        // Update balance if exists
        if (device.Balance) {
            const newBalance = Math.max(0, device.Balance.balance - usageAmount);

            await prisma.balance.update({
                where: {
                    deviceId: device.id
                },
                data: {
                    balance: newBalance
                }
            });

            return success(res, STATUS_CODES.SUCCESS, 'Usage logged successfully', {
                valid: true,
                remainingBalance: newBalance,
                canUse: newBalance > 0
            });
        }

        return success(res, STATUS_CODES.SUCCESS, 'Usage logged successfully', {
            valid: true,
            remainingBalance: 0,
            canUse: false
        });
    } catch (err) {
        logger.error(`Log device usage error: ${err.message}`);
        return next(err);
    }
};

/**
 * Validate a device token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateDeviceToken = async (req, res, next) => {
    try {
        const {
            deviceKey,
            token
        } = req.body;

        if (!deviceKey || !token) {
            return error(res, STATUS_CODES.BAD_REQUEST, 'Device key and token are required');
        }

        // Get device
        const device = await prisma.device.findFirst({
            where: {
                deviceKey
            },
            include: {
                Balance: true
            }
        });

        if (!device) {
            return error(res, STATUS_CODES.NOT_FOUND, 'Device not found');
        }

        if (!device.status) {
            return error(res, STATUS_CODES.FORBIDDEN, 'Device is inactive');
        }

        // Check if token exists and is unused
        const tokenRecord = await prisma.token.findFirst({
            where: {
                token,
                status: 'unused'
            }
        });

        if (!tokenRecord) {
            return error(res, STATUS_CODES.BAD_REQUEST, 'Invalid or already used token');
        }

        // Check if token is for this device
        if (tokenRecord.deviceId !== device.id) {
            return error(res, STATUS_CODES.BAD_REQUEST, 'Token does not belong to this device');
        }

        // Mark token as used
        await prisma.token.update({
            where: {
                id: tokenRecord.id
            },
            data: {
                status: 'used',
                used_at: new Date()
            }
        });

        // Update balance
        const currentBalance = device.Balance ?.balance || 0;
        const newBalance = currentBalance + tokenRecord.amount;

        if (device.Balance) {
            await prisma.balance.update({
                where: {
                    deviceId: device.id
                },
                data: {
                    balance: newBalance,
                    lastToken: token
                }
            });
        } else {
            await prisma.balance.create({
                data: {
                    deviceId: device.id,
                    balance: tokenRecord.amount,
                    lastToken: token
                }
            });
        }

        return success(res, STATUS_CODES.SUCCESS, 'Token validated successfully', {
            valid: true,
            balance: newBalance,
            amount: tokenRecord.amount
        });
    } catch (err) {
        logger.error(`Token validation error: ${err.message}`);
        return next(err);
    }
};

module.exports = {
    authenticateDevice,
    checkDeviceBalance,
    logDeviceUsage,
    validateDeviceToken
};