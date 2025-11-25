import React from 'react';
import { Job, Quote, LineItem } from '../types';
import { useJobsQuery, useQuotesQuery } from '../hooks/useDataQueries';

const calculateQuoteTotal = (lineItems: LineItem[], stumpGrindingPrice: number): number => {
    const itemsTotal = lineItems.reduce((sum, item) => item.selected ? sum + item.price : sum, 0);
    return itemsTotal + (stumpGrindingPrice || 0);
};

const Profitability: React.FC = () => {
    const { data: jobs = [], isLoading: jobsLoading } = useJobsQuery();
    const { data: quotes = [], isLoading: quotesLoading } = useQuotesQuery();

    const isLoading = jobsLoading || quotesLoading;

    const completedJobsWithCosts = jobs.filter(job => job.status === 'Completed' && job.costs);

    const profitabilityData = completedJobsWithCosts.map(job => {
        const quote = quotes.find(q => q.id === job.quoteId);
        if (!quote || !job.costs) return null;

        const quoteAmount = calculateQuoteTotal(quote.lineItems, quote.stumpGrindingPrice || 0);
        const totalCost = job.costs.total;
        const profit = quoteAmount - totalCost;
        const profitMargin = quoteAmount > 0 ? (profit / quoteAmount) * 100 : 0;

        return {
            jobId: job.id,
            customerName: job.customerName,
            quoteAmount,
            totalCost,
            profit,
            profitMargin,
        };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    const totalProfit = profitabilityData.reduce((sum, item) => sum + item.profit, 0);
    const totalRevenue = profitabilityData.reduce((sum, item) => sum + item.quoteAmount, 0);
    const avgProfit = profitabilityData.length > 0 ? totalProfit / profitabilityData.length : 0;
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const kpis = [
        { name: 'Total Profit', value: `$${totalProfit.toFixed(2)}` },
        { name: 'Average Profit Per Job', value: `$${avgProfit.toFixed(2)}` },
        { name: 'Average Profit Margin', value: `${avgMargin.toFixed(2)}%` },
        { name: 'Completed Jobs Analyzed', value: profitabilityData.length },
    ];

    const getProfitColor = (value: number) => value >= 0 ? 'text-green-600' : 'text-red-600';

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-2xl font-bold text-brand-gray-900">Profitability Analytics</h1>
            <p className="mt-2 text-sm text-brand-gray-700">Analyze the financial performance of completed jobs.</p>
            
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {kpis.map(kpi => (
                    <div key={kpi.name} className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                        <dt className="truncate text-sm font-medium text-brand-gray-500">{kpi.name}</dt>
                        <dd className={`mt-1 text-3xl font-semibold tracking-tight ${kpi.name === 'Total Profit' ? getProfitColor(totalProfit) : 'text-brand-gray-900'}`}>{kpi.value}</dd>
                    </div>
                ))}
            </div>

            <div className="hidden lg:block mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-brand-gray-300">
                                <thead className="bg-brand-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brand-gray-900 sm:pl-6">Job ID</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Customer</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Quoted Amount</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Total Cost</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Profit</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Profit Margin</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-gray-200 bg-white">
                                    {profitabilityData.length > 0 ? profitabilityData.map((item) => (
                                        <tr key={item.jobId}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-gray-900 sm:pl-6">{item.jobId}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{item.customerName}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">${item.quoteAmount.toFixed(2)}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">${item.totalCost.toFixed(2)}</td>
                                            <td className={`whitespace-nowrap px-3 py-4 text-sm font-semibold ${getProfitColor(item.profit)}`}>${item.profit.toFixed(2)}</td>
                                            <td className={`whitespace-nowrap px-3 py-4 text-sm font-semibold ${getProfitColor(item.profitMargin)}`}>{item.profitMargin.toFixed(2)}%</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="text-center py-10 text-brand-gray-500">
                                                No completed jobs with cost data to analyze.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:hidden mt-8 space-y-4">
                {profitabilityData.length > 0 ? profitabilityData.map((item) => (
                    <div key={item.jobId} className="bg-white rounded-lg shadow p-4 border border-brand-gray-200">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h3 className="text-sm font-medium text-brand-gray-900">Job #{item.jobId}</h3>
                                <p className="text-sm text-brand-gray-500">{item.customerName}</p>
                            </div>
                            <span className={`text-lg font-bold ${getProfitColor(item.profitMargin)}`}>
                                {item.profitMargin.toFixed(1)}%
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-brand-gray-500">Quoted:</span>
                                <p className="font-semibold text-brand-gray-900">${item.quoteAmount.toFixed(2)}</p>
                            </div>
                            <div>
                                <span className="text-brand-gray-500">Cost:</span>
                                <p className="font-semibold text-brand-gray-900">${item.totalCost.toFixed(2)}</p>
                            </div>
                            <div className="col-span-2">
                                <span className="text-brand-gray-500">Profit:</span>
                                <p className={`text-lg font-bold ${getProfitColor(item.profit)}`}>
                                    ${item.profit.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-10 bg-white rounded-lg shadow">
                        <p className="text-brand-gray-500">No completed jobs with cost data to analyze.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profitability;
