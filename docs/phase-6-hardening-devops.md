# Phase 6: Hardening, Security & Production Launch

> **Status:** 📋 Documented
> **Target Timeline:** Weeks 27–30
> **Key Goal:** Production-grade security hardening including 2FA (TOTP) for all elevated roles, IP allowlist, session management, penetration test checklist, SLA monitoring, data export/deletion (GDPR-style), and final CI/CD pipeline for zero-downtime deployment.

---

## 1. Scope & Features

### 1.1 Two-Factor Authentication (2FA / TOTP)
- **Required for**: Super Admin, Sales Manager, PM.
- **Optional for**: Developer, Sales Agent.
- **Client**: Not required (simpler UX priority).
- TOTP standard (Google Authenticator / Authy compatible).
- Flow:
  1. User enables 2FA from settings: scans QR code.
  2. Verify one-time code to confirm setup.
  3. On next login: email + password → 2FA code prompt.
  4. Recovery codes: 8 one-time backup codes generated and downloadable.
- Failed 2FA attempts: lock account after 5 consecutive failures.

### 1.2 Session Management
- Users can see all active sessions: device, IP, browser, last active timestamp.
- "Revoke this session" button (revokes that Sanctum token).
- "Revoke all other sessions" button.
- Admin can force-revoke any user's sessions from the user management panel.

### 1.3 IP Allowlist (Admin Panel)
- Super Admin can configure allowed IP ranges for admin portal access.
- Stored in `security_settings` table as JSON.
- Middleware checks IP on admin routes and blocks unauthorized IPs with HTTP 403.
- Support for CIDR notation (e.g., `192.168.1.0/24`).

### 1.4 Data Export & Deletion (GDPR-style)
- **Data export**: User (or admin) can request export of all their data.
  - Generates a ZIP: leads, follow-ups, timeline, invoices, messages, feedback.
  - Delivered via email download link (presigned, 24h expiry).
  - Background job: `ExportUserDataJob`.
- **Data deletion**: Admins can delete client/lead data on request.
  - Hard delete after 30-day retention period (soft delete first).
  - Linked audit log entries remain (anonymized — name replaced with [DELETED]).

### 1.5 SLA Monitoring
- Service tiers configurable in admin settings:
  - Tier 1 (Urgent): Response within 4 hours.
  - Tier 2 (High): Response within 8 hours.
  - Tier 3 (Medium): Response within 24 hours.
- Scheduler checks open tickets every 15 minutes against SLA deadlines.
- SLA breach: alert to Account Manager + flag ticket in red.
- SLA metrics report: % of tickets resolved within SLA per month.

### 1.6 Penetration Testing Checklist (Pre-launch)
Before production launch, verify all items:

**Authentication & Authorization**
- [ ] SQL injection on all input fields.
- [ ] IDOR (Insecure Direct Object Reference) — access another client's data by changing ID.
- [ ] Privilege escalation — Sales Agent cannot access admin endpoints.
- [ ] JWT/Sanctum token replay attack protection.
- [ ] Session fixation attack protection.

**API Security**
- [ ] Rate limiting on auth endpoints (`/login`, `/register`, `/2fa`).
- [ ] Rate limiting on public API (by API key, 100 req/min).
- [ ] Webhook HMAC signature verification working.
- [ ] CORS configured correctly (only `app.company.com` and `api.company.com` allowed).

**File Upload**
- [ ] MIME type validation (not just extension).
- [ ] File size limits enforced at server level.
- [ ] No PHP/script files can be uploaded.
- [ ] Files stored in private S3 bucket, only accessible via presigned URLs.

**Data Isolation**
- [ ] Agent cannot read another agent's leads (tested with explicit ID guessing).
- [ ] Client cannot read another client's project data.
- [ ] Developer cannot access unassigned projects.

**Infrastructure**
- [ ] HTTPS enforced everywhere (HSTS header).
- [ ] Passwords hashed with bcrypt (cost ≥ 12) or Argon2id.
- [ ] Database credentials in `.env`, never in code.
- [ ] Error messages don't expose stack traces in production.
- [ ] Telescope and Swagger disabled in production.

### 1.7 Policies & Middleware Audit
- Full review of all `Policy` classes — ensure every route uses `$this->authorize()` or middleware `can:`.
- Global scope audit: `AgentScope`, `ClientScope`, `DeveloperScope` tested end-to-end.
- All `FormRequest` classes verified — no missing rules.

### 1.8 Rate Limiting
| Endpoint Group | Limit |
|---|---|
| Login attempts | 5/min per IP + 10/min per email |
| Password reset | 3/hour per email |
| API v1 (authenticated) | 300/min per user |
| Public API (API key) | 100/min per key |
| WhatsApp webhook inbound | 200/min per IP |
| File upload | 20/min per user |

