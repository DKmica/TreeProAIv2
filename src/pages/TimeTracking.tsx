import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Calendar, DollarSign } from 'lucide-react';
import { TimeEntry, Timesheet, Employee } from '../../types';
import apiService from '../services/apiService';
import ClockInOut from '../components/ClockInOut';
import TimesheetApproval from '../components/TimesheetApproval';

type TabType = 'clock' | 'entries' | 'approval' | 'timesheets';

export default function TimeTracking() {
  const [activeTab, setActiveTab] = useState<TabType>('clock');
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (activeTab === 'entries' || activeTab === 'approval') {
      loadTimeEntries();
    } else if (activeTab === 'timesheets') {
      loadTimesheets();
    }
  }, [activeTab, selectedEmployee, dateRange]);

  const loadEmployees = async () => {
    try {
      const data = await apiService.getEmployees();
      setEmployees(data);
      if (data.length > 0) {
        setSelectedEmployee(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  const loadTimeEntries = async () => {
    try {
      setLoading(true);
      const params: any = {
        startDate: dateRange.start,
        endDate: dateRange.end
      };
      
      if (selectedEmployee) {
        params.employeeId = selectedEmployee;
      }
      
      if (activeTab === 'approval') {
        params.status = 'submitted';
      }
      
      const response = await fetch(`/api/time-entries?${new URLSearchParams(params)}`);
      const result = await response.json();
      
      if (result.success) {
        setTimeEntries(result.data);
      }
    } catch (err) {
      console.error('Failed to load time entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTimesheets = async () => {
    try {
      setLoading(true);
      const params: any = {
        startDate: dateRange.start,
        endDate: dateRange.end
      };
      
      if (selectedEmployee) {
        params.employeeId = selectedEmployee;
      }
      
      const response = await fetch(`/api/timesheets?${new URLSearchParams(params)}`);
      const result = await response.json();
      
      if (result.success) {
        setTimesheets(result.data);
      }
    } catch (err) {
      console.error('Failed to load timesheets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClockAction = () => {
    if (activeTab === 'entries') {
      loadTimeEntries();
    }
  };

  const formatDuration = (hours?: number) => {
    if (!hours) return '-';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0.00';
    return `$${amount.toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-gray-600 text-gray-200',
      submitted: 'bg-blue-600 text-white',
      approved: 'bg-green-600 text-white',
      rejected: 'bg-red-600 text-white'
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status as keyof typeof colors] || colors.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const tabs = [
    { id: 'clock' as TabType, label: 'Clock In/Out', icon: Clock },
    { id: 'entries' as TabType, label: 'My Entries', icon: Calendar },
    { id: 'approval' as TabType, label: 'Approve Entries', icon: CheckCircle },
    { id: 'timesheets' as TabType, label: 'Timesheets', icon: DollarSign }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Time Tracking</h1>
        <p className="text-gray-400">Manage employee time entries and timesheets</p>
      </div>

      <div className="mb-6 flex gap-2 border-b border-gray-700">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 flex items-center gap-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'clock' && (
        <ClockInOut 
          employees={employees}
          onClockAction={handleClockAction}
        />
      )}

      {activeTab === 'entries' && (
        <div>
          <div className="mb-4 flex gap-4 items-center">
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
            
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
            />
            
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
            />
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : timeEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No time entries found</div>
          ) : (
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Job</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Clock In</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Clock Out</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Hours</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {timeEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-gray-750">
                      <td className="px-4 py-3 text-white">{entry.employeeName}</td>
                      <td className="px-4 py-3 text-gray-300">
                        {entry.jobTitle ? (
                          <div>
                            <div className="text-sm">{entry.jobTitle}</div>
                            <div className="text-xs text-gray-500">{entry.jobClientName}</div>
                          </div>
                        ) : (
                          <span className="text-gray-500">No job</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {new Date(entry.clockIn).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {entry.clockOut ? new Date(entry.clockOut).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{formatDuration(entry.hoursWorked)}</td>
                      <td className="px-4 py-3 text-gray-300">{formatCurrency(entry.totalAmount)}</td>
                      <td className="px-4 py-3">{getStatusBadge(entry.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'approval' && (
        <TimesheetApproval
          timeEntries={timeEntries}
          onApprovalChange={loadTimeEntries}
        />
      )}

      {activeTab === 'timesheets' && (
        <div>
          <div className="mb-4 flex gap-4 items-center">
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
            
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
            />
            
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
            />
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : timesheets.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No timesheets found</div>
          ) : (
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Period</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Regular Hours</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">OT Hours</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Total Hours</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Approved By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {timesheets.map(sheet => (
                    <tr key={sheet.id} className="hover:bg-gray-750">
                      <td className="px-4 py-3 text-white">{sheet.employeeName}</td>
                      <td className="px-4 py-3 text-gray-300">
                        {new Date(sheet.periodStart).toLocaleDateString()} - {new Date(sheet.periodEnd).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{formatDuration(sheet.totalRegularHours)}</td>
                      <td className="px-4 py-3 text-gray-300">{formatDuration(sheet.totalOvertimeHours)}</td>
                      <td className="px-4 py-3 text-gray-300">{formatDuration(sheet.totalHours)}</td>
                      <td className="px-4 py-3">{getStatusBadge(sheet.status)}</td>
                      <td className="px-4 py-3 text-gray-300">{sheet.approverName || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
