# TreePro AI - Implementation Plan

> **Version:** 2.2  
> **Last Updated:** December 15, 2024  
> **Phases 0-4, 8, 9 Complete | Phase 12 Partial**

---

## Overview

This document provides a detailed implementation checklist for upgrading TreePro AI from a functional MVP to a market-leading, production-ready tree service business management platform.

**Target Timeline:** 6-9 months (phases can run in parallel)

---

## Phase 0: Analysis & Plan ✅ COMPLETE

### Deliverables

- [x] Scan repo and identify entry points
  - Backend: `backend/server.js`
  - Frontend: `App.tsx`, `index.tsx`
  - Existing docs: `ARCHITECTURE_OVERVIEW.md`, `ROADMAP.md`, `docs/PHASE_PROGRESS.md`

- [x] Create `docs/architecture.md`
  - Current architecture documented
  - Target modular layout defined
  - Gap analysis completed

- [x] Create `docs/implementation_plan.md`
  - This document

---

## Phase 1: Backend Refactor (Modular Architecture + RBAC) ✅ RBAC COMPLETE

**Goal:** Refactor the backend from monolith into domain modules without breaking current behavior.

**Estimated Time:** 4-6 weeks

### 1.1 Core Infrastructure Module

- [x] Create `backend/src/modules/core/` directory structure
- [ ] Extract database configuration to `core/db/`
  - [ ] Move `db.js` → `core/db/connection.js`
  - [ ] Move `config/database.js` → `core/db/config.js`
  - [ ] Create connection pool manager
- [x] Extract authentication to `core/auth/`
  - [x] Move `auth.js` → `core/auth/middleware.js`
  - [x] Create session management module
  - [x] Create token validation module
- [ ] Create shared utilities in `core/utils/`
  - [ ] Move `utils/formatters.js`
  - [ ] Move `utils/helpers.js`
  - [ ] Move `utils/pagination.js`

### 1.2 RBAC Implementation ✅ COMPLETE

- [x] Define role permissions matrix
  ```
  | Resource    | admin | manager | sales | scheduler | crew | client |
  |-------------|-------|---------|-------|-----------|------|--------|
  | clients     | CRUD  | CRUD    | CRU   | R         | R    | R(own) |
  | quotes      | CRUD  | CRUD    | CRUD  | R         | -    | R(own) |
  | jobs        | CRUD  | CRUD    | R     | CRUD      | RU   | R(own) |
  | invoices    | CRUD  | CRUD    | R     | R         | -    | R(own) |
  | employees   | CRUD  | CRUD    | R     | R         | R    | -      |
  | equipment   | CRUD  | CRUD    | R     | RU        | R    | -      |
  | analytics   | R     | R       | R     | R         | -    | -      |
  ```

- [x] Create RBAC middleware: `core/auth/rbac.js`
  - [x] `requireRole(roles: string[])` - Role check middleware
  - [x] `requirePermission(resource, action)` - Fine-grained permissions
  - [x] `requireOwnership(resource)` - Row-level access control

- [x] Apply RBAC to all routes
  - [x] Audit all route files for unprotected endpoints
  - [x] Add role requirements to each route group
  - [x] Add ownership checks where appropriate

- [x] Add audit logging for permission denials

### 1.3 Extract Domain Modules

For each module, follow this pattern:

```
modules/{domain}/
├── controllers/          # Request handlers
├── services/             # Business logic
├── routes.js             # Route definitions
├── validators.js         # Input validation
└── index.js              # Module exports
```

**Module extraction order:**

- [ ] **CRM Module** (`modules/crm/`)
  - [ ] Extract clients routes & logic
  - [ ] Extract properties routes & logic
  - [ ] Extract contacts routes & logic
  - [ ] Extract leads routes & logic
  - [ ] Move `clientService.js`, `propertyService.js`, `contactService.js`

- [ ] **Quotes Module** (`modules/quotes/`)
  - [ ] Extract quoting routes
  - [ ] Move all `services/quoting/*` services
  - [ ] Move AI estimator integration

- [ ] **Jobs Module** (`modules/jobs/`)
  - [ ] Extract jobs routes
  - [ ] Move `jobStateService.js`, `jobTemplateService.js`
  - [ ] Move recurring jobs service
  - [ ] Move job forms logic

- [ ] **Crew Module** (`modules/crew/`)
  - [ ] Extract employees routes
  - [ ] Move crew assignment services
  - [ ] Create time tracking service
  - [ ] Create certification management

