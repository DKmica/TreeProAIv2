# TreePro AI - Implementation Plan

> **Version:** 2.0  
> **Last Updated:** December 2024  
> **Phase 0 - Analysis & Planning**

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

## Phase 1: Backend Refactor (Modular Architecture + RBAC)

**Goal:** Refactor the backend from monolith into domain modules without breaking current behavior.

**Estimated Time:** 4-6 weeks

### 1.1 Core Infrastructure Module

- [ ] Create `backend/src/modules/core/` directory structure
- [ ] Extract database configuration to `core/db/`
  - [ ] Move `db.js` → `core/db/connection.js`
  - [ ] Move `config/database.js` → `core/db/config.js`
  - [ ] Create connection pool manager
- [ ] Extract authentication to `core/auth/`
  - [ ] Move `auth.js` → `core/auth/middleware.js`
  - [ ] Create session management module
  - [ ] Create token validation module
- [ ] Create shared utilities in `core/utils/`
  - [ ] Move `utils/formatters.js`
  - [ ] Move `utils/helpers.js`
  - [ ] Move `utils/pagination.js`

### 1.2 RBAC Implementation

- [ ] Define role permissions matrix
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

- [ ] Create RBAC middleware: `core/auth/rbac.js`
  - [ ] `requireRole(roles: string[])` - Role check middleware
  - [ ] `requirePermission(resource, action)` - Fine-grained permissions
  - [ ] `requireOwnership(resource)` - Row-level access control

- [ ] Apply RBAC to all routes
  - [ ] Audit all route files for unprotected endpoints
  - [ ] Add role requirements to each route group
  - [ ] Add ownership checks where appropriate

- [ ] Add audit logging for permission denials

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

### 1.5 Unit Tests

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

- [ ] RBAC permission tests
  - [ ] Role access matrix validation
  - [ ] Ownership checks
  - [ ] Denial logging

---

## Phase 2: Offline-First PWA Foundation

**Goal:** Make the app offline-capable for field crews.

**Estimated Time:** 2-3 weeks

### 2.1 PWA Configuration

- [ ] Install dependencies
  ```bash
  pnpm add vite-plugin-pwa @tanstack/react-query-persist-client idb-keyval
  ```

- [ ] Update `vite.config.ts`
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

- [ ] Create PWA icons (192x192, 512x512)
- [ ] Add manifest.json to public/

### 2.2 Persisted React Query

- [ ] Create `contexts/OfflineQueryProvider.tsx`
  ```typescript
  import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
  import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
  ```

- [ ] Configure cache persistence for critical data:
  - [ ] Jobs (today's and this week's)
  - [ ] Client info for assigned jobs
  - [ ] Equipment assigned to crew

### 2.3 Offline Sync Context

- [ ] Create `contexts/OfflineSyncContext.tsx`
  - [ ] Network status detection
  - [ ] Write queue (IndexedDB)
  - [ ] Sync on reconnect
  - [ ] Conflict resolution strategy

- [ ] Wrap app in OfflineSyncContextProvider

### 2.4 Offline UI Indicators

- [ ] Add connection status badge to header
- [ ] Show pending sync count
- [ ] Manual sync button
- [ ] Sync status per record

---

## Phase 3: Crew Mobile Mode (UI + Voice Notes)

**Goal:** Create a dedicated mobile-optimized view for field crews.

**Estimated Time:** 2-3 weeks

### 3.1 Mobile Layout

- [ ] Create `pages/crew/MobileMode.tsx`
- [ ] Bottom navigation bar (Jobs, Today, Profile)
- [ ] Large touch targets (min 60px)
- [ ] No sidebar
- [ ] No financial data visible

### 3.2 Today's Jobs View

- [ ] Filter jobs by current user and date
- [ ] Job cards with:
  - [ ] Customer name
  - [ ] Address (tap to navigate)
  - [ ] Status badge
  - [ ] Scope summary
- [ ] Quick actions:
  - [ ] Start Job
  - [ ] Navigate (Google Maps)
  - [ ] Safety Check
  - [ ] Complete

### 3.3 Job Detail (Mobile)

- [ ] Scope and notes
- [ ] Photo attachments
- [ ] Hazard information
- [ ] Form submissions
- [ ] Time tracking controls

### 3.4 Voice Notes

