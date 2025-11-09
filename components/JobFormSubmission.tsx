import React, { useState, useEffect } from 'react';
import { JobForm, FormField } from '../types';
import { formService } from '../services/apiService';
import XIcon from './icons/XIcon';

interface JobFormSubmissionProps {
  isOpen: boolean;
  onClose: () => void;
  jobForm: JobForm;
  onUpdate: () => void;
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

const JobFormSubmission: React.FC<JobFormSubmissionProps> = ({ isOpen, onClose, jobForm, onUpdate }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [currentJobForm, setCurrentJobForm] = useState<JobForm>(jobForm);

  useEffect(() => {
    setCurrentJobForm(jobForm);
    setFormData(jobForm.formData || {});
    setValidationErrors({});
    setError(null);
  }, [jobForm]);

  const isReadOnly = currentJobForm.status === 'completed';

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    
    if (validationErrors[fieldId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validateRequiredFields = (): boolean => {
    const errors: Record<string, string> = {};
    
    currentJobForm.template?.fields.forEach(field => {
      if (field.required) {
        const value = formData[field.id];
        if (value === undefined || value === null || value === '') {
          errors[field.id] = 'This field is required';
        } else if (field.type === 'checkbox' && value !== true) {
          errors[field.id] = 'This field must be checked';
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProgress = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const updatedForm = await formService.submitFormData(currentJobForm.id, formData);
      setCurrentJobForm(updatedForm);
      onUpdate();
    } catch (err: any) {
      console.error('Error saving form:', err);
      setError(err.message || 'Failed to save form');
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!validateRequiredFields()) {
      setError('Please fill in all required fields before marking as complete');
      return;
    }

    setIsCompleting(true);
    setError(null);

    try {
      await formService.submitFormData(currentJobForm.id, formData);
      
      const completedForm = await formService.completeForm(currentJobForm.id);
      setCurrentJobForm(completedForm);
      onUpdate();
      
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Error completing form:', err);
      setError(err.message || 'Failed to complete form');
      setIsCompleting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.id];
    const hasError = !!validationErrors[field.id];

    const baseInputClass = `w-full px-3 py-2 bg-[#0a1628] border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed ${
      hasError ? 'border-red-500' : 'border-gray-700'
    }`;

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={isReadOnly}
            className={baseInputClass}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={isReadOnly}
            className={baseInputClass}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={isReadOnly}
            rows={4}
            className={baseInputClass}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              disabled={isReadOnly}
              className={`h-5 w-5 text-cyan-600 focus:ring-cyan-500 border-gray-600 rounded bg-[#0a1628] disabled:opacity-50 disabled:cursor-not-allowed ${
                hasError ? 'border-red-500' : ''
              }`}
            />
            <span className="ml-2 text-sm text-gray-400">
              {field.required ? 'Required' : 'Optional'}
            </span>
          </div>
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={isReadOnly}
            className={baseInputClass}
          >
            <option value="">-- Select an option --</option>
            {field.options?.map((option, idx) => (
              <option key={idx} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={isReadOnly}
            className={baseInputClass}
          />
        );

      case 'signature':
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              disabled={isReadOnly}
              className={baseInputClass}
              placeholder="Type your full name as signature"
            />
            <p className="text-xs text-gray-500">
              For MVP, please type your full name. Digital signature pad coming soon.
            </p>
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={isReadOnly}
            className={baseInputClass}
          />
        );
    }
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
        className="relative bg-[#0f1c2e] rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">
                {currentJobForm.template?.name || 'Form'}
              </h2>
              <span className={`inline-block px-3 py-1 rounded text-xs font-medium border ${statusColors[currentJobForm.status]}`}>
                {statusLabels[currentJobForm.status]}
              </span>
            </div>
            {currentJobForm.template?.description && (
              <p className="text-gray-400 text-sm mt-2">{currentJobForm.template.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            type="button"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          {error && (
            <div className="mb-6 bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {currentJobForm.status === 'completed' && currentJobForm.completedAt && (
            <div className="mb-6 bg-green-900/30 border border-green-500 text-green-200 px-4 py-3 rounded">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">
                  Completed on {new Date(currentJobForm.completedAt).toLocaleString()}
                </span>
              </div>
              {currentJobForm.completedBy && (
                <p className="text-sm mt-1">By: {currentJobForm.completedBy}</p>
              )}
            </div>
          )}

          <div className="space-y-6">
            {currentJobForm.template?.fields.map((field) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                {renderField(field)}
                {validationErrors[field.id] && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors[field.id]}</p>
                )}
              </div>
            ))}

            {currentJobForm.template?.requireSignature && (
              <div className="pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-2">
                  <svg className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Signature is required for this form
                </p>
              </div>
            )}

            {currentJobForm.template?.requirePhotos && currentJobForm.template.requirePhotos > 0 && (
              <div className="pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400">
                  <svg className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {currentJobForm.template.requirePhotos} photo(s) required (photo upload coming soon)
                </p>
              </div>
            )}
          </div>
        </div>

        {!isReadOnly && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700 bg-[#0a1628]">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              disabled={isSaving || isCompleting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveProgress}
              disabled={isSaving || isCompleting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Save Progress
            </button>
            <button
              type="button"
              onClick={handleComplete}
              disabled={isSaving || isCompleting}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isCompleting && (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Mark Complete
            </button>
          </div>
        )}

        {isReadOnly && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700 bg-[#0a1628]">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobFormSubmission;