- [ ] **Equipment Module** (`modules/equipment/`)
  - [ ] Extract equipment routes
  - [ ] Create maintenance tracking service
  - [ ] Create usage tracking service

- [ ] **Invoices Module** (`modules/invoices/`)
  - [ ] Extract invoices routes
  - [ ] Move `stripeService.js`
  - [ ] Create payment recording service
  - [ ] Stub QuickBooks service

- [ ] **Automation Module** (`modules/automation/`)
  - [ ] Move all `services/automation/*` services
  - [ ] Extract workflows routes
  - [ ] Create event bus abstraction

- [ ] **Analytics Module** (`modules/analytics/`)
  - [ ] Extract dashboard routes
  - [ ] Create reporting services
  - [ ] Create metrics aggregation

- [ ] **AI Module** (`modules/ai/`)
  - [ ] Move `ragService.js`, `vectorStore.js`
  - [ ] Move AI routes
  - [ ] Create estimator service abstraction
  - [ ] Create assistant service abstraction

### 1.4 Slim Down server.js

- [ ] server.js should only contain:
  - [ ] Environment setup
  - [ ] Module registration
  - [ ] Server startup
  - [ ] Graceful shutdown

- [ ] Target: < 200 lines

### 1.5 Unit Tests ✅ PARTIAL

- [ ] Job state transitions tests
  - [ ] Valid transitions (draft → scheduled → in_progress → completed)
  - [ ] Invalid transition rejection
  - [ ] Side effects (client category update)

- [ ] Quote → Job conversion tests
  - [ ] Line items transfer
  - [ ] Client/property association
  - [ ] Status updates

- [ ] Invoice creation tests
  - [ ] From completed job
  - [ ] Number generation
  - [ ] Total calculation

- [x] RBAC permission tests
  - [x] Role access matrix validation (18 tests)
  - [x] Ownership checks
  - [x] Denial logging

---

## Phase 2: Offline-First PWA Foundation ✅ COMPLETE

**Goal:** Make the app offline-capable for field crews.

**Estimated Time:** 2-3 weeks

### 2.1 PWA Configuration ✅ COMPLETE

- [x] Install dependencies
  ```bash
  pnpm add vite-plugin-pwa @tanstack/react-query-persist-client idb-keyval
  ```

- [x] Update `vite.config.ts`
  ```typescript
  import { VitePWA } from 'vite-plugin-pwa'
  
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'TreePro AI',
        short_name: 'TreePro',
        theme_color: '#10b981',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\..*\/jobs/,
            handler: 'NetworkFirst',
            options: { cacheName: 'jobs-cache' }
          }
        ]
      }
    })
  ]
  ```

- [x] Create PWA icons (192x192, 512x512)
- [x] Add manifest.json to public/

### 2.2 Persisted React Query ✅ COMPLETE

- [x] Create `contexts/OfflineQueryProvider.tsx`
  ```typescript
  import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
  import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
  ```

- [x] Configure cache persistence for critical data:
  - [x] Jobs (today's and this week's)
  - [x] Client info for assigned jobs
  - [x] Equipment assigned to crew

### 2.3 Offline Sync Context ✅ COMPLETE

- [x] Create `contexts/CrewSyncContext.tsx`
  - [x] Network status detection
  - [x] Write queue (localStorage)
  - [x] Sync on reconnect
  - [x] Conflict resolution strategy

- [x] Wrap app in CrewSyncProvider

### 2.4 Offline UI Indicators ✅ COMPLETE

- [x] Add connection status badge to header (`OfflineIndicator` component)
- [x] Show pending sync count
- [x] Manual sync button
- [x] Sync status per record

---

## Phase 3: Crew Mobile Mode (UI + Voice Notes) ✅ COMPLETE

**Goal:** Create a dedicated mobile-optimized view for field crews.

**Estimated Time:** 2-3 weeks

### 3.1 Mobile Layout ✅ COMPLETE

- [x] Create `pages/crew/CrewDashboard.tsx` and `CrewJobDetail.tsx`
- [x] Bottom navigation bar (Today, All Jobs, Profile) in `CrewLayout.tsx`
- [x] Large touch targets (64px nav height)
- [x] No sidebar
- [x] No financial data visible

### 3.2 Today's Jobs View ✅ COMPLETE

- [x] Filter jobs by current user and date
- [x] Job cards with:
  - [x] Customer name (using `getClientDisplayName()` helper)
  - [x] Address (tap to navigate via Google Maps link)
  - [x] Status badge
  - [x] Scope summary
