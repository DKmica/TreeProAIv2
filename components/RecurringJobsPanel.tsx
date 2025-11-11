import React, { useEffect, useMemo, useState } from 'react';
import {
  RecurringJobSeries,
  RecurringJobInstance,
  Crew,
  Client,
  Property,
  JobTemplate,
  Job
} from '../types';
import SpinnerIcon from './icons/SpinnerIcon';
import * as api from '../services/apiService';

interface RecurringJobsPanelProps {
  onJobCreated?: (job: Job) => void;
}

type FormState = {
  seriesName: string;
  clientId: string;
  propertyId: string;
  recurrencePattern: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  recurrenceInterval: number;
  recurrenceDayOfWeek: number;
  recurrenceDayOfMonth: number;
  startDate: string;
  endDate: string;
  defaultCrewId: string;
  jobTemplateId: string;
  estimatedDurationHours: number;
  serviceType: string;
  notes: string;
  description: string;
};

const DEFAULT_FORM: FormState = {
  seriesName: '',
  clientId: '',
  propertyId: '',
  recurrencePattern: 'monthly',
  recurrenceInterval: 1,
  recurrenceDayOfWeek: 1,
  recurrenceDayOfMonth: 1,
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  defaultCrewId: '',
  jobTemplateId: '',
  estimatedDurationHours: 4,
  serviceType: '',
  notes: '',
  description: ''
};

