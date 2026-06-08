# Backup & Disaster Recovery Strategy

## Overview

This document outlines the backup and recovery procedures for the Liberian Language Dataset platform to ensure data safety and minimize downtime in case of failures.

## Backup Types

### 1. Automated Daily Backups
**Frequency**: Daily at 02:00 UTC  
**Retention**: 30 days  
**Target**: AWS S3 or external backup service

```bash
# Automated via cron job (production server)
0 2 * * * /app/scripts/backup-db.sh
```

### 2. Weekly Full Backups
**Frequency**: Every Sunday at 00:00 UTC  
**Retention**: 12 weeks  
**Target**: Cold storage (cheaper tier)

### 3. Transaction Logs
**Frequency**: Continuous (PostgreSQL WAL)  
**Retention**: 7 days  
**Purpose**: Point-in-time recovery

## Backup Process

### Manual Backup
```bash
# Backup database
pg_dump -U postgres lmd_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup with compression
pg_dump -U postgres -F c lmd_db > backup_$(date +%Y%m%d_%H%M%S).dump

# Upload to S3
aws s3 cp backup_*.dump s3://lmd-backups/$(date +%Y/%m/)
```

### Automated Backup Script
```bash
#!/bin/bash
# /app/scripts/backup-db.sh

BACKUP_DIR="/backups"
DB_NAME="lmd_db"
DB_USER="postgres"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.dump"

# Create backup
pg_dump -U $DB_USER -F c $DB_NAME > $BACKUP_FILE

# Compress
gzip $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE.gz s3://lmd-backups/

# Keep only last 30 days locally
find $BACKUP_DIR -name "backup_*.dump.gz" -mtime +30 -delete
```

## Recovery Procedures

### Restore from Latest Backup
```bash
# Download backup from S3
aws s3 cp s3://lmd-backups/backup_latest.dump.gz .

# Decompress
gunzip backup_latest.dump.gz

# Restore database
pg_restore -U postgres -d lmd_db backup_latest.dump
```

### Point-in-Time Recovery (PITR)
PostgreSQL WAL allows recovery to any point in time:

```bash
# Stop the database server
sudo systemctl stop postgresql

# Backup current data directory
cp -r /var/lib/postgresql/data /var/lib/postgresql/data.backup

# Restore base backup
pg_restore /backups/backup_base.dump

# Configure recovery target
echo "recovery_target_timeline = 'latest'" >> /var/lib/postgresql/data/recovery.conf
echo "recovery_target_xid = '12345678'" >> /var/lib/postgresql/data/recovery.conf

# Start recovery
sudo systemctl start postgresql
```

### Partial Recovery (Specific Table)
```bash
# Extract specific table from backup
pg_restore -U postgres --data-only -t translations backup_latest.dump | \
  psql -U postgres lmd_db
```

## Disaster Recovery Plan

### RTO/RPO Targets
- **RTO** (Recovery Time Objective): 1 hour
- **RPO** (Recovery Point Objective): 1 day

### Scenario 1: Database Corruption
**Detection**: Error logs show data corruption  
**Response Time**: < 15 minutes

1. Identify last known good backup
2. Restore from latest clean backup
3. Validate data integrity
4. Notify users of data loss window

### Scenario 2: Complete Server Failure
**Detection**: All services down  
**Response Time**: < 30 minutes

1. Provision new server with same specs
2. Install PostgreSQL, Node.js, dependencies
3. Restore database from S3 backup
4. Restore application code from GitHub
5. Verify all services operational
6. Update DNS/load balancer

### Scenario 3: Ransomware/Data Loss Attack
**Detection**: Unexpected database changes  
**Response Time**: < 1 hour

1. **Isolate**: Take servers offline immediately
2. **Restore**: Boot from clean snapshot
3. **Verify**: Check backup integrity
4. **Recover**: Restore from off-site backup
5. **Scan**: Full security audit

## Verification & Testing

### Monthly Backup Test
```bash
# First of every month
1. Restore latest backup to staging database
2. Run data integrity checks
3. Test critical workflows
4. Compare row counts with production
5. Document any issues
```

### Data Integrity Checks
```sql
-- Check all tables have content
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del 
FROM pg_stat_user_tables;

-- Verify constraints
SELECT * FROM pg_constraint WHERE contype NOT IN ('p', 'u', 'f', 'c');

-- Check for orphaned records
SELECT COUNT(*) FROM translations WHERE sample_id NOT IN 
  (SELECT id FROM samples);
```

## Backup Infrastructure

### Storage Locations
1. **Local**: `/backups` on production server (7 days)
2. **AWS S3**: `s3://lmd-backups/` (30 days hot, 1 year cold)
3. **Google Cloud Storage**: Offsite redundancy (1 year)

### Encryption
- All backups encrypted at rest with AES-256
- Encryption keys stored in AWS Secrets Manager
- Separate credentials for backup access

## Monitoring

### Backup Health Checks
```bash
# Alert if backup hasn't completed in 24 hours
*/30 * * * * [ $(find /backups -name "backup_*.dump.gz" -mtime -1 | wc -l) -eq 0 ] && \
  curl -X POST https://alerts.example.com/backup-failed
```

### S3 Lifecycle Policy
```json
{
  "Rules": [
    {
      "Id": "DeleteOldBackups",
      "Filter": { "Prefix": "backups/" },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

## Compliance & Documentation

- [ ] Backups encrypted in transit and at rest
- [ ] Access logs maintained for all backups
- [ ] Monthly restoration tests documented
- [ ] RTO/RPO targets met
- [ ] Disaster recovery runbook updated quarterly
- [ ] All team members trained on recovery procedures

## Contact & Escalation

**Backup Failures**: Notify ops team immediately  
**Recovery Needed**: Follow runbook + notify all stakeholders  
**Extended Outage**: Activate incident response protocol
