# Production Readiness Checklist

Use this checklist before deploying to production. Complete all sections and date each approval.

---

## Security (Pre-deployment)

- [ ] JWT_SECRET changed from default — **Date**: _____ — **Reviewer**: _____
- [ ] Database credentials rotated and stored in secrets manager — **Date**: _____ — **Reviewer**: _____
- [ ] CORS origins configured correctly (not `*`) — **Date**: _____ — **Reviewer**: _____
- [ ] HTTPS/SSL certificate installed — **Date**: _____ — **Reviewer**: _____
- [ ] Rate limiting configured for all endpoints — **Date**: _____ — **Reviewer**: _____
- [ ] Sensitive environment variables not in `.env` — **Date**: _____ — **Reviewer**: _____
- [ ] API keys rotated and expired keys deleted — **Date**: _____ — **Reviewer**: _____

### Notes:
---

## Testing (Pre-deployment)

- [ ] All backend tests passing (`npm test`) — **Date**: _____ — **Reviewer**: _____
- [ ] All frontend tests passing (`npm test`) — **Date**: _____ — **Reviewer**: _____
- [ ] E2E tests passing (`npm run e2e:ci`) — **Date**: _____ — **Reviewer**: _____
- [ ] Critical paths tested:
  - [ ] User registration → email verification
  - [ ] Login → dashboard access
  - [ ] Translation submission → storage
  - [ ] Admin panel functionality
- [ ] Load tested with expected traffic volume — **Date**: _____ — **Reviewer**: _____
- [ ] Test coverage:
  - [ ] Backend: ≥ 80% — **Date**: _____ — **Reviewer**: _____
  - [ ] Frontend: ≥ 70% — **Date**: _____ — **Reviewer**: _____

### Notes:
---

## Database (Pre-deployment)

- [ ] Database migrations tested and reversible — **Date**: _____ — **Reviewer**: _____
- [ ] Backup configured and tested:
  - [ ] Daily backups running — **Date**: _____ — **Reviewer**: _____
  - [ ] Backup restoration tested — **Date**: _____ — **Reviewer**: _____
  - [ ] Off-site backup (S3/GCS) configured — **Date**: _____ — **Reviewer**: _____
- [ ] Indexes created for slow queries — **Date**: _____ — **Reviewer**: _____
- [ ] Connection pooling configured (`connection_limit=5-10`) — **Date**: _____ — **Reviewer**: _____
- [ ] Data retention policy documented — **Date**: _____ — **Reviewer**: _____

### Notes:
---

## Infrastructure (Pre-deployment)

- [ ] Docker images built and tested — **Date**: _____ — **Reviewer**: _____
- [ ] Docker-compose configuration tested — **Date**: _____ — **Reviewer**: _____
- [ ] Server specifications meet requirements:
  - [ ] CPU: _____ cores
  - [ ] Memory: _____ GB
  - [ ] Disk: _____ GB
  - [ ] Database: Separate instance — **Date**: _____ — **Reviewer**: _____
- [ ] Load balancer configured (if multi-server) — **Date**: _____ — **Reviewer**: _____
- [ ] Auto-scaling configured (if cloud) — **Date**: _____ — **Reviewer**: _____
- [ ] DNS records updated — **Date**: _____ — **Reviewer**: _____
- [ ] CDN configured for static files (optional) — **Date**: _____ — **Reviewer**: _____

### Notes:
---

## Monitoring & Observability (Pre-deployment)

- [ ] Sentry DSN configured:
  - [ ] Backend: _____ — **Date**: _____ — **Reviewer**: _____
  - [ ] Frontend: _____ — **Date**: _____ — **Reviewer**: _____
- [ ] Logging configured:
  - [ ] Log rotation enabled (30-day activity, 90-day errors) — **Date**: _____ — **Reviewer**: _____
  - [ ] Log aggregation setup (ELK/Splunk) — **Date**: _____ — **Reviewer**: _____
- [ ] Monitoring dashboards created:
  - [ ] API response times — **Date**: _____ — **Reviewer**: _____
  - [ ] Error rates — **Date**: _____ — **Reviewer**: _____
  - [ ] Database metrics — **Date**: _____ — **Reviewer**: _____
  - [ ] CPU/Memory/Disk — **Date**: _____ — **Reviewer**: _____
