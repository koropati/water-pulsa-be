// src/config/constants.js

// User roles
const ROLES = {
    ADMIN: 'ADMIN',
    STAFF: 'STAFF',
    USER: 'USER'
};

// Role-based permission
const ROLE_PERMISSIONS = {
    // Admin can do everything
    [ROLES.ADMIN]: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],

    // Staff can read and write, but not delete
    [ROLES.STAFF]: ['GET', 'POST', 'PUT', 'PATCH'],

    // Regular users can only read
    [ROLES.USER]: ['GET']
};

// Token statuses
const TOKEN_STATUS = {
    USED: 'used',
    UNUSED: 'unused'
};

// API response status codes
const STATUS_CODES = {
    SUCCESS: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_ERROR: 500
};

// Pagination defaults
const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10
};

module.exports = {
    ROLES,
    ROLE_PERMISSIONS,
    TOKEN_STATUS,
    STATUS_CODES,
    PAGINATION
};