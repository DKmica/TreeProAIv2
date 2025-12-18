import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { JobTemplate } from '../types';
import { jobTemplateService } from '../services/apiService';
import JobTemplateEditor from '../components/JobTemplateEditor';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import DocumentTextIcon from '../components/icons/DocumentTextIcon';

const JobTemplates: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | undefined>(undefined);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const categories = ['all', 'Removal', 'Pruning', 'Emergency', 'Maintenance', 'Stump Grinding', 'Other'];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await jobTemplateService.getAll();
      setTemplates(data);
    } catch (err: any) {
      console.error('Failed to load templates:', err);
      setError(err.message || 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(term) ||
        (t.description && t.description.toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [templates, selectedCategory, searchTerm]);

  const mostUsedTemplates = useMemo(() => {
    return [...templates]
      .filter(t => t.usageCount > 0)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);
  }, [templates]);

  const handleCreateNew = () => {
    setEditingTemplateId(undefined);
    setIsEditorOpen(true);
  };

  const handleEdit = (templateId: string) => {
    setEditingTemplateId(templateId);
    setIsEditorOpen(true);
  };

  const handleDelete = async (templateId: string) => {
    try {
      await jobTemplateService.remove(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error('Failed to delete template:', err);
      alert(`Failed to delete template: ${err.message}`);
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    try {
      await jobTemplateService.useTemplate(templateId);
      navigate('/jobs');
    } catch (err: any) {
      console.error('Failed to use template:', err);
      alert(`Failed to create job from template: ${err.message}`);
    }
  };

  const handleEditorSaved = () => {
    loadTemplates();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        <span className="ml-3 text-gray-300 text-lg">Loading templates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <DocumentTextIcon className="h-8 w-8 text-cyan-500" />
            Job Templates
          </h1>
          <p className="mt-1 text-gray-400">Create and manage reusable job templates</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
        >
          <PlusCircleIcon className="h-5 w-5" />
          Create New Template
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {mostUsedTemplates.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Most Used Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {mostUsedTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleUseTemplate(template.id)}
                className="text-left p-4 bg-gray-750 border border-gray-600 rounded-lg hover:border-cyan-500 hover:bg-gray-700 transition-colors"
              >
                <h3 className="font-semibold text-white mb-1 truncate">{template.name}</h3>
                <p className="text-sm text-gray-400">Used {template.usageCount} times</p>
                {template.basePrice && (
                  <p className="text-sm text-cyan-400 mt-1">${Number(template.basePrice).toFixed(2)}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
        />
        <div className="flex gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-md whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <DocumentTextIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">
            {templates.length === 0
              ? 'No templates yet. Create your first template to get started!'
              : 'No templates match your search criteria'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:border-cyan-500 transition-colors"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-semibold text-white">{template.name}</h3>
                  {template.category && (
                    <span className="px-2 py-1 text-xs bg-cyan-900/30 text-cyan-300 rounded">
                      {template.category}
                    </span>
                  )}
                </div>

                {template.description && (
                  <p className="text-gray-400 mb-4 line-clamp-2">{template.description}</p>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  {template.basePrice && (
                    <div>
                      <span className="text-gray-500">Base Price:</span>
                      <p className="text-white font-medium">${Number(template.basePrice).toFixed(2)}</p>
                    </div>
                  )}
                  {template.pricePerHour && (
                    <div>
                      <span className="text-gray-500">Per Hour:</span>
                      <p className="text-white font-medium">${Number(template.pricePerHour).toFixed(2)}/h</p>
                    </div>
                  )}
                  {template.defaultDurationHours && (
                    <div>
                      <span className="text-gray-500">Duration:</span>
                      <p className="text-white font-medium">{template.defaultDurationHours} hours</p>
                    </div>
                  )}
                  {template.defaultCrewSize && (
                    <div>
                      <span className="text-gray-500">Crew Size:</span>
                      <p className="text-white font-medium">{template.defaultCrewSize} people</p>
                    </div>
                  )}
                </div>

                {(template.permitRequired || template.jhaRequired || template.depositRequired) && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {template.permitRequired && (
                      <span className="px-2 py-1 text-xs bg-yellow-900/30 text-yellow-300 rounded">
                        Permit Required
                      </span>
                    )}
                    {template.jhaRequired && (
                      <span className="px-2 py-1 text-xs bg-orange-900/30 text-orange-300 rounded">
                        JHA Required
                      </span>
                    )}
                    {template.depositRequired && (
                      <span className="px-2 py-1 text-xs bg-green-900/30 text-green-300 rounded">
                        Deposit {template.depositPercentage}%
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>Used {template.usageCount} times</span>
                  {template.lastUsedAt && (
                    <span>Last: {new Date(template.lastUsedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-700 bg-gray-750 px-6 py-3 flex gap-2">
                <button
                  onClick={() => handleUseTemplate(template.id)}
                  className="flex-1 px-3 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors text-sm font-medium"
                >
                  Use Template
                </button>
                <button
                  onClick={() => handleEdit(template.id)}
                  className="px-3 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Edit
                </button>
                {deleteConfirmId === template.id ? (
                  <>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-3 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(template.id)}
                    className="px-3 py-2 border border-red-600 text-red-400 rounded-md hover:bg-red-900/30 transition-colors text-sm font-medium"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <JobTemplateEditor
        templateId={editingTemplateId}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSaved={handleEditorSaved}
      />
    </div>
  );
};

export default JobTemplates;
