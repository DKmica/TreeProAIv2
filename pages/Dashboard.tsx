import React from 'react';
import MapView from '../components/MapView';
import { Job, Employee, Customer } from '../types';

interface DashboardProps {
    jobs: Job[];
    employees: Employee[];
    customers: Customer[];
}

const Dashboard: React.FC<DashboardProps> = ({ jobs, employees, customers }) => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy-900">Dashboard</h1>
      <p className="mt-2 text-brand-navy-600">Welcome to TreePro AI. Analytics and overview will be displayed here.</p>
       <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-brand-navy-500">New Leads</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy-900">12</dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-brand-navy-500">Quotes Sent</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy-900">8</dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-brand-navy-500">Active Jobs</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy-900">3</dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-brand-navy-500">Revenue (Month)</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy-900">$12,450</dd>
          </div>
        </div>
        
        <div className="mt-8">
            <div className="sm:flex sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold text-brand-navy-900">Live Job & Crew Map</h2>
                <div className="mt-2 sm:mt-0 flex items-center space-x-4 text-sm text-brand-navy-600">
                    <div className="flex items-center">
                        <span className="h-3 w-3 rounded-full bg-green-600 mr-2"></span>
                        <span>Crew</span>
                    </div>
                    <div className="flex items-center">
                        <span className="h-3 w-3 rounded-full bg-brand-cyan-600 mr-2"></span>
                        <span>Scheduled Job</span>
                    </div>
                    <div className="flex items-center">
                        <span className="h-3 w-3 rounded-full bg-amber-500 mr-2"></span>
                        <span>Job In Progress</span>
                    </div>
                </div>
            </div>
            <div className="mt-4 h-[60vh] min-h-[400px] w-full overflow-hidden rounded-lg bg-white shadow">
                <MapView jobs={jobs} employees={employees} customers={customers} />
            </div>
        </div>

    </div>
  );
};

export default Dashboard;