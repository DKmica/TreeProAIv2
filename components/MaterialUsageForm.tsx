import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Beaker, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import type { JobMaterial, MaterialInventory, Employee } from '../types';

interface JobMaterialWithEmployee extends JobMaterial {
  employeeName?: string;
}

interface MaterialUsageFormProps {
  jobId: string;
  materials: JobMaterialWithEmployee[];
  employees: Employee[];
  onAddMaterial: (material: Partial<JobMaterial>) => Promise<void>;
  onUpdateMaterial: (id: string, material: Partial<JobMaterial>) => Promise<void>;
  onDeleteMaterial: (id: string) => Promise<void>;
  isLoading?: boolean;
}

const APPLICATION_METHODS = [
  'Foliar Spray',
  'Trunk Injection',
  'Soil Drench',
  'Basal Bark',
  'Root Flare Injection',
  'Broadcast',
  'Spot Treatment',
  'Other'
];

const UNITS = [
  'oz',
  'fl oz',
  'gal',
  'lb',
  'g',
  'ml',
  'L',
  'pt',
  'qt'
];

const PPE_OPTIONS = [
  'Chemical-resistant gloves',
  'Safety glasses',
  'Face shield',
  'Respirator',
  'Chemical-resistant coveralls',
  'Rubber boots',
  'Protective apron',
  'Hard hat'
];

