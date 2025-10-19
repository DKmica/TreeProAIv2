import React, { useMemo } from 'react';
import { JobCostingSummary } from '../types';

interface FinancialsProps {
    jobCosting: JobCostingSummary[];
}

const FinancialsPage: React.FC<FinancialsProps> = ({ jobCosting }) => {
    
    const summaryMetrics = useMemo(() => {
        const totalRevenue = jobCosting.reduce((sum, job) => sum + (job.total_revenue || 0), 0);
        const totalProfit = jobCosting.reduce((sum, job) => sum + (job.profit_amount || 0), 0);
        const averageMargin = jobCosting.length > 0
            ? jobCosting.reduce((sum, job) => sum + (job.profit_margin_percentage || 0), 0) / jobCosting.length
            : 0;
        
        return { totalRevenue, totalProfit, averageMargin };
    }, [jobCosting]);

    return (
        <div>
            <h1 className="text-2xl font-bold text-brand-navy-900">Financial Analytics</h1>
            <p className="mt-2 text-sm text-brand-navy-700">Analyze job profitability and overall financial performance.</p>

            {/* Summary Metrics */}
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                    <dt className="truncate text-sm font-medium text-brand-navy-500">Total Revenue</dt>
                    <dd className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy-900">${summaryMetrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>
                </div>
                <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                    <dt className="truncate text-sm font-medium text-brand-navy-500">Total Profit</dt>
                    <dd className="mt-1 text-3xl font-semibold tracking-tight text-green-600">${summaryMetrics.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>
                </div>
                <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                    <dt className="truncate text-sm font-medium text-brand-navy-500">Average Profit Margin</dt>
                    <dd className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy-900">{summaryMetrics.averageMargin.toFixed(1)}%</dd>
                </div>
            </div>

            {/* Job Profitability Report */}
            <div className="mt-8">
                <h3 className="text-xl font-bold text-brand-navy-900">Job Profitability Report</h3>
                <div className="mt-4 flex flex-col">
                    <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                                <table className="min-w-full divide-y divide-brand-navy-300">
                                    <thead className="bg-brand-navy-50">
                                        <tr>
                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brand-navy-900 sm:pl-6">Job ID</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Revenue</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Total Cost</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Profit</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Margin</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-brand-navy-200 bg-white">
                                        {jobCosting.map((job) => (
                                            <tr key={job.id}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-navy-900 sm:pl-6">{job.job_id.substring(0, 8)}...</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">${(job.total_revenue || 0).toFixed(2)}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-red-500">${(job.total_cost || 0).toFixed(2)}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-green-600">${(job.profit_amount || 0).toFixed(2)}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-brand-navy-600">{(job.profit_margin_percentage || 0).toFixed(1)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancialsPage;