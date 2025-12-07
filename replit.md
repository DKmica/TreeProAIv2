# TreePro AI

## Overview

TreePro AI is an AI-powered business management platform designed for tree service companies. It integrates CRM, job management, and financial tools with advanced AI capabilities from Google Gemini. The platform's purpose is to streamline workflows from lead generation to invoicing, offering intelligent insights and automation to the tree service industry. It has a production-ready foundation with core CRM, job management, and AI features operational.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend uses React 19 with TypeScript, Vite 6.4.1, and React Router DOM v6.30.1. State management is handled with React hooks, Context API, and TanStack Query v5.90.10. Styling is managed with TailwindCSS 3.4.18, a custom design system with a brand color palette, and Lucide React icons, following a mobile-first responsive design with a dark theme. Key design patterns include protected routes, lazy loading, error boundaries, toast notifications, and a command palette. PWA features with offline support and IndexedDB persistence are implemented for field crews, including a custom offline indicator and sync functionality.

### Backend Architecture

The backend is built with Node.js and Express.js, providing a RESTful API on port 3001 with CORS enabled. Authentication uses Replit Auth (OpenID Connect) with `express-session` backed by PostgreSQL (`connect-pg-simple`) and `passport.js` for OAuth handling. Users can sign in via Google, GitHub, X, Apple, or email/password. A comprehensive RBAC system provides granular access control and audit logging. The API has a modular route structure with centralized error handling and UUID-based resource identifiers. Business logic is isolated using a service layer pattern, which includes a job state machine, a template system, and an automation engine. Key services encompass RAG, vector store, job lifecycle management, and payment integration. The backend also supports equipment usage and maintenance tracking, and a time tracking system with GPS capture and an approval workflow.

### Database Design

PostgreSQL 14+ is the primary database, utilizing `node-postgres` with connection pooling. The schema supports a 3-tier client hierarchy (Clients → Properties → Contacts), soft deletes via `deleted_at` timestamps, full-text search indexes (GIN), and JSONB columns for flexible metadata. Key data models cover clients, properties, contacts, leads, quotes, jobs, invoices, employees, equipment, and templates. Performance features include automatic retry on connection failures, graceful error handling, connection pooling, and prepared statements.

### AI/ML Integration

Google Gemini (`@google/genai` v1.27.0) is the primary AI provider, using `gemini-2.0-flash` for chat and `text-embedding-004` for vector embeddings. AI features include an AI Tree Estimator, a RAG system for context-aware AI, a voice interface, a built-in arborist knowledge base, and AI-driven workflow automation. Vector embeddings are stored in ChromaDB, and context injection is dynamic based on user workflow.

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