const RecurringJobsPanel: React.FC<RecurringJobsPanelProps> = ({ onJobCreated }) => {
  const [series, setSeries] = useState<RecurringJobSeries[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(true);
  const [seriesError, setSeriesError] = useState<string | null>(null);

  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [instances, setInstances] = useState<RecurringJobInstance[]>([]);
  const [instancesLoading, setInstancesLoading] = useState(false);
  const [instancesError, setInstancesError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [clientLoading, setClientLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyLoading, setPropertyLoading] = useState(false);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [jobTemplates, setJobTemplates] = useState<JobTemplate[]>([]);

  const [generateLoading, setGenerateLoading] = useState(false);

  useEffect(() => {
    const loadInitial = async () => {
      setLoadingSeries(true);
      setSeriesError(null);
      try {
        const [seriesData, crewData] = await Promise.all([
          api.jobSeriesService.getAll(),
          api.crewService.getAll()
        ]);
        setSeries(seriesData);
        setCrews(crewData);
        if (seriesData.length > 0) {
          setSelectedSeriesId(seriesData[0].id);
        }
      } catch (error: any) {
        console.error('Failed to load recurring job series:', error);
        setSeriesError(error?.message || 'Failed to load recurring job series');
      } finally {
        setLoadingSeries(false);
      }
    };

    loadInitial();
  }, []);

  const selectedSeries = useMemo(
    () => series.find(item => item.id === selectedSeriesId) || null,
    [series, selectedSeriesId]
  );

  useEffect(() => {
    if (!selectedSeriesId) {
      setInstances([]);
      return;
    }

    const loadInstances = async () => {
      setInstancesLoading(true);
      setInstancesError(null);
      try {
        const data = await api.jobSeriesService.getInstances(selectedSeriesId);
        const sorted = data.slice().sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
        setInstances(sorted);
      } catch (error: any) {
        console.error('Failed to load recurring job instances:', error);
        setInstancesError(error?.message || 'Unable to load generated visits');
      } finally {
        setInstancesLoading(false);
      }
    };

    loadInstances();
  }, [selectedSeriesId]);

  useEffect(() => {
    if (!formOpen) {
      setFormState(DEFAULT_FORM);
      setFormError(null);
      return;
    }

    const loadFormData = async () => {
      setClientLoading(true);
      setFormError(null);
      try {
        const [clientData, templateData] = await Promise.all([
          api.clientService.getAll(),
          api.jobTemplateService.getAll({ limit: 50 })
        ]);
        setClients(clientData);
        setJobTemplates(templateData);
      } catch (error: any) {
        console.error('Failed to load form prerequisites:', error);
        setFormError(error?.message || 'Unable to load client and template options');
      } finally {
        setClientLoading(false);
      }
    };

    loadFormData();
  }, [formOpen]);

  useEffect(() => {
    if (!formOpen || !formState.clientId) {
      setProperties([]);
      return;
    }

    const loadProperties = async () => {
      setPropertyLoading(true);
      try {
        const data = await api.clientService.getProperties(formState.clientId);
        setProperties(data);
      } catch (error: any) {
        console.error('Failed to load properties for client:', error);
        setProperties([]);
      } finally {
        setPropertyLoading(false);
      }
    };

    loadProperties();
  }, [formOpen, formState.clientId]);

  const handleCreateSeries = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formState.seriesName.trim()) {
      setFormError('Series name is required');
      return;
    }
    if (!formState.clientId) {
      setFormError('Please select a client');
      return;
    }
    if (!formState.startDate) {
      setFormError('Start date is required');
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      const payload: Partial<RecurringJobSeries> = {
        seriesName: formState.seriesName.trim(),
        clientId: formState.clientId,
        propertyId: formState.propertyId || undefined,
        recurrencePattern: formState.recurrencePattern,
        recurrenceInterval: Number(formState.recurrenceInterval) || 1,
        startDate: formState.startDate,
        endDate: formState.endDate || undefined,
        defaultCrewId: formState.defaultCrewId || undefined,
        jobTemplateId: formState.jobTemplateId || undefined,
        estimatedDurationHours: Number(formState.estimatedDurationHours) || undefined,
        serviceType: formState.serviceType || undefined,
        notes: formState.notes || undefined,
        description: formState.description || undefined,
        recurrenceDayOfWeek:
          formState.recurrencePattern === 'weekly' ? Number(formState.recurrenceDayOfWeek) : undefined,
        recurrenceDayOfMonth:
          formState.recurrencePattern === 'monthly' ? Number(formState.recurrenceDayOfMonth) : undefined
      };

      const created = await api.jobSeriesService.create(payload);
      setSeries(prev => [created, ...prev]);
      setFormOpen(false);
      setFormState(DEFAULT_FORM);
      setSelectedSeriesId(created.id);
    } catch (error: any) {
      console.error('Failed to create recurring job series:', error);
      setFormError(error?.message || 'Unable to create recurring job series');
    } finally {
      setFormLoading(false);
    }
  };

  const handleGenerateInstances = async () => {
    if (!selectedSeriesId) return;
    setGenerateLoading(true);
    try {
      const data = await api.jobSeriesService.generateInstances(selectedSeriesId, { horizonDays: 60 });
      const sorted = data.slice().sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
      setInstances(sorted);
    } catch (error: any) {
      console.error('Failed to generate recurring job instances:', error);
      alert(error?.message || 'Unable to generate upcoming visits for this series');
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleDeleteSeries = async (seriesId: string) => {
    if (!window.confirm('Archive this recurring job series? Existing jobs will remain unchanged.')) {
      return;
    }
    try {
      await api.jobSeriesService.remove(seriesId);
      setSeries(prev => prev.filter(item => item.id !== seriesId));
      if (selectedSeriesId === seriesId) {
        setSelectedSeriesId(null);
        setInstances([]);
      }
    } catch (error: any) {
      console.error('Failed to archive recurring job series:', error);
      alert(error?.message || 'Unable to archive series.');
    }
  };

  const handleConvertInstance = async (instance: RecurringJobInstance) => {
    if (!selectedSeriesId) return;
    try {
      const result = await api.jobSeriesService.convertInstance(selectedSeriesId, instance.id);
      setInstances(prev => prev.map(item => (item.id === instance.id ? result.instance : item)));
      if (onJobCreated) {
        onJobCreated(result.job);
      }
      alert('Job created from recurring visit. You can find it on the Jobs tab.');
    } catch (error: any) {
      console.error('Failed to create job from recurring instance:', error);
      alert(error?.message || 'Unable to create job from this visit');
    }
  };

  const handleUpdateInstanceStatus = async (instance: RecurringJobInstance, status: RecurringJobInstance['status']) => {
    if (!selectedSeriesId) return;
    try {
      const updated = await api.jobSeriesService.updateInstanceStatus(selectedSeriesId, instance.id, status);
      setInstances(prev => prev.map(item => (item.id === instance.id ? updated : item)));
    } catch (error: any) {
      console.error('Failed to update recurring instance status:', error);
      alert(error?.message || 'Unable to update visit status');
    }
  };

  const renderSeriesCard = (item: RecurringJobSeries) => {
    const isActive = item.id === selectedSeriesId;
    return (
      <button
        key={item.id}
        onClick={() => setSelectedSeriesId(item.id)}
        className={`w-full text-left p-4 rounded-lg border transition-all ${
          isActive
            ? 'border-brand-cyan-500 bg-brand-cyan-50 shadow-md'
            : 'border-brand-gray-200 bg-white hover:border-brand-cyan-300 hover:shadow-sm'
        }`}
        type="button"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-brand-gray-900">{item.seriesName}</h3>
            <p className="text-sm text-brand-gray-600 mt-1">
              Pattern: {item.recurrencePattern.charAt(0).toUpperCase() + item.recurrencePattern.slice(1)} • Every {item.recurrenceInterval}{' '}
              {item.recurrencePattern === 'daily'
                ? 'day(s)'
                : item.recurrencePattern === 'weekly'
                ? 'week(s)'
                : 'month(s)'}
            </p>
            {item.nextOccurrence && (
              <p className="text-sm text-brand-gray-500 mt-1">Next: {item.nextOccurrence}</p>
            )}
          </div>
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${
              item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-gray-100 text-brand-gray-600'
            }`}
          >
            {item.isActive ? 'Active' : 'Paused'}
          </span>
        </div>
      </button>
    );
  };

  const renderInstanceRow = (instance: RecurringJobInstance) => {
    const statusBadge = (() => {
      switch (instance.status) {
        case 'scheduled':
          return 'bg-blue-100 text-blue-700';
        case 'created':
          return 'bg-emerald-100 text-emerald-700';
        case 'skipped':
          return 'bg-yellow-100 text-yellow-700';
        case 'cancelled':
          return 'bg-red-100 text-red-700';
        default:
          return 'bg-brand-gray-100 text-brand-gray-600';
      }
    })();

    return (
      <tr key={instance.id} className="border-t border-brand-gray-100">
        <td className="px-4 py-3 text-sm text-brand-gray-800">{instance.scheduledDate}</td>
        <td className="px-4 py-3 text-sm">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge}`}>
            {instance.status.charAt(0).toUpperCase() + instance.status.slice(1)}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-brand-gray-600">{instance.jobId ?? 'Not yet created'}</td>
        <td className="px-4 py-3 text-right space-x-2">
          {instance.status === 'scheduled' && !instance.jobId && (
            <button
              type="button"
              onClick={() => handleConvertInstance(instance)}
              className="inline-flex items-center rounded-md bg-brand-cyan-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-brand-cyan-700"
            >
              Create Job
            </button>
          )}
          {instance.status === 'scheduled' && (
            <button
              type="button"
              onClick={() => handleUpdateInstanceStatus(instance, 'skipped')}
              className="inline-flex items-center rounded-md border border-brand-gray-300 px-3 py-1 text-xs font-medium text-brand-gray-700 hover:bg-brand-gray-50"
            >
              Skip
            </button>
          )}
          {instance.status === 'skipped' && (
            <button
              type="button"
              onClick={() => handleUpdateInstanceStatus(instance, 'scheduled')}
              className="inline-flex items-center rounded-md border border-brand-gray-300 px-3 py-1 text-xs font-medium text-brand-gray-700 hover:bg-brand-gray-50"
            >
              Re-activate
            </button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="mt-10 bg-white shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
      <div className="px-6 py-5 border-b border-brand-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-brand-gray-900">Recurring Job Automation</h2>
          <p className="text-sm text-brand-gray-600">Auto-generate maintenance visits and recurring work orders.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700"
          >
            New Series
          </button>
        </div>
      </div>

      <div className="px-6 py-5">
        {loadingSeries ? (
          <div className="flex items-center justify-center py-10">
            <SpinnerIcon className="h-8 w-8 animate-spin text-brand-cyan-600" />
          </div>
        ) : seriesError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{seriesError}</div>
        ) : series.length === 0 ? (
          <div className="rounded-lg border border-brand-gray-200 bg-brand-gray-50 p-6 text-sm text-brand-gray-600">
            No recurring series yet. Create your first automation to start auto-scheduling jobs.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {series.map(renderSeriesCard)}
          </div>
        )}

        {selectedSeries && (
          <div className="mt-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-brand-gray-900">{selectedSeries.seriesName}</h3>
                <p className="text-sm text-brand-gray-600">
                  Start date {selectedSeries.startDate}{' '}
                  {selectedSeries.endDate ? `• Ends ${selectedSeries.endDate}` : '• Ongoing'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateInstances}
                  disabled={generateLoading}
                  className="inline-flex items-center rounded-md border border-brand-gray-300 px-3 py-2 text-sm font-medium text-brand-gray-700 hover:bg-brand-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {generateLoading ? 'Generating…' : 'Generate Next 60 Days'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSeries(selectedSeries.id)}
                  className="inline-flex items-center rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Archive Series
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-brand-gray-200">
              <table className="min-w-full divide-y divide-brand-gray-200">
                <thead className="bg-brand-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-gray-500">Scheduled Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-gray-500">Job</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-brand-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-gray-100 bg-white">
                  {instancesLoading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-brand-gray-600">
                        <SpinnerIcon className="mx-auto h-6 w-6 animate-spin text-brand-cyan-600" />
                      </td>
                    </tr>
                  ) : instancesError ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-sm text-red-600">{instancesError}</td>
                    </tr>
                  ) : instances.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-sm text-brand-gray-600">
                        No scheduled visits yet. Generate upcoming visits to create tasks for this series.
                      </td>
                    </tr>
                  ) : (
                    instances.map(renderInstanceRow)
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
          <div className="relative w-full max-w-3xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-brand-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-brand-gray-900">Create Recurring Series</h3>
                <p className="text-sm text-brand-gray-600">Define the automation blueprint for a recurring service.</p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="text-brand-gray-400 hover:text-brand-gray-600"
              >
                <span className="sr-only">Close</span>
                ×
              </button>
            </div>

            <form onSubmit={handleCreateSeries} className="max-h-[80vh] overflow-y-auto px-6 py-5">
              {formError && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-brand-gray-700">Series name</label>
                  <input
                    type="text"
                    value={formState.seriesName}
                    onChange={e => setFormState(prev => ({ ...prev, seriesName: e.target.value }))}
                    required
                    className="mt-1 block w-full rounded-md border border-brand-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-cyan-500 focus:outline-none focus:ring-brand-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-gray-700">Client</label>
                  <select
                    value={formState.clientId}
                    onChange={e => setFormState(prev => ({ ...prev, clientId: e.target.value, propertyId: '' }))}
                    required
                    className="mt-1 block w-full rounded-md border border-brand-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-cyan-500 focus:outline-none focus:ring-brand-cyan-500"
                  >
                    <option value="" disabled>
                      {clientLoading ? 'Loading clients…' : 'Select client'}
                    </option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.companyName || `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() || 'Unnamed Client'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-gray-700">Property</label>
                  <select
                    value={formState.propertyId}
                    onChange={e => setFormState(prev => ({ ...prev, propertyId: e.target.value }))}
                    disabled={!formState.clientId || propertyLoading}
                    className="mt-1 block w-full rounded-md border border-brand-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-cyan-500 focus:outline-none focus:ring-brand-cyan-500"
                  >
                    <option value="">{formState.clientId ? (propertyLoading ? 'Loading…' : 'Primary property') : 'Select client first'}</option>
                    {properties.map(property => (
                      <option key={property.id} value={property.id}>
                        {property.propertyName || property.addressLine1}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-gray-700">Recurrence pattern</label>
                  <select
                    value={formState.recurrencePattern}
                    onChange={e => setFormState(prev => ({ ...prev, recurrencePattern: e.target.value as FormState['recurrencePattern'] }))}
                    className="mt-1 block w-full rounded-md border border-brand-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-cyan-500 focus:outline-none focus:ring-brand-cyan-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-gray-700">Interval</label>
                  <input
                    type="number"
                    min={1}
                    value={formState.recurrenceInterval}
                    onChange={e => setFormState(prev => ({ ...prev, recurrenceInterval: Number(e.target.value) || 1 }))}
                    className="mt-1 block w-full rounded-md border border-brand-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-cyan-500 focus:outline-none focus:ring-brand-cyan-500"
                  />
                  <p className="mt-1 text-xs text-brand-gray-500">Repeat every N {formState.recurrencePattern === 'daily' ? 'day(s)' : formState.recurrencePattern === 'weekly' ? 'week(s)' : 'month(s)'}</p>
                </div>

                {formState.recurrencePattern === 'weekly' && (
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Day of week</label>
                    <select
                      value={formState.recurrenceDayOfWeek}
                      onChange={e => setFormState(prev => ({ ...prev, recurrenceDayOfWeek: Number(e.target.value) }))}
                      className="mt-1 block w-full rounded-md border border-brand-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-cyan-500 focus:outline-none focus:ring-brand-cyan-500"
                    >
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((label, index) => (
                        <option key={label} value={index}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formState.recurrencePattern === 'monthly' && (
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Day of month</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={formState.recurrenceDayOfMonth}
                      onChange={e => setFormState(prev => ({ ...prev, recurrenceDayOfMonth: Number(e.target.value) || 1 }))}
                      className="mt-1 block w-full rounded-md border border-brand-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-cyan-500 focus:outline-none focus:ring-brand-cyan-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-brand-gray-700">Start date</label>
                  <input
                    type="date"
                    value={formState.startDate}
                    onChange={e => setFormState(prev => ({ ...prev, startDate: e.target.value }))}
                    required
                    className="mt-1 block w-full rounded-md border border-brand-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-cyan-500 focus:outline-none focus:ring-brand-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-gray-700">End date (optional)</label>
                  <input
                    type="date"
                    value={formState.endDate}
                    onChange={e => setFormState(prev => ({ ...prev, endDate: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-brand-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-cyan-500 focus:outline-none focus:ring-brand-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-gray-700">Default crew</label>
                  <select
                    value={formState.defaultCrewId}
                    onChange={e => setFormState(prev => ({ ...prev, defaultCrewId: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-brand-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-cyan-500 focus:outline-none focus:ring-brand-cyan-500"
                  >
                    <option value="">Assign later</option>
                    {crews.map(crew => (
                      <option key={crew.id} value={crew.id}>
                        {crew.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-gray-700">Template (optional)</label>
                  <select
                    value={formState.jobTemplateId}
                    onChange={e => setFormState(prev => ({ ...prev, jobTemplateId: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-brand-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-cyan-500 focus:outline-none focus:ring-brand-cyan-500"
                  >
                    <option value="">No template</option>
                    {jobTemplates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-gray-700">Estimated hours</label>
                  <input
                    type="number"
                    min={1}
                    step={0.5}
                    value={formState.estimatedDurationHours}
                    onChange={e => setFormState(prev => ({ ...prev, estimatedDurationHours: Number(e.target.value) || 1 }))}
                    className="mt-1 block w-full rounded-md border border-brand-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-cyan-500 focus:outline-none focus:ring-brand-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-gray-700">Service type</label>
                  <input
                    type="text"
                    value={formState.serviceType}
                    onChange={e => setFormState(prev => ({ ...prev, serviceType: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-brand-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-cyan-500 focus:outline-none focus:ring-brand-cyan-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-brand-gray-700">Description</label>
                  <textarea
                    value={formState.description}
                    onChange={e => setFormState(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-brand-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-cyan-500 focus:outline-none focus:ring-brand-cyan-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-brand-gray-700">Internal notes</label>
                  <textarea
                    value={formState.notes}
                    onChange={e => setFormState(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-brand-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-cyan-500 focus:outline-none focus:ring-brand-cyan-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="inline-flex items-center rounded-md border border-brand-gray-300 px-4 py-2 text-sm font-medium text-brand-gray-700 hover:bg-brand-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="inline-flex items-center rounded-md bg-brand-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {formLoading ? 'Creating…' : 'Create Series'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurringJobsPanel;
