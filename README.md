# BIO Cleaning LLC — Backend API Infrastructure

![BIO Cleaning LLC Banner](https://bio-cleaning-llc.vercel.app/og-image.jpg)

This is the enterprise backend engine powering **BIO Cleaning LLC**, an eco-friendly cleaning service and field management platform. Engineered with **Express.js**, **TypeScript**, **MongoDB**, and **Redis**, this service delivers real-time booking orchestration, dynamic capacity scheduling, field staff dispatch, CRM pipeline management, automated invoicing with Stripe, customer self-service portals, and background worker automation.

---

## 🚀 Live Ecosystem & Credentials

- **Production API**: [https://bio-cleaning-backends.vercel.app/](https://bio-cleaning-backends.vercel.app/)
- **Frontend Client**: [https://bio-cleaning-llc.vercel.app/](https://bio-cleaning-llc.vercel.app/)
- **Admin Access Portal**: `/admin/login`
  - Default Admin Email: `faysaladmin@gmail.com`
  - Default Admin Password: `Password123@`

---

## 🏗 System Architecture & Technology Stack

- **Runtime & Language**: Node.js >= 20.0.0, TypeScript 5.9
- **Framework**: Express.js 5.1
- **Database**: MongoDB 8.19 (Mongoose ODM with ACID transaction support)
- **Cache & Distributed Locking**: Upstash Redis (TLS `rediss://`) with in-process memory fallback
- **Validation**: Zod 4.3 (strict request schema enforcement)
- **Security**: HttpOnly cookie-based dual-token sessions (Access + Refresh), CSRF tokens, strict CORS, CSP, HSTS, Rate Limiting, and Idempotency key handling
- **Communications**: Nodemailer (Gmail SMTP pool), SMS Webhook Gateway
- **Payments**: Stripe API, Stripe Checkout Sessions, and Raw Webhook signature verification
- **Media & Storage**: Cloudflare R2 Object Storage with automated Sharp WebP compression pipeline

---

## 📦 Domain Architecture (21 Modules)

```
src/domains/
├── Admin-Auth/      # Administrative user management & profile updates
├── Asset/           # File and media asset upload to Cloudinary
├── Audit/           # Tamper-evident immutable audit logs with IP hashing
├── Auth/            # Authentication, HttpOnly session cookies, CSRF, password resets
├── Booking/         # 8-step booking pipeline, pricing engine, waitlist, abandonment recovery
├── Contact/         # Contact inquiries & administrative email response system
├── Customer/        # Customer 360 profiles, LTV tracking, history, notes, and reviews
├── Dashboard/       # Executive metrics, 30-day comparative growth, recent reservations
├── FieldOps/        # Field job dispatch, status lifecycle, digital checklists, photos, issues
├── Finance/         # Financial counters and sequence number generators
├── Idempotency/     # Request deduplication with SHA-256 canonical body hashing
├── Invoice/         # Invoice generation (INV-XXXXX), PDF creation, balance & deposits
├── Lead/            # CRM pipeline Kanban, automated follow-up tasks, CSV lead import
├── MediaProcessing/ # Asynchronous Cloudinary image optimization queue & worker
├── Notification/    # Outbox delivery worker, Gmail SMTP pool, SMS webhook gateway
├── Payment/         # Stripe checkout, transaction ledger, recurring billing, refunds
├── Portal/          # Customer self-service portal, passwordless magic links, 1-click rebook
├── Quote/           # Instant cleaning price calculator & public estimate approval flow
├── Reporting/       # Business intelligence, revenue analytics, cleaner utilization
├── Retention/       # Automated lifecycle triggers (pre-service reminders, post-service review, win-back)
├── Review/          # Verified review collection, star ratings, moderation & Google review funnel
├── Scheduling/      # Capacity buckets, staff schedules, day-of-week rules, blackout dates
├── Service/         # Service catalog, sqft/bedroom/bathroom pricing matrices, add-ons
├── Team/            # Cleaner profiles, crew groupings, color codes, team RBAC
└── Website/         # Visual CMS for landing pages, SEO metadata, drafts, revision history
```

---

## ⚙️ Environment Variables Reference

Copy `.env.example` to `.env` and configure:

```env
# Runtime
NODE_ENV=development
PORT=9500
BACKEND_IP=0.0.0.0

# Database (Requires Replica Set / Atlas for Transactions)
DATABASE_URL=mongodb+srv://USER:PASSWORD@HOST/bio-cleaning

# Frontend / CORS
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Authentication & Sessions
JWT_SECRET=replace_with_64_char_secret
JWT_REFRESH_SECRET=replace_with_different_64_char_secret
ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=7
REMEMBER_ME_REFRESH_TOKEN_TTL_DAYS=30

# Cookies
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax

# Upstash Redis (TLS rediss://)
REDIS_URL=rediss://default:PASSWORD@HOST.upstash.io:6379

# Email (Gmail SMTP)
EMAIL_USERNAME=your_gmail@gmail.com
EMAIL_PASSWORD=your_16_char_google_app_password

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudflare R2 Object Storage (Images auto-compressed to WebP)
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=bio-cleaning-media
R2_PUBLIC_URL=https://pub-xxxx.r2.dev

# Customer Portal & Retention
PORTAL_SESSION_DAYS=30
PORTAL_MAGIC_LINK_MINUTES=20
NOTIFICATION_WORKER_INTERVAL_MS=5000
NOTIFICATION_MAX_ATTEMPTS=5
RETENTION_SWEEP_INTERVAL_MS=300000
COMMUNICATIONS_CRON_SECRET=replace_with_random_cron_secret
SMS_PROVIDER=disabled
PUBLIC_REVIEW_URL=https://g.page/r/your-business/review

# Operations & Auditing
APP_RELEASE=1.0.0
AUDIT_LOG_RETENTION_DAYS=180
AUDIT_IP_SALT=replace_with_random_ip_salt
MEDIA_WORKER_INTERVAL_MS=10000
BACKUP_RETENTION_DAYS=14
BACKUP_DIR=./backups
MONGODUMP_BIN=mongodump
```

---

## 🚀 Getting Started

### 1. Installation
```bash
pnpm install
```

### 2. Type Checking & Verification
```bash
pnpm run typecheck
```

### 3. Running Locally
```bash
pnpm run dev
```
The server will start on `http://localhost:9500`.
Health check: `GET http://localhost:9500/health`
Ready check: `GET http://localhost:9500/ready`

---

## 🛠 Database Maintenance & Migration Scripts

| Command | Description |
| :--- | :--- |
| `npm run crm:backfill:dev` | Syncs historical bookings into CRM Leads & Customer 360 records. |
| `npm run fieldops:backfill:dev` | Generates dispatched `Job` instances and task checklists for past bookings. |
| `npm run finance:backfill:dev` | Backfills `Invoice` documents and financial counters. |
| `npm run services:backfill-slugs:dev` | Generates URL-friendly slugs for all active cleaning services. |
| `npm run team:bootstrap-owner:dev -- email@example.com` | Promotes an administrator to the root `owner` role. |
| `npm run backup:mongodb` | Creates a compressed, timestamped MongoDB archive dump in `./backups`. |
| `npm run restore:mongodb -- <path>` | Restores a database backup from a `.archive.gz` file. |

---

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](./LICENSE) for details.
