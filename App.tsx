import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Quotes from './pages/Quotes';
import Jobs from './pages/Jobs';
import Customers from './pages/Customers';
import Invoices from './pages/Invoices';
import Calendar from './pages/Calendar';
import Employees from './pages/Employees';
import Equipment from './pages/Equipment';
import Marketing from './pages/Marketing';
import AICore from './pages/AICore';
import AITreeEstimator from './pages/AITreeEstimator';
import ChatPage from './pages/Chat';
import CrewLayout from './components/CrewLayout';
import CrewDashboard from './pages/crew/CrewDashboard';
import CrewJobDetail from './pages/crew/CrewJobDetail';
import CustomerPortalLayout from './components/CustomerPortalLayout';
import QuotePortal from './pages/portal/QuotePortal';
import InvoicePortal from './pages/portal/InvoicePortal';
import { mockCustomers, mockLeads, mockQuotes, mockJobs, mockInvoices, mockEmployees, mockEquipment } from './data/mockData';
import { Customer, Lead, Quote, Job, Invoice, Employee, Equipment as EquipmentType } from './types';
import Profitability from './pages/Profitability';
import EquipmentDetail from './pages/EquipmentDetail';
import JobStatusPortal from './pages/portal/JobStatusPortal';
import Settings from './pages/Settings';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';


const App: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [quotes, setQuotes] = useState<Quote[]>(mockQuotes);
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [equipment, setEquipment] = useState<EquipmentType[]>(mockEquipment);

  const appData = { customers, leads, quotes, jobs, invoices, employees, equipment };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      
      {/* Main App Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout appData={appData} />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard jobs={jobs} employees={employees} customers={customers} />} />
          <Route path="/ai-core" element={<AICore leads={leads} jobs={jobs} quotes={quotes} employees={employees} equipment={equipment} setJobs={setJobs} />} />
          <Route path="/ai-tree-estimator" element={<AITreeEstimator />} />
          <Route path="/chat" element={<ChatPage appData={appData} />} />
          <Route path="/leads" element={<Leads leads={leads} setLeads={setLeads} customers={customers} setCustomers={setCustomers} />} />
          <Route path="/quotes" element={<Quotes quotes={quotes} setQuotes={setQuotes} customers={customers} />} />
          <Route path="/jobs" element={<Jobs jobs={jobs} setJobs={setJobs} quotes={quotes} customers={customers} invoices={invoices} setInvoices={setInvoices} employees={employees} />} />
          <Route path="/customers" element={<Customers customers={customers} setCustomers={setCustomers} />} />
          <Route path="/invoices" element={<Invoices invoices={invoices} quotes={quotes} />} />
          <Route path="/calendar" element={<Calendar jobs={jobs} setJobs={setJobs} employees={employees} />} />
          <Route path="/employees" element={<Employees employees={employees} setEmployees={setEmployees} />} />
          <Route path="/equipment" element={<Equipment equipment={equipment} setEquipment={setEquipment} />} />
          <Route path="/equipment/:equipmentId" element={<EquipmentDetail equipment={equipment} setEquipment={setEquipment} />} />
          <Route path="/marketing" element={<Marketing />} />
          <Route path="/profitability" element={<Profitability jobs={jobs} quotes={quotes} employees={employees} />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      
      {/* Crew App Layout */}
      <Route path="/crew" element={<CrewLayout />}>
          <Route index element={<CrewDashboard jobs={jobs} />} />
          <Route path="job/:jobId" element={<CrewJobDetail jobs={jobs} setJobs={setJobs} quotes={quotes} customers={customers} />} />
      </Route>

      {/* Customer Portal Layout */}
      <Route path="/portal" element={<CustomerPortalLayout />}>
        <Route path="quote/:quoteId" element={<QuotePortal quotes={quotes} setQuotes={setQuotes} />} />
        <Route path="invoice/:invoiceId" element={<InvoicePortal invoices={invoices} setInvoices={setInvoices} />} />
        <Route path="job/:jobId" element={<JobStatusPortal jobs={jobs} quotes={quotes} employees={employees} setJobs={setJobs} />} />
      </Route>
    </Routes>
  );
};

export default App;