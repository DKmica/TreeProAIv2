import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CrewNote, CrewPendingAction, Job, JobHazardAnalysis, SafetyChecklist, AiRiskAssessment } from '../../types';
import ArrowLeftIcon from '../../components/icons/ArrowLeftIcon';
import MapPinIcon from '../../components/icons/MapPinIcon';
import ClockIcon from '../../components/icons/ClockIcon';
import CameraIcon from '../../components/icons/CameraIcon';
import CheckCircleIcon from '../../components/icons/CheckCircleIcon';
import SpinnerIcon from '../../components/icons/SpinnerIcon';
import { generateJobHazardAnalysis } from '../../services/geminiService';
import ExclamationTriangleIcon from '../../components/icons/ExclamationTriangleIcon';
import ShieldCheckIcon from '../../components/icons/ShieldCheckIcon';
import { useJobsQuery, useQuotesQuery, useClientsQuery } from '../../hooks/useDataQueries';
import * as api from '../../services/apiService';
import { useCrewSync } from '../../contexts/CrewSyncContext';

const defaultChecklist: SafetyChecklist = {
  eyeProtection: false,
  helmet: false,
  harnessUsed: false,
  communicationsChecked: false,
  utilitiesLocated: false,
  weatherClear: true,
  tailgateBriefingAt: undefined,
  notes: '',
};

