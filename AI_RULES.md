# AI Rules for TreePro AI

## Tech Stack

- **Frontend Framework**: React with TypeScript
- **Routing**: React Router DOM
- **UI Library**: Tailwind CSS for styling
- **AI Integration**: Google Gemini API
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **ORM**: pg (PostgreSQL client)
- **Build Tool**: Vite
- **Containerization**: Docker
- **Deployment**: Google Cloud Run

## Library Usage Rules

### UI Components
- **shadcn/ui**: Preferred for complex UI components
- **Lucide React**: Use for icons throughout the application
- **Tailwind CSS**: Always use for styling components

### AI Services
- **@google/genai**: Only library to use for Google Gemini integration
- All AI features must be implemented through the `services/geminiService.ts` wrapper

### Data Management
- **services/apiService.ts**: All API calls must go through this service
- **types.ts**: All data type definitions must be centralized here
- **data/mockData.ts**: Use for mock data in development

### Maps
- **Google Maps API**: Only map service to use
- **services/mapsLoader.ts**: Use this service to load Google Maps scripts

### State Management
- **React Context API**: Use for global state (e.g., AuthContext)
- **React Hooks**: useState, useEffect, useMemo, useCallback for component state

### Routing
- **React Router DOM**: Only routing library to use
- All routes must be defined in `App.tsx`

### Forms
- **React Hook Form**: Preferred for complex forms (when needed)
- **Native form elements**: Acceptable for simple forms

### HTTP Client
- **fetch API**: Use for all HTTP requests
- **axios**: Not allowed

### Date Management
- **date-fns**: Preferred for date manipulation (when needed)
- **Native Date**: Acceptable for simple date operations

### Utility Libraries
- **uuid**: For generating unique IDs
- **lodash**: Only for complex data manipulation (when necessary)

## AI Implementation Rules

1. All AI features must be implemented through the `services/geminiService.ts` wrapper
2. AI responses should be streamed when possible for better UX
3. Always handle AI errors gracefully with user-friendly messages
4. Use function calling for structured AI interactions with the app
5. Implement proper loading states for AI operations
6. Cache AI responses when appropriate to reduce API calls
7. All AI prompts must be defined in the services layer, not in components
8. Use Gemini Pro for complex reasoning tasks
9. Use Gemini Flash for simpler, faster tasks
10. Always validate and sanitize AI-generated content before displaying