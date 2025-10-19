import React, { useState, useMemo } from 'react';
import { Invoice } from '../types';

interface InvoicesProps {
  invoices: Invoice[];
}

const Invoices: React.FC<InvoicesProps> = ({ invoices }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInvoices = useMemo(() => invoices.filter(invoice =>
    invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.total_amount.toString().includes(searchTerm) ||
    invoice.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.due_date.toLowerCase().includes(searchTerm.toLowerCase())
  ), [invoices, searchTerm]);

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
        case 'Paid': return 'bg-green-100 text-green-800';
        case 'Sent': return 'bg-blue-100 text-blue-800';
        case 'Overdue': return 'bg-red-100 text-red-800';
        default: return 'bg-yellow-100 text-yellow-800'; // Draft
    }
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-brand-navy-900">Invoices</h1>
          <p className="mt-2 text-sm text-brand-navy-700">A list of all invoices.</p>
        </div>
      </div>

      <div className="mt-6">
        <input
          type="text"
          placeholder="Search invoices..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full max-w-sm rounded-md border-brand-navy-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm"
          aria-label="Search invoices"
        />
      </div>

      <div className="mt-4 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-brand-navy-300">
                <thead className="bg-brand-navy-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brand-navy-900 sm:pl-6">Invoice ID</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Customer</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Amount</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Status</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Due Date</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">View</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-navy-200 bg-white">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-navy-900 sm:pl-6">{invoice.id}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">{invoice.customerName}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">${invoice.total_amount.toFixed(2)}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">{invoice.due_date}</td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <a href="#" className="text-brand-cyan-600 hover:text-brand-cyan-900">View</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invoices;