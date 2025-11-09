import React from 'react';
import { CalendarViewProps, DragHandlers } from '../types';
import { Job } from '../../../types';
import JobIcon from '../../../components/icons/JobIcon';

interface MonthViewProps extends Omit<CalendarViewProps, 'onJobDrop'>, DragHandlers {}

const MonthView: React.FC<MonthViewProps> = ({ 
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
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
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

  return (
    <div className="mt-4 bg-white shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
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
  );
};

export default MonthView;
