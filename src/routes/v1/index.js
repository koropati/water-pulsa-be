// src/routes/v1/index.js
const express = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const deviceRoutes = require('./devices');
const tokenRoutes = require('./tokens');
const apiKeyRoutes = require('./apiKeys');
const balanceRoutes = require('./balances');
const usageRoutes = require('./usage');
const profileRoutes = require('./profiles');
const deviceIoTRoutes = require('./device');
const userProfileRoutes = require('./userProfile');

const router = express.Router();

// Mount all routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/devices', deviceRoutes);
router.use('/tokens', tokenRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/balances', balanceRoutes);
router.use('/usage', usageRoutes);
router.use('/profiles', profileRoutes);
router.use('/device', deviceIoTRoutes); 
router.use('/user-profile', userProfileRoutes);

module.exports = router;