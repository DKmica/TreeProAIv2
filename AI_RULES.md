# AI Development Rules for TreePro AI

This document outlines the technical stack and development guidelines for AI developers working on the TreePro AI application. Adhering to these rules ensures consistency, maintainability, and stability of the codebase.

## Tech Stack Overview

The application is built with a modern, lightweight tech stack. Key technologies include:

*   **Core Framework**: React 19 with TypeScript for type-safe development.
*   **Build System**: Vite for fast development and optimized builds.
*   **Routing**: `react-router-dom` for all client-side navigation and routing.
*   **Styling**: Tailwind CSS is used exclusively for styling. The configuration is managed directly in `index.html`.
*   **AI Integration**: The `@google/genai` package is used for all interactions with the Google Gemini API.
*   **Mapping**: The Google Maps JavaScript API is used for all map-related features, loaded dynamically.
*   **State Management**: Local component state is managed with React's built-in hooks (`useState`, `useMemo`, `useCallback`). Global state is managed via props passed down from the main `App.tsx` component.
*   **Icons**: A custom set of SVG-based React components located in `src/components/icons`.

## Development & Library Rules

Follow these rules strictly when adding or modifying features.

1.  **UI Components**:
    *   **DO**: Create new components as functional React components using TypeScript (`.tsx`).
    *   **DO**: Style all components using Tailwind CSS utility classes.
    *   **DO NOT**: Introduce any new UI component libraries (e.g., Material-UI, Ant Design, Shadcn/UI). All components should be custom-built to maintain a consistent look and feel.

2.  **Styling**:
    *   **DO**: Use Tailwind CSS for all layouts, colors, spacing, and responsive design.
    *   **DO NOT**: Write custom CSS files or use inline `style` attributes unless it's for a dynamic value that cannot be handled by Tailwind classes.

3.  **State Management**:
    *   **DO**: Use `useState` and other React hooks for component-level state.
    *   **DO**: Continue the existing pattern of lifting state up to parent components (like `App.tsx`) for shared state.
    *   **DO NOT**: Add a global state management library (like Redux, Zustand, or MobX) without explicit approval.

4.  **Icons**:
    *   **DO**: Create new icons as individual `.tsx` components within the `src/components/icons/` directory.
    *   **DO NOT**: Install a third-party icon library (e.g., `lucide-react`, `react-icons`).

5.  **API and Services**:
    *   **DO**: Centralize all calls to the Gemini API within `src/services/geminiService.ts`.
    *   **DO**: Use the existing `mapsLoader.ts` service to handle the Google Maps script loading.
    *   **DO NOT**: Place API keys or sensitive information directly in component files. Use the environment variable system provided by Vite.

6.  **Dependencies**:
    *   **DO**: Check `package.json` before adding a new dependency to see if existing libraries can fulfill the requirement.
    *   **DO NOT**: Add new dependencies without a clear and justified need. Keep the bundle size minimal.