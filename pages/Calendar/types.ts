import React from 'react';
import { Job, Employee } from '../../types';

export type CalendarView = 'day' | '3-day' | 'week' | 'month' | 'list' | 'map' | 'crew';

export interface CalendarViewProps {
  jobs: Job[];
  employees: Employee[];
  currentDate: Date;
  statusFilter: string;
  employeeFilter: string;
  filteredJobs: Job[];
  jobsByDate: Map<string, Job[]>;
  onDateChange: (date: Date) => void;
  onJobDrop: (jobId: string, newDate: string) => void;
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
}

export interface DragHandlers {
  handleDragStart: (e: React.DragEvent<HTMLDivElement>, jobId: string) => void;
  handleDragEnd: () => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>, date: Date | null) => void;
  draggedJobId: string | null;
}
