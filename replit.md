# TreePro AI - Replit Project Documentation

## Overview
TreePro AI is a comprehensive business management platform for tree service companies, powered by Google Gemini AI. This full-stack application provides AI-powered tools for estimating, lead management, job scheduling, and overall business intelligence, aiming to enhance efficiency and decision-making for tree service professionals.

## User Preferences
I prefer that the AI assistant prioritizes clear and concise explanations. When proposing code changes, please provide a high-level overview of the approach first and ask for confirmation before implementing detailed modifications. I value iterative development, so small, reviewable changes are preferred over large, monolithic updates. For any significant architectural decisions or third-party integrations, please consult me beforehand. I prefer to use the latest stable versions of frameworks and libraries unless there's a compelling reason otherwise.

## System Architecture

### UI/UX Decisions
The application features a modern, dark theme with bright cyan (#00c2ff) accents against a dark navy/gray background (#0a1628 to #102a43). It includes a custom "futuristic AI circuit tree" logo and consistent branding across all UI components, including form stylings and active states.

### Technical Implementations
- **Frontend**: Built with React 19, TypeScript, and Vite, using TailwindCSS for styling and React Router DOM (HashRouter) for navigation.
- **Backend**: Developed using Node.js and Express, providing a RESTful API.
- **Database**: PostgreSQL 14+ is used, with schema initialized from `backend/init.sql`.
- **AI Core**: A centralized `aiCore.ts` service loads all business data to maintain real-time context and integrates an extensive arborist knowledge base. It supports 58 distinct function calls across various business categories.
- **CRM System**: Implements a professional client hierarchy: Client → Properties → Contacts. Editors use consistent modal patterns with dark theme, cyan accents, and validation.
- **RAG (Retrieval-Augmented Generation)**: Provides semantic search over business data using Google Gemini text-embedding-004. Relevant context is retrieved and injected into Gemini prompts to ground AI responses in actual business data.
- **AI Assistant Integration**: The `useAICore.ts` hook manages chat history with Gemini 2.0 Flash, executes AI function calls, and handles navigation, with RAG context injection for enhanced accuracy.
- **Voice Recognition**: Features continuous listening, wake word detection ("yo probot"), command accumulation, and wake word removal.
- **Data Flow**: Backend APIs handle `snake_case` to `camelCase` transformations and embed related objects.

### Feature Specifications
- **AI-Powered Tree Estimating**: Utilizes Gemini for detailed estimates, including removal prices and suggested additional services, adhering to updated pricing guidelines.
- **AI Estimator Feedback & Learning System**: Allows users to rate estimates and provide correction reasons, storing feedback in the `estimate_feedback` table. An analytics dashboard tracks accuracy metrics.
- **AI Assistant**: Offers contextual help, arborist expertise, and can perform app actions.
- **Lead and Job Management**: Provides CRUD operations for clients, leads, quotes, and jobs, including lead status tracking and quote conversion.
- **Multi-View Calendar System**: Advanced job scheduling with Day, 3-Day, Week, Month, List, and Map views. Supports drag-and-drop rescheduling and filtering.
- **Financial Tools**: Includes revenue tracking, outstanding invoices, and payroll.
- **Business Analytics**: Provides metrics like lead conversion and crew utilization.
- **Authentication**: Supports owner accounts with full access.
- **Job State Machine**: Comprehensive job workflow with 10 states, guarded transitions, automated triggers, and an audit trail.
- **Job Templates**: Reusable job configurations to standardize services and accelerate job creation, with a library of seed templates and usage tracking.
- **Phase 2B Operations & Scheduling (COMPLETE)**: Comprehensive operational management system with five major deliverables:
  - **Crew Management**: Complete crew organization with crew creation, member assignment, role management (leader, climber, groundsman, driver), capacity tracking, and job assignments. 14 backend endpoints and full CRUD UI.
  - **Time Tracking**: Clock in/out with GPS tracking, break management, manager approval workflow, and automated timesheet generation. 9 backend endpoints with TimeTracking page featuring 4 tabs.
  - **Job Assignment System**: Atomic crew-to-job assignments with conflict detection, bulk operations, and reassignment capabilities. 4 backend endpoints with transactional guarantees.
  - **Calendar Integration**: New Crew view mode with Gantt-style schedule, drag-and-drop job assignments, real-time conflict warnings (visual indicators, tooltips, summary banners), and seamless integration with existing calendar views.
  - **Job Forms System**: Dynamic form templates and job-specific forms (safety checklists, inspections, work orders, approvals) with 7 field types, validation, completion tracking, and manager workflows. 12 backend endpoints, 5 seed templates, integrated into Jobs page.

### System Design Choices
- **Microservice-like Structure**: AI functionalities are modularized into distinct services.
- **Environment Agnostic Configuration**: Supports seamless operation in development and production environments.
- **Scalability**: Designed for stateless deployment with a production build script.

## External Dependencies

- **Google Gemini API**: Used for all AI functionalities (estimating, assistant, business intelligence).
- **Google Maps API**: Integrated for location-based features.
- **PostgreSQL**: Primary database system.
- **React**: Frontend JavaScript library.
- **Node.js/Express**: Backend runtime and web framework.
- **TailwindCSS**: CSS framework.
- **React Router DOM**: For client-side routing.
- **Vite**: Frontend build tool.