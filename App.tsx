import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CRM from './pages/CRM';
import ClientDetail from './pages/ClientDetail';
import Leads from './pages/Leads';
import Quotes from './pages/Quotes';
import Jobs from './pages/Jobs';
import JobTemplates from './pages/JobTemplates';
import Customers from './pages/Customers';
import Invoices from './pages/Invoices';
import Calendar from './pages/Calendar';
import Employees from './pages/Employees';
import Equipment from './pages/Equipment';
import Marketing from './pages/Marketing';
import AICore from './pages/AICore';
import AITreeEstimator from './pages/AITreeEstimator';
import EstimateFeedbackAnalytics from './pages/EstimateFeedbackAnalytics';
import ChatPage from './pages/Chat';
import CrewLayout from './components/CrewLayout';
import CrewDashboard from './pages/crew/CrewDashboard';
import CrewJobDetail from './pages/crew/CrewJobDetail';
import CustomerPortalLayout from './components/CustomerPortalLayout';
import QuotePortal from './pages/portal/QuotePortal';
import InvoicePortal from './pages/portal/InvoicePortal';
import { Customer, Client, Lead, Quote, Job, Invoice, Employee, Equipment as EquipmentType } from './types';
import Profitability from './pages/Profitability';
import EquipmentDetail from './pages/EquipmentDetail';
import JobStatusPortal from './pages/portal/JobStatusPortal';
import Settings from './pages/Settings';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import TemplateViewer from './pages/TemplateViewer';
import Payroll from './pages/Payroll';
import * as api from './services/apiService';
import SpinnerIcon from './components/icons/SpinnerIcon';
import { aiCore } from './services/gemini/aiCore';

const App: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [equipment, setEquipment] = useState<EquipmentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAiCoreInitialized, setIsAiCoreInitialized] = useState(false);


  useEffect(() => {
    const fetchData = async () => {
      console.log("🚀 Starting data fetch from backend...");
      try {
        const [
          clientsData,
          leadsData,
          quotesData,
          jobsData,
          invoicesData,
          employeesData,
          equipmentData
        ] = await Promise.all([
          api.clientService.getAll().catch(() => []),
          api.leadService.getAll().catch(() => []),
          api.quoteService.getAll().catch(() => []),
          api.jobService.getAll().catch(() => []),
          api.invoiceService.getAll().catch(() => []),
          api.employeeService.getAll().catch(() => []),
          api.equipmentService.getAll().catch(() => []),
        ]);

        console.log("✅ Data fetched successfully");
        setClients(clientsData);
        setLeads(leadsData);
        setQuotes(quotesData);
        setJobs(jobsData);
        setInvoices(invoicesData);
        setEmployees(employeesData);
        setEquipment(equipmentData);

        try {
          const [
            payrollRecords,
            timeEntries,
            payPeriods,
            companyProfile
          ] = await Promise.all([
            api.payrollRecordService.getAll(),
            api.timeEntryService.getAll(),
            api.payPeriodService.getAll(),
            api.companyProfileService.get().catch(() => null)
          ]);

          await aiCore.initialize({
            clients: clientsData,
            leads: leadsData,
            quotes: quotesData,
            jobs: jobsData,
            invoices: invoicesData,
            employees: employeesData,
            equipment: equipmentData,
            payrollRecords,
            timeEntries,
            payPeriods,
            companyProfile,
            lastUpdated: new Date()
          });
          setIsAiCoreInitialized(true);
        } catch (aiError) {
          console.error("❌ Failed to initialize AI Core:", aiError);
          setIsAiCoreInitialized(true);
        }
      } catch (e: any) {
        console.error("❌ Failed to fetch initial data:", e);
        setError(`Failed to connect to the backend server. Please ensure it is running with 'node backend/server.js' and that the database is correctly configured as per the replit.md documentation. Error: ${e.message}`);
      } finally {
        console.log("⏹️ Fetch complete, setting isLoading to false");
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!isAiCoreInitialized) {
      return;
    }

    const refreshAiContext = async () => {
      console.log("🔄 AI Core context is stale, refreshing...");
      try {
        const [
          payrollRecords,
          timeEntries,
          payPeriods,
          companyProfile
        ] = await Promise.all([
          api.payrollRecordService.getAll(),
          api.timeEntryService.getAll(),
          api.payPeriodService.getAll(),
          api.companyProfileService.get().catch(() => null)
        ]);

        await aiCore.refresh({
          clients,
          leads,
          quotes,
          jobs,
          invoices,
          employees,
          equipment,
          payrollRecords,
          timeEntries,
          payPeriods,
          companyProfile,
          lastUpdated: new Date()
        });
      } catch (err) {
        console.error("❌ Failed to refresh AI Core context:", err);
      }
    };

    refreshAiContext();

  }, [isAiCoreInitialized, clients, leads, quotes, jobs, invoices, employees, equipment]);

  const appData = { clients, leads, quotes, jobs, invoices, employees, equipment };
  const appSetters = { setClients, setLeads, setQuotes, setJobs, setInvoices, setEmployees, setEquipment };
  const appState = { data: appData, setters: appSetters };

  if (isLoading || !isAiCoreInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-brand-gray-50">
        <div className="text-center">
            <SpinnerIcon className="h-12 w-12 text-brand-green-600 mx-auto" />
            <h1 className="mt-4 text-xl font-semibold text-brand-gray-700">
              {isLoading ? 'Loading TreePro AI...' : 'Initializing AI Core...'}
            </h1>
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
                 <p className="mt-4 text-sm text-brand-gray-600">Please make sure you have followed the instructions in the `replit.md` file to start both the frontend and backend servers.</p>
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
        <Route element={<Layout appState={appState} isAiCoreInitialized={isAiCoreInitialized} />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard jobs={jobs} employees={employees} customers={clients} leads={leads} quotes={quotes} />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/crm/clients/:id" element={<ClientDetail />} />
          <Route path="/ai-core" element={<AICore leads={leads} jobs={jobs} quotes={quotes} employees={employees} equipment={equipment} setJobs={setJobs} />} />
          <Route path="/ai-tree-estimator" element={<AITreeEstimator />} />
          <Route path="/estimate-feedback-analytics" element={<EstimateFeedbackAnalytics />} />
          <Route path="/chat" element={<ChatPage isAiCoreInitialized={isAiCoreInitialized} />} />
          <Route path="/leads" element={<Leads leads={leads} setLeads={setLeads} customers={clients} setCustomers={setClients} />} />
          <Route path="/quotes" element={<Quotes quotes={quotes} setQuotes={setQuotes} customers={clients} />} />
          <Route path="/jobs" element={<Jobs jobs={jobs} setJobs={setJobs} quotes={quotes} customers={clients} invoices={invoices} setInvoices={setInvoices} employees={employees} />} />
          <Route path="/job-templates" element={<JobTemplates />} />
          <Route path="/customers" element={<Customers customers={clients} setCustomers={setClients} />} />
          <Route path="/invoices" element={<Invoices invoices={invoices} quotes={quotes} />} />
          <Route path="/calendar" element={<Calendar jobs={jobs} setJobs={setJobs} employees={employees} customers={clients} />} />
          <Route path="/employees" element={<Employees employees={employees} setEmployees={setEmployees} />} />
          <Route path="/payroll" element={<Payroll />} />
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
          <Route index element={<CrewDashboard jobs={jobs} customers={clients} />} />
          <Route path="job/:jobId" element={<CrewJobDetail jobs={jobs} setJobs={setJobs} quotes={quotes} customers={clients} />} />
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