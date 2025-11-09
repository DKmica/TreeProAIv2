import React, { useState, useEffect, useMemo } from 'react';
import { Job, Crew, CrewAssignment } from '../../../types';
import { DragHandlers } from '../types';
import * as api from '../../../services/apiService';

interface CrewViewProps extends DragHandlers {
  jobs: Job[];
  currentDate: Date;
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
}

const CrewView: React.FC<CrewViewProps> = ({ 
  jobs,
  currentDate,
  setJobs,
  handleDragStart,
  handleDragEnd,
  draggedJobId
}) => {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [assignments, setAssignments] = useState<CrewAssignment[]>([]);
  const [conflicts, setConflicts] = useState<{ crewId: string; date: string; assignments: CrewAssignment[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getWeekDates = (date: Date): Date[] => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      dates.push(day);
    }
    return dates;
  };

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const getCrewColor = (crewId: string): string => {
    const colors = [
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#ec4899',
      '#14b8a6',
      '#f97316'
    ];
    const hash = crewId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const startDate = weekDates[0].toISOString().split('T')[0];
      const endDate = weekDates[6].toISOString().split('T')[0];

      const [crewsData, assignmentsData] = await Promise.all([
        api.crewService.getAll(),
        api.crewAssignmentService.getSchedule({ startDate, endDate })
      ]);

      setCrews(crewsData.filter(c => c.isActive));
      setAssignments(assignmentsData);

      const detectedConflicts: { crewId: string; date: string; assignments: CrewAssignment[] }[] = [];
      const conflictMap = new Map<string, CrewAssignment[]>();

      assignmentsData.forEach(assignment => {
        const key = `${assignment.crewId}::${assignment.assignedDate}`;
        if (!conflictMap.has(key)) {
          conflictMap.set(key, []);
        }
        conflictMap.get(key)?.push(assignment);
      });

      conflictMap.forEach((assignmentList, key) => {
        if (assignmentList.length > 1) {
          const [crewId, date] = key.split('::');
          detectedConflicts.push({
            crewId,
            date,
            assignments: assignmentList
          });
        }
      });

      setConflicts(detectedConflicts);
    } catch (err: any) {
      console.error('Failed to load crew data:', err);
      setError(err.message || 'Failed to load crew data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const getAssignmentsForCrewAndDate = (crewId: string, date: Date): CrewAssignment[] => {
    const dateString = date.toISOString().split('T')[0];
    return assignments.filter(a => a.crewId === crewId && a.assignedDate === dateString);
  };

  const hasConflict = (crewId: string, date: Date): boolean => {
    const dateString = date.toISOString().split('T')[0];
    return conflicts.some(c => c.crewId === crewId && c.date === dateString && c.assignments.length > 1);
  };

  const getJobForAssignment = (assignment: CrewAssignment): Job | undefined => {
    return jobs.find(j => j.id === assignment.jobId);
  };

  const handleDropOnCrew = async (e: React.DragEvent<HTMLDivElement>, crewId: string, date: Date) => {
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.target as HTMLDivElement;
    const dropZone = target.closest('.crew-drop-zone');
    if (dropZone) dropZone.classList.remove('bg-brand-cyan-50', 'border-brand-cyan-400');

    const jobId = e.dataTransfer.getData('jobId');
    if (!jobId) return;

    const assignedDate = date.toISOString().split('T')[0];

    try {
      await api.crewAssignmentService.create({
        jobId,
        crewId,
        assignedDate
      });

      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.id === jobId ? { ...job, scheduledDate: assignedDate, status: 'Scheduled' as const } : job
        )
      );

      await loadData();
    } catch (err: any) {
      console.error('Failed to create crew assignment:', err);
      alert(`Failed to assign job to crew: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDragOverCrew = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnterCrew = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.target as HTMLDivElement;
    const dropZone = target.closest('.crew-drop-zone');
    if (dropZone) {
      dropZone.classList.add('bg-brand-cyan-50', 'border-brand-cyan-400');
    }
  };

  const handleDragLeaveCrew = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.target as HTMLDivElement;
    const dropZone = target.closest('.crew-drop-zone');
    if (dropZone && !dropZone.contains(e.relatedTarget as Node)) {
      dropZone.classList.remove('bg-brand-cyan-50', 'border-brand-cyan-400');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-cyan-600"></div>
          <p className="mt-4 text-brand-gray-600">Loading crew schedules...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">Error Loading Crew Data</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (crews.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-800 font-semibold mb-2">No Active Crews</p>
        <p className="text-yellow-600">Create crews in the Crews section to view crew schedules.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 bg-white shadow ring-1 ring-black ring-opacity-5 md:rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-brand-gray-200">
          <thead className="bg-brand-gray-50">
            <tr>
              <th className="sticky left-0 z-10 bg-brand-gray-50 px-4 py-3 text-left text-xs font-semibold text-brand-gray-700 uppercase tracking-wider border-r border-brand-gray-200">
                Crew
              </th>
              {weekDates.map((date, index) => {
                const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                return (
                  <th
                    key={index}
                    className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider ${
                      isToday ? 'bg-brand-cyan-50 text-brand-cyan-700' : 'text-brand-gray-700'
                    }`}
                  >
                    <div>{weekDays[index]}</div>
                    <div className={`text-sm ${isToday ? 'font-bold' : 'font-normal'}`}>
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-brand-gray-200">
            {crews.map((crew) => {
              const crewColor = getCrewColor(crew.id);
              
              return (
                <tr key={crew.id} className="hover:bg-brand-gray-50">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r border-brand-gray-200">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: crewColor }}
                      ></div>
                      <div>
                        <p className="font-semibold text-brand-gray-900">{crew.name}</p>
                        {crew.memberCount !== undefined && (
                          <p className="text-xs text-brand-gray-500">{crew.memberCount} members</p>
                        )}
                      </div>
                    </div>
                  </td>
                  {weekDates.map((date, dateIndex) => {
                    const dateAssignments = getAssignmentsForCrewAndDate(crew.id, date);
                    const hasConflictOnDate = hasConflict(crew.id, date);
                    const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];

                    return (
                      <td
                        key={dateIndex}
                        className={`px-2 py-2 ${isToday ? 'bg-brand-cyan-50' : ''}`}
                      >
                        <div
                          className="crew-drop-zone min-h-[80px] border-2 border-dashed border-brand-gray-200 rounded-md p-1 transition-colors"
                          onDragOver={handleDragOverCrew}
                          onDrop={(e) => handleDropOnCrew(e, crew.id, date)}
                          onDragEnter={handleDragEnterCrew}
                          onDragLeave={handleDragLeaveCrew}
                        >
                          <div className="space-y-1">
                            {dateAssignments.map((assignment) => {
                              const job = getJobForAssignment(assignment);
                              if (!job) return null;

                              return (
                                <div
                                  key={assignment.id}
                                  className="group relative"
                                  draggable="true"
                                  onDragStart={(e) => handleDragStart(e, job.id)}
                                  onDragEnd={handleDragEnd}
                                >
                                  <div
                                    className={`text-xs p-2 rounded cursor-move hover:shadow-md transition-all ${
                                      hasConflictOnDate 
                                        ? 'border-2 border-red-500 bg-red-50' 
                                        : 'border border-brand-gray-300'
                                    } ${draggedJobId === job.id ? 'opacity-50 scale-95' : ''}`}
                                    style={{
                                      backgroundColor: hasConflictOnDate ? undefined : `${crewColor}15`,
                                      borderColor: hasConflictOnDate ? undefined : crewColor
                                    }}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-brand-gray-900 truncate">{job.id}</p>
                                        <p className="text-brand-gray-600 truncate text-xs">{job.customerName}</p>
                                      </div>
                                      {hasConflictOnDate && (
                                        <span className="ml-1 text-red-600" title="Multiple assignments">
                                          ⚠️
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-xs -translate-x-1/2 transform rounded-lg bg-brand-gray-900 px-3 py-2 text-sm font-normal text-white opacity-0 shadow-lg transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
                                    <p className="font-bold text-white">{job.customerName}</p>
                                    <p className="text-brand-gray-300">
                                      <span className="font-semibold">Job:</span> {job.id}
                                    </p>
                                    <p className="text-brand-gray-300">
                                      <span className="font-semibold">Status:</span> {job.status}
                                    </p>
                                    {job.jobLocation && (
                                      <p className="text-brand-gray-300">
                                        <span className="font-semibold">Location:</span> {job.jobLocation}
                                      </p>
                                    )}
                                    {hasConflictOnDate && (
                                      <p className="text-red-400 font-semibold mt-1">
                                        ⚠️ Conflict: Multiple assignments on this date
                                      </p>
                                    )}
                                    <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-brand-gray-900"></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {conflicts.length > 0 && (
        <div className="border-t border-brand-gray-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800">
            <span className="font-semibold">⚠️ Scheduling Conflicts Detected:</span> {conflicts.length} crew(s) have multiple assignments on the same date.
          </p>
        </div>
      )}
    </div>
  );
};

export default CrewView;
