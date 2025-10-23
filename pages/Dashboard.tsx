
import React, { useState, useMemo } from 'react';
import MapView from '../components/MapView';
import { Job, Employee, Customer } from '../types';

interface DashboardProps {
    jobs: Job[];
    employees: Employee[];
    customers: Customer[];
}

const Dashboard: React.FC<DashboardProps> = ({ jobs, employees, customers }) => {
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

    const activeJobs = useMemo(() => 
        jobs.filter(job => job.status === 'Scheduled' || job.status === 'In Progress')
            .sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || '')), 
        [jobs]
    );

    const getStatusColor = (status: Job['status']) => {
        switch (status) {
            case 'Scheduled': return 'text-blue-800';
            case 'In Progress': return 'text-yellow-800';
            default: return 'text-gray-800';
        }
    }

    const getStatusBgColor = (status: Job['status']) => {
        switch (status) {
            case 'Scheduled': return 'bg-blue-100';
            case 'In Progress': return 'bg-yellow-100';
            default: return 'bg-gray-100';
        }
    }

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-gray-900">Dashboard</h1>
      <p className="mt-2 text-brand-gray-600">Welcome to TreePro AI. Analytics and overview will be displayed here.</p>
       <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-brand-gray-500">New Leads</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-brand-gray-900">12</dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-brand-gray-500">Quotes Sent</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-brand-gray-900">8</dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-brand-gray-500">Active Jobs</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-brand-gray-900">3</dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-brand-gray-500">Revenue (Month)</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-brand-gray-900">$12,450</dd>
          </div>
        </div>
        
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <h2 className="text-xl font-semibold text-brand-gray-900">Active Jobs</h2>
                <div className="mt-4 bg-white rounded-lg shadow max-h-[60vh] overflow-y-auto">
                    {activeJobs.length > 0 ? (
                        <ul className="divide-y divide-brand-gray-200">
                        {activeJobs.map(job => (
                            <li 
                            key={job.id} 
                            onClick={() => setSelectedJobId(job.id === selectedJobId ? null : job.id)}
                            className={`p-4 border-l-4 cursor-pointer transition-colors duration-150 ${selectedJobId === job.id ? 'border-brand-green-500 bg-brand-green-50' : 'border-transparent hover:bg-brand-gray-50'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <p className="font-semibold text-brand-gray-800">{job.customerName}</p>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBgColor(job.status)} ${getStatusColor(job.status)}`}>
                                        {job.status}
                                    </span>
                                </div>
                                <p className="text-sm text-brand-gray-600">Job ID: {job.id}</p>
                                <p className="text-sm text-brand-gray-500 mt-1">{job.scheduledDate || 'Unscheduled'}</p>
                            </li>
                        ))}
                        </ul>
                    ) : (
                         <div className="p-8 text-center text-brand-gray-500">
                            No active jobs.
                         </div>
                    )}
                </div>
            </div>
            <div className="lg:col-span-2">
                <h2 className="text-xl font-semibold text-brand-gray-900">Live Job & Crew Map</h2>
                <div className="mt-4 h-[60vh] min-h-[400px] w-full overflow-hidden rounded-lg bg-white shadow">
                    <MapView 
                        jobs={jobs} 
                        employees={employees} 
                        customers={customers} 
                        selectedJobId={selectedJobId}
                        onJobSelect={setSelectedJobId}
                    />
                </div>
            </div>
        </div>

    </div>
  );
};

export default Dashboard;