- [ ] Implement Web Speech API integration
  ```typescript
  const recognition = new webkitSpeechRecognition()
  recognition.continuous = true
  recognition.interimResults = true
  ```

- [ ] Microphone button in job notes
- [ ] Start/stop recording
- [ ] Transcribe to text area
- [ ] Graceful degradation if API unavailable

---

## Phase 4: Core Field Operations

**Goal:** Build full operational support.

**Estimated Time:** 4-5 weeks

### 4.1 Jobs Enhancement

- [ ] Standardize status flow:
  - DRAFT → SCHEDULED → EN_ROUTE → ON_SITE → COMPLETED → INVOICED → CANCELLED

- [ ] Add fields:
  - [ ] scheduled_start, scheduled_end
  - [ ] assigned_crews (array)
  - [ ] assigned_equipment (array)

### 4.2 Crew Management

- [ ] Employee model enhancements:
  - [ ] Roles array
  - [ ] Certifications (with expiry dates)
  - [ ] Availability calendar

- [ ] API endpoints:
  - [ ] `POST /api/crews/:id/assign-job`
  - [ ] `GET /api/employees/:id/schedule`
  - [ ] `PUT /api/employees/:id/availability`

### 4.3 Time Tracking

- [ ] TimeEntry model:
  - [ ] employee_id
  - [ ] job_id
  - [ ] start_time, end_time
  - [ ] break_duration
  - [ ] gps_coordinates

- [ ] API endpoints:
  - [ ] `POST /api/time-entries/clock-in`
  - [ ] `POST /api/time-entries/clock-out`
  - [ ] `GET /api/time-entries/job/:jobId`
  - [ ] `GET /api/time-entries/employee/:employeeId`

- [ ] Admin timesheet approval view
- [ ] Mobile clock in/out buttons

### 4.4 Equipment Management

- [ ] Equipment model:
  - [ ] Status: Operational, Down, Maintenance
  - [ ] Maintenance intervals (hours/days)
  - [ ] Usage tracking

- [ ] EquipmentUsage table:
  - [ ] equipment_id
  - [ ] job_id
  - [ ] hours_used

- [ ] EquipmentMaintenance table:
  - [ ] scheduled_date
  - [ ] actual_date
  - [ ] maintenance_type
  - [ ] notes

- [ ] Maintenance due alerts

---

## Phase 5: PHC & Inventory (Plant Health Care)

**Goal:** Add compliance-friendly tracking for PHC jobs.

**Estimated Time:** 2 weeks

### 5.1 Database Migration

