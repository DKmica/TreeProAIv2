# TreePro AI

## Overview

TreePro AI is a comprehensive, AI-powered business management platform designed specifically for tree service companies. It combines traditional CRM, job management, and financial tools with advanced AI capabilities powered by Google Gemini. The platform helps tree service businesses manage their entire workflow from lead generation through job completion and invoicing, while providing intelligent insights and automation.

**Current Status:** Production-ready foundation with active development. Core CRM, job management, and AI features are fully operational in Phase 2 (Partial).

## Recent Changes

### December 2024 - Data Display Bug Fixes

**Fixed Issues:**
1. **Date fields returning empty objects** - Fixed `snakeToCamel` and `camelToSnake` utility functions in `backend/utils/formatters.js` to properly preserve Date objects, Buffers, and other special types during transformation
2. **Client activity endpoint missing** - Added `GET /api/clients/:id/activity` endpoint in `backend/routes/clients.js` that aggregates activity from quotes, jobs, and invoices
3. **Client detail page 404 error** - Fixed by implementing the missing activity endpoint

**Technical Details:**
- The formatters were recursively converting Date objects (which have no enumerable properties) into empty objects
- Added checks for `instanceof Date`, `Buffer.isBuffer()`, and non-plain objects to preserve their values
- Activity endpoint generates synthetic activity feed from related quote, job, and invoice records

### December 2024 - PDF Download and Email Feature

**New Feature: PDF Generation and Delivery**
All quotes, invoices, work orders, and form submissions can now be downloaded as PDFs or sent via email.

**Key Components:**
- `backend/services/pdfService.js` - PDF generation using pdfmake library
- `backend/routes/pdf.js` - REST endpoints for download and email delivery
- Updated frontend pages with Download/Send PDF buttons

**API Endpoints:**
- `GET /api/quotes/:id/pdf` - Download quote as PDF
- `GET /api/invoices/:id/pdf` - Download invoice as PDF
- `GET /api/jobs/:id/pdf` - Download work order as PDF
- `GET /api/form-submissions/:id/pdf` - Download form submission as PDF
- `POST /api/{type}/:id/send-pdf` - Email PDF to customer (accepts email, subject, message)

**Features:**
1. Professional TreePro AI branded PDFs with cyan accent color
2. Clean tables for line items with alternating row colors
3. Email modal for sending PDFs to customers
4. Pre-filled email fields (recipient, subject)
5. Works with SendGrid integration (when configured)

**Frontend Updates:**
- `pages/QuoteDetail.tsx` - Download PDF and Send PDF buttons
- `pages/Invoices.tsx` - PDF download/email in invoice row actions
- `pages/Jobs.tsx` - Work order PDF download/email
- `components/JobFormSubmission.tsx` - Form PDF for completed submissions

### December 2024 - Form Templates Sample Seeding

**New Feature: Sample Form Templates**
Added 5 professional form templates for tree service operations with ability to load them in production.

**Sample Templates:**
1. Pre-Job Safety Checklist - PPE, equipment, hazards, weather conditions
2. Tree Removal Inspection - Species, height, health, obstacles, equipment recommendations
3. Equipment Check - Daily equipment inspection and maintenance
4. Customer Approval Form - Customer satisfaction and sign-off
5. Job Completion Checklist - Quality assurance and cleanup verification

**Key Components:**
- `POST /api/form-templates/seed` - Backend endpoint to seed sample templates
- `pages/FormTemplates.tsx` - Added "Load Sample Templates" button
- `services/apiService.ts` - Added `formService.seedTemplates()` function

**Features:**
- Idempotency checks prevent duplicate templates
- UI shows success/error messages after seeding
- Templates work with all categories (safety, inspection, equipment, approval, completion)

**Production Database Note:**
Schema changes sync automatically when publishing. To add sample templates in production:
1. Go to Form Templates page
2. Click "Load Sample Templates" button
3. Templates will be inserted with duplicate checking

### December 2024 - Document Scanner Feature

**New Feature: Document Scanner**
AI-powered system to digitize handwritten service contracts using Google Gemini Vision API.

**Key Components:**
- `backend/routes/documents.js` - Backend API for document upload, AI extraction, and record creation
- `pages/DocumentScanner.tsx` - Frontend 3-step workflow: Upload → Review → Create Records
- `components/icons/ScanIcon.tsx` - Custom icon for sidebar navigation
- `backend/init.sql` - New `document_scans` table for scan tracking

**Features:**
1. Upload photos of handwritten contracts (JPEG, PNG, HEIC up to 25MB)
2. AI extracts customer info, work description, pricing, dates, tree species, services
3. Review and edit extracted data with confidence scores
4. Create client, property, job, and invoice records in one click
5. Transaction-wrapped record creation prevents partial data
6. Idempotency checks prevent duplicate records on retry

**Sidebar Reorganization:**
- Removed grouped sections (QUICK ACCESS, SALES, WORK, etc.)
- Flat, logical workflow-ordered navigation
- Document Scanner placed after Jobs for easy access

### December 2024 - Bug Fixes and Feature Completion

**Fixed Issues:**
1. **Workflows Page Error** - Removed duplicate imports in pages/Workflows.tsx that blocked the page from loading
2. **Missing API Routes** - Created backend routes for:
   - `/api/segments` - Customer segmentation with audience counts
   - `/api/integrations/status` - Integration connection status (Stripe, Twilio, SendGrid)
   - `/api/ai/workflow-recommendations` - AI-powered workflow suggestions
   - `/api/ai/mode` - Toggle AI automation mode
3. **Stripe Integration** - Updated stripeClient.js to fetch credentials from Replit connection API with fallback to environment variables; fixed invalid API version
4. **Customer Segmentation** - Implemented proper date-based filtering for Active/Dormant customer segments using `lastServiceDate` criteria with subqueries against completed jobs
5. **Segments Route** - Fixed column reference error (used `work_ended_at` instead of non-existent `completed_at`)

**Integration Status:**
- Stripe: Supports both Replit connector and environment variable configuration
- SendGrid (Email): Disabled until SENDGRID_API_KEY is configured
- Twilio (SMS): Disabled until TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are configured

**Default Segments Available:**
- High Value Customers (lifetime value >= $5,000)
- Residential Clients (client_type = 'residential')
- Commercial Clients (client_type in ['commercial', 'property_manager'])
- Active Customers (service within last 6 months)
- Dormant Customers (no service in 1+ year)

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
- Note: User dismissed Replit's built-in Stripe integration. To enable payments, manually add STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY as secrets

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