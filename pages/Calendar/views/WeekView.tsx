import React from 'react';
import { CalendarViewProps, DragHandlers } from '../types';
import { Job } from '../../../types';

interface WeekViewProps extends Omit<CalendarViewProps, 'onJobDrop'>, DragHandlers {}

const WeekView: React.FC<WeekViewProps> = ({ 
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
  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
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

  return (
    <div className="mt-4 bg-white shadow ring-1 ring-black ring-opacity-5 md:rounded-lg overflow-hidden">
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
  );
};

export default WeekView;
