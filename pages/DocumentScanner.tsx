import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import CheckCircleIcon from '../components/icons/CheckCircleIcon';
import { Upload, FileText, User, MapPin, Phone, Mail, DollarSign, Calendar, Briefcase, AlertCircle, ArrowRight, X } from 'lucide-react';

interface ExtractedData {
  customer: {
    name: string;
    address: string;
    phone: string;
    email: string;
    parsedAddress?: {
      line1: string;
      city: string;
      state: string;
      zip: string;
    };
  };
  work_description: string;
  totals: {
    total: number;
    deposit: number;
    balance: number;
  };
  dates: {
    start_date: string;
    completion_date: string;
    scheduled_time: string;
  };
  signatures: Array<{
    name: string;
    role: string;
    present: boolean;
  }>;
  tree_species: string[];
  services: string[];
}

interface ScanResult {
  id: string;
  status: string;
  extractedData: ExtractedData;
  confidence: Record<string, number>;
  warnings: string[];
}

interface CreatedRecords {
  clientId: string;
  propertyId: string;
  jobId: string;
  invoiceId: string;
}

const DocumentScanner: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [editedData, setEditedData] = useState<ExtractedData | null>(null);
  const [createdRecords, setCreatedRecords] = useState<CreatedRecords | null>(null);
  const [step, setStep] = useState<'upload' | 'review' | 'complete'>('upload');

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError(null);
      setScanResult(null);
      setEditedData(null);
      setCreatedRecords(null);
      setStep('upload');
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setPreview(URL.createObjectURL(droppedFile));
      setError(null);
      setScanResult(null);
      setEditedData(null);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const clearFile = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setScanResult(null);
    setEditedData(null);
    setCreatedRecords(null);
    setStep('upload');
  }, [preview]);

  const handleScan = useCallback(async () => {
    if (!file) {
      setError('Please select an image first');
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/documents/scan', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to scan document');
      }

      setScanResult(result.data);
      setEditedData(result.data.extractedData);
      setStep('review');
    } catch (err: any) {
      setError(err.message || 'An error occurred while scanning');
    } finally {
      setIsScanning(false);
    }
  }, [file]);

  const handleCreateRecords = useCallback(async () => {
    if (!scanResult || !editedData) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/scans/${scanResult.id}/create-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedData: editedData }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create records');
      }

      setCreatedRecords(result.data);
      setStep('complete');
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating records');
    } finally {
      setIsCreating(false);
    }
  }, [scanResult, editedData]);

  const updateField = useCallback((path: string, value: any) => {
    if (!editedData) return;
    
    const keys = path.split('.');
    const newData = JSON.parse(JSON.stringify(editedData));
    let current: any = newData;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    setEditedData(newData);
  }, [editedData]);

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all
          ${file ? 'border-brand-cyan-500 bg-brand-cyan-500/10' : 'border-brand-gray-600 hover:border-brand-cyan-500'}
        `}
      >
        {!file ? (
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-brand-gray-800 flex items-center justify-center">
              <Upload className="w-8 h-8 text-brand-cyan-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-white">Drop your service contract here</p>
              <p className="text-sm text-brand-gray-400 mt-1">or click to browse</p>
            </div>
            <p className="text-xs text-brand-gray-500">Supports JPEG, PNG, HEIC up to 25MB</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="relative">
              <img
                src={preview!}
                alt="Preview"
                className="w-48 h-64 object-cover rounded-lg shadow-lg"
              />
              <button
                onClick={clearFile}
                className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-white">{file.name}</p>
              <p className="text-sm text-brand-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <button
                onClick={handleScan}
                disabled={isScanning}
                className="mt-4 px-6 py-2.5 bg-gradient-to-r from-brand-cyan-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-brand-cyan-500 hover:to-emerald-500 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isScanning ? (
                  <>
                    <SpinnerIcon className="w-5 h-5 animate-spin" />
                    Extracting Data...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Extract Contract Data
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400">{error}</p>
        </div>
      )}
    </div>
  );

  const renderReviewStep = () => {
    if (!editedData || !scanResult) return null;

    return (
      <div className="space-y-6">
        {scanResult.warnings.length > 0 && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-400">Review Required</p>
                <ul className="mt-1 text-sm text-yellow-300/80 list-disc list-inside">
                  {scanResult.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-brand-cyan-400" />
              Customer Information
            </h3>
            <div className="bg-brand-gray-800 rounded-lg p-4 space-y-4">
              <div>
                <label className="block text-sm text-brand-gray-400 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={editedData.customer.name || ''}
                  onChange={(e) => updateField('customer.name', e.target.value)}
                  className="w-full px-3 py-2 bg-brand-gray-700 border border-brand-gray-600 rounded-lg text-white focus:border-brand-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-brand-gray-400 mb-1 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Address
                </label>
                <input
                  type="text"
                  value={editedData.customer.address || ''}
                  onChange={(e) => updateField('customer.address', e.target.value)}
                  className="w-full px-3 py-2 bg-brand-gray-700 border border-brand-gray-600 rounded-lg text-white focus:border-brand-cyan-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-brand-gray-400 mb-1 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone
                  </label>
                  <input
                    type="text"
                    value={editedData.customer.phone || ''}
                    onChange={(e) => updateField('customer.phone', e.target.value)}
                    className="w-full px-3 py-2 bg-brand-gray-700 border border-brand-gray-600 rounded-lg text-white focus:border-brand-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-brand-gray-400 mb-1 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <input
                    type="text"
                    value={editedData.customer.email || ''}
                    onChange={(e) => updateField('customer.email', e.target.value)}
                    className="w-full px-3 py-2 bg-brand-gray-700 border border-brand-gray-600 rounded-lg text-white focus:border-brand-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Financial Details
            </h3>
            <div className="bg-brand-gray-800 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-brand-gray-400 mb-1">Total</label>
                  <input
                    type="number"
                    value={editedData.totals.total || 0}
                    onChange={(e) => updateField('totals.total', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-brand-gray-700 border border-brand-gray-600 rounded-lg text-white focus:border-brand-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-brand-gray-400 mb-1">Deposit</label>
                  <input
                    type="number"
                    value={editedData.totals.deposit || 0}
                    onChange={(e) => updateField('totals.deposit', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-brand-gray-700 border border-brand-gray-600 rounded-lg text-white focus:border-brand-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-brand-gray-400 mb-1">Balance</label>
                  <input
                    type="number"
                    value={editedData.totals.balance || 0}
                    onChange={(e) => updateField('totals.balance', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-brand-gray-700 border border-brand-gray-600 rounded-lg text-white focus:border-brand-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-brand-gray-400 mb-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Start Date
                </label>
                <input
                  type="text"
                  value={editedData.dates.start_date || editedData.dates.scheduled_time || ''}
                  onChange={(e) => updateField('dates.start_date', e.target.value)}
                  placeholder="YYYY-MM-DD or description"
                  className="w-full px-3 py-2 bg-brand-gray-700 border border-brand-gray-600 rounded-lg text-white focus:border-brand-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-purple-400" />
            Work Description
          </h3>
          <div className="bg-brand-gray-800 rounded-lg p-4">
            <textarea
              value={editedData.work_description || ''}
              onChange={(e) => updateField('work_description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-brand-gray-700 border border-brand-gray-600 rounded-lg text-white focus:border-brand-cyan-500 focus:outline-none resize-none"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {editedData.tree_species?.map((species, idx) => (
                <span key={idx} className="px-2 py-1 bg-green-500/20 text-green-400 text-sm rounded-full">
                  {species}
                </span>
              ))}
              {editedData.services?.map((service, idx) => (
                <span key={idx} className="px-2 py-1 bg-brand-cyan-500/20 text-brand-cyan-400 text-sm rounded-full">
                  {service}
                </span>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-brand-gray-700">
          <button
            onClick={clearFile}
            className="px-4 py-2 text-brand-gray-400 hover:text-white transition-colors"
          >
            Start Over
          </button>
          <button
            onClick={handleCreateRecords}
            disabled={isCreating}
            className="px-6 py-2.5 bg-gradient-to-r from-brand-cyan-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-brand-cyan-500 hover:to-emerald-500 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <SpinnerIcon className="w-5 h-5 animate-spin" />
                Creating Records...
              </>
            ) : (
              <>
                Create Customer, Job & Invoice
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderCompleteStep = () => {
    if (!createdRecords) return null;

    return (
      <div className="text-center space-y-6 py-8">
        <div className="mx-auto w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircleIcon className="w-12 h-12 text-green-400" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white">Records Created Successfully!</h3>
          <p className="text-brand-gray-400 mt-2">Your handwritten contract has been converted to digital records.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
          <button
            onClick={() => navigate(`/crm?clientId=${createdRecords.clientId}`)}
            className="p-4 bg-brand-gray-800 rounded-lg hover:bg-brand-gray-700 transition-colors"
          >
            <User className="w-8 h-8 text-brand-cyan-400 mx-auto mb-2" />
            <p className="text-sm text-white font-medium">View Customer</p>
          </button>
          <button
            onClick={() => navigate('/jobs')}
            className="p-4 bg-brand-gray-800 rounded-lg hover:bg-brand-gray-700 transition-colors"
          >
            <Briefcase className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-sm text-white font-medium">View Job</p>
          </button>
          <button
            onClick={() => navigate('/invoices')}
            className="p-4 bg-brand-gray-800 rounded-lg hover:bg-brand-gray-700 transition-colors"
          >
            <FileText className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-white font-medium">View Invoice</p>
          </button>
          <button
            onClick={clearFile}
            className="p-4 bg-brand-gray-800 rounded-lg hover:bg-brand-gray-700 transition-colors"
          >
            <Upload className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-sm text-white font-medium">Scan Another</p>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-brand-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan-400 to-emerald-400">
            Document Scanner
          </h1>
          <p className="text-brand-gray-400 mt-2">
            Upload photos of handwritten service contracts to automatically create digital records
          </p>
        </div>

        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-brand-cyan-400' : 'text-brand-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'upload' ? 'bg-brand-cyan-500 text-white' : step === 'review' || step === 'complete' ? 'bg-green-500 text-white' : 'bg-brand-gray-700'}`}>
                {step === 'review' || step === 'complete' ? <CheckCircleIcon className="w-5 h-5" /> : '1'}
              </div>
              <span className="font-medium">Upload</span>
            </div>
            <div className="w-12 h-0.5 bg-brand-gray-700" />
            <div className={`flex items-center gap-2 ${step === 'review' ? 'text-brand-cyan-400' : 'text-brand-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'review' ? 'bg-brand-cyan-500 text-white' : step === 'complete' ? 'bg-green-500 text-white' : 'bg-brand-gray-700'}`}>
                {step === 'complete' ? <CheckCircleIcon className="w-5 h-5" /> : '2'}
              </div>
              <span className="font-medium">Review</span>
            </div>
            <div className="w-12 h-0.5 bg-brand-gray-700" />
            <div className={`flex items-center gap-2 ${step === 'complete' ? 'text-green-400' : 'text-brand-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'complete' ? 'bg-green-500 text-white' : 'bg-brand-gray-700'}`}>
                3
              </div>
              <span className="font-medium">Complete</span>
            </div>
          </div>
        </div>

        <div className="bg-brand-gray-800/50 rounded-xl p-6 border border-brand-gray-700">
          {step === 'upload' && renderUploadStep()}
          {step === 'review' && renderReviewStep()}
          {step === 'complete' && renderCompleteStep()}
        </div>

        {preview && step !== 'complete' && (
          <div className="mt-6 bg-brand-gray-800/50 rounded-xl p-4 border border-brand-gray-700">
            <p className="text-sm text-brand-gray-400 mb-2">Original Document</p>
            <img
              src={preview}
              alt="Document preview"
              className="max-h-96 mx-auto rounded-lg shadow-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentScanner;
