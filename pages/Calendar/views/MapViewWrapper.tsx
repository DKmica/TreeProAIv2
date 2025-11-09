import React, { useState } from 'react';
import { CalendarViewProps } from '../types';
import { Customer } from '../../../types';
import MapView from '../../../components/MapView';

interface MapViewWrapperProps extends Omit<CalendarViewProps, 'onJobDrop' | 'onDateChange' | 'currentDate' | 'jobsByDate'> {
  customers: Customer[];
}

const MapViewWrapper: React.FC<MapViewWrapperProps> = ({ 
  jobs, 
  employees, 
  customers,
  filteredJobs
}) => {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const scheduledJobs = filteredJobs.filter(job => 
    job.status === 'Scheduled' || job.status === 'In Progress'
  );

  return (
    <div className="mt-4">
      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 md:rounded-lg overflow-hidden" style={{ height: '700px' }}>
        <MapView 
          jobs={scheduledJobs}
          employees={employees}
          customers={customers}
          selectedJobId={selectedJobId}
          onJobSelect={setSelectedJobId}
        />
      </div>
      
      {selectedJobId && (
        <div className="mt-4 bg-brand-cyan-50 border border-brand-cyan-200 rounded-lg p-4">
          {(() => {
            const job = scheduledJobs.find(j => j.id === selectedJobId);
            if (!job) return null;
            
            return (
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-brand-gray-900">{job.id}</h3>
                  <p className="text-brand-gray-700 mt-1">{job.customerName}</p>
                  <p className="text-brand-gray-600 text-sm mt-1">
                    <span className="font-semibold">Status:</span> {job.status}
                  </p>
                  <p className="text-brand-gray-600 text-sm">
                    <span className="font-semibold">Date:</span> {job.scheduledDate}
                  </p>
                  {job.assignedCrew.length > 0 && (
                    <p className="text-brand-gray-600 text-sm">
                      <span className="font-semibold">Crew:</span>{' '}
                      {job.assignedCrew
                        .map(empId => employees.find(e => e.id === empId)?.name)
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedJobId(null)}
                  className="text-brand-gray-400 hover:text-brand-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default MapViewWrapper;
