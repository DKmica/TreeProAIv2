import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { PortalMessage } from '../../types';
import CheckCircleIcon from '../../components/icons/CheckCircleIcon';
import ClockIcon from '../../components/icons/ClockIcon';
import QuoteIcon from '../../components/icons/QuoteIcon';
import CalendarDaysIcon from '../../components/icons/CalendarDaysIcon';
import PortalMessaging from '../../components/PortalMessaging';
import SpinnerIcon from '../../components/icons/SpinnerIcon';
import { useJobsQuery, useQuotesQuery, useEmployeesQuery } from '../../hooks/useDataQueries';
import * as api from '../../services/apiService';

const JobStatusPortal: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { data: jobs = [], isLoading: jobsLoading, refetch: refetchJobs } = useJobsQuery();
  const { data: quotes = [], isLoading: quotesLoading } = useQuotesQuery();
  const { data: employees = [], isLoading: employeesLoading } = useEmployeesQuery();

  const isLoading = jobsLoading || quotesLoading || employeesLoading;

  const job = useMemo(() => jobs.find(j => j.id === jobId), [jobs, jobId]);
  const quote = useMemo(() => quotes.find(q => q.id === job?.quoteId), [quotes, job]);

  const assignedCrewNames = useMemo(() => {
    if (!job) return [];
    return job.assignedCrew
      .map(empId => employees.find(e => e.id === empId)?.name)
      .filter((name): name is string => !!name);
  }, [job, employees]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SpinnerIcon className="h-12 w-12 text-brand-green-600" />
      </div>
    );
  }

  if (!job || !quote) {
    return (
      <div className="text-center p-8 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold text-red-600">Job Not Found</h2>
        <p className="mt-2 text-brand-gray-600">The requested job tracking link is invalid or no longer available.</p>
      </div>
    );
  }

  const handleSendMessage = async (text: string) => {
    if (!jobId) return;
    const newMessage: PortalMessage = {
        sender: 'customer',
        text,
        timestamp: new Date().toISOString(),
    };
    try {
      await api.jobService.update(jobId, { 
        messages: [...(job.messages || []), newMessage] 
      });
      refetchJobs();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };


  const timelineSteps = [
    {
      name: 'Quote Accepted',
      date: quote.acceptedAt ? new Date(quote.acceptedAt) : null,
      isComplete: !!quote.acceptedAt,
      icon: QuoteIcon,
    },
    {
      name: 'Job Scheduled',
      date: job.scheduledDate ? new Date(job.scheduledDate) : null,
      isComplete: !!job.scheduledDate,
      icon: CalendarDaysIcon,
    },
    {
      name: 'Work Started',
      date: job.workStartedAt ? new Date(job.workStartedAt) : null,
      isComplete: !!job.workStartedAt,
      icon: ClockIcon,
    },
    {
      name: 'Work Completed',
      date: job.workEndedAt ? new Date(job.workEndedAt) : null,
      isComplete: !!job.workEndedAt,
      icon: CheckCircleIcon,
    }
  ];

  const currentStatusIndex = timelineSteps.slice().reverse().findIndex(step => step.isComplete);
  const currentStep = currentStatusIndex !== -1 ? timelineSteps.length - 1 - currentStatusIndex : -1;
  
  const getNextStepMessage = () => {
      switch (job.status) {
          case 'draft':
          case 'scheduled':
              return `Your job is scheduled for ${new Date(job.scheduledDate).toLocaleDateString()}. Our crew will arrive on-site soon.`;
          case 'in_progress':
              return "Our crew is currently on-site performing the work. We'll notify you upon completion.";
          case 'completed':
              return "Your job is complete! Thank you for choosing us. An invoice will be sent to you shortly.";
          case 'cancelled':
              return "This job has been cancelled.";
          default:
              return "We are preparing to schedule your job. We will notify you once a date is confirmed.";
      }
  };


  return (
    <>
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-6 bg-brand-gray-50 border-b">
        <h1 className="text-2xl font-bold text-brand-gray-900">Job Status for {job.customerName}</h1>
        <p className="text-sm text-brand-gray-600 mt-1">Job ID: {job.id}</p>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
            <h2 className="text-lg font-semibold text-brand-gray-800">Job Timeline</h2>
            <ol className="mt-4 relative border-l border-brand-gray-200">
            {timelineSteps.map((step, index) => (
                <li key={step.name} className="mb-10 ml-6">
                <span className={`absolute flex items-center justify-center w-8 h-8 rounded-full -left-4 ring-8 ring-white ${step.isComplete ? 'bg-brand-green-600' : 'bg-brand-gray-300'}`}>
                    <step.icon className={`w-5 h-5 ${step.isComplete ? 'text-white' : 'text-brand-gray-500'}`} />
                </span>
                <h3 className={`font-semibold ${step.isComplete ? 'text-brand-gray-900' : 'text-brand-gray-500'}`}>{step.name}</h3>
                {step.date && (
                    <time className="block mb-2 text-sm font-normal leading-none text-brand-gray-400">
                        {step.date.toLocaleString()}
                    </time>
                )}
                {index === currentStep && !timelineSteps[currentStep].isComplete && (
                     <p className="text-sm text-brand-gray-500">Upcoming</p>
                )}
                </li>
            ))}
            </ol>
        </div>
        <div className="md:col-span-1 space-y-6">
            <div>
                <h3 className="font-semibold text-brand-gray-800">Next Steps</h3>
                <p className="mt-2 text-sm text-brand-gray-600 bg-brand-green-50 p-3 rounded-md border border-brand-green-200">
                    {getNextStepMessage()}
                </p>
            </div>
            <div>
                <h3 className="font-semibold text-brand-gray-800">Assigned Crew</h3>
                <ul className="mt-2 text-sm text-brand-gray-600 list-disc list-inside">
                    {assignedCrewNames.map(name => <li key={name}>{name}</li>)}
                    {assignedCrewNames.length === 0 && <li className="list-none text-brand-gray-500">Crew not yet assigned.</li>}
                </ul>
            </div>
        </div>
      </div>
      
      {job.photos && job.photos.length > 0 && (
          <div className="p-6 border-t bg-white rounded-b-lg shadow-lg">
            <h2 className="text-lg font-semibold text-brand-gray-800">Job Photos</h2>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {job.photos.map((photoUrl, index) => (
                    <a key={index} href={photoUrl} target="_blank" rel="noopener noreferrer">
                        <img src={photoUrl} alt={`Job photo ${index + 1}`} className="aspect-square w-full object-cover rounded-lg shadow-md hover:ring-2 hover:ring-brand-green-500 hover:ring-offset-2 transition-all" />
                    </a>
                ))}
            </div>
        </div>
      )}
    </div>

    <div className="mt-6 bg-white rounded-lg shadow-lg overflow-hidden h-96">
        <PortalMessaging
            messages={job.messages || []}
            onSendMessage={handleSendMessage}
            senderType="customer"
        />
    </div>
    </>
  );
};

export default JobStatusPortal;
