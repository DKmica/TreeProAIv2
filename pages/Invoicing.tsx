import React, { useState } from 'react';
import Invoices from './Invoices';
import InvoiceTemplates from './InvoiceTemplates';
import ARAgingDashboard from './ARAgingDashboard';
import { FileText, Layout, BarChart2 } from 'lucide-react';

type TabType = 'invoices' | 'templates' | 'aging';

const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
  { key: 'invoices',   label: 'Invoices',   icon: <FileText className="w-4 h-4" /> },
  { key: 'templates',  label: 'Templates',  icon: <Layout className="w-4 h-4" /> },
  { key: 'aging',      label: 'A/R Aging',  icon: <BarChart2 className="w-4 h-4" /> },
];

const Invoicing: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('invoices');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 bg-brand-gray-800 border border-brand-gray-700 rounded-xl p-1 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-brand-cyan-600 text-white shadow-sm'
                : 'text-brand-gray-400 hover:text-white hover:bg-brand-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'invoices'  && <Invoices />}
        {activeTab === 'templates' && <InvoiceTemplates />}
        {activeTab === 'aging'     && <ARAgingDashboard />}
      </div>
    </div>
  );
};

export default Invoicing;
