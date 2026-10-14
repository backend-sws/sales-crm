# Phase 7: Mobile PWA, Full-text Search & Multi-org Readiness

> **Status:** 📋 Documented (Future Phase)
> **Target Timeline:** Weeks 31–38
> **Key Goal:** Extend the platform to mobile-first users (Progressive Web App for Sales Agents), add enterprise-grade full-text search via Meilisearch, introduce an internal knowledge base/SOP wiki, and architect multi-organization (multi-tenant) readiness so the platform can be productized into a SaaS offering.

---

## 1. Scope & Features

### 1.1 Progressive Web App (PWA) for Sales Agents
- The existing React frontend will be enhanced as a PWA:
  - **Service Worker**: Offline mode for viewing today's follow-ups and cached lead data.
  - **Add to Home Screen**: `manifest.json` with branded icon, splash screen, theme color.
  - **Push Notifications**: Web Push (VAPID keys) for follow-up reminders, overdue alerts, new lead assigned.
- **Mobile-optimized screens** (priority):
  1. Today's Follow-ups widget (swipe to complete, snooze).
  2. Quick Lead Add form (phone, name, source, priority).
  3. Lead search (name, phone).
  4. Follow-up completion with outcome notes.
- **Geolocation (optional)**: Tag a follow-up with "visited in person" + lat/lng stored.

### 1.2 Full-text Search (Meilisearch / Typesense)
- Problem: At 10,000+ leads, MySQL LIKE queries become slow.
- Solution: **Laravel Scout** with Meilisearch driver.
- **What is indexed**:
  - Leads: name, phone, email, company, notes, tags, source, status.
  - Clients: name, company, email.
  - Projects: name, description.
  - Tasks: title, description, comments.
- Instant search (< 50ms) with typo-tolerance.
- **Global search bar** (⌘K / Ctrl+K): Search across all models, show categorized results.
- Filterable results by entity type.
- Re-indexing command: `php artisan scout:import "App\Models\Lead"`.

### 1.3 Internal Knowledge Base (SOP Wiki)
- Team-facing wiki for SOPs, playbooks, and process documentation.
- Features:
  - **Page editor**: Rich text (Tiptap) with markdown support, images, code blocks.
  - **Page versioning**: Every save creates a new version (diff viewable).
  - **Categories**: Nested categories (e.g. Sales > Follow-up SOP, Projects > CR Process).
  - **Access control**: Some pages "Admin only", others "All team" or "Developers only".
  - **Search**: Indexed in Meilisearch alongside leads.
- Tables: `wiki_pages`, `wiki_page_versions`, `wiki_categories`, `wiki_page_access`.
- Not visible to clients — internal only.

### 1.4 Multi-Organization (Multi-tenant) Architecture
> This is a preparatory phase to transform the platform into a SaaS product where each "organization" (agency) is an isolated tenant.

**Strategy: Single Database, Row-level Isolation**
- Add `organization_id` (FK → `organizations`) to all core tables:
  - `users`, `leads`, `clients`, `projects`, `tasks`, `invoices`, etc.
- **Global Scope**: `OrganizationScope` automatically appends `WHERE organization_id = current_org_id` to all queries.
- **Tenant resolution**: Read organization from:
  1. Subdomain: `agencyname.platform.com` → resolve `organization_id`.
  2. API Key: public API tokens include `organization_id`.
  3. Sanctum token: `personal_access_tokens.tokenable` stores `organization_id`.
- **Super Admin (Platform admin)**: Can switch between organizations, see cross-org metrics.
- **Organization settings**: Each org has its own branding, email templates, notification channels.

**Database additions:**
```sql
CREATE TABLE organizations (
    id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(100) UNIQUE NOT NULL,  -- subdomain
    custom_domain VARCHAR(255) UNIQUE,
    plan        ENUM('starter','professional','enterprise') DEFAULT 'starter',
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP
);
-- Add organization_id BIGINT UNSIGNED FK to: users, leads, clients, projects, tasks, invoices...
```

**Billing for multi-tenant SaaS (Future):**
- Per-organization subscription: Starter (up to 3 agents, 1,000 leads), Professional, Enterprise.
- Usage tracking: `organization_usage_snapshots` table (monthly snapshot of users, leads, projects).
- Stripe integration for SaaS billing (separate from Razorpay client billing).

### 1.5 Advanced Notification Preferences
- Each user sets notification preferences per channel:
  - Email: on/off per event type.
  - WhatsApp: on/off per event type.
  - In-app: always on.
  - Push (PWA): on/off per device.