export default function MaterialUsageForm({
  jobId,
  materials,
  employees,
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
  isLoading = false
}: MaterialUsageFormProps) {
  const [isExpanded, setIsExpanded] = useState(materials.length > 0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [inventory, setInventory] = useState<MaterialInventory[]>([]);
  const [formData, setFormData] = useState<Partial<JobMaterial>>({
    materialName: '',
    quantityUsed: undefined,
    unit: 'oz',
    epaRegNumber: '',
    applicationMethod: '',
    applicationRate: '',
    targetPestOrCondition: '',
    appliedBy: '',
    appliedAt: new Date().toISOString().slice(0, 16),
    weatherConditions: '',
    windSpeedMph: undefined,
    temperatureF: undefined,
    ppeUsed: [],
    reiHours: undefined,
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/material-inventory');
      const data = await response.json();
      if (data.success) {
        setInventory(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch material inventory:', error);
    }
  };

  const handleInventorySelect = (mat: MaterialInventory) => {
    setFormData(prev => ({
      ...prev,
      materialName: mat.materialName,
      epaRegNumber: mat.epaRegNumber || '',
      unit: mat.defaultUnit || prev.unit,
      applicationMethod: mat.defaultApplicationMethod || '',
      applicationRate: mat.defaultApplicationRate || '',
      reiHours: mat.defaultReiHours || undefined,
      ppeUsed: mat.requiredPpe || []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.materialName) return;

    setSubmitting(true);
    try {
      await onAddMaterial({
        ...formData,
        jobId
      });
      setFormData({
        materialName: '',
        quantityUsed: undefined,
        unit: 'oz',
        epaRegNumber: '',
        applicationMethod: '',
        applicationRate: '',
        targetPestOrCondition: '',
        appliedBy: '',
        appliedAt: new Date().toISOString().slice(0, 16),
        weatherConditions: '',
        windSpeedMph: undefined,
        temperatureF: undefined,
        ppeUsed: [],
        reiHours: undefined,
        notes: ''
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add material:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePpeToggle = (ppe: string) => {
    setFormData(prev => ({
      ...prev,
      ppeUsed: prev.ppeUsed?.includes(ppe)
        ? prev.ppeUsed.filter(p => p !== ppe)
        : [...(prev.ppeUsed || []), ppe]
    }));
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-750"
      >
        <div className="flex items-center gap-3">
          <Beaker className="w-5 h-5 text-green-500" />
          <span className="font-medium text-white">Chemical/Material Usage (PHC)</span>
          {materials.length > 0 && (
            <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
              {materials.length} recorded
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          {materials.length > 0 && (
            <div className="space-y-2">
              {materials.map((material) => (
                <div
                  key={material.id}
                  className="bg-gray-750 rounded-lg p-3 border border-gray-600"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{material.materialName}</span>
                        {material.epaRegNumber && (
                          <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">
                            EPA# {material.epaRegNumber}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-400 space-y-0.5">
                        {material.quantityUsed && (
                          <div>Amount: {material.quantityUsed} {material.unit}</div>
                        )}
                        {material.applicationMethod && (
                          <div>Method: {material.applicationMethod}</div>
                        )}
                        {material.employeeName && (
                          <div>Applied by: {material.employeeName}</div>
                        )}
                        {material.reiHours && (
                          <div className="flex items-center gap-1 text-yellow-400">
                            <AlertTriangle className="w-3 h-3" />
                            REI: {material.reiHours} hours
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteMaterial(material.id)}
                      className="p-1 text-red-400 hover:text-red-300"
                      disabled={isLoading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!showAddForm ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 text-green-400 hover:text-green-300 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Material/Chemical
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 bg-gray-750 rounded-lg p-4 border border-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Material Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.materialName}
                      onChange={(e) => setFormData(prev => ({ ...prev, materialName: e.target.value }))}
                      className="input-light w-full"
                      placeholder="Enter or select material"
                      list="material-suggestions"
                      required
                    />
                    <datalist id="material-suggestions">
                      {inventory.map((mat) => (
                        <option key={mat.id} value={mat.materialName} />
                      ))}
                    </datalist>
                  </div>
                  {inventory.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {inventory.slice(0, 5).map((mat) => (
                        <button
                          key={mat.id}
                          type="button"
                          onClick={() => handleInventorySelect(mat)}
                          className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded"
                        >
                          {mat.materialName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Quantity Used
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.quantityUsed || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantityUsed: e.target.value ? parseFloat(e.target.value) : undefined }))}
                      className="input-light flex-1"
                      placeholder="0.00"
                    />
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                      className="select-light w-24"
                    >
                      {UNITS.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    EPA Registration #
                  </label>
                  <input
                    type="text"
                    value={formData.epaRegNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, epaRegNumber: e.target.value }))}
                    className="input-light w-full"
                    placeholder="e.g., 12345-67"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Application Method
                  </label>
                  <select
                    value={formData.applicationMethod}
                    onChange={(e) => setFormData(prev => ({ ...prev, applicationMethod: e.target.value }))}
                    className="select-light w-full"
                  >
                    <option value="">Select method...</option>
                    {APPLICATION_METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Application Rate
                  </label>
                  <input
                    type="text"
                    value={formData.applicationRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, applicationRate: e.target.value }))}
                    className="input-light w-full"
                    placeholder="e.g., 2 oz/gal"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Target Pest/Condition
                  </label>
                  <input
                    type="text"
                    value={formData.targetPestOrCondition}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetPestOrCondition: e.target.value }))}
                    className="input-light w-full"
                    placeholder="e.g., Emerald Ash Borer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Applied By
                  </label>
                  <select
                    value={formData.appliedBy}
                    onChange={(e) => setFormData(prev => ({ ...prev, appliedBy: e.target.value }))}
                    className="select-light w-full"
                  >
                    <option value="">Select applicator...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Applied At
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.appliedAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, appliedAt: e.target.value }))}
                    className="input-light w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Weather Conditions
                  </label>
                  <input
                    type="text"
                    value={formData.weatherConditions}
                    onChange={(e) => setFormData(prev => ({ ...prev, weatherConditions: e.target.value }))}
                    className="input-light w-full"
                    placeholder="e.g., Clear, 72°F"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Wind (mph)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.windSpeedMph || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, windSpeedMph: e.target.value ? parseFloat(e.target.value) : undefined }))}
                      className="input-light w-full"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Temp (°F)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.temperatureF || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, temperatureF: e.target.value ? parseFloat(e.target.value) : undefined }))}
                      className="input-light w-full"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    REI (hours)
                  </label>
                  <input
                    type="number"
                    value={formData.reiHours || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, reiHours: e.target.value ? parseInt(e.target.value) : undefined }))}
                    className="input-light w-full"
                    placeholder="Restricted Entry Interval"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    PPE Used
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PPE_OPTIONS.map(ppe => (
                      <button
                        key={ppe}
                        type="button"
                        onClick={() => handlePpeToggle(ppe)}
                        className={`text-xs px-2 py-1 rounded border ${
                          formData.ppeUsed?.includes(ppe)
                            ? 'bg-green-600 border-green-500 text-white'
                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {ppe}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="textarea-light w-full"
                    rows={2}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.materialName}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Material'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
