# User Authentication API Documentation

## Overview

The API now supports user-based authentication with Bearer tokens. Users are stored in a PostgreSQL database with MD5 hashed passwords.

## Database Setup

### Run the migration:

```sql
-- Run the migrations/create_users_table.sql file
```

### Default Users

The migration creates two default users:

- **Admin User**: username: `admin`, password: `admin123`, role: `admin`
- **Regular User**: username: `user`, password: `user123`, role: `user`

## Authentication Endpoints

### 1. Register User

**POST** `/auth/register`

**Request Body:**

```json
{
  "username": "newuser",
  "password": "password123",
  "role": "user"
}
```

**Response:**

```json
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "username": "newuser",
    "role": "user",
    "created_at": "2025-07-16T15:30:00.000Z"
  }
}
```

### 2. Login User

**POST** `/auth/login`

**Request Body:**

```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**

```json
{
  "message": "Login successful",
  "token": "base64-encoded-token",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

### 3. Get Current User Profile

**GET** `/auth/me`

**Headers:**

- `Authorization: Bearer <token>`

**Response:**

```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

### 4. List All Users (Admin Only)

**GET** `/users`

**Headers:**

- `Authorization: Bearer <token>` (Admin user required)

**Response:**

```json
{
  "users": [
    {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "created_at": "2025-07-16T10:00:00.000Z",
      "updated_at": "2025-07-16T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

## How to Use

### 1. Create a User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123",
    "role": "user"
  }'
```

### 2. Login to Get Token

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### 3. Use Token to Access Protected Endpoints

```bash
curl -X GET http://localhost:3000/domains \
  -H "Authorization: Bearer <your-token-here>"
```

## Authentication Flow

1. **Token Generation**: When a user logs in, the system generates a simple Base64 token containing `userId:username:timestamp`
2. **Token Validation**: For each protected endpoint, the middleware decodes the token and validates the user exists in the database
3. **User Context**: The authenticated user information is available in `req.user` for all protected routes

## Security Features

- **Password Hashing**: Passwords are hashed using MD5 (Note: Consider upgrading to bcrypt for production)
- **Role-Based Access**: Users have roles (admin/user) for different access levels
- **Token-Based Authentication**: Bearer tokens for stateless authentication
- **Rate Limiting**: Applied to all routes to prevent abuse

## Role-Based Access Control

- **Admin Role**: Can access all endpoints including user management
- **User Role**: Can access all domain-related endpoints but not user management
- **API Key Fallback**: The old API key authentication is still supported for backward compatibility

## Error Responses

### 401 Unauthorized

```json
{
  "error": "Authentication required",
  "message": "Please provide a valid Authorization header (Bearer token) or X-API-Key header"
}
```

### 403 Forbidden

```json
{
  "error": "Admin access required"
}
```

### 409 Conflict (Username exists)

```json
{
  "error": "Username already exists"
}
```

## Migration from API Key to User Authentication

1. **Backward Compatibility**: Existing API key authentication still works
2. **Gradual Migration**: You can migrate users gradually to the new system
3. **Mixed Usage**: Both authentication methods can coexist

## Example Complete Workflow

```bash
# 1. Register a new user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "myuser", "password": "mypassword", "role": "user"}'

# 2. Login to get token
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "myuser", "password": "mypassword"}' | jq -r '.token')

# 3. Use token to create a domain
curl -X POST http://localhost:3000/domain \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com"}'

# 4. Get user profile
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN"
```
