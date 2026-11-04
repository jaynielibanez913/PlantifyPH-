# PlantifyPH

Helping Filipinos grow healthier plants through technology.

## Architecture Overview

PlantifyPH is structured as a feature-based **Modular Monolith** built on **Next.js 15 App Router**, **TypeScript (strict mode)**, **Tailwind CSS v4**, and **Zod**:

- **Presentation Layer (`src/app/`, `src/components/`, `src/features/*/*Client.tsx`)**: Server-rendered pages and focused interactive client components.
- **Application Layer (`src/app/api/**`)**: Next.js Route Handlers enforcing Zod request validation, rate limiting, HTTP-only session authentication, and RBAC (`GUEST`, `USER`, `ADMIN`).
- **Business Logic Layer (`src/features/*/service.ts`)**: Ownership-scoped operations for authentication, profile management, plant catalog, personal collections, watering schedules, duplicate-safe care reminders, plant health tracking, gardening guides, dashboards, and admin governance.
- **Security (`src/lib/security/`, `src/lib/auth/`)**: Cryptographic `scrypt` password hashing with random salts and `timingSafeEqual` verification, HTTP-only session cookies, and centralized sanitized error responses.

## Local Scripts

- `npm run dev` — Start development server on `0.0.0.0:3000`
- `npm run build` — Build standalone production bundle
- `npm run lint` — Run strict TypeScript verification
