

import React, { useState, useMemo } from 'react';
import MapView from '../components/MapView';
import { Job, Employee, Customer, OptimizedRoute } from '../types';
import RouteIcon from '../components/icons/RouteIcon';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import { calculateOptimizedRoute } from '../services/mockGoogleMapsService';

interface DashboardProps {
    jobs: Job[];
    employees: Employee[];
    customers: Customer[];
}

const Dashboard: React.FC<DashboardProps> = ({ jobs, employees, customers }) => {
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [selectedCrewLeaderId, setSelectedCrewLeaderId] = useState<string | null>(null);
    const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [routeError, setRouteError] = useState<string | null>(null);

    const crewLeaders = useMemo(() => employees.filter(e => e.jobTitle === 'Crew Leader'), [employees]);

    const activeJobs = useMemo(() => 
        jobs.filter(job => job.status === 'Scheduled' || job.status === 'In Progress')
            .sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || '')), 
        [jobs]
    );
    
    const handleCrewLeaderChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const leaderId = e.target.value;
        setSelectedCrewLeaderId(leaderId);
        if (!leaderId) {
            setOptimizedRoute(null);
            setRouteError(null);
            return;
        }

        setRouteLoading(true);
        setRouteError(null);
        setOptimizedRoute(null);

        try {
            const leader = employees.find(emp => emp.id === leaderId);
            if (!leader) throw new Error("Crew leader not found.");

            const today = new Date().toISOString().split('T')[0];
            const jobsForCrew = jobs.filter(job => 
                job.assignedCrew.includes(leaderId) &&
                job.scheduledDate === today
            );
            
            const route = await calculateOptimizedRoute(leader, jobsForCrew, customers);
            setOptimizedRoute(route);
        } catch (err: any) {
            setRouteError(err.message);
        } finally {
            setRouteLoading(false);
        }
    };


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
            <div className="lg:col-span-1 space-y-8">
                <div>
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

                <div>
                     <h2 className="text-xl font-semibold text-brand-gray-900 flex items-center">
                        <RouteIcon className="w-6 h-6 mr-2" />
                        Today's Route
                    </h2>
                    <div className="mt-4 bg-white p-4 rounded-lg shadow">
                        <select
                            value={selectedCrewLeaderId || ''}
                            onChange={handleCrewLeaderChange}
                            className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6"
                        >
                            <option value="">Select a Crew Leader...</option>
                            {crewLeaders.map(leader => (
                                <option key={leader.id} value={leader.id}>{leader.name}</option>
                            ))}
                        </select>

                        {routeLoading && (
                            <div className="flex items-center justify-center p-6">
                                <SpinnerIcon className="w-6 h-6 text-brand-green-600" />
                                <span className="ml-3 text-sm text-brand-gray-600">Calculating route...</span>
                            </div>
                        )}
                        {routeError && <p className="mt-3 text-sm text-center text-red-600 bg-red-50 p-3 rounded-md">{routeError}</p>}
                        {optimizedRoute && (
                            <div className="mt-4 animate-fade-in">
                                <div className="p-3 bg-brand-gray-50 rounded-md border">
                                    <p className="text-sm text-brand-gray-600">Total Distance: <span className="font-bold text-brand-gray-800">{optimizedRoute.totalDistance}</span></p>
                                    <p className="text-sm text-brand-gray-600">Est. Travel Time: <span className="font-bold text-brand-gray-800">{optimizedRoute.totalDuration}</span></p>
                                    <a href={optimizedRoute.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 text-sm font-semibold text-brand-green-600 hover:text-brand-green-800 hover:underline">Open in Google Maps</a>
                                </div>
                                <h4 className="mt-4 font-semibold text-brand-gray-800">Optimized Stop Order:</h4>
                                <ol className="mt-2 list-decimal list-inside space-y-2">
                                    {optimizedRoute.orderedJobs.map(job => (
                                        <li key={job.id} className="text-sm text-brand-gray-700">{job.customerName}</li>
                                    ))}
                                </ol>
                            </div>
                        )}
                    </div>
                </div>

            </div>
            <div className="lg:col-span-2 mt-8 lg:mt-0">
                <h2 className="text-xl font-semibold text-brand-gray-900">Live Job & Crew Map</h2>
                <div className="mt-4 h-[60vh] min-h-[400px] w-full overflow-hidden rounded-lg bg-white shadow">
                    <MapView 
                        jobs={jobs} 
                        employees={employees} 
                        customers={customers} 
                        selectedJobId={selectedJobId}
                        onJobSelect={setSelectedJobId}
                        optimizedRoute={optimizedRoute}
                    />
                </div>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;