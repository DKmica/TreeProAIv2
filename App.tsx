import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import QuotesPage from './pages/QuotesPage';
import Jobs from './pages/Jobs';
import Customers from './pages/Customers';
import Invoices from './pages/Invoices';
import Calendar from './pages/Calendar';
import Equipment from './pages/Equipment';
import Marketing from './pages/Marketing';
import AICore from './pages/AICore';
import Login from './src/pages/Login';
import HRPage from './pages/HR';
import FinancialsPage from './pages/Financials';
import { useSession } from './src/contexts/SessionContext';
import SpinnerIcon from './components/icons/SpinnerIcon';
import { useAppData } from '@/src/hooks/useAppData';

const App: React.FC = () => {
  const { session, loading: sessionLoading } = useSession();
  const {
    loading: dataLoading,
    error,
    customers, setCustomers,
    leads, setLeads,
    quotes, setQuotes,
    jobs, setJobs,
    invoices, setInvoices,
    employees, setEmployees,
    equipment, setEquipment,
    certifications,
    timeOffRequests,
    jobCosting,
    maintenanceHistory,
  } = useAppData();

  if (sessionLoading || dataLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-navy-100">
        <SpinnerIcon className="h-12 w-12 text-brand-cyan-600" />
        <p className="ml-4 text-lg font-semibold text-brand-navy-700">
            {sessionLoading ? 'Authenticating...' : 'Loading your business data...'}
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
  
  if (error) {
      return (
        <div className="flex h-screen items-center justify-center bg-red-50 text-center">
            <div>
                <h2 className="text-xl font-bold text-red-800">Error Loading Data</h2>
                <p className="mt-2 text-red-600">{error}</p>
            </div>
        </div>
      )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard jobs={jobs} employees={employees} customers={customers} />} />
        <Route path="/ai-core" element={<AICore leads={leads} jobs={jobs} quotes={quotes} employees={employees} equipment={equipment} customers={customers} setJobs={setJobs} />} />
        <Route path="/leads" element={<Leads leads={leads} setLeads={setLeads} customers={customers} setCustomers={setCustomers} />} />
        <Route path="/quotes" element={<QuotesPage quotes={quotes} setQuotes={setQuotes} customers={customers} />} />
        <Route path="/jobs" element={<Jobs jobs={jobs} setJobs={setJobs} quotes={quotes} customers={customers} invoices={invoices} setInvoices={setInvoices} employees={employees} />} />
        <Route path="/customers" element={<Customers customers={customers} setCustomers={setCustomers} />} />
        <Route path="/invoices" element={<Invoices invoices={invoices} setInvoices={setInvoices} jobs={jobs} customers={customers} />} />
        <Route path="/financials" element={<FinancialsPage jobCosting={jobCosting} />} />
        <Route path="/calendar" element={<Calendar jobs={jobs} setJobs={setJobs} employees={employees} />} />
        <Route path="/equipment" element={<Equipment equipment={equipment} setEquipment={setEquipment} maintenanceHistory={maintenanceHistory} />} />
        <Route path="/hr" element={<HRPage employees={employees} setEmployees={setEmployees} certifications={certifications} timeOffRequests={timeOffRequests} />} />
        <Route path="/marketing" element={<Marketing />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
};

export default App;