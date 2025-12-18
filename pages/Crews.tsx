import React, { useState, useEffect } from 'react';
import { Crew } from '../types';
import { crewService } from '../services/apiService';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import UsersIcon from '../components/icons/UsersIcon';
import CrewEditor from '../components/CrewEditor';
import CrewMemberManager from '../components/CrewMemberManager';

const Crews: React.FC = () => {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCrewEditorOpen, setIsCrewEditorOpen] = useState(false);
  const [editingCrew, setEditingCrew] = useState<Crew | undefined>(undefined);
  const [managingCrew, setManagingCrew] = useState<Crew | undefined>(undefined);
  const [deletingCrewId, setDeletingCrewId] = useState<string | null>(null);

  useEffect(() => {
    fetchCrews();
  }, []);

  const fetchCrews = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const crewsData = await crewService.getAll();
      setCrews(crewsData);
    } catch (err: any) {
      console.error('Error fetching crews:', err);
      setError(err.message || 'Failed to load crews');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingCrew(undefined);
    setIsCrewEditorOpen(true);
  };

  const handleEdit = (crew: Crew) => {
    setEditingCrew(crew);
    setIsCrewEditorOpen(true);
  };

  const handleManageMembers = (crew: Crew) => {
    setManagingCrew(crew);
  };

  const handleDelete = async (crewId: string) => {
    if (!window.confirm('Are you sure you want to delete this crew? This action cannot be undone.')) {
      return;
    }

    setDeletingCrewId(crewId);
    try {
      await crewService.remove(crewId);
      await fetchCrews();
    } catch (err: any) {
      console.error('Error deleting crew:', err);
      alert(err.message || 'Failed to delete crew');
    } finally {
      setDeletingCrewId(null);
    }
  };

  const handleSaveCrew = async (crew: Crew) => {
    await fetchCrews();
  };

  const getCapacityUtilization = (crew: Crew) => {
    if (!crew.capacity) return 0;
    const assignments = crew.assignmentCount || 0;
    return Math.min(100, Math.round((assignments / crew.capacity) * 100));
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-red-400';
    if (utilization >= 70) return 'text-yellow-400';
    return 'text-green-400';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SpinnerIcon className="h-12 w-12 text-cyan-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <UsersIcon className="h-8 w-8 text-cyan-500" />
            Crews
          </h1>
          <p className="text-gray-400 mt-2">Manage your work crews and team assignments</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="px-6 py-3 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors flex items-center gap-2 shadow-lg"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Crew
        </button>
      </div>

      {crews.length === 0 ? (
        <div className="text-center py-16">
          <UsersIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No crews yet</h3>
          <p className="text-gray-500 mb-6">Get started by creating your first crew</p>
          <button
            onClick={handleCreateNew}
            className="px-6 py-3 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
          >
            Create New Crew
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {crews.map((crew) => {
            const utilization = getCapacityUtilization(crew);
            
            return (
              <div
                key={crew.id}
                className="bg-[#0f1c2e] border border-gray-700 rounded-lg p-6 hover:border-cyan-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-1">{crew.name}</h3>
                    {crew.description && (
                      <p className="text-gray-400 text-sm line-clamp-2">{crew.description}</p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      crew.isActive
                        ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                        : 'bg-gray-700 text-gray-400 border border-gray-600'
                    }`}
                  >
                    {crew.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Members:</span>
                    <span className="text-white font-medium">{crew.memberCount || 0}</span>
                  </div>

                  {crew.capacity && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Capacity:</span>
                        <span className={`font-medium ${getUtilizationColor(utilization)}`}>
                          {utilization}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            utilization >= 90
                              ? 'bg-red-500'
                              : utilization >= 70
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${utilization}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        {crew.assignmentCount || 0} / {crew.capacity} jobs
                      </div>
                    </div>
                  )}

                  {crew.defaultStartTime && crew.defaultEndTime && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Schedule:</span>
                      <span className="text-white">
                        {crew.defaultStartTime} - {crew.defaultEndTime}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => handleEdit(crew)}
                    className="flex-1 px-3 py-2 bg-gray-700 text-white text-sm rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleManageMembers(crew)}
                    className="flex-1 px-3 py-2 bg-cyan-600 text-white text-sm rounded-md hover:bg-cyan-700 transition-colors"
                  >
                    Members
                  </button>
                  <button
                    onClick={() => handleDelete(crew.id)}
                    disabled={deletingCrewId === crew.id}
                    className="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingCrewId === crew.id ? (
                      <SpinnerIcon className="h-4 w-4" />
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CrewEditor
        isOpen={isCrewEditorOpen}
        onClose={() => {
          setIsCrewEditorOpen(false);
          setEditingCrew(undefined);
        }}
        onSave={handleSaveCrew}
        crew={editingCrew}
      />

      {managingCrew && (
        <CrewMemberManager
          crew={managingCrew}
          isOpen={!!managingCrew}
          onClose={() => setManagingCrew(undefined)}
        />
      )}
    </div>
  );
};

export default Crews;
