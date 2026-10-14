# Agency CRM + Project Delivery Platform
## Master Phase-Wise Implementation Roadmap (v2.0 — Enterprise Enhanced)

Welcome to the detailed phase-wise engineering documentation for the **Agency CRM + Project Delivery Platform**.

This platform bridges the entire lifecycle of client acquisition, delivery, and performance:

```
Sales CRM → Won Lead → Client Onboarding → Service / Project Track → Feedback & Performance → Scale & Mobile
```

> **v2.0 Enterprise Additions**: WhatsApp 2-way API, Lead Scoring & Merge, Revenue Forecasting, White-label Portal, E-sign, Retainer Billing, Client Health Score, Time Tracking, Sprint Planning, Gantt Chart, Task Dependencies, Resource Capacity, AI Hints, Public API, 2FA, SLA Monitoring, PWA, Full-text Search (Meilisearch), Knowledge Base Wiki, Multi-org Architecture.

---

## Phase Documentation Directory

| Phase | Document | Focus Area | Key Enterprise Additions | Timeline | Status |
|---|---|---|---|---|---|
| **0** | [Phase 0: Architecture & Foundations](./phase-0-setup.md) | Core Setup, Stack, API Standards | Laravel 13, React 19 Vite, MySQL, Boost MCP, Swagger UI, ApiResponse Trait, Theme Engine | Week 1 | ✅ **Completed** |
| **1** | [Phase 1: Sales CRM Core & Follow-ups](./phase-1-sales-crm.md) | Lead Pipeline, Imports & Follow-up Engine | **Lead Scoring (0–100)**, Lead Merge, Email-to-Lead, Bulk Actions, **WhatsApp Notifications**, 5-step Import Wizard | Weeks 2–5 | 🚀 **Ready for Build** |
| **2** | [Phase 2: Super Admin & Analytics](./phase-2-admin-analytics.md) | BI Telemetry, Reports & Impersonation | **Revenue Forecasting**, **Lost Deal Analysis**, Scheduled Report Delivery, Custom Dashboard Widgets, Team Leaderboard | Weeks 6–8 | 📋 **Documented** |
| **3** | [Phase 3: Client Onboarding & Service Track](./phase-3-client-service-track.md) | Won → Client Wizard & Small Services | **White-label Portal (custom domain/logo)**, **E-sign Documents**, **Retainer Billing (GST)**, Client Onboarding Checklist, **Client Health Score** | Weeks 9–12 | 📋 **Documented** |
| **4** | [Phase 4: Project Track (Scope & Governance)](./phase-4-project-track.md) | Custom Software Delivery & Dispute-Proofing | **Time Tracking + Budget Tracker**, **Sprint Planning + Burndown**, **Gantt Chart**, **Task Dependencies**, **Resource Capacity Planning**, Document Diff | Weeks 13–19 | 📋 **Documented** |
| **5** | [Phase 5: Integrations & Performance Engine](./phase-5-advanced-performance.md) | GitHub, Real-time Chat & Fair Evaluation | **2-way WhatsApp API**, **AI Assistant Hints**, **NPS Pulse Surveys**, **Public REST API + Webhooks**, Zapier integration | Weeks 20–26 | 📋 **Documented** |
| **6** | [Phase 6: Hardening, Security & Launch](./phase-6-hardening-devops.md) | Production Readiness & DevOps | **2FA (TOTP)**, **Session Management**, **IP Allowlist**, **Data Export/Deletion**, **SLA Monitoring**, Penetration Testing Checklist | Weeks 27–30 | 📋 **Documented** |
| **7** | [Phase 7: Mobile PWA & Scale](./phase-7-mobile-scale.md) | Mobile, Full-text Search & Multi-org | **Progressive Web App (PWA)**, **Meilisearch Full-text Search (⌘K)**, **Internal Knowledge Base Wiki**, **Multi-organization Architecture**, Advanced Notification Preferences | Weeks 31–38 | 🔮 **Future Phase** |

**Total estimated timeline:** ~38 weeks (~9 months) with a 3–4 developer team.

---

## System Architecture Principles

