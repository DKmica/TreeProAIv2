import React, { useState } from 'react';
import { CalendarViewProps, DragHandlers } from '../types';
import { Job } from '../../../types';
import JobIcon from '../../../components/icons/JobIcon';

interface MonthViewProps extends CalendarViewProps, DragHandlers {}

const MonthView: React.FC<MonthViewProps> = ({ 
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
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDayOfWeek = startOfMonth.getDay();

  const daysInMonth: (Date | null)[] = Array.from({ length: startDayOfWeek }, () => null);
  for (let i = 1; i <= endOfMonth.getDate(); i++) {
    daysInMonth.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
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

  const toggleDayExpansion = (dateString: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateString)) {
        newSet.delete(dateString);
      } else {
        newSet.add(dateString);
      }
      return newSet;
    });
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

  const ChevronIcon = ({ isExpanded }: { isExpanded: boolean }) => (
    <svg
      className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );

  return (
    <div className="mt-4">
      {/* Desktop: Grid layout */}
      <div className="hidden lg:block bg-white shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <div className="grid grid-cols-7 gap-px text-center text-xs font-semibold leading-6 text-brand-gray-700 border-b border-brand-gray-200">
          {weekDays.map(day => <div key={day} className="py-2">{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-px bg-brand-gray-200">
          {daysInMonth.map((day, index) => {
            const dateString = day ? day.toISOString().split('T')[0] : '';
            const jobsForDay = jobsByDate.get(dateString) || [];
            const isToday = day && dateString === new Date().toISOString().split('T')[0];

            return (
              <div 
                key={index} 
                className={`calendar-day relative min-h-[120px] p-2 transition-colors duration-200 ${day ? 'bg-white' : 'bg-brand-gray-50'}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, day)}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
              >
                {day && (
                  <time dateTime={dateString} className={`font-semibold ${isToday ? 'bg-brand-cyan-600 text-white rounded-full flex h-6 w-6 items-center justify-center' : ''}`}>
                    {day.getDate()}
                  </time>
                )}
                <div className="mt-2 space-y-1">
                  {jobsForDay.map(job => (
                    <div
                      key={job.id}
                      className="group relative"
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, job.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className={`text-left text-xs bg-brand-green-100 p-1.5 rounded-md cursor-move hover:shadow-md transition-all ${draggedJobId === job.id ? 'opacity-50 scale-105 shadow-lg' : ''}`}>
                        <p className="font-medium text-brand-green-800 truncate">{job.id}</p>
                        <p className="text-brand-green-700 truncate">{job.customerName}</p>
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

      {/* Mobile: List layout */}
      <div className="lg:hidden space-y-2">
        {daysInMonth
          .filter(day => day !== null)
          .map((day) => {
            const dateString = day!.toISOString().split('T')[0];
            const jobsForDay = jobsByDate.get(dateString) || [];
            const isExpanded = expandedDays.has(dateString);
            const isToday = dateString === new Date().toISOString().split('T')[0];

            return (
              <div 
                key={dateString} 
                className={`bg-white rounded-lg shadow-md overflow-hidden border-l-4 ${
                  isToday ? 'border-brand-cyan-600' : 'border-transparent'
                }`}
              >
                <button
                  onClick={() => toggleDayExpansion(dateString)}
                  className="w-full flex items-center justify-between p-4 min-h-[56px] active:bg-brand-gray-50 transition-colors"
                >
                  <div className="flex-1 text-left">
                    <p className={`text-lg font-bold ${isToday ? 'text-brand-cyan-600' : 'text-brand-gray-900'}`}>
                      {day!.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <span className="inline-flex items-center rounded-full bg-brand-green-100 px-2.5 py-0.5 text-xs font-medium text-brand-green-800 mt-1">
                      {jobsForDay.length} {jobsForDay.length === 1 ? 'job' : 'jobs'}
                    </span>
                  </div>
                  <ChevronIcon isExpanded={isExpanded} />
                </button>
                
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2 animate-fadeIn">
                    {jobsForDay.length > 0 ? (
                      jobsForDay.map(job => (
                        <div 
                          key={job.id} 
                          onClick={() => handleJobTap(job)}
                          className="bg-brand-green-100 p-4 rounded-lg border border-brand-green-200 min-h-[56px] cursor-pointer active:bg-brand-green-200 transition-colors"
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
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-brand-gray-500 text-sm">
                        No jobs scheduled
                      </div>
                    )}
                  </div>
                )}
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
            <label htmlFor="reschedule-date" className="block text-sm font-medium text-brand-gray-700 mb-2">
              New Date
            </label>
            <input
              id="reschedule-date"
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

export default MonthView;
