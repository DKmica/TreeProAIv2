import React, { useEffect, useState } from 'react';
import { generateSocialMediaPost, optimizeSEOContent, generateEmailCampaign } from '../services/geminiService';
import { SEOSuggestions, EmailCampaign, CustomerSegment, NurtureSequence, WebLeadFormConfig } from '../types';
import { marketingService, segmentService } from '../services/apiService';
import SpinnerIcon from '../components/icons/SpinnerIcon';

const SocialMediaGenerator: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [platform, setPlatform] = useState('Facebook');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState('');
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!topic) {
            setError('Please enter a topic.');
            return;
        }
        setIsLoading(true);
        setError('');
        setResult('');
        try {
            const post = await generateSocialMediaPost(topic, platform);
            setResult(post);
        } catch (e: any) {
            setError(e.message || 'Failed to generate post.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h3 className="text-lg font-bold text-brand-gray-900">Social Media Post Generator</h3>
            <div>
                <label htmlFor="topic" className="block text-sm font-medium text-brand-gray-700">Topic or Goal</label>
                <input type="text" id="topic" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., Spring cleanup discount" className="mt-1 block w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white shadow-sm placeholder:text-gray-400 focus:border-brand-cyan-500 focus:ring-1 focus:ring-brand-cyan-500 sm:text-sm" />
            </div>
            <div>
                <label htmlFor="platform" className="block text-sm font-medium text-brand-gray-700">Platform</label>
                <select id="platform" value={platform} onChange={e => setPlatform(e.target.value)} className="mt-1 block w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white shadow-sm placeholder:text-gray-400 focus:border-brand-cyan-500 focus:ring-1 focus:ring-brand-cyan-500 sm:text-sm">
                    <option>Facebook</option>
                    <option>Instagram</option>
                    <option>Twitter</option>
                </select>
            </div>
            <button onClick={handleGenerate} disabled={isLoading} className="w-full inline-flex justify-center items-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 disabled:bg-brand-gray-300">
                {isLoading && <SpinnerIcon className="h-5 w-5 mr-2" />}
                {isLoading ? 'Generating...' : 'Generate Post'}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {result && <div className="p-4 bg-brand-gray-50 rounded-md border"><p className="text-sm text-brand-gray-800 whitespace-pre-wrap">{result}</p></div>}
        </div>
    );
};

