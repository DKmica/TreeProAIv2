import React from 'react';
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
import Login from './pages/Login';
import { useSession } from './contexts/SessionContext';
import SpinnerIcon from './components/icons/SpinnerIcon';

const App: React.FC = () => {
  const { session, loading } = useSession();

  // For now, we'll use empty arrays. The next step will be to fetch from Supabase.
  const [customers, setCustomers] = React.useState([]);
  const [leads, setLeads] = React.useState([]);
  const [quotes, setQuotes] = React.useState([]);
  const [jobs, setJobs] = React.useState([]);
  const [invoices, setInvoices] = React.useState([]);
  const [employees, setEmployees] = React.useState([]);
  const [equipment, setEquipment] = React.useState([]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-navy-100">
        <SpinnerIcon className="h-12 w-12 text-brand-cyan-600" />
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

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard jobs={jobs} employees={employees} customers={customers} />} />
        <Route path="/ai-core" element={<AICore leads={leads} jobs={jobs} quotes={quotes} employees={employees} equipment={equipment} setJobs={setJobs} />} />
        <Route path="/leads" element={<Leads leads={leads} setLeads={setLeads} customers={customers} setCustomers={setCustomers} />} />
        <Route path="/quotes" element={<Quotes quotes={quotes} setQuotes={setQuotes} customers={customers} />} />
        <Route path="/jobs" element={<Jobs jobs={jobs} setJobs={setJobs} quotes={quotes} customers={customers} invoices={invoices} setInvoices={setInvoices} employees={employees} />} />
        <Route path="/customers" element={<Customers customers={customers} setCustomers={setCustomers} />} />
        <Route path="/invoices" element={<Invoices invoices={invoices} />} />
        <Route path="/calendar" element={<Calendar jobs={jobs} setJobs={setJobs} employees={employees} />} />
        <Route path="/employees" element={<Employees employees={employees} setEmployees={setEmployees} />} />
        <Route path="/equipment" element={<Equipment equipment={equipment} setEquipment={setEquipment} />} />
        <Route path="/marketing" element={<Marketing />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
};

export default App;