### 1.9 Presigned Upload Architecture (S3/R2)
All file uploads go directly from browser to S3, never through the Laravel server:
```
1. Frontend requests upload URL: POST /api/v1/storage/presign
2. Laravel generates presigned PUT URL (5-min expiry) via S3 SDK
3. Browser uploads directly to S3 with correct Content-Type
4. After upload, frontend calls: POST /api/v1/storage/confirm (path, size, mime)
5. Laravel validates mime type, stores file record
```

### 1.10 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml triggers on push to main

jobs:
  test:
    - php artisan test (MySQL test database)
    - npm run build (Vite production build)
    - ./vendor/bin/pest --coverage (min 80% coverage)

  deploy:
    - SSH into server
    - git pull origin main
    - composer install --no-dev --optimize-autoloader
    - php artisan migrate --force
    - php artisan config:cache && route:cache && view:cache
    - npm ci && npm run build
    - sudo supervisorctl restart all
    - Zero-downtime: artisan down --refresh=5 → deploy → artisan up
```

### 1.11 Monitoring & Observability

| Tool | Purpose |
|---|---|
| **Sentry** | Runtime error tracking (frontend + backend) |
| **Laravel Telescope** | Dev-only: queries, requests, jobs (disabled in production) |
| **Laravel Horizon** | Queue worker dashboard + job failure alerts |
| **Uptime Robot / Betterstack** | Uptime monitoring, alert on downtime |
| **Cloudwatch / Datadog** | Server metrics: CPU, memory, response time |
| **Slack alerts** | Queue failures, 5xx spikes, payment failures → #alerts channel |

### 1.12 Backup & Disaster Recovery
- **Database**: Automated daily MySQL backup to S3 (separate bucket, versioned).
- **Files**: S3 versioning enabled — deleted files recoverable for 30 days.
- **Backup test**: Monthly restore drill — restore to staging and verify application health.
- **Point-in-time recovery**: MySQL binary logs retained for 7 days.
- RTO (Recovery Time Objective): < 2 hours.
- RPO (Recovery Point Objective): < 24 hours.

---

## 2. Database Schema (Phase 6)

### 2.1 Table: `two_factor_auth`
| Column | Type | Attributes | Description |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, Auto-increment | |
| `user_id` | BIGINT UNSIGNED | Unique, FK → users.id | |
| `secret` | VARCHAR(255) | | Encrypted TOTP secret |
| `recovery_codes` | JSON | | Encrypted list of 8 one-time codes |
| `enabled_at` | DATETIME | Nullable | |
| `confirmed` | BOOLEAN | Default: false | Confirmed setup? |
| `timestamps` | TIMESTAMP | | |

### 2.2 Table: `security_settings`
| Column | Type | Attributes | Description |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, Auto-increment | |
| `key` | VARCHAR(100) | Unique | 'admin_ip_allowlist', 'session_timeout_minutes', etc. |
| `value` | JSON | | Setting value |
| `updated_by` | BIGINT UNSIGNED | FK → users.id | Last changed by admin |
| `timestamps` | TIMESTAMP | | |

### 2.3 Table: `data_export_requests`
| Column | Type | Attributes | Description |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, Auto-increment | |
| `user_id` | BIGINT UNSIGNED | FK → users.id | Requester |
| `type` | ENUM | 'user_data', 'client_data' | |
| `status` | ENUM | 'pending', 'processing', 'ready', 'expired' | |
| `download_url` | VARCHAR(500) | Nullable | Presigned download URL |
| `expires_at` | DATETIME | Nullable | |
| `timestamps` | TIMESTAMP | | |

### 2.4 Table: `sla_configs`
| Column | Type | Attributes | Description |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, Auto-increment | |
| `tier` | ENUM | 'urgent', 'high', 'medium', 'low' | Maps to service_requests.priority |
| `response_hours` | INT | | SLA breach threshold (hours) |
| `is_active` | BOOLEAN | Default: true | |
| `timestamps` | TIMESTAMP | | |

---

## 3. Backend Architecture & Contracts

### 3.1 Service Interfaces

**`App\Contracts\Services\TwoFactorAuthServiceInterface`**
- `generateSecret(User $user): string`
- `verifyAndEnable(User $user, string $code): bool`
- `validateTotpCode(User $user, string $code): bool`
- `validateRecoveryCode(User $user, string $code): bool`
- `disable(User $user): void`

**`App\Contracts\Services\SessionManagementServiceInterface`**
- `getActiveSessions(User $user): Collection`
- `revokeSession(User $user, int $tokenId): void`
- `revokeAllOtherSessions(User $user, int $currentTokenId): void`

**`App\Contracts\Services\DataExportServiceInterface`**
- `requestExport(User $user, string $type): DataExportRequest`
- `generateUserDataArchive(DataExportRequest $request): string` (returns S3 URL)

**`App\Contracts\Services\SlaMonitoringServiceInterface`**
- `checkAndFlagBreaches(): int`
- `getSlaMetricsReport(string $period): array`

### 3.2 Security Middleware Stack
```
api.php middleware stack:
1. ThrottleRequests (rate limiting)
2. Authenticate (Sanctum)
3. CheckTwoFactorVerified (if role requires 2FA)
4. CheckIpAllowlist (admin routes only)
5. EnforceImpersonationRestrictions (when X-Impersonated-By present)
```

### 3.3 Scheduled Commands
```php
// routes/console.php

