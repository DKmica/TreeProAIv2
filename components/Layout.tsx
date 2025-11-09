import React, { useState, useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import HelpBot from './HelpBot';
import { Customer, Lead, Quote, Job, Invoice, Employee, Equipment } from '../types';
import { useAICore } from '../hooks/useAICore';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';


interface AppData {
  customers: Customer[];
  leads: Lead[];
  quotes: Quote[];
  jobs: Job[];
  invoices: Invoice[];
  employees: Employee[];
  equipment: Equipment[];
}

interface AppState {
  data: AppData;
  setters: any; // Using 'any' to avoid complex type definitions here
}


interface LayoutProps {
  appState: AppState;
  isAiCoreInitialized: boolean;
}

const getPageContext = (pathname: string): string => {
  if (pathname.startsWith('/dashboard')) return "The user is on the Dashboard, viewing business KPIs and a live map.";
  if (pathname.startsWith('/ai-core')) return "The user is on the AI Core page, viewing intelligent insights and suggestions.";
  if (pathname.startsWith('/leads')) return "The user is on the Leads page, managing potential customer inquiries.";
  if (pathname.startsWith('/quotes')) return "The user is on the Quotes page, creating and managing price estimates.";
  if (pathname.startsWith('/jobs')) return "The user is on the Jobs page, managing scheduled work.";
  if (pathname.startsWith('/job-templates')) return "The user is on the Job Templates page, creating and managing reusable job templates.";
  if (pathname.startsWith('/customers')) return "The user is on the Customers page, viewing their client list.";
  if (pathname.startsWith('/invoices')) return "The user is on the Invoices page, managing billing.";
  if (pathname.startsWith('/calendar')) return "The user is on the Calendar page, scheduling jobs.";
  if (pathname.startsWith('/employees')) return "The user is on the Employees page, managing staff.";
  if (pathname.startsWith('/equipment')) return "The user is on the Equipment page, tracking company assets.";
  if (pathname.startsWith('/marketing')) return "The user is on the Marketing page, using AI tools for promotion.";
  if (pathname.startsWith('/settings')) return "The user is on the Settings page, managing their profile, company info, and integrations.";
  if (pathname.startsWith('/chat')) return "The user is on the dedicated Chat page.";
  return "The user is on an unknown page.";
};


const Layout: React.FC<LayoutProps> = ({ appState, isAiCoreInitialized }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isBotOpen, setIsBotOpen] = useState(false);
  const location = useLocation();
  const pageContext = getPageContext(location.pathname);

  const chat = useAICore({
      pageContext: pageContext,
      isAiCoreReady: isAiCoreInitialized,
  });
  
  const voice = useVoiceRecognition({
    onCommand: chat.sendMessage, 
    enabled: true
  });

  useEffect(() => {
    if (voice.isAwaitingCommand && !isBotOpen) {
      setIsBotOpen(true);
    }
  }, [voice.isAwaitingCommand, isBotOpen]);


  return (
    <div>
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex flex-1 flex-col lg:pl-64">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <Outlet context={appState} />
            </div>
          </div>
        </main>
      </div>
      <HelpBot 
        isOpen={isBotOpen}
        setIsOpen={setIsBotOpen}
        chat={chat}
        voice={voice}
      />
    </div>
  );
};

export default Layout;