// scripts/test-hivemq-quick.js - Quick HiveMQ connection test
require('dotenv').config();
const mqtt = require('mqtt');

console.log('🔍 HiveMQ Connection Test');
console.log('=' .repeat(50));

// Configuration check
console.log('📋 Configuration Check:');
console.log(`   Broker Type: ${process.env.MQTT_BROKER_TYPE || 'not set'}`);
console.log(`   Host: ${process.env.MQTT_HOST || 'not set'}`);
console.log(`   Port: ${process.env.MQTT_PORT || 'not set'}`);
console.log(`   Username: ${process.env.MQTT_USERNAME ? '✓ set' : '✗ not set'}`);
console.log(`   Password: ${process.env.MQTT_PASSWORD ? '✓ set' : '✗ not set'}`);
console.log(`   TLS: ${process.env.MQTT_USE_TLS !== 'false' ? '✓ enabled' : '✗ disabled'}`);
console.log('');

// Validate required settings
const requiredSettings = ['MQTT_HOST', 'MQTT_PORT'];
const missingSettings = requiredSettings.filter(setting => !process.env[setting]);

if (missingSettings.length > 0) {
    console.error('❌ Missing required settings:', missingSettings.join(', '));
    console.log('💡 Please set these in your .env file');
    process.exit(1);
}

// HiveMQ Cloud specific validation
if (process.env.MQTT_BROKER_TYPE === 'hivemq-cloud') {
    if (!process.env.MQTT_USERNAME || !process.env.MQTT_PASSWORD) {
        console.error('❌ HiveMQ Cloud requires username and password');
        process.exit(1);
    }
}

// Build connection options
const useTLS = process.env.MQTT_USE_TLS !== 'false';
const options = {
    host: process.env.MQTT_HOST,
    port: parseInt(process.env.MQTT_PORT) || (useTLS ? 8883 : 1883),
    protocol: useTLS ? 'mqtts' : 'mqtt',
    clientId: `test_client_${Date.now()}`,
    clean: true,
    connectTimeout: 15000,
    keepalive: 60
};

// Add authentication if provided
if (process.env.MQTT_USERNAME && process.env.MQTT_PASSWORD) {
    options.username = process.env.MQTT_USERNAME;
    options.password = process.env.MQTT_PASSWORD;
}

// TLS configuration
if (useTLS) {
    options.rejectUnauthorized = process.env.MQTT_REJECT_UNAUTHORIZED !== 'false';
    
    // Allow self-signed certificates for development
    if (process.env.NODE_ENV === 'development' && process.env.MQTT_ALLOW_SELF_SIGNED === 'true') {
        options.rejectUnauthorized = false;
        console.log('⚠️  WARNING: Self-signed certificates allowed (development mode)');
    }
}

console.log('🚀 Testing connection with options:');
console.log(`   URL: ${options.protocol}://${options.host}:${options.port}`);
console.log(`   Client ID: ${options.clientId}`);
console.log(`   Auth: ${options.username ? 'Yes' : 'No'}`);
console.log(`   TLS: ${useTLS ? 'Yes' : 'No'}`);
console.log(`   Reject Unauthorized: ${options.rejectUnauthorized}`);
console.log('');

// Connection test
console.log('⏳ Connecting to HiveMQ...');

const client = mqtt.connect(options);
let connected = false;

// Success handler
client.on('connect', (connack) => {
    connected = true;
    console.log('✅ Successfully connected to HiveMQ!');
    console.log(`   Session Present: ${connack.sessionPresent}`);
    console.log(`   Return Code: ${connack.returnCode}`);
    console.log('');
    
    // Test basic functionality
    testMQTTFunctionality(client);
});

// Error handler
client.on('error', (error) => {
    console.error('❌ Connection failed:', error.message);
    console.log('');
    
    // Provide specific troubleshooting based on error
    provideTroubleshooting(error.message);
    
    if (!connected) {
        process.exit(1);
    }
});

// Other event handlers
client.on('close', () => {
    if (connected) {
        console.log('👋 Connection closed');
    }
});

client.on('offline', () => {
    console.log('⚠️  Client went offline');
});

client.on('reconnect', () => {
    console.log('🔄 Attempting to reconnect...');
});

