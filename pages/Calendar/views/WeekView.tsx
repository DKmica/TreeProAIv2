import React, { useRef, useState } from 'react';
import { CalendarViewProps, DragHandlers } from '../types';
import { Job } from '../../../types';

interface WeekViewProps extends CalendarViewProps, DragHandlers {}

const WeekView: React.FC<WeekViewProps> = ({ 
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
  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
  
  const daysInWeek: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    daysInWeek.push(day);
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

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

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
        <div className="grid grid-cols-7 gap-px bg-brand-gray-200">
          {daysInWeek.map((day, index) => {
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
                <div className={`p-3 border-b border-brand-gray-200 ${isToday ? 'bg-brand-cyan-50' : ''}`}>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-brand-gray-600">{weekDays[index]}</p>
                    <p className={`mt-1 text-lg font-bold ${isToday ? 'text-brand-cyan-600' : 'text-brand-gray-900'}`}>
                      {day.getDate()}
                    </p>
                  </div>
                </div>
                <div className="p-2 min-h-[400px] space-y-2">
                  {jobsForDay.map(job => (
                    <div
                      key={job.id}
                      className="group relative"
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, job.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className={`text-left text-xs bg-brand-green-100 p-2 rounded-md cursor-move hover:shadow-md transition-all ${draggedJobId === job.id ? 'opacity-50 scale-105 shadow-lg' : ''}`}>
                        <p className="font-semibold text-brand-green-800">{job.id}</p>
                        <p className="text-brand-green-700 mt-1">{job.customerName}</p>
                        <p className="text-brand-green-600 text-xs mt-1">{job.status}</p>
                      </div>
                      
                      <div className="absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-xs -translate-x-1/2 transform rounded-lg bg-brand-gray-900 px-3 py-2 text-sm font-normal text-white opacity-0 shadow-lg transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
                        <p className="font-bold text-white">{job.customerName}</p>
                        <p className="text-brand-gray-300"><span className="font-semibold">Status:</span> {job.status}</p>
                        <p className="text-brand-gray-300"><span className="font-semibold">Crew:</span> {
                          job.assignedCrew
                            .map(empId => employees.find(e => e.id === empId)?.name)
                            .filter(Boolean)
                            .join(', ') || 'Not Assigned'
                        }</p>
                        <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-brand-gray-900"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: Horizontal swipe layout */}
      <div className="lg:hidden">
        <div className="relative bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg overflow-hidden">
          {/* Navigation arrows */}
          <button
            onClick={scrollLeft}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-brand-gray-50 active:bg-brand-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Scroll left"
          >
            <svg className="w-6 h-6 text-brand-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={scrollRight}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-brand-gray-50 active:bg-brand-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Scroll right"
          >
            <svg className="w-6 h-6 text-brand-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Scrollable days container */}
          <div
            ref={scrollContainerRef}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {daysInWeek.map((day, index) => {
              const dateString = day.toISOString().split('T')[0];
              const jobsForDay = jobsByDate.get(dateString) || [];
              const isToday = dateString === new Date().toISOString().split('T')[0];

              return (
                <div
                  key={index}
                  className="flex-none w-full snap-start"
                >
                  <div className={`border-b-4 ${isToday ? 'border-brand-cyan-600 bg-brand-cyan-50' : 'border-transparent'}`}>
                    <div className="p-4 text-center">
                      <p className="text-sm font-semibold text-brand-gray-600">{weekDays[index]}</p>
                      <p className={`mt-1 text-2xl font-bold ${isToday ? 'text-brand-cyan-600' : 'text-brand-gray-900'}`}>
                        {day.getDate()}
                      </p>
                      <p className="text-xs text-brand-gray-500 mt-1">
                        {day.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-4 min-h-[400px] space-y-3">
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
                                  job.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                  job.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
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
                            </div>
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
            <label htmlFor="reschedule-date-week" className="block text-sm font-medium text-brand-gray-700 mb-2">
              New Date
            </label>
            <input
              id="reschedule-date-week"
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

export default WeekView;