// Every 15 minutes: check SLA breaches on open tickets
Schedule::command('sla:check-breaches')->everyFifteenMinutes();

// Daily at 3 AM: clean expired presigned URLs and old export files
Schedule::command('storage:cleanup-expired')->dailyAt('03:00');

// Weekly: send SLA metrics report to admin
Schedule::command('sla:send-weekly-report')->weeklyOn(1, '09:00');
```

---

## 4. API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/v1/auth/2fa/setup` | Generate TOTP QR code | Sanctum |
| `POST` | `/api/v1/auth/2fa/verify` | Confirm TOTP code + enable | Sanctum |
| `POST` | `/api/v1/auth/2fa/validate` | Validate TOTP at login step 2 | Unauthenticated + temp token |
| `DELETE` | `/api/v1/auth/2fa/disable` | Disable 2FA | Sanctum |
| `GET` | `/api/v1/auth/sessions` | List active sessions | Sanctum |
| `DELETE` | `/api/v1/auth/sessions/{id}` | Revoke specific session | Sanctum |
| `DELETE` | `/api/v1/auth/sessions` | Revoke all other sessions | Sanctum |
| `GET` | `/api/v1/settings/security` | Get security settings | Sanctum (Admin) |
| `PATCH` | `/api/v1/settings/security` | Update IP allowlist, session timeout | Sanctum (Super Admin) |
| `POST` | `/api/v1/data/export-request` | Request personal data export | Sanctum |
| `GET` | `/api/v1/data/export-request/{id}` | Check export status + download link | Sanctum |
| `GET` | `/api/v1/admin/sla/metrics` | SLA performance metrics | Sanctum (Admin+) |
| `POST` | `/api/v1/storage/presign` | Get presigned upload URL | Sanctum |
| `POST` | `/api/v1/storage/confirm` | Confirm file upload completion | Sanctum |

---

## 5. Frontend Deliverables

### 5.1 Two-Factor Authentication Setup
- QR code display with manual entry fallback key.
- Verification code input (6-digit, auto-submit on fill).
- Recovery codes download prompt (must acknowledge before enabling).
- Login flow: email/password page → 2FA code page → dashboard.

### 5.2 Active Sessions Manager
- Cards showing: device icon (mobile/desktop), IP, browser, last active.
- "Revoke" button per session.
- "Sign out everywhere else" button.

### 5.3 Security Settings (Admin)
- IP Allowlist editor: add/remove CIDR ranges.
- Session timeout configuration (default 480 minutes).
- Security log: recent failed logins, IP blocks.

### 5.4 Data Export Request
- "Request My Data Export" button in profile settings.
- Status tracker: Pending → Processing → Ready (with download button).
- Download link with expiry countdown.

### 5.5 SLA Monitoring Dashboard
- Ticket table with SLA deadline column (green/yellow/red based on time remaining).
- Breach rate chart: % within SLA per week.
- By-priority breakdown.

---

## 6. Definition of Done (Phase 6)

- [ ] TOTP 2FA setup, verify, login, and recovery code flow fully tested.
- [ ] 2FA required for Super Admin, Sales Manager, PM on login.
- [ ] Session revocation: revoked token is rejected on next API call.
- [ ] IP allowlist blocks requests from non-whitelisted IPs on admin routes.
- [ ] Data export: ZIP generated with all user data, delivered via presigned link.
- [ ] Hard data deletion verified: lead soft-deleted, audit log entries anonymized.
- [ ] SLA breach detection: urgent tickets flagged after 4-hour mark.
- [ ] Penetration testing checklist: all items manually tested and passed.
- [ ] Rate limiting verified: login lockout after 5 failed attempts in 1 minute.
- [ ] IDOR test: accessing /api/v1/clients/{other_client_id} returns 403.
- [ ] Privilege escalation test: agent token rejected on admin endpoints.
- [ ] CI/CD pipeline: push to main → tests pass → staging deployed automatically.
- [ ] Backup restore drill: staging database restored from backup, application functions correctly.
- [ ] Telescope confirmed disabled in production environment.
- [ ] All Swagger docs disabled or password-protected in production.
- [ ] Uptime monitoring configured, admin alerted within 2 minutes of downtime.
