# TreePro AI

## Overview

TreePro AI is an AI-powered business management platform designed for tree service companies. It integrates CRM, job management, and financial tools with advanced AI capabilities from Google Gemini. The platform's purpose is to streamline workflows from lead generation to invoicing, offering intelligent insights and automation to the tree service industry. It has a production-ready foundation with core CRM, job management, and AI features operational.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend uses React 19 with TypeScript, Vite 6.4.1, and React Router DOM v6.30.1. State management is handled with React hooks, Context API, and TanStack Query v5.90.10. Styling is managed with TailwindCSS 3.4.18, a custom design system with a brand color palette, and Lucide React icons, following a mobile-first responsive design with a dark theme. Key design patterns include protected routes, lazy loading, error boundaries, toast notifications, and a command palette. PWA features with offline support and IndexedDB persistence are implemented for field crews, including a custom offline indicator and sync functionality.

#### UI/UX Design Patterns

- **Light-themed form utilities**: CSS utility classes `.input-light`, `.select-light`, `.textarea-light` in `index.css` provide consistent styling for inputs in light modal contexts with explicit text colors for visibility.
- **FormCombobox component**: Reusable searchable dropdown (`components/ui/FormCombobox.tsx`) with light/dark variants, keyboard navigation, clear button, and responsive mobile height (`max-h-[min(320px,50vh)]`).
- **Quote cards**: CRM quote cards display inline details (job location, selected line items with quantity, formatted pricing) with clickable card body to open QuoteViewer for full details.
- **Customer search**: QuoteEditor and LeadEditor use FormCombobox for searchable customer selection instead of basic dropdowns.

### Backend Architecture

The backend is built with Node.js and Express.js, providing a RESTful API on port 3001 with CORS enabled. Authentication uses Replit Auth (OpenID Connect) with `express-session` backed by PostgreSQL (`connect-pg-simple`) and `passport.js` for OAuth handling. Users can sign in via Google, GitHub, X, Apple, or email/password. A comprehensive RBAC system provides granular access control and audit logging. The API has a modular route structure with centralized error handling and UUID-based resource identifiers. Business logic is isolated using a service layer pattern, which includes a job state machine, a template system, and an automation engine. Key services encompass RAG, vector store, job lifecycle management, and payment integration. The backend also supports equipment usage and maintenance tracking, and a time tracking system with GPS capture and an approval workflow.

### Database Design

PostgreSQL 14+ is the primary database, utilizing `node-postgres` with connection pooling. The schema supports a 3-tier client hierarchy (Clients → Properties → Contacts), soft deletes via `deleted_at` timestamps, full-text search indexes (GIN), and JSONB columns for flexible metadata. Key data models cover clients, properties, contacts, leads, quotes, jobs, invoices, employees, equipment, and templates. Performance features include automatic retry on connection failures, graceful error handling, connection pooling, and prepared statements.

### AI/ML Integration

Google Gemini (`@google/genai` v1.27.0) is the primary AI provider, using `gemini-2.0-flash` for chat and `text-embedding-004` for vector embeddings. AI features include an AI Tree Estimator, a RAG system for context-aware AI, a voice interface, a built-in arborist knowledge base, and AI-driven workflow automation. Vector embeddings are stored in ChromaDB, and context injection is dynamic based on user workflow.

#### AI Module Architecture (Phase 9)

The backend AI module (`backend/src/modules/ai/`) provides enhanced AI capabilities:

- **Estimator Service** (`estimatorService.js`): Logs AI tree estimates with operator feedback tracking (accurate/too_high/too_low), training data export for model improvement, and accuracy metrics dashboard support.
- **Assistant Service** (`assistantService.js`): ProBot intent detection for natural language business queries including "jobs tomorrow", "revenue last month", "overdue invoices", and "crew availability". Uses Gemini to generate conversational responses enriched with real-time database context.
- **Scheduling Helper** (`schedulingHelper.js`): AI-powered job duration prediction based on historical data with rule-based fallback, crew conflict detection using JSONB array overlaps, and optimal crew assignment recommendations using certifications and performance metrics.

#### AI API Endpoints

- `/api/ai/estimates/*`: Create, log feedback, export training data, view stats
- `/api/ai/assistant/*`: Natural language chat, specific intent queries (jobs/revenue/invoices/availability)
- `/api/ai/scheduling/*`: Duration prediction, conflict detection, crew suggestions, daily scheduling insights

Database tables: `ai_estimate_logs` (estimation history), `job_duration_history` (actual vs predicted tracking).

### Testing Strategy

Unit and integration testing are performed with Vitest and React Testing Library, providing coverage reporting. End-to-end testing uses Playwright for browser automation, configured for Chromium with screenshot and video capture on failures, and HTML reporting.

## External Dependencies

### Third-Party Services

-   **Stripe (v20.0.0)**: For payment processing.
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