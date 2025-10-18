import React, { useState } from 'react';
import { generateSocialMediaPost, optimizeSEOContent, generateEmailCampaign } from '../services/geminiService';
import { SEOSuggestions, EmailCampaign } from '../types';
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
            <h3 className="text-lg font-bold text-brand-navy-900">Social Media Post Generator</h3>
            <div>
                <label htmlFor="topic" className="block text-sm font-medium text-brand-navy-700">Topic or Goal</label>
                <input type="text" id="topic" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., Spring cleanup discount" className="mt-1 block w-full rounded-md border-brand-navy-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm" />
            </div>
            <div>
                <label htmlFor="platform" className="block text-sm font-medium text-brand-navy-700">Platform</label>
                <select id="platform" value={platform} onChange={e => setPlatform(e.target.value)} className="mt-1 block w-full rounded-md border-brand-navy-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm">
                    <option>Facebook</option>
                    <option>Instagram</option>
                    <option>Twitter</option>
                </select>
            </div>
            <button onClick={handleGenerate} disabled={isLoading} className="w-full inline-flex justify-center items-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2 disabled:bg-brand-navy-300">
                {isLoading && <SpinnerIcon className="h-5 w-5 mr-2" />}
                {isLoading ? 'Generating...' : 'Generate Post'}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {result && <div className="p-4 bg-brand-navy-50 rounded-md border"><p className="text-sm text-brand-navy-800 whitespace-pre-wrap">{result}</p></div>}
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
            <h3 className="text-lg font-bold text-brand-navy-900">SEO Content Optimizer</h3>
            <div>
                <label htmlFor="content" className="block text-sm font-medium text-brand-navy-700">Page Content</label>
                <textarea id="content" value={content} onChange={e => setContent(e.target.value)} rows={5} placeholder="Paste your blog post or service page content here..." className="mt-1 block w-full rounded-md border-brand-navy-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm" />
            </div>
            <div>
                <label htmlFor="keyword" className="block text-sm font-medium text-brand-navy-700">Target Keyword</label>
                <input type="text" id="keyword" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="e.g., emergency tree removal" className="mt-1 block w-full rounded-md border-brand-navy-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm" />
            </div>
            <button onClick={handleGenerate} disabled={isLoading} className="w-full inline-flex justify-center items-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2 disabled:bg-brand-navy-300">
                {isLoading && <SpinnerIcon className="h-5 w-5 mr-2" />}
                {isLoading ? 'Optimizing...' : 'Optimize Content'}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {result && (
                <div className="space-y-4 pt-2">
                    <div>
                        <h4 className="font-semibold text-brand-navy-800">Suggested Title:</h4>
                        <p className="mt-1 p-2 bg-brand-navy-50 rounded-md border text-sm">{result.suggested_title}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-brand-navy-800">Suggested Meta Description:</h4>
                        <p className="mt-1 p-2 bg-brand-navy-50 rounded-md border text-sm">{result.suggested_meta_description}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-brand-navy-800">Optimization Tips:</h4>
                        <ul className="mt-1 list-disc list-inside space-y-1 text-sm text-brand-navy-700">
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
            <h3 className="text-lg font-bold text-brand-navy-900">Email Campaign Creator</h3>
            <div>
                <label htmlFor="goal" className="block text-sm font-medium text-brand-navy-700">Campaign Goal</label>
                <input type="text" id="goal" value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g., Promote new stump grinding service" className="mt-1 block w-full rounded-md border-brand-navy-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm" />
            </div>
            <div>
                <label htmlFor="audience" className="block text-sm font-medium text-brand-navy-700">Target Audience</label>
                <input type="text" id="audience" value={audience} onChange={e => setAudience(e.target.value)} placeholder="e.g., Past customers who didn't get stump grinding" className="mt-1 block w-full rounded-md border-brand-navy-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm" />
            </div>
            <button onClick={handleGenerate} disabled={isLoading} className="w-full inline-flex justify-center items-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2 disabled:bg-brand-navy-300">
                {isLoading && <SpinnerIcon className="h-5 w-5 mr-2" />}
                {isLoading ? 'Generating...' : 'Generate Email'}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {result && (
                <div className="space-y-4 pt-2">
                     <div>
                        <h4 className="font-semibold text-brand-navy-800">Subject:</h4>
                        <p className="mt-1 p-2 bg-brand-navy-50 rounded-md border text-sm">{result.subject}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-brand-navy-800">Body:</h4>
                        <p className="mt-1 p-4 bg-brand-navy-50 rounded-md border text-sm whitespace-pre-wrap">{result.body}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const Marketing: React.FC = () => {
    return (
        <div>
            <h1 className="text-2xl font-bold text-brand-navy-900">AI-Powered Marketing Suite</h1>
            <p className="mt-2 text-brand-navy-600">Automate your marketing tasks with the power of Gemini.</p>
            
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
        </div>
    );
};

export default Marketing;