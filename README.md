# Sipelayar API - Backend Service

A robust REST API backend for managing IoT water pulse devices, users, authentication, and API keys. Built with Node.js, Express, and Prisma ORM.

## 📋 Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Server](#running-the-server)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Available Endpoints](#available-endpoints)
- [Authentication](#authentication)
- [Available Scripts](#available-scripts)
- [Deployment](#deployment)
- [License](#license)

## ✨ Features

- **User Management**: Registration, authentication, role-based permissions
- **Device Management**: Track IoT devices, statuses, and balances
- **Token System**: Token generation and usage tracking
- **API Key Management**: Creation and validation of API keys
- **Usage Logs**: Track device usage and consumption
- **Profile Management**: User profiles with avatar upload
- **Role-Based Access Control**: Different permission levels (SUPER_ADMIN, ADMIN, STAFF)
- **Swagger Documentation**: Auto-generated API documentation

## 🔧 Prerequisites

- Node.js (v14+ recommended)
- npm or yarn
- MySQL Database
- Git

## 🚀 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/water-pulsa-be.git
cd water-pulsa-be
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Setup the initial directories:
```bash
npm run setup
```

## ⚙️ Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URL="mysql://username:password@localhost:3306/database_name"

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# API Key Configuration
API_KEY_PREFIX=sk_

# File Upload Configuration
UPLOAD_DIR=uploads
MAX_FILE_SIZE=2000000 # 2MB

# Cors Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173

# Log Configuration
LOG_LEVEL=debug

# Rate Limiter
RATE_LIMIT_WINDOW_MS=900000 # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

Adjust the values according to your environment.

## 💾 Database Setup

1. Generate Prisma client:
```bash
npx prisma generate
```

2. Run database migrations:
```bash
npx prisma migrate dev
```

3. (Optional) Seed the database:
```bash
npm run prisma:seed
```

4. (Optional) View the database with Prisma Studio:
```bash
npm run prisma:studio
```

## How to Run the Database Seeder

The database seeder will create the following data:

### Users & Profiles
- Super Admin user with full access permissions
- Admin user with admin-level access
- Two Staff users with standard permissions

### Devices
- Multiple devices associated with the Admin and Staff users
- Each device has a unique deviceKey
- Some devices are active, others are inactive

### API Keys
- API keys for Admin and Staff users
- Some with expiration dates, others without
- All initially set to active status

### Tokens
- Multiple tokens associated with different devices
- One token is set as "used" to demonstrate the token usage flow
- Other tokens remain in "unused" status

### Balance
- Each device has a corresponding balance record
- The used token has updated the balance of its associated device

### Usage Logs
- Sample usage logs for different devices
- Different timestamps and usage amounts

## Password Configuration

You can configure the passwords used for seeded users in your `.env` file. You have two options:

### Option 1: Set a single password for all users
```
SEED_DEFAULT_PASSWORD=your_secure_password
```

### Option 2: Set individual passwords for each user type
```
SEED_SUPER_ADMIN_PASSWORD=super_admin_password
SEED_ADMIN_PASSWORD=admin_password
SEED_STAFF_PASSWORD=staff_password
```

The individual passwords will override the default password if both are set. If no passwords are specified in the `.env` file, the seeder will use hardcoded defaults:
- `superadmin123` for Super Admin
- `admin123` for Admin
- `staff123` for Staff users

## Running the Seeder

1. Make sure your database connection is properly configured in the `.env` file
2. (Optional) Set the desired passwords in the `.env` file
3. Run the seed script with:

```bash
npm run prisma:seed
```

4. After seeding completes, the script will output the login credentials that were used

## Default Credentials (if not configured in .env)

**Super Admin**
- Email: superadmin@example.com
- Password: superadmin123 (or value from SEED_SUPER_ADMIN_PASSWORD)

**Admin**
- Email: admin@example.com
- Password: admin123 (or value from SEED_ADMIN_PASSWORD)

**Staff Users**
- Email: staff1@example.com or staff2@example.com
- Password: staff123 (or value from SEED_STAFF_PASSWORD)

**Note**: In a production environment, you should use strong passwords and keep them secure. The `.env` file should not be committed to version control.

## 🏃‍♂️ Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Development Without Swagger Generation
```bash
npm run dev:no-swagger
```

## 📚 API Documentation

Once the server is running, you can access the Swagger documentation at:
```
http://localhost:3000/api/docs
```

## 📁 Project Structure

```
water-pulsa-be/
├── prisma/                  # Prisma schema and migrations
├── public/                  # Public assets
├── src/
│   ├── config/              # Configuration files
│   ├── controllers/         # API route controllers
│   ├── middleware/          # Express middlewares
│   ├── models/              # Data models
│   ├── routes/              # API routes
│   │   └── v1/              # API version 1 routes
│   ├── services/            # Business logic services
│   ├── utils/               # Utility functions
│   └── server.js            # Main application entry
├── uploads/                 # File uploads directory
├── .env                     # Environment variables
├── .gitignore               # Git ignore file
├── package.json             # Project dependencies
└── README.md                # Project documentation
```

## 🔌 Available Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user

### Users
- `GET /api/v1/users` - Get all users (admin only)
- `GET /api/v1/users/:id` - Get user by ID (admin only)
- `POST /api/v1/users` - Create a new user (admin only)
- `PUT /api/v1/users/:id` - Update a user (admin only)
- `DELETE /api/v1/users/:id` - Delete a user (admin only)
- `GET /api/v1/users/stats` - Get user statistics (admin only)
- `GET /api/v1/users/dropdown` - Get users for dropdown (admin only)
- `PATCH /api/v1/users/:id/toggle-status` - Toggle user active status (admin only)

### User Profile
- `GET /api/v1/user-profile` - Get current user profile
- `PUT /api/v1/user-profile` - Update user profile
- `DELETE /api/v1/user-profile` - Delete user account
- `POST /api/v1/user-profile/change-password` - Change user password

### Devices
- `GET /api/v1/devices` - Get all devices
- `GET /api/v1/devices/:id` - Get device by ID
- `POST /api/v1/devices` - Create a new device
- `PUT /api/v1/devices/:id` - Update a device
- `DELETE /api/v1/devices/:id` - Delete a device
- `GET /api/v1/devices/dropdown` - Get devices for dropdown
- `GET /api/v1/devices/stats` - Get device statistics
- `POST /api/v1/devices/auth` - Authenticate a device by key

For a complete list of endpoints and their details, refer to the Swagger documentation.

## 🔐 Authentication

The API uses JWT (JSON Web Token) for authentication. Include the token in the request header:

```
Authorization: Bearer <your_token>
```

For API key authentication (used by IoT devices), include the API key in the header:

```
X-API-Key: <your_api_key>
```

## 📋 Available Scripts

- `npm start` - Start the server in production mode
- `npm run dev` - Start the server in development mode
- `npm run dev:no-swagger` - Start the server without generating Swagger docs
- `npm run lint` - Run ESLint on the source code
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run Prisma migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run prisma:seed` - Run database seeding
- `npm run prisma:reset` - Reset the database (caution: deletes all data)
- `npm run swagger:generate` - Generate Swagger documentation
- `npm run setup` - Setup initial directories

## 🚢 Deployment

### Prerequisites
- Node.js server or cloud service
- MySQL database
- Environment variables configured

### Steps
1. Clone the repository on the server
2. Install dependencies with `npm install --production`
3. Configure environment variables for production
4. Run Prisma migrations with `npx prisma migrate deploy`
5. Start the server with `npm start`
6. (Optional) Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name sipelayar-api
   ```

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

```
MIT License

Copyright (c) 2025 Dewa Ketut Satriawan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```