import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Briefcase, 
  Target, Download, Calendar, Filter, RefreshCw
} from 'lucide-react';
import { analyticsService, type SalesFunnelMetrics, type DashboardKPIs, type RevenueTrendItem, type RevenueByServiceData } from '../services/apiService';

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const dateRangeOptions = [
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
  { value: 'quarter', label: 'Last 90 Days' },
  { value: 'year', label: 'Last Year' },
  { value: 'all', label: 'All Time' },
];

function getDateRange(range: string): { startDate?: string; endDate?: string } {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  
  switch (range) {
    case 'week':
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: weekAgo.toISOString().split('T')[0], endDate };
    case 'month':
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: monthAgo.toISOString().split('T')[0], endDate };
    case 'quarter':
      const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { startDate: quarterAgo.toISOString().split('T')[0], endDate };
    case 'year':
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      return { startDate: yearAgo.toISOString().split('T')[0], endDate };
    default:
      return {};
  }
}

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
}

function KPICard({ title, value, change, icon, color }: KPICardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function Reports() {
  const [dateRange, setDateRange] = useState('month');
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'revenue' | 'crew' | 'equipment'>('overview');
  
  const dateParams = useMemo(() => getDateRange(dateRange), [dateRange]);

  const { data: kpis, isLoading: kpisLoading, refetch: refetchKPIs } = useQuery({
    queryKey: ['dashboard-kpis', dateParams],
    queryFn: () => analyticsService.getDashboardKPIs(dateParams),
    staleTime: 5 * 60 * 1000,
  });

  const { data: salesFunnel, isLoading: funnelLoading } = useQuery({
    queryKey: ['sales-funnel', dateParams],
    queryFn: () => analyticsService.getSalesFunnel(dateParams),
    staleTime: 5 * 60 * 1000,
  });

  const { data: revenueTrend, isLoading: trendLoading } = useQuery({
    queryKey: ['revenue-trend', dateParams],
    queryFn: () => analyticsService.getRevenueTrend({ ...dateParams, groupBy: 'month' }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: revenueByService, isLoading: serviceLoading } = useQuery({
    queryKey: ['revenue-by-service', dateParams],
    queryFn: () => analyticsService.getRevenueByService(dateParams),
    staleTime: 5 * 60 * 1000,
  });

  const { data: crewProductivity, isLoading: crewLoading } = useQuery({
    queryKey: ['crew-productivity', dateParams],
    queryFn: () => analyticsService.getCrewProductivity(dateParams),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === 'crew' || activeTab === 'overview',
  });

  const { data: equipmentUtilization, isLoading: equipmentLoading } = useQuery({
    queryKey: ['equipment-utilization', dateParams],
    queryFn: () => analyticsService.getEquipmentUtilization(dateParams),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === 'equipment' || activeTab === 'overview',
  });

  const { data: jobProfitability, isLoading: profitLoading } = useQuery({
    queryKey: ['job-profitability', dateParams],
    queryFn: () => analyticsService.getJobProfitability(dateParams),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === 'overview' || activeTab === 'revenue',
  });

  const isLoading = kpisLoading || funnelLoading || trendLoading || serviceLoading;

  const funnelChartData = useMemo(() => {
    if (!salesFunnel) return [];
    return [
      { name: 'Leads', value: salesFunnel.totalLeads, fill: COLORS[0] },
      { name: 'Qualified', value: salesFunnel.qualifiedLeads, fill: COLORS[1] },
      { name: 'Quotes Sent', value: salesFunnel.sentQuotes, fill: COLORS[2] },
      { name: 'Accepted', value: salesFunnel.acceptedQuotes, fill: COLORS[3] },
      { name: 'Converted', value: salesFunnel.convertedQuotes, fill: COLORS[4] },
    ];
  }, [salesFunnel]);

  const serviceChartData = useMemo(() => {
    if (!revenueByService?.services) return [];
    return revenueByService.services.map((s, i) => ({
      name: s.serviceType,
      revenue: s.totalRevenue,
      collected: s.collectedRevenue,
      fill: COLORS[i % COLORS.length],
    }));
  }, [revenueByService]);

  const handleExportCSV = () => {
    if (!jobProfitability?.jobs) return;
    
    const headers = ['Job Number', 'Customer', 'Completed', 'Quote Amount', 'Total Cost', 'Profit', 'Margin %'];
    const rows = jobProfitability.jobs.map(j => [
      j.jobNumber,
      j.customerName,
      new Date(j.completedAt).toLocaleDateString(),
      j.quoteAmount.toFixed(2),
      j.totalCost.toFixed(2),
      j.profit.toFixed(2),
      j.profitMargin.toFixed(1)
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-profitability-${dateRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'sales', label: 'Sales Funnel' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'crew', label: 'Crew' },
    { id: 'equipment', label: 'Equipment' },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Business Reports</h1>
            <p className="text-gray-500 mt-1">Track performance and make data-driven decisions</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white text-sm font-medium text-gray-700 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                {dateRangeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            
            <button
              onClick={() => refetchKPIs()}
              className="p-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {(activeTab === 'overview' || activeTab === 'sales') && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KPICard
                title="Total Invoiced"
                value={formatCurrency(kpis?.totalInvoiced || 0)}
                icon={<DollarSign className="w-5 h-5 text-white" />}
                color="bg-green-500"
              />
              <KPICard
                title="Win Rate"
                value={`${kpis?.winRate || 0}%`}
                icon={<Target className="w-5 h-5 text-white" />}
                color="bg-cyan-500"
              />
              <KPICard
                title="Jobs Completed"
                value={kpis?.jobsCompleted || 0}
                icon={<Briefcase className="w-5 h-5 text-white" />}
                color="bg-purple-500"
              />
              <KPICard
                title="Outstanding Balance"
                value={formatCurrency(kpis?.outstandingBalance || 0)}
                icon={<DollarSign className="w-5 h-5 text-white" />}
                color="bg-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Funnel</h3>
                {funnelLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={funnelChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {funnelChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
                {salesFunnel && (
                  <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{salesFunnel.leadQualificationRate}%</p>
                      <p className="text-xs text-gray-500">Lead Qualification</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{salesFunnel.quoteAcceptanceRate}%</p>
                      <p className="text-xs text-gray-500">Quote Acceptance</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{salesFunnel.quoteConversionRate}%</p>
                      <p className="text-xs text-gray-500">Quote Conversion</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Service Type</h3>
                {serviceLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : serviceChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={serviceChartData}
                        dataKey="revenue"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {serviceChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    No revenue data for selected period
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {(activeTab === 'overview' || activeTab === 'revenue') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
            {trendLoading ? (
              <div className="h-64 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : revenueTrend && revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="totalInvoiced" 
                    name="Invoiced"
                    stroke="#0ea5e9" 
                    strokeWidth={2}
                    dot={{ fill: '#0ea5e9', strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="totalPaid" 
                    name="Collected"
                    stroke="#22c55e" 
                    strokeWidth={2}
                    dot={{ fill: '#22c55e', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No revenue trend data for selected period
              </div>
            )}
          </div>
        )}

        {activeTab === 'revenue' && jobProfitability && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Job Profitability</h3>
              <div className="grid grid-cols-4 gap-6 text-center">
                <div>
                  <p className="text-xl font-bold text-gray-900">{jobProfitability.summary.totalJobs}</p>
                  <p className="text-xs text-gray-500">Jobs</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(jobProfitability.summary.totalRevenue)}</p>
                  <p className="text-xs text-gray-500">Revenue</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-cyan-600">{formatCurrency(jobProfitability.summary.totalProfit)}</p>
                  <p className="text-xs text-gray-500">Profit</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-purple-600">{jobProfitability.summary.avgProfitMargin}%</p>
                  <p className="text-xs text-gray-500">Avg Margin</p>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Job</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Quote</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Cost</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Profit</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {jobProfitability.jobs.slice(0, 10).map((job) => (
                    <tr key={job.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{job.jobNumber}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{job.customerName}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-900">{formatCurrency(job.quoteAmount)}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600">{formatCurrency(job.totalCost)}</td>
                      <td className={`py-3 px-4 text-sm text-right font-medium ${job.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(job.profit)}
                      </td>
                      <td className={`py-3 px-4 text-sm text-right font-medium ${job.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {job.profitMargin.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'crew' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Crew Productivity</h3>
            
            {crewLoading ? (
              <div className="h-64 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : crewProductivity ? (
              <>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{crewProductivity.summary.totalEmployees}</p>
                    <p className="text-sm text-gray-500">Active Crew</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-cyan-600">{crewProductivity.summary.totalHours}</p>
                    <p className="text-sm text-gray-500">Total Hours</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{crewProductivity.summary.totalJobsCompleted}</p>
                    <p className="text-sm text-gray-500">Jobs Completed</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">{crewProductivity.summary.avgHoursPerEmployee}</p>
                    <p className="text-sm text-gray-500">Avg Hours/Employee</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Hours</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Jobs</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Avg Hrs/Job</th>
                      </tr>
                    </thead>
                    <tbody>
                      {crewProductivity.employees.map((emp) => (
                        <tr key={emp.employeeId} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm font-medium text-gray-900">{emp.employeeName}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{emp.role || '-'}</td>
                          <td className="py-3 px-4 text-sm text-right text-gray-900">{emp.totalHours}</td>
                          <td className="py-3 px-4 text-sm text-right text-gray-900">{emp.jobsCompleted}</td>
                          <td className="py-3 px-4 text-sm text-right text-gray-600">{emp.avgHoursPerJob}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No crew productivity data for selected period
              </div>
            )}
          </div>
        )}

        {activeTab === 'equipment' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Equipment Utilization</h3>
            
            {equipmentLoading ? (
              <div className="h-64 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : equipmentUtilization ? (
              <>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{equipmentUtilization.summary.totalEquipment}</p>
                    <p className="text-sm text-gray-500">Total Equipment</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-cyan-600">{equipmentUtilization.summary.activeEquipment}</p>
                    <p className="text-sm text-gray-500">Active Equipment</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{equipmentUtilization.summary.utilizationRate}%</p>
                    <p className="text-sm text-gray-500">Utilization Rate</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">{equipmentUtilization.summary.totalHoursUsed}</p>
                    <p className="text-sm text-gray-500">Total Hours Used</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Equipment</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Hours Used</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Jobs</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Last Used</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipmentUtilization.equipment.map((eq) => (
                        <tr key={eq.equipmentId} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm font-medium text-gray-900">{eq.equipmentName}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{eq.equipmentType || '-'}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              eq.status === 'available' ? 'bg-green-100 text-green-800' :
                              eq.status === 'in_use' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {eq.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-right text-gray-900">{eq.totalHoursUsed}</td>
                          <td className="py-3 px-4 text-sm text-right text-gray-900">{eq.jobsUsedOn}</td>
                          <td className="py-3 px-4 text-sm text-right text-gray-600">
                            {eq.lastUsed ? new Date(eq.lastUsed).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No equipment utilization data for selected period
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
