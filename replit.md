# TreePro AI

## Overview

TreePro AI is an AI-powered business management platform designed for tree service companies. It integrates CRM, job management, and financial tools with advanced AI capabilities from Google Gemini. The platform's purpose is to streamline workflows from lead generation to invoicing, offering intelligent insights and automation to the tree service industry. It has a production-ready foundation with core CRM, job management, and AI features operational.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (December 18, 2025)

### Backend Refactoring Completed
- **server.js reduced from 10,001 lines to 412 lines** (96% reduction)
- All 153+ legacy API endpoints migrated to 41 modular route files in `backend/routes/`
- Created dedicated route files for: crews, time-tracking, quotes, invoices, jobs, users, materials, operations, company, exception-queue, rag, webhooks, estimate-feedback, pay-periods
- Shared utilities consolidated in `backend/utils/` (errors.js, transformers.js, formatters.js, pagination.js)
- server.js now only handles: Stripe webhook, middleware setup, server lifecycle

### Codebase Cleanup
- **Deleted unused files:**
  - `backend/replitAuth.js` - Not used, replaced by localAuth.js
  - `backend/seedDatabase.js` - Duplicate seed data generator (638 lines)
  - `services/stripeService.ts` - Mock service with no imports
  - `services/quickbooksService.ts` - Not used
  - `src/components/Sidebar.tsx` - Duplicate of components/Sidebar.tsx
  - `src/components/WorkflowStepper.tsx` - Not imported
  - `src/utils/navigationConfig.ts` - Only used by deleted Sidebar

## System Architecture

### Frontend Architecture

The frontend uses React 19 with TypeScript, Vite 6.4.1, and React Router DOM v6.30.1. State management is handled with React hooks, Context API, and TanStack Query v5.90.10. Styling is managed with TailwindCSS 3.4.18, a custom design system with a brand color palette, and Lucide React icons, following a mobile-first responsive design with a dark theme. Key design patterns include protected routes, lazy loading, error boundaries, toast notifications, and a command palette. PWA features with offline support and IndexedDB persistence are implemented for field crews, including a custom offline indicator and sync functionality.

#### UI/UX Design Patterns

- **Light-themed form utilities**: CSS utility classes `.input-light`, `.select-light`, `.textarea-light` in `index.css` provide consistent styling for inputs in light modal contexts with explicit text colors for visibility.
- **FormCombobox component**: Reusable searchable dropdown (`components/ui/FormCombobox.tsx`) with light/dark variants, keyboard navigation, clear button, and responsive mobile height (`max-h-[min(320px,50vh)]`).
- **Quote cards**: CRM quote cards display inline details (job location from property.address/city/state, selected line items with quantity, formatted pricing) with clickable card body to open QuoteEditor directly.
- **Lead cards**: CRM lead cards are clickable to open LeadEditor directly, with action buttons (Edit, Convert, Delete) using stopPropagation to prevent bubbling.
- **Customer search**: QuoteEditor and LeadEditor use FormCombobox for searchable customer selection instead of basic dropdowns.

### Backend Architecture

The backend is built with Node.js and Express.js, providing a RESTful API on port 3001 with CORS enabled. Authentication uses local email/password (bcryptjs) with `express-session` backed by PostgreSQL (`connect-pg-simple`) and `passport.js` for local strategy handling. 

#### Role-Based Access Control (RBAC)

A comprehensive RBAC system provides granular access control with the following role hierarchy:
- **Owner (100)**: Full system access, user management, approve new signups
- **Admin (90)**: Near-full access, can manage most settings
- **Manager (70)**: Manage operations, crews, employees, view reports
- **Sales/Scheduler (50)**: CRM access, quotes, calendar management
- **Foreman (40)**: Field operations, job management, time tracking
- **Laborer/Crew (30)**: View assigned jobs, clock in/out, equipment
- **Customer (10)**: Portal access only - view quotes, invoices, job status

**User Approval Workflow**: New signups require owner approval before access is granted. First user is auto-approved as owner.

**User Management UI** (`/user-management`): Owner-only page for approving pending users, assigning roles, and customizing permissions.

