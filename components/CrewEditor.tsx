import React, { useState, useEffect } from 'react';
import { Crew } from '../types';
import { crewService } from '../services/apiService';
import XIcon from './icons/XIcon';

interface CrewEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (crew: Crew) => void;
  crew?: Crew;
}

interface FormData {
  name: string;
  description: string;
  isActive: boolean;
  defaultStartTime: string;
  defaultEndTime: string;
  capacity: string;
}

interface FormErrors {
  name?: string;
  capacity?: string;
  time?: string;
}

const CrewEditor: React.FC<CrewEditorProps> = ({ isOpen, onClose, onSave, crew }) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    isActive: true,
    defaultStartTime: '08:00',
    defaultEndTime: '17:00',
    capacity: '5',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (crew) {
      setFormData({
        name: crew.name || '',
        description: crew.description || '',
        isActive: crew.isActive ?? true,
        defaultStartTime: crew.defaultStartTime || '08:00',
        defaultEndTime: crew.defaultEndTime || '17:00',
        capacity: crew.capacity ? crew.capacity.toString() : '5',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        isActive: true,
        defaultStartTime: '08:00',
        defaultEndTime: '17:00',
        capacity: '5',
      });
    }
    setErrors({});
    setApiError(null);
  }, [crew, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Crew name is required';
    }

    const capacity = parseInt(formData.capacity);
    if (isNaN(capacity) || capacity <= 0) {
      newErrors.capacity = 'Capacity must be greater than 0';
    }

    const startTime = formData.defaultStartTime;
    const endTime = formData.defaultEndTime;
    if (startTime && endTime && startTime >= endTime) {
      newErrors.time = 'End time must be after start time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      const crewData: Partial<Crew> = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
        defaultStartTime: formData.defaultStartTime || undefined,
        defaultEndTime: formData.defaultEndTime || undefined,
        capacity: parseInt(formData.capacity),
      };

      let savedCrew: Crew;
      if (crew) {
        savedCrew = await crewService.update(crew.id, crewData);
      } else {
        savedCrew = await crewService.create(crewData);
      }

      onSave(savedCrew);
      onClose();
    } catch (err: any) {
      console.error('Error saving crew:', err);
      setApiError(err.message || 'Failed to save crew');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const isFormValid = () => {
    if (!formData.name.trim()) return false;
    const capacity = parseInt(formData.capacity);
    if (isNaN(capacity) || capacity <= 0) return false;
    if (formData.defaultStartTime && formData.defaultEndTime && formData.defaultStartTime >= formData.defaultEndTime) return false;
    return true;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={handleOverlayClick}
    >
      <div
        className="relative bg-[#0f1c2e] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">
            {crew ? 'Edit Crew' : 'Create New Crew'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            type="button"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="p-6 space-y-6">
            {apiError && (
              <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded">
                {apiError}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                Crew Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                placeholder="Enter crew name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-400">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                placeholder="Enter crew description..."
              />
            </div>

            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="mr-2 text-cyan-500 focus:ring-cyan-500 rounded"
                />
                <span className="text-gray-200">Active</span>
              </label>
            </div>

            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Default Schedule</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="defaultStartTime" className="block text-sm font-medium text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    id="defaultStartTime"
                    name="defaultStartTime"
                    value={formData.defaultStartTime}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label htmlFor="defaultEndTime" className="block text-sm font-medium text-gray-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    id="defaultEndTime"
                    name="defaultEndTime"
                    value={formData.defaultEndTime}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>
              {errors.time && (
                <p className="mt-2 text-sm text-red-400">{errors.time}</p>
              )}
            </div>

            <div>
              <label htmlFor="capacity" className="block text-sm font-medium text-gray-300 mb-1">
                Capacity (jobs per day) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                id="capacity"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                min="1"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                placeholder="5"
              />
              {errors.capacity && (
                <p className="mt-1 text-sm text-red-400">{errors.capacity}</p>
              )}
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-700 bg-[#0a1421]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading || !isFormValid()}
            className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              crew ? 'Update Crew' : 'Create Crew'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrewEditor;
