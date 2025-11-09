import React, { useState, useEffect } from 'react';
import { JobTemplate, Job } from '../types';
import { jobTemplateService } from '../services/apiService';
import XIcon from './icons/XIcon';

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: string, overrideData?: Partial<Job>) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ isOpen, onClose, onSelect }) => {
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<JobTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['all', 'Removal', 'Pruning', 'Emergency', 'Maintenance', 'Stump Grinding', 'Other'];

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  useEffect(() => {
    filterTemplates();
  }, [templates, selectedCategory, searchTerm]);

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

  const filterTemplates = () => {
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

    setFilteredTemplates(filtered);
  };

  const handleTemplateSelect = (template: JobTemplate) => {
    onSelect(template.id);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={handleOverlayClick}
    >
      <div
        className="relative bg-[#0f1c2e] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Select a Template</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            type="button"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="overflow-y-auto max-h-[60vh]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                <span className="ml-3 text-gray-400">Loading templates...</span>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                {templates.length === 0 ? 'No templates available' : 'No templates match your search'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="text-left p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-cyan-500 hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-white">{template.name}</h3>
                      {template.category && (
                        <span className="px-2 py-1 text-xs bg-cyan-900/30 text-cyan-300 rounded">
                          {template.category}
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-400 mb-3 line-clamp-2">{template.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {template.basePrice && (
                        <div className="text-gray-300">
                          <span className="text-gray-500">Base: </span>${template.basePrice.toFixed(2)}
                        </div>
                      )}
                      {template.defaultDurationHours && (
                        <div className="text-gray-300">
                          <span className="text-gray-500">Duration: </span>{template.defaultDurationHours}h
                        </div>
                      )}
                      {template.defaultCrewSize && (
                        <div className="text-gray-300">
                          <span className="text-gray-500">Crew: </span>{template.defaultCrewSize} people
                        </div>
                      )}
                      {template.usageCount > 0 && (
                        <div className="text-gray-300">
                          <span className="text-gray-500">Used: </span>{template.usageCount} times
                        </div>
                      )}
                    </div>
                    {(template.permitRequired || template.jhaRequired || template.depositRequired) && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {template.permitRequired && (
                          <span className="px-2 py-0.5 text-xs bg-yellow-900/30 text-yellow-300 rounded">
                            Permit Required
                          </span>
                        )}
                        {template.jhaRequired && (
                          <span className="px-2 py-0.5 text-xs bg-orange-900/30 text-orange-300 rounded">
                            JHA Required
                          </span>
                        )}
                        {template.depositRequired && (
                          <span className="px-2 py-0.5 text-xs bg-green-900/30 text-green-300 rounded">
                            Deposit Required
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-700 bg-[#0a1421]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelector;
