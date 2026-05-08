import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Job, PayrollRecord, TimeEntry, PayPeriod, Equipment, AICoreInsights } from '../types';
import { payrollRecordService, timeEntryService, payPeriodService, equipmentService } from '../services/apiService';
import { getAiCoreInsights } from '../services/gemini/businessService';
import { useJobsQuery, useEmployeesQuery, useClientsQuery, useWorkOrderSummaryQuery } from '../hooks/useDataQueries';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import {
  CalendarCheck, Clock, DollarSign, TrendingUp, Sparkles,
  Users, Briefcase, AlertTriangle, RefreshCw, ChevronRight,
} from 'lucide-react';

async function apiFetch<T>(endpoint: string): Promise<T> {
  const response = await fetch(`/api/${endpoint}`);
  if (!response.ok) throw new Error('API Error');
  return response.json();
}

const statusColors: Record<string, string> = {
  scheduled:  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  en_route:   'bg-purple-500/20 text-purple-400 border-purple-500/30',
  on_site:    'bg-orange-500/20 text-orange-400 border-orange-500/30',
  in_progress:'bg-brand-cyan-500/20 text-brand-cyan-400 border-brand-cyan-500/30',
  completed:  'bg-green-500/20 text-green-400 border-green-500/30',
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: jobs = [], isLoading: jobsLoading } = useJobsQuery();
  const { data: employees = [], isLoading: employeesLoading } = useEmployeesQuery();
  const { data: workOrderSummary = [], isLoading: woSummaryLoading } = useWorkOrderSummaryQuery();
  const { data: customers = [] } = useClientsQuery();

  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [aiInsights, setAiInsights] = useState<AICoreInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<any>(null);

  const isLoading = jobsLoading || employeesLoading || woSummaryLoading;

  const activeJobs = useMemo(() =>
    jobs
      .filter(job => ['scheduled', 'en_route', 'on_site', 'in_progress'].includes(job.status))
      .sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || '')),
    [jobs]
  );

  const newLeadsCount = useMemo(() => {
    const s = workOrderSummary.find((s: any) => s.stage === 'lead');
    return s?.count || 0;
  }, [workOrderSummary]);

  const quotesSentCount = useMemo(() => {
    const s = workOrderSummary.find((s: any) => s.stage === 'quoting');
    return s?.count || 0;
  }, [workOrderSummary]);

  const activeJobsCount = useMemo(() =>
    jobs.filter(job => ['scheduled', 'en_route', 'on_site', 'in_progress'].includes(job.status)).length,
    [jobs]
  );

  const monthlyRevenue = useMemo(() => {
    if (dashboardSummary?.revenue?.totalPaid) return dashboardSummary.revenue.totalPaid;
    const now = new Date();
    return jobs
      .filter(job => {
        if (job.status !== 'completed' || !job.workEndedAt) return false;
        const d = new Date(job.workEndedAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, job) => sum + (job.costs?.total || 0), 0);
  }, [jobs, dashboardSummary]);

  useEffect(() => {
    const load = async () => {
      try {
        const [payrollData, timeData, payPeriodData, equipmentData, summary] = await Promise.all([
          payrollRecordService.getAll().catch(() => []),
          timeEntryService.getAll().catch(() => []),
          payPeriodService.getAll().catch(() => []),
          equipmentService.getAll().catch(() => []),
          apiFetch<any>('dashboard/summary').catch(() => null),
        ]);
        setPayrollRecords(payrollData);
        setTimeEntries(timeData);
        setPayPeriods(payPeriodData);
        setEquipment(equipmentData);
        if (summary) setDashboardSummary(summary.data);
      } catch (e) {
        console.error('Dashboard load error', e);
      }
    };
    load();
  }, []);

  const fetchAiInsights = async () => {
    if (isLoading) return;
    setLoadingInsights(true);
    setInsightsError(null);
    try {
      const [leadsData, quotesData] = await Promise.all([
        apiFetch<any[]>('leads').catch(() => []),
        apiFetch<any[]>('quotes').catch(() => []),
      ]);
      const insights = await getAiCoreInsights(
        leadsData || [], jobs, quotesData || [], employees,
        equipment, payrollRecords, timeEntries, payPeriods
      );
      setAiInsights(insights);
    } catch (error: any) {
      setInsightsError(error.message || 'Failed to load AI insights');
    } finally {
      setLoadingInsights(false);
    }
  };

  const stats = [
    {
      title: 'New Leads',
      value: newLeadsCount,
      icon: Users,
      change: 'incoming opportunities',
      href: '/leads',
      color: 'text-blue-400',
    },
    {
      title: 'Quotes Sent',
      value: quotesSentCount,
      icon: TrendingUp,
      change: 'awaiting responses',
      href: '/quotes',
      color: 'text-yellow-400',
    },
    {
      title: 'Active Jobs',
      value: activeJobsCount,
      icon: Briefcase,
      change: 'crews working today',
      href: '/jobs',
      color: 'text-brand-cyan-400',
    },
    {
      title: 'Revenue (Month)',
      value: `$${monthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      change: 'collected this month',
      href: '/invoicing',
      color: 'text-green-400',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-brand-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-brand-gray-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <button
            key={stat.title}
            onClick={() => navigate(stat.href)}
            className="text-left group"
          >
            <Card className="hover:border-brand-gray-600 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color} flex-shrink-0`} />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold text-white`}>{stat.value}</div>
                <p className="text-xs text-brand-gray-500 mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-white font-semibold text-base">Today's Schedule</CardTitle>
              <button
                onClick={() => navigate('/calendar')}
                className="flex items-center gap-1 text-xs text-brand-cyan-400 hover:text-brand-cyan-300 transition-colors"
              >
                View calendar <ChevronRight className="h-3 w-3" />
              </button>
            </CardHeader>
            <CardContent>
              {activeJobs.length === 0 ? (
                <div className="text-center py-10 text-brand-gray-500">
                  <CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No active jobs scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeJobs.slice(0, 6).map((job) => (
                    <div
                      key={job.id}
                      onClick={() => navigate(`/jobs`)}
                      className="flex items-center justify-between p-3 rounded-lg bg-brand-gray-900/50 border border-brand-gray-700/50 hover:border-brand-gray-600 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <div className="font-medium text-white text-sm truncate">
                            {(job as any).customerName || (job as any).client_name || 'Client'}
                          </div>
                          <div className="text-xs text-brand-gray-400 truncate">
                            {(job as any).title || (job as any).serviceType || 'Tree Service'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        {job.scheduledDate && (
                          <span className="text-xs text-brand-gray-500 hidden sm:block">
                            {new Date(job.scheduledDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[job.status] || 'bg-brand-gray-700 text-brand-gray-300 border-brand-gray-600'}`}>
                          {job.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                  {activeJobs.length > 6 && (
                    <button
                      onClick={() => navigate('/jobs')}
                      className="w-full text-xs text-brand-cyan-400 hover:text-brand-cyan-300 py-2 text-center transition-colors"
                    >
                      +{activeJobs.length - 6} more jobs — view all
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-white font-semibold text-base">Pipeline</CardTitle>
              <button onClick={() => navigate('/work-orders')} className="text-xs text-brand-cyan-400 hover:text-brand-cyan-300 transition-colors flex items-center gap-1">
                View all <ChevronRight className="h-3 w-3" />
              </button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {workOrderSummary.length === 0 ? (
                  <p className="text-sm text-brand-gray-500 text-center py-4">No pipeline data</p>
                ) : (
                  workOrderSummary.slice(0, 5).map((stage: any) => (
                    <div key={stage.stage} className="flex items-center justify-between">
                      <span className="text-sm text-brand-gray-300 capitalize">{stage.stage.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{stage.count}</span>
                        {stage.totalValue > 0 && (
                          <span className="text-xs text-brand-gray-500">${Number(stage.totalValue).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white font-semibold text-base">
                <Sparkles className="h-4 w-4 text-brand-cyan-400" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingInsights ? (
                <div className="flex items-center gap-2 py-4 justify-center">
                  <RefreshCw className="h-4 w-4 text-brand-cyan-400 animate-spin" />
                  <span className="text-sm text-brand-gray-400">Loading...</span>
                </div>
              ) : insightsError ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-400 text-xs">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>{insightsError}</span>
                  </div>
                  <button onClick={fetchAiInsights} className="text-xs text-brand-cyan-400 hover:text-brand-cyan-300 underline">Try again</button>
                </div>
              ) : aiInsights ? (
                <div className="space-y-3">
                  <p className="text-sm text-brand-gray-300 leading-relaxed">{aiInsights.businessSummary}</p>
                  {aiInsights.leadScores && aiInsights.leadScores.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-brand-gray-500 mb-1.5">Top Leads</p>
                      {aiInsights.leadScores.slice(0, 2).map((lead, i) => (
                        <div key={i} className="flex items-center justify-between py-1">
                          <span className="text-xs text-brand-gray-300 truncate">{lead.customerName}</span>
                          <span className="text-xs px-1.5 py-0.5 bg-brand-cyan-500/20 text-brand-cyan-400 rounded-full ml-2 flex-shrink-0">
                            {lead.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-brand-gray-500 mb-3">AI-powered business insights and recommendations</p>
                  <button
                    onClick={fetchAiInsights}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-cyan-600/20 text-brand-cyan-400 border border-brand-cyan-500/30 rounded-lg hover:bg-brand-cyan-600/30 transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Load Insights
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {aiInsights && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-white font-semibold text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-cyan-400" />
                Business Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-brand-gray-900/50 border border-brand-gray-700/50">
                  <p className="text-xs font-medium text-brand-gray-400 mb-1">Business Summary</p>
                  <p className="text-sm text-brand-gray-200">{aiInsights.businessSummary}</p>
                </div>
                {aiInsights.maintenanceAlerts && aiInsights.maintenanceAlerts.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs font-medium text-amber-400 mb-1.5 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Equipment Alerts
                    </p>
                    {aiInsights.maintenanceAlerts.slice(0, 2).map((alert, i) => (
                      <p key={i} className="text-xs text-brand-gray-300">{alert.equipmentName}: {alert.recommendedAction}</p>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {aiInsights.leadScores && aiInsights.leadScores.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-white font-semibold text-base">Priority Leads</CardTitle>
                <button onClick={() => navigate('/leads')} className="text-xs text-brand-cyan-400 hover:text-brand-cyan-300 flex items-center gap-1">
                  View leads <ChevronRight className="h-3 w-3" />
                </button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {aiInsights.leadScores.slice(0, 5).map((lead, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-brand-gray-900/50 border border-brand-gray-700/50">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">{lead.customerName}</div>
                        {(lead as any).reasoning && (
                          <div className="text-xs text-brand-gray-400 truncate">{(lead as any).reasoning}</div>
                        )}
                      </div>
                      <span className="ml-3 flex-shrink-0 text-xs px-2 py-0.5 bg-brand-cyan-500/20 text-brand-cyan-400 border border-brand-cyan-500/30 rounded-full font-medium">
                        {lead.score}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
