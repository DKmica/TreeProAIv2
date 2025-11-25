import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { QueryProvider } from './contexts/QueryClientProvider';
import { AppDataProvider } from './contexts/AppDataContext';
import { ToastProvider } from './components/ui/Toast';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <QueryProvider>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppDataProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AppDataProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryProvider>
);
