# API Documentation

## Base URL
```
http://localhost:4000/api
```

## Authentication

All authenticated endpoints require a JWT token in the `Authorization` header:
```
Authorization: Bearer <token>
```

## Endpoints

### Auth

#### Register
```
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}

Response: 201
{
  "message": "Account created. Check your email to verify.",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response: 200
{
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### Verify Email
```
GET /auth/verify/:token

Response: 200
{
  "message": "Email verified successfully"
}
```

#### Complete Profile
```
POST /auth/complete-profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "native_language": "Krio",
  "proficiency_level": "native",
  "photo_url": "https://...",
  "profession": "Software Engineer"
}

Response: 200
{
  "message": "Profile completed",
  "user": { ... }
}
```

### Translations

#### Get Samples
```
GET /api/samples?language=Krio&limit=10&offset=0

Response: 200
[
  {
    "id": "uuid",
    "english_text": "Hello",
    "language": "Krio",
    "created_at": "2024-05-01T00:00:00Z"
  }
]
```

#### Submit Translation
```
POST /api/translations
Authorization: Bearer <token>
Content-Type: application/json

{
  "sample_id": "uuid",
  "translated_text": "Hello na Krio",
  "duration_seconds": 45
}

Response: 201
{
  "id": "uuid",
  "sample_id": "uuid",
  "translated_text": "Hello na Krio",
  "status": "pending_review"
}
```

#### Get User Translations
```
GET /api/translations?status=approved&limit=50&offset=0
Authorization: Bearer <token>

Response: 200
[
  {
    "id": "uuid",
    "translated_text": "...",
    "status": "approved",
    "created_at": "2024-05-01T00:00:00Z"
  }
]
```

### Contributors

#### List Contributors (Public)
```
GET /api/contributors?limit=20&offset=0

Response: 200
[
  {
    "id": "uuid",
    "name": "John Doe",
    "native_language": "Krio",
    "photo_url": "https://...",
    "profession": "Software Engineer",
    "translation_count": 150,
    "reputation_score": 4.8
  }
]
```

#### Get Contributor Detail (Admin)
```
GET /api/contributors/admin/list?search=john&limit=10&offset=0
Authorization: Bearer <admin-token>

Response: 200
{
  "contributors": [ ... ],
  "total": 42
}
```

#### Delete Contributor (Admin)
```
DELETE /api/contributors/admin/:id
Authorization: Bearer <admin-token>

Response: 200
{
  "message": "Contributor and associated data deleted"
}
```

### Stats

#### Get Global Stats
```
GET /api/stats/global

Response: 200
{
  "total_translations": 15432,
  "total_contributors": 128,
  "languages_covered": 8,
  "avg_quality_score": 4.6
}
```

### Admin

#### Get Dashboard Stats
```
GET /api/stats/admin/dashboard
Authorization: Bearer <admin-token>

Response: 200
{
  "pending_translations": 234,
  "flagged_translations": 12,
  "new_contributors": 5,
  "active_translators_today": 23
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error message",
  "code": "VALIDATION_ERROR"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "code": "UNAUTHORIZED"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "code": "FORBIDDEN"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found",
  "code": "NOT_FOUND"
}
```

### 429 Rate Limited
```json
{
  "error": "Too many requests",
  "code": "RATE_LIMIT"
}
```

### 500 Server Error
```json
{
  "error": "Internal server error",
  "code": "SERVER_ERROR"
}
```

## Rate Limits

- **Auth endpoints**: 20 requests per 15 minutes (per IP)
- **Translation endpoints**: 120 requests per hour (per user)
- **General endpoints**: 500 requests per 15 minutes (per IP)

## Pagination

All list endpoints support:
- `limit`: Number of items (default: 20, max: 100)
- `offset`: Number of items to skip (default: 0)

Response includes:
```json
{
  "data": [ ... ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```
