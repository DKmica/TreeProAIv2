# TreePro AI

## Overview

TreePro AI is an AI-powered business management platform tailored for tree service companies. It integrates CRM, job management, and financial tools with advanced AI capabilities from Google Gemini. The platform streamlines workflows from lead generation to invoicing, offering intelligent insights and automation for the tree service industry. The project has a production-ready foundation with core CRM, job management, and AI features operational, and a 12-phase upgrade roadmap documented for future enhancements.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend uses React 19 with TypeScript, Vite 6.4.1 for fast builds, and React Router DOM v6.30.1. State management relies on React hooks, Context API, and TanStack Query v5.90.10 for server state. Styling is managed with TailwindCSS 3.4.18, a custom design system with a brand color palette, and Lucide React icons, following a mobile-first responsive design with a dark theme. Key design patterns include protected routes, lazy loading, error boundaries, toast notifications, and a command palette.

### Backend Architecture

The backend is built with Node.js and Express.js, offering a RESTful API on port 3001 with CORS enabled. Authentication is token-based, using `express-session` with a PostgreSQL store. The API follows a modular route structure with centralized error handling and UUID-based resource identifiers. Business logic is isolated using a service layer pattern, including a job state machine, template system, and an automation engine. Key services include RAG, vector store, job lifecycle management, and payment integration.

### Database Design

PostgreSQL 14+ is the primary database, using `node-postgres` with connection pooling. The schema features a 3-tier client hierarchy (Clients → Properties → Contacts), soft deletes via `deleted_at` timestamps, full-text search indexes (GIN), and JSONB columns for flexible metadata. Key data models cover clients, properties, contacts, leads, quotes, jobs, invoices, employees, equipment, and templates. Performance features include automatic retry on connection failures, graceful error handling, connection pooling, and prepared statements.

### AI/ML Integration

Google Gemini (`@google/genai` v1.27.0) is the primary AI provider, using `gemini-2.0-flash` for chat and `text-embedding-004` for vector embeddings. AI features include an AI Tree Estimator, a RAG system for context-aware AI, a voice interface, a built-in arborist knowledge base, and AI-driven workflow automation. Vector embeddings are stored in ChromaDB, and context injection is dynamic based on user workflow.

### Testing Strategy

Unit and integration testing are performed with Vitest and React Testing Library, providing coverage reporting. End-to-end testing uses Playwright for browser automation, configured for Chromium with screenshot and video capture on failures, and HTML reporting.

## External Dependencies

### Third-Party Services

-   **Stripe (v20.0.0)**: For payment processing, requiring `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET` environment variables.
-   **Google Gemini API**: For AI and machine learning capabilities, requiring `GEMINI_API_KEY`.
-   **Google Maps API**: For mapping, location services, and route optimization, requiring `GOOGLE_MAPS_API_KEY`.
-   **SendGrid (@sendgrid/mail v8.1.6)**: For transactional emails (quotes, invoices, notifications).

### Development Tools

-   **pnpm**: Recommended for package management.
-   **TypeScript**: For type safety.
-   **ESLint**: For code quality.
-   **Dyad component tagger**: For debugging.

### Browser Compatibility

The application supports modern web standards, including ES2022, CSS Grid/Flexbox, Service Workers (PWA-ready), WebRTC, and LocalStorage.

## Recent Changes

### December 2024 - Phase 0: Analysis & Planning

**Status:** Complete

**New Documentation Created:**
- `docs/architecture.md` - Comprehensive architecture analysis with current backend/frontend/database structure, target modular architecture design, gap analysis for all 12 upgrade phases, and migration strategy
- `docs/implementation_plan.md` - Detailed implementation checklist with phase-by-phase task breakdown (Phases 0-12), RBAC permission matrix, success criteria, and recommended priority order

