import React, { useState, useEffect } from 'react';
import { estimateFeedbackService } from '../services/apiService';
import { EstimateFeedback, EstimateFeedbackStats } from '../types';
import SpinnerIcon from '../components/icons/SpinnerIcon';

const EstimateFeedbackAnalytics: React.FC = () => {
    const [stats, setStats] = useState<EstimateFeedbackStats | null>(null);
    const [feedbackList, setFeedbackList] = useState<EstimateFeedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [statsData, feedbackData] = await Promise.all([
                    estimateFeedbackService.getEstimateFeedbackStats(),
                    estimateFeedbackService.getEstimateFeedback(),
                ]);
                setStats(statsData);
                setFeedbackList(feedbackData);
            } catch (err: any) {
                setError(err.message || 'Failed to load analytics data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <SpinnerIcon className="h-12 w-12 text-brand-cyan-600 mx-auto" />
                    <p className="mt-4 text-brand-gray-700">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800">Error: {error}</p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-yellow-800">No analytics data available</p>
            </div>
        );
    }

    const treeSizeCategories = [
        { key: 'small', label: 'Small (<30 ft)', data: stats.feedbackByTreeSize.small },
        { key: 'medium', label: 'Medium (30-60 ft)', data: stats.feedbackByTreeSize.medium },
        { key: 'large', label: 'Large (60-80 ft)', data: stats.feedbackByTreeSize.large },
        { key: 'extraLarge', label: 'Extra Large (>80 ft)', data: stats.feedbackByTreeSize.extraLarge },
    ];

    return (
        <div>
            <h1 className="text-2xl font-bold text-brand-gray-900">AI Estimate Feedback Analytics</h1>
            <p className="mt-2 text-brand-gray-600">Track and analyze the accuracy of AI-generated tree estimates.</p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-brand-gray-500">Total Feedback</h3>
                    <p className="mt-2 text-3xl font-bold text-brand-cyan-600">{stats.totalFeedback}</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-brand-gray-500">Accuracy Rate</h3>
                    <p className="mt-2 text-3xl font-bold text-green-600">{stats.accuracyRate.toFixed(1)}%</p>
                    <div className="mt-2 w-full bg-brand-gray-200 rounded-full h-2">
                        <div
                            className="bg-green-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${stats.accuracyRate}%` }}
                        ></div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-brand-gray-500">Avg Price Difference</h3>
                    <p className="mt-2 text-3xl font-bold text-brand-gray-800">
                        ${Math.abs(stats.averagePriceDifference).toFixed(0)}
                    </p>
                    <p className="text-xs text-brand-gray-500 mt-1">
                        {stats.averagePriceDifference > 0 ? 'Higher than AI' : 'Lower than AI'}
                    </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-brand-gray-500">Feedback Breakdown</h3>
                    <div className="mt-2 space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-green-600">✅ Accurate:</span>
                            <span className="font-semibold">{stats.accurateCount}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-yellow-600">⚠️ Too Low:</span>
                            <span className="font-semibold">{stats.tooLowCount}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-orange-600">⚠️ Too High:</span>
                            <span className="font-semibold">{stats.tooHighCount}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-semibold text-brand-gray-900 mb-4">Feedback Distribution</h2>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-green-600 font-medium">Accurate</span>
                                <span className="text-brand-gray-700">{stats.accurateCount} ({((stats.accurateCount / stats.totalFeedback) * 100).toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-brand-gray-200 rounded-full h-3">
                                <div
                                    className="bg-green-600 h-3 rounded-full"
                                    style={{ width: `${(stats.accurateCount / stats.totalFeedback) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-yellow-600 font-medium">Too Low</span>
                                <span className="text-brand-gray-700">{stats.tooLowCount} ({((stats.tooLowCount / stats.totalFeedback) * 100).toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-brand-gray-200 rounded-full h-3">
                                <div
                                    className="bg-yellow-600 h-3 rounded-full"
                                    style={{ width: `${(stats.tooLowCount / stats.totalFeedback) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-orange-600 font-medium">Too High</span>
                                <span className="text-brand-gray-700">{stats.tooHighCount} ({((stats.tooHighCount / stats.totalFeedback) * 100).toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-brand-gray-200 rounded-full h-3">
                                <div
                                    className="bg-orange-600 h-3 rounded-full"
                                    style={{ width: `${(stats.tooHighCount / stats.totalFeedback) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-semibold text-brand-gray-900 mb-4">Top Correction Reasons</h2>
                    {stats.commonCorrectionReasons.length > 0 ? (
                        <div className="space-y-3">
                            {stats.commonCorrectionReasons.slice(0, 5).map((item, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <div className="flex items-center flex-1">
                                        <span className="text-sm font-medium text-brand-cyan-600 mr-2">#{index + 1}</span>
                                        <span className="text-sm text-brand-gray-700">{item.reason}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-sm font-bold text-brand-gray-900 mr-2">{item.count}</span>
                                        <div className="w-24 bg-brand-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-brand-cyan-600 h-2 rounded-full"
                                                style={{ 
                                                    width: `${(item.count / stats.commonCorrectionReasons[0].count) * 100}%` 
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-brand-gray-500">No correction reasons recorded yet.</p>
                    )}
                </div>
            </div>

            <div className="mt-6 bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-semibold text-brand-gray-900 mb-4">Feedback by Tree Size</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-brand-gray-200">
                        <thead>
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">
                                    Tree Size
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">
                                    Feedback Count
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">
                                    Avg Difference
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-brand-gray-200">
                            {treeSizeCategories.map((category) => (
                                <tr key={category.key} className="hover:bg-brand-gray-50">
                                    <td className="px-4 py-3 text-sm font-medium text-brand-gray-900">
                                        {category.label}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-brand-gray-700">
                                        {category.data.count}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-brand-gray-700">
                                        {category.data.count > 0 ? (
                                            <span className={category.data.avgDifference > 0 ? 'text-orange-600' : category.data.avgDifference < 0 ? 'text-yellow-600' : 'text-green-600'}>
                                                ${Math.abs(category.data.avgDifference).toFixed(0)}
                                                {category.data.avgDifference > 0 && ' (AI too low)'}
                                                {category.data.avgDifference < 0 && ' (AI too high)'}
                                                {category.data.avgDifference === 0 && ' (Accurate)'}
                                            </span>
                                        ) : (
                                            <span className="text-brand-gray-400">N/A</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-6 bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-semibold text-brand-gray-900 mb-4">All Feedback Entries ({feedbackList.length})</h2>
                {feedbackList.length > 0 ? (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {feedbackList.map((feedback) => (
                            <div key={feedback.id} className="border border-brand-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                feedback.feedbackRating === 'accurate' 
                                                    ? 'bg-green-100 text-green-800'
                                                    : feedback.feedbackRating === 'too_low'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-orange-100 text-orange-800'
                                            }`}>
                                                {feedback.feedbackRating === 'accurate' && '✅ Accurate'}
                                                {feedback.feedbackRating === 'too_low' && '⚠️ Too Low'}
                                                {feedback.feedbackRating === 'too_high' && '⚠️ Too High'}
                                            </span>
                                            <span className="text-xs text-brand-gray-500">
                                                {new Date(feedback.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-brand-gray-500">Tree:</span>
                                                <span className="ml-1 text-brand-gray-900">{feedback.treeSpecies || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="text-brand-gray-500">Height:</span>
                                                <span className="ml-1 text-brand-gray-900">{feedback.treeHeight || 'N/A'} ft</span>
                                            </div>
                                            <div>
                                                <span className="text-brand-gray-500">AI Range:</span>
                                                <span className="ml-1 text-brand-gray-900">
                                                    ${feedback.aiSuggestedPriceMin} - ${feedback.aiSuggestedPriceMax}
                                                </span>
                                            </div>
                                            {feedback.actualPriceQuoted && (
                                                <div>
                                                    <span className="text-brand-gray-500">Actual Price:</span>
                                                    <span className="ml-1 font-semibold text-brand-cyan-600">
                                                        ${feedback.actualPriceQuoted}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {feedback.correctionReasons.length > 0 && (
                                            <div className="mt-2">
                                                <span className="text-xs text-brand-gray-500">Reasons:</span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {feedback.correctionReasons.map((reason, idx) => (
                                                        <span key={idx} className="text-xs bg-brand-gray-100 text-brand-gray-700 px-2 py-1 rounded">
                                                            {reason}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {feedback.userNotes && (
                                            <div className="mt-2 text-sm text-brand-gray-600 italic">
                                                "{feedback.userNotes}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-brand-gray-500 text-center py-8">No feedback entries yet.</p>
                )}
            </div>
        </div>
    );
};

export default EstimateFeedbackAnalytics;
