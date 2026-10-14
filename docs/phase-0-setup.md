# Phase 0: Architecture, Setup & Foundations

> **Status:** ✅ Completed  
> **Target:** Week 1  
> **Key Goal:** Solid foundation with Laravel 13, MySQL, Token Auth (no Breeze), Swagger UI, Boost MCP, Service-Contract pattern, and React 19 Frontend.

---

## 1. Objectives & Overview
Phase 0 delivers the foundational architecture for the entire platform. It ensures:
1. Standardized versioned REST API (`/api/v1`).
2. Uniform API JSON response envelopes across all successes and exception scenarios.
3. Clean decoupling between Controllers, Services, and Interfaces.
4. AI context integration via official `laravel/boost` MCP server.
5. Interactive OpenAPI 3.0 documentation via Swagger UI (`/api/documentation`).
6. High-aesthetic, responsive React frontend with dynamic theming and zero legacy baggage.

---

## 2. Technology Stack & Environment

| Component | Technology | Version | Notes |
|---|---|---|---|
| **Backend Framework** | Laravel | 13.x | PHP 8.5 compatible |
| **Authentication** | Laravel Sanctum | 4.x | Token-based SPA/Mobile auth |
| **API Documentation** | L5-Swagger (OpenAPI) | 11.x | Auto-regenerates with annotations |
| **AI Protocol** | Laravel Boost MCP | 2.x | Exposes DB schema, routes, tinker |
| **Database** | MySQL | 8.x | UTF8mb4 Unicode |
| **Frontend Framework** | React + TypeScript | 19.x | Vite 8 bundler |
| **CSS System** | TailwindCSS + Animate | 4.x | CSS custom properties + `@theme` |
| **Client State** | Zustand | 5.x | Auth, layout, and theme stores |
| **Server State** | TanStack React Query | 5.x | API caching and optimistic mutations |

---

## 3. Core Architecture Standards

### 3.1 Standard Response Envelope
All API controllers inherit `App\Http\Controllers\Api\BaseApiController`, utilizing `App\Traits\ApiResponse`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Resource retrieved successfully.",
  "data": { ... },
  "errors": null,
  "meta": {
    "timestamp": "2026-09-29T12:00:00Z",
    "version": "v1"
  }
}
```

### 3.2 Global Exception Normalization
Configured in `bootstrap/app.php`:
- `ValidationException` &rarr; HTTP 422 JSON with field errors in `errors`.
- `AuthenticationException` &rarr; HTTP 401 JSON.
- `NotFoundHttpException` &rarr; HTTP 404 JSON.
- `AccessDeniedHttpException` &rarr; HTTP 403 JSON.

### 3.3 Service-Contract Dependency Injection
All business logic belongs in Services mapped to Contracts in `AppServiceProvider.php`:
- `AuthServiceInterface` &rarr; `AuthService`
- `LeadServiceInterface` &rarr; `LeadService`
- `DashboardServiceInterface` &rarr; `DashboardService`

---

## 4. Frontend Foundation & Theming

### 4.1 Theme Store & Color Palettes
`useThemeStore` manages:
- **Layout Themes**: `light`, `semi-dark`, `dark`
- **Primary Color**: `teal`, `blue`, `purple`, `orange`, `green`, `rose`, `red`, `slate`
- **Typography**: `inter`, `roboto`, `poppins`, `lato`, `rubik`, `montserrat`

Dynamic CSS variables (`--primary-50` to `--primary-950`) and the `.dark` class are synchronized to `document.documentElement` via `useThemeEffect.ts`.

### 4.2 Reusable UI Components
31 enterprise UI primitives preserved and ready in `components/ui/*`:
- `StatCard`, `CustomKpiCard`, `DataTable`, `FilterBar`, `FilterControls`
- `Modal`, `Drawer`, `DeleteConfirmModal`, `ModernOtpInput`
- `Button`, `Badge`, `Input`, `Select`, `Textarea`, `Skeleton`

---

## 5. Definition of Done (Phase 0)
- [x] Laravel 13 framework initialized with personal access token migrations.
- [x] MySQL database connected and seeded with initial admin user.
- [x] L5-Swagger installed and accessible at `http://127.0.0.1:8000/api/documentation`.
- [x] Laravel Boost MCP server installed (`.mcp.json` and `.agents/mcp_config.json`).
- [x] Feature tests passing with 100% success (`php artisan test`).
- [x] Frontend builds with zero errors (`npm run build`).