- [ ] Alerts configured for:
  - [ ] Error rate > 1% — **Date**: _____ — **Reviewer**: _____
  - [ ] Response time p95 > 1s — **Date**: _____ — **Reviewer**: _____
  - [ ] Disk usage > 80% — **Date**: _____ — **Reviewer**: _____
  - [ ] Database connections > 80% pool — **Date**: _____ — **Reviewer**: _____
  - [ ] Application crash — **Date**: _____ — **Reviewer**: _____

### Notes:
---

## Documentation (Pre-deployment)

- [ ] API documentation updated (API.md) — **Date**: _____ — **Reviewer**: _____
- [ ] Deployment runbook created — **Date**: _____ — **Reviewer**: _____
- [ ] Disaster recovery plan tested — **Date**: _____ — **Reviewer**: _____
- [ ] Team trained on:
  - [ ] Deployment procedures — **Date**: _____ — **Trainer**: _____
  - [ ] Monitoring dashboards — **Date**: _____ — **Trainer**: _____
  - [ ] Incident response — **Date**: _____ — **Trainer**: _____
- [ ] Status page configured and accessible — **Date**: _____ — **Reviewer**: _____

### Notes:
---

## Performance (Pre-deployment)

- [ ] API response times (p95):
  - [ ] GET /api/samples: < 200ms — **Measured**: _____ ms
  - [ ] POST /api/translations: < 300ms — **Measured**: _____ ms
  - [ ] GET /api/contributors: < 150ms — **Measured**: _____ ms
- [ ] Frontend performance:
  - [ ] Lighthouse score ≥ 80 — **Score**: _____
  - [ ] Time to interactive < 3s — **Measured**: _____ s
- [ ] Database queries:
  - [ ] p95 query time < 100ms — **Measured**: _____ ms
  - [ ] No N+1 queries detected — **Date**: _____ — **Reviewer**: _____
- [ ] Memory usage:
  - [ ] Backend: < 500MB — **Measured**: _____ MB
  - [ ] Frontend: < 100MB — **Measured**: _____ MB

### Notes:
---

## Business Continuity (Pre-deployment)

- [ ] RTO target: 1 hour — **Confirmed**: YES / NO
- [ ] RPO target: 1 day — **Confirmed**: YES / NO
- [ ] Incident response team identified — **Team**: _____
- [ ] On-call schedule configured — **Date**: _____ — **Owner**: _____
- [ ] Communication channels set up:
  - [ ] Slack #incidents — **Date**: _____ — **Reviewer**: _____
  - [ ] Status page — **Date**: _____ — **Reviewer**: _____
  - [ ] Email alerts — **Date**: _____ — **Reviewer**: _____
- [ ] Runbook accessible to on-call engineer — **Location**: _____

### Notes:
---

## Final Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| **Tech Lead** | __________ | _____ | __________ |
| **QA Lead** | __________ | _____ | __________ |
| **DevOps Lead** | __________ | _____ | __________ |
| **Product Manager** | __________ | _____ | __________ |

---

## Deployment Command

```bash
# Only proceed with deployment after all items checked

# Build and push Docker images
docker-compose build
docker tag liberian-dataset-backend:latest gcr.io/project/backend:latest
docker tag liberian-dataset-frontend:latest gcr.io/project/frontend:latest
docker push gcr.io/project/backend:latest
docker push gcr.io/project/frontend:latest

# Deploy
kubectl apply -f k8s/

# Verify deployment
kubectl rollout status deployment/backend
kubectl rollout status deployment/frontend

# Health check
curl https://app.liberian-dataset.org/api/health
```

---

## Post-Deployment Checks (30 minutes)

- [ ] Application accessible (no 502/503 errors)
- [ ] User can register and login
- [ ] Translations can be submitted
- [ ] Admin panel functional
- [ ] No error spikes in Sentry
- [ ] Database healthy (connection count normal)
- [ ] Logs normal (no unexpected errors)

**Deployment completed at**: _______________  
**Verified by**: _______________ **Date**: _____

---

## Post-Deployment Review (24 hours)

- [ ] No increased error rates (< 0.1%)
- [ ] No performance degradation
- [ ] All backups completed successfully
- [ ] User feedback collected (support tickets < 5)
- [ ] System running smoothly

**Review completed by**: _______________ **Date**: _____

---

## Rollback Plan (if needed)

```bash
# Immediate rollback within 30 minutes
kubectl rollout undo deployment/backend
kubectl rollout undo deployment/frontend

# OR

# Full rollback to previous stable version
git checkout <stable-tag>
docker-compose build
# redeploy
```

**Rollback approval by**: _______________ **Time**: ___:___ **Date**: _____

---

Keep this checklist with each production release for audit purposes.