// Connection timeout
setTimeout(() => {
    if (!connected) {
        console.error('❌ Connection timeout (15 seconds)');
        console.log('');
        console.log('💡 Troubleshooting tips:');
        console.log('   • Check if HiveMQ broker is running');
        console.log('   • Verify network connectivity');
        console.log('   • Check firewall settings');
        console.log('   • Try increasing MQTT_CONNECT_TIMEOUT');
        client.end(true);
        process.exit(1);
    }
}, 15000);

/**
 * Test basic MQTT functionality
 */
function testMQTTFunctionality(client) {
    const testTopic = 'water-meter/test/connection';
    const testMessage = {
        test: true,
        timestamp: new Date().toISOString(),
        clientId: options.clientId
    };
    
    console.log('🧪 Testing MQTT functionality...');
    
    // Subscribe to test topic
    client.subscribe(testTopic, { qos: 1 }, (err, granted) => {
        if (err) {
            console.error('❌ Subscribe failed:', err.message);
            return cleanup(client);
        }
        
        console.log('✅ Successfully subscribed to test topic');
        console.log(`   Topic: ${granted[0].topic}`);
        console.log(`   QoS: ${granted[0].qos}`);
        
        // Publish test message
        client.publish(testTopic, JSON.stringify(testMessage), { qos: 1 }, (err) => {
            if (err) {
                console.error('❌ Publish failed:', err.message);
                return cleanup(client);
            }
            
            console.log('✅ Test message published successfully');
        });
    });
    
    // Handle incoming messages
    client.on('message', (topic, message) => {
        if (topic === testTopic) {
            try {
                const receivedMessage = JSON.parse(message.toString());
                console.log('✅ Test message received successfully');
                console.log(`   Message: ${message.toString()}`);
                console.log('');
                console.log('🎉 All tests passed! HiveMQ connection is working properly.');
                console.log('');
                console.log('📝 Next steps:');
                console.log('   • Start your application: npm run dev');
                console.log('   • Check MQTT status: GET /mqtt-status');
                console.log('   • Monitor logs for device connections');
                
                setTimeout(() => cleanup(client), 1000);
            } catch (error) {
                console.error('❌ Failed to parse received message:', error.message);
                cleanup(client);
            }
        }
    });
}

/**
 * Provide troubleshooting based on error message
 */
function provideTroubleshooting(errorMessage) {
    const error = errorMessage.toLowerCase();
    
    console.log('🔧 Troubleshooting suggestions:');
    
    if (error.includes('econnrefused')) {
        console.log('   • Check if HiveMQ broker is running');
        console.log('   • Verify MQTT_HOST and MQTT_PORT are correct');
        console.log('   • For HiveMQ Cloud: ensure your cluster is active');
        console.log('   • Test connectivity: telnet ' + options.host + ' ' + options.port);
    } else if (error.includes('enotfound') || error.includes('getaddrinfo')) {
        console.log('   • DNS resolution failed - check MQTT_HOST');
        console.log('   • For HiveMQ Cloud: use format like "xxx.s1.eu.hivemq.cloud"');
        console.log('   • Check your internet connection');
    } else if (error.includes('certificate') || error.includes('tls')) {
        console.log('   • TLS certificate error detected');
        console.log('   • For development: try MQTT_ALLOW_SELF_SIGNED=true');
        console.log('   • For HiveMQ Cloud: ensure MQTT_USE_TLS=true');
        console.log('   • Check if certificates are valid and not expired');
    } else if (error.includes('unauthorized') || error.includes('authentication')) {
        console.log('   • Authentication failed - check username/password');
        console.log('   • For HiveMQ Cloud: verify credentials in dashboard');
        console.log('   • Ensure user has proper permissions');
    } else if (error.includes('timeout')) {
        console.log('   • Network connectivity issues');
        console.log('   • Check firewall settings (allow port ' + options.port + ')');
        console.log('   • Try increasing MQTT_CONNECT_TIMEOUT');
    } else {
        console.log('   • Enable debug mode: DEBUG=mqtt* node ' + process.argv[1]);
        console.log('   • Check HiveMQ broker logs if self-hosted');
        console.log('   • Try with a different MQTT client for comparison');
    }
    
    console.log('');
    console.log('📚 More help:');
    console.log('   • HiveMQ Documentation: https://docs.hivemq.com/');
    console.log('   • MQTT Troubleshooting Guide in your project docs');
}

/**
 * Clean up and exit
 */
function cleanup(client) {
    if (client && client.connected) {
        client.end();
    }
    process.exit(0);
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n👋 Test interrupted by user');
    cleanup(client);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Test terminated');
    cleanup(client);
});