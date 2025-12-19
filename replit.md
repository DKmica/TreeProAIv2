# TreePro AI

## Overview

TreePro AI is an AI-powered business management platform designed for tree service companies. It integrates CRM, job management, and financial tools with advanced AI capabilities from Google Gemini. The platform's purpose is to streamline workflows from lead generation to invoicing, offering intelligent insights and automation to the tree service industry. It has a production-ready foundation with core CRM, job management, and AI features operational, aiming to provide a comprehensive solution for the tree service industry.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend uses React 19 with TypeScript, Vite 6.4.1, and React Router DOM v6.30.1. State management is handled with React hooks, Context API, and TanStack Query v5.90.10. Styling is managed with TailwindCSS 3.4.18, a custom design system with a brand color palette, and Lucide React icons, following a mobile-first responsive design with a dark theme. Key design patterns include protected routes, lazy loading, error boundaries, toast notifications, and a command palette. PWA features with offline support and IndexedDB persistence are implemented for field crews, including a custom offline indicator and sync functionality. UI/UX patterns include light-themed form utilities, a reusable `FormCombobox` component, and specialized card designs for quotes and leads.

### Backend Architecture

The backend is built with Node.js and Express.js, providing a RESTful API on port 3001 with CORS enabled. Authentication uses local email/password (bcryptjs) with `express-session` backed by PostgreSQL (`connect-pg-simple`) and `passport.js` for local strategy handling.

#### Role-Based Access Control (RBAC)

A comprehensive RBAC system provides granular access control with roles including Owner, Admin, Manager, Sales/Scheduler, Foreman, Laborer/Crew, and Customer. New signups require owner approval, and the user management UI is owner-only. Role-based navigation dynamically adjusts the sidebar based on user roles, and routes are protected with `RoleProtectedRoute`.

The API has a modular route structure with centralized error handling and UUID-based resource identifiers. Business logic is isolated using a service layer pattern, which includes a job state machine, a template system, and an automation engine. Key services encompass RAG, vector store, job lifecycle management, and payment integration. The backend also supports equipment usage and maintenance tracking, and a time tracking system with GPS capture and an approval workflow. An event-driven workflow system uses a `domain_events` table for tracking async business events with retry capability.

### Database Design

PostgreSQL 14+ is the primary database, utilizing `node-postgres` with connection pooling. The schema supports a 3-tier client hierarchy (Clients → Properties → Contacts), soft deletes via `deleted_at` timestamps, full-text search indexes (GIN), and JSONB columns for flexible metadata. Key data models cover clients, properties, contacts, leads, quotes, jobs, invoices, employees, equipment, and templates.

### AI/ML Integration

Google Gemini (`@google/genai` v1.27.0) is the primary AI provider, using `gemini-2.0-flash` for chat and `text-embedding-004` for vector embeddings. AI features include an AI Tree Estimator, a RAG system for context-aware AI, a voice interface, a built-in arborist knowledge base, and AI-driven workflow automation. Vector embeddings are stored in ChromaDB, and context injection is dynamic based on user workflow. The AI module includes an Estimator Service for logging estimates and feedback, an Assistant Service for intent detection and conversational responses, and a Scheduling Helper for job duration prediction and crew optimization.

### PHC & Inventory

The platform includes Plant Health Care (PHC) compliance tracking with a `MaterialUsageForm` for recording application details and a `material_inventory` table for product information, EPA registration, safety data, and inventory tracking. A PHC Compliance Report provides filtering, compliance indicators, and export features.

### Scheduling & Route Optimization

The platform offers comprehensive scheduling features including Calendar Views (Day, Week, Month, ThreeDay, List), a Crew Timeline View with drag-and-drop rescheduling, and a Map View with Google Maps integration. Recurring jobs with various patterns and auto-generation are supported. Route optimization features include an API for optimizing crew routes, a `RoutePlanDrawer` for stop reordering, travel time calculations, and customer notifications. Crew status tracking and capacity planning are also integrated.

### Financial Features

The platform supports progress billing, batch invoicing, and an A/R Aging Dashboard. Client payment history is accessible via a customer portal. Customizable invoice templates are available. Stripe is integrated for credit card and ACH bank transfer payments, with webhook handling for async settlement.

### Reporting & Business Intelligence

A Reports Dashboard (`/reports`) provides comprehensive business analytics through a Backend Analytics Service. This includes sales funnel metrics, job profitability analysis, crew productivity tracking, equipment utilization rates, and revenue breakdowns by service type and over time. The UI offers KPI cards, interactive charts, date range filters, and CSV export.

### Testing Strategy

Unit and integration testing are performed with Vitest and React Testing Library. End-to-end testing uses Playwright for browser automation.

## External Dependencies

### Third-Party Services

-   **Stripe (v20.0.0)**: For payment processing.
-   **Google Gemini API**: For AI and machine learning capabilities.
-   **Google Maps API**: For mapping, location services, and route optimization.
-   **SendGrid (@sendgrid/mail v8.1.6)**: For transactional emails.

### Development Tools

-   **pnpm**: Package management.
-   **TypeScript**: Type safety.
-   **ESLint**: Code quality.
-   **Dyad component tagger**: Debugging.