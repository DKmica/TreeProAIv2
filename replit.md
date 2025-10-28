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
- **AI Core**: A centralized AI Core service (`services/gemini/aiCore.ts`) loads all business data (customers, leads, quotes, jobs, employees, equipment, company profile) on initialization to maintain real-time context. It integrates an extensive arborist knowledge base covering tree species, pruning techniques, safety protocols, equipment, seasonal recommendations, and disease/pest knowledge. This core powers 30 distinct function calls for navigation, customer/lead management, financial operations, employee/payroll, equipment, and analytics.
- **AI Assistant Integration**: The `useAICore.ts` hook manages conversational chat history with Gemini 2.0 Flash, executes AI function calls, and handles navigation requests.
- **Voice Recognition**: A rebuilt `useVoiceRecognition.ts` hook provides stable voice commands, featuring a "Yo Probot" wake word, command capture, and clear state management.
- **Data Flow**: Backend APIs handle `snake_case` to `camelCase` transformations for consistency with frontend expectations and embed related objects (e.g., customer data in leads) to simplify data access.

### Feature Specifications
- **AI-Powered Tree Estimating**: Utilizes Gemini to generate detailed tree service estimates, always including removal prices and suggesting additional services.
- **AI Assistant**: Provides contextual help, answers business-related questions, offers arborist expertise, and can perform actions like creating/updating records and navigating the app.
- **Lead and Job Management**: Comprehensive CRUD operations for customers, leads, quotes, and jobs, with features like lead status tracking, quote conversion to jobs, and crew assignment.
- **Financial Tools**: Includes revenue tracking, outstanding invoices management, and payroll processing.
- **Business Analytics**: Provides metrics like lead conversion rates, crew utilization, and upsell opportunity identification.
- **Authentication**: Owner accounts (`dakoenig4@gmail.com`, `nullgbow@gmail.com` with password `12Tree45`) provide full access.

### System Design Choices
- **Microservice-like Structure**: AI functionalities are modularized into distinct services (e.g., `estimateService.ts`, `businessService.ts`, `chatService.ts`, `marketingService.ts`) to promote separation of concerns.
- **Environment Agnostic Configuration**: Frontend and backend are configured to run seamlessly in both development (using `localhost` and specific ports) and production (using `0.0.0.0` and port 5000) environments, leveraging Replit's infrastructure.
- **Scalability**: Designed for stateless deployment (e.g., Cloud Run) with a `pnpm run build:production` script for optimized builds.

## External Dependencies

- **Google Gemini API**: Used for all AI functionalities, including tree estimating, AI assistant, and various business intelligence features. The `gemini-2.0-flash` model is currently in use.
- **Google Maps API**: Integrated for location-based features, likely customer coordinates and potentially future crew tracking.
- **PostgreSQL**: The primary database system, managed directly by Replit.
- **React**: Frontend JavaScript library.
- **Node.js/Express**: Backend runtime and web framework.
- **TailwindCSS**: CSS framework for styling.
- **React Router DOM**: For client-side routing.
- **Vite**: Frontend build tool.
- **Nodemon**: For automatic backend server restarts during development.