- [x] Quick actions:
  - [x] Start Job
  - [x] Navigate (Google Maps)
  - [x] Safety Check
  - [x] Complete

### 3.3 Job Detail (Mobile) ✅ COMPLETE

- [x] Scope and notes
- [x] Photo attachments
- [x] Hazard information (JHA)
- [x] Form submissions (Safety Checklist)
- [x] Time tracking controls (Clock In/Out with GPS)

### 3.4 Voice Notes ✅ COMPLETE

- [x] Implement Web Speech API integration in `components/crew/VoiceNotes.tsx`
  ```typescript
  const recognition = new webkitSpeechRecognition()
  recognition.continuous = true
  recognition.interimResults = true
  ```

- [x] Microphone button in job notes
- [x] Start/stop recording with pulsing animation
- [x] Transcribe to text area
- [x] Graceful degradation if API unavailable

---

## Phase 4: Core Field Operations ✅ COMPLETE

**Goal:** Build full operational support.

**Estimated Time:** 4-5 weeks

### 4.1 Jobs Enhancement ✅ COMPLETE

- [x] Standardize status flow:
  - DRAFT → NEEDS_PERMIT → WAITING_ON_CLIENT → SCHEDULED → EN_ROUTE → ON_SITE → WEATHER_HOLD → IN_PROGRESS → COMPLETED → INVOICED → PAID → CANCELLED
  - Implemented in `backend/services/jobStateService.js` with STATE_TRANSITION_MATRIX

- [x] Add fields:
  - [x] scheduled_start, scheduled_end (scheduledDate, etaWindowStart, etaWindowEnd)
  - [x] assigned_crews (array) - assignedCrew field
  - [x] assigned_equipment (array) - equipmentNeeded field

### 4.2 Crew Management ✅ PARTIAL

- [x] Employee model enhancements:
  - [x] Roles array
  - [x] Certifications (with expiry dates)
  - [ ] Availability calendar

- [x] API endpoints:
  - [x] `POST /api/crews/:id/assign-job`
  - [x] `GET /api/employees/:id/schedule`
  - [ ] `PUT /api/employees/:id/availability`

### 4.3 Time Tracking ✅ COMPLETE

- [x] TimeEntry model (in types.ts and database):
  - [x] employee_id
  - [x] job_id
  - [x] start_time (clockIn), end_time (clockOut)
  - [x] break_duration (breakMinutes)
  - [x] gps_coordinates (clockInLocation, clockOutLocation)

- [x] API endpoints:
  - [x] `POST /api/time-entries/clock-in`
  - [x] `POST /api/time-entries/clock-out`
  - [x] `GET /api/time-entries/job/:jobId`
  - [x] `GET /api/time-entries/employee/:employeeId`
  - [x] `PUT /api/time-entries/:id/approve`
  - [x] `PUT /api/time-entries/:id/reject`

- [x] Admin timesheet approval view (`pages/TimeTracking.tsx` with 4 tabs)
- [x] Mobile clock in/out buttons (`pages/crew/CrewJobDetail.tsx`)

### 4.4 Equipment Management ✅ COMPLETE

- [x] Equipment model:
  - [x] Status: Operational, Needs Maintenance, Out of Service
  - [x] Maintenance intervals (hours/days)
  - [x] Usage tracking

- [x] EquipmentUsage table (`backend/migrations/018_equipment_tracking.sql`):
  - [x] equipment_id
  - [x] job_id
  - [x] hours_used
  - [x] used_by, start_time, end_time, notes

- [x] EquipmentMaintenance table:
  - [x] scheduled_date
  - [x] actual_date
  - [x] maintenance_type ('scheduled', 'repair', 'inspection')
  - [x] notes, cost, status, next_due_date

- [x] Maintenance due alerts (`GET /api/equipment/maintenance-due`)

---

## Phase 5: PHC & Inventory (Plant Health Care) ✅ COMPLETE

**Goal:** Add compliance-friendly tracking for PHC jobs.

**Estimated Time:** 2 weeks

### 5.1 Database Migration ✅ COMPLETE

- [x] Migration `019_phc_materials.sql` with:
  - job_materials table (EPA reg, application method, weather, PPE, REI hours)
  - material_inventory table for autocomplete and tracking
  - Full compliance-tracking fields

### 5.2 Backend Routes ✅ COMPLETE

