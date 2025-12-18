import React, { useState, useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import HelpBot from './HelpBot';
import { useAICore } from '../hooks/useAICore';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useAiCoreStatus } from '../contexts/AppDataContext';
import CommandPalette from './CommandPalette';

const getPageContext = (pathname: string): string => {
  if (pathname.startsWith('/dashboard')) return "The user is on the Dashboard, viewing business KPIs and a live map.";
  if (pathname.startsWith('/ai-core')) return "The user is on the AI Core page, viewing intelligent insights and suggestions.";
  if (pathname.startsWith('/leads')) return "The user is on the Leads page, managing potential customer inquiries.";
  if (pathname.startsWith('/quotes')) return "The user is on the Quotes page, creating and managing price estimates.";
  if (pathname.startsWith('/jobs')) return "The user is on the Jobs page, managing scheduled work.";
  if (pathname.startsWith('/job-templates')) return "The user is on the Job Templates page, creating and managing reusable job templates.";
  if (pathname.startsWith('/customers')) return "The user is on the Customers page, viewing their client list.";
  if (pathname.startsWith('/crm')) return "The user is on the CRM page, managing clients, leads, and quotes.";
  if (pathname.startsWith('/invoices')) return "The user is on the Invoices page, managing billing.";
  if (pathname.startsWith('/calendar')) return "The user is on the Calendar page, scheduling jobs.";
  if (pathname.startsWith('/employees')) return "The user is on the Employees page, managing staff.";
  if (pathname.startsWith('/equipment')) return "The user is on the Equipment page, tracking company assets.";
  if (pathname.startsWith('/marketing')) return "The user is on the Marketing page, using AI tools for promotion.";
  if (pathname.startsWith('/settings')) return "The user is on the Settings page, managing their profile, company info, and integrations.";
  if (pathname.startsWith('/chat')) return "The user is on the dedicated Chat page.";
  return "The user is navigating the application.";
};

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isBotOpen, setIsBotOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const location = useLocation();
  const pageContext = getPageContext(location.pathname);
  const isAiCoreInitialized = useAiCoreStatus();

  const chat = useAICore({
    pageContext: pageContext,
    isAiCoreReady: isAiCoreInitialized,
  });

  const voice = useVoiceRecognition({
    onCommand: chat.sendMessage,
    enabled: true,
  });

  useEffect(() => {
    if (voice.isAwaitingCommand && !isBotOpen) {
      setIsBotOpen(true);
    }
  }, [voice.isAwaitingCommand, isBotOpen]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (isCmdK) {
        event.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="min-h-screen bg-brand-gray-950">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex flex-1 flex-col lg:pl-64 transition-all duration-300">
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <Outlet />
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

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
};

export default Layout;
