import React, { useState, useMemo } from 'react';
import { Job, Employee } from '../types';
import JobIcon from '../components/icons/JobIcon';

interface CalendarProps {
    jobs: Job[];
    employees: Employee[];
    setJobs: (updateFn: (prev: Job[]) => Job[]) => void;
}

const Calendar: React.FC<CalendarProps> = ({ jobs, employees, setJobs }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [statusFilter, setStatusFilter] = useState('all');
    const [employeeFilter, setEmployeeFilter] = useState('all');
    const [draggedJobId, setDraggedJobId] = useState<string | null>(null);

    // --- Data Filtering & Memoization ---

    const schedulableJobs = useMemo(() => {
        return jobs.filter(job => job.status === 'Unscheduled' || job.status === 'Scheduled' || job.status === 'In Progress')
            .sort((a, b) => a.id.localeCompare(b.id));
    }, [jobs]);

    const filteredJobsOnCalendar = useMemo(() => {
        return jobs.filter(job => {
            const statusMatch = statusFilter === 'all' || job.status === statusFilter;
            const employeeMatch = employeeFilter === 'all' || job.assigned_crew?.includes(employeeFilter);
            return statusMatch && employeeMatch;
        });
    }, [jobs, statusFilter, employeeFilter]);

    const jobsByDate = useMemo(() => {
        const map = new Map<string, Job[]>();
        filteredJobsOnCalendar.forEach(job => {
            const date = job.date;
            if (!date) return;
            if (!map.has(date)) {
                map.set(date, []);
            }
            map.get(date)?.push(job);
        });
        return map;
    }, [filteredJobsOnCalendar]);

    // --- Calendar Grid Generation ---
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDayOfWeek = startOfMonth.getDay(); 

    const daysInMonth: (Date | null)[] = Array.from({ length: startDayOfWeek }, () => null);
    for (let i = 1; i <= endOfMonth.getDate(); i++) {
        daysInMonth.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }
    
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // --- Event Handlers ---
    const goToPreviousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const goToNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    
    // --- Drag and Drop Handlers ---
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, jobId: string) => {
        e.dataTransfer.setData('jobId', jobId);
        setDraggedJobId(jobId);
    };

    const handleDragEnd = () => setDraggedJobId(null);
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
    
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const target = e.target as HTMLDivElement;
        const dayCell = target.closest('.calendar-day');
        if (dayCell) dayCell.classList.add('bg-brand-cyan-100');
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const target = e.target as HTMLDivElement;
        const dayCell = target.closest('.calendar-day');
        if (dayCell) dayCell.classList.remove('bg-brand-cyan-100');
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, date: Date | null) => {
        e.preventDefault();
        const target = e.target as HTMLDivElement;
        const dayCell = target.closest('.calendar-day');
        if (dayCell) dayCell.classList.remove('bg-brand-cyan-100');
        
        if (!date) return;

        const jobId = e.dataTransfer.getData('jobId');
        const newScheduledDate = date.toISOString().split('T')[0];

        setJobs(prevJobs => 
            prevJobs.map(job => 
                job.id === jobId ? { ...job, date: newScheduledDate, status: 'Scheduled' } : job
            )
        );
    };
    
    const getStatusColor = (status: Job['status']) => {
        switch (status) {
            case 'Scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'In Progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Unscheduled': return 'bg-brand-navy-100 text-brand-navy-800 border-brand-navy-200';
            default: return 'bg-brand-navy-100 text-brand-navy-800 border-brand-navy-200';
        }
    }


    return (
        <div>
            <h1 className="text-2xl font-bold text-brand-navy-900">Jobs Calendar</h1>
            
            <div className="mt-6 flex flex-col lg:flex-row lg:space-x-8">
                {/* Column 1: Jobs List */}
                <div className="lg:w-1/3 xl:w-1/4">
                    <h2 className="text-xl font-bold text-brand-navy-900">Jobs List</h2>
                     <div className="mt-4 bg-white p-3 rounded-lg shadow-sm border border-brand-navy-200 space-y-3 max-h-[80vh] overflow-y-auto">
                        {schedulableJobs.length > 0 ? schedulableJobs.map(job => (
                            <div 
                                key={job.id}
                                draggable="true"
                                onDragStart={(e) => handleDragStart(e, job.id)}
                                onDragEnd={handleDragEnd}
                                className={`p-3 rounded-lg border cursor-move hover:shadow-lg transition-all ${draggedJobId === job.id ? 'opacity-50 scale-105 shadow-xl bg-brand-cyan-50' : 'bg-white shadow-sm'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <p className="font-semibold text-brand-navy-800 flex items-center"><JobIcon className="w-4 h-4 mr-2 text-brand-navy-400"/> {job.id}</p>
                                     <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ getStatusColor(job.status) }`}>
                                        {job.status}
                                    </span>
                                </div>
                                <p className="text-sm text-brand-navy-600 mt-1">{job.customerName}</p>
                            </div>
                        )) : (
                            <div className="text-center py-10">
                                <p className="text-sm text-brand-navy-500">No active jobs to schedule.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Column 2: Calendar */}
                <div className="flex-1 mt-8 lg:mt-0">
                    <div className="sm:flex sm:items-center sm:justify-between">
                        <div className="flex items-center space-x-2 md:space-x-4">
                            <button onClick={goToPreviousMonth} className="text-brand-navy-500 hover:text-brand-navy-700 p-1 rounded-full hover:bg-gray-100">
                                <span className="sr-only">Previous month</span>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                            </button>
                            <h2 className="text-base md:text-lg font-semibold text-brand-navy-800 text-center w-36">
                                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </h2>
                            <button onClick={goToNextMonth} className="text-brand-navy-500 hover:text-brand-navy-700 p-1 rounded-full hover:bg-gray-100">
                                <span className="sr-only">Next month</span>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                            </button>
                        </div>
                        <div className="mt-4 sm:mt-0 flex items-center space-x-2">
                            <div>
                                <label htmlFor="status-filter" className="sr-only">Filter by status</label>
                                <select id="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm">
                                    <option value="all">All Statuses</option>
                                    <option value="Unscheduled">Unscheduled</option>
                                    <option value="Scheduled">Scheduled</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="employee-filter" className="sr-only">Filter by employee</label>
                                <select id="employee-filter" value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm">
                                    <option value="all">All Employees</option>
                                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 bg-white shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                        <div className="grid grid-cols-7 gap-px text-center text-xs font-semibold leading-6 text-brand-navy-700 border-b border-brand-navy-200">
                            {weekDays.map(day => <div key={day} className="py-2">{day}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-px bg-brand-navy-200">
                            {daysInMonth.map((day, index) => {
                                const dateString = day ? day.toISOString().split('T')[0] : '';
                                const jobsForDay = jobsByDate.get(dateString) || [];
                                const isToday = day && dateString === new Date().toISOString().split('T')[0];

                                return (
                                    <div 
                                        key={index} 
                                        className={`calendar-day relative min-h-[120px] p-2 transition-colors duration-200 ${day ? 'bg-white' : 'bg-brand-navy-50'}`}
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
                                                    draggable="true"
                                                    onDragStart={(e) => handleDragStart(e, job.id)}
                                                    onDragEnd={handleDragEnd}
                                                    className={`text-left text-xs bg-brand-cyan-100 p-1.5 rounded-md overflow-hidden cursor-move hover:shadow-md transition-all ${draggedJobId === job.id ? 'opacity-50 scale-105 shadow-lg' : ''}`}
                                                >
                                                    <p className="font-medium text-brand-cyan-800 truncate">{job.id}</p>
                                                    <p className="text-brand-cyan-700 truncate">{job.customerName}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Calendar;