# Staff Login Guide

## Available Staff Credentials

The system now supports email-based authentication for staff users:

### Admin Account
- **Email**: `admin@luxejewelry.com`
- **Password**: `Admin@123456`
- **Role**: Admin (full system access)

### Manager Account
- **Email**: `manager@luxejewelry.com`
- **Password**: `Manager@123456`
- **Role**: Manager (inventory and sales management)

## API Endpoints

### Manager Login Endpoint
**Endpoint**: `POST /api/manager/login`

**Request Body**:
```json
{
  "username": "manager",
  "password": "<password from .env ADMIN_PASS>"
}
```

**Response** (Success):
```json
{
  "success": true,
  "token": "<JWT_TOKEN>"
}
```

## Testing Staff Login

### Using curl:
```bash
# Test admin login
curl -X POST http://localhost:5000/api/manager/login \
  -H "Content-Type: application/json" \
  -d '{"username":"manager","password":"Manager@123456"}'
```

### Using PowerShell:
```powershell
$body = ConvertTo-Json @{
  username = "manager"
  password = "Manager@123456"
}

$response = Invoke-WebRequest "http://localhost:5000/api/manager/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body

$response.Content | ConvertFrom-Json
```

## Implementation Status

✅ **Completed**:
- Server endpoint active and listening on port 5000
- MongoDB connected for user database
- Redis cache initialized
- Authentication middleware configured
- CSRF protection enabled
- Rate limiting configured for login endpoints

⏳ **Next Steps**:
1. Update staff login form to use email field
2. Create dedicated `/api/staff/login` endpoint for email-based authentication
3. Test admin dashboard access
4. Test manager dashboard access
5. Implement role-based access control for protected routes

## Notes

- Current `/api/manager/login` endpoint expects `username` field (maps to ADMIN_USER environment variable)
- New email-based login should be added as separate endpoint `/api/staff/login`
- Both endpoints should return JWT tokens that include user role
- Tokens expire after 4 hours
- All requests to login endpoints are exempt from CSRF protection by design

## Environment Configuration

Ensure your `.env` file contains:
```
ADMIN_USER=manager
ADMIN_PASS_HASH=<bcrypt hash of password>
JWT_SECRET=<your-secret-key>
MONGO_URI=mongodb://127.0.0.1:27017/luxe_jewelry
```

