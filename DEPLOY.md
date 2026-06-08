# liblingua — Production Deployment Guide

> **Target environment:** Google Cloud Platform (GCP) Ubuntu instance  
> **Assumption:** Another Docker application is already running on the same instance.  
> **Strategy:** liblingua runs in its own Docker Compose project on non-conflicting ports. A host-level nginx reverse proxy routes traffic from your domain/subdomain to the liblingua frontend container.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [GCP Firewall Rules](#2-gcp-firewall-rules)
3. [Server Preparation](#3-server-preparation)
4. [Clone the Repository](#4-clone-the-repository)
5. [Configure Environment Variables](#5-configure-environment-variables)
6. [Adjust Port Mappings for Co-existence](#6-adjust-port-mappings-for-co-existence)
7. [Build and Start Containers](#7-build-and-start-containers)
8. [Host nginx Reverse Proxy](#8-host-nginx-reverse-proxy)
9. [SSL Certificate (Let's Encrypt)](#9-ssl-certificate-lets-encrypt)
10. [Verify the Deployment](#10-verify-the-deployment)
11. [Seed the Database](#11-seed-the-database)
12. [Keeping the App Running](#12-keeping-the-app-running)
13. [Updates and Redeployment](#13-updates-and-redeployment)
14. [Backups](#14-backups)
15. [Logs and Monitoring](#15-logs-and-monitoring)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Prerequisites

### GCP Instance Recommendations

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU      | 2 vCPU  | 4 vCPU      |
| RAM      | 4 GB    | 8 GB        |
| Disk     | 30 GB   | 100 GB SSD  |
| OS       | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Required Software (on the instance)

| Software | Purpose | Check |
|----------|---------|-------|
| Docker Engine ≥ 24 | Container runtime | `docker --version` |
| Docker Compose v2 | Multi-container orchestration | `docker compose version` |
| nginx | Host-level reverse proxy | `nginx -v` |
| Certbot | SSL certificate (Let's Encrypt) | `certbot --version` |
| git | Cloning the repository | `git --version` |

> Docker and Docker Compose are already installed since another app is running. Install the rest as needed (see §3).

### Domain

You need a domain or subdomain pointing to the GCP instance's **external IP address**.  
Example: `liblingua.yourdomain.com`

Get the external IP:
```bash
curl -s ifconfig.me
```

Add an A record in your DNS provider:
```
Type: A
Name: liblingua          (or @, or whatever subdomain you choose)
Value: <GCP_EXTERNAL_IP>
TTL:  300
```

---

## 2. GCP Firewall Rules

In the GCP Console → **VPC Network → Firewall**, ensure the following ingress rules exist for your instance's network tag:

| Rule name | Ports | Protocol | Source |
|-----------|-------|----------|--------|
| allow-http  | 80   | TCP | 0.0.0.0/0 |
| allow-https | 443  | TCP | 0.0.0.0/0 |
| allow-ssh   | 22   | TCP | Your IP (restrict this) |

> **Do not open ports 3000, 4000, or 5432 to the internet.** Those ports are internal to Docker networking. Traffic reaches the app only through nginx on 80/443.

Using `gcloud` CLI:
```bash
gcloud compute firewall-rules create allow-http \
  --allow tcp:80 --source-ranges 0.0.0.0/0 --target-tags YOUR_NETWORK_TAG

gcloud compute firewall-rules create allow-https \
  --allow tcp:443 --source-ranges 0.0.0.0/0 --target-tags YOUR_NETWORK_TAG
```

---

## 3. Server Preparation

SSH into your instance:
```bash
gcloud compute ssh YOUR_INSTANCE_NAME --zone YOUR_ZONE
# or
ssh -i ~/.ssh/your-key ubuntu@YOUR_EXTERNAL_IP
```

### Install nginx and Certbot (if not already installed)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx certbot python3-certbot-nginx git
```

### Verify Docker is running

```bash
docker --version          # e.g. Docker version 24.x
docker compose version    # e.g. Docker Compose version v2.x
docker ps                 # should list the existing app's containers
```

---

## 4. Clone the Repository

```bash
# Choose a directory that does not conflict with your existing app
cd /opt
sudo mkdir liblingua
sudo chown $USER:$USER liblingua
cd liblingua

git clone https://github.com/your-org/liberian-dataset-platform.git .
```

---

## 5. Configure Environment Variables

```bash
cp .env.example .env
nano .env          # or: vi .env
```

Fill in every value. The critical ones are:

```dotenv
# ── PostgreSQL ────────────────────────────────────────────────────────────────
POSTGRES_USER=liblingua                        # choose a unique username
POSTGRES_PASSWORD=<STRONG_RANDOM_PASSWORD>     # generate: openssl rand -hex 32
POSTGRES_DB=liblingua_db

# ── App ───────────────────────────────────────────────────────────────────────
JWT_SECRET=<STRONG_RANDOM_SECRET>              # generate: openssl rand -hex 64
NODE_ENV=production
FRONTEND_URL=https://liblingua.yourdomain.com  # your actual domain

# ── Admin account (first run only) ───────────────────────────────────────────
SEED_ADMIN_EMAIL=your-admin@yourdomain.com
SEED_ADMIN_PASSWORD=<STRONG_PASSWORD>

# ── Email (optional — leave blank to disable email verification) ──────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@liblingua.org

# ── Payments ─────────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
MTN_MOMO_SUBSCRIPTION_KEY=...
MTN_MOMO_API_USER=...
MTN_MOMO_API_KEY=...
MTN_MOMO_ENVIRONMENT=production   # change from 'sandbox' for live payments
MTN_MOMO_BASE_URL=https://proxy.momoapi.mtn.com
```

> **Generate strong secrets:**
> ```bash
> openssl rand -hex 32   # for POSTGRES_PASSWORD
> openssl rand -hex 64   # for JWT_SECRET
> ```

---

## 6. Adjust Port Mappings for Co-existence

Because another Docker app is already on this server, check which ports are in use:

```bash
sudo ss -tlnp | grep LISTEN
# or
sudo netstat -tlnp | grep LISTEN
```

**Common conflicts and fixes:**

### If port 5432 is already in use (another PostgreSQL)

Edit `docker-compose.yml` and change the DB port mapping so liblingua's Postgres uses a different host port — or remove the host mapping entirely (the DB is only accessed internally, so exposing it to the host is unnecessary):

```yaml
# docker-compose.yml — db service
db:
  ports:
    - '5433:5432'   # host port 5433 → container port 5432
    # OR remove the ports block entirely (safest for production):
    # (no ports: key means the DB is not reachable from outside Docker)
```

### If port 3000 is already in use (another frontend)

Change the frontend host port:

```yaml
# docker-compose.yml — frontend service
frontend:
  ports:
    - '3001:80'   # host port 3001 → nginx inside container
```

> Remember the host port you choose (e.g. 3001) — you will use it in the nginx reverse proxy config in §8.

### If port 4000 is already in use

```yaml
# docker-compose.yml — backend service
backend:
  ports:
    - '4001:4000'   # host port 4001 → Node inside container
```

The backend port is only needed if you want direct API access from the host. Since nginx forwards `/api` to the backend container using Docker's internal network (`http://backend:4000`), you can also remove the backend's `ports:` block entirely and keep it internal-only.

---

## 7. Build and Start Containers

```bash
cd /opt/liblingua

# Build images (first time or after code changes)
docker compose build --no-cache

# Start all containers in the background
docker compose up -d

# Verify all three are healthy
docker compose ps
```

Expected output:
```
NAME                       STATUS
liblingua-db-1             Up (healthy)
liblingua-backend-1        Up
liblingua-frontend-1       Up
```

Check backend logs for seed confirmation:
```bash
docker compose logs backend --tail=40
```

You should see:
```
✅ Seed complete.
SENTRY_DSN not set. Error tracking disabled.
```

---

## 8. Host nginx Reverse Proxy

This routes `https://liblingua.yourdomain.com` → the liblingua frontend container running on host port 3000 (or whichever port you chose in §6).

### Create the site config

```bash
sudo nano /etc/nginx/sites-available/liblingua
```

Paste the following (replace `liblingua.yourdomain.com` and `3000` with your values):

```nginx
server {
    listen 80;
    server_name liblingua.yourdomain.com;

    # Certbot will add the SSL block automatically in §9.
    # For now, serve HTTP so Certbot can verify ownership.

    # Increase limits for audio file uploads (up to 60 MB)
    client_max_body_size 60M;

    # Proxy all traffic to the liblingua nginx container
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

### Enable the site

```bash
sudo ln -s /etc/nginx/sites-available/liblingua /etc/nginx/sites-enabled/liblingua
sudo nginx -t          # test config — must say "syntax is ok"
sudo systemctl reload nginx
```

---

## 9. SSL Certificate (Let's Encrypt)

```bash
sudo certbot --nginx -d liblingua.yourdomain.com
```

Follow the prompts:
- Enter your email address
- Agree to terms
- Choose whether to redirect HTTP → HTTPS (choose **2 — Redirect**, recommended)

Certbot automatically modifies `/etc/nginx/sites-available/liblingua` to add the SSL block and sets up auto-renewal.

Verify auto-renewal:
```bash
sudo certbot renew --dry-run
```

---

## 10. Verify the Deployment

```bash
# Health check via the API
curl https://liblingua.yourdomain.com/api/health
# Expected: {"status":"ok","ts":"..."}

# Check the frontend is serving HTML
curl -sI https://liblingua.yourdomain.com | head -5
# Expected: HTTP/2 200

# Check all containers are running
docker compose ps
```

Open `https://liblingua.yourdomain.com` in a browser and log in with your admin credentials.

---

## 11. Seed the Database

The seed runs automatically on first start (inside the backend container CMD). If you need to run it manually:

```bash
docker compose exec backend node /scripts/seed.js
```

This creates:
- 50 diverse English samples across all 6 domains
- 8 language records (Kpelle, Bassa, Grebo, Vai, Mende, Loma, Krahn, Dan)
- The admin account defined by `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`

**Change the admin password immediately after first login** from the Dashboard → Security section.

---

## 12. Keeping the App Running

All containers use `restart: unless-stopped`, so they automatically restart after:
- Server reboots
- Container crashes
- Docker daemon restarts

Verify Docker starts on boot:
```bash
sudo systemctl enable docker
sudo systemctl status docker
```

---

## 13. Updates and Redeployment

```bash
cd /opt/liblingua

# Pull latest code
git pull origin main

# Rebuild and restart (zero-downtime is not guaranteed with this method)
docker compose build --no-cache
docker compose up -d

# Check logs after update
docker compose logs backend --tail=30
docker compose logs frontend --tail=10
```

### Rolling update (minimise downtime)

```bash
# Build new images without stopping the running containers
docker compose build --no-cache

# Recreate only changed services
docker compose up -d --no-deps backend
docker compose up -d --no-deps frontend
```

---

## 14. Backups

### Database backup

```bash
# Dump the database to a compressed file
docker compose exec db pg_dump \
  -U ${POSTGRES_USER:-postgres} \
  ${POSTGRES_DB:-liblingua_db} \
  | gzip > /opt/backups/liblingua_db_$(date +%Y%m%d_%H%M%S).sql.gz
```

Add to crontab for automated daily backups at 2 AM:
```bash
sudo mkdir -p /opt/backups
crontab -e
```
Add:
```cron
0 2 * * * cd /opt/liblingua && docker compose exec -T db pg_dump -U postgres liblingua_db | gzip > /opt/backups/liblingua_db_$(date +\%Y\%m\%d).sql.gz
```

### Database restore

```bash
# Restore from a backup file
gunzip -c /opt/backups/liblingua_db_20260101.sql.gz | \
  docker compose exec -T db psql \
  -U ${POSTGRES_USER:-postgres} \
  ${POSTGRES_DB:-liblingua_db}
```

### Audio uploads backup

Audio files are stored in the `uploads_data` Docker volume. To back them up:

```bash
# Copy uploads out of the Docker volume to a local directory
docker run --rm \
  -v liblingua_uploads_data:/data \
  -v /opt/backups:/backup \
  alpine tar czf /backup/liblingua_uploads_$(date +%Y%m%d).tar.gz -C /data .
```

### GCP-native backup (recommended)

Use **GCP Persistent Disk snapshots** to snapshot the entire instance disk daily:
```bash
gcloud compute disks snapshot YOUR_DISK_NAME \
  --snapshot-names liblingua-backup-$(date +%Y%m%d) \
  --zone YOUR_ZONE
```

---

## 15. Logs and Monitoring

### View live logs

```bash
# All containers
docker compose logs -f

# Backend only (most useful)
docker compose logs -f backend

# Frontend nginx
docker compose logs -f frontend

# Database
docker compose logs -f db
```

### Log files on disk

Backend writes structured logs to `./logs/` (mapped from `/app/logs` inside the container):
```bash
ls -lh /opt/liblingua/logs/
# application-YYYY-MM-DD.log  (daily rotating)
```

### Health monitoring

Set up a simple cron-based health check:
```bash
crontab -e
```
Add:
```cron
*/5 * * * * curl -sf https://liblingua.yourdomain.com/api/health || \
  cd /opt/liblingua && docker compose up -d
```

For production monitoring, connect GCP **Cloud Monitoring** or an external uptime tool (UptimeRobot, BetterUptime) to `https://liblingua.yourdomain.com/api/health`.

---

## 16. Troubleshooting

### Container won't start

```bash
docker compose logs backend --tail=50
docker compose logs db --tail=20
```

### Port conflict with existing app

```bash
# Find what's using a port
sudo ss -tlnp | grep :3000
sudo ss -tlnp | grep :5432

# Change the host port in docker-compose.yml as described in §6, then:
docker compose down
docker compose up -d
```

### nginx 502 Bad Gateway

The frontend container is not reachable on the configured host port. Check:
```bash
# Is the container running?
docker compose ps

# Is the port mapped correctly?
docker compose port frontend 80
# Should output: 0.0.0.0:3000

# Test direct connection (bypass nginx)
curl http://127.0.0.1:3000/api/health
```

### Database connection refused

```bash
# Check DB container is healthy
docker compose ps db
docker compose logs db --tail=20

# Verify DATABASE_URL in .env matches the container service name
grep DATABASE_URL .env
# Should contain @db:5432 (internal Docker hostname, not localhost)
```

### Migrations / schema changes after update

```bash
docker compose exec backend npx prisma db push
```

### Out of disk space

```bash
df -h

# Remove unused Docker images and containers
docker system prune -f

# Remove unused volumes (CAUTION: only if you have a backup)
docker volume prune -f
```

### Reset admin password

```bash
# Connect to the running backend container
docker compose exec backend node -e "
const bcrypt = require('bcryptjs');
const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();
bcrypt.hash('NewPassword123!', 12).then(h =>
  prisma.contributor.update({
    where: { email: 'your-admin@example.com' },
    data: { password_hash: h }
  }).then(() => { console.log('Done'); prisma.\$disconnect(); })
);"
```

---

## Quick Reference Card

```bash
# Start
cd /opt/liblingua && docker compose up -d

# Stop
docker compose down

# Restart a single service
docker compose restart backend

# Rebuild after code change
docker compose build --no-cache && docker compose up -d

# Check status
docker compose ps

# Live logs
docker compose logs -f backend

# Database backup
docker compose exec -T db pg_dump -U postgres liblingua_db | \
  gzip > /opt/backups/liblingua_db_$(date +%Y%m%d).sql.gz

# Health check
curl https://liblingua.yourdomain.com/api/health
```

---

## Security Checklist Before Going Live

- [ ] Change `POSTGRES_PASSWORD` from default (use `openssl rand -hex 32`)
- [ ] Change `JWT_SECRET` to a long random string (use `openssl rand -hex 64`)
- [ ] Change `SEED_ADMIN_PASSWORD` and update it in the platform after first login
- [ ] Set `NODE_ENV=production`
- [ ] Set `FRONTEND_URL` to your actual HTTPS domain
- [ ] SSL certificate installed and HTTP→HTTPS redirect enabled
- [ ] Ports 3000, 4000, 5432 **not** open in GCP firewall (only 80 and 443)
- [ ] Stripe keys switched from `sk_test_` to `sk_live_`
- [ ] MTN MoMo environment switched from `sandbox` to `production`
- [ ] Database backups scheduled (crontab or GCP snapshots)
- [ ] Admin password changed on first login