- [ ] Create migration `018_phc_materials.sql`:
  ```sql
  CREATE TABLE job_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    material_name VARCHAR(255) NOT NULL,
    quantity_used NUMERIC(10,2),
    unit VARCHAR(50),
    epa_reg_number VARCHAR(100),
    application_method VARCHAR(100),
    applied_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

### 5.2 Backend Routes

- [ ] `POST /api/jobs/:id/materials` - Add material usage
- [ ] `GET /api/jobs/:id/materials` - Get materials for job
- [ ] `PUT /api/job-materials/:id` - Update material record
- [ ] `DELETE /api/job-materials/:id` - Remove material record

### 5.3 Frontend UI

- [ ] Add "Chemical/Material Usage" section to job completion form
- [ ] Fields:
  - [ ] Material name (autocomplete from inventory)
  - [ ] Quantity and unit
  - [ ] EPA registration number
  - [ ] Application method (dropdown)
  - [ ] Applied by (employee selector)

- [ ] PHC compliance report

---

## Phase 6: Scheduling & Route Optimization

**Goal:** Enhance scheduling for office/dispatch users.

**Estimated Time:** 3-4 weeks

### 6.1 Enhanced Calendar

- [ ] Day/Week/Month views (existing)
- [ ] Crew timeline view (rows per crew)
- [ ] Map view with job pins

### 6.2 Recurring Jobs

- [ ] Add `recurrence_rule` field to jobs (RRULE format)
- [ ] Worker to generate job instances
- [ ] UI for managing recurrence
- [ ] "Skip" and "Reschedule" options

### 6.3 Route Optimization

- [ ] Integrate OR-Tools or simpler heuristic
- [ ] `POST /api/schedule/optimize-routes`
  - Input: crew_id, date, job_ids
  - Output: optimized order with ETAs

- [ ] UI "Optimize Routes" button
- [ ] Drag-and-drop reordering
- [ ] Estimated travel time between stops

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

## Phase 8: Automation & Event System

**Goal:** Build an event-driven automation engine.

**Estimated Time:** 2-3 weeks

### 8.1 Event Bus

- [ ] Implement internal event bus
  ```javascript
  emitEvent('JOB_COMPLETED', { jobId, clientId, ... })
  ```

- [ ] Core events:
  - LEAD_CREATED
  - QUOTE_SENT
  - QUOTE_APPROVED
  - JOB_SCHEDULED
  - JOB_STARTED
  - JOB_COMPLETED
  - INVOICE_CREATED
  - INVOICE_SENT
  - INVOICE_OVERDUE
  - PAYMENT_RECEIVED

### 8.2 Initial Automations

- [ ] JOB_COMPLETED → Create draft invoice
- [ ] JOB_COMPLETED → Schedule review request (+3 days)
- [ ] INVOICE_OVERDUE → Send reminder + optional late fee
- [ ] QUOTE_SENT → Follow-up reminder (+7 days)

### 8.3 Automation Logging

- [ ] Log all events
- [ ] Log automation runs
- [ ] Success/failure tracking
- [ ] Debug view

### 8.4 Documentation

- [ ] Create `docs/automation.md`

---

## Phase 9: AI Enhancements

**Goal:** Strengthen AI as a core differentiator.

**Estimated Time:** 3-4 weeks

### 9.1 AI Tree Estimator Improvements

- [ ] Move to `modules/ai/estimatorService.js`
- [ ] Store estimation data for retraining:
  - [ ] Input (photos, features)
  - [ ] Suggested price
  - [ ] Final approved price
  - [ ] Feedback rating

- [ ] Export endpoint for training data

### 9.2 ProBot Assistant Enhancements

- [ ] Centralize in `modules/ai/assistantService.js`
- [ ] New intents:
  - [ ] "What jobs do we have tomorrow?"
  - [ ] "How much revenue last month?"
  - [ ] "Show outstanding invoices over 30 days"
  - [ ] "Who's available on Friday?"

- [ ] Enhanced RAG context injection

### 9.3 AI Scheduling Helper

- [ ] Predict job durations based on history
- [ ] Flag scheduling conflicts
- [ ] Suggest optimal crew assignment

---

## Phase 10: AI Visualizer / Virtual Trimmer

**Goal:** Add a visual sales tool for mock-ups.

**Estimated Time:** 2-3 weeks

### 10.1 Visualizer Page

- [ ] Create `pages/Visualizer.tsx`
- [ ] Image upload (camera or file)
- [ ] Canvas overlay

### 10.2 Masking Tool

- [ ] Brush tool for painting over areas
- [ ] Red semi-transparent mask
- [ ] Undo/Clear buttons
- [ ] Brush size selector

### 10.3 Preview Generation

- [ ] Stub `generateTrimPreview(image, mask)`
- [ ] Show "Integration Pending" toast
- [ ] Before/After slider component
- [ ] Comments for future API integration (Stability, etc.)

---

## Phase 11: Reporting & Business Intelligence

**Goal:** Provide an admin "cockpit" for the business.

**Estimated Time:** 3-4 weeks

### 11.1 Backend Metrics

- [ ] Sales funnel metrics
- [ ] Job profitability (estimated vs actual)
- [ ] Crew productivity
- [ ] Equipment utilization
- [ ] Revenue by service type/date

### 11.2 Dashboard UI

- [ ] Charts (revenue, jobs, leads)
- [ ] KPI cards
- [ ] Date range filters
- [ ] Service type filters
- [ ] Crew filters

### 11.3 Reports

- [ ] Revenue report
- [ ] Job profitability report
- [ ] Crew hours report
- [ ] Equipment usage report
- [ ] CSV export

---

## Phase 12: UX, Role Flows, Tests & Docs

**Goal:** Polish and finalize.

**Estimated Time:** 2-3 weeks

### 12.1 Role-Aware Navigation

- [ ] admin/manager: Full access
- [ ] sales: CRM, quotes, partial schedule
- [ ] scheduler: Schedule, jobs, crew, equipment
- [ ] crew: Mobile Mode + PWA only
- [ ] client: Portal (quotes, invoices, payments)

### 12.2 Full Flow Testing

- [ ] Lead → Quote → Schedule → Execute → Invoice → Pay → Review

### 12.3 Test Coverage

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