- [x] `POST /api/jobs/:id/materials` - Add material usage
- [x] `GET /api/jobs/:id/materials` - Get materials for job
- [x] `PUT /api/job-materials/:id` - Update material record
- [x] `DELETE /api/job-materials/:id` - Remove material record
- [x] `GET /api/material-inventory` - Get inventory for autocomplete
- [x] `POST /api/material-inventory` - Add inventory item
- [x] `GET /api/phc-reports/compliance` - PHC compliance report

### 5.3 Frontend UI ✅ COMPLETE

- [x] MaterialUsageForm component with:
  - Material name autocomplete from inventory
  - Quantity and unit selection
  - EPA registration number
  - Application method dropdown (Foliar Spray, Trunk Injection, etc.)
  - Applied by employee selector
  - Weather conditions, wind speed, temperature
  - PPE used (multi-select)
  - REI hours tracking

- [x] PHCComplianceReport page (`/phc-compliance`) with:
  - Date range filters
  - Search and compliance status filters
  - Stats dashboard (total applications, compliant %, unique materials)
  - CSV export
  - Role-protected access (owner, admin, manager, foreman)

---

## Phase 6: Scheduling & Route Optimization ✅ COMPLETE

**Goal:** Enhance scheduling for office/dispatch users.

**Estimated Time:** 3-4 weeks

### 6.1 Enhanced Calendar ✅ COMPLETE

- [x] Day/Week/Month/ThreeDay/List views
- [x] Crew timeline view (CrewView.tsx - rows per crew with weekly schedule)
- [x] Map view with job pins (MapViewWrapper.tsx with Google Maps integration)

### 6.2 Recurring Jobs ✅ COMPLETE

- [x] Job series with recurrence patterns (daily, weekly, monthly, quarterly, yearly)
- [x] Backend service to generate job instances (recurringJobsService.js)
- [x] RecurringJobsPanel UI for managing recurrence
- [x] "Skip" and "Reschedule" options for recurring instances
- [x] Convert recurring instance to actual job

### 6.3 Route Optimization ✅ COMPLETE

- [x] Route optimization service with Google Maps integration
- [x] `POST /api/scheduling/routes/optimize` endpoint
  - Input: crew_id, date, startLocation, endLocation
  - Output: optimized order with ETAs, distances, drive times

- [x] UI "Optimize Routes" button in Calendar
- [x] RoutePlanDrawer with drag-and-drop reordering
- [x] Route summary showing total distance and travel time
- [x] Re-optimize button for live adjustments
- [x] Crew status tracking (en_route, on_site, available)
- [x] "On My Way" and arrival notifications

---

## Phase 7: Invoicing, Payments & QuickBooks

**Goal:** Complete the financial loop and connect to QB Online.

**Estimated Time:** 4-5 weeks

### 7.1 Invoice Enhancements

- [ ] Progress billing (deposit, milestone, final)
- [ ] Batch invoicing (all completed jobs)
- [ ] Invoice editing before sending
- [ ] Invoice templates

### 7.2 Stripe Integration (Complete)

- [x] Basic Stripe integration exists
- [ ] Create checkout sessions for invoices
- [ ] Webhook handlers for payment events
- [ ] Card on file for recurring
- [ ] ACH payments

### 7.3 Client Portal Payments

- [ ] View invoices
- [ ] Pay invoices online
- [ ] Payment history
- [ ] Auto-pay setup

### 7.4 QuickBooks Online Sync

- [ ] Install `node-quickbooks` or use OAuth2 directly
- [ ] Create `quickbooksService.js`:
  - [ ] OAuth flow (auth URL, callback, token storage)
  - [ ] Token refresh
  - [ ] Invoice sync (TreePro → QB)
  - [ ] Customer sync
  - [ ] Payment sync

- [ ] API endpoints:
  - [ ] `GET /api/integrations/quickbooks/auth`
  - [ ] `GET /api/integrations/quickbooks/callback`
  - [ ] `POST /api/integrations/quickbooks/sync`

- [ ] Create `quickbooks_tokens` table for OAuth storage

### 7.5 A/R & Reminders

- [ ] Overdue detection (30/60/90 aging)
- [ ] Automated reminder emails
- [ ] Late fee calculation
- [ ] Aging dashboard

---

## Phase 8: Automation & Event System ✅ COMPLETE

**Goal:** Build an event-driven automation engine.

**Estimated Time:** 2-3 weeks

### 8.1 Event Bus ✅ COMPLETE

