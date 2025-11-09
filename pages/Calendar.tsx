import React, { useState, useMemo } from 'react';
import { Job, Employee, Customer } from '../types';
import { CalendarView } from './Calendar/types';
import JobIcon from '../components/icons/JobIcon';
import GoogleCalendarIcon from '../components/icons/GoogleCalendarIcon';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import TemplateSelector from '../components/TemplateSelector';
import { syncJobsToGoogleCalendar } from '../services/googleCalendarService';
import * as api from '../services/apiService';

import MonthView from './Calendar/views/MonthView';
import WeekView from './Calendar/views/WeekView';
import DayView from './Calendar/views/DayView';
import ThreeDayView from './Calendar/views/ThreeDayView';
import ListView from './Calendar/views/ListView';
import MapViewWrapper from './Calendar/views/MapViewWrapper';
import CrewView from './Calendar/views/CrewView';

interface CalendarProps {
    jobs: Job[];
    employees: Employee[];
    customers?: Customer[];
    setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
}

const Calendar: React.FC<CalendarProps> = ({ jobs, employees, customers = [], setJobs }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeView, setActiveView] = useState<CalendarView>('month');
    const [statusFilter, setStatusFilter] = useState('all');
    const [employeeFilter, setEmployeeFilter] = useState('all');
    const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);

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

    const goToPreviousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const goToNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    
    const goToPreviousWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() - 7);
        setCurrentDate(newDate);
    };
    
    const goToNextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + 7);
        setCurrentDate(newDate);
    };
    
    const goToPreviousDay = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() - 1);
        setCurrentDate(newDate);
    };
    
    const goToNextDay = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + 1);
        setCurrentDate(newDate);
    };

    const goToToday = () => setCurrentDate(new Date());

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

    const handleUseTemplate = async (templateId: string) => {
        try {
            const newJob = await api.jobTemplateService.useTemplate(templateId);
            setJobs(prev => [newJob, ...prev]);
            setShowTemplateSelector(false);
        } catch (error: any) {
            console.error('Failed to create job from template:', error);
            alert(`Failed to create job from template: ${error.message || 'Unknown error'}`);
        }
    };

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
    };

    const getNavigationControls = () => {
        switch (activeView) {
            case 'month':
                return (
                    <>
                        <button onClick={goToPreviousMonth} className="text-brand-gray-500 hover:text-brand-gray-700 p-1 rounded-full hover:bg-gray-100">
                            <span className="sr-only">Previous month</span>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                        </button>
                        <h2 className="text-base md:text-lg font-semibold text-brand-gray-800 text-center w-48">
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button onClick={goToNextMonth} className="text-brand-gray-500 hover:text-brand-gray-700 p-1 rounded-full hover:bg-gray-100">
                            <span className="sr-only">Next month</span>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </button>
                    </>
                );
            case 'week':
            case 'crew':
                return (
                    <>
                        <button onClick={goToPreviousWeek} className="text-brand-gray-500 hover:text-brand-gray-700 p-1 rounded-full hover:bg-gray-100">
                            <span className="sr-only">Previous week</span>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                        </button>
                        <h2 className="text-base md:text-lg font-semibold text-brand-gray-800 text-center w-48">
                            Week of {currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </h2>
                        <button onClick={goToNextWeek} className="text-brand-gray-500 hover:text-brand-gray-700 p-1 rounded-full hover:bg-gray-100">
                            <span className="sr-only">Next week</span>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </button>
                    </>
                );
            case 'day':
            case '3-day':
                return (
                    <>
                        <button onClick={goToPreviousDay} className="text-brand-gray-500 hover:text-brand-gray-700 p-1 rounded-full hover:bg-gray-100">
                            <span className="sr-only">Previous day</span>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                        </button>
                        <h2 className="text-base md:text-lg font-semibold text-brand-gray-800 text-center w-48">
                            {currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </h2>
                        <button onClick={goToNextDay} className="text-brand-gray-500 hover:text-brand-gray-700 p-1 rounded-full hover:bg-gray-100">
                            <span className="sr-only">Next day</span>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </button>
                    </>
                );
            default:
                return <div className="w-48"></div>;
        }
    };

    const viewProps = {
        jobs,
        employees,
        currentDate,
        statusFilter,
        employeeFilter,
        filteredJobs: filteredJobsOnCalendar,
        jobsByDate,
        onDateChange: setCurrentDate,
        onJobDrop: (jobId: string, newDate: string) => {
            setJobs(prevJobs => 
                prevJobs.map(job => 
                    job.id === jobId ? { ...job, scheduledDate: newDate, status: 'Scheduled' } : job
                )
            );
        },
        setJobs,
        handleDragStart,
        handleDragEnd,
        handleDragOver,
        handleDragEnter,
        handleDragLeave,
        handleDrop,
        draggedJobId
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-brand-gray-900">Jobs Calendar</h1>
            
            <div className="mt-6 flex flex-col lg:flex-row lg:space-x-8">
                {activeView !== 'list' && activeView !== 'map' && activeView !== 'crew' && (
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
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(job.status)}`}>
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
                )}

                {activeView === 'crew' && (
                    <div className="lg:w-1/4 xl:w-1/5">
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
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(job.status)}`}>
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
                )}

                <div className="flex-1 mt-8 lg:mt-0">
                    <div className="sm:flex sm:items-center sm:justify-between mb-4">
                        <div className="flex items-center space-x-2">
                            {getNavigationControls()}
                        </div>
                        <div className="mt-4 sm:mt-0 flex items-center space-x-2">
                            <button 
                                onClick={() => setShowTemplateSelector(true)}
                                className="inline-flex items-center gap-x-1.5 rounded-md bg-brand-cyan-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700"
                            >
                                Create from Template
                            </button>
                            <button 
                                onClick={goToToday}
                                className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50"
                            >
                                Today
                            </button>
                            <button 
                                onClick={handleSyncCalendar} 
                                disabled={isSyncing} 
                                className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSyncing ? <SpinnerIcon className="h-5 w-5" /> : <GoogleCalendarIcon className="h-5 w-5" />}
                                {isSyncing ? 'Syncing...' : 'Sync'}
                            </button>
                        </div>
                    </div>

                    <div className="mb-4 bg-white rounded-lg shadow-sm p-2 inline-flex space-x-1">
                        <button
                            onClick={() => setActiveView('day')}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeView === 'day' 
                                    ? 'bg-brand-cyan-600 text-white' 
                                    : 'text-brand-gray-700 hover:bg-brand-gray-100'
                            }`}
                        >
                            Day
                        </button>
                        <button
                            onClick={() => setActiveView('3-day')}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeView === '3-day' 
                                    ? 'bg-brand-cyan-600 text-white' 
                                    : 'text-brand-gray-700 hover:bg-brand-gray-100'
                            }`}
                        >
                            3-Day
                        </button>
                        <button
                            onClick={() => setActiveView('week')}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeView === 'week' 
                                    ? 'bg-brand-cyan-600 text-white' 
                                    : 'text-brand-gray-700 hover:bg-brand-gray-100'
                            }`}
                        >
                            Week
                        </button>
                        <button
                            onClick={() => setActiveView('month')}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeView === 'month' 
                                    ? 'bg-brand-cyan-600 text-white' 
                                    : 'text-brand-gray-700 hover:bg-brand-gray-100'
                            }`}
                        >
                            Month
                        </button>
                        <button
                            onClick={() => setActiveView('list')}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeView === 'list' 
                                    ? 'bg-brand-cyan-600 text-white' 
                                    : 'text-brand-gray-700 hover:bg-brand-gray-100'
                            }`}
                        >
                            List
                        </button>
                        <button
                            onClick={() => setActiveView('map')}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeView === 'map' 
                                    ? 'bg-brand-cyan-600 text-white' 
                                    : 'text-brand-gray-700 hover:bg-brand-gray-100'
                            }`}
                        >
                            Map
                        </button>
                        <button
                            onClick={() => setActiveView('crew')}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeView === 'crew' 
                                    ? 'bg-brand-cyan-600 text-white' 
                                    : 'text-brand-gray-700 hover:bg-brand-gray-100'
                            }`}
                        >
                            Crew
                        </button>
                    </div>

                    {activeView !== 'list' && activeView !== 'map' && activeView !== 'crew' && (
                        <div className="mb-4 flex flex-wrap gap-2">
                            <select 
                                value={statusFilter} 
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="rounded-md border-brand-gray-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 text-sm"
                            >
                                <option value="all">All Statuses</option>
                                <option value="Unscheduled">Unscheduled</option>
                                <option value="Scheduled">Scheduled</option>
                                <option value="In Progress">In Progress</option>
                            </select>
                            <select 
                                value={employeeFilter} 
                                onChange={(e) => setEmployeeFilter(e.target.value)}
                                className="rounded-md border-brand-gray-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 text-sm"
                            >
                                <option value="all">All Employees</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {activeView === 'month' && <MonthView {...viewProps} />}
                    {activeView === 'week' && <WeekView {...viewProps} />}
                    {activeView === 'day' && <DayView {...viewProps} />}
                    {activeView === '3-day' && <ThreeDayView {...viewProps} />}
                    {activeView === 'list' && <ListView {...viewProps} />}
                    {activeView === 'map' && <MapViewWrapper {...viewProps} customers={customers} />}
                    {activeView === 'crew' && <CrewView jobs={jobs} currentDate={currentDate} setJobs={setJobs} handleDragStart={handleDragStart} handleDragEnd={handleDragEnd} draggedJobId={draggedJobId} />}
                </div>
            </div>

            <TemplateSelector
                isOpen={showTemplateSelector}
                onClose={() => setShowTemplateSelector(false)}
                onSelect={handleUseTemplate}
            />
        </div>
    );
};

export default Calendar;
