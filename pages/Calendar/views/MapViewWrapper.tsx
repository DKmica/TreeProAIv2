import React, { useMemo, useState } from 'react';
import { CalendarViewProps } from '../types';
import { Customer, RouteOptimizationResult } from '../../../types';
import MapView from '../../../components/MapView';
import { MessageCircle, Route } from 'lucide-react';

interface MapViewWrapperProps extends Omit<CalendarViewProps, 'onJobDrop' | 'onDateChange' | 'currentDate' | 'jobsByDate'> {
  customers: Customer[];
  routePlan?: RouteOptimizationResult | null;
  onOpenRoutePlan?: () => void;
  onOpenChat?: (prefill: string) => void;
}

const MapViewWrapper: React.FC<MapViewWrapperProps> = ({
  jobs,
  employees,
  customers,
  filteredJobs,
  routePlan,
  onOpenRoutePlan,
  onOpenChat
}) => {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const scheduledJobs = filteredJobs.filter(job =>
    job.status === 'Scheduled' || job.status === 'In Progress'
  );

  const dispatcherPrefill = useMemo(() => {
    if (!routePlan) return 'Open dispatcher channel to coordinate routes today.';
    const crewName = routePlan.crewName || 'assigned crew';
    return `Coordinate live route for ${crewName} on ${routePlan.date}. Share ETAs and customer updates.`;
  }, [routePlan]);

  return (
    <div className="mt-4">
      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 md:rounded-lg overflow-hidden" style={{ height: '700px' }}>
        <MapView
          jobs={scheduledJobs}
          employees={employees}
          customers={customers}
          selectedJobId={selectedJobId}
          onJobSelect={setSelectedJobId}
          routePlan={routePlan}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-lg bg-brand-cyan-50 border border-brand-cyan-200 p-4">
        <div>
          <p className="text-sm font-semibold text-brand-cyan-900">{routePlan ? 'Optimized route active' : 'No optimized route loaded'}</p>
          <p className="text-xs text-brand-cyan-800">
            {routePlan
              ? `${routePlan.stops.length} stops • ${routePlan.totalDistanceMiles.toFixed(1)} mi • ${Math.round(routePlan.totalDriveMinutes)} min drive`
              : 'Run the optimizer from the calendar to visualize the crew path.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onOpenRoutePlan}
            disabled={!routePlan}
            className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-brand-cyan-900 border border-brand-cyan-200 shadow-sm disabled:opacity-50"
          >
            <Route className="w-4 h-4" />
            {routePlan ? 'Open route plan' : 'Awaiting optimized route'}
          </button>
          <button
            onClick={() => onOpenChat?.(dispatcherPrefill)}
            className="inline-flex items-center gap-2 rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700"
          >
            <MessageCircle className="w-4 h-4" />
            Dispatcher ↔ Crew chat
          </button>
        </div>
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