- [x] Implement internal event bus (`backend/services/automation/`)
  ```javascript
  emitBusinessEvent('job_completed', { jobId, clientId, ... })
  ```

- [x] Core events:
  - lead_created
  - quote_sent
  - quote_approved
  - job_scheduled
  - job_started
  - job_completed
  - invoice_created
  - invoice_sent
  - invoice_overdue
  - payment_received

### 8.2 Initial Automations ✅ COMPLETE

- [x] JOB_COMPLETED → Create draft invoice (auto-generates in jobStateService.js)
- [x] JOB_COMPLETED → Update client category to "Active"
- [x] INVOICE_OVERDUE → Dunning reminders via reminderService.js
- [x] QUOTE_SENT → Follow-up reminder (+14 days logging)

### 8.3 Automation Logging ✅ COMPLETE

- [x] Log all events (console + automation engine)
- [x] Log automation runs
- [x] Success/failure tracking
- [x] Event emission in routes

### 8.4 Documentation

- [ ] Create `docs/automation.md`

---

## Phase 9: AI Enhancements ✅ COMPLETE

**Goal:** Strengthen AI as a core differentiator.

**Estimated Time:** 3-4 weeks

### 9.1 AI Tree Estimator Improvements ✅ COMPLETE

- [x] Move to `backend/src/modules/ai/estimatorService.js`
- [x] Store estimation data for retraining:
  - [x] Input (photos, features)
  - [x] Suggested price
  - [x] Final approved price
  - [x] Feedback rating (accurate/too_high/too_low)

- [x] Export endpoint for training data (`/api/ai/estimates/export`)
- [x] Accuracy metrics dashboard support

### 9.2 ProBot Assistant Enhancements ✅ COMPLETE

- [x] Centralize in `backend/src/modules/ai/assistantService.js`
- [x] 13+ natural language intents:
  - [x] "What jobs do we have tomorrow?"
  - [x] "How much revenue last month?"
  - [x] "Show overdue invoices"
  - [x] "Who's available on Friday?"
  - [x] "Exception queue status"
  - [x] "Time tracking approvals"
  - [x] "Client properties/contacts"
  - [x] "Marketing campaign status"
  - [x] "Crew schedule conflicts"
  - [x] "AI estimator accuracy"

- [x] Enhanced RAG context injection with real-time database queries

### 9.3 AI Scheduling Helper ✅ COMPLETE

- [x] Predict job durations based on history (`schedulingHelper.js`)
- [x] Rule-based fallback for new job types
- [x] Flag scheduling conflicts (JSONB array overlaps)
- [x] Suggest optimal crew assignment (certifications + performance)
- [x] Database tables: `ai_estimate_logs`, `job_duration_history`

---

## Phase 10: AI Visualizer / Virtual Trimmer ✅ COMPLETE

**Goal:** Add a visual sales tool for mock-ups.

**Estimated Time:** 2-3 weeks

### 10.1 Visualizer Page ✅ COMPLETE

- [x] Create `pages/Visualizer.tsx`
- [x] Image upload (camera or file)
- [x] Canvas overlay with touch support

### 10.2 Masking Tool ✅ COMPLETE

- [x] Brush tool for painting over areas
- [x] Red semi-transparent mask overlay
- [x] Undo/Clear buttons
- [x] Brush size selector (10-100px slider)

### 10.3 Preview Generation ✅ COMPLETE

- [x] Stub `generateTrimPreview(image, mask)` - removes masked areas, shows sky background
- [x] Show "Preview Mode" info box for future AI integration
- [x] Before/After slider component with clip-path reveal
- [x] Download preview button
- [x] Comments for future API integration (Stability AI, etc.)

---

## Phase 11: Reporting & Business Intelligence ✅ COMPLETE

**Goal:** Provide an admin "cockpit" for the business.

**Estimated Time:** 3-4 weeks

### 11.1 Backend Metrics ✅ COMPLETE

- [x] Sales funnel metrics
- [x] Job profitability (estimated vs actual)
- [x] Crew productivity
- [x] Equipment utilization
- [x] Revenue by service type/date
- [x] Dashboard KPIs endpoint
- [x] Revenue trend over time

### 11.2 Dashboard UI ✅ COMPLETE

- [x] Charts (revenue trend line chart, sales funnel bar chart, service pie chart)
- [x] KPI cards (Total Invoiced, Win Rate, Jobs Completed, Outstanding Balance)
- [x] Date range filters (7 days, 30 days, 90 days, year, all time)
- [x] Tab navigation (Overview, Sales Funnel, Revenue, Crew, Equipment)
- [x] Recharts library integration

