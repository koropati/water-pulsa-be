// src/config/custom-swagger.js
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');
const express = require('express');

// Custom options for Swagger UI
const swaggerUiOptions = {
    customCss: `
        .topbar-wrapper img { content: url('/api-docs/logo.png'); width: auto; height: 40px; }
        .swagger-ui .topbar { background-color: #002850; }
        .swagger-ui .info { margin: 20px 0; }
        .swagger-ui .info .title { font-size: 32px; }
        .auth-wrapper { display: flex; justify-content: center; margin-bottom: 20px; }
        .auth-container { width: 400px; padding: 20px; border: 1px solid #d9d9d9; border-radius: 4px; margin-bottom: 20px; }
        .auth-header { font-size: 18px; font-weight: bold; margin-bottom: 15px; }
        .auth-form { display: flex; flex-direction: column; }
        .auth-form input { margin-bottom: 10px; padding: 8px; border: 1px solid #d9d9d9; border-radius: 4px; }
        .auth-form button { padding: 8px; background-color: #4990e2; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .auth-result { margin-top: 10px; padding: 10px; border-radius: 4px; }
        .auth-success { background-color: #ebf7ee; color: #287d3c; }
        .auth-error { background-color: #feefef; color: #da1414; }
        .hidden { display: none; }
        .auth-tabs { display: flex; margin-bottom: 15px; }
        .auth-tab { padding: 8px 15px; cursor: pointer; background-color: #f5f5f5; border: 1px solid #ddd; }
        .auth-tab.active { background-color: #4990e2; color: white; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .auth-apikey-container { width: 400px; padding: 20px; border: 1px solid #d9d9d9; border-radius: 4px; margin-bottom: 20px; }
    `,
    customJs: '/api-docs/custom.js',
    customSiteTitle: 'Sipelayar API Documentation',
    swaggerOptions: {
        persistAuthorization: true,
    }
};

