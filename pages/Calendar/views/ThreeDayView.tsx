import React, { useState } from 'react';
import { CalendarViewProps, DragHandlers } from '../types';
import { Job } from '../../../types';

interface ThreeDayViewProps extends CalendarViewProps, DragHandlers {}

const ThreeDayView: React.FC<ThreeDayViewProps> = ({ 
  currentDate, 
  filteredJobs,
  employees,
  onJobDrop,
  handleDragStart,
  handleDragEnd,
  handleDragOver,
  handleDragEnter,
  handleDragLeave,
  handleDrop,
  draggedJobId
}) => {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  
  const threeDays: Date[] = [];
  for (let i = 0; i < 3; i++) {
    const day = new Date(currentDate);
    day.setDate(currentDate.getDate() + i);
    threeDays.push(day);
  }

  const jobsByDate = new Map<string, Job[]>();
  filteredJobs.forEach(job => {
    const date = job.scheduledDate;
    if (!date) return;
    if (!jobsByDate.has(date)) {
      jobsByDate.set(date, []);
    }
    jobsByDate.get(date)?.push(job);
  });

  const handleJobTap = (job: Job) => {
    setSelectedJob(job);
    setNewDate(job.scheduledDate || '');
    setShowRescheduleModal(true);
  };

  const handleReschedule = () => {
    if (selectedJob && newDate) {
      onJobDrop(selectedJob.id, newDate);
      setShowRescheduleModal(false);
      setSelectedJob(null);
      setNewDate('');
    }
  };

  return (
    <div className="mt-4">
      {/* Desktop: Grid layout */}
      <div className="hidden lg:block bg-white shadow ring-1 ring-black ring-opacity-5 md:rounded-lg overflow-hidden">
        <div className="grid grid-cols-3 gap-px bg-brand-gray-200">
          {threeDays.map((day, index) => {
            const dateString = day.toISOString().split('T')[0];
            const jobsForDay = jobsByDate.get(dateString) || [];
            const isToday = dateString === new Date().toISOString().split('T')[0];

            return (
              <div 
                key={index} 
                className="calendar-day bg-white"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, day)}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
              >
                <div className={`p-4 border-b border-brand-gray-200 ${isToday ? 'bg-brand-cyan-50' : ''}`}>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-brand-gray-600">
                      {day.toLocaleDateString('en-US', { weekday: 'long' })}
                    </p>
                    <p className={`mt-1 text-2xl font-bold ${isToday ? 'text-brand-cyan-600' : 'text-brand-gray-900'}`}>
                      {day.getDate()}
                    </p>
                    <p className="text-xs text-brand-gray-500">
                      {day.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                
                <div className="p-3 min-h-[500px] space-y-2">
                  {jobsForDay.length > 0 ? (
                    jobsForDay.map(job => (
                      <div
                        key={job.id}
                        className="group relative"
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, job.id)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className={`bg-brand-green-100 p-3 rounded-lg cursor-move hover:shadow-md transition-all border-l-4 border-brand-green-600 ${draggedJobId === job.id ? 'opacity-50 scale-105 shadow-lg' : ''}`}>
                          <p className="font-bold text-brand-green-800">{job.id}</p>
                          <p className="text-brand-green-700 text-sm mt-1">{job.customerName}</p>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-2 ${
                            job.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                            job.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {job.status}
                          </span>
                          {job.assignedCrew.length > 0 && (
                            <p className="text-brand-green-600 text-xs mt-2">
                              👥 {job.assignedCrew
                                .map(empId => employees.find(e => e.id === empId)?.name)
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          )}
                        </div>
                        
                        <div className="absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-xs -translate-x-1/2 transform rounded-lg bg-brand-gray-900 px-3 py-2 text-sm font-normal text-white opacity-0 shadow-lg transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
                          <p className="font-bold text-white">{job.customerName}</p>
                          <p className="text-brand-gray-300"><span className="font-semibold">Status:</span> {job.status}</p>
                          {job.jobLocation && (
                            <p className="text-brand-gray-300"><span className="font-semibold">Location:</span> {job.jobLocation}</p>
                          )}
                          <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-brand-gray-900"></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-32 text-center">
                      <p className="text-sm text-brand-gray-400">No jobs scheduled</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: Vertical stacked layout */}
      <div className="lg:hidden space-y-4">
        {threeDays.map((day, index) => {
          const dateString = day.toISOString().split('T')[0];
          const jobsForDay = jobsByDate.get(dateString) || [];
          const isToday = dateString === new Date().toISOString().split('T')[0];

          return (
            <div 
              key={index} 
              className={`bg-white rounded-lg shadow-md overflow-hidden border-t-4 ${
                isToday ? 'border-brand-cyan-600' : 'border-brand-gray-300'
              }`}
            >
              <div className={`p-4 ${isToday ? 'bg-brand-cyan-50' : 'bg-brand-gray-50'}`}>
                <div className="text-center">
                  <p className="text-sm font-semibold text-brand-gray-600">
                    {day.toLocaleDateString('en-US', { weekday: 'long' })}
                  </p>
                  <p className={`mt-1 text-3xl font-bold ${isToday ? 'text-brand-cyan-600' : 'text-brand-gray-900'}`}>
                    {day.getDate()}
                  </p>
                  <p className="text-sm text-brand-gray-500 mt-1">
                    {day.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                  <div className="mt-2">
                    <span className="inline-flex items-center rounded-full bg-brand-green-100 px-3 py-1 text-xs font-medium text-brand-green-800">
                      {jobsForDay.length} {jobsForDay.length === 1 ? 'job' : 'jobs'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 space-y-3">
                {jobsForDay.length > 0 ? (
                  jobsForDay.map(job => (
                    <div
                      key={job.id}
                      onClick={() => handleJobTap(job)}
                      className="bg-brand-green-100 p-4 rounded-lg border-l-4 border-brand-green-600 shadow-sm min-h-[60px] cursor-pointer active:bg-brand-green-200 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-brand-green-800 text-sm">{job.id}</p>
                          <p className="text-brand-green-700 text-sm mt-1">{job.customerName}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              job.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                              job.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {job.status}
                            </span>
                          </div>
                          {job.assignedCrew.length > 0 && (
                            <p className="text-brand-green-600 text-xs mt-2">
                              👥 {job.assignedCrew
                                .map(empId => employees.find(e => e.id === empId)?.name)
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          )}
                          {job.jobLocation && (
                            <p className="text-brand-green-600 text-xs mt-1">
                              📍 {job.jobLocation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center py-8 text-center">
                    <p className="text-sm text-brand-gray-400">No jobs scheduled</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Reschedule Modal */}
      {showRescheduleModal && selectedJob && (
        <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={() => setShowRescheduleModal(false)}>
          <div className="fixed bottom-0 inset-x-0 bg-white rounded-t-xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-brand-gray-900 mb-4">Reschedule Job</h3>
            <div className="mb-4 space-y-2">
              <p className="text-sm text-brand-gray-700"><span className="font-semibold">Job:</span> {selectedJob.id}</p>
              <p className="text-sm text-brand-gray-700"><span className="font-semibold">Customer:</span> {selectedJob.customerName}</p>
              <p className="text-sm text-brand-gray-700"><span className="font-semibold">Current date:</span> {selectedJob.scheduledDate || 'Not scheduled'}</p>
            </div>
            <label htmlFor="reschedule-date-threeday" className="block text-sm font-medium text-brand-gray-700 mb-2">
              New Date
            </label>
            <input
              id="reschedule-date-threeday"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full mb-4 p-3 border border-brand-gray-300 rounded-lg text-base min-h-[48px]"
            />
            <div className="flex gap-3">
              <button
                onClick={handleReschedule}
                className="flex-1 bg-brand-cyan-600 text-white py-3 rounded-lg font-semibold hover:bg-brand-cyan-700 active:bg-brand-cyan-800 min-h-[48px]"
              >
                Reschedule
              </button>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="flex-1 border border-brand-gray-300 py-3 rounded-lg font-semibold hover:bg-brand-gray-50 active:bg-brand-gray-100 min-h-[48px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeDayView;
