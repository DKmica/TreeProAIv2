import React, { useState } from 'react';
import Invoices from './Invoices';
import InvoiceTemplates from './InvoiceTemplates';
import ARAgingDashboard from './ARAgingDashboard';

type TabType = 'invoices' | 'templates' | 'aging';

const Invoicing: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('invoices');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-brand-gray-900">Invoicing</h1>
        <p className="mt-2 text-sm text-brand-gray-600">
          Manage invoices, templates, and track receivables
        </p>
      </div>

      <div className="border-b border-brand-gray-200">
        <nav className="flex space-x-8 overflow-x-auto" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'invoices'
                ? 'border-brand-green-500 text-brand-green-600'
                : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700 hover:border-brand-gray-300'
            }`}
          >
            Invoices
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'templates'
                ? 'border-brand-green-500 text-brand-green-600'
                : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700 hover:border-brand-gray-300'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('aging')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'aging'
                ? 'border-brand-green-500 text-brand-green-600'
                : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700 hover:border-brand-gray-300'
            }`}
          >
            A/R Aging
          </button>
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'invoices' && <Invoices />}
        {activeTab === 'templates' && <InvoiceTemplates />}
        {activeTab === 'aging' && <ARAgingDashboard />}
      </div>
    </div>
  );
};

export default Invoicing;
