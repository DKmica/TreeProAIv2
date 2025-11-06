
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Job } from '../../types';
import JobIcon from '../../components/icons/JobIcon';

interface CrewDashboardProps {
  jobs: Job[];
}

const CrewDashboard: React.FC<CrewDashboardProps> = ({ jobs }) => {
  // Simulate logged-in user ID. In a real app, this would come from an auth context.
  const currentUserId = 'emp1'; // Mike Miller

  const today = new Date().toISOString().split('T')[0];

  const todaysJobs = useMemo(() => {
    return jobs.filter(job => 
      job.scheduledDate === today && 
      job.assignedCrew.includes(currentUserId) &&
      job.status !== 'Completed' &&
      job.status !== 'Cancelled'
    ).sort((a, b) => a.status === 'In Progress' ? -1 : 1); // Show "In Progress" first
  }, [jobs, today, currentUserId]);

  const getStatusClasses = (status: Job['status']) => {
    switch (status) {
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-gray-900">Today's Jobs</h1>
      <p className="mt-1 text-brand-gray-600">Jobs assigned to you for {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      
      <div className="mt-6 space-y-4">
        {todaysJobs.length > 0 ? (
          todaysJobs.map(job => (
            <Link key={job.id} to={`/crew/job/${job.id}`} className="block bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow active:scale-[0.98]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-lg text-brand-gray-800">{job.customerName}</p>
                  <p className="text-sm text-brand-gray-500 flex items-center mt-1">
                    <JobIcon className="w-4 h-4 mr-1.5 text-brand-gray-400" />
                    Job ID: {job.id}
                  </p>
                </div>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold border ${getStatusClasses(job.status)}`}>
                  {job.status}
                </span>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <JobIcon className="mx-auto h-12 w-12 text-brand-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-brand-gray-900">No Jobs Scheduled for Today</h3>
            <p className="mt-1 text-sm text-brand-gray-500">Check back later or enjoy your day off!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrewDashboard;