### 11.3 Reports ✅ COMPLETE

- [x] Revenue report with service breakdown
- [x] Job profitability report with margin analysis
- [x] Crew hours report with productivity metrics
- [x] Equipment usage report with utilization rates
- [x] CSV export functionality

---

## Phase 12: UX, Role Flows, Tests & Docs ✅ PARTIAL

**Goal:** Polish and finalize.

**Estimated Time:** 2-3 weeks

### 12.1 Role-Aware Navigation ✅ COMPLETE

- [x] Owner (100): Full system access, user management, approve signups
- [x] Admin (90): Near-full access, manage most settings
- [x] Manager (70): Manage operations, crews, employees, view reports
- [x] Sales/Scheduler (50): CRM access, quotes, calendar management
- [x] Foreman (40): Field operations, job management, time tracking
- [x] Laborer/Crew (30): View assigned jobs, clock in/out, equipment
- [x] Customer (10): Portal access only - view quotes, invoices, job status
- [x] Sidebar dynamically shows/hides menu items based on roles
- [x] `RoleProtectedRoute` component for route protection
- [x] User Management page (`/user-management`) - owner-only
- [x] New signup approval workflow

### 12.2 Full Flow Testing

- [ ] Lead → Quote → Schedule → Execute → Invoice → Pay → Review

### 12.3 Test Coverage

- [x] RBAC permission tests (18 tests)
- [ ] Job workflows
- [ ] Invoicing + payments
- [ ] QuickBooks sync
- [ ] Automation rules
- [ ] AI endpoints (smoke tests)

### 12.4 Documentation

- [ ] Update README.md
- [ ] Update docs/architecture.md
- [ ] Create docs/ai.md
- [ ] Update docs/automation.md
- [ ] API documentation

### 12.5 Form Usability ✅ COMPLETE

- [x] Fixed invisible text in form fields across entire app
- [x] Added phone number auto-formatting to all phone fields
- [x] Added state dropdown for all address forms
- [x] Customer info transfers properly to invoices from jobs/quotes

---

## Recommended Priority Order

Based on business value and dependencies:

### Tier 1: Foundation (Do First)
1. **Phase 1** - Backend Refactor + RBAC (enables everything else)
2. **Phase 2** - PWA/Offline (critical for field crews)

### Tier 2: Revenue & Operations
3. **Phase 7** - QuickBooks + enhanced payments (revenue critical)
4. **Phase 4** - Field operations (crew productivity)

### Tier 3: Efficiency & Growth
5. **Phase 3** - Crew Mobile Mode (field experience)
6. **Phase 6** - Scheduling optimization (efficiency)
7. **Phase 8** - Automation (productivity)

### Tier 4: Differentiation
8. **Phase 5** - PHC Materials (compliance)
9. **Phase 9** - AI Enhancements (differentiation)
10. **Phase 10** - AI Visualizer (sales tool)
11. **Phase 11** - Reporting/BI (insights)

### Tier 5: Polish
12. **Phase 12** - Tests, docs, polish

---

## Success Criteria

### Phase 1 Success
- [ ] server.js < 200 lines
- [ ] All routes use RBAC middleware
- [ ] 80%+ unit test coverage on services

### Phase 2 Success
- [ ] App installs as PWA
- [ ] Jobs viewable offline
- [ ] Writes queue and sync on reconnect

### Phase 3 Success
- [ ] Crew can complete job cycle on mobile
- [ ] Voice notes work in 90%+ of browsers

### Phase 4 Success
- [ ] Clock in/out reduces timesheet errors by 50%
- [ ] Equipment maintenance alerts prevent 90% of breakdowns

### Phase 7 Success
- [ ] QuickBooks sync reduces accounting time by 80%
- [ ] 90% of invoices paid within 14 days

### Phase 8 Success
- [ ] Zero manual follow-up reminders needed
- [ ] Review request automation increases reviews 3x

---

## Getting Started

To begin Phase 1:

```bash
# Create the new directory structure
mkdir -p backend/src/modules/core/{db,auth,utils}
mkdir -p backend/src/modules/{crm,quotes,jobs,crew,equipment,invoices,automation,analytics,ai}

# Start with core module extraction
# See Phase 1.1 checklist above
```

---

*This plan is a living document. Update status as work progresses.*