1. **Modular Monolith**: Clean separation of domain modules (`Auth`, `Leads`, `Clients`, `Projects`, `Billing`, `Performance`) within a unified Laravel 13 codebase — no microservice complexity until necessary.

2. **Strict Service-Contract Pattern**: Every module provides interface contracts in `App\Contracts\Services\*` and implementations in `App\Services\*`, bound via `AppServiceProvider`.

3. **Standard Response Envelope**: 100% of API endpoints return identical JSON schema:
   ```json
   {
     "success": true,
     "statusCode": 200,
     "message": "...",
     "data": { ... },
     "errors": null,
     "meta": {
       "timestamp": "2026-09-29T12:00:00Z",
       "version": "v1"
     }
   }
   ```

4. **Client Portal Transparency**: *"If it is not written, it never happened. If the client did not approve it, it is not in scope."*

5. **No Orphan Tasks**: Every technical task links back to an approved Scope item, Change Request, or Meeting Action Item.

6. **Security by Default**: All routes use `$this->authorize()` or Policy middleware. Global scopes enforce data isolation per role. Never trust client-sent IDs — always re-verify ownership server-side.

7. **AI Advisory Only**: AI suggestions (lead hints, meeting summarizer, sprint risk) are always displayed as suggestions — never auto-actioned. Client data is never sent to AI APIs raw; only anonymized patterns are used.

8. **Progressive Delivery**: Platform goes live at Phase 1 (Sales team). Each phase adds value independently. No big-bang launch.

---

## Enterprise Feature Summary (What Was Added in v2.0)

### Phase 1 — Sales CRM
| Feature | Description |
|---|---|
| Lead Scoring (0–100) | Activity-based score: follow-ups done/missed, status, staleness |
| Lead Merge | Combine duplicate leads — merged timeline, oldest ID retained |
| Email-to-Lead | Forwarded email auto-creates lead from sender data |
| WhatsApp Notifications | Outbound template messages for reminders, escalations via Meta Cloud API |
| Bulk Actions | Bulk assign, bulk status change, bulk tag, bulk export |

### Phase 2 — Analytics
| Feature | Description |
|---|---|
| Revenue Forecasting | Pipeline value × stage conversion probability weights |
| Lost Deal Analysis | Pattern breakdown by agent, source, product, reason |
| Scheduled Reports | Weekly digest and monthly executive auto-delivered via email |
| Team Leaderboard | Sales gamification with streak tracking and badges |
| Custom Widgets | Admin can pin/unpin and reorder KPI dashboard cards |

### Phase 3 — Client & Service Track
| Feature | Description |
|---|---|
| White-label Portal | Custom domain, logo, brand color per client; vendor branding hidden |
| Client Onboarding Checklist | Guided 5-step first-login checklist with progress bar |
| E-sign Documents | DocuSign-style inline signing with IP + timestamp + drawn signature stored |
| Retainer Billing | Scheduler auto-generates GST-compliant invoices on billing cycle |
| Client Health Score | 0–100 composite score from tickets, payments, engagement, feedback, response |
| Feature Toggles | Per-client module visibility (e.g. hide GitHub tab for non-software clients) |

### Phase 4 — Project Track
| Feature | Description |
|---|---|
| Per-task Time Tracking | Timer or manual entry; billable vs non-billable; actual vs estimated |
| Project Budget Tracker | Estimated cost vs actual cost vs gross margin in real-time |
| Sprint Planning | 2-week sprints with burndown chart, velocity tracking, retrospective |
| Task Dependencies | Task B blocked until Task A is Done; visual blocking indicator |
| Gantt Chart | Timeline view with drag-to-reschedule and dependency arrows |
| Resource Capacity | Team availability matrix: available hours per developer per week |
| Document Diff | Side-by-side version comparison for scope and CR documents |

### Phase 5 — Integrations & Performance
| Feature | Description |
|---|---|
| 2-way WhatsApp API | Inbound client replies parsed and logged to lead/project timeline |
| AI Assistant Hints | Lead action suggestions, MoM summarizer, sprint risk assessment |
| NPS Pulse Surveys | Auto-dispatched after milestone/sprint with NPS dashboard |
| Public REST API | External integrations via API key (leads CRUD, project status, invoices) |
| Webhooks | Subscribe to events (lead.won, invoice.paid) with retry logic |
| Zapier Integration | No-code workflow triggers documented |