**Role-Based Navigation**: Sidebar dynamically shows/hides menu items based on user roles. Routes are protected with `RoleProtectedRoute` component.

The API has a modular route structure with centralized error handling and UUID-based resource identifiers. Business logic is isolated using a service layer pattern, which includes a job state machine, a template system, and an automation engine. Key services encompass RAG, vector store, job lifecycle management, and payment integration. The backend also supports equipment usage and maintenance tracking, and a time tracking system with GPS capture and an approval workflow.

### Database Design

PostgreSQL 14+ is the primary database, utilizing `node-postgres` with connection pooling. The schema supports a 3-tier client hierarchy (Clients → Properties → Contacts), soft deletes via `deleted_at` timestamps, full-text search indexes (GIN), and JSONB columns for flexible metadata. Key data models cover clients, properties, contacts, leads, quotes, jobs, invoices, employees, equipment, and templates. Performance features include automatic retry on connection failures, graceful error handling, connection pooling, and prepared statements.

### AI/ML Integration

Google Gemini (`@google/genai` v1.27.0) is the primary AI provider, using `gemini-2.0-flash` for chat and `text-embedding-004` for vector embeddings. AI features include an AI Tree Estimator, a RAG system for context-aware AI, a voice interface, a built-in arborist knowledge base, and AI-driven workflow automation. Vector embeddings are stored in ChromaDB, and context injection is dynamic based on user workflow.

#### AI Module Architecture (Phase 9)

The backend AI module (`backend/src/modules/ai/`) provides enhanced AI capabilities:

- **Estimator Service** (`estimatorService.js`): Logs AI tree estimates with operator feedback tracking (accurate/too_high/too_low), training data export for model improvement, and accuracy metrics dashboard support.
- **Assistant Service** (`assistantService.js`): ProBot intent detection for 13+ natural language business query intents including "jobs tomorrow", "revenue last month", "overdue invoices", "crew availability", "exception queue status", "time tracking approvals", "client properties/contacts", "marketing campaign status", "crew schedule conflicts", and "AI estimator accuracy". Uses Gemini to generate conversational responses enriched with real-time database context.
- **Scheduling Helper** (`schedulingHelper.js`): AI-powered job duration prediction based on historical data with rule-based fallback, crew conflict detection using JSONB array overlaps, and optimal crew assignment recommendations using certifications and performance metrics.

#### AI API Endpoints

- `/api/ai/estimates/*`: Create, log feedback, export training data, view stats
- `/api/ai/assistant/*`: Natural language chat, specific intent queries (jobs/revenue/invoices/availability)
- `/api/ai/scheduling/*`: Duration prediction, conflict detection, crew suggestions, daily scheduling insights

Database tables: `ai_estimate_logs` (estimation history), `job_duration_history` (actual vs predicted tracking).

### PHC & Inventory (Phase 5)

The platform includes Plant Health Care (PHC) compliance tracking:

- **Material Usage Tracking** (`MaterialUsageForm.tsx`):
  - Material name with autocomplete from inventory
  - Quantity, unit, and EPA registration number
  - Application method (Foliar Spray, Trunk Injection, Soil Drench, etc.)
  - Weather conditions, wind speed, temperature
  - PPE used (multi-select)
  - REI (Restricted Entry Interval) hours

- **Material Inventory** (`material_inventory` table):
  - Product information with EPA registration
  - Safety data (signal word, required PPE)
  - Inventory tracking with minimum quantities
  - Default application settings

- **PHC Compliance Report** (`/phc-compliance`):
  - Date range filters
  - Compliance status indicators
  - Stats dashboard
  - CSV export for audits
  - Role-protected access

### Scheduling & Route Optimization (Phase 6)

The platform includes comprehensive scheduling and route optimization features:

