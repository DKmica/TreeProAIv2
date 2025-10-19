import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getAiCoreInsights } from '../services/geminiService';
import { AICoreInsights, Lead, Job, Quote, Employee, Equipment as EquipmentType, JobScheduleSuggestion, Customer, Invoice } from '../types';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import LeadIcon from '../components/icons/LeadIcon';
import JobIcon from '../components/icons/JobIcon';
import EquipmentIcon from '../components/icons/EquipmentIcon';
import ThumbUpIcon from '../components/icons/ThumbUpIcon';
import ThumbDownIcon from '../components/icons/ThumbDownIcon';
import { supabase } from '../src/integrations/supabase/client';
import { useSession } from '../src/contexts/SessionContext';

const ModifyScheduleModal: React.FC<{
  suggestion: JobScheduleSuggestion;
  employees: Employee[];
  quotes: Quote[];
  onSave: (updatedJobData: Omit<Job, 'id' | 'user_id' | 'created_at' | 'customerName'>) => void;
  onClose: () => void;
}> = ({ suggestion, employees, quotes, onSave, onClose }) => {
    const [scheduledDate, setScheduledDate] = useState(suggestion.suggestedDate);
    
    const initialCrewIds = useMemo(() => 
        suggestion.suggestedCrew
            .map(name => employees.find(e => e.name === name)?.id)
            .filter((id): id is string => !!id), 
        [suggestion.suggestedCrew, employees]
    );

    const [selectedCrew, setSelectedCrew] = useState<string[]>(initialCrewIds);

    const handleCrewChange = (employeeId: string) => {
        setSelectedCrew(prev => 
            prev.includes(employeeId) 
                ? prev.filter(id => id !== employeeId)
                : [...prev, employeeId]
        );
    };

    const handleSave = () => {
        const quote = quotes.find(q => q.id === suggestion.quoteId);
        if (!quote) {
            alert('Could not find the original quote for this job.');
            return;
        }
        onSave({
            quote_id: suggestion.quoteId,
            customer_id: quote.customer_id,
            status: 'Scheduled',
            date: scheduledDate,
            assigned_crew: selectedCrew,
        });
    };

    return (
      <div className="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-cyan-100 sm:mx-0 sm:h-10 sm:w-10">
                    <JobIcon className="h-6 w-6 text-brand-cyan-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-semibold leading-6 text-brand-navy-900" id="modal-title">Modify & Schedule Job</h3>
                    <div className="mt-2">
                      <p className="text-sm text-brand-navy-500">
                        Review and modify the AI's suggestions for Quote <span className="font-semibold">{suggestion.quoteId.substring(0,8)}...</span> for <span className="font-semibold">{suggestion.customerName}</span>.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 space-y-6">
                  <div>
                      <label htmlFor="scheduledDate" className="block text-sm font-medium leading-6 text-brand-navy-900">Scheduled Date</label>
                      <input type="date" name="scheduledDate" id="scheduledDate" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required className="mt-2 block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 placeholder:text-brand-navy-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6" />
                  </div>
                  <div>
                      <h4 className="text-sm font-medium leading-6 text-brand-navy-900">Assign Crew</h4>
                      <p className="text-sm text-brand-navy-500">Select the employees to assign to this job.</p>
                      <div className="mt-2 max-h-40 overflow-y-auto space-y-2 rounded-md border p-2">
                          {employees.map(emp => (
                              <div key={emp.id} className="relative flex items-start">
                                  <div className="flex h-6 items-center">
                                      <input 
                                          id={`emp-${emp.id}`} 
                                          name={`emp-${emp.id}`} 
                                          type="checkbox" 
                                          checked={selectedCrew.includes(emp.id)}
                                          onChange={() => handleCrewChange(emp.id)}
                                          className="h-4 w-4 rounded border-brand-navy-300 text-brand-cyan-600 focus:ring-brand-cyan-600" 
                                      />
                                  </div>
                                  <div className="ml-3 text-sm leading-6">
                                      <label htmlFor={`emp-${emp.id}`} className="font-medium text-brand-navy-900">{emp.name}</label>
                                      <p className="text-brand-navy-500">{emp.role}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
                </div>
              </div>
              <div className="bg-brand-navy-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button type="button" onClick={handleSave} className="inline-flex w-full justify-center rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-500 sm:ml-3 sm:w-auto">Save & Schedule Job</button>
                <button type="button" onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 hover:bg-brand-navy-50 sm:mt-0 sm:w-auto">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
};

interface AICoreProps {
    leads: Lead[];
    jobs: Job[];
    quotes: Quote[];
    employees: Employee[];
    equipment: EquipmentType[];
    customers: Customer[];
    invoices: Invoice[];
    setJobs: (updateFn: (prev: Job[]) => Job[]) => void;
}

const AICore: React.FC<AICoreProps> = ({ leads, jobs, quotes, employees, equipment, customers, invoices, setJobs }) => {
    const { session } = useSession();
    const [insights, setInsights] = useState<AICoreInsights | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingSchedule, setEditingSchedule] = useState<JobScheduleSuggestion | null>(null);
    const [feedbackSent, setFeedbackSent] = useState<Set<string>>(new Set());

    const fetchInsights = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getAiCoreInsights(leads, jobs, quotes, employees, equipment, invoices);
            setInsights(result);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred while fetching AI insights.');
        } finally {
            setIsLoading(false);
        }
    }, [leads, jobs, quotes, employees, equipment, invoices]);

    useEffect(() => {
        fetchInsights();
    }, [fetchInsights]);

    const handleFeedback = async (predictionId: string, featureArea: string, rating: 1 | -1) => {
        if (!session) return;
        const feedbackId = `${featureArea}-${predictionId}`;
        if (feedbackSent.has(feedbackId)) return; // Prevent duplicate feedback

        const { error } = await supabase.from('ai_feedback').insert({
            user_id: session.user.id,
            prediction_id: predictionId,
            feature_area: featureArea,
            rating: rating,
        });

        if (error) {
            alert(`Error submitting feedback: ${error.message}`);
        } else {
            setFeedbackSent(prev => new Set(prev).add(feedbackId));
        }
    };

    const createJobFromSuggestion = async (jobData: Omit<Job, 'id' | 'user_id' | 'created_at' | 'customerName'>) => {
        if (!session) return;

        const quote = quotes.find(q => q.id === jobData.quote_id);
        if (!quote) {
            alert('Could not find the original quote for this job.');
            return;
        }

        const { data, error } = await supabase
            .from('jobs')
            .insert({
                ...jobData,
                user_id: session.user.id,
                job_price: quote.total_price,
                job_details: { 
                    description: `Job created from quote ${quote.id}`,
                    service_items: quote.service_items 
                },
            })
            .select()
            .single();

        if (error) {
            alert(`Error creating job: ${error.message}`);
        } else if (data) {
            const customer = customers.find(c => c.id === data.customer_id);
            const newJob = { ...data, customerName: customer?.name || 'N/A' };
            setJobs(prev => [...prev, newJob]);
            
            setInsights(prevInsights => {
                if (!prevInsights) return null;
                return {
                    ...prevInsights,
                    jobSchedules: prevInsights.jobSchedules.filter(s => s.quoteId !== jobData.quote_id)
                };
            });

            alert('Job scheduled successfully!');
            if (editingSchedule) setEditingSchedule(null);
        }
    };

    const handleAcceptSuggestion = (suggestion: JobScheduleSuggestion) => {
        const crewIds = suggestion.suggestedCrew
            .map(name => employees.find(e => e.name === name)?.id)
            .filter((id): id is string => !!id);
        
        createJobFromSuggestion({
            quote_id: suggestion.quoteId,
            customer_id: quotes.find(q => q.id === suggestion.quoteId)?.customer_id || '',
            status: 'Scheduled',
            date: suggestion.suggestedDate,
            assigned_crew: crewIds,
        });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <SpinnerIcon className="h-12 w-12 text-brand-cyan-600" />
                <p className="mt-4 text-brand-navy-700 font-semibold">AI Core is analyzing your business data...</p>
            </div>
        );
    }
    
    if (error) {
        return <div className="rounded-md bg-red-50 p-4"><p className="text-sm font-medium text-red-800">{error}</p></div>;
    }
    
    if (!insights) {
        return null;
    }

    const scoreColor = (score: number) => {
        if (score > 80) return 'text-red-600';
        if (score > 60) return 'text-yellow-600';
        return 'text-green-600';
    }


    return (
        <div>
            <h1 className="text-2xl font-bold text-brand-navy-900">AI Core</h1>
            <p className="mt-2 text-brand-navy-600">Business Automation & Insights powered by Gemini.</p>

            <div className="mt-6 p-6 bg-brand-cyan-50 border border-brand-cyan-200 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold text-brand-navy-800">AI Business Summary</h2>
                <p className="mt-2 text-brand-navy-700">{insights.businessSummary}</p>
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Automated Lead Scoring */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <LeadIcon className="h-8 w-8 text-brand-cyan-600" />
                        <h3 className="ml-3 text-xl font-bold text-brand-navy-900">Automated Lead Scoring</h3>
                    </div>
                    <ul role="list" className="mt-4 divide-y divide-brand-navy-200">
                        {insights.leadScores.map((lead) => (
                        <li key={lead.leadId} className="py-4">
                            <div className="flex items-center space-x-4">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-brand-navy-900 truncate">{lead.customerName} ({lead.leadId.substring(0,8)}...)</p>
                                    <p className="text-sm text-brand-navy-500">{lead.reasoning}</p>
                                    <p className="text-sm font-semibold text-brand-cyan-700">{lead.recommendedAction}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className={`text-2xl font-bold ${scoreColor(lead.score)}`}>{lead.score}</div>
                                    <div className="flex flex-col">
                                        <button onClick={() => handleFeedback(lead.leadId, 'lead_scoring', 1)} disabled={feedbackSent.has(`lead_scoring-${lead.leadId}`)} className="p-1 rounded-full text-brand-navy-400 hover:bg-green-100 hover:text-green-600 disabled:text-green-600 disabled:opacity-70"><ThumbUpIcon className="h-4 w-4" /></button>
                                        <button onClick={() => handleFeedback(lead.leadId, 'lead_scoring', -1)} disabled={feedbackSent.has(`lead_scoring-${lead.leadId}`)} className="p-1 rounded-full text-brand-navy-400 hover:bg-red-100 hover:text-red-600 disabled:text-red-600 disabled:opacity-70"><ThumbDownIcon className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            </div>
                        </li>
                        ))}
                         {insights.leadScores.length === 0 && <p className="py-4 text-center text-sm text-brand-navy-500">No new leads to score.</p>}
                    </ul>
                </div>

                {/* Smart Job Scheduling */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <JobIcon className="h-8 w-8 text-brand-cyan-600" />
                        <h3 className="ml-3 text-xl font-bold text-brand-navy-900">Smart Job Scheduling</h3>
                    </div>
                    <ul role="list" className="mt-4 divide-y divide-brand-navy-200">
                         {insights.jobSchedules.map((job, index) => (
                            <li key={index} className="py-4">
                                <p className="text-sm font-medium text-brand-navy-900">Quote <span className="font-semibold">{job.quoteId.substring(0,8)}...</span> for <span className="font-semibold">{job.customerName}</span></p>
                                <div className="mt-2 space-y-1 text-sm text-brand-navy-600">
                                  <p><span className="font-semibold">Suggested Date:</span> {job.suggestedDate}</p>
                                  <p><span className="font-semibold">Suggested Crew:</span> {job.suggestedCrew.join(', ')}</p>
                                </div>
                                <p className="mt-2 text-xs italic text-brand-navy-500">AI Rationale: {job.reasoning}</p>
                                <div className="mt-4 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <button onClick={() => handleAcceptSuggestion(job)} className="rounded-md bg-brand-cyan-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan-600">
                                            Accept Suggestion
                                        </button>
                                        <button onClick={() => setEditingSchedule(job)} className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 hover:bg-brand-navy-50">
                                            Modify & Schedule
                                        </button>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <button onClick={() => handleFeedback(job.quoteId, 'job_scheduling', 1)} disabled={feedbackSent.has(`job_scheduling-${job.quoteId}`)} className="p-1 rounded-full text-brand-navy-400 hover:bg-green-100 hover:text-green-600 disabled:text-green-600 disabled:opacity-70"><ThumbUpIcon className="h-4 w-4" /></button>
                                        <button onClick={() => handleFeedback(job.quoteId, 'job_scheduling', -1)} disabled={feedbackSent.has(`job_scheduling-${job.quoteId}`)} className="p-1 rounded-full text-brand-navy-400 hover:bg-red-100 hover:text-red-600 disabled:text-red-600 disabled:opacity-70"><ThumbDownIcon className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            </li>
                         ))}
                         {insights.jobSchedules.length === 0 && <p className="py-4 text-center text-sm text-brand-navy-500">No accepted quotes need scheduling.</p>}
                    </ul>
                </div>
            </div>

            {/* Proactive Maintenance */}
            <div className="mt-8 bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                    <EquipmentIcon className="h-8 w-8 text-brand-cyan-600" />
                    <h3 className="ml-3 text-xl font-bold text-brand-navy-900">Proactive Maintenance Alerts</h3>
                </div>
                <div className="mt-4 flow-root">
                    <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <table className="min-w-full divide-y divide-brand-navy-300">
                        <thead>
                            <tr>
                                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brand-navy-900 sm:pl-0">Equipment</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Reason</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Recommended Action</th>
                                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0"><span className="sr-only">Feedback</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-navy-200">
                            {insights.maintenanceAlerts.map((alert) => (
                            <tr key={alert.equipmentId}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-navy-900 sm:pl-0">{alert.equipmentName}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">{alert.reasoning}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-red-600">{alert.recommendedAction}</td>
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                                    <div className="flex items-center justify-end space-x-1">
                                        <button onClick={() => handleFeedback(alert.equipmentId, 'maintenance_alert', 1)} disabled={feedbackSent.has(`maintenance_alert-${alert.equipmentId}`)} className="p-1 rounded-full text-brand-navy-400 hover:bg-green-100 hover:text-green-600 disabled:text-green-600 disabled:opacity-70"><ThumbUpIcon className="h-4 w-4" /></button>
                                        <button onClick={() => handleFeedback(alert.equipmentId, 'maintenance_alert', -1)} disabled={feedbackSent.has(`maintenance_alert-${alert.equipmentId}`)} className="p-1 rounded-full text-brand-navy-400 hover:bg-red-100 hover:text-red-600 disabled:text-red-600 disabled:opacity-70"><ThumbDownIcon className="h-4 w-4" /></button>
                                    </div>
                                </td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                        {insights.maintenanceAlerts.length === 0 && <p className="py-4 text-center text-sm text-brand-navy-500">All equipment is in good service standing.</p>}
                    </div>
                    </div>
                </div>
            </div>

            {editingSchedule && (
                <ModifyScheduleModal
                    suggestion={editingSchedule}
                    employees={employees}
                    quotes={quotes}
                    onSave={createJobFromSuggestion}
                    onClose={() => setEditingSchedule(null)}
                />
            )}
        </div>
    );
};

export default AICore;