const SEOOptimizer: React.FC = () => {
    const [content, setContent] = useState('');
    const [keyword, setKeyword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<SEOSuggestions | null>(null);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!content || !keyword) {
            setError('Please enter content and a keyword.');
            return;
        }
        setIsLoading(true);
        setError('');
        setResult(null);
        try {
            const suggestions = await optimizeSEOContent(content, keyword);
            setResult(suggestions);
        } catch (e: any) {
            setError(e.message || 'Failed to generate SEO suggestions.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h3 className="text-lg font-bold text-brand-gray-900">SEO Content Optimizer</h3>
            <div>
                <label htmlFor="content" className="block text-sm font-medium text-brand-gray-700">Page Content</label>
                <textarea id="content" value={content} onChange={e => setContent(e.target.value)} rows={5} placeholder="Paste your blog post or service page content here..." className="mt-1 block w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white shadow-sm placeholder:text-gray-400 focus:border-brand-cyan-500 focus:ring-1 focus:ring-brand-cyan-500 sm:text-sm" />
            </div>
            <div>
                <label htmlFor="keyword" className="block text-sm font-medium text-brand-gray-700">Target Keyword</label>
                <input type="text" id="keyword" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="e.g., emergency tree removal" className="mt-1 block w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white shadow-sm placeholder:text-gray-400 focus:border-brand-cyan-500 focus:ring-1 focus:ring-brand-cyan-500 sm:text-sm" />
            </div>
            <button onClick={handleGenerate} disabled={isLoading} className="w-full inline-flex justify-center items-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 disabled:bg-brand-gray-300">
                {isLoading && <SpinnerIcon className="h-5 w-5 mr-2" />}
                {isLoading ? 'Optimizing...' : 'Optimize Content'}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {result && (
                <div className="space-y-4 pt-2">
                    <div>
                        <h4 className="font-semibold text-brand-gray-800">Suggested Title:</h4>
                        <p className="mt-1 p-2 bg-brand-gray-50 rounded-md border text-sm">{result.suggested_title}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-brand-gray-800">Suggested Meta Description:</h4>
                        <p className="mt-1 p-2 bg-brand-gray-50 rounded-md border text-sm">{result.suggested_meta_description}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-brand-gray-800">Optimization Tips:</h4>
                        <ul className="mt-1 list-disc list-inside space-y-1 text-sm text-brand-gray-700">
                            {result.optimization_tips.map((tip, i) => <li key={i}>{tip}</li>)}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

const EmailCampaignCreator: React.FC = () => {
    const [goal, setGoal] = useState('');
    const [audience, setAudience] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<EmailCampaign | null>(null);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!goal || !audience) {
            setError('Please enter a goal and target audience.');
            return;
        }
        setIsLoading(true);
        setError('');
        setResult(null);
        try {
            const campaign = await generateEmailCampaign(goal, audience);
            setResult(campaign);
        } catch (e: any) {
            setError(e.message || 'Failed to generate email.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h3 className="text-lg font-bold text-brand-gray-900">Email Campaign Creator</h3>
            <div>
                <label htmlFor="goal" className="block text-sm font-medium text-brand-gray-700">Campaign Goal</label>
                <input type="text" id="goal" value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g., Promote new stump grinding service" className="mt-1 block w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white shadow-sm placeholder:text-gray-400 focus:border-brand-cyan-500 focus:ring-1 focus:ring-brand-cyan-500 sm:text-sm" />
            </div>
            <div>
                <label htmlFor="audience" className="block text-sm font-medium text-brand-gray-700">Target Audience</label>
                <input type="text" id="audience" value={audience} onChange={e => setAudience(e.target.value)} placeholder="e.g., Past customers who didn't get stump grinding" className="mt-1 block w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white shadow-sm placeholder:text-gray-400 focus:border-brand-cyan-500 focus:ring-1 focus:ring-brand-cyan-500 sm:text-sm" />
            </div>
            <button onClick={handleGenerate} disabled={isLoading} className="w-full inline-flex justify-center items-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 disabled:bg-brand-gray-300">
                {isLoading && <SpinnerIcon className="h-5 w-5 mr-2" />}
                {isLoading ? 'Generating...' : 'Generate Email'}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {result && (
                <div className="space-y-4 pt-2">
                     <div>
                        <h4 className="font-semibold text-brand-gray-800">Subject:</h4>
                        <p className="mt-1 p-2 bg-brand-gray-50 rounded-md border text-sm">{result.subject}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-brand-gray-800">Body:</h4>
                        <p className="mt-1 p-4 bg-brand-gray-50 rounded-md border text-sm whitespace-pre-wrap">{result.body}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const CampaignSender: React.FC<{ segments: CustomerSegment[] }> = ({ segments }) => {
    const [segmentId, setSegmentId] = useState<string>('');
    const [subject, setSubject] = useState('Seasonal pruning reminders');
    const [body, setBody] = useState('Hi there! Our crews are in your area next week. Would you like us to schedule a pruning visit?');
    const [scheduleAt, setScheduleAt] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    useEffect(() => {
        if (segments.length && !segmentId) {
            setSegmentId(segments[0].id);
        }
    }, [segments, segmentId]);

    const handleSend = async () => {
        if (!segmentId) {
            setFeedback('Choose an audience segment first.');
            return;
        }
        setIsSending(true);
        setFeedback(null);
        try {
            const result = await marketingService.sendCampaign({ segmentId, subject, body, scheduleAt: scheduleAt || undefined });
            setFeedback(`Campaign ${result.status === 'sent' ? 'sent' : 'scheduled'} successfully.`);
        } catch (err: any) {
            setFeedback(err.message || 'Failed to send campaign');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-brand-gray-900">Segmented Email Send</h3>
                <span className="text-xs text-brand-gray-500">Stay in sync with CRM audiences</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Audience Segment</label>
                    <select
                        value={segmentId}
                        onChange={(e) => setSegmentId(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white shadow-sm placeholder:text-gray-400 focus:border-brand-cyan-500 focus:ring-1 focus:ring-brand-cyan-500 sm:text-sm"
                    >
                        {segments.map((segment) => (
                            <option key={segment.id} value={segment.id}>
                                {segment.name} ({segment.audienceCount})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Schedule (optional)</label>
                    <input
                        type="datetime-local"
                        value={scheduleAt}
                        onChange={(e) => setScheduleAt(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white shadow-sm placeholder:text-gray-400 focus:border-brand-cyan-500 focus:ring-1 focus:ring-brand-cyan-500 sm:text-sm"
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-brand-gray-700">Subject</label>
                <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white shadow-sm placeholder:text-gray-400 focus:border-brand-cyan-500 focus:ring-1 focus:ring-brand-cyan-500 sm:text-sm"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-brand-gray-700">Body</label>
                <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={5}
                    className="mt-1 block w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white shadow-sm placeholder:text-gray-400 focus:border-brand-cyan-500 focus:ring-1 focus:ring-brand-cyan-500 sm:text-sm"
                />
            </div>
            <button
                onClick={handleSend}
                disabled={isSending}
                className="w-full inline-flex justify-center items-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 disabled:bg-brand-gray-300"
            >
                {isSending && <SpinnerIcon className="h-5 w-5 mr-2" />}
                {isSending ? 'Sending...' : 'Send Campaign'}
            </button>
            {feedback && <p className="text-sm text-brand-gray-700">{feedback}</p>}
        </div>
    );
};

const NurtureSequenceBoard: React.FC<{ sequences: NurtureSequence[]; onStatusChange: (id: string, status: NurtureSequence['status']) => Promise<void>; }> = ({ sequences, onStatusChange }) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-brand-gray-900">Automated Nurture Sequences</h3>
                <span className="text-xs text-brand-gray-500">Emails, SMS, and tasks</span>
            </div>
            <div className="space-y-3">
                {sequences.map((sequence) => (
                    <div key={sequence.id} className="border border-brand-gray-200 rounded-md p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-semibold text-brand-gray-900">{sequence.name}</h4>
                                <p className="text-xs text-brand-gray-600">{sequence.steps.length} touchpoints · {sequence.status}</p>
                            </div>
                            <select
                                value={sequence.status}
                                onChange={(e) => onStatusChange(sequence.id, e.target.value as NurtureSequence['status'])}
                                className="rounded-md border-brand-gray-300 text-xs focus:border-brand-green-500 focus:ring-brand-green-500"
                            >
                                <option value="draft">Draft</option>
                                <option value="active">Active</option>
                                <option value="paused">Paused</option>
                            </select>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {sequence.steps.map((step) => (
                                <span key={step.id} className="text-[11px] bg-brand-gray-100 text-brand-gray-800 px-2 py-1 rounded-full">
                                    +{step.delayDays}d {step.channel} • {step.templateName}
                                </span>
                            ))}
                        </div>
                        {sequence.stats && (
                            <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] text-brand-gray-700">
                                <span>Opens: {sequence.stats.opens}</span>
                                <span>Replies: {sequence.stats.replies}</span>
                                <span>Clicks: {sequence.stats.clicks}</span>
                                <span>Conversions: {sequence.stats.conversions}</span>
                            </div>
                        )}
                    </div>
                ))}
                {sequences.length === 0 && <p className="text-sm text-brand-gray-600">No nurture sequences configured yet.</p>}
            </div>
        </div>
    );
};

const WebLeadEmbedCard: React.FC<{ forms: WebLeadFormConfig[] }> = ({ forms }) => {
    const [selectedFormId, setSelectedFormId] = useState<string>('');
    const [embedCode, setEmbedCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (forms.length && !selectedFormId) {
            setSelectedFormId(forms[0].id);
        }
    }, [forms, selectedFormId]);

    useEffect(() => {
        const fetchEmbed = async () => {
            if (!selectedFormId) return;
            setIsLoading(true);
            try {
                const preview = await marketingService.previewEmbed(selectedFormId);
                const snippet = `<script src="${preview.scriptUrl}" data-treepro-token="${preview.embedToken}"></script>`;
                setEmbedCode(snippet);
            } catch (err) {
                setEmbedCode('');
            } finally {
                setIsLoading(false);
            }
        };

        fetchEmbed();
    }, [selectedFormId]);

    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-brand-gray-900">Web-to-Lead Embed</h3>
                <span className="text-xs text-brand-gray-500">Drop-in script for your site</span>
            </div>
            <div>
                <label className="block text-sm font-medium text-brand-gray-700">Form</label>
                <select
                    value={selectedFormId}
                    onChange={(e) => setSelectedFormId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white shadow-sm placeholder:text-gray-400 focus:border-brand-cyan-500 focus:ring-1 focus:ring-brand-cyan-500 sm:text-sm"
                >
                    {forms.map((form) => (
                        <option key={form.id} value={form.id}>{form.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <p className="text-xs text-brand-gray-600">Embed snippet</p>
                <div className="mt-2 bg-brand-gray-50 border border-brand-gray-200 rounded-md p-3 text-xs font-mono text-brand-gray-800 break-words">
                    {isLoading ? 'Loading snippet...' : embedCode || 'Select a form to generate embed code.'}
                </div>
            </div>
            <p className="text-xs text-brand-gray-600">Copy and paste into your website <code>&lt;head&gt;</code> or CMS embed block to capture leads directly into CRM.</p>
        </div>
    );
};

const Marketing: React.FC = () => {
    const [segments, setSegments] = useState<CustomerSegment[]>([]);
    const [nurtureSequences, setNurtureSequences] = useState<NurtureSequence[]>([]);
    const [webLeadForms, setWebLeadForms] = useState<WebLeadFormConfig[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [segmentData, sequenceData, formData] = await Promise.all([
                    segmentService.getAll(),
                    marketingService.getNurtureSequences(),
                    marketingService.getWebLeadForms(),
                ]);
                setSegments(segmentData);
                setNurtureSequences(sequenceData);
                setWebLeadForms(formData);
            } catch (err) {
                console.error('Error loading marketing data', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    const handleNurtureStatusChange = async (id: string, status: NurtureSequence['status']) => {
        const updated = await marketingService.updateNurtureStatus(id, status);
        setNurtureSequences((prev) => prev.map((seq) => seq.id === id ? updated : seq));
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-brand-gray-900">AI-Powered Marketing Suite</h1>
            <p className="mt-2 text-brand-gray-600">Automate your marketing tasks with the power of Gemini.</p>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <SocialMediaGenerator />
                </div>
                <div className="lg:col-span-1">
                    <SEOOptimizer />
                </div>
                <div className="lg:col-span-1">
                    <EmailCampaignCreator />
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CampaignSender segments={segments} />
                    <NurtureSequenceBoard sequences={nurtureSequences} onStatusChange={handleNurtureStatusChange} />
                </div>
                <div className="xl:col-span-1">
                    <WebLeadEmbedCard forms={webLeadForms} />
                </div>
            </div>

            {isLoading && (
                <div className="mt-4 text-sm text-brand-gray-600">Refreshing audience and automation data…</div>
            )}
        </div>
    );
};

export default Marketing;
