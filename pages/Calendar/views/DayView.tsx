import React from 'react';
import { CalendarViewProps, DragHandlers } from '../types';
import { Job } from '../../../types';

interface DayViewProps extends Omit<CalendarViewProps, 'onJobDrop'>, DragHandlers {}

const DayView: React.FC<DayViewProps> = ({ 
  currentDate, 
  filteredJobs,
  employees,
  handleDragStart,
  handleDragEnd,
  handleDragOver,
  handleDragEnter,
  handleDragLeave,
  handleDrop,
  draggedJobId
}) => {
  const dateString = currentDate.toISOString().split('T')[0];
  const jobsForDay = filteredJobs.filter(job => job.scheduledDate === dateString);
  const isToday = dateString === new Date().toISOString().split('T')[0];

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="mt-4 bg-white shadow ring-1 ring-black ring-opacity-5 md:rounded-lg overflow-hidden">
      <div className={`p-4 border-b border-brand-gray-200 ${isToday ? 'bg-brand-cyan-50' : ''}`}>
        <h2 className="text-xl font-bold text-brand-gray-900">
          {currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          {isToday && <span className="ml-2 text-brand-cyan-600">(Today)</span>}
        </h2>
      </div>
      
      <div 
        className="p-4 calendar-day min-h-[600px]"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, currentDate)}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        {jobsForDay.length > 0 ? (
          <div className="space-y-3">
            {jobsForDay.map(job => (
              <div
                key={job.id}
                className="group relative"
                draggable="true"
                onDragStart={(e) => handleDragStart(e, job.id)}
                onDragEnd={handleDragEnd}
              >
                <div className={`bg-brand-green-100 p-4 rounded-lg cursor-move hover:shadow-md transition-all border-l-4 border-brand-green-600 ${draggedJobId === job.id ? 'opacity-50 scale-105 shadow-lg' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-bold text-brand-green-800 text-lg">{job.id}</p>
                      <p className="text-brand-green-700 mt-1">{job.customerName}</p>
                      {job.jobLocation && (
                        <p className="text-brand-green-600 text-sm mt-1">📍 {job.jobLocation}</p>
                      )}
                    </div>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                      job.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                      job.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-brand-gray-600 font-semibold">Crew</p>
                      <p className="text-brand-gray-800">
                        {job.assignedCrew
                          .map(empId => employees.find(e => e.id === empId)?.name)
                          .filter(Boolean)
                          .join(', ') || 'Not Assigned'}
                      </p>
                    </div>
                    {job.estimatedHours && (
                      <div>
                        <p className="text-brand-gray-600 font-semibold">Estimated Hours</p>
                        <p className="text-brand-gray-800">{job.estimatedHours}h</p>
                      </div>
                    )}
                  </div>
                  
                  {job.specialInstructions && (
                    <div className="mt-3 p-2 bg-white rounded border border-brand-gray-200">
                      <p className="text-brand-gray-600 font-semibold text-xs">Special Instructions</p>
                      <p className="text-brand-gray-700 text-sm mt-1">{job.specialInstructions}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full py-20">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-2 text-sm text-brand-gray-500">No jobs scheduled for this day</p>
              <p className="text-xs text-brand-gray-400 mt-1">Drag jobs from the sidebar to schedule them</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayView;