- Stored in `notification_preferences` table.
- **Do Not Disturb**: Set quiet hours (e.g. 10 PM – 8 AM). No notifications outside work hours.
- **Digest mode**: Instead of individual notifications, group into hourly digest.

### 1.6 Performance Optimization at Scale

| Problem | Solution |
|---|---|
| Analytics slow at 50K+ leads | Read replica for reporting queries |
| Search slow | Meilisearch (sub-50ms) |
| File download latency | CloudFront CDN in front of S3 |
| Real-time WebSocket scaling | Reverb with Redis pub/sub (multi-node) |
| Queue backlog | Horizon with multiple queues (high/default/low) |
| Cache invalidation | Event-driven cache clear (Redis tags) |

**Indexes audit (additions):**
```sql
-- Full-text search fallback for MySQL
ALTER TABLE leads ADD FULLTEXT INDEX ft_leads (name, phone, email, company);
ALTER TABLE tasks ADD FULLTEXT INDEX ft_tasks (title, description);
-- Composite for analytics
CREATE INDEX idx_leads_agent_status_date ON leads(assigned_to, status, created_at);
CREATE INDEX idx_time_entries_task_user ON time_entries(task_id, user_id, is_billable);
```

---

## 2. Database Schema (Phase 7)

### 2.1 Table: `organizations`
| Column | Type | Attributes | Description |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, Auto-increment | |
| `name` | VARCHAR(255) | | Agency name |
| `slug` | VARCHAR(100) | Unique | URL-safe identifier |
| `custom_domain` | VARCHAR(255) | Unique, Nullable | Custom app domain |
| `plan` | ENUM | 'starter', 'professional', 'enterprise' | Subscription tier |
| `max_users` | INT | Default: 10 | Plan limit |
| `max_leads` | INT | Default: 1000 | Plan limit |
| `is_active` | BOOLEAN | Default: true | |
| `timestamps` | TIMESTAMP | | |

### 2.2 Table: `wiki_pages`
| Column | Type | Attributes | Description |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, Auto-increment | |
| `organization_id` | BIGINT UNSIGNED | FK → organizations.id | |
| `category_id` | BIGINT UNSIGNED | Nullable, FK → wiki_categories.id | |
| `title` | VARCHAR(255) | | |
| `slug` | VARCHAR(255) | Indexed | URL-friendly title |
| `body` | LONGTEXT | | Tiptap HTML/JSON |
| `access_level` | ENUM | 'all', 'admin', 'developer', 'sales' | |
| `created_by` | BIGINT UNSIGNED | FK → users.id | |
| `timestamps` | TIMESTAMP | | |
| `deleted_at` | TIMESTAMP | Nullable | Soft delete |

### 2.3 Table: `notification_preferences`
| Column | Type | Attributes | Description |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, Auto-increment | |
| `user_id` | BIGINT UNSIGNED | Unique FK → users.id | |
| `preferences` | JSON | | Per-event, per-channel on/off map |
| `dnd_start_time` | TIME | Nullable | Do Not Disturb start |
| `dnd_end_time` | TIME | Nullable | Do Not Disturb end |
| `digest_mode` | BOOLEAN | Default: false | Hourly grouping |
| `timestamps` | TIMESTAMP | | |

---

## 3. Backend Architecture & Contracts

### 3.1 Service Interfaces

**`App\Contracts\Services\SearchServiceInterface`**
- `globalSearch(string $query, ?User $actor, array $types = []): array`
- `indexModel(Model $model): void`
- `removeFromIndex(Model $model): void`

**`App\Contracts\Services\WikiServiceInterface`**
- `createPage(array $data, User $author): WikiPage`
- `updatePage(WikiPage $page, array $data, User $editor): WikiPage`
- `getPageVersions(WikiPage $page): Collection`
- `restoreVersion(WikiPage $page, int $versionId, User $actor): WikiPage`

**`App\Contracts\Services\MultiTenantServiceInterface`**
- `resolveOrganizationFromRequest(Request $request): Organization`
- `switchOrganization(User $platformAdmin, int $orgId): void`
- `getOrganizationUsageSnapshot(Organization $org): array`

**`App\Contracts\Services\PushNotificationServiceInterface`**
- `subscribeDevice(User $user, string $endpoint, string $p256dh, string $auth): void`
- `sendPush(User $user, string $title, string $body, string $url): void`
- `removeDevice(User $user, string $endpoint): void`

### 3.2 Scout Meilisearch Configuration

