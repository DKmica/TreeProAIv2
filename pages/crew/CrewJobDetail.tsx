

import React, { useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Job, Quote, Customer, JobHazardAnalysis } from '../../types';
import ArrowLeftIcon from '../../components/icons/ArrowLeftIcon';
import MapPinIcon from '../../components/icons/MapPinIcon';
import ClockIcon from '../../components/icons/ClockIcon';
import CameraIcon from '../../components/icons/CameraIcon';
import CheckCircleIcon from '../../components/icons/CheckCircleIcon';
import SpinnerIcon from '../../components/icons/SpinnerIcon';
import { generateJobHazardAnalysis } from '../../services/geminiService';
import ExclamationTriangleIcon from '../../components/icons/ExclamationTriangleIcon';
import ShieldCheckIcon from '../../components/icons/ShieldCheckIcon';

interface CrewJobDetailProps {
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  quotes: Quote[];
  customers: Customer[];
}

const CrewJobDetail: React.FC<CrewJobDetailProps> = ({ jobs, setJobs, quotes, customers }) => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isClocking, setIsClocking] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGeneratingJha, setIsGeneratingJha] = useState(false);
  const [jhaError, setJhaError] = useState<string | null>(null);

  const job = useMemo(() => jobs.find(j => j.id === jobId), [jobs, jobId]);
  const quote = useMemo(() => quotes.find(q => q.id === job?.quoteId), [quotes, job]);
  const customer = useMemo(() => customers.find(c => c.name === job?.customerName), [customers, job]);

  const isJhaAcknowledged = Boolean(job.jhaAcknowledgedAt);

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

  const handleStatusUpdate = (updates: Partial<Job>) => {
    setJobs(prevJobs => prevJobs.map(j => (j.id === jobId ? { ...j, ...updates } : j)));
  };

  const handleAcknowledgeJha = () => {
    if (!job.jha) {
      setJhaError('Generate a Job Hazard Analysis before acknowledging.');
      return;
    }

    handleStatusUpdate({ jhaAcknowledgedAt: new Date().toISOString() });
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
        
        if (!job.workStartedAt) {
            handleStatusUpdate({ 
                workStartedAt: new Date().toISOString(), 
                status: 'In Progress',
                clockInCoordinates: location 
            });
        } else if (!job.workEndedAt) {
            handleStatusUpdate({ 
                workEndedAt: new Date().toISOString(),
                clockOutCoordinates: location
            });
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

  const handleGenerateJHA = async () => {
    if (!job.photos || job.photos.length === 0) {
      setJhaError("Please upload at least one photo of the job site first.");
      return;
    }

    setIsGeneratingJha(true);
    setJhaError(null);

    try {
        const imageParts = await Promise.all(
            job.photos.map(url => blobUrlToBase64(url))
        );

        const servicesText = services.map(s => s.description).join(', ');
        const result = await generateJobHazardAnalysis(imageParts, servicesText);
        handleStatusUpdate({ jha: result });

    } catch (error: any) {
        setJhaError(error.message || "An unknown error occurred.");
    } finally {
        setIsGeneratingJha(false);
    }
  };


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotoUrls = Array.from(e.target.files).map(file => URL.createObjectURL(file as Blob));
      const existingPhotos = job.photos || [];
      handleStatusUpdate({ photos: [...existingPhotos, ...newPhotoUrls] });
      // Reset file input value to allow uploading the same file again
      e.target.value = '';
    }
  };
  
  const handleMarkComplete = () => {
    if (window.confirm('Are you sure you want to mark this job as complete?')) {
      handleStatusUpdate({ status: 'Completed', workEndedAt: job.workEndedAt || new Date().toISOString() });
      navigate('/crew');
    }
  };

  const services = quote?.lineItems.filter(item => item.selected) || [];
  if (quote && (quote.stumpGrindingPrice > 0)) {
    services.push({ description: 'Stump Grinding', price: quote.stumpGrindingPrice, selected: true });
  }

  let clockButtonText = 'Clock In';
  let clockButtonDisabled = false;
  let clockButtonClasses = "bg-blue-600 hover:bg-blue-700";

  if (isClocking) {
      clockButtonText = 'Getting Location...';
      clockButtonClasses = "bg-brand-gray-400 cursor-wait";
  } else if (job.workStartedAt && !job.workEndedAt) {
    clockButtonText = 'Clock Out';
    clockButtonClasses = "bg-yellow-500 hover:bg-yellow-600";
  } else if (job.workStartedAt && job.workEndedAt) {
    clockButtonText = 'Work Logged';
    clockButtonDisabled = true;
    clockButtonClasses = "bg-brand-gray-400 cursor-not-allowed";
  } else if (!isJhaAcknowledged) {
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
          <h1 className="text-2xl font-bold text-brand-gray-900">{job.customerName}</h1>
          <p className="text-brand-gray-600 mt-1">Job ID: {job.id}</p>
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

      <div className="mt-6 bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-brand-gray-800 mb-3">Safety & Compliance Co-pilot</h2>
        {!job.jha ? (
             <div>
                <button 
                    onClick={handleGenerateJHA} 
                    disabled={!job.photos || job.photos.length === 0 || isGeneratingJha}
                    className="w-full inline-flex items-center justify-center rounded-md border border-transparent bg-brand-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 disabled:bg-brand-gray-400 disabled:cursor-not-allowed"
                >
                    {isGeneratingJha ? <SpinnerIcon className="h-5 w-5 mr-2"/> :  <ShieldCheckIcon className="h-5 w-5 mr-2" />}
                    {isGeneratingJha ? 'Analyzing Site...' : 'Generate Job Hazard Analysis'}
                </button>
                {(!job.photos || job.photos.length === 0) && <p className="text-xs text-center mt-2 text-brand-gray-500">Please upload job photos to enable analysis.</p>}
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
                        {job.jha.identified_hazards.map((hazard, i) => <li key={i}>{hazard}</li>)}
                    </ul>
                </div>
                <div>
                    <h3 className="text-md font-semibold text-brand-gray-800 flex items-center">
                        <ShieldCheckIcon className="w-5 h-5 mr-2 text-blue-500"/>
                        Recommended PPE
                    </h3>
                    <ul className="mt-2 list-disc list-inside space-y-1 text-brand-gray-700 text-sm">
                        {job.jha.recommended_ppe.map((ppe, i) => <li key={i}>{ppe}</li>)}
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
                        {isJhaAcknowledged && job.jhaAcknowledgedAt && (
                            <p className="text-xs text-brand-gray-500">
                                Acknowledged at {new Date(job.jhaAcknowledgedAt).toLocaleTimeString()}
                            </p>
                        )}
                    </div>
                </div>
                <p className="text-xs text-brand-gray-400 text-right">Analysis generated at {new Date(job.jha.analysis_timestamp).toLocaleTimeString()}</p>
            </div>
        )}

      </div>
      
      {(job.workStartedAt || locationError) && (
        <div className="mt-6 bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-brand-gray-800 mb-3">Work Log</h2>
            {locationError && (
                <div className="p-3 mb-4 bg-red-50 border-l-4 border-red-400 text-red-700">
                    <p className="font-bold">Location Error</p>
                    <p>{locationError}</p>
                </div>
            )}
            <div className="space-y-3">
                {job.workStartedAt && (
                    <div className="flex items-start">
                        <ClockIcon className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0"/>
                        <div>
                            <p className="font-semibold text-brand-gray-800">Clocked In: {new Date(job.workStartedAt).toLocaleTimeString()}</p>
                            {job.clockInCoordinates && (
                                <a href={`https://www.google.com/maps?q=${job.clockInCoordinates.lat},${job.clockInCoordinates.lng}`} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-green-600 hover:underline inline-flex items-center">
                                    <MapPinIcon className="w-3 h-3 mr-1"/>
                                    View Location
                                </a>
                            )}
                        </div>
                    </div>
                )}
                {job.workEndedAt && (
                     <div className="flex items-start">
                        <ClockIcon className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0"/>
                        <div>
                            <p className="font-semibold text-brand-gray-800">Clocked Out: {new Date(job.workEndedAt).toLocaleTimeString()}</p>
                            {job.clockOutCoordinates && (
                                <a href={`https://www.google.com/maps?q=${job.clockOutCoordinates.lat},${job.clockOutCoordinates.lng}`} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-green-600 hover:underline inline-flex items-center">
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

      <div className="mt-6 space-y-4">
        <h2 className="text-xl font-bold text-brand-gray-900">Job Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
                <button onClick={handleClockInOut} disabled={clockButtonDisabled || isClocking} className={`flex items-center justify-center p-4 text-white font-bold rounded-lg shadow-md transition-transform active:scale-95 ${clockButtonClasses}`}>
                    {isClocking ? <SpinnerIcon className="w-6 h-6 mr-2" /> : <ClockIcon className="w-6 h-6 mr-2" />}
                    {clockButtonText}
                </button>
                {!isJhaAcknowledged && !job.workStartedAt && (
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
            <button onClick={handleMarkComplete} disabled={job.status === 'Completed'} className="flex items-center justify-center p-4 bg-brand-green-600 text-white font-bold rounded-lg shadow-md hover:bg-brand-green-700 transition-transform active:scale-95 disabled:bg-brand-gray-400 disabled:cursor-not-allowed">
                <CheckCircleIcon className="w-6 h-6 mr-2" />
                Mark as Complete
            </button>
        </div>
      </div>

      {job.photos && job.photos.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-bold text-brand-gray-900">Job Photos</h2>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {job.photos.map((photoUrl, index) => (
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
