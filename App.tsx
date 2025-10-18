
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { mockCustomers, mockLeads, mockQuotes, mockJobs, mockInvoices, mockEmployees, mockEquipment } from './data/mockData';
import { Customer, Lead, Quote, Job, Invoice, Employee, Equipment as EquipmentType } from './types';


const App: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [quotes, setQuotes] = useState<Quote[]>(mockQuotes);
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [equipment, setEquipment] = useState<EquipmentType[]>(mockEquipment);

  return (
    <HashRouter>
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
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
