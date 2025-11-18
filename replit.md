# TreePro AI - Replit Project Documentation

## Overview
TreePro AI is a comprehensive business management platform for tree service companies, powered by Google Gemini AI. This full-stack application provides AI-powered tools for estimating, lead management, job scheduling, and overall business intelligence, aiming to enhance efficiency and decision-making for tree service professionals. Its purpose is to enhance efficiency and decision-making for tree service professionals by offering a complete solution for their operational needs.

## User Preferences
I prefer that the AI assistant prioritizes clear and concise explanations. When proposing code changes, please provide a high-level overview of the approach first and ask for confirmation before implementing detailed modifications. I value iterative development, so small, reviewable changes are preferred over large, monolithic updates. For any significant architectural decisions or third-party integrations, please consult me beforehand. I prefer to use the latest stable versions of frameworks and libraries unless there's a compelling reason otherwise.

## System Architecture

### UI/UX Decisions
The application features a modern, dark theme with bright cyan (#00c2ff) accents against a dark navy/gray background (#0a1628 to #102a43). It includes a custom "futuristic AI circuit tree" logo and consistent branding across all UI components, including form stylings and active states. The UI is designed to be fully mobile-responsive across all pages and forms, with tables converting to card layouts on mobile devices and modals adapting to small screens (375px+ viewport).

### Technical Implementations
- **Frontend**: Built with React 19, TypeScript, and Vite, using TailwindCSS (PostCSS plugin) for styling and React Router DOM (BrowserRouter with v7 future flags) for navigation.
- **Backend**: Developed using Node.js and Express, providing a RESTful API.
- **Database**: PostgreSQL 14+ is used, with schema initialized from `backend/init.sql`.
- **AI Core**: A centralized `aiCore.ts` service loads business data, integrates an arborist knowledge base, and supports 58 distinct function calls.
- **CRM System**: Implements a client hierarchy (Client → Properties → Contacts) with consistent modal patterns for editing.
- **RAG (Retrieval-Augmented Generation)**: Uses Google Gemini text-embedding-004 for semantic search, grounding AI responses with relevant business data.
- **AI Assistant Integration**: The `useAICore.ts` hook manages chat history, executes AI function calls, and handles navigation, with RAG context injection.
- **Voice Recognition**: Features continuous listening, "yo probot" wake word detection, and command accumulation.
- **Data Flow**: Backend APIs handle `snake_case` to `camelCase` transformations and embed related objects.

### Feature Specifications
- **AI-Powered Estimating**: Uses Gemini for detailed estimates, including pricing and suggested services.
- **AI Estimator Feedback & Learning**: Allows users to rate estimates and provide correction reasons, improving AI accuracy.
- **AI Assistant**: Provides contextual help, arborist expertise, and can perform app actions.
- **Lead and Job Management**: Comprehensive CRUD operations for clients, leads, quotes, and jobs, including lead status tracking and quote conversion.
- **Multi-View Calendar System**: Advanced job scheduling with various views, drag-and-drop rescheduling, and filtering.
- **Financial Tools**: Includes revenue tracking, outstanding invoices, and payroll.
- **Business Analytics**: Provides metrics like lead conversion and crew utilization.
- **Authentication**: Supports owner accounts with full access.
- **Job State Machine**: A 10-state job workflow with guarded transitions, automated triggers, and an audit trail.
- **Job Templates**: Reusable configurations for standardizing services and accelerating job creation.
- **Operations & Scheduling**: Includes crew management (creation, assignment, roles, capacity), time tracking (clock in/out, GPS, approvals), atomic job assignment with conflict detection, calendar integration (Gantt-style crew view with conflict warnings), and a dynamic job forms system (safety checklists, inspections, work orders).
- **Invoice Management System**: Professional invoicing with comprehensive financial tracking including auto-generated invoice numbers, tax/discount calculations, payment recording, and a status workflow (Draft→Sent→Paid/Overdue→Void). Supports "Create from Job" functionality.

### System Design Choices
- **Microservice-like Structure**: AI functionalities are modularized into distinct services.
- **Environment Agnostic Configuration**: Supports seamless operation in development and production environments.
- **Scalability**: Designed for stateless deployment with a production build script.
- **Database Connection Resilience**: PostgreSQL connection pool includes error handlers and reuses the main pool for session storage.
- **Graceful Error Handling**: Critical services include error handlers to log issues without crashing the application.
- **Testing Infrastructure**: Comprehensive testing setup with Vitest, Testing Library, Playwright, and Supertest for unit, integration, and E2E tests, with automated backend server management for tests.

## External Dependencies

- **Google Gemini API**: Used for all AI functionalities (estimating, assistant, business intelligence).
- **Google Maps API**: Integrated for location-based features with async loading optimization.
- **PostgreSQL**: Primary database system.
- **React**: Frontend JavaScript library.
- **Node.js/Express**: Backend runtime and web framework.
- **TailwindCSS**: CSS framework configured as PostCSS plugin.
- **React Router DOM**: For client-side routing.
- **Vite**: Frontend build tool.