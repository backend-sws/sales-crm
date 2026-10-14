# Frontend Architecture Guidelines

## Domain-Driven Feature Structure (Feature-Sliced Design)

This project strictly follows a Domain-Driven Feature-Sliced architecture for the frontend.

### The Rule:
1. **Main Domains:** The `src/features/` directory contains Main Domain folders (e.g., `auth`, `business`, `superadmin`, `customer`).
2. **Sub-Features:** **Inside** each Domain folder, there MUST be independent Sub-Feature folders (e.g., `dashboard`, `profile`, `billing`, `inventory`).
3. **Module Separation:** **Inside** each Sub-Feature folder, the code MUST be separated into the following standard architectural blocks:
   - `api/` (for API calls and React Query hooks like `useBusinessMutations.ts`)
   - `components/` (for UI components specific to this feature)
   - `pages/` (for main page views/screens)
   - `schemas/` (for Zod validation schemas and Typescript interfaces)
   - `constants/` (for constants specific to this feature)

### ❌ WRONG Structure (Flattened):
```text
src/features/business/
  ├── api/
  ├── components/
  ├── pages/
```
*Never place `api/`, `components/`, etc. directly under a main domain unless it is a simple shared module.*

### ✅ CORRECT Structure (Nested Sub-Features):
```text
src/features/
  ├── auth/                       <-- (Standalone Feature)
  │   ├── api/, components/, pages/, schemas/
  ├── business/                   <-- (Main Domain for Customer User)
  │   ├── dashboard/              <-- (Sub-Feature)
  │   │   ├── api/
  │   │   ├── components/
  │   │   ├── pages/
  │   │   ├── schemas/
  │   ├── profile/                <-- (Sub-Feature)
  │   │   ├── api/useProfileMutations.ts
  │   │   ├── components/LiveBusinessCard.tsx
  │   │   ├── pages/BusinessProfilePage.tsx
  │   │   ├── schemas/profileSchema.ts
  ├── superadmin/                 <-- (Main Domain for Superadmin)
  │   ├── dashboard/              <-- (Sub-Feature)
  │   │   ├── pages/ ...
```

**CRITICAL:** Always verify this architecture pattern before creating new pages or components.
