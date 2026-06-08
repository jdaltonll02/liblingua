# Monitoring & Observability

## Overview

This guide covers monitoring, logging, alerting, and debugging strategies for production deployment.

## Logging Strategy

### Log Levels

- **ERROR** — Critical failures, recoverable with intervention
- **WARN** — Unexpected conditions, operation continues
- **INFO** — High-level operations (server start, deployments)
- **HTTP** — All API requests and responses

### Backend Logs

Logs are written to `logs/` directory with daily rotation:

```
logs/
├── activity-2024-05-01.log    # All requests, warnings, info
├── error-2024-05-01.log       # Errors only
└── ...
```

Format: NDJSON (newline-delimited JSON) for easy parsing:

```json
{"timestamp":"2024-05-01 10:30:45.123","level":"error","message":"database_error","userId":"abc123","stack":"Error: ..."}
```

### Log Retention

- Activity logs: 30 days
- Error logs: 90 days
- Old files: Automatically gzipped and archived

### Viewing Logs

```bash
# Real-time streaming
tail -f logs/activity-*.log | jq '.message'

# Search for specific user
grep -l "userId.*abc123" logs/activity-*.log

# Count errors by type
jq '.message' logs/error-*.log | sort | uniq -c

# Parse timestamp and message
jq -r '.timestamp + " " + .message' logs/error-*.log
```

## Error Tracking (Sentry)

### Setup

1. Create account at https://sentry.io
2. Create a new project for each environment
3. Set `SENTRY_DSN` in environment variables

### What Gets Tracked

- Unhandled exceptions
- API errors (4xx, 5xx)
- Performance issues (slow endpoints)
- Database errors
- Frontend errors

### Ignoring Specific Errors

Edit `.env`:
```
SENTRY_IGNORE_ERRORS="404|NetworkError"
```

### Querying Errors

```bash
# Get recent errors
curl -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  https://sentry.io/api/0/projects/ORG_ID/PROJECT_ID/events/?limit=10

# Get errors by URL
curl -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  https://sentry.io/api/0/projects/ORG_ID/PROJECT_ID/events/?query=url:%22/api/translate%22
```

## Metrics & Performance

### Backend Performance

Monitor via Sentry or custom dashboard:

```javascript
// Track custom metric
Sentry.captureMessage('Translation submitted', {
  level: 'info',
  contexts: {
    performance: {
      language: 'Krio',
      duration_ms: 245,
    },
  },
});
```

### Key Metrics to Monitor

| Metric | Threshold | Action |
|--------|-----------|--------|
| API response time (p95) | < 500ms | Scale up / profile code |
| Error rate | < 0.1% | Investigate error logs |
| Database query time (p95) | < 100ms | Add indexes / optimize queries |
| Memory usage | < 80% | Check for memory leaks |
| Disk usage | < 80% | Clean logs / old backups |

### Grafana Dashboard Setup

Create a dashboard showing:

```yaml
- API response times (percentiles)
- Error rates by endpoint
- Database connection count
- Request volume over time
- CPU and memory usage
- Disk usage
```

## Alerts

### Alert Channels

Setup alerts to notify via:
- Email
- Slack
- PagerDuty (for critical)
- SMS (for P1 incidents)

### Alert Rules

```
Rule: API Error Rate > 1%
Condition: Error count in last 5 min > 1% of total requests
Action: Notify #incident-response on Slack
```

```
Rule: Database Connection Pool Near Limit
Condition: Active connections > 80% of pool size
Action: Email ops team
```

```
Rule: Disk Space Critical
Condition: Free disk < 5%
Action: PagerDuty P1, Slack immediate
```

## Health Checks

### Endpoint Health

```bash
# API health
curl http://localhost:4000/api/health

# Returns:
# {"status":"ok","ts":"2024-05-01T10:30:45Z"}
```

### Database Health

```javascript
// Check database connection
const result = await prisma.$queryRaw`SELECT 1`;
if (result) {
  console.log('Database: OK');
} else {
  console.error('Database: DOWN');
}
```

### Synthetic Monitoring

Periodically test critical flows:

```bash
# Test user registration
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# Test translation submission
curl -X POST http://localhost:4000/api/translations \
  -H "Authorization: Bearer TOKEN" \
  -F "sample_id=uuid" \
  -F "translated_text=..." \
  -F "audio=@file.mp3"
```

## Debugging

### Common Issues

#### High Memory Usage

```javascript
// Check memory stats
const used = process.memoryUsage();
console.log({
  rss: Math.round(used.rss / 1024 / 1024) + ' MB',
  external: Math.round(used.external / 1024 / 1024) + ' MB',
});

// Potential causes:
// - Large query result not paginated
// - Memory leak in event listeners
// - Circular references in objects
```

#### High Database Load

```sql
-- Find slow queries
SELECT mean_time, calls, query 
FROM pg_stat_statements 
WHERE mean_time > 100 
ORDER BY mean_time DESC;

-- Check connection usage
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Kill long-running query
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE query_start < NOW() - INTERVAL '10 minutes';
```

#### 502 Bad Gateway

```bash
# Check if backend is running
curl -v http://localhost:4000/api/health

# Check logs for crashes
tail -f logs/error-*.log

# Restart backend
systemctl restart liberian-dataset-backend
```

## Log Analysis

### Parse and analyze logs

```bash
# Get error distribution
jq -r '.message' logs/error-*.log | sort | uniq -c | sort -rn

# Get slowest API endpoints
jq 'select(.response_time_ms > 100) | .path' logs/activity-*.log | \
  sort | uniq -c | sort -rn

# Find errors for specific user
jq 'select(.userId == "abc123")' logs/error-*.log

# Get all 500 errors from last hour
jq 'select(.status == 500 and .timestamp > "2024-05-01 09:30:00")' logs/error-*.log
```

## Incident Response

### Critical Error Detected

1. **Alert received** → Acknowledge in Sentry
2. **Check status** → `curl /api/health` and check logs
3. **Investigate** → Search logs for patterns
4. **Mitigate** → Restart service if needed, or rollback
5. **Communicate** → Update status page and notify stakeholders
6. **Postmortem** → Review after 24 hours

### Playbooks

- **Database Down** → Check connection, restart service, restore from backup
- **Memory Leak** → Kill process, investigate code, redeploy fix
- **High Error Rate** → Rollback last deploy or manually kill problematic requests
- **Disk Full** → Archive old logs, delete temp files, or scale storage

## Checklists

### Daily
- [ ] No errors in Sentry above threshold
- [ ] API response times normal (check dashboard)
- [ ] Disk usage < 80%
- [ ] Database connections healthy

### Weekly
- [ ] Review slow query logs
- [ ] Test database backup restoration
- [ ] Review error trends
- [ ] Check for security alerts

### Monthly
- [ ] Full backup tested
- [ ] Performance baseline updated
- [ ] Unused indexes removed
- [ ] Log retention policy verified
