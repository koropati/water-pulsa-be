// prisma/seed.js
const {
    PrismaClient
} = require('@prisma/client');
const bcrypt = require('bcryptjs');
const {
    generateApiKey,
    generateDeviceToken
} = require('../src/utils/helpers');
require('dotenv').config(); // Load environment variables

const prisma = new PrismaClient();

// Constants
const ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    STAFF: 'STAFF',
    USER: 'USER'
};

const TOKEN_STATUS = {
    USED: 'used',
    UNUSED: 'unused'
};

// Get passwords from environment variables or use defaults
const SUPER_ADMIN_PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD || process.env.SEED_DEFAULT_PASSWORD || 'superadmin123';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || process.env.SEED_DEFAULT_PASSWORD || 'admin123';
const STAFF_PASSWORD = process.env.SEED_STAFF_PASSWORD || process.env.SEED_DEFAULT_PASSWORD || 'staff123';

/**
 * Main seed function
 */
async function main() {
    console.log('🌱 Starting database seeding...');
    console.log('📝 Using passwords from environment variables (or defaults if not provided)');

    // Create users with profiles
    const superAdmin = await createUserWithProfile('Super Admin', 'superadmin@example.com', SUPER_ADMIN_PASSWORD, ROLES.SUPER_ADMIN);
    const admin = await createUserWithProfile('Admin User', 'admin@example.com', ADMIN_PASSWORD, ROLES.ADMIN);
    const staff1 = await createUserWithProfile('Staff One', 'staff1@example.com', STAFF_PASSWORD, ROLES.STAFF);
    const staff2 = await createUserWithProfile('Staff Two', 'staff2@example.com', STAFF_PASSWORD, ROLES.STAFF);

    console.log('👤 Created users with profiles');

    // Create devices for users
    const adminDevice1 = await createDevice('ADMIN-DEVICE-001', admin.id, true);
    const adminDevice2 = await createDevice('ADMIN-DEVICE-002', admin.id, true);
    const staff1Device1 = await createDevice('STAFF1-DEVICE-001', staff1.id, true);
    const staff1Device2 = await createDevice('STAFF1-DEVICE-002', staff1.id, false);
    const staff2Device1 = await createDevice('STAFF2-DEVICE-001', staff2.id, true);

    console.log('📱 Created devices');

    // Create API keys for users
    await createApiKey('Admin Main API Key', admin.id, null, true);
    await createApiKey('Admin Secondary API Key', admin.id, getExpiryDate(30), true);
    await createApiKey('Staff1 API Key', staff1.id, null, true);
    await createApiKey('Staff2 API Key', staff2.id, getExpiryDate(60), true);

    console.log('🔑 Created API keys');

    // Create tokens for devices
    const adminDevice1Token1 = await createToken(adminDevice1.id, 50);
    const adminDevice1Token2 = await createToken(adminDevice1.id, 75);
    const staff1Device1Token = await createToken(staff1Device1.id, 100);
    const staff2Device1Token = await createToken(staff2Device1.id, 200);

    console.log('🎟️ Created tokens');

    // Set one token as used
    await useToken(adminDevice1Token1.id, adminDevice1.id);
    console.log('💰 Updated token status and balance');

    // Log usage for devices
    await logUsage(adminDevice1.id, 10);
    await logUsage(adminDevice1.id, 15);
    await logUsage(staff1Device1.id, 25);

    console.log('📊 Created usage logs');

    console.log('✅ Seeding completed successfully!');

    // Print login credentials
    console.log('\n🔐 Login Credentials (from .env or defaults):');
    console.log(`Super Admin: superadmin@example.com / ${SUPER_ADMIN_PASSWORD}`);
    console.log(`Admin: admin@example.com / ${ADMIN_PASSWORD}`);
    console.log(`Staff: staff1@example.com or staff2@example.com / ${STAFF_PASSWORD}`);
}

/**
 * Create a user with profile
 */
async function createUserWithProfile(name, email, password, role) {
    const hashedPassword = await bcrypt.hash(password, 12);

    return prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            role,
            isActive: true,
            profile: {
                create: {
                    phoneNumber: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,
                    address: `${Math.floor(100 + Math.random() * 9000)} Example St, City, Country`
                }
            }
        }
    });
}

/**
 * Create a device
 */
async function createDevice(deviceKey, userId, status) {
    return prisma.device.create({
        data: {
            deviceKey,
            userId,
            status,
            Balance: {
                create: {
                    balance: 0,
                    lastToken: ''
                }
            }
        }
    });
}

/**
 * Create an API key
 */
async function createApiKey(name, userId, expiresAt, status) {
    return prisma.apiKey.create({
        data: {
            name,
            key: generateApiKey ? generateApiKey() : `sk_${Math.random().toString(36).substring(2, 15)}`,
            userId,
            expiresAt,
            status,
            lastUsedAt: null
        }
    });
}

/**
 * Create a token
 */
async function createToken(deviceId, amount) {
    return prisma.token.create({
        data: {
            deviceId,
            token: generateDeviceToken ? generateDeviceToken() : `dt_${Math.random().toString(36).substring(2, 15)}`,
            amount,
            status: TOKEN_STATUS.UNUSED
        }
    });
}

/**
 * Use a token and update balance
 */
async function useToken(tokenId, deviceId) {
    // Update token status
    const token = await prisma.token.update({
        where: {
            id: tokenId
        },
        data: {
            status: TOKEN_STATUS.USED,
            used_at: new Date()
        }
    });

    // Update balance
    return prisma.balance.update({
        where: {
            deviceId
        },
        data: {
            balance: {
                increment: token.amount
            },
            lastToken: token.token
        }
    });
}

/**
 * Log device usage
 */
async function logUsage(deviceId, usageAmount) {
    return prisma.usageLog.create({
        data: {
            deviceId,
            usageAmount,
            timeStamp: new Date()
        }
    });
}

/**
 * Get expiry date from now plus days
 */
function getExpiryDate(daysFromNow) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
}

// Execute seed
main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });