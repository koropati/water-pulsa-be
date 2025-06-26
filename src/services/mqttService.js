// src/services/mqttService.js - Updated for HiveMQ with TLS support
const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');
const prisma = require('../utils/prisma');
const { STATUS_CODES } = require('../config/constants');

class MQTTService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.subscribers = new Map();
        this.messageHandlers = new Map();
        this.retryCount = 0;
        this.maxRetries = 5;
        this.retryInterval = 5000; // 5 seconds
    }

    /**
     * Initialize MQTT connection with HiveMQ support
     */
    async connect() {
        try {
            const options = this.buildConnectionOptions();
            
            logger.info(`MQTT: Attempting to connect to ${options.host}:${options.port} with TLS: ${!!options.protocol?.includes('s')}`);
            
            this.client = mqtt.connect(options);

            // Connection event handlers
            this.client.on('connect', () => {
                this.isConnected = true;
                this.retryCount = 0;
                logger.info('MQTT: Connected to HiveMQ broker successfully');
                
                // Publish backend online status
                this.publish('water-meter/backend/status', {
                    status: 'online',
                    timestamp: new Date().toISOString(),
                    broker: 'HiveMQ'
                }, { qos: 1, retain: true });

                // Subscribe to device topics
                this.subscribeToDeviceTopics();
            });

            this.client.on('error', (error) => {
                logger.error(`MQTT: Connection error - ${error.message}`);
                this.isConnected = false;
                this.handleConnectionError(error);
            });

            this.client.on('close', () => {
                this.isConnected = false;
                logger.warn('MQTT: Connection closed');
                this.handleReconnection();
            });

            this.client.on('offline', () => {
                this.isConnected = false;
                logger.warn('MQTT: Client offline');
            });

            this.client.on('reconnect', () => {
                logger.info('MQTT: Attempting to reconnect...');
            });

            this.client.on('message', (topic, message) => {
                this.handleMessage(topic, message);
            });

            return this.client;
        } catch (error) {
            logger.error(`MQTT: Failed to connect - ${error.message}`);
            throw error;
        }
    }

    /**
     * Build connection options for different MQTT brokers
     */
    buildConnectionOptions() {
        const brokerType = process.env.MQTT_BROKER_TYPE || 'hivemq'; // hivemq, mosquitto, emqx
        
        const baseOptions = {
            clientId: process.env.MQTT_CLIENT_ID || `water_meter_backend_${Date.now()}`,
            clean: process.env.MQTT_CLEAN_SESSION !== 'false',
            connectTimeout: parseInt(process.env.MQTT_CONNECT_TIMEOUT) || 30000,
            reconnectPeriod: parseInt(process.env.MQTT_RECONNECT_PERIOD) || 5000,
            keepalive: parseInt(process.env.MQTT_KEEP_ALIVE) || 60,
            will: {
                topic: 'water-meter/backend/status',
                payload: JSON.stringify({ 
                    status: 'offline', 
                    timestamp: new Date().toISOString() 
                }),
                qos: 1,
                retain: true
            }
        };

        // Configure based on broker type
        switch (brokerType.toLowerCase()) {
            case 'hivemq':
                return this.buildHiveMQOptions(baseOptions);
            case 'hivemq-cloud':
                return this.buildHiveMQCloudOptions(baseOptions);
            case 'mosquitto':
                return this.buildMosquittoOptions(baseOptions);
            case 'emqx':
                return this.buildEMQXOptions(baseOptions);
            default:
                return this.buildHiveMQOptions(baseOptions); // Default to HiveMQ
        }
    }

    /**
     * Build HiveMQ connection options (local/self-hosted)
     */
    buildHiveMQOptions(baseOptions) {
        const useTLS = process.env.MQTT_USE_TLS !== 'false'; // Default to true for HiveMQ
        
        const options = {
            ...baseOptions,
            host: process.env.MQTT_HOST || 'localhost',
            port: parseInt(process.env.MQTT_PORT) || (useTLS ? 8883 : 1883),
            protocol: useTLS ? 'mqtts' : 'mqtt'
        };

        // Add authentication if provided
        if (process.env.MQTT_USERNAME && process.env.MQTT_PASSWORD) {
            options.username = process.env.MQTT_USERNAME;
            options.password = process.env.MQTT_PASSWORD;
        }

        // TLS Configuration for HiveMQ
        if (useTLS) {
            options.rejectUnauthorized = process.env.MQTT_REJECT_UNAUTHORIZED !== 'false';
            
            // Load certificates if provided
            if (process.env.MQTT_CA_CERT_PATH) {
                try {
                    options.ca = fs.readFileSync(process.env.MQTT_CA_CERT_PATH);
                    logger.info('MQTT: Loaded CA certificate');
                } catch (error) {
                    logger.warn(`MQTT: Failed to load CA certificate: ${error.message}`);
                }
            }

            if (process.env.MQTT_CLIENT_CERT_PATH && process.env.MQTT_CLIENT_KEY_PATH) {
                try {
                    options.cert = fs.readFileSync(process.env.MQTT_CLIENT_CERT_PATH);
                    options.key = fs.readFileSync(process.env.MQTT_CLIENT_KEY_PATH);
                    logger.info('MQTT: Loaded client certificate and key');
                } catch (error) {
                    logger.warn(`MQTT: Failed to load client certificate: ${error.message}`);
                }
            }

            // For self-signed certificates (development only)
            if (process.env.NODE_ENV === 'development' && process.env.MQTT_ALLOW_SELF_SIGNED === 'true') {
                options.rejectUnauthorized = false;
                logger.warn('MQTT: WARNING - Self-signed certificates allowed (development mode)');
            }
        }

        return options;
    }

    /**
     * Build HiveMQ Cloud connection options
     */
    buildHiveMQCloudOptions(baseOptions) {
        const options = {
            ...baseOptions,
            host: process.env.MQTT_HOST, // e.g., 'xxxxxxx.s1.eu.hivemq.cloud'
            port: parseInt(process.env.MQTT_PORT) || 8883,
            protocol: 'mqtts',
            username: process.env.MQTT_USERNAME, // Required for HiveMQ Cloud
            password: process.env.MQTT_PASSWORD, // Required for HiveMQ Cloud
            rejectUnauthorized: true // Always true for HiveMQ Cloud
        };

        if (!options.username || !options.password) {
            throw new Error('MQTT_USERNAME and MQTT_PASSWORD are required for HiveMQ Cloud');
        }

        return options;
    }

    /**
     * Build Mosquitto connection options
     */
    buildMosquittoOptions(baseOptions) {
        const useTLS = process.env.MQTT_USE_TLS === 'true';
        
        return {
            ...baseOptions,
            host: process.env.MQTT_HOST || 'localhost',
            port: parseInt(process.env.MQTT_PORT) || (useTLS ? 8883 : 1883),
            protocol: useTLS ? 'mqtts' : 'mqtt',
            username: process.env.MQTT_USERNAME || '',
            password: process.env.MQTT_PASSWORD || '',
            rejectUnauthorized: process.env.MQTT_REJECT_UNAUTHORIZED !== 'false'
        };
    }

    /**
     * Build EMQX connection options
     */
    buildEMQXOptions(baseOptions) {
        const useTLS = process.env.MQTT_USE_TLS === 'true';
        
        return {
            ...baseOptions,
            host: process.env.MQTT_HOST || 'localhost',
            port: parseInt(process.env.MQTT_PORT) || (useTLS ? 8883 : 1883),
            protocol: useTLS ? 'mqtts' : 'mqtt',
            username: process.env.MQTT_USERNAME || '',
            password: process.env.MQTT_PASSWORD || '',
            rejectUnauthorized: process.env.MQTT_REJECT_UNAUTHORIZED !== 'false'
        };
    }

    /**
     * Handle connection errors with specific troubleshooting
     */
    handleConnectionError(error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('enotfound') || errorMessage.includes('getaddrinfo')) {
            logger.error('MQTT: DNS resolution failed. Check MQTT_HOST configuration.');
        } else if (errorMessage.includes('econnrefused')) {
            logger.error('MQTT: Connection refused. Check if MQTT broker is running and port is correct.');
        } else if (errorMessage.includes('certificate') || errorMessage.includes('tls')) {
            logger.error('MQTT: TLS/Certificate error. Check certificate configuration or try without TLS for testing.');
        } else if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
            logger.error('MQTT: Authentication failed. Check username/password configuration.');
        } else if (errorMessage.includes('timeout')) {
            logger.error('MQTT: Connection timeout. Check network connectivity and firewall settings.');
        } else {
            logger.error(`MQTT: Unknown connection error: ${error.message}`);
        }

        // Provide troubleshooting suggestions
        this.logTroubleshootingTips();
    }

    /**
     * Log troubleshooting tips
     */
    logTroubleshootingTips() {
        logger.info('MQTT Troubleshooting Tips:');
        logger.info('1. Check if MQTT broker is running and accessible');
        logger.info('2. Verify MQTT_HOST and MQTT_PORT in environment variables');
        logger.info('3. For HiveMQ: Ensure TLS is enabled (port 8883) and credentials are correct');
        logger.info('4. For HiveMQ Cloud: Username/password are required');
        logger.info('5. Check firewall settings and network connectivity');
        logger.info('6. For development: Try setting MQTT_ALLOW_SELF_SIGNED=true');
    }

    /**
     * Test connection without full initialization
     */
    async testConnection() {
        return new Promise((resolve, reject) => {
            const options = this.buildConnectionOptions();
            const testClient = mqtt.connect(options);
            
            const timeout = setTimeout(() => {
                testClient.end(true);
                reject(new Error('Connection test timeout'));
            }, 10000);

            testClient.on('connect', () => {
                clearTimeout(timeout);
                testClient.end();
                resolve({
                    success: true,
                    message: 'Connection test successful',
                    broker: options.host,
                    port: options.port,
                    tls: options.protocol?.includes('s')
                });
            });

            testClient.on('error', (error) => {
                clearTimeout(timeout);
                testClient.end(true);
                reject({
                    success: false,
                    error: error.message,
                    broker: options.host,
                    port: options.port,
                    tls: options.protocol?.includes('s')
                });
            });
        });
    }

    // ... (rest of the methods remain the same as in the original implementation)
    // Keep all the existing methods like subscribeToDeviceTopics, handleMessage, etc.
    
    /**
     * Subscribe to device communication topics
     */
    subscribeToDeviceTopics() {
        const topics = [
            'water-meter/+/auth/request',
            'water-meter/+/balance/check/request',
            'water-meter/+/usage/log/request',
            'water-meter/+/token/validate/request',
            'water-meter/+/heartbeat'
        ];

        topics.forEach(topic => {
            this.subscribe(topic);
        });
    }

    /**
     * Subscribe to a topic
     */
    subscribe(topic, options = { qos: 1 }) {
        if (!this.isConnected) {
            logger.warn(`MQTT: Cannot subscribe to ${topic} - not connected`);
            return;
        }

        this.client.subscribe(topic, options, (error) => {
            if (error) {
                logger.error(`MQTT: Failed to subscribe to ${topic} - ${error.message}`);
            } else {
                logger.info(`MQTT: Subscribed to ${topic}`);
                this.subscribers.set(topic, options);
            }
        });
    }

    /**
     * Publish a message
     */
    publish(topic, payload, options = { qos: 1, retain: false }) {
        if (!this.isConnected) {
            logger.warn(`MQTT: Cannot publish to ${topic} - not connected`);
            return false;
        }

        const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
        
        this.client.publish(topic, message, options, (error) => {
            if (error) {
                logger.error(`MQTT: Failed to publish to ${topic} - ${error.message}`);
            } else {
                logger.debug(`MQTT: Published to ${topic}`);
            }
        });

        return true;
    }

    /**
     * Handle incoming MQTT messages
     */
    async handleMessage(topic, message) {
        try {
            const payload = JSON.parse(message.toString());
            logger.debug(`MQTT: Received message on ${topic}:`, payload);

            // Extract device key from topic
            const topicParts = topic.split('/');
            const deviceKey = topicParts[1];
            const action = topicParts[2];
            const subAction = topicParts[3];

            // Route message to appropriate handler
            if (action === 'auth' && subAction === 'request') {
                await this.handleDeviceAuth(deviceKey, payload);
            } else if (action === 'balance' && subAction === 'check' && topicParts[4] === 'request') {
                await this.handleBalanceCheck(deviceKey, payload);
            } else if (action === 'usage' && subAction === 'log' && topicParts[4] === 'request') {
                await this.handleUsageLog(deviceKey, payload);
            } else if (action === 'token' && subAction === 'validate' && topicParts[4] === 'request') {
                await this.handleTokenValidation(deviceKey, payload);
            } else if (action === 'heartbeat') {
                await this.handleHeartbeat(deviceKey, payload);
            }

        } catch (error) {
            logger.error(`MQTT: Error handling message on ${topic} - ${error.message}`);
        }
    }

    /**
     * Handle device authentication
     */
    async handleDeviceAuth(deviceKey, payload) {
        try {
            const device = await prisma.device.findFirst({
                where: {
                    deviceKey,
                    status: true
                }
            });

            const responseTopic = `water-meter/${deviceKey}/auth/response`;
            
            if (!device) {
                this.publish(responseTopic, {
                    success: false,
                    error: 'Device not found or inactive',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Update last seen
            await prisma.device.update({
                where: { id: device.id },
                data: { updatedAt: new Date() }
            });

            this.publish(responseTopic, {
                success: true,
                data: {
                    valid: true,
                    deviceId: device.id,
                    status: device.status
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error(`MQTT: Device auth error for ${deviceKey} - ${error.message}`);
            this.publish(`water-meter/${deviceKey}/auth/response`, {
                success: false,
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        }
    }

    // Add all other handler methods from the original implementation...
    // (handleBalanceCheck, handleUsageLog, handleTokenValidation, handleHeartbeat, etc.)

    /**
     * Handle reconnection logic
     */
    handleReconnection() {
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            logger.info(`MQTT: Attempting to reconnect... (${this.retryCount}/${this.maxRetries})`);
            
            setTimeout(() => {
                if (!this.isConnected) {
                    this.connect().catch((error) => {
                        logger.error(`MQTT: Reconnection failed - ${error.message}`);
                    });
                }
            }, this.retryInterval);
        } else {
            logger.error('MQTT: Max reconnection attempts reached');
        }
    }

    /**
     * Get connection status with detailed info
     */
    getStatus() {
        return {
            connected: this.isConnected,
            subscribers: Array.from(this.subscribers.keys()),
            retryCount: this.retryCount,
            brokerType: process.env.MQTT_BROKER_TYPE || 'hivemq',
            host: process.env.MQTT_HOST,
            port: process.env.MQTT_PORT,
            tls: process.env.MQTT_USE_TLS !== 'false'
        };
    }

    /**
     * Disconnect from MQTT broker
     */
    disconnect() {
        if (this.client && this.isConnected) {
            // Publish offline status
            this.publish('water-meter/backend/status', {
                status: 'offline',
                timestamp: new Date().toISOString()
            }, { qos: 1, retain: true });

            this.client.end();
            this.isConnected = false;
            logger.info('MQTT: Disconnected from broker');
        }
    }
}

// Create singleton instance
const mqttService = new MQTTService();

module.exports = mqttService;