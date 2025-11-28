# TreePro AI

## Overview

TreePro AI is a comprehensive, AI-powered business management platform designed specifically for tree service companies. It combines traditional CRM, job management, and financial tools with advanced AI capabilities powered by Google Gemini. The platform helps tree service businesses manage their entire workflow from lead generation through job completion and invoicing, while providing intelligent insights and automation.

**Current Status:** Production-ready foundation with active development. Core CRM, job management, and AI features are fully operational in Phase 2 (Partial).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 19 with TypeScript for type safety and modern features
- Vite 6.4.1 as the build tool for fast development and optimized production builds
- React Router DOM v6.30.1 with v7 future flags enabled for routing
- Code splitting using React.lazy() and Suspense for optimal bundle sizes
- Hot Module Replacement (HMR) enabled for rapid development

**State Management:**
- React hooks and Context API for local and shared state
- TanStack Query (React Query) v5.90.10 for server state management, caching, and data synchronization
- Custom contexts: AuthContext, AppDataContext, CrewSyncContext, QueryClientProvider

**Styling & UI:**
- TailwindCSS 3.4.18 via PostCSS for utility-first styling
- Custom design system with brand color palette (cyan, green, gray variants)
- Custom UI components with Lucide React icons
- Mobile-first responsive design approach
- Dark theme optimized for reduced eye strain

**Key Design Patterns:**
- Protected routes for authentication enforcement
- Lazy loading for code splitting and performance
- Error boundaries for graceful error handling
- Toast notifications for user feedback
- Command palette for global search and navigation

### Backend Architecture

**Server Framework:**
- Node.js runtime with Express.js framework
- RESTful API design pattern
- Port 3001 (HTTP on 0.0.0.0)
- CORS enabled for cross-origin requests

**Authentication & Sessions:**
- Token-based authentication (Bearer tokens or x-api-key header)
- express-session with PostgreSQL store (connect-pg-simple)
- Configurable AUTH_TOKEN for production environments
- Falls back to default admin user when AUTH_TOKEN is not set

**API Organization:**
- Modular route structure (routes/leads.js, etc.)
- Utility formatters for snake_case/camelCase conversion
- Centralized error handling middleware
- UUID-based resource identifiers

**Business Logic Layers:**
- Service layer pattern for business logic isolation
- Job state machine with 10 validated states and transition rules
- Template system for jobs and forms
- Automation engine for workflow triggers
- RAG (Retrieval-Augmented Generation) service for AI context

**Key Services:**
- `ragService`: AI knowledge base and context retrieval
- `vectorStore`: Embeddings storage for semantic search
- `jobStateService`: Job lifecycle and state transitions
- `jobTemplateService`: Reusable job configurations
- `operationsService`: Operational analytics and optimization
- `recurringJobsService`: Scheduled recurring work
- `stripeService`: Payment processing integration
- `automationService`: Workflow automation triggers
- `reminderService`: Scheduled notifications

### Database Design

**Technology:**
- PostgreSQL 14+ as the primary data store
- node-postgres (pg) driver with connection pooling (max 10 connections)
- Self-hosted or managed provider support (Neon recommended)

**Schema Architecture:**
- Professional 3-tier client hierarchy: Clients → Properties → Contacts
- Soft deletes using deleted_at timestamps for audit trails
- Full-text search indexes (GIN) for performance
- JSONB columns for flexible metadata storage (line_items, messages, etc.)

**Key Data Models:**
- **Clients**: Business entities with type (residential/commercial/property_manager)
- **Properties**: Physical locations linked to clients
- **Contacts**: Communication channels per property or client
- **Leads**: Potential opportunities with scoring and priority
- **Quotes**: Multi-tier pricing options (Good/Better/Best)
- **Jobs**: Work orders with 10-state lifecycle
- **Invoices**: Billing with payment tracking
- **Employees & Crews**: Team management and scheduling
- **Equipment**: Asset tracking with maintenance history
- **Templates**: Reusable job and form configurations

**Performance Features:**
- Automatic retry on connection failures
- Graceful error handling with detailed logging
- Connection pooling for concurrent requests
- Prepared statements for SQL injection prevention

### AI/ML Integration

**Primary AI Provider:**
- Google Gemini via `@google/genai` v1.27.0
- Model: `gemini-2.0-flash` for fast chat and estimation responses
- Model: `text-embedding-004` for vector embeddings

**AI Features:**
- **AI Tree Estimator**: Gemini-powered pricing analysis
- **RAG System**: Context-aware AI with business data retrieval
- **Voice Interface**: Voice command recognition for hands-free operation
- **Knowledge Base**: Built-in arborist expertise and tree care information
- **Automation**: AI-driven workflow suggestions and optimizations

**Implementation:**
- Custom hooks: `useAICore`, `useVoiceRecognition`
- Vector embeddings stored in ChromaDB for semantic search
- Context injection based on current page and user workflow
- Streaming responses for real-time interaction

### Testing Strategy

**Unit & Integration Testing:**
- Vitest as the test runner with jsdom environment
- React Testing Library for component testing
- Coverage reporting with v8 provider
- Organized test structure: tests/unit, tests/integration

**End-to-End Testing:**
- Playwright for browser automation
- Configured for Chromium (Desktop Chrome)
- Screenshot and video capture on failures
- HTML reporting for test results

**Test Configuration:**
- Global test setup in tests/setup/setup.ts
- Path aliases matching main application (@, @components, etc.)
- Automatic dev server startup for E2E tests

## External Dependencies

### Third-Party Services

**Payment Processing:**
- Stripe (v20.0.0) for payment collection
- Webhook verification for secure event handling
- Environment variables: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET

**AI & Machine Learning:**
- Google Gemini API for natural language processing
- Environment variable: GEMINI_API_KEY

**Mapping & Geocoding:**
- Google Maps API for location services and route optimization
- Advanced markers for job visualization
- Environment variable: GOOGLE_MAPS_API_KEY

**Email Delivery:**
- SendGrid (@sendgrid/mail v8.1.6) for transactional emails
- Quote approvals, invoice delivery, and notifications

### Development Tools

**Package Management:**
- pnpm recommended for dependency installation
- Concurrent script execution via concurrently package

**Code Quality:**
- TypeScript for type safety
- ESLint integration (implicit via build tools)
- Dyad component tagger for enhanced debugging

**Deployment:**
- Environment-specific configuration via .env files
- Build script creates production bundle in dist/
- Backend serves static assets from backend/public/
- Database initialization via backend/init.sql

### Browser Compatibility

**Supported Features:**
- Modern JavaScript (ES2022)
- CSS Grid and Flexbox
- Service Workers (PWA-ready)
- WebRTC for voice recognition
- LocalStorage for offline data persistence