### Phase 6 — Hardening
| Feature | Description |
|---|---|
| 2FA (TOTP) | Required for Super Admin, Sales Manager, PM; recovery codes supported |
| Session Management | View, revoke individual or all sessions |
| IP Allowlist | CIDR-based allowlist for admin portal access |
| Data Export | GDPR-style ZIP export of all user data |
| SLA Monitoring | Per-priority SLA thresholds; breach detection and metrics report |
| Penetration Test Checklist | 20+ security checks before production launch |

### Phase 7 — Mobile & Scale
| Feature | Description |
|---|---|
| Progressive Web App (PWA) | Installable, offline mode, Web Push notifications |
| Meilisearch Full-text Search | Sub-50ms global search across leads, clients, tasks (⌘K modal) |
| Knowledge Base Wiki | Internal SOPs with version history, categories, and access control |
| Multi-org Architecture | Row-level tenant isolation for SaaS productization |
| Advanced Notifications | Per-channel preferences, Do Not Disturb hours, digest mode |

---

## Technology Stack

### Backend (Laravel 13 + PHP 8.3+)
| Layer | Technology |
|---|---|
| Framework | Laravel 13 (PHP 8.3) |
| API Auth | Laravel Sanctum (token-based) |
| Roles/Permissions | `spatie/laravel-permission` |
| Audit Log | `spatie/laravel-activitylog` |
| Excel Import/Export | `maatwebsite/excel` |
| PDF | `barryvdh/laravel-dompdf` |
| Queue Dashboard | Laravel Horizon (Redis) |
| Real-time | Laravel Reverb (WebSockets) |
| File Storage | S3 / Cloudflare R2 + presigned uploads |
| Media Handling | `spatie/laravel-medialibrary` |
| Full-text Search | Meilisearch + Laravel Scout |
| GitHub Integration | HTTP webhooks + signature verify |
| Payments | Razorpay SDK |
| WhatsApp | Meta Cloud API (Graph API v18+) |
| AI Hints | OpenAI API (advisory, anonymized) |
| API Docs | Darkaonline L5-Swagger |
| Testing | Pest + PHPUnit |
| Database | MySQL 8+ |
| Cache/Queue | Redis |
| 2FA | TOTP (google2fa-laravel) |

### Frontend (React 19 + Vite + TypeScript)
| Layer | Technology |
|---|---|
| Build | Vite + React 19 + TypeScript |
| Routing | React Router v7 (role-based guards) |
| Server State | TanStack Query v5 |
| Client State | Zustand |
| Forms | React Hook Form + Zod |
| UI Components | shadcn/ui + Vanilla CSS |
| Tables | TanStack Table v8 |
| Charts | Recharts + ECharts |
| Kanban | dnd-kit |
| Rich Text | Tiptap (MoM, Scope, Wiki) |
| Real-time | Laravel Echo + Reverb |
| File Upload | react-dropzone + presigned URLs |
| Gantt | gantt-task-react |
| PWA | Workbox (service worker) |
| Search | Meilisearch Instant Search |
| Dates | date-fns |

---

## Golden Rules (Non-negotiable)
1. ✅ Scope approve nahi = kaam shuru nahi.
2. ✅ Naya kaam = Change Request (CR).
3. ✅ Har meeting ka MoM, 24 ghante ke andar.
4. ✅ Task ka proof = screenshot / video / staging URL.
5. ✅ Client hi Accept karega, tabhi Done.
6. ✅ Milestone complete + accepted = invoice.
7. ✅ Follow-up close karte hi next follow-up set.
8. ✅ Har action audit me.
9. ✅ Developer ko apna score aur formula dikhe.
10. ✅ Chhote kaam ko heavy process me mat daalo (Service Track alag hai).
11. ✅ AI suggestions = advisory only, never auto-actioned.
12. ✅ Client data never sent raw to external AI APIs.