- **Calendar Views**: Day, Week, Month, ThreeDay, and List views for job scheduling
- **Crew Timeline View** (`CrewView.tsx`): Weekly schedule organized by crew with drag-and-drop rescheduling
- **Map View** (`MapViewWrapper.tsx`): Google Maps integration showing job locations with route visualization
- **Recurring Jobs**:
  - Job series with patterns (daily, weekly, monthly, quarterly, yearly)
  - Auto-generation of job instances up to 60 days ahead
  - Skip/reschedule individual occurrences
  - Convert recurring instance to actual job
- **Route Optimization**:
  - `POST /api/scheduling/routes/optimize` - Optimize crew routes with Google Maps
  - RoutePlanDrawer with drag-and-drop stop reordering
  - Travel time and distance calculations
  - "On My Way" and arrival notifications to customers
- **Crew Status Tracking**: Real-time crew locations (en_route, on_site, available)
- **Capacity Planning**: Crew availability calendar with conflict detection

### Testing Strategy

Unit and integration testing are performed with Vitest and React Testing Library, providing coverage reporting. End-to-end testing uses Playwright for browser automation, configured for Chromium with screenshot and video capture on failures, and HTML reporting.

### Financial Features

The platform includes comprehensive financial management capabilities:

- **Progress Billing**: Support for deposit, milestone, and final invoices with payment schedules
- **Batch Invoicing**: Create invoices for multiple completed jobs at once
- **A/R Aging Dashboard**: Track receivables with 30/60/90 day buckets and overdue indicators
- **Client Payment History**: Customer portal displays complete payment history
- **Invoice Templates**: Customizable templates with branding, company info, and appearance settings
- **Stripe Payment Integration**: 
  - Credit card payments via Stripe Checkout
  - ACH bank transfer payments (US bank accounts)
  - Automatic payment method detection and recording
  - Webhook handling for async ACH settlements with Processing → Paid status flow

### Reporting & Business Intelligence (Phase 11)

The Reports Dashboard (`/reports`) provides comprehensive business analytics:

- **Backend Analytics Service** (`backend/services/analyticsService.js`):
  - Sales funnel metrics (leads → quotes → jobs conversion rates)
  - Job profitability analysis (estimated vs actual costs, margin tracking)
  - Crew productivity tracking (hours worked, jobs completed per employee)
  - Equipment utilization rates (usage hours, job assignments)
  - Revenue by service type breakdown
  - Revenue trends over time (daily/weekly/monthly groupings)
  - Dashboard KPIs aggregation

- **Analytics API Endpoints** (`/api/analytics/*`):
  - `GET /analytics/sales-funnel` - Conversion metrics through the sales pipeline
  - `GET /analytics/job-profitability` - Profit margins and cost breakdown per job
  - `GET /analytics/crew-productivity` - Employee hours and job completion stats
  - `GET /analytics/equipment-utilization` - Equipment usage and availability
  - `GET /analytics/revenue-by-service` - Revenue breakdown by service type
  - `GET /analytics/revenue-trend` - Time-series revenue data
  - `GET /analytics/dashboard-kpis` - Aggregated key performance indicators

- **Reports Dashboard UI** (`pages/Reports.tsx`):
  - KPI cards (Total Invoiced, Win Rate, Jobs Completed, Outstanding Balance)
  - Interactive charts using Recharts (line, bar, pie)
  - Date range filters (7 days, 30 days, 90 days, year, all time)
  - Tab navigation (Overview, Sales Funnel, Revenue, Crew, Equipment)
  - CSV export for job profitability data
  - Role-protected access (owner, admin, manager)

## External Dependencies

### Third-Party Services

-   **Stripe (v20.0.0)**: For payment processing (credit cards and ACH bank transfers).
-   **Google Gemini API**: For AI and machine learning capabilities.
-   **Google Maps API**: For mapping, location services, and route optimization.
-   **SendGrid (@sendgrid/mail v8.1.6)**: For transactional emails (quotes, invoices, notifications).

### Development Tools

-   **pnpm**: Recommended for package management.
-   **TypeScript**: For type safety.
-   **ESLint**: For code quality.
-   **Dyad component tagger**: For debugging.

### Browser Compatibility

The application supports modern web standards, including ES2022, CSS Grid/Flexbox, Service Workers (PWA-ready), WebRTC, and LocalStorage.