const CrewJobDetail: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: jobs = [], isLoading: jobsLoading, refetch: refetchJobs } = useJobsQuery();
  const { data: quotes = [], isLoading: quotesLoading } = useQuotesQuery();
  const { data: customers = [], isLoading: customersLoading } = useClientsQuery();

  const { isOnline, queueJobUpdate, jobPatches, pendingActions, syncPendingActions, syncing } = useCrewSync();

  const [isClocking, setIsClocking] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGeneratingJha, setIsGeneratingJha] = useState(false);
  const [jhaError, setJhaError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [checklistDraft, setChecklistDraft] = useState<SafetyChecklist>(defaultChecklist);
  const [riskAssessment, setRiskAssessment] = useState<AiRiskAssessment | null>(null);
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);

  const job = useMemo(() => jobs.find(j => j.id === jobId), [jobs, jobId]);
  const mergedJob = useMemo(() => {
    if (!job) return undefined;
    const patch = jobPatches[job.id];
    if (!patch) return job;
    return {
      ...job,
      ...patch,
      photos: patch.photos ?? job.photos,
      crewNotes: patch.crewNotes ?? job.crewNotes,
      safetyChecklist: patch.safetyChecklist ?? job.safetyChecklist,
    };
  }, [job, jobPatches]);
  const quote = useMemo(() => quotes.find(q => q.id === mergedJob?.quoteId), [quotes, mergedJob]);
  const customer = useMemo(() => customers.find(c => c.name === mergedJob?.customerName), [customers, mergedJob]);
  const pendingForJob = useMemo(() => pendingActions.filter(action => action.jobId === jobId), [pendingActions, jobId]);

  useEffect(() => {
    if (mergedJob?.safetyChecklist) {
      setChecklistDraft({ ...defaultChecklist, ...mergedJob.safetyChecklist });
    } else {
      setChecklistDraft(defaultChecklist);
    }
  }, [mergedJob?.safetyChecklist]);

  useEffect(() => {
    if (!mergedJob?.id) return;
    const loadRiskAssessment = async () => {
      setIsLoadingRisk(true);
      setRiskError(null);
      try {
        const assessment = await api.aiService.assessJobRisk(mergedJob.id);
        setRiskAssessment(assessment);
      } catch (error: any) {
        console.error('Failed to load risk assessment', error);
        setRiskError(error?.message || 'AI risk assessment unavailable');
      } finally {
        setIsLoadingRisk(false);
      }
    };

    loadRiskAssessment();
  }, [mergedJob?.id]);

  const isLoading = jobsLoading || quotesLoading || customersLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SpinnerIcon className="h-12 w-12 text-brand-green-600" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center p-8 bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold text-red-600">Job Not Found</h2>
          <p className="mt-2 text-brand-gray-600">The requested job could not be found.</p>
          <Link to="/crew" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-green-600 hover:bg-brand-green-700">
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Link>
      </div>
    );
  }

  const isJhaAcknowledged = Boolean(mergedJob?.jhaAcknowledgedAt);
  const isJhaRequired = mergedJob?.jhaRequired ?? false;
  const isJhaMissing = isJhaRequired && !mergedJob?.jha;

  const submitJobUpdate = async (
    updates: Partial<Job>,
    type: CrewPendingAction['type'],
    description: string
  ) => {
    if (!job) return;

    const patch = { ...updates, updatedAt: new Date().toISOString() };

    try {
      if (!isOnline) throw new Error('Offline mode — queueing update');
      await api.jobService.update(job.id, patch);
      refetchJobs();
    } catch (error) {
      console.warn('Queuing offline job update', error);
      queueJobUpdate(job.id, patch, type, description);
    }
  };

  const handleAcknowledgeJha = () => {
    if (!mergedJob?.jha) {
      setJhaError('Generate a Job Hazard Analysis before acknowledging.');
      return;
    }

    submitJobUpdate({ jhaAcknowledgedAt: new Date().toISOString() }, 'checklist', 'JHA acknowledged by crew');
  };

  const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by your browser."));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
            },
            (error) => {
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        reject(new Error("You denied the request for Geolocation. Please enable it in your browser settings."));
                        break;
                    case error.POSITION_UNAVAILABLE:
                        reject(new Error("Location information is unavailable."));
                        break;
                    case error.TIMEOUT:
                        reject(new Error("The request to get user location timed out."));
                        break;
                    default:
                        reject(new Error("An unknown error occurred while getting location."));
                        break;
                }
            }
        );
    });
  };

  const handleClockInOut = async () => {
    setLocationError(null);
    setIsClocking(true);
    try {
        const location = await getCurrentLocation();

        if (!mergedJob?.workStartedAt) {
            submitJobUpdate({
                workStartedAt: new Date().toISOString(),
                status: 'In Progress',
                clockInCoordinates: location
            }, 'clock_event', 'Clock in recorded');
        } else if (!mergedJob.workEndedAt) {
            submitJobUpdate({
                workEndedAt: new Date().toISOString(),
                clockOutCoordinates: location
            }, 'clock_event', 'Clock out recorded');
        }
    } catch (error: any) {
        setLocationError(error.message);
    } finally {
        setIsClocking(false);
    }
  };

  const handlePhotoUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const blobUrlToBase64 = async (blobUrl: string): Promise<{ data: string, mimeType: string }> => {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          if (base64String) {
            resolve({ data: base64String, mimeType: blob.type });
          } else {
            reject(new Error('Failed to convert blob to base64.'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
  };

  const services = quote?.lineItems.filter(item => item.selected) || [];
  if (quote && (quote.stumpGrindingPrice > 0)) {
    services.push({ description: 'Stump Grinding', price: quote.stumpGrindingPrice, selected: true });
  }

  const handleGenerateJHA = async () => {
    if (!mergedJob?.photos || mergedJob.photos.length === 0) {
      setJhaError("Please upload at least one photo of the job site first.");
      return;
    }

    setIsGeneratingJha(true);
    setJhaError(null);

    try {
        const imageParts = await Promise.all(
            (mergedJob.photos || []).map(url => blobUrlToBase64(url))
        );

        const servicesText = services.map(s => s.description).join(', ');
        const result = await generateJobHazardAnalysis(imageParts, servicesText);
        submitJobUpdate({ jha: result }, 'checklist', 'Job hazard analysis generated');

    } catch (error: any) {
        setJhaError(error.message || "An unknown error occurred.");
    } finally {
        setIsGeneratingJha(false);
    }
  };


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotoUrls = Array.from(e.target.files).map(file => URL.createObjectURL(file as Blob));
      const existingPhotos = mergedJob?.photos || [];
      submitJobUpdate({ photos: [...existingPhotos, ...newPhotoUrls] }, 'photo_upload', 'Photos captured on device');
      e.target.value = '';
    }
  };

  const handleMarkComplete = () => {
    if (window.confirm('Are you sure you want to mark this job as complete?')) {
      submitJobUpdate({ status: 'Completed', workEndedAt: mergedJob?.workEndedAt || new Date().toISOString() }, 'status_update', 'Job marked complete');
      navigate('/crew');
    }
  };

  const handleAddNote = () => {
    if (!mergedJob || !noteText.trim()) return;
    const newNote: CrewNote = {
      id: `local-${Date.now()}`,
      author: 'You',
      message: noteText.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedNotes = [...(mergedJob.crewNotes ?? []), newNote];
    submitJobUpdate({ crewNotes: updatedNotes }, 'note', 'Crew note captured');
    setNoteText('');
  };

  const handleChecklistChange = (field: keyof SafetyChecklist, value: string | boolean) => {
    const updated: SafetyChecklist = { ...checklistDraft, [field]: value };
    setChecklistDraft(updated);
    if (mergedJob) {
      submitJobUpdate({ safetyChecklist: updated }, 'checklist', 'Safety checklist updated');
    }
  };

  let clockButtonText = 'Clock In';
  let clockButtonDisabled = false;
  let clockButtonClasses = "bg-blue-600 hover:bg-blue-700";

  if (isClocking) {
      clockButtonText = 'Getting Location...';
      clockButtonClasses = "bg-brand-gray-400 cursor-wait";
  } else if (mergedJob?.workStartedAt && !mergedJob.workEndedAt) {
    clockButtonText = 'Clock Out';
    clockButtonClasses = "bg-yellow-500 hover:bg-yellow-600";
  } else if (mergedJob?.workStartedAt && mergedJob.workEndedAt) {
    clockButtonText = 'Work Logged';
    clockButtonDisabled = true;
    clockButtonClasses = "bg-brand-gray-400 cursor-not-allowed";
  } else if (!isJhaAcknowledged && isJhaRequired) {
    clockButtonText = 'Acknowledge JHA to Clock In';
    clockButtonDisabled = true;
    clockButtonClasses = "bg-brand-gray-400 cursor-not-allowed";
  }

  return (
    <div>
      <Link to="/crew" className="inline-flex items-center text-sm font-semibold text-brand-green-600 hover:text-brand-green-800 mb-4">
        <ArrowLeftIcon className="w-5 h-5 mr-2" />
        Back to Dashboard
      </Link>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 sm:p-6">
          <h1 className="text-2xl font-bold text-brand-gray-900">{mergedJob?.customerName}</h1>
          <p className="text-brand-gray-600 mt-1">Job ID: {mergedJob?.id}</p>
          {customer && (
             <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`} target="_blank" rel="noopener noreferrer" className="mt-2 text-brand-green-600 inline-flex items-center hover:underline">
                <MapPinIcon className="w-5 h-5 mr-2"/>
                {customer.address}
              </a>
          )}
        </div>
        
        <div className="border-t border-brand-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-brand-gray-800 mb-3">Services to Perform</h2>
          <ul className="space-y-2">
            {services.map((item, index) => (
              <li key={index} className="flex items-start">
                <CheckCircleIcon className="w-5 h-5 text-brand-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-brand-gray-700">{item.description}</span>
              </li>
            ))}
            {services.length === 0 && <li className="text-brand-gray-500">No services listed for this job.</li>}
          </ul>
        </div>
      </div>

      {isJhaMissing && (
        <div className="mt-4 bg-red-100 border-l-4 border-red-500 text-red-800 p-4 rounded-lg shadow" role="alert">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold">Safety Warning: JHA Required</h3>
              <p className="mt-2 text-sm">
                AI has flagged this job as <strong>{mergedJob?.riskLevel || 'Medium'} Risk</strong>.
                A Job Hazard Analysis (JHA) is <strong>mandatory</strong> before work can begin.
              </p>
              <p className="mt-1 text-sm">
                Please upload job site photos and click "Generate Job Hazard Analysis" below.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 bg-white rounded-lg shadow border border-brand-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-gray-900 flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-brand-green-600" />
            AI risk assessment
          </h2>
          <span className="rounded-full bg-brand-gray-100 px-2 py-1 text-[11px] font-medium text-brand-gray-700">Live</span>
        </div>

        {isLoadingRisk && (
          <p className="mt-2 text-sm text-brand-gray-600">Scanning latest photos and notes…</p>
        )}

        {riskError && (
          <div className="mt-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">{riskError}</div>
        )}

        {riskAssessment && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-brand-gray-700">Severity</p>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  riskAssessment.severity === 'high'
                    ? 'bg-red-100 text-red-700'
                    : riskAssessment.severity === 'medium'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {riskAssessment.severity.toUpperCase()}
              </span>
            </div>

            {riskAssessment.factors && riskAssessment.factors.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-brand-gray-800">Drivers</p>
                <ul className="mt-1 list-disc list-inside text-sm text-brand-gray-700 space-y-1">
                  {riskAssessment.factors.map((factor, idx) => (
                    <li key={idx}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}

            {riskAssessment.recommendedActions && riskAssessment.recommendedActions.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-brand-gray-800">Recommended mitigations</p>
                <ul className="mt-1 list-disc list-inside text-sm text-brand-gray-700 space-y-1">
                  {riskAssessment.recommendedActions.map((action, idx) => (
                    <li key={idx}>{action}</li>
                  ))}
                </ul>
              </div>
            )}

            {riskAssessment.attachments && riskAssessment.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {riskAssessment.attachments.map((attachment, idx) => (
                  <a
                    key={idx}
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-md border border-brand-gray-200 px-3 py-1.5 text-xs font-semibold text-brand-cyan-700 hover:bg-brand-gray-50"
                  >
                    {attachment.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-brand-gray-800 mb-3">Safety & Compliance Co-pilot</h2>
        {!mergedJob?.jha ? (
             <div>
                <button
                    onClick={handleGenerateJHA}
                    disabled={!mergedJob?.photos || mergedJob.photos.length === 0 || isGeneratingJha}
                    className={`w-full inline-flex items-center justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:bg-brand-gray-400 disabled:cursor-not-allowed ${
                      isJhaMissing
                        ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 animate-pulse'
                        : 'bg-brand-green-600 hover:bg-brand-green-700 focus:ring-brand-green-500'
                    }`}
                >
                    {isGeneratingJha ? <SpinnerIcon className="h-5 w-5 mr-2"/> :  <ShieldCheckIcon className="h-5 w-5 mr-2" />}
                    {isGeneratingJha ? 'Analyzing Site...' : 'Generate Job Hazard Analysis'}
                </button>
                {(!mergedJob?.photos || mergedJob.photos.length === 0) && <p className="text-xs text-center mt-2 text-brand-gray-500">Please upload job photos to enable analysis.</p>}
                {jhaError && <p className="mt-2 text-sm text-red-600 text-center">{jhaError}</p>}
            </div>
        ) : (
            <div className="space-y-4 animate-fade-in">
                <div>
                    <h3 className="text-md font-semibold text-brand-gray-800 flex items-center">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 text-yellow-500"/>
                        Identified Hazards
                    </h3>
                    <ul className="mt-2 list-disc list-inside space-y-1 text-brand-gray-700 text-sm">
                        {mergedJob?.jha?.identified_hazards.map((hazard, i) => <li key={i}>{hazard}</li>)}
                    </ul>
                </div>
                <div>
                    <h3 className="text-md font-semibold text-brand-gray-800 flex items-center">
                        <ShieldCheckIcon className="w-5 h-5 mr-2 text-blue-500"/>
                        Recommended PPE
                    </h3>
                    <ul className="mt-2 list-disc list-inside space-y-1 text-brand-gray-700 text-sm">
                        {mergedJob?.jha?.recommended_ppe.map((ppe, i) => <li key={i}>{ppe}</li>)}
                    </ul>
                </div>
                <div className="rounded-md border border-brand-gray-200 p-3 bg-brand-gray-50">
                    <p className="text-sm text-brand-gray-700">
                        Review the Job Hazard Analysis above and confirm you understand the required safety protocols before
                        clocking in.
                    </p>
                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <button
                            onClick={handleAcknowledgeJha}
                            disabled={isJhaAcknowledged}
                            className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 disabled:bg-brand-gray-300 disabled:cursor-not-allowed"
                        >
                            {isJhaAcknowledged ? 'Acknowledged' : 'I Have Read and Acknowledge'}
                        </button>
                        {isJhaAcknowledged && mergedJob?.jhaAcknowledgedAt && (
                            <p className="text-xs text-brand-gray-500">
                                Acknowledged at {new Date(mergedJob.jhaAcknowledgedAt).toLocaleTimeString()}
                            </p>
                        )}
                    </div>
                </div>
                {mergedJob?.jha?.analysis_timestamp && (
                  <p className="text-xs text-brand-gray-400 text-right">Analysis generated at {new Date(mergedJob.jha.analysis_timestamp).toLocaleTimeString()}</p>
                )}
            </div>
        )}

      </div>
      
      {(mergedJob?.workStartedAt || locationError) && (
        <div className="mt-6 bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-brand-gray-800 mb-3">Work Log</h2>
            {locationError && (
                <div className="p-3 mb-4 bg-red-50 border-l-4 border-red-400 text-red-700">
                    <p className="font-bold">Location Error</p>
                    <p>{locationError}</p>
                </div>
            )}
            <div className="space-y-3">
                {mergedJob?.workStartedAt && (
                    <div className="flex items-start">
                        <ClockIcon className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0"/>
                        <div>
                            <p className="font-semibold text-brand-gray-800">Clocked In: {new Date(mergedJob.workStartedAt).toLocaleTimeString()}</p>
                            {mergedJob.clockInCoordinates && (
                                <a href={`https://www.google.com/maps?q=${mergedJob.clockInCoordinates.lat},${mergedJob.clockInCoordinates.lng}`} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-green-600 hover:underline inline-flex items-center">
                                    <MapPinIcon className="w-3 h-3 mr-1"/>
                                    View Location
                                </a>
                            )}
                        </div>
                    </div>
                )}
                {mergedJob?.workEndedAt && (
                     <div className="flex items-start">
                        <ClockIcon className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0"/>
                        <div>
                            <p className="font-semibold text-brand-gray-800">Clocked Out: {new Date(mergedJob.workEndedAt).toLocaleTimeString()}</p>
                            {mergedJob.clockOutCoordinates && (
                                <a href={`https://www.google.com/maps?q=${mergedJob.clockOutCoordinates.lat},${mergedJob.clockOutCoordinates.lng}`} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-green-600 hover:underline inline-flex items-center">
                                     <MapPinIcon className="w-3 h-3 mr-1"/>
                                    View Location
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand-gray-800">Crew Notes & Offline Trail</h2>
            {pendingForJob.length > 0 && (
              <span className="text-xs font-semibold bg-amber-100 text-amber-700 rounded-full px-2 py-1">
                Pending sync: {pendingForJob.length}
              </span>
            )}
          </div>
          <p className="text-sm text-brand-gray-600">Capture site notes, customer requests, and time stamps. Notes save locally when offline and sync automatically.</p>
          <div className="space-y-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-brand-gray-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green-500"
              placeholder="Add a quick note for this job"
            />
            <div className="flex items-center justify-between text-xs text-brand-gray-500">
              <span>{isOnline ? 'Online' : 'Offline'} — notes are queued if the network drops</span>
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim()}
                className="inline-flex items-center rounded-md bg-brand-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-brand-green-700 disabled:bg-brand-gray-300"
              >
                Save note
              </button>
            </div>
          </div>
          <div className="border-t border-brand-gray-100 pt-3 space-y-2 max-h-48 overflow-y-auto">
            {(mergedJob?.crewNotes ?? []).length === 0 && (
              <p className="text-sm text-brand-gray-500">No notes yet.</p>
            )}
            {mergedJob?.crewNotes?.map((note) => (
              <div key={note.id} className="rounded-md border border-brand-gray-100 p-2">
                <div className="flex items-center justify-between text-xs text-brand-gray-500">
                  <span className="font-semibold text-brand-gray-700">{note.author}</span>
                  <span>{new Date(note.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm text-brand-gray-800 mt-1">{note.message}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand-gray-800">Safety Checklist</h2>
            <button
              onClick={syncPendingActions}
              disabled={!isOnline || syncing || pendingForJob.length === 0}
              className="inline-flex items-center rounded-md border border-brand-gray-200 px-3 py-1.5 text-xs font-semibold text-brand-gray-700 hover:bg-brand-gray-50 disabled:text-brand-gray-400"
            >
              {syncing ? 'Syncing…' : 'Sync job data'}
            </button>
          </div>
          <p className="text-sm text-brand-gray-600">Log PPE and site readiness. Updates persist offline and sync back when connectivity returns.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-brand-gray-800">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={checklistDraft.eyeProtection} onChange={(e) => handleChecklistChange('eyeProtection', e.target.checked)} />
              Eye/face protection
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={checklistDraft.helmet} onChange={(e) => handleChecklistChange('helmet', e.target.checked)} />
              Helmet secured
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={checklistDraft.harnessUsed} onChange={(e) => handleChecklistChange('harnessUsed', e.target.checked)} />
              Harness/anchor checked
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={checklistDraft.communicationsChecked} onChange={(e) => handleChecklistChange('communicationsChecked', e.target.checked)} />
              Radios/phones tested
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={checklistDraft.utilitiesLocated} onChange={(e) => handleChecklistChange('utilitiesLocated', e.target.checked)} />
              Utilities located/marked
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={Boolean(checklistDraft.weatherClear)} onChange={(e) => handleChecklistChange('weatherClear', e.target.checked)} />
              Weather clear to work
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <label className="block">
              <span className="text-brand-gray-700 font-semibold text-xs">Tailgate briefing</span>
              <input
                type="time"
                value={checklistDraft.tailgateBriefingAt || ''}
                onChange={(e) => handleChecklistChange('tailgateBriefingAt', e.target.value)}
                className="mt-1 w-full rounded-md border border-brand-gray-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green-500"
              />
            </label>
            <label className="block">
              <span className="text-brand-gray-700 font-semibold text-xs">Notes</span>
              <input
                type="text"
                value={checklistDraft.notes || ''}
                onChange={(e) => handleChecklistChange('notes', e.target.value)}
                className="mt-1 w-full rounded-md border border-brand-gray-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green-500"
                placeholder="Line clearance, wildlife, customer requests"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <h2 className="text-xl font-bold text-brand-gray-900">Job Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
                <button onClick={handleClockInOut} disabled={clockButtonDisabled || isClocking} className={`flex items-center justify-center p-4 text-white font-bold rounded-lg shadow-md transition-transform active:scale-95 ${clockButtonClasses}`}>
                    {isClocking ? <SpinnerIcon className="w-6 h-6 mr-2" /> : <ClockIcon className="w-6 h-6 mr-2" />}
                    {clockButtonText}
                </button>
                {!isJhaAcknowledged && !mergedJob?.workStartedAt && (
                    <p className="text-xs text-brand-gray-600 text-center">
                        Review and acknowledge the Job Hazard Analysis to unlock clock-in.
                    </p>
                )}
            </div>
            <button onClick={handlePhotoUploadClick} className="flex items-center justify-center p-4 bg-brand-gray-700 text-white font-bold rounded-lg shadow-md hover:bg-brand-gray-800 transition-transform active:scale-95">
                <CameraIcon className="w-6 h-6 mr-2" />
                Upload Photos
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*" capture="environment" className="hidden" />
            <button onClick={handleMarkComplete} disabled={mergedJob?.status === 'Completed'} className="flex items-center justify-center p-4 bg-brand-green-600 text-white font-bold rounded-lg shadow-md hover:bg-brand-green-700 transition-transform active:scale-95 disabled:bg-brand-gray-400 disabled:cursor-not-allowed">
                <CheckCircleIcon className="w-6 h-6 mr-2" />
                Mark as Complete
            </button>
        </div>
      </div>

      {mergedJob?.photos && mergedJob.photos.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-bold text-brand-gray-900">Job Photos</h2>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {mergedJob.photos.map((photoUrl, index) => (
                    <a key={index} href={photoUrl} target="_blank" rel="noopener noreferrer">
                        <img src={photoUrl} alt={`Job photo ${index + 1}`} className="aspect-square w-full object-cover rounded-lg shadow-md hover:ring-2 hover:ring-brand-green-500 hover:ring-offset-2 transition-all" />
                    </a>
                ))}
            </div>
        </div>
      )}

    </div>
  );
};

export default CrewJobDetail;
