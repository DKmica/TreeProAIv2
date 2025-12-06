# TreePro AI - Architecture Documentation

> **Version:** 2.0  
> **Last Updated:** December 2024  
> **Phase 0 - Analysis & Planning**

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Target Modular Architecture](#target-modular-architecture)
3. [Gap Analysis](#gap-analysis)
4. [Migration Strategy](#migration-strategy)
5. [Technical Decisions](#technical-decisions)

---

## Current Architecture

### Overview

TreePro AI is built as a **modular monolith** with clear separation between frontend and backend. The backend follows a route-service pattern where API routes delegate to domain-specific services.

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                  │
│  React 19 + TypeScript + Vite + TailwindCSS                        │
│  Port: 5000 (proxies /api → backend:3001)                          │
├─────────────────────────────────────────────────────────────────────┤
│                           BACKEND                                   │
│  Node.js + Express.js                                               │
│  Port: 3001                                                         │
├─────────────────────────────────────────────────────────────────────┤
│                          DATABASE                                   │
│  PostgreSQL 14+                                                     │
│  Connection pooling (max 10)                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Backend Structure (Current)

```
backend/
├── server.js                 # Main entry point (~10,000 lines - needs refactoring)
├── db.js                     # Database connection pool
├── auth.js                   # Authentication middleware
├── stripeClient.js           # Stripe API client
│
├── config/
│   ├── database.js           # DB configuration
│   └── express.js            # Express middleware setup
│
├── controllers/              # Controller layer (CRM domain)
│   ├── clientsController.js  # Full CRUD with validation, transactions
│   ├── contactsController.js # Contact management
│   ├── propertiesController.js # Property management
│   └── tagsController.js     # Tag management
│
├── middleware/
│   ├── cors.js
│   ├── errorHandler.js
│   └── validate.js
│
├── routes/                   # API route definitions
│   ├── ai.js                 # AI endpoints (estimator, chat, RAG)
│   ├── auth.js               # Authentication
│   ├── clients.js            # CRM - Clients
│   ├── contacts.js           # CRM - Contacts
│   ├── employees.js          # Crew management
│   ├── equipment.js          # Asset tracking
│   ├── invoices.js           # Billing
│   ├── jobs.js               # Job management
│   ├── leads.js              # Lead management
│   ├── properties.js         # Property management
│   ├── quoting.js            # Quote management
│   ├── scheduling.js         # Calendar & scheduling
│   ├── search.js             # Global search
│   ├── segments.js           # Customer segmentation
│   ├── tags.js               # Tagging system
│   ├── templates.js          # Form & job templates
│   ├── workflows.js          # Automation workflows
│   └── ...
│
├── services/                 # Business logic layer
│   ├── automation/           # Event-driven automation
│   │   ├── cronScheduler.js
│   │   ├── emailService.js
│   │   ├── eventEmitter.js
│   │   ├── smsService.js
│   │   └── workflowEngine.js
│   │
│   ├── quoting/              # Quote-specific services
│   │   ├── aiAccuracyService.js
│   │   ├── conversionAnalyticsService.js
│   │   ├── pricingOptionsService.js
│   │   ├── proposalService.js
│   │   ├── signatureService.js
│   │   └── versioningService.js
│   │
│   ├── scheduling/           # Scheduling services
│   │   ├── conflictResolutionService.js
│   │   ├── crewAssignmentService.js
│   │   ├── crewStatusService.js
│   │   ├── jobDurationService.js
│   │   ├── notificationService.js
│   │   └── routeOptimizationService.js
│   │
│   ├── jobStateService.js    # Job state machine
│   ├── jobTemplateService.js # Job templates
│   ├── ragService.js         # RAG/AI context
│   ├── vectorStore.js        # Embeddings storage
│   ├── stripeService.js      # Payment processing
│   └── ...
│
├── migrations/               # SQL migrations (17 files)
├── utils/                    # Utility functions
└── templates/                # PDF templates
```

### Frontend Structure (Current)

```
/                             # Root (mixed - needs organization)
├── App.tsx                   # Main app component
├── index.tsx                 # Entry point
├── types.ts                  # Global type definitions
│
├── pages/                    # Page components
│   ├── Calendar/             # Calendar with multiple views
│   │   └── views/            # Day, Week, Month, Crew, Map views
│   ├── crew/                 # Crew mobile mode
│   │   ├── CrewDashboard.tsx
│   │   └── CrewJobDetail.tsx
│   ├── portal/               # Customer portal
│   │   ├── ClientHub.tsx
│   │   ├── InvoicePortal.tsx
│   │   ├── JobStatusPortal.tsx
│   │   └── QuotePortal.tsx
│   ├── Dashboard.tsx
│   ├── CRM.tsx
│   ├── Jobs.tsx
│   ├── Invoices.tsx
│   ├── Employees.tsx
│   ├── Equipment.tsx
│   └── ...
│
├── components/               # Reusable components
│   ├── ui/                   # Base UI components
│   ├── icons/                # Custom icons
│   ├── Layout.tsx
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── ...
│
├── contexts/                 # React contexts
│   ├── AuthContext.tsx
│   ├── AppDataContext.tsx
│   ├── CrewSyncContext.tsx
│   └── QueryClientProvider.tsx
│
├── hooks/                    # Custom React hooks
├── services/                 # API service layer
├── utils/                    # Utility functions
└── types/                    # TypeScript types
```

### Database Schema (Current)

The database follows a **3-tier CRM hierarchy** with comprehensive business entities:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     CLIENTS     │────▶│   PROPERTIES    │────▶│    CONTACTS     │
│  (Business/     │     │ (Service        │     │ (People at      │
│   Homeowner)    │     │  Locations)     │     │  each property) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│     LEADS       │     │     QUOTES      │
│ (Opportunities) │     │ (Estimates)     │
└─────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │      JOBS       │
                        │ (Work Orders)   │
                        └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │    INVOICES     │
                        │ (Billing)       │
                        └─────────────────┘
```

**Key Tables:**
- `clients` - Core client records with category (potential/active)
- `properties` - Service locations with GPS coordinates
- `contacts` - Contact people with communication channels
- `leads` - Sales opportunities with AI scoring
- `quotes` - Estimates with versioning and multi-tier pricing
- `jobs` - Work orders with 10-state workflow
- `invoices` - Billing with payment tracking
- `employees` - Staff with certifications
- `crews` - Team units with capacity
- `equipment` - Assets with maintenance history
- `time_entries` - Labor tracking

### Authentication (Current)

**Implementation:** Token-based API authentication (`backend/auth.js`)
- Bearer token or x-api-key header validation
- `AUTH_TOKEN` environment variable for production
- Falls back to authenticated default admin user when `AUTH_TOKEN` is unset (development mode)
- `isAuthenticated` middleware for route protection
- No session cookies required - stateless API design

**RBAC Status:**
- Database schema exists (migration 010):
  - `user_roles` table with roles: owner, admin, manager, sales, crew
  - `audit_logs` table for tracking entity changes
  - `exception_queue` table for workflow exceptions
  - `automation_events` table for scheduled actions
- **Gap:** RBAC enforcement middleware not implemented
- **Gap:** Routes don't check user roles before allowing access

---

## Target Modular Architecture

### Proposed Backend Structure

```
backend/
├── src/
│   ├── modules/                    # Domain modules
│   │   ├── core/                   # Core infrastructure
│   │   │   ├── db/                 # Database connection, migrations
│   │   │   ├── auth/               # Authentication, RBAC middleware
│   │   │   ├── utils/              # Shared utilities
│   │   │   └── index.js
│   │   │
│   │   ├── crm/                    # Customer relationship management
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── routes.js
│   │   │   └── index.js
│   │   │
│   │   ├── quotes/                 # Quoting & proposals
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   │   ├── pricingService.js
│   │   │   │   ├── proposalService.js
│   │   │   │   └── aiEstimatorService.js
│   │   │   ├── routes.js
│   │   │   └── index.js
│   │   │
│   │   ├── jobs/                   # Job management
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   │   ├── stateService.js
│   │   │   │   ├── templateService.js
│   │   │   │   └── formService.js
│   │   │   ├── routes.js
│   │   │   └── index.js
│   │   │
│   │   ├── crew/                   # Crew & employees
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   │   ├── assignmentService.js
│   │   │   │   ├── timeTrackingService.js
│   │   │   │   └── certificationService.js
│   │   │   ├── routes.js
│   │   │   └── index.js
│   │   │
│   │   ├── equipment/              # Equipment & assets
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   │   ├── maintenanceService.js
│   │   │   │   └── usageService.js
│   │   │   ├── routes.js
│   │   │   └── index.js
│   │   │
│   │   ├── invoices/               # Invoicing & payments
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   │   ├── invoiceService.js
│   │   │   │   ├── paymentService.js
│   │   │   │   └── quickbooksService.js
│   │   │   ├── routes.js
│   │   │   └── index.js
│   │   │
│   │   ├── automation/             # Workflow automation
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   │   ├── eventBus.js
│   │   │   │   ├── rulesEngine.js
│   │   │   │   └── notificationService.js
│   │   │   ├── routes.js
│   │   │   └── index.js
│   │   │
│   │   ├── analytics/              # Reporting & BI
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── routes.js
│   │   │   └── index.js
│   │   │
│   │   └── ai/                     # AI features
│   │       ├── controllers/
│   │       ├── services/
│   │       │   ├── estimatorService.js
│   │       │   ├── assistantService.js
│   │       │   ├── ragService.js
│   │       │   └── visualizerService.js
│   │       ├── routes.js
│   │       └── index.js
│   │
│   ├── server.js                   # Slim entry point
│   └── app.js                      # Express app configuration
│
├── tests/
│   ├── unit/
│   └── integration/
│
└── package.json
```

### Proposed Frontend Structure

```
src/
├── app/                            # App shell
│   ├── App.tsx
│   ├── routes.tsx
│   └── providers.tsx
│
├── modules/                        # Feature modules (mirrors backend)
│   ├── crm/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   │
│   ├── jobs/
│   ├── quotes/
│   ├── invoices/
│   ├── crew/
│   ├── equipment/
│   ├── analytics/
│   └── ai/
│
├── shared/                         # Shared code
│   ├── components/
│   │   ├── ui/
│   │   └── layout/
│   ├── hooks/
│   ├── utils/
│   └── types/
│
├── contexts/
├── styles/
└── assets/
```

---

## Gap Analysis

### Phase-by-Phase Assessment

| Phase | Description | Current Status | Gap Level |
|-------|-------------|----------------|-----------|
| **0** | Analysis & Plan | ✅ This document | Complete |
| **1** | Backend Refactor + RBAC | Partial services exist | **High** |
| **2** | PWA/Offline | No service worker | **High** |
| **3** | Crew Mobile Mode | Pages exist, not optimized | **Medium** |
| **4** | Field Operations | Partial implementation | **Medium** |
| **5** | PHC Materials | Not implemented | **High** |
| **6** | Scheduling/Routes | Stubbed | **Medium** |
| **7** | QuickBooks | Stub exists | **High** |
| **8** | Automation Events | Scaffolded | **Low** |
| **9** | AI Enhancements | Core exists | **Low** |
| **10** | AI Visualizer | Not implemented | **High** |
| **11** | Reporting/BI | Basic dashboard | **Medium** |
| **12** | Tests & Docs | Partial | **Medium** |

### Critical Gaps

1. **RBAC Enforcement** (Phase 1)
   - Schema exists but middleware not enforcing permissions
   - All routes effectively admin-only

2. **PWA/Offline Support** (Phase 2)
   - No `vite-plugin-pwa` configured
   - No service worker
   - No offline data persistence

3. **PHC Materials Tracking** (Phase 5)
   - No `job_materials` table
   - No EPA compliance fields

4. **QuickBooks Integration** (Phase 7)
   - Service stub exists
   - No OAuth flow implemented
   - No actual sync logic

5. **AI Visualizer** (Phase 10)
   - No canvas/masking UI
   - No generative AI integration

---

## Migration Strategy

### Approach: Incremental Refactoring

We will migrate to the modular architecture incrementally, keeping the app functional at every step.

**Principles:**
1. Extract, don't rewrite
2. One module at a time
3. Maintain backward compatibility
4. Add tests before refactoring

### Migration Order

```
Phase 1: Core Infrastructure
├── Extract db, auth, utils to modules/core
├── Add RBAC middleware
└── Add unit tests

Phase 2: Extract Domain Modules (in order)
├── modules/crm (clients, properties, contacts)
├── modules/quotes
├── modules/jobs
├── modules/crew
├── modules/equipment
├── modules/invoices
├── modules/automation
├── modules/analytics
└── modules/ai

Phase 3: Slim Down server.js
├── Move remaining code to appropriate modules
├── server.js becomes ~100 lines (bootstrap only)
└── Verify all tests pass
```

---

## Technical Decisions

### 1. Why Modular Monolith (Not Microservices)?

- **Simpler deployment** - Single process, single database
- **Easier refactoring** - Can split later if needed
- **Lower complexity** - No service mesh, no distributed tracing
- **Team size** - Appropriate for small-medium teams

### 2. Why Not Full Backend Rewrite?

- **Risk** - Existing features work; rewrite introduces bugs
- **Time** - Incremental migration is faster to first value
- **Testing** - Can add tests module-by-module

### 3. PWA Stack Choice

- **vite-plugin-pwa** - Standard for Vite projects
- **React Query Persist** - Built-in cache persistence
- **IndexedDB** - For offline write queue

### 4. RBAC Implementation

- **Middleware-based** - `requireRole(['admin', 'manager'])`
- **Resource-based** - Additional checks for row-level access
- **Audit trail** - Log all permission denials

---

## Next Steps

See [docs/implementation_plan.md](./implementation_plan.md) for the detailed phase-by-phase checklist.
