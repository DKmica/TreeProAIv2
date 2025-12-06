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
1. Phase 1: Backend Refactor + RBAC enforcement (4-6 weeks)
2. Phase 2: PWA/Offline foundation for field crews (2-3 weeks)
3. Phase 7: QuickBooks Online integration (revenue critical)