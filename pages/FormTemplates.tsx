import React, { useState, useEffect } from 'react';
import { FormTemplate } from '../types';
import { formService } from '../services/apiService';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import ClipboardDocumentListIcon from '../components/icons/ClipboardDocumentListIcon';
import FormTemplateEditor from '../components/FormTemplateEditor';

const categoryColors: Record<string, string> = {
  safety: 'bg-red-500/20 text-red-300 border-red-500/30',
  inspection: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  equipment: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  approval: 'bg-green-500/20 text-green-300 border-green-500/30',
  completion: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  custom: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

const FormTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<FormTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | undefined>(undefined);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, selectedCategory, searchQuery]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await formService.getTemplates();
      setTemplates(data);
    } catch (err: any) {
      console.error('Error fetching form templates:', err);
      setError(err.message || 'Failed to load form templates');
    } finally {
      setIsLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t => t.name.toLowerCase().includes(query) || t.description.toLowerCase().includes(query)
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleCreateNew = () => {
    setEditingTemplate(undefined);
    setIsEditorOpen(true);
  };

  const handleEdit = (template: FormTemplate) => {
    setEditingTemplate(template);
    setIsEditorOpen(true);
  };

  const handleDelete = async (templateId: string) => {
    if (!window.confirm('Are you sure you want to delete this form template? This action cannot be undone.')) {
      return;
    }

    setDeletingTemplateId(templateId);
    try {
      await formService.deleteTemplate(templateId);
      await fetchTemplates();
    } catch (err: any) {
      console.error('Error deleting template:', err);
      alert(err.message || 'Failed to delete template');
    } finally {
      setDeletingTemplateId(null);
    }
  };

  const handleSaveTemplate = async () => {
    await fetchTemplates();
  };

  const handleSeedTemplates = async () => {
    setIsSeeding(true);
    setSeedMessage(null);
    try {
      const result = await formService.seedTemplates();
      setSeedMessage(result.message);
      await fetchTemplates();
      setTimeout(() => setSeedMessage(null), 5000);
    } catch (err: any) {
      console.error('Error seeding templates:', err);
      setSeedMessage(err.message || 'Failed to load sample templates');
    } finally {
      setIsSeeding(false);
    }
  };

  const categories = ['all', 'safety', 'inspection', 'equipment', 'approval', 'completion', 'custom'];

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
            <ClipboardDocumentListIcon className="h-8 w-8 text-cyan-500" />
            Form Templates
          </h1>
          <p className="text-gray-400 mt-2">Manage job form templates for inspections, approvals, and documentation</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSeedTemplates}
            disabled={isSeeding}
            className="px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-lg disabled:opacity-50"
          >
            {isSeeding ? (
              <SpinnerIcon className="h-5 w-5" />
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            )}
            Load Sample Templates
          </button>
          <button
            onClick={handleCreateNew}
            className="px-6 py-3 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors flex items-center gap-2 shadow-lg"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Template
          </button>
        </div>
      </div>

      {seedMessage && (
        <div className={`mb-4 px-4 py-3 rounded-md ${seedMessage.includes('Failed') ? 'bg-red-900/30 border border-red-500 text-red-200' : 'bg-green-900/30 border border-green-500 text-green-200'}`}>
          {seedMessage}
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-[#0f1c2e] border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-md capitalize transition-colors ${
                selectedCategory === cat
                  ? 'bg-cyan-600 text-white'
                  : 'bg-[#0f1c2e] text-gray-400 hover:bg-gray-700 border border-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardDocumentListIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            {searchQuery || selectedCategory !== 'all' ? 'No templates match your filters' : 'No form templates yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchQuery || selectedCategory !== 'all'
              ? 'Try adjusting your search or category filter'
              : 'Get started by loading sample templates or creating your own'}
          </p>
          {!searchQuery && selectedCategory === 'all' && (
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleSeedTemplates}
                disabled={isSeeding}
                className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isSeeding ? (
                  <SpinnerIcon className="h-5 w-5" />
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                )}
                Load Sample Templates
              </button>
              <button
                onClick={handleCreateNew}
                className="px-6 py-3 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
              >
                Create New Template
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-[#0f1c2e] border border-gray-700 rounded-lg p-6 hover:border-cyan-500/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">{template.name}</h3>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium border capitalize ${categoryColors[template.category] || categoryColors.custom}`}>
                    {template.category}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(template)}
                    className="text-cyan-400 hover:text-cyan-300 p-1"
                    title="Edit template"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    disabled={deletingTemplateId === template.id}
                    className="text-red-400 hover:text-red-300 p-1 disabled:opacity-50"
                    title="Delete template"
                  >
                    {deletingTemplateId === template.id ? (
                      <SpinnerIcon className="h-5 w-5" />
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <p className="text-gray-400 text-sm mb-4 line-clamp-2">{template.description}</p>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <svg className="h-4 w-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>{template.fields.length} fields</span>
                </div>
                
                {template.requireSignature && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <svg className="h-4 w-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>Signature required</span>
                  </div>
                )}

                {template.requirePhotos && template.requirePhotos > 0 && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <svg className="h-4 w-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{template.requirePhotos} photos required</span>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-700 text-xs text-gray-500">
                  {template.fields.filter(f => f.required).length} required fields
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isEditorOpen && (
        <FormTemplateEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleSaveTemplate}
          template={editingTemplate}
        />
      )}
    </div>
  );
};

export default FormTemplates;
