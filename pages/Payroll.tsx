import React, { useState, useEffect, useMemo } from 'react';
import { PayPeriod, TimeEntry, PayrollRecord, Employee, Job } from '../types';
import { payPeriodService, timeEntryService, payrollRecordService, employeeService, jobService } from '../services/apiService';

const Payroll: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'periods' | 'entries' | 'records'>('periods');
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showTimeEntryModal, setShowTimeEntryModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);

  const [filterPayPeriod, setFilterPayPeriod] = useState<string>('');
  const [filterEmployee, setFilterEmployee] = useState<string>('');
  const [processingPayroll, setProcessingPayroll] = useState(false);

  const [periodForm, setPeriodForm] = useState({
    startDate: '',
    endDate: '',
    periodType: 'bi-weekly' as 'weekly' | 'bi-weekly' | 'monthly'
  });

  const [timeEntryForm, setTimeEntryForm] = useState({
    employeeId: '',
    jobId: '',
    date: new Date().toISOString().split('T')[0],
    regularHours: '',
    overtimeHours: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [periodsData, entriesData, recordsData, employeesData, jobsData] = await Promise.all([
        payPeriodService.getAll(),
        timeEntryService.getAll(),
        payrollRecordService.getAll(),
        employeeService.getAll(),
        jobService.getAll()
      ]);
      setPayPeriods(periodsData);
      setTimeEntries(entriesData);
      setPayrollRecords(recordsData);
      setEmployees(employeesData);
      setJobs(jobsData);
    } catch (error) {
      console.error('Error fetching payroll data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusBadgeClass = (status: PayPeriod['status']) => {
    switch (status) {
      case 'Open':
        return 'bg-green-100 text-green-800';
      case 'Processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'Closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const selectedEmployee = useMemo(() => {
    return employees.find(emp => emp.id === timeEntryForm.employeeId);
  }, [employees, timeEntryForm.employeeId]);

  const totalPayPreview = useMemo(() => {
    if (!selectedEmployee) return 0;
    const regular = parseFloat(timeEntryForm.regularHours || '0') * selectedEmployee.payRate;
    const overtime = parseFloat(timeEntryForm.overtimeHours || '0') * (selectedEmployee.payRate * 1.5);
    return regular + overtime;
  }, [selectedEmployee, timeEntryForm.regularHours, timeEntryForm.overtimeHours]);

  const handleCreatePayPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newPeriod = await payPeriodService.create({
        ...periodForm,
        status: 'Open',
        createdAt: new Date().toISOString()
      });
      setPayPeriods([...payPeriods, newPeriod]);
      setShowPeriodModal(false);
      setPeriodForm({ startDate: '', endDate: '', periodType: 'bi-weekly' });
    } catch (error) {
      console.error('Error creating pay period:', error);
      alert('Failed to create pay period');
    }
  };

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) {
      alert('Please select an employee');
      return;
    }
    try {
      const totalHours = parseFloat(timeEntryForm.regularHours || '0') + parseFloat(timeEntryForm.overtimeHours || '0');
      const overtimeHours = parseFloat(timeEntryForm.overtimeHours || '0') || undefined;
      const clockInIso = new Date(`${timeEntryForm.date}T08:00:00Z`).toISOString();

      const newEntry = await timeEntryService.create({
        employeeId: timeEntryForm.employeeId,
        jobId: timeEntryForm.jobId || undefined,
        clockIn: clockInIso,
        hoursWorked: totalHours,
        hourlyRate: selectedEmployee.payRate,
        overtimeHours,
        notes: timeEntryForm.notes || undefined,
        status: 'submitted',
        createdAt: new Date().toISOString()
      });
      setTimeEntries([...timeEntries, newEntry]);
      setShowTimeEntryModal(false);
      setTimeEntryForm({
        employeeId: '',
        jobId: '',
        date: new Date().toISOString().split('T')[0],
        regularHours: '',
        overtimeHours: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error logging time:', error);
      alert('Failed to log time entry');
    }
  };

  const handleProcessPayroll = async (periodId: string) => {
    if (!window.confirm('Are you sure you want to process payroll for this period?')) return;
    
    setProcessingPayroll(true);
    try {
      const response = await payPeriodService.process(periodId);
      
      setPayPeriods(payPeriods.map(p => 
        p.id === periodId ? response.payPeriod : p
      ));
      
      setPayrollRecords([...payrollRecords, ...response.payrollRecords]);
      
      const totalAmount = response.payrollRecords.reduce((sum, record) => sum + record.netPay, 0);
      const employeeCount = response.payrollRecords.length;
      
      alert(`✓ Processed payroll for ${employeeCount} employee${employeeCount !== 1 ? 's' : ''}. Total: ${formatCurrency(totalAmount)}`);
      
      setActiveTab('records');
    } catch (error) {
      console.error('Error processing payroll:', error);
      alert(`Failed to process payroll: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessingPayroll(false);
    }
  };

  const handleMarkAsPaid = async (recordId: string) => {
    try {
      await payrollRecordService.update(recordId, {
        paidAt: new Date().toISOString()
      });
      setPayrollRecords(payrollRecords.map(r => 
        r.id === recordId ? { ...r, paidAt: new Date().toISOString() } : r
      ));
      if (selectedRecord?.id === recordId) {
        setSelectedRecord({ ...selectedRecord, paidAt: new Date().toISOString() });
      }
    } catch (error) {
      console.error('Error marking as paid:', error);
      alert('Failed to mark as paid');
    }
  };

  const filteredRecords = useMemo(() => {
    return payrollRecords.filter(record => {
      if (filterPayPeriod && record.payPeriodId !== filterPayPeriod) return false;
      if (filterEmployee && record.employeeId !== filterEmployee) return false;
      return true;
    });
  }, [payrollRecords, filterPayPeriod, filterEmployee]);

  const getEmployeeName = (employeeId: string): string => {
    return employees.find(emp => emp.id === employeeId)?.name || 'Unknown';
  };

  const getJobName = (jobId?: string): string => {
    if (!jobId) return 'General';
    return jobs.find(job => job.id === jobId)?.customerName || 'Unknown Job';
  };

  const getPayPeriodLabel = (periodId: string): string => {
    const period = payPeriods.find(p => p.id === periodId);
    if (!period) return 'Unknown';
    return `${formatDate(period.startDate)} - ${formatDate(period.endDate)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-brand-gray-600">Loading payroll data...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-gray-900">Payroll Management</h1>
      <p className="mt-2 text-brand-gray-600">Manage pay periods, time entries, and payroll records.</p>

      <div className="mt-6">
        <div className="border-b border-brand-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('periods')}
              className={`${
                activeTab === 'periods'
                  ? 'border-brand-cyan-500 text-brand-cyan-600'
                  : 'border-transparent text-brand-gray-500 hover:border-brand-gray-300 hover:text-brand-gray-700'
              } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors`}
            >
              Pay Periods
            </button>
            <button
              onClick={() => setActiveTab('entries')}
              className={`${
                activeTab === 'entries'
                  ? 'border-brand-cyan-500 text-brand-cyan-600'
                  : 'border-transparent text-brand-gray-500 hover:border-brand-gray-300 hover:text-brand-gray-700'
              } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors`}
            >
              Time Entries
            </button>
            <button
              onClick={() => setActiveTab('records')}
              className={`${
                activeTab === 'records'
                  ? 'border-brand-cyan-500 text-brand-cyan-600'
                  : 'border-transparent text-brand-gray-500 hover:border-brand-gray-300 hover:text-brand-gray-700'
              } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors`}
            >
              Payroll Records
            </button>
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === 'periods' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-brand-gray-900">Pay Periods</h2>
                <button
                  onClick={() => setShowPeriodModal(true)}
                  className="rounded-md bg-brand-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2"
                >
                  Create Pay Period
                </button>
              </div>

              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-brand-gray-200">
                  <thead className="bg-brand-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Start Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">End Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-brand-gray-200">
                    {payPeriods.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-brand-gray-500">
                          No pay periods found. Create one to get started.
                        </td>
                      </tr>
                    ) : (
                      payPeriods.map(period => (
                        <tr key={period.id} className="hover:bg-brand-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-900">
                            {formatDate(period.startDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-900">
                            {formatDate(period.endDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-900 capitalize">
                            {period.periodType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(period.status)}`}>
                              {period.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {period.status === 'Open' && (
                              <button
                                onClick={() => handleProcessPayroll(period.id)}
                                disabled={processingPayroll}
                                className={`font-medium mr-4 ${processingPayroll ? 'text-brand-gray-400 cursor-not-allowed' : 'text-brand-cyan-600 hover:text-brand-cyan-900'}`}
                              >
                                {processingPayroll ? 'Processing...' : 'Process Payroll'}
                              </button>
                            )}
                            <button className="text-brand-gray-600 hover:text-brand-gray-900 font-medium">
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'entries' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-brand-gray-900">Time Entries</h2>
                <button
                  onClick={() => setShowTimeEntryModal(true)}
                  className="rounded-md bg-brand-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2"
                >
                  Log Time
                </button>
              </div>

              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-brand-gray-200">
                  <thead className="bg-brand-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Job</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Total Pay</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-brand-gray-200">
                    {timeEntries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-brand-gray-500">
                          No time entries found. Log time to get started.
                        </td>
                      </tr>
                    ) : (
                      timeEntries.map(entry => {
                        const regularHours = (entry.hoursWorked || 0) - (entry.overtimeHours || 0);
                        const regularPay = regularHours * entry.hourlyRate;
                        const overtimePay = (entry.overtimeHours || 0) * (entry.hourlyRate * 1.5);
                        const totalPay = regularPay + overtimePay;
                        
                        return (
                          <tr key={entry.id} className="hover:bg-brand-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-gray-900">
                              {getEmployeeName(entry.employeeId)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-900">
                              {getJobName(entry.jobId)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-900">
                              {entry.clockIn ? formatDate(entry.clockIn) : (entry.createdAt ? formatDate(entry.createdAt) : '—')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-900">
                              {entry.hoursWorked}h
                              {entry.overtimeHours ? ` (${entry.overtimeHours}h OT)` : ''}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-900">
                              {formatCurrency(entry.hourlyRate)}/hr
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-gray-900">
                              {formatCurrency(totalPay)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'records' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-brand-gray-900">Payroll Records</h2>
                <div className="flex gap-4">
                  <select
                    value={filterPayPeriod}
                    onChange={(e) => setFilterPayPeriod(e.target.value)}
                    className="rounded-md border-brand-gray-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 text-sm"
                  >
                    <option value="">All Pay Periods</option>
                    {payPeriods.map(period => (
                      <option key={period.id} value={period.id}>
                        {getPayPeriodLabel(period.id)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filterEmployee}
                    onChange={(e) => setFilterEmployee(e.target.value)}
                    className="rounded-md border-brand-gray-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 text-sm"
                  >
                    <option value="">All Employees</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-brand-gray-200">
                  <thead className="bg-brand-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Pay Period</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Gross Pay</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Deductions</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Net Pay</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-brand-gray-200">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-brand-gray-500">
                          No payroll records found.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map(record => (
                        <tr 
                          key={record.id} 
                          className="hover:bg-brand-gray-50 cursor-pointer"
                          onClick={() => setSelectedRecord(record)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-gray-900">
                            {getEmployeeName(record.employeeId)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-900">
                            {getPayPeriodLabel(record.payPeriodId)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-900">
                            {formatCurrency(record.grossPay)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-900">
                            {formatCurrency(record.totalDeductions)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-gray-900">
                            {formatCurrency(record.netPay)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              record.paidAt ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {record.paidAt ? 'Paid' : 'Unpaid'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {!record.paidAt && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsPaid(record.id);
                                }}
                                className="text-brand-cyan-600 hover:text-brand-cyan-900 font-medium"
                              >
                                Mark as Paid
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPeriodModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-brand-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowPeriodModal(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-brand-gray-900 mb-4">Create Pay Period</h3>
              <form onSubmit={handleCreatePayPeriod}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Start Date</label>
                    <input
                      type="date"
                      required
                      value={periodForm.startDate}
                      onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
                      className="mt-1 block w-full rounded-md border-brand-gray-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700">End Date</label>
                    <input
                      type="date"
                      required
                      value={periodForm.endDate}
                      onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
                      className="mt-1 block w-full rounded-md border-brand-gray-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Period Type</label>
                    <select
                      value={periodForm.periodType}
                      onChange={(e) => setPeriodForm({ ...periodForm, periodType: e.target.value as 'weekly' | 'bi-weekly' | 'monthly' })}
                      className="mt-1 block w-full rounded-md border-brand-gray-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="bi-weekly">Bi-Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPeriodModal(false)}
                    className="rounded-md border border-brand-gray-300 bg-white px-4 py-2 text-sm font-medium text-brand-gray-700 hover:bg-brand-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-brand-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2"
                  >
                    Create Period
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showTimeEntryModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-brand-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowTimeEntryModal(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-brand-gray-900 mb-4">Log Time Entry</h3>
              <form onSubmit={handleLogTime}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Employee *</label>
                    <select
                      required
                      value={timeEntryForm.employeeId}
                      onChange={(e) => setTimeEntryForm({ ...timeEntryForm, employeeId: e.target.value })}
                      className="mt-1 block w-full rounded-md border-brand-gray-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm"
                    >
                      <option value="">Select Employee</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} - {formatCurrency(emp.payRate)}/hr
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Job (Optional)</label>
                    <select
                      value={timeEntryForm.jobId}
                      onChange={(e) => setTimeEntryForm({ ...timeEntryForm, jobId: e.target.value })}
                      className="mt-1 block w-full rounded-md border-brand-gray-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm"
                    >
                      <option value="">General</option>
                      {jobs.map(job => (
                        <option key={job.id} value={job.id}>
                          {job.customerName} - {job.id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Date *</label>
                    <input
                      type="date"
                      required
                      value={timeEntryForm.date}
                      onChange={(e) => setTimeEntryForm({ ...timeEntryForm, date: e.target.value })}
                      className="mt-1 block w-full rounded-md border-brand-gray-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Regular Hours *</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      required
                      value={timeEntryForm.regularHours}
                      onChange={(e) => setTimeEntryForm({ ...timeEntryForm, regularHours: e.target.value })}
                      className="mt-1 block w-full rounded-md border-brand-gray-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Overtime Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={timeEntryForm.overtimeHours}
                      onChange={(e) => setTimeEntryForm({ ...timeEntryForm, overtimeHours: e.target.value })}
                      className="mt-1 block w-full rounded-md border-brand-gray-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Notes</label>
                    <textarea
                      rows={3}
                      value={timeEntryForm.notes}
                      onChange={(e) => setTimeEntryForm({ ...timeEntryForm, notes: e.target.value })}
                      className="mt-1 block w-full rounded-md border-brand-gray-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm"
                    />
                  </div>
                  {selectedEmployee && (
                    <div className="bg-brand-gray-50 p-4 rounded-md">
                      <p className="text-sm font-medium text-brand-gray-700">Hourly Rate: {formatCurrency(selectedEmployee.payRate)}/hr</p>
                      <p className="text-sm font-medium text-brand-gray-900 mt-2">Total Pay Preview: {formatCurrency(totalPayPreview)}</p>
                    </div>
                  )}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowTimeEntryModal(false)}
                    className="rounded-md border border-brand-gray-300 bg-white px-4 py-2 text-sm font-medium text-brand-gray-700 hover:bg-brand-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-brand-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2"
                  >
                    Log Time
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedRecord && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-brand-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedRecord(null)}></div>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium leading-6 text-brand-gray-900">
                  Payroll Details - {getEmployeeName(selectedRecord.employeeId)}
                </h3>
                <button onClick={() => setSelectedRecord(null)} className="text-brand-gray-400 hover:text-brand-gray-600">
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-brand-gray-500">Pay Period</p>
                    <p className="text-sm text-brand-gray-900">{getPayPeriodLabel(selectedRecord.payPeriodId)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brand-gray-500">Payment Method</p>
                    <p className="text-sm text-brand-gray-900">{selectedRecord.paymentMethod}</p>
                  </div>
                </div>

                <div className="border-t border-brand-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-brand-gray-900 mb-3">Earnings Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-gray-600">Regular Hours ({selectedRecord.regularHours}h @ {formatCurrency(selectedRecord.hourlyRate)}/hr)</span>
                      <span className="font-medium text-brand-gray-900">{formatCurrency(selectedRecord.regularPay)}</span>
                    </div>
                    {selectedRecord.overtimeHours > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-brand-gray-600">Overtime Hours ({selectedRecord.overtimeHours}h @ {formatCurrency(selectedRecord.hourlyRate * 1.5)}/hr)</span>
                        <span className="font-medium text-brand-gray-900">{formatCurrency(selectedRecord.overtimePay)}</span>
                      </div>
                    )}
                    {selectedRecord.bonuses > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-brand-gray-600">Bonuses</span>
                        <span className="font-medium text-brand-gray-900">{formatCurrency(selectedRecord.bonuses)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-semibold border-t border-brand-gray-200 pt-2">
                      <span className="text-brand-gray-900">Gross Pay</span>
                      <span className="text-brand-gray-900">{formatCurrency(selectedRecord.grossPay)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-brand-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-brand-gray-900 mb-3">Deductions</h4>
                  <div className="space-y-2">
                    {selectedRecord.deductions.map((deduction, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-brand-gray-600">{deduction.type}</span>
                        <span className="font-medium text-brand-gray-900">{formatCurrency(deduction.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-semibold border-t border-brand-gray-200 pt-2">
                      <span className="text-brand-gray-900">Total Deductions</span>
                      <span className="text-brand-gray-900">{formatCurrency(selectedRecord.totalDeductions)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-brand-gray-200 pt-4">
                  <div className="flex justify-between text-base font-bold">
                    <span className="text-brand-gray-900">Net Pay</span>
                    <span className="text-brand-green-600">{formatCurrency(selectedRecord.netPay)}</span>
                  </div>
                </div>

                {selectedRecord.notes && (
                  <div className="border-t border-brand-gray-200 pt-4">
                    <p className="text-sm font-medium text-brand-gray-500">Notes</p>
                    <p className="text-sm text-brand-gray-900 mt-1">{selectedRecord.notes}</p>
                  </div>
                )}

                <div className="border-t border-brand-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-brand-gray-500">Status</p>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        selectedRecord.paidAt ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedRecord.paidAt ? `Paid on ${formatDate(selectedRecord.paidAt)}` : 'Unpaid'}
                      </span>
                    </div>
                    {!selectedRecord.paidAt && (
                      <button
                        onClick={() => handleMarkAsPaid(selectedRecord.id)}
                        className="rounded-md bg-brand-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2"
                      >
                        Mark as Paid
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