**Key Findings from Analysis:**
- Backend is a modular monolith (Express + service layer) with clear separation via routes/services
- Controllers exist for clients, contacts, properties, tags (partial controller layer)
- RBAC schema exists (user_roles, audit_logs tables) but enforcement middleware not applied to all routes
- Token-based authentication via AUTH_TOKEN environment variable
- No PWA/offline support currently configured
- Crew mobile mode pages exist but need mobile optimization
- Scheduling services partially implemented with stubbed route optimization
- QuickBooks integration stubbed but not connected
- Automation engine scaffolded (event emitter, workflow engine, cron scheduler)

**Recommended Next Steps:**
1. Phase 2: PWA/Offline foundation for field crews (2-3 weeks)
2. Phase 7: QuickBooks Online integration (revenue critical)

### December 2024 - Phase 1: Backend RBAC Implementation

**Status:** Complete

**New Components Created:**
- `backend/src/modules/core/auth/` - Core RBAC module with:
  - `permissions.js` - Permissions matrix (ROLES, ACTIONS, RESOURCES constants)
  - `roleLoader.js` - User role loading with 5-minute caching
  - `auditLogger.js` - Audit logging for security events
  - `rbacMiddleware.js` - Express middleware for permission checks
  - `index.js` - Consolidated module exports

**Database Changes:**
- Created `user_roles` table (user_id, role with CHECK constraint)
- Created `audit_logs` table for security event tracking
- Default owner role assigned to local-admin user

**Route Protection Applied:**
- Finance routes (invoices, payments)
- Jobs and quotes routes
- CRM routes (clients, properties, contacts, leads)
- Operations routes (employees, equipment, scheduling, AI)

**Security Improvements:**
- Fail-closed security model: errors during role lookup deny access instead of granting privileges
- All RBAC middleware validates authentication before checking permissions
- Users must have explicit role assignment in user_roles table - no default role fallback
- Permission denials logged to audit_logs table
- Role-based access matrix defines granular permissions per resource
- Database errors during authentication clear user context entirely

**Tests Added:**
- `tests/unit/rbac.test.ts` - 18 unit tests for permissions matrix
- Total test suite: 55 tests passing (7 test files)

### December 2024 - Phase 2: Offline-First PWA Foundation

**Status:** Complete

**PWA Configuration:**
- Installed `vite-plugin-pwa` with Workbox service worker generation
- Configured runtime caching for `/api/jobs`, `/api/clients`, `/api/equipment` with NetworkFirst strategy
- Created PWA manifest with app metadata, theme colors, and icons
- Generated PWA icons (192x192, 512x512) in public folder

**Query Persistence:**
- Updated `QueryClientProvider` to use `PersistQueryClientProvider` with async storage
- Configured IndexedDB storage via `idb-keyval` and `@tanstack/query-async-storage-persister`
- Set 24-hour cache time for offline data access

**Offline Sync:**
- Integrated `CrewSyncContext` into the app (provides network detection, pending actions queue, sync on reconnect)
- Pending actions stored in localStorage and synced when online

**UI Indicators:**
- Created `OfflineIndicator` component in `components/ui/OfflineIndicator.tsx`
- Shows red badge when offline, amber badge for pending sync count, cyan spinner during sync
- Green sync button appears when online with pending changes
- Added to Header component for visibility

**Key Files Created/Modified:**
- `vite.config.ts` - PWA plugin configuration
- `contexts/QueryClientProvider.tsx` - Async persistence with IndexedDB
- `components/ui/OfflineIndicator.tsx` - Connection status UI
- `components/Header.tsx` - Added OfflineIndicator
- `index.tsx` - Wrapped app with CrewSyncProvider
- `public/icon-192.png`, `public/icon-512.png` - PWA icons

### December 2024 - Phase 3: Crew Mobile Mode

**Status:** Complete

**Type System Updates:**
- Fixed crew pages to use `Client` type instead of legacy `Customer` type
- Created helper functions for display names: `getClientDisplayName()` (companyName or firstName + lastName)
- Created `getClientAddress()` helper using billing address fields
- Created `getJobCoordinates()` and `getJobAddress()` helpers for property-based data

