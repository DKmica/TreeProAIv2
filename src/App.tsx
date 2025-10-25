import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Dashboard from '../pages/Dashboard';
import Leads from '../pages/Leads';
import Quotes from '../pages/Quotes';
import Jobs from '../pages/Jobs';
import Customers from '../pages/Customers';
import Invoices from '../pages/Invoices';
import Calendar from '../pages/Calendar';
import Employees from '../pages/Employees';
import Equipment from '../pages/Equipment';
import Marketing from '../pages/Marketing';
import AICore from '../pages/AICore';
import AITreeEstimator from '../pages/AITreeEstimator';
import ChatPage from '../pages/Chat';
import CrewLayout from '../components/CrewLayout';
import CrewDashboard from '../pages/crew/CrewDashboard';
import CrewJobDetail from '../pages/crew/CrewJobDetail';
import CustomerPortalLayout from '../components/CustomerPortalLayout';
import QuotePortal from '../pages/portal/QuotePortal';
import InvoicePortal from '../pages/portal/InvoicePortal';
import Profitability from '../pages/Profitability';
import EquipmentDetail from '../pages/EquipmentDetail';
import JobStatusPortal from './pages/portal/JobStatusPortal';
import Settings from './pages/Settings';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import TemplateViewer from './pages/TemplateViewer';
import { AuthProvider } from './contexts/AuthContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        
        {/* Main App Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/ai-core" element={<AICore />} />
            <Route path="/ai-tree-estimator" element={<AITreeEstimator />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/quotes" element={<Quotes />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/equipment" element={<Equipment />} />
            <Route path="/equipment/:equipmentId" element={<EquipmentDetail />} />
            <Route path="/marketing" element={<Marketing />} />
            <Route path="/profitability" element={<Profitability />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/template/:templateId" element={<TemplateViewer />} />
          </Route>
        </Route>
        
        {/* Crew App Layout */}
        <Route path="/crew" element={<CrewLayout />}>
            <Route index element={<CrewDashboard />} />
            <Route path="job/:jobId" element={<CrewJobDetail />} />
        </Route>

        {/* Customer Portal Layout */}
        <Route path="/portal" element={<CustomerPortalLayout />}>
          <Route path="quote/:quoteId" element={<QuotePortal />} />
          <Route path="invoice/:invoiceId" element={<InvoicePortal />} />
          <Route path="job/:jobId" element={<JobStatusPortal />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
};

export default App;