# Deployment Guide

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Docker & Docker Compose (for containerized setup)

### Setup

1. **Clone and install**
```bash
git clone <repo>
cd datasetbuilder

# Backend
cd backend
npm install
npx prisma migrate dev
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

2. **Environment variables**
Copy `.env.example` files:
```bash
# backend/.env
DATABASE_URL="postgresql://user:password@localhost:5432/lmd_db"
FRONTEND_URL="http://localhost:5173"
JWT_SECRET="your-secret-key"
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="your-email"
SMTP_PASS="your-password"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
```

## Docker Deployment

### Build and run
```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Backend API on port 4000
- Frontend on port 5173

### Environment variables
Create `.env` file in project root:
```
DATABASE_NAME=lmd_db
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-secret-key
NODE_ENV=production
```

## Testing

### Backend tests
```bash
cd backend
npm test                 # Run once
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage
```

### Frontend tests
```bash
cd frontend
npm test                # Run once with UI
npm run test:coverage   # With coverage
npm run e2e            # Open Cypress
```

## Database Migrations

### Create migration
```bash
cd backend
npx prisma migrate dev --name migration_name
```

### Deploy migration
```bash
npx prisma migrate deploy
```

### Reset database (dev only)
```bash
npx prisma migrate reset
```

## Monitoring & Logs

### Backend logs
Logs are written to `logs/` directory:
- `activity-{DATE}.log` — all API requests
- `error-{DATE}.log` — errors only

View live:
```bash
tail -f logs/activity-*.log
```

### Database
Access Prisma Studio:
```bash
cd backend
npm run db:studio
```

Opens at http://localhost:5555

## Scaling Considerations

### Database
- Enable read replicas for analytics
- Set up automated backups (see Backup Strategy)
- Monitor slow queries with `pg_stat_statements`

### API
- Backend is stateless and can be horizontally scaled
- Use load balancer (NGINX/HAProxy) for traffic distribution
- Cache frequently-accessed data (Redis)

### Frontend
- Static build output can be served from CDN
- Use service workers for offline support

## Troubleshooting

### Database connection errors
```bash
# Verify PostgreSQL is running
psql -U postgres -d lmd_db

# Reset environment
rm -rf node_modules package-lock.json
npm install
npx prisma migrate dev
```

### Email not sending
- Verify SMTP credentials in `.env`
- Check firewall for SMTP port access
- Review logs in `logs/error-*.log`

### Frontend build errors
```bash
cd frontend
rm -rf node_modules dist
npm install
npm run build
```

## Production Checklist

- [ ] Database backups configured
- [ ] Sentry error tracking set up
- [ ] Rate limiting configured
- [ ] HTTPS/SSL certificates installed
- [ ] CORS origins configured
- [ ] JWT secret changed from default
- [ ] Database credentials stored in secrets manager
- [ ] Monitoring and alerting set up
- [ ] Automated tests passing
- [ ] Load testing completed
