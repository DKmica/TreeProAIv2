import React from 'react';
import { CalendarViewProps, DragHandlers } from '../types';
import { Job } from '../../../types';

interface ListViewProps extends Omit<CalendarViewProps, 'onJobDrop'> {
  draggedJobId: string | null;
  handleDragStart: (e: React.DragEvent<HTMLDivElement>, jobId: string) => void;
  handleDragEnd: () => void;
}

const ListView: React.FC<ListViewProps> = ({ 
  filteredJobs,
  employees,
  draggedJobId,
  handleDragStart,
  handleDragEnd
}) => {
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (!a.scheduledDate && !b.scheduledDate) return 0;
    if (!a.scheduledDate) return 1;
    if (!b.scheduledDate) return -1;
    return a.scheduledDate.localeCompare(b.scheduledDate);
  });

  const groupedByDate = sortedJobs.reduce<Record<string, Job[]>>((acc, job) => {
    const date = job.scheduledDate || 'Unscheduled';
    if (!acc[date]) acc[date] = [];
    acc[date].push(job);
    return acc;
  }, {});

  const formatDate = (dateString: string) => {
    if (dateString === 'Unscheduled') return 'Unscheduled Jobs';
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateStr = date.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    if (dateStr === todayStr) return `Today, ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    if (dateStr === tomorrowStr) return `Tomorrow, ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'Scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Unscheduled': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="mt-4 bg-white shadow ring-1 ring-black ring-opacity-5 md:rounded-lg overflow-hidden">
      <div className="divide-y divide-brand-gray-200">
        {Object.entries(groupedByDate).length > 0 ? (
          Object.entries(groupedByDate).map(([date, jobs]) => (
            <div key={date} className="p-6">
              <h3 className="text-lg font-bold text-brand-gray-900 mb-4 flex items-center">
                <svg className="h-5 w-5 mr-2 text-brand-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatDate(date)}
              </h3>
              
              <div className="space-y-3">
                {jobs.map(job => (
                  <div
                    key={job.id}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, job.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white border border-brand-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-move ${draggedJobId === job.id ? 'opacity-50 scale-105 shadow-lg' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-lg font-bold text-brand-gray-900">{job.id}</h4>
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${getStatusColor(job.status)}`}>
                            {job.status}
                          </span>
                        </div>
                        <p className="text-brand-gray-700 mt-1">{job.customerName}</p>
                        {job.jobLocation && (
                          <p className="text-brand-gray-600 text-sm mt-1 flex items-center">
                            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {job.jobLocation}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right ml-4">
                        {job.assignedCrew.length > 0 && (
                          <div className="flex items-center justify-end space-x-1">
                            <svg className="h-4 w-4 text-brand-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            <div className="text-sm text-brand-gray-600">
                              {job.assignedCrew
                                .map(empId => employees.find(e => e.id === empId)?.name)
                                .filter(Boolean)
                                .join(', ') || 'Not Assigned'}
                            </div>
                          </div>
                        )}
                        {job.estimatedHours && (
                          <p className="text-sm text-brand-gray-600 mt-1">⏱️ {job.estimatedHours}h</p>
                        )}
                      </div>
                    </div>
                    
                    {job.specialInstructions && (
                      <div className="mt-3 p-3 bg-brand-gray-50 rounded border border-brand-gray-200">
                        <p className="text-brand-gray-600 font-semibold text-xs">Special Instructions</p>
                        <p className="text-brand-gray-700 text-sm mt-1">{job.specialInstructions}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="mt-2 text-sm text-brand-gray-500">No jobs found</p>
              <p className="text-xs text-brand-gray-400 mt-1">Try adjusting your filters</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListView;
