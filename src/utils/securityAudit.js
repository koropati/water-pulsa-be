// src/utils/securityAudit.js
const prisma = require('./prisma');
const { logger } = require('./logger');

/**
 * Security event types
 */
const SECURITY_EVENT = {
    AUTH_SUCCESS: 'auth_success',
    AUTH_FAILURE: 'auth_failure',
    ACCESS_DENIED: 'access_denied',
    RESOURCE_ACCESS: 'resource_access',
    RESOURCE_MODIFICATION: 'resource_modification',
    ADMIN_ACTION: 'admin_action',
    API_KEY_USAGE: 'api_key_usage',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity'
};

/**
 * Log a security event
 * @param {Object} event - Security event details
 * @param {String} event.type - Event type (from SECURITY_EVENT)
 * @param {String} event.userId - User ID (if applicable)
 * @param {String} event.resourceType - Resource type (e.g., 'device', 'token')
 * @param {String} event.resourceId - Resource ID (if applicable)
 * @param {String} event.action - Action performed (e.g., 'read', 'update', 'delete')
 * @param {String} event.ipAddress - IP address (if available)
 * @param {Object} event.metadata - Additional metadata
 * @returns {Promise} Promise that resolves with the created audit log
 */
const logSecurityEvent = async (event) => {
    try {
        // You would need to create this table in your Prisma schema
        // This is just a demonstration of what you might want to track
        /*
        const auditLog = await prisma.securityAuditLog.create({
            data: {
                eventType: event.type,
                userId: event.userId,
                resourceType: event.resourceType,
                resourceId: event.resourceId,
                action: event.action,
                ipAddress: event.ipAddress,
                userAgent: event.metadata?.userAgent,
                metadata: event.metadata || {},
                timestamp: new Date()
            }
        });
        */
        
        // For now, just log to the logger
        logger.info(`SECURITY_EVENT: ${JSON.stringify(event)}`);
        
        // Return a mock audit log for now
        return {
            id: 'mock-audit-log-id',
            eventType: event.type,
            timestamp: new Date()
        };
    } catch (error) {
        logger.error(`Error logging security event: ${error.message}`);
        // Don't throw, just log the error
        return null;
    }
};

/**
 * Create a middleware that logs resource access
 * @param {String} resourceType - Type of resource being accessed
 * @returns {Function} Express middleware
 */
const auditResourceAccess = (resourceType) => {
    return (req, res, next) => {
        // Store the original end method
        const originalEnd = res.end;
        
        // Override the end method
        res.end = function(...args) {
            // Only log successful requests
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const resourceId = req.params.id;
                
                logSecurityEvent({
                    type: SECURITY_EVENT.RESOURCE_ACCESS,
                    userId: req.user?.id,
                    resourceType,
                    resourceId,
                    action: req.method.toLowerCase(),
                    ipAddress: req.ip,
                    metadata: {
                        userAgent: req.headers['user-agent'],
                        endpoint: req.originalUrl
                    }
                }).catch(err => {
                    logger.error(`Error in auditResourceAccess: ${err.message}`);
                });
            }
            
            // Call the original end method
            return originalEnd.apply(this, args);
        };
        
        next();
    };
};

/**
 * Create a middleware that logs resource modifications
 * @param {String} resourceType - Type of resource being modified
 * @returns {Function} Express middleware
 */
const auditResourceModification = (resourceType) => {
    return (req, res, next) => {
        // Only audit modification methods
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            return next();
        }
        
        // Store the original end method
        const originalEnd = res.end;
        
        // Override the end method
        res.end = function(...args) {
            // Only log successful requests
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const resourceId = req.params.id;
                
                logSecurityEvent({
                    type: SECURITY_EVENT.RESOURCE_MODIFICATION,
                    userId: req.user?.id,
                    resourceType,
                    resourceId,
                    action: req.method.toLowerCase(),
                    ipAddress: req.ip,
                    metadata: {
                        userAgent: req.headers['user-agent'],
                        endpoint: req.originalUrl,
                        requestBody: req.body
                    }
                }).catch(err => {
                    logger.error(`Error in auditResourceModification: ${err.message}`);
                });
            }
            
            // Call the original end method
            return originalEnd.apply(this, args);
        };
        
        next();
    };
};

module.exports = {
    SECURITY_EVENT,
    logSecurityEvent,
    auditResourceAccess,
    auditResourceModification
};