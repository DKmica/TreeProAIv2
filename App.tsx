import React, { useState, useEffect } from 'react';
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
import { Customer, Lead, Quote, Job, Invoice, Employee, Equipment as EquipmentType } from './types';
import Profitability from './pages/Profitability';
import EquipmentDetail from './pages/EquipmentDetail';
import JobStatusPortal from './pages/portal/JobStatusPortal';
import Settings from './pages/Settings';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import TemplateViewer from './pages/TemplateViewer';
import * as api from './services/apiService';
import SpinnerIcon from './components/icons/SpinnerIcon';

const App: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [equipment, setEquipment] = useState<EquipmentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          customersData,
          leadsData,
          quotesData,
          jobsData,
          invoicesData,
          employeesData,
          equipmentData
        ] = await Promise.all([
          api.customerService.getAll(),
          api.leadService.getAll(),
          api.quoteService.getAll(),
          api.jobService.getAll(),
          api.invoiceService.getAll(),
          api.employeeService.getAll(),
          api.equipmentService.getAll(),
        ]);

        setCustomers(customersData);
        setLeads(leadsData);
        setQuotes(quotesData);
        setJobs(jobsData);
        setInvoices(invoicesData);
        setEmployees(employeesData);
        setEquipment(equipmentData);
      } catch (e: any) {
        console.error("Failed to fetch initial data:", e);
        setError(`Failed to connect to the backend server. Please ensure it is running with 'node backend/server.js' and that the database is correctly configured as per the README.md. Error: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const appData = { customers, leads, quotes, jobs, invoices, employees, equipment };
  const appSetters = { setCustomers, setLeads, setQuotes, setJobs, setInvoices, setEmployees, setEquipment };
  const appState = { data: appData, setters: appSetters };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-brand-gray-50">
        <div className="text-center">
            <SpinnerIcon className="h-12 w-12 text-brand-green-600 mx-auto" />
            <h1 className="mt-4 text-xl font-semibold text-brand-gray-700">Loading TreePro AI...</h1>
        </div>
      </div>
    );
  }
  
  if (error) {
     return (
        <div className="flex items-center justify-center h-screen bg-red-50 p-8">
            <div className="text-center max-w-2xl">
                 <h1 className="text-2xl font-bold text-red-800">Connection Error</h1>
                 <p className="mt-4 text-red-700 whitespace-pre-wrap">{error}</p>
                 <p className="mt-4 text-sm text-brand-gray-600">Please make sure you have followed the instructions in the `README.md` file to start both the frontend and backend servers.</p>
            </div>
        </div>
     );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      
      {/* Main App Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout appState={appState} />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard jobs={jobs} employees={employees} customers={customers} />} />
          <Route path="/ai-core" element={<AICore leads={leads} jobs={jobs} quotes={quotes} employees={employees} equipment={equipment} setJobs={setJobs} />} />
          <Route path="/ai-tree-estimator" element={<AITreeEstimator />} />
          <Route path="/chat" element={<ChatPage />} />
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
          <Route path="/settings/template/:templateId" element={<TemplateViewer />} />
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