import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateTreeEstimate } from '../services/geminiService';
import { AITreeEstimate } from '../types';
import { fileToBase64 } from '../utils/fileUtils';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import CheckCircleIcon from '../components/icons/CheckCircleIcon';
import { estimateFeedbackService } from '../services/apiService';

const AITreeEstimator: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<AITreeEstimate | null>(null);
    const navigate = useNavigate();
    
    const [feedbackRating, setFeedbackRating] = useState<'accurate' | 'too_low' | 'too_high' | null>(null);
    const [actualPrice, setActualPrice] = useState<string>('');
    const [correctionReasons, setCorrectionReasons] = useState<string[]>([]);
    const [additionalNotes, setAdditionalNotes] = useState<string>('');
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [submittingFeedback, setSubmittingFeedback] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const newFiles = Array.from(event.target.files);
            setFiles(prev => [...prev, ...newFiles]);

            const newPreviews = newFiles.map(file => URL.createObjectURL(file as Blob));
            setPreviews(prev => [...prev, ...newPreviews]);
        }
    };
    
    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => {
            const newPreviews = prev.filter((_, i) => i !== index);
            // Revoke the object URL to free up memory
            URL.revokeObjectURL(previews[index]);
            return newPreviews;
        });
    }

    const handleAnalyze = useCallback(async () => {
        if (files.length === 0) {
            setError("Please upload at least one image or video.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResults(null);

        try {
            const fileParts = await Promise.all(
                files.map(async (file) => ({
                    mimeType: file.type,
                    data: await fileToBase64(file),
                }))
            );

            const analysisResults = await generateTreeEstimate(fileParts);
            setResults(analysisResults);
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred during analysis.");
        } finally {
            setIsLoading(false);
        }
    }, [files]);
    
    const handleCreateQuote = () => {
        if (results) {
            navigate('/quotes', { state: { aiEstimate: results } });
        }
    };

    const handleCorrectionReasonToggle = (reason: string) => {
        setCorrectionReasons(prev => 
            prev.includes(reason) 
                ? prev.filter(r => r !== reason)
                : [...prev, reason]
        );
    };

    const handleFeedbackSubmit = async () => {
        if (!results || !feedbackRating) return;

        setSubmittingFeedback(true);
        try {
            const priceMin = results.suggested_services.reduce((min, s) => Math.min(min, s.price_range.min), Infinity);
            const priceMax = results.suggested_services.reduce((max, s) => Math.max(max, s.price_range.max), 0);

            await estimateFeedbackService.submitEstimateFeedback({
                aiEstimateData: results,
                aiSuggestedPriceMin: priceMin,
                aiSuggestedPriceMax: priceMax,
                actualPriceQuoted: actualPrice ? parseFloat(actualPrice) : undefined,
                feedbackRating,
                correctionReasons,
                userNotes: additionalNotes || undefined,
                treeSpecies: results.tree_identification,
                treeHeight: results.measurements.height_feet,
                trunkDiameter: results.measurements.trunk_diameter_inches,
                hazards: results.hazards_obstacles,
            });

            setFeedbackSubmitted(true);
        } catch (err: any) {
            alert('Failed to submit feedback: ' + err.message);
        } finally {
            setSubmittingFeedback(false);
        }
    };

    const resetFeedback = () => {
        setFeedbackRating(null);
        setActualPrice('');
        setCorrectionReasons([]);
        setAdditionalNotes('');
        setFeedbackSubmitted(false);
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-brand-gray-900">AI Tree Estimator</h1>
            <p className="mt-2 text-brand-gray-600">Upload images or videos of a tree to get a detailed assessment and price estimate.</p>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Uploader Section */}
                <div className="bg-white p-6 rounded-lg shadow space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold text-brand-gray-800">1. Upload Media</h2>
                        <div className="mt-4 flex justify-center rounded-lg border border-dashed border-brand-gray-900/25 px-6 py-10">
                            <div className="text-center">
                                <svg className="mx-auto h-12 w-12 text-brand-gray-300" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" /></svg>
                                <div className="mt-4 flex text-sm leading-6 text-brand-gray-600">
                                <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-semibold text-brand-green-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-green-600 focus-within:ring-offset-2 hover:text-brand-green-500">
                                    <span>Upload files</span>
                                    <input id="file-upload" name="file-upload" type="file" multiple accept="image/*,video/*" onChange={handleFileChange} className="sr-only" />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs leading-5 text-brand-gray-600">Images and Videos up to 100MB</p>
                            </div>
                        </div>
                    </div>

                    {previews.length > 0 && (
                        <div>
                             <h3 className="text-md font-semibold text-brand-gray-700">File Previews:</h3>
                             <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {previews.map((preview, index) => (
                                    <div key={index} className="relative group">
                                        {files[index].type.startsWith('image/') ? (
                                            <img src={preview} alt={`preview ${index}`} className="h-28 w-full object-cover rounded-md" />
                                        ) : (
                                            <video src={preview} className="h-28 w-full object-cover rounded-md" muted playsInline />
                                        )}
                                        <button onClick={() => removeFile(index)} className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}

                    <div>
                        <h2 className="text-lg font-semibold text-brand-gray-800">2. Analyze</h2>
                        <button onClick={handleAnalyze} disabled={isLoading || files.length === 0} className="mt-4 w-full inline-flex justify-center items-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 disabled:bg-brand-gray-300">
                            {isLoading ? <><SpinnerIcon className="h-5 w-5 mr-2" />Analyzing...</> : 'Analyze Media'}
                        </button>
                        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                    </div>
                </div>

                {/* Results Section */}
                <div className="bg-white p-6 rounded-lg shadow">
                     <h2 className="text-lg font-semibold text-brand-gray-800">3. AI Assessment Results</h2>
                     {isLoading && (
                        <div className="flex flex-col items-center justify-center h-full pt-10">
                            <SpinnerIcon className="h-12 w-12 text-brand-green-600"/>
                            <p className="mt-4 text-brand-gray-700 font-semibold">Gemini is analyzing the media...</p>
                            <p className="mt-1 text-sm text-brand-gray-500">This may take a moment, especially for videos.</p>
                        </div>
                     )}
                     {results && (
                        <div className="mt-4 space-y-6 animate-fade-in max-h-[80vh] overflow-y-auto pr-2">
                             <div>
                                <h3 className="font-semibold text-brand-gray-900">Tree Identification</h3>
                                <p className="text-sm text-brand-gray-600">{results.tree_identification}</p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-brand-gray-900">Measurements</h3>
                                <ul className="list-disc list-inside text-sm text-brand-gray-600">
                                    <li>Height: ~{results.measurements.height_feet} ft</li>
                                    <li>Canopy Width: ~{results.measurements.canopy_width_feet} ft</li>
                                    <li>Trunk Diameter: ~{results.measurements.trunk_diameter_inches} inches</li>
                                </ul>
                            </div>
                             <div>
                                <h3 className="font-semibold text-brand-gray-900">Health Assessment</h3>
                                <p className="text-sm text-brand-gray-600">{results.health_assessment}</p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-brand-gray-900">Hazards & Obstacles</h3>
                                {results.hazards_obstacles.length > 0 ? (
                                    <ul className="list-disc list-inside text-sm text-brand-gray-600">
                                        {results.hazards_obstacles.map((item, i) => <li key={i}>{item}</li>)}
                                    </ul>
                                ) : <p className="text-sm text-brand-gray-500">No significant hazards detected.</p>}
                            </div>
                            <div>
                                <h3 className="font-semibold text-brand-gray-900">Detailed Assessment & Work Plan</h3>
                                <p className="text-sm text-brand-gray-600 whitespace-pre-wrap">{results.detailed_assessment}</p>
                            </div>
                             <div>
                                <h3 className="font-semibold text-brand-gray-900">Job Requirements</h3>
                                <ul className="list-disc list-inside text-sm text-brand-gray-600">
                                    <li>Equipment: {results.required_equipment.join(', ')}</li>
                                    <li>Manpower: {results.required_manpower} crew member(s)</li>
                                    <li>Duration: ~{results.estimated_duration_hours} hours</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-semibold text-brand-gray-900">Suggested Services & Price Ranges</h3>
                                <div className="mt-2 space-y-3">
                                    {results.suggested_services.map((service, i) => (
                                        <div key={i} className="p-3 bg-brand-gray-50 rounded-md border border-brand-gray-200">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-semibold text-brand-green-800">{service.service_name}</h4>
                                                <p className="font-semibold text-brand-gray-800">${service.price_range.min} - ${service.price_range.max}</p>
                                            </div>
                                            <p className="text-sm text-brand-gray-600 mt-1">{service.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button onClick={handleCreateQuote} className="w-full mt-6 inline-flex justify-center items-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2">
                                Create Quote from Results
                            </button>

                            {!feedbackSubmitted && (
                                <div className="mt-8 pt-6 border-t border-brand-gray-200">
                                    <h3 className="text-lg font-semibold text-brand-gray-900 mb-4">Was this estimate accurate?</h3>
                                    
                                    <div className="flex gap-3 mb-4">
                                        <button
                                            onClick={() => { setFeedbackRating('accurate'); resetFeedback(); setFeedbackRating('accurate'); }}
                                            className={`flex-1 py-2 px-4 rounded-md border transition-colors ${
                                                feedbackRating === 'accurate'
                                                    ? 'bg-green-100 border-green-500 text-green-800'
                                                    : 'bg-white border-brand-gray-300 text-brand-gray-700 hover:bg-brand-gray-50'
                                            }`}
                                        >
                                            ✅ Accurate
                                        </button>
                                        <button
                                            onClick={() => setFeedbackRating('too_low')}
                                            className={`flex-1 py-2 px-4 rounded-md border transition-colors ${
                                                feedbackRating === 'too_low'
                                                    ? 'bg-yellow-100 border-yellow-500 text-yellow-800'
                                                    : 'bg-white border-brand-gray-300 text-brand-gray-700 hover:bg-brand-gray-50'
                                            }`}
                                        >
                                            ⚠️ Too Low
                                        </button>
                                        <button
                                            onClick={() => setFeedbackRating('too_high')}
                                            className={`flex-1 py-2 px-4 rounded-md border transition-colors ${
                                                feedbackRating === 'too_high'
                                                    ? 'bg-orange-100 border-orange-500 text-orange-800'
                                                    : 'bg-white border-brand-gray-300 text-brand-gray-700 hover:bg-brand-gray-50'
                                            }`}
                                        >
                                            ⚠️ Too High
                                        </button>
                                    </div>

                                    {(feedbackRating === 'too_low' || feedbackRating === 'too_high') && (
                                        <div className="space-y-4 mt-4">
                                            <div>
                                                <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                                                    What should the price have been?
                                                </label>
                                                <input
                                                    type="number"
                                                    value={actualPrice}
                                                    onChange={(e) => setActualPrice(e.target.value)}
                                                    placeholder="Enter actual price"
                                                    className="w-full px-3 py-2 border border-brand-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-cyan-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-brand-gray-700 mb-2">
                                                    Correction reasons:
                                                </label>
                                                <div className="space-y-2">
                                                    {['Tree size underestimated', 'Didn\'t account for hazards', 'Debris cost too low', 'Trunk diameter underestimated', 'Other'].map(reason => (
                                                        <label key={reason} className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={correctionReasons.includes(reason)}
                                                                onChange={() => handleCorrectionReasonToggle(reason)}
                                                                className="h-4 w-4 text-brand-cyan-600 focus:ring-brand-cyan-500 border-brand-gray-300 rounded"
                                                            />
                                                            <span className="ml-2 text-sm text-brand-gray-700">{reason}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                                                    Additional notes (optional):
                                                </label>
                                                <textarea
                                                    value={additionalNotes}
                                                    onChange={(e) => setAdditionalNotes(e.target.value)}
                                                    placeholder="Any additional feedback..."
                                                    rows={3}
                                                    className="w-full px-3 py-2 border border-brand-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-cyan-500"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {feedbackRating && (
                                        <button
                                            onClick={handleFeedbackSubmit}
                                            disabled={submittingFeedback}
                                            className="w-full mt-4 inline-flex justify-center items-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2 disabled:bg-brand-gray-400"
                                        >
                                            {submittingFeedback ? <><SpinnerIcon className="h-4 w-4 mr-2" />Submitting...</> : 'Submit Feedback'}
                                        </button>
                                    )}
                                </div>
                            )}

                            {feedbackSubmitted && (
                                <div className="mt-8 pt-6 border-t border-brand-gray-200">
                                    <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center">
                                        <CheckCircleIcon className="h-6 w-6 text-green-600 mr-3" />
                                        <div>
                                            <h4 className="text-sm font-semibold text-green-800">Feedback Submitted!</h4>
                                            <p className="text-sm text-green-700">Thank you for helping us improve our estimates.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                     )}
                     {!isLoading && !results && <p className="text-center text-sm text-brand-gray-500 pt-10">Analysis results will appear here.</p>}
                </div>
            </div>
        </div>
    );
};

export default AITreeEstimator;
