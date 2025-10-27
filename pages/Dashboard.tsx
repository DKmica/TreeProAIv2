
import React, { useState, useMemo, useEffect } from 'react';
import MapView from '../components/MapView';
import { Job, Employee, Customer, Lead, Quote, PayrollRecord, TimeEntry, PayPeriod, Equipment, AICoreInsights } from '../types';
import { payrollRecordService, timeEntryService, payPeriodService, equipmentService } from '../services/apiService';
import { getAiCoreInsights } from '../services/gemini/businessService';

interface DashboardProps {
    jobs: Job[];
    employees: Employee[];
    customers: Customer[];
    leads: Lead[];
    quotes: Quote[];
}

const Dashboard: React.FC<DashboardProps> = ({ jobs, employees, customers, leads, quotes }) => {
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [aiInsights, setAiInsights] = useState<AICoreInsights | null>(null);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [insightsError, setInsightsError] = useState<string | null>(null);

    const activeJobs = useMemo(() => 
        jobs.filter(job => job.status === 'Scheduled' || job.status === 'In Progress')
            .sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || '')), 
        [jobs]
    );

    const newLeadsCount = useMemo(() => 
        leads.filter(lead => lead.status === 'New').length,
        [leads]
    );

    const quotesSentCount = useMemo(() => 
        quotes.filter(quote => quote.status === 'Sent' || quote.status === 'Accepted').length,
        [quotes]
    );

    const activeJobsCount = useMemo(() => 
        jobs.filter(job => job.status === 'Scheduled' || job.status === 'In Progress').length,
        [jobs]
    );

    const monthlyRevenue = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        return jobs
            .filter(job => {
                if (job.status !== 'Completed' || !job.completedDate) return false;
                const completedDate = new Date(job.completedDate);
                return completedDate.getMonth() === currentMonth && completedDate.getFullYear() === currentYear;
            })
            .reduce((sum, job) => sum + (job.totalCost || 0), 0);
    }, [jobs]);

    useEffect(() => {
        const fetchPayrollData = async () => {
            try {
                const [payrollData, timeData, payPeriodData, equipmentData] = await Promise.all([
                    payrollRecordService.getAll(),
                    timeEntryService.getAll(),
                    payPeriodService.getAll(),
                    equipmentService.getAll()
                ]);
                
                setPayrollRecords(payrollData);
                setTimeEntries(timeData);
                setPayPeriods(payPeriodData);
                setEquipment(equipmentData);
            } catch (error: any) {
                console.error('Error fetching payroll data:', error);
            }
        };
        
        fetchPayrollData();
    }, []);

    useEffect(() => {
        const fetchAiInsights = async () => {
            setLoadingInsights(true);
            setInsightsError(null);
            
            try {
                const insights = await getAiCoreInsights(
                    leads,
                    jobs,
                    quotes,
                    employees,
                    equipment,
                    payrollRecords,
                    timeEntries,
                    payPeriods
                );
                
                setAiInsights(insights);
            } catch (error: any) {
                console.error('Error fetching AI insights:', error);
                setInsightsError(error.message || 'Failed to load AI insights');
            } finally {
                setLoadingInsights(false);
            }
        };
        
        if (leads.length > 0 || jobs.length > 0 || employees.length > 0) {
            fetchAiInsights();
        }
    }, [leads, jobs, quotes, employees, equipment, payrollRecords, timeEntries, payPeriods]);

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

    const getLaborCostColor = (percentage: number) => {
        if (percentage < 35) return 'text-green-700';
        if (percentage <= 40) return 'text-yellow-700';
        return 'text-red-700';
    };

    const getLaborCostBgColor = (percentage: number) => {
        if (percentage < 35) return 'bg-green-50';
        if (percentage <= 40) return 'bg-yellow-50';
        return 'bg-red-50';
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-gray-900">Dashboard</h1>
      <p className="mt-2 text-brand-gray-600">Welcome to TreePro AI. Analytics and overview will be displayed here.</p>
       <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-brand-gray-500">New Leads</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-brand-gray-900">{newLeadsCount}</dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-brand-gray-500">Quotes Sent</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-brand-gray-900">{quotesSentCount}</dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-brand-gray-500">Active Jobs</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-brand-gray-900">{activeJobsCount}</dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-brand-gray-500">Revenue (Month)</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-brand-gray-900">
              ${monthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </dd>
          </div>
        </div>

        {/* AI Insights Section */}
        {loadingInsights ? (
          <div className="mt-8 bg-white rounded-lg shadow p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
              <span className="ml-3 text-brand-gray-600">Loading AI insights...</span>
            </div>
          </div>
        ) : insightsError ? (
          <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error loading AI insights: {insightsError}</p>
          </div>
        ) : aiInsights ? (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-brand-gray-900 mb-4">🤖 AI Insights</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Core Insights Card */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-lg p-6 border border-purple-200">
                <h3 className="text-lg font-semibold text-purple-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                  </svg>
                  Core Insights
                </h3>
                <div className="space-y-3">
                  <div className="bg-white rounded-md p-3 border border-purple-100">
                    <p className="text-sm font-medium text-purple-700 mb-1">Business Summary</p>
                    <p className="text-sm text-brand-gray-700">{aiInsights.businessSummary}</p>
                  </div>
                  
                  {aiInsights.leadScores && aiInsights.leadScores.length > 0 && (
                    <div className="bg-white rounded-md p-3 border border-purple-100">
                      <p className="text-sm font-medium text-purple-700 mb-2">Top Priority Leads</p>
                      <ul className="space-y-2">
                        {aiInsights.leadScores.slice(0, 3).map((lead, idx) => (
                          <li key={idx} className="text-xs">
                            <span className="font-semibold">{lead.customerName}</span>
                            <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs">
                              Score: {lead.score}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiInsights.maintenanceAlerts && aiInsights.maintenanceAlerts.length > 0 && (
                    <div className="bg-white rounded-md p-3 border border-purple-100">
                      <p className="text-sm font-medium text-purple-700 mb-2">⚠️ Equipment Alerts</p>
                      <ul className="space-y-1">
                        {aiInsights.maintenanceAlerts.slice(0, 2).map((alert, idx) => (
                          <li key={idx} className="text-xs text-brand-gray-700">
                            {alert.equipmentName}: {alert.recommendedAction}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Labor Cost Analytics Card */}
              <div className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-lg shadow-lg p-6 border border-cyan-200">
                <h3 className="text-lg font-semibold text-cyan-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                  </svg>
                  Labor Cost Analytics
                </h3>
                
                {aiInsights.payrollInsights && (payrollRecords.length > 0 || timeEntries.length > 0) ? (
                  <div className="space-y-3">
                    {/* Total Labor Cost */}
                    <div className="bg-white rounded-md p-3 border border-cyan-100">
                      <p className="text-xs text-cyan-700 font-medium mb-1">Total Labor Cost</p>
                      <p className="text-2xl font-bold text-cyan-900">
                        {formatCurrency(aiInsights.payrollInsights.totalLaborCost)}
                      </p>
                    </div>

                    {/* Labor Cost Percentage */}
                    <div className={`rounded-md p-3 border ${getLaborCostBgColor(aiInsights.payrollInsights.laborCostPercentage)} ${aiInsights.payrollInsights.laborCostPercentage < 35 ? 'border-green-200' : aiInsights.payrollInsights.laborCostPercentage <= 40 ? 'border-yellow-200' : 'border-red-200'}`}>
                      <p className="text-xs font-medium mb-1" style={{ color: '#0e7490' }}>Labor Cost % of Revenue</p>
                      <div className="flex items-baseline">
                        <p className={`text-2xl font-bold ${getLaborCostColor(aiInsights.payrollInsights.laborCostPercentage)}`}>
                          {aiInsights.payrollInsights.laborCostPercentage.toFixed(1)}%
                        </p>
                        <span className="ml-2 text-xs text-brand-gray-600">
                          {aiInsights.payrollInsights.laborCostPercentage < 35 ? '✓ Under target' : 
                           aiInsights.payrollInsights.laborCostPercentage <= 40 ? '⚠ Near target' : 
                           '⚠ Above target'}
                        </span>
                      </div>
                      <p className="text-xs text-brand-gray-600 mt-1">Target: 30-35%</p>
                    </div>

                    {/* Overtime Impact */}
                    <div className="bg-white rounded-md p-3 border border-cyan-100">
                      <p className="text-xs text-cyan-700 font-medium mb-1">Overtime Impact</p>
                      <p className="text-xl font-bold text-cyan-900">
                        {formatCurrency(aiInsights.payrollInsights.overtimeCostImpact)}
                      </p>
                    </div>

                    {/* Recommendations */}
                    {aiInsights.payrollInsights.recommendations && aiInsights.payrollInsights.recommendations.length > 0 && (
                      <div className="bg-white rounded-md p-3 border border-cyan-100">
                        <p className="text-xs font-medium text-cyan-700 mb-2">💡 Recommendations</p>
                        <ul className="space-y-1.5">
                          {aiInsights.payrollInsights.recommendations.map((rec, idx) => (
                            <li key={idx} className="text-xs text-brand-gray-700 flex items-start">
                              <span className="text-cyan-600 mr-1.5">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-md p-6 border border-cyan-100 text-center">
                    <svg className="w-12 h-12 mx-auto text-cyan-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm text-cyan-700 font-medium mb-1">No Payroll Data Available</p>
                    <p className="text-xs text-brand-gray-600">Add time entries and payroll records to see labor cost analytics</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
        
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
