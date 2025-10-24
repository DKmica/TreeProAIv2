import React, { useState, useMemo } from 'react';
import { Job, Employee } from '../types';
import JobIcon from '../components/icons/JobIcon';
import GoogleCalendarIcon from '../components/icons/GoogleCalendarIcon';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import { syncJobsToGoogleCalendar } from '../services/googleCalendarService';

interface CalendarProps {
    jobs: Job[];
    employees: Employee[];
    // FIX: Correctly type the `setJobs` prop to match `useState` setter.
    setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
}

const Calendar: React.FC<CalendarProps> = ({ jobs, employees, setJobs }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [statusFilter, setStatusFilter] = useState('all');
    const [employeeFilter, setEmployeeFilter] = useState('all');
    const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // --- Data Filtering & Memoization ---

    const schedulableJobs = useMemo(() => {
        return jobs.filter(job => job.status === 'Unscheduled' || job.status === 'Scheduled' || job.status === 'In Progress')
            .sort((a, b) => a.id.localeCompare(b.id));
    }, [jobs]);

    const filteredJobsOnCalendar = useMemo(() => {
        return jobs.filter(job => {
            const statusMatch = statusFilter === 'all' || job.status === statusFilter;
            const employeeMatch = employeeFilter === 'all' || job.assignedCrew.includes(employeeFilter);
            return statusMatch && employeeMatch;
        });
    }, [jobs, statusFilter, employeeFilter]);

    const jobsByDate = useMemo(() => {
        const map = new Map<string, Job[]>();
        filteredJobsOnCalendar.forEach(job => {
            const date = job.scheduledDate;
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
    
    const handleSyncCalendar = async () => {
        setIsSyncing(true);
        const jobsToSync = jobs.filter(j => j.status === 'Scheduled' && j.scheduledDate);
        try {
            const result = await syncJobsToGoogleCalendar(jobsToSync);
            alert(`Successfully synced ${result.eventsCreated} jobs to Google Calendar.`);
        } catch (error: any) {
            alert(`Failed to sync calendar: ${error.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

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
        if (dayCell) dayCell.classList.add('bg-brand-green-100');
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const target = e.target as HTMLDivElement;
        const dayCell = target.closest('.calendar-day');
        if (dayCell) dayCell.classList.remove('bg-brand-green-100');
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, date: Date | null) => {
        e.preventDefault();
        const target = e.target as HTMLDivElement;
        const dayCell = target.closest('.calendar-day');
        if (dayCell) dayCell.classList.remove('bg-brand-green-100');
        
        if (!date) return;

        const jobId = e.dataTransfer.getData('jobId');
        const newScheduledDate = date.toISOString().split('T')[0];

        setJobs(prevJobs => 
            prevJobs.map(job => 
                job.id === jobId ? { ...job, scheduledDate: newScheduledDate, status: 'Scheduled' } : job
            )
        );
    };
    
    const getStatusColor = (status: Job['status']) => {
        switch (status) {
            case 'Scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'In Progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Unscheduled': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    }


    return (
        <div>
            <h1 className="text-2xl font-bold text-brand-gray-900">Jobs Calendar</h1>
            
            <div className="mt-6 flex flex-col lg:flex-row lg:space-x-8">
                {/* Column 1: Jobs List */}
                <div className="lg:w-1/3 xl:w-1/4">
                    <h2 className="text-xl font-bold text-brand-gray-900">Jobs List</h2>
                     <div className="mt-4 bg-white p-3 rounded-lg shadow-sm border border-brand-gray-200 space-y-3 max-h-[80vh] overflow-y-auto">
                        {schedulableJobs.length > 0 ? schedulableJobs.map(job => (
                            <div 
                                key={job.id}
                                draggable="true"
                                onDragStart={(e) => handleDragStart(e, job.id)}
                                onDragEnd={handleDragEnd}
                                className={`p-3 rounded-lg border cursor-move hover:shadow-lg transition-all ${draggedJobId === job.id ? 'opacity-50 scale-105 shadow-xl bg-brand-green-50' : 'bg-white shadow-sm'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <p className="font-semibold text-brand-gray-800 flex items-center"><JobIcon className="w-4 h-4 mr-2 text-brand-gray-400"/> {job.id}</p>
                                     <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ getStatusColor(job.status) }`}>
                                        {job.status}
                                    </span>
                                </div>
                                <p className="text-sm text-brand-gray-600 mt-1">{job.customerName}</p>
                            </div>
                        )) : (
                            <div className="text-center py-10">
                                <p className="text-sm text-brand-gray-500">No active jobs to schedule.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Column 2: Calendar */}
                <div className="flex-1 mt-8 lg:mt-0">
                    <div className="sm:flex sm:items-center sm:justify-between">
                        <div className="flex items-center space-x-2 md:space-x-4">
                            <button onClick={goToPreviousMonth} className="text-brand-gray-500 hover:text-brand-gray-700 p-1 rounded-full hover:bg-gray-100">
                                <span className="sr-only">Previous month</span>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                            </button>
                            <h2 className="text-base md:text-lg font-semibold text-brand-gray-800 text-center w-36">
                                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </h2>
                            <button onClick={goToNextMonth} className="text-brand-gray-500 hover:text-brand-gray-700 p-1 rounded-full hover:bg-gray-100">
                                <span className="sr-only">Next month</span>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                            </button>
                        </div>
                        <div className="mt-4 sm:mt-0 flex items-center space-x-2">
                             <button onClick={handleSyncCalendar} disabled={isSyncing} className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                                {isSyncing ? <SpinnerIcon className="h-5 w-5" /> : <GoogleCalendarIcon className="h-5 w-5" />}
                                {isSyncing ? 'Syncing...' : 'Sync with Google Calendar'}
                            </button>
                        </div>
                    </div>
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
                                            <time dateTime={dateString} className={`font-semibold ${isToday ? 'bg-brand-green-600 text-white rounded-full flex h-6 w-6 items-center justify-center' : ''}`}>
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
                                                    
                                                    {/* Tooltip */}
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
                </div>
            </div>
        </div>
    );
};

export default Calendar;