**Bottom Navigation Bar:**
- Added fixed bottom navigation to `components/CrewLayout.tsx`
- Three tabs: Today (CalendarDays icon), All Jobs (Clock icon), Profile (Users icon)
- Touch-friendly 64px height with dark theme (brand-gray-900 background)
- Active state highlighting with brand-green-400 color
- NavLink routing to `/crew`, `/crew/jobs`, `/crew/profile`

**Voice Notes Component:**
- Created `components/crew/VoiceNotes.tsx` with Web Speech API integration
- Start/stop toggle button with microphone icon
- Real-time interim transcription display during recording
- Pulsing red animation during active recording
- Graceful fallback when Web Speech API unavailable
- `onTranscribe` callback for passing transcribed text

**CrewJobDetail Integration:**
- Added VoiceNotes component to notes section
- Microphone button appends transcribed text to existing notes
- Maintains existing note content when adding voice input

**Key Files Created/Modified:**
- `pages/crew/CrewDashboard.tsx` - Client type fixes, helper functions, bottom padding
- `pages/crew/CrewJobDetail.tsx` - Client type fixes, VoiceNotes integration
- `components/CrewLayout.tsx` - Bottom navigation bar
- `components/crew/VoiceNotes.tsx` - New voice-to-text component

**Test Status:** 55 tests passing (7 test files)

### December 2024 - Phase 4: Core Field Operations

**Status:** Complete (Pre-existing Implementation)

**Job Status Flow:**
- Backend job state service already includes full status flow: DRAFT → NEEDS_PERMIT → WAITING_ON_CLIENT → SCHEDULED → EN_ROUTE → ON_SITE → WEATHER_HOLD → IN_PROGRESS → COMPLETED → INVOICED → PAID → CANCELLED
- State transition matrix in `backend/services/jobStateService.js` with STATE_NAMES for display
- Frontend types.ts includes all status values in Job interface

**Equipment Usage Tracking:**
- Database table `equipment_usage` tracks: equipment_id, job_id, used_by, start_time, end_time, hours_used, notes
- API endpoints in `backend/routes/equipment.js` for CRUD operations
- TypeScript type `EquipmentUsage` in types.ts

**Equipment Maintenance Tracking:**
- Database table `equipment_maintenance` tracks: scheduled_date, actual_date, maintenance_type, cost, status, next_due_date
- Maintenance types: 'scheduled', 'repair', 'inspection'
- Status values: 'pending', 'completed', 'overdue'
- GET `/api/equipment/maintenance-due` endpoint for maintenance alerts
- TypeScript type `EquipmentMaintenance` in types.ts

**Time Tracking System:**
- Database table `time_entries` with full approval workflow
- Backend endpoints: clock-in, clock-out, approve, reject
- TimeEntry type includes GPS coordinates, photos, break tracking, approval status
- Mobile clock-in/out in `pages/crew/CrewJobDetail.tsx` with GPS capture
- Admin timesheet approval in `pages/TimeTracking.tsx` with 4 tabs: Clock, Entries, Approval, Timesheets
- TimesheetApproval component in `src/components/TimesheetApproval.tsx`

**Key Files:**
- `backend/migrations/018_equipment_tracking.sql` - Equipment usage and maintenance tables
- `backend/routes/equipment.js` - Equipment API with usage and maintenance endpoints
- `backend/services/jobStateService.js` - Job state machine with full transition matrix
- `pages/TimeTracking.tsx` - Admin time tracking dashboard
- `pages/crew/CrewJobDetail.tsx` - Mobile clock-in/out with GPS
- `src/components/TimesheetApproval.tsx` - Approval/rejection UI component
- `src/components/ClockInOut.tsx` - Clock in/out interface

**Test Status:** 55 tests passing (7 test files)