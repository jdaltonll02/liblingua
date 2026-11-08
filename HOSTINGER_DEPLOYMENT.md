# Hostinger deployment

## Feasibility decision

This application fits Hostinger's managed Node.js Web App product on the current Business plan. It is deployed as one Express application: the root build compiles the Vite frontend, and Express serves the generated `frontend/dist` files alongside `/api`. Docker and nginx are not used on Hostinger.

The existing Hostinger database is also usable. Hostinger exposes MariaDB through its MySQL-compatible interface, while the original application uses PostgreSQL. The dedicated `backend/prisma-hostinger` schema and migration preserve the Docker/PostgreSQL development schema and provide the MariaDB deployment target. Runtime queries have been made connector-neutral except for `SELECT ... FOR UPDATE`, which both engines support.

Hostinger Email works with the existing Nodemailer service. User uploads must use S3-compatible object storage: files written inside a managed deployment build are not a durable storage strategy and can disappear on redeploy.

## Account resources found

- Plan: Business Web Hosting (`hostinger_business_v7`)
- Production domain: `liblingua.gibtechs.com`
- Domain status: accessible in Hostinger, with no existing website occupying it
- Existing database: `u549727073_ldcdb`
- Existing database user: `u549727073_ldcdadmin`
- App-side database host: `127.0.0.1:3306` (do not use the external `srv*.hstgr.io` hostname from the deployed app)
- Database quota: 3 GB

No deployment is performed by this preparation. Create `liblingua.gibtechs.com` as a new Node.js Web App on the current Business hosting order; it is a clean target and does not require replacing the existing `ldclib.org` website. The existing database is currently associated with `ldclib.org`, but it is under the same hosting account and can be reused from the new app through `127.0.0.1`.

## Hostinger build settings

Use these settings when creating/importing the Web App:

| Setting | Value |
| --- | --- |
| Application type | Express |
| Node version | 20.x |
| Root directory | `.` |
| Package manager | npm |
| Build script | `build` / `npm run build` |
| Entry file | `backend/src/index.js` |
| Output directory | leave empty |

The root build performs reproducible installs in `backend` and `frontend`, generates the MariaDB Prisma Client, applies pending MariaDB migrations, and builds the React frontend. Hostinger supplies `PORT`; do not set a custom production port.

## Environment variables

Copy the keys from `.env.hostinger.example` into the Hostinger Web App environment-variable screen and replace every placeholder. Do not upload a real `.env` file or commit credentials.

Important details:

- `DATABASE_URL` must start with `mysql://` and use `127.0.0.1`, not `localhost` and not the external database hostname.
- Percent-encode special characters in the database password before putting it in the URL.
- Create or select the Hostinger mailbox that will send LibLingua messages. Put its complete email address in both `SMTP_USER` and `SMTP_FROM`. Hostinger SMTP uses port 465 with `SMTP_SECURE=true`; port 587 with `SMTP_SECURE=false` is the fallback.
- `FRONTEND_URL` and `OAUTH_CALLBACK_BASE` must be the final HTTPS origin without a trailing slash.
- Configure OAuth callback URLs as `https://liblingua.gibtechs.com/api/auth/google/callback` and `https://liblingua.gibtechs.com/api/auth/github/callback` if those providers are enabled.
- `S3_*` values may point to AWS S3, Cloudflare R2, Backblaze B2, or another S3-compatible service. Confirm that uploaded objects are publicly readable or delivered through an appropriate public/CDN URL, because the application stores the returned object URL.
- `VITE_SENTRY_DSN` is a build-time value. Changing it requires a redeploy; ordinary server secrets only require an application restart.

## Database initialization and migration

The Hostinger build runs `prisma migrate deploy` against `backend/prisma-hostinger`. On a new empty database this creates the complete schema. Before the first deployment, inspect `u549727073_ldcdb` in phpMyAdmin:

1. If it is empty, deploy normally.
2. If it already contains this application's tables but has no `_prisma_migrations` history, do not deploy yet; baseline or recreate the database after making a backup.
3. If production data still lives in PostgreSQL, migrate that data separately. Do not point the MariaDB build at a PostgreSQL URL. Export tables while preserving UUID primary/foreign keys, import them in dependency order, verify row counts and relationships, then deploy the app.

The schema migration intentionally does not run the seed script. Seeding creates a privileged admin and sample content and must be an explicit one-time decision. If required after the schema is ready, run `npm run db:seed` with `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, and `DATABASE_URL` set in a controlled environment.

## First-deployment checks

After Hostinger reports the build complete:

1. Open `/api/health` and confirm a JSON response with `status: ok`.
2. Open the site root and a client-side route directly to verify the SPA fallback.
3. Register a test account and confirm the Hostinger verification email arrives.
4. Sign in and verify the secure session cookie.
5. Upload an avatar and audio recording, then confirm both still load after a redeploy.
6. Exercise `/api/stats` and sample selection to verify MariaDB query compatibility.
7. Review Hostinger runtime logs for Prisma, SMTP, CORS, or object-storage errors.

## Rollback

Keep the old VM and PostgreSQL database read-only until the Hostinger deployment, mail, uploads, OAuth, and payment callbacks have been verified. DNS rollback is then a routing change rather than a data-recovery exercise. Take a MariaDB backup before every schema change and keep object-storage versioning or lifecycle backups enabled.
