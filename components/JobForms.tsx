import React, { useState, useEffect } from 'react';
import { JobForm, FormTemplate } from '../types';
import { formService } from '../services/apiService';
import SpinnerIcon from './icons/SpinnerIcon';
import JobFormSubmission from './JobFormSubmission';

interface JobFormsProps {
  jobId: string;
}

const statusColors = {
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  in_progress: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  completed: 'bg-green-500/20 text-green-300 border-green-500/30',
};

const statusLabels = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

const JobForms: React.FC<JobFormsProps> = ({ jobId }) => {
  const [jobForms, setJobForms] = useState<JobForm[]>([]);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [selectedForm, setSelectedForm] = useState<JobForm | null>(null);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);

  useEffect(() => {
    fetchJobForms();
    fetchTemplates();
  }, [jobId]);

  const fetchJobForms = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await formService.getJobForms(jobId);
      setJobForms(data);
    } catch (err: any) {
      console.error('Error fetching job forms:', err);
      setError(err.message || 'Failed to load job forms');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const data = await formService.getTemplates();
      setTemplates(data.filter(t => t.isActive));
    } catch (err: any) {
      console.error('Error fetching templates:', err);
    }
  };

  const handleAttachForm = async (templateId: string) => {
    setIsAttaching(true);
    setShowTemplateDropdown(false);
    try {
      await formService.attachFormToJob(jobId, templateId);
      await fetchJobForms();
    } catch (err: any) {
      console.error('Error attaching form:', err);
      alert(err.message || 'Failed to attach form');
    } finally {
      setIsAttaching(false);
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!window.confirm('Are you sure you want to delete this form?')) {
      return;
    }

    try {
      await formService.deleteJobForm(formId);
      await fetchJobForms();
    } catch (err: any) {
      console.error('Error deleting form:', err);
      alert(err.message || 'Failed to delete form');
    }
  };

  const handleOpenForm = (form: JobForm) => {
    setSelectedForm(form);
    setIsSubmissionModalOpen(true);
  };

  const handleFormUpdated = async () => {
    await fetchJobForms();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <SpinnerIcon className="h-8 w-8 text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Job Forms</h3>
        <div className="relative">
          <button
            onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
            disabled={isAttaching}
            className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {isAttaching ? (
              <>
                <SpinnerIcon className="h-4 w-4" />
                Attaching...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Attach Form
              </>
            )}
          </button>

          {showTemplateDropdown && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowTemplateDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-[#0f1c2e] border border-gray-700 rounded-md shadow-xl z-20 max-h-64 overflow-y-auto">
                {templates.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400">
                    No active templates available
                  </div>
                ) : (
                  templates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleAttachForm(template.id)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors text-sm border-b border-gray-700 last:border-b-0"
                    >
                      <div className="font-medium text-white">{template.name}</div>
                      <div className="text-xs text-gray-400 capitalize">{template.category}</div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {jobForms.length === 0 ? (
        <div className="text-center py-8 bg-[#0a1628] border border-gray-700 rounded-md">
          <svg className="h-12 w-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-400 text-sm">No forms attached to this job yet</p>
          <p className="text-gray-500 text-xs mt-1">Click "Attach Form" to add one</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobForms.map(form => (
            <div
              key={form.id}
              className="bg-[#0a1628] border border-gray-700 rounded-md p-4 hover:border-cyan-500/50 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 cursor-pointer" onClick={() => handleOpenForm(form)}>
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-white">
                      {form.template?.name || 'Unknown Template'}
                    </h4>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${statusColors[form.status]}`}>
                      {statusLabels[form.status]}
                    </span>
                  </div>
                  
                  {form.template?.description && (
                    <p className="text-sm text-gray-400 mb-2">{form.template.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{form.template?.fields.length || 0} fields</span>
                    {form.completedAt && (
                      <span>Completed: {new Date(form.completedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteForm(form.id);
                  }}
                  className="text-red-400 hover:text-red-300 p-1"
                  title="Delete form"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isSubmissionModalOpen && selectedForm && (
        <JobFormSubmission
          isOpen={isSubmissionModalOpen}
          onClose={() => {
            setIsSubmissionModalOpen(false);
            setSelectedForm(null);
          }}
          jobForm={selectedForm}
          onUpdate={handleFormUpdated}
        />
      )}
    </div>
  );
};

export default JobForms;