```php
// config/scout.php
'driver' => env('SCOUT_DRIVER', 'meilisearch'),

// app/Models/Lead.php
use Laravel\Scout\Searchable;

class Lead extends Model
{
    use Searchable;

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'company' => $this->company,
            'status' => $this->status,
            'priority' => $this->priority,
            'organization_id' => $this->organization_id, // tenant filter
        ];
    }

    public function searchableAs(): string
    {
        return 'leads';
    }
}
```

### 3.3 OrganizationScope (Multi-tenant Guard)

```php
// app/Scopes/OrganizationScope.php
class OrganizationScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $orgId = app('current_organization_id');
        if ($orgId) {
            $builder->where($model->getTable() . '.organization_id', $orgId);
        }
    }
}
```

### 3.4 Scheduled Commands

```php
// routes/console.php

// Nightly: re-index Meilisearch (catch any missed updates)
Schedule::command('scout:flush App\\Models\\Lead && php artisan scout:import App\\Models\\Lead')
    ->weeklyOn(7, '03:00'); // Weekly full re-index (Sunday 3 AM)

// Monthly: snapshot organization usage for billing
Schedule::command('orgs:snapshot-usage')->monthlyOn(1, '00:00');
```

---

## 4. API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/search?q={query}&type={leads,clients,tasks}` | Global full-text search | Sanctum |
| `GET` | `/api/v1/wiki/pages` | List wiki pages | Sanctum |
| `GET` | `/api/v1/wiki/pages/{slug}` | Get wiki page content | Sanctum |
| `POST` | `/api/v1/wiki/pages` | Create wiki page | Sanctum (Admin+) |
| `PUT` | `/api/v1/wiki/pages/{id}` | Update wiki page | Sanctum (Admin+) |
| `GET` | `/api/v1/wiki/pages/{id}/versions` | Page version history | Sanctum |
| `POST` | `/api/v1/push/subscribe` | Register PWA push subscription | Sanctum |
| `DELETE` | `/api/v1/push/subscribe` | Remove push subscription | Sanctum |
| `GET` | `/api/v1/settings/notifications` | Get notification preferences | Sanctum |
| `PATCH` | `/api/v1/settings/notifications` | Update notification preferences | Sanctum |
| `GET` | `/api/v1/admin/organizations` | List organizations (Platform Admin) | Platform Admin |
| `POST` | `/api/v1/admin/organizations` | Create new organization | Platform Admin |
| `GET` | `/api/v1/admin/organizations/{id}/usage` | Usage snapshot | Platform Admin |

---

## 5. Frontend Deliverables

### 5.1 PWA Service Worker & Manifest
- `manifest.json`: app name, icons (192x192, 512x512), theme_color, background_color, start_url.
- `service-worker.ts` (Workbox): cache-first for static assets, network-first for API.
- Install prompt: "Add to Home Screen" toast after 3 visits.

### 5.2 Mobile-optimized Follow-up Screen
- Bottom navigation (4 tabs: Today, Leads, Kanban, Profile).
- Swipe right = Mark Done + open outcome form.
- Swipe left = Snooze 1 hour.
- Large tap targets, minimal typing required.

### 5.3 Global Search (⌘K Modal)
- Instant search results as user types (debounced 200ms).
- Results grouped by type: Leads, Clients, Projects, Tasks, Wiki.
- Keyboard navigation (↑ ↓ Enter).
- Recent searches history (localStorage).

### 5.4 Knowledge Base Wiki
- Left sidebar: nested category tree.
- Main panel: rendered rich text page with table of contents.
- Inline edit mode for authorized users.
- Version history timeline.

### 5.5 Multi-org Platform Admin Panel
- Organization list with plan badge, user count, lead count.
- "Impersonate org" button: switches context to that organization.
- Usage metrics chart per organization.
- Plan upgrade/downgrade controls.

---

## 6. Definition of Done (Phase 7)

- [ ] PWA installable on Android Chrome: shows splash screen, works offline for today's follow-ups.
- [ ] Web Push notification delivered to installed PWA within 30 seconds of event.
- [ ] Meilisearch full-text search returns results for lead name in < 50ms with 50,000 leads indexed.
- [ ] Global ⌘K search modal shows categorized results across Leads, Clients, and Tasks.
- [ ] Wiki page creation, editing, and version history tested.
- [ ] Wiki access control: 'admin' only page not visible to developer role.
- [ ] OrganizationScope tested: org A user cannot query org B's leads via API.
- [ ] Multi-tenant subdomain resolution: `agencyA.platform.com` resolves to org A correctly.
- [ ] Notification preferences: user sets email=off for follow-up reminders; no email sent.
- [ ] DND hours: notifications queued and delivered after DND period ends.
- [ ] Performance test: 10,000 concurrent users on lead list endpoint — p95 < 800ms.