// Custom JavaScript for authentication
const customJs = `
(function() {
    window.addEventListener('load', function() {
        // Wait for Swagger UI to load completely
        setTimeout(function() {
            // Create auth container
            const authWrapper = document.createElement('div');
            authWrapper.className = 'auth-wrapper';
            
            // JWT Auth Container
            const jwtContainer = document.createElement('div');
            jwtContainer.className = 'auth-container';
            jwtContainer.innerHTML = \`
                <div class="auth-header">JWT Authentication</div>
                <div class="auth-form">
                    <input type="email" id="auth-email" placeholder="Email" />
                    <input type="password" id="auth-password" placeholder="Password" />
                    <button id="auth-submit">Login</button>
                </div>
                <div id="auth-result" class="auth-result hidden"></div>
            \`;
            
            // API Key Auth Container
            const apiKeyContainer = document.createElement('div');
            apiKeyContainer.className = 'auth-apikey-container';
            apiKeyContainer.innerHTML = \`
                <div class="auth-header">API Key Authentication</div>
                <div class="auth-form">
                    <input type="text" id="api-key-input" placeholder="Enter your API Key" />
                    <button id="api-key-submit">Apply API Key</button>
                </div>
                <div id="api-key-result" class="auth-result hidden"></div>
            \`;
            
            authWrapper.appendChild(jwtContainer);
            authWrapper.appendChild(apiKeyContainer);
            
            // Insert after the info section
            const infoSection = document.querySelector('.swagger-ui .information-container');
            if (infoSection && infoSection.parentNode) {
                infoSection.parentNode.insertBefore(authWrapper, infoSection.nextSibling);
            }
            
            // Add event listener to login button
            document.getElementById('auth-submit').addEventListener('click', function() {
                const email = document.getElementById('auth-email').value;
                const password = document.getElementById('auth-password').value;
                const resultDiv = document.getElementById('auth-result');
                
                if (!email || !password) {
                    resultDiv.textContent = 'Please enter both email and password';
                    resultDiv.className = 'auth-result auth-error';
                    return;
                }
                
                // Call login API
                fetch('/api/v1/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success' && data.data && data.data.token) {
                        // Save token to localStorage
                        localStorage.setItem('bearerToken', data.data.token);
                        
                        // Update Swagger UI auth
                        const authInput = document.querySelector('.swagger-ui .auth-wrapper input[data-component="security-definitions-bearer-BearerAuth-Authorization"]');
                        if (authInput) {
                            authInput.value = 'Bearer ' + data.data.token;
                            
                            // Trigger change event to apply the token
                            const event = new Event('change');
                            authInput.dispatchEvent(event);
                            
                            // Find and click the authorize button
                            const authorizeBtn = Array.from(document.querySelectorAll('.swagger-ui button.btn')).find(btn => btn.textContent.includes('Authorize'));
                            if (authorizeBtn) {
                                authorizeBtn.click();
                                
                                // Find and click the Authorize button in the modal
                                setTimeout(() => {
                                    const modalAuthorizeBtn = document.querySelector('.swagger-ui .auth-btn-wrapper button.btn-primary');
                                    if (modalAuthorizeBtn) {
                                        modalAuthorizeBtn.click();
                                    }
                                }, 500);
                            }
                        }
                        
                        // Show success message
                        resultDiv.textContent = 'Login successful! Token applied to all requests.';
                        resultDiv.className = 'auth-result auth-success';
                    } else {
                        resultDiv.textContent = data.message || 'Login failed. Please check your credentials.';
                        resultDiv.className = 'auth-result auth-error';
                    }
                })
                .catch(error => {
                    console.error('Login error:', error);
                    resultDiv.textContent = 'Login failed. Please try again.';
                    resultDiv.className = 'auth-result auth-error';
                });
            });
            
            // Add event listener to API Key button
            document.getElementById('api-key-submit').addEventListener('click', function() {
                const apiKey = document.getElementById('api-key-input').value;
                const resultDiv = document.getElementById('api-key-result');
                
                if (!apiKey) {
                    resultDiv.textContent = 'Please enter an API key';
                    resultDiv.className = 'auth-result auth-error';
                    return;
                }
                
                // Save API key to localStorage
                localStorage.setItem('apiKey', apiKey);
                
                // Update Swagger UI auth
                const apiKeyInput = document.querySelector('.swagger-ui .auth-wrapper input[data-component="security-definitions-apiKey-ApiKeyAuth-x-api-key"]');
                if (apiKeyInput) {
                    apiKeyInput.value = apiKey;
                    
                    // Trigger change event to apply the API key
                    const event = new Event('change');
                    apiKeyInput.dispatchEvent(event);
                    
                    // Find and click the authorize button
                    const authorizeBtn = Array.from(document.querySelectorAll('.swagger-ui button.btn')).find(btn => btn.textContent.includes('Authorize'));
                    if (authorizeBtn) {
                        authorizeBtn.click();
                        
                        // Find and click the Authorize button in the modal
                        setTimeout(() => {
                            const modalAuthorizeBtn = document.querySelector('.swagger-ui .auth-btn-wrapper button.btn-primary');
                            if (modalAuthorizeBtn) {
                                modalAuthorizeBtn.click();
                            }
                        }, 500);
                    }
                    
                    // Show success message
                    resultDiv.textContent = 'API key applied successfully!';
                    resultDiv.className = 'auth-result auth-success';
                } else {
                    resultDiv.textContent = 'Could not find API key input field';
                    resultDiv.className = 'auth-result auth-error';
                }
            });
            
            // Check if we have a token in localStorage and apply it
            const savedToken = localStorage.getItem('bearerToken');
            if (savedToken) {
                const authInput = document.querySelector('.swagger-ui .auth-wrapper input[data-component="security-definitions-bearer-BearerAuth-Authorization"]');
                if (authInput) {
                    authInput.value = 'Bearer ' + savedToken;
                    
                    // Trigger change event to apply the token
                    const event = new Event('change');
                    authInput.dispatchEvent(event);
                    
                    // Show message that token is applied
                    const resultDiv = document.getElementById('auth-result');
                    resultDiv.textContent = 'Saved token applied automatically';
                    resultDiv.className = 'auth-result auth-success';
                }
            }
            
            // Check if we have an API key in localStorage and apply it
            const savedApiKey = localStorage.getItem('apiKey');
            if (savedApiKey) {
                const apiKeyInput = document.querySelector('.swagger-ui .auth-wrapper input[data-component="security-definitions-apiKey-ApiKeyAuth-x-api-key"]');
                if (apiKeyInput) {
                    apiKeyInput.value = savedApiKey;
                    
                    // Trigger change event to apply the API key
                    const event = new Event('change');
                    apiKeyInput.dispatchEvent(event);
                    
                    // Show message that API key is applied
                    const resultDiv = document.getElementById('api-key-result');
                    resultDiv.textContent = 'Saved API key applied automatically';
                    resultDiv.className = 'auth-result auth-success';
                }
            }
        }, 1000);
    });
})();
`;

// Setup custom Swagger UI with authentication
const setupCustomSwaggerUI = (app, swaggerDocument) => {
    // Serve custom static files for Swagger UI
    const staticDir = path.join(__dirname, '../../public/swagger');

    // Create directory if it doesn't exist
    if (!fs.existsSync(staticDir)) {
        fs.mkdirSync(staticDir, {
            recursive: true
        });
    }

    // Only write the custom JS file if it doesn't exist or content is different
    const customJsPath = path.join(staticDir, 'custom.js');
    if (!fs.existsSync(customJsPath) || fs.readFileSync(customJsPath, 'utf8') !== customJs) {
        fs.writeFileSync(customJsPath, customJs);
    }

    // Serve static files
    app.use('/api-docs', express.static(staticDir));

    // Setup Swagger UI with custom options
    app.use('/api-docs', swaggerUi.serve);
    app.get('/api-docs', swaggerUi.setup(swaggerDocument, swaggerUiOptions));
};

module.exports = {
    setupCustomSwaggerUI
};