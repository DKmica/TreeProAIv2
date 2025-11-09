# TreePro AI - Replit Project Documentation

## Overview
TreePro AI is a comprehensive business management platform for tree service companies, powered by Google Gemini AI. This full-stack application features a React frontend and a Node.js/Express backend, designed to streamline operations for tree care businesses. Its purpose is to provide AI-powered tools for estimating, lead management, job scheduling, and overall business intelligence, aiming to enhance efficiency and decision-making for tree service professionals.

## User Preferences
I prefer that the AI assistant prioritizes clear and concise explanations. When proposing code changes, please provide a high-level overview of the approach first and ask for confirmation before implementing detailed modifications. I value iterative development, so small, reviewable changes are preferred over large, monolithic updates. For any significant architectural decisions or third-party integrations, please consult me beforehand. I prefer to use the latest stable versions of frameworks and libraries unless there's a compelling reason otherwise.

## System Architecture

### UI/UX Decisions
The application utilizes a modern, dark theme with a primary color palette of bright cyan (#00c2ff) for accents and highlights, set against a dark navy/gray background (#0a1628 to #102a43). The design incorporates a custom "futuristic AI circuit tree" logo, consistent across the login page, sidebar, and other UI components. All form stylings and active states have been updated to reflect the cyan branding.

### Technical Implementations
- **Frontend**: Built with React 19, TypeScript, and Vite for a fast development experience. Styling is handled with TailwindCSS (CDN for development). React Router DOM (HashRouter) manages client-side navigation.
- **Backend**: Developed using Node.js and Express, providing a RESTful API.
- **Database**: PostgreSQL 14+ is used as the primary data store, managed by Replit. The schema is initialized from `backend/init.sql`.
- **AI Core**: A centralized AI Core service (`services/gemini/aiCore.ts`) loads all business data (clients, leads, quotes, jobs, employees, equipment, company profile) on initialization to maintain real-time context. It integrates an extensive arborist knowledge base covering tree species, pruning techniques, safety protocols, equipment, seasonal recommendations, and disease/pest knowledge. This core powers 58 distinct function calls across 9 categories: (1) Navigation & Records, (2) Customer/Lead Management, (3) Quote/Job Management, (4) Financial Operations, (5) Employee/Payroll, (6) Equipment & Inventory, (7) Business Analytics, (8) Documentation & Safety, (9) Weather & Scheduling, (10) Customer Communication, (11) Route & Logistics, (12) Tree Care Expertise, (13) Marketing & Growth, (14) Emergency Response, and (15) Help/Onboarding.
- **CRM System**: Professional client hierarchy with Client → Properties → Contacts structure. All editors follow consistent modal pattern with dark theme, cyan accents, validation, and camelCase/snake_case conversion via backend utilities.
- **RAG (Retrieval-Augmented Generation)**: Phase 1 implementation provides semantic search over business data. An in-memory vector store indexes 960 documents (300 clients, 300 leads, 200 quotes, 100 jobs, 30 employees, 30 equipment) using Google Gemini text-embedding-004. Before each ProBot query, relevant context is automatically retrieved via cosine similarity search and injected into the Gemini prompt, grounding AI responses in actual business data. RAG services located in `backend/services/` (embeddingService.js, vectorStore.js, ragService.js).
- **AI Assistant Integration**: The `useAICore.ts` hook manages conversational chat history with Gemini 2.0 Flash, executes AI function calls, and handles navigation requests. RAG context is automatically fetched and injected before each query to enhance response accuracy with real-time business data.
- **Voice Recognition**: Production-ready continuous listening implementation in `useVoiceRecognition.ts`. Features: (1) **Continuous Mode** - never stops/restarts between wake→command→wake transitions for smooth UX, (2) **Wake Word Detection** - accepts multiple variations ("yo probot", "your probot", "hey probot", "yo robot", "your robot") to handle speech recognition mishearing, (3) **Command Accumulation** - properly accumulates multi-word commands by appending new final transcripts instead of overwriting, (4) **isActiveRef Pattern** - clean on/off control that prevents unwanted auto-restarts, (5) **Wake Word Removal** - strips detected wake word from first command chunk to avoid sending it to AI.
- **Data Flow**: Backend APIs handle `snake_case` to `camelCase` transformations for consistency with frontend expectations and embed related objects (e.g., customer data in leads) to simplify data access.

### Feature Specifications
- **AI-Powered Tree Estimating**: Utilizes Gemini to generate detailed tree service estimates, always including removal prices and suggesting additional services. Updated pricing guidelines ensure realistic estimates: small trees ($500-2K), medium ($1.5K-4K), large ($3K-7K), extra-large ($5K-15K+) with trunk diameter premiums and hazard multipliers. Debris removal costs are included in total removal price, never separate.
- **AI Estimator Feedback & Learning System**: Complete feedback loop enabling continuous improvement of AI estimate accuracy. After generating an estimate, users can rate it as "Accurate", "Too Low", or "Too High", optionally providing the actual quoted price and correction reasons (tree size underestimated, hazards not accounted for, debris cost issues, trunk diameter underestimated, other). All feedback is stored in the `estimate_feedback` database table with full estimate context. A comprehensive analytics dashboard (`/estimate-feedback-analytics`) displays accuracy metrics including total feedback count, accuracy rate with visual progress bar, average price difference, feedback distribution, top correction reasons, and tree size analysis. Backend analytics endpoint calculates real-time statistics from all submitted feedback.
- **AI Assistant**: Provides contextual help, answers business-related questions, offers arborist expertise, and can perform actions like creating/updating records and navigating the app.
- **Lead and Job Management**: Comprehensive CRUD operations for clients (replacing legacy customers table), leads, quotes, and jobs, with features like lead status tracking, quote conversion to jobs, and crew assignment.
- **Multi-View Calendar System**: Advanced job scheduling with six distinct calendar views: (1) **Day View** - Detailed single-day view with full job information and drag-and-drop scheduling, (2) **3-Day View** - Three-day rolling view for short-term planning, (3) **Week View** - Traditional 7-day week grid for weekly planning, (4) **Month View** - Full month calendar grid with job overview, (5) **List View** - Chronological list grouped by date for easy scanning, (6) **Map View** - Geographic visualization of job locations with integration to existing MapView component. All views support drag-and-drop job rescheduling (except Map view), real-time filtering by status and employee, and maintain consistent styling with the app's dark theme and cyan accents. Centralized state management in `pages/Calendar.tsx` orchestrates view switching and shared functionality. Individual view components located in `pages/Calendar/views/` directory.
- **Financial Tools**: Includes revenue tracking, outstanding invoices management, and payroll processing.
- **Business Analytics**: Provides metrics like lead conversion rates, crew utilization, and upsell opportunity identification.
- **Authentication**: Owner accounts (`dakoenig4@gmail.com`, `nullgbow@gmail.com` with password `12Tree45`) provide full access.

### System Design Choices
- **Microservice-like Structure**: AI functionalities are modularized into distinct services (e.g., `estimateService.ts`, `businessService.ts`, `chatService.ts`, `marketingService.ts`) to promote separation of concerns.
- **Environment Agnostic Configuration**: Frontend and backend are configured to run seamlessly in both development (using `localhost` and specific ports) and production (using `0.0.0.0` and port 5000) environments, leveraging Replit's infrastructure.
- **Scalability**: Designed for stateless deployment (e.g., Cloud Run) with a `pnpm run build:production` script for optimized builds.

## Phase 1 CRM Implementation

### Clean Slate Approach
- Started fresh with new CRM database structure (no simulated data migration)
- Dropped legacy `customers` table in favor of professional client hierarchy
- Implemented Jobber-inspired FSM features following 4-phase roadmap

### Client Hierarchy
- **Clients** (300+ capacity): Company or individual customers with full contact info
- **Properties** (per client): Service locations with addresses, access codes, instructions
- **Contacts** (per client/property): Multiple contact persons with dynamic channels (email, phone, mobile, fax)

### Database Schema (Phase 1)
11 new tables created via migration `001_phase1_crm_tables.sql`:
- `clients` - Core client/customer data
- `properties` - Service locations for clients
- `contacts` - Contact persons
- `contact_channels` - Dynamic email/phone channels per contact
- `tags` - Reusable tag definitions
- `entity_tags` - Polymorphic tagging (clients, properties, quotes, jobs)
- `custom_field_definitions` - Custom field types
- `custom_field_values` - Custom field data per entity
- `quote_templates` - Reusable quote templates
- `quote_versions` - Quote versioning system
- `quote_followups` - Quote followup tracking

### Enhanced Tables
Existing tables updated with Phase 1 fields:
- `leads`: Added client_id_new, property_id, lead_score, priority, assigned_to, estimated_value
- `quotes`: Added client_id, property_id, quote_number, version, approval_status, financial fields
- `jobs`: Added client_id, property_id, job_number

### Frontend Components (Phase 1)
- **CRM Dashboard** (`pages/CRM.tsx`): Tabbed hub for clients, leads, quotes with search/filter
- **Client Detail** (`pages/ClientDetail.tsx`): 6-tab interface (Overview, Properties, Contacts, Quotes, Jobs, Activity)
- **Client Editor** (`components/ClientEditor.tsx`): Modal form for creating/editing clients
- **Property Editor** (`components/PropertyEditor.tsx`): Modal form for properties with auto-address population
- **Contact Editor** (`components/ContactEditor.tsx`): Modal form with dynamic channel management
- **Updated Quote Builder** (`pages/Quotes.tsx`): Now selects client + property instead of legacy customers

## External Dependencies

- **Google Gemini API**: Used for all AI functionalities, including tree estimating, AI assistant, and various business intelligence features. The `gemini-2.0-flash` model is currently in use.
- **Google Maps API**: Integrated for location-based features, likely customer coordinates and potentially future crew tracking.
- **PostgreSQL**: The primary database system, managed directly by Replit.
- **Phase 1 CRM Schema**: 11 new tables supporting client hierarchy, polymorphic tagging, custom fields, quote versioning, and enhanced lead/quote/job workflows.
- **React**: Frontend JavaScript library.
- **Node.js/Express**: Backend runtime and web framework.
- **TailwindCSS**: CSS framework for styling.
- **React Router DOM**: For client-side routing.
- **Vite**: Frontend build tool.
- **Nodemon**: For automatic backend server restarts during development.