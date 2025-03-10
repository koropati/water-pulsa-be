// src/utils/authorization.js
const {
    ROLES
} = require('../config/constants');
const {
    ApiError
} = require('../middleware/error');
const {
    STATUS_CODES
} = require('../config/constants');

/**
 * Checks if user is an admin (ADMIN or SUPER_ADMIN)
 * @param {String} userRole - User role
 * @returns {Boolean} True if user is an admin
 */
const isAdmin = (userRole) => {
    return userRole === ROLES.ADMIN || userRole === ROLES.SUPER_ADMIN;
};

/**
 * Builds a where clause that enforces ownership for non-admin users
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @param {Object} baseWhereClause - Base where clause to extend
 * @param {String} ownershipPath - Path to the user ID in the model (e.g., 'userId' or 'device.userId')
 * @returns {Object} Where clause with ownership check if applicable
 */
const buildOwnershipFilter = (userId, userRole, baseWhereClause = {}, ownershipPath = 'userId') => {
    const where = {
        ...baseWhereClause
    };

    if (!isAdmin(userRole)) {
        // Handle nested paths like 'device.userId'
        const paths = ownershipPath.split('.');
        if (paths.length === 1) {
            // Direct ownership
            where[ownershipPath] = userId;
        } else {
            // Nested ownership (e.g., device.userId)
            let current = where;
            for (let i = 0; i < paths.length - 1; i++) {
                const path = paths[i];
                current[path] = current[path] || {};
                current = current[path];
            }
            current[paths[paths.length - 1]] = userId;
        }
    }

    return where;
};

/**
 * Verifies ownership of a resource
 * @param {Object} resource - Resource to check ownership of
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @param {Function} getOwnerId - Function to get owner ID from resource
 * @returns {Boolean} True if user is owner or admin
 */
const verifyOwnership = (resource, userId, userRole, getOwnerId) => {
    if (!resource) return false;
    if (isAdmin(userRole)) return true;

    const ownerId = typeof getOwnerId === 'function' ?
        getOwnerId(resource) :
        resource.userId;

    return ownerId === userId;
};

/**
 * Enforces ownership check - throws error if check fails
 * @param {Object} resource - Resource to check ownership of
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @param {Function} getOwnerId - Function to get owner ID from resource
 * @param {String} resourceName - Name of the resource (for error message)
 * @throws {ApiError} If ownership check fails
 */
const enforceOwnership = (resource, userId, userRole, getOwnerId, resourceName = 'Resource') => {
    if (!verifyOwnership(resource, userId, userRole, getOwnerId)) {
        throw new ApiError(
            `${resourceName} not found or you do not have permission`,
            STATUS_CODES.NOT_FOUND
        );
    }
};

module.exports = {
    isAdmin,
    buildOwnershipFilter,
    verifyOwnership,
    enforceOwnership
};