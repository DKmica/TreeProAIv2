import React, { useState, useEffect, useMemo } from 'react';
import { SalesmanSummary, SalesCommission, SalesmanDetail, Employee, Job, PayPeriod } from '../types';
import { salesService, employeeService, jobService, payPeriodService } from '../services/apiService';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import DollarIcon from '../components/icons/DollarIcon';

const formatCurrency = (amount: number): string => {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const Sales: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'summary' | 'commissions' | 'assign'>('summary');
  const [salesSummary, setSalesSummary] = useState<SalesmanSummary[]>([]);
  const [commissions, setCommissions] = useState<SalesCommission[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSalesman, setSelectedSalesman] = useState<SalesmanDetail | null>(null);
  const [editingCommissionRate, setEditingCommissionRate] = useState<string | null>(null);
  const [newCommissionRate, setNewCommissionRate] = useState<string>('');

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignJobId, setAssignJobId] = useState('');
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignSaleAmount, setAssignSaleAmount] = useState('');
  const [assignCommissionRate, setAssignCommissionRate] = useState('');

  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [payrollEmployeeId, setPayrollEmployeeId] = useState('');
  const [payrollPayPeriodId, setPayrollPayPeriodId] = useState('');
  const [selectedCommissionIds, setSelectedCommissionIds] = useState<string[]>([]);
  const [processingPayroll, setProcessingPayroll] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [summaryData, employeesData, jobsData, periodsData] = await Promise.all([
        salesService.getSummary(),
        employeeService.getAll(),
        jobService.getAll(),
        payPeriodService.getAll()
      ]);
      setSalesSummary(summaryData);
      setEmployees(employeesData);
      setJobs(jobsData);
      setPayPeriods(periodsData);
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommissions = async () => {
    try {
      const params: { employeeId?: string; status?: string } = {};
      if (filterEmployee) params.employeeId = filterEmployee;
      if (filterStatus) params.status = filterStatus;
      const data = await salesService.getCommissions(params);
      setCommissions(data);
    } catch (error) {
      console.error('Error fetching commissions:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'commissions') {
      fetchCommissions();
    }
  }, [activeTab, filterEmployee, filterStatus]);

  const handleUpdateCommissionRate = async (employeeId: string) => {
    try {
      await salesService.updateCommissionRate(employeeId, {
        defaultCommissionRate: parseFloat(newCommissionRate) || 0,
        isSalesman: true
      });
      setEditingCommissionRate(null);
      setNewCommissionRate('');
      fetchData();
    } catch (error) {
      console.error('Error updating commission rate:', error);
      alert('Failed to update commission rate');
    }
  };

  const handleAssignSalesman = async () => {
    if (!assignJobId || !assignEmployeeId || !assignSaleAmount) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await salesService.calculateCommission({
        jobId: assignJobId,
        employeeId: assignEmployeeId,
        saleAmount: parseFloat(assignSaleAmount),
        commissionRate: assignCommissionRate ? parseFloat(assignCommissionRate) : undefined
      });
      setShowAssignModal(false);
      setAssignJobId('');
      setAssignEmployeeId('');
      setAssignSaleAmount('');
      setAssignCommissionRate('');
      fetchData();
      if (activeTab === 'commissions') fetchCommissions();
      alert('Salesman assigned successfully');
    } catch (error) {
      console.error('Error assigning salesman:', error);
      alert('Failed to assign salesman');
    }
  };

  const handleProcessPayroll = async () => {
    if (!payrollEmployeeId || selectedCommissionIds.length === 0) {
      alert('Please select an employee and at least one commission to process');
      return;
    }

    try {
      setProcessingPayroll(true);
      const result = await salesService.processPayroll({
        employeeId: payrollEmployeeId,
        payPeriodId: payrollPayPeriodId || undefined,
        commissionIds: selectedCommissionIds
      });
      alert(`Payroll processed: ${formatCurrency(result.totalCommission)} for ${result.commissionsProcessed} commission(s)`);
      setShowPayrollModal(false);
      setPayrollEmployeeId('');
      setPayrollPayPeriodId('');
      setSelectedCommissionIds([]);
      fetchData();
      if (activeTab === 'commissions') fetchCommissions();
    } catch (error) {
      console.error('Error processing payroll:', error);
      alert('Failed to process payroll');
    } finally {
      setProcessingPayroll(false);
    }
  };

  const earnedCommissions = useMemo(() => 
    commissions.filter(c => c.status === 'earned'),
    [commissions]
  );

  const salesmen = useMemo(() => 
    employees.filter(e => e.isSalesman || e.jobTitle?.toLowerCase().includes('sales')),
    [employees]
  );

  const unassignedJobs = useMemo(() =>
    jobs.filter(j => !j.status?.includes('cancelled')),
    [jobs]
  );

  const tabs = [
    { id: 'summary', label: 'Sales Summary' },
    { id: 'commissions', label: 'Commissions' },
    { id: 'assign', label: 'Assign Sales' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SpinnerIcon className="h-8 w-8 text-brand-cyan-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-gray-900">Sales Tracking</h1>
          <p className="mt-1 text-sm text-brand-gray-600">Track salesman performance and manage commissions</p>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-cyan-600 hover:bg-brand-cyan-700"
        >
          + Assign Sale
        </button>
      </div>

      <div className="border-b border-brand-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-brand-cyan-500 text-brand-cyan-600'
                  : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700 hover:border-brand-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <DollarIcon className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-brand-gray-500">Total Sales (Completed)</p>
                  <p className="text-2xl font-semibold text-brand-gray-900">
                    {formatCurrency(salesSummary.reduce((sum, s) => sum + s.totalSalesCompleted, 0))}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <DollarIcon className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-brand-gray-500">Earned Commissions</p>
                  <p className="text-2xl font-semibold text-brand-gray-900">
                    {formatCurrency(salesSummary.reduce((sum, s) => sum + s.earnedCommissions, 0))}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <DollarIcon className="h-8 w-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-brand-gray-500">Pending Commissions</p>
                  <p className="text-2xl font-semibold text-brand-gray-900">
                    {formatCurrency(salesSummary.reduce((sum, s) => sum + s.pendingCommissions, 0))}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <DollarIcon className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-brand-gray-500">Paid Commissions</p>
                  <p className="text-2xl font-semibold text-brand-gray-900">
                    {formatCurrency(salesSummary.reduce((sum, s) => sum + s.paidCommissions, 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-brand-gray-200">
              <thead className="bg-brand-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Salesman</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Commission Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Jobs Sold</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Completed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Total Sales</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Earned</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Paid</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-brand-gray-200">
                {salesSummary.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-brand-gray-500">
                      No salesmen data available. Assign employees to sales using the "Assign Sale" button.
                    </td>
                  </tr>
                ) : (
                  salesSummary.map(salesman => (
                    <tr key={salesman.employeeId} className="hover:bg-brand-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-brand-gray-900">{salesman.employeeName}</div>
                        <div className="text-sm text-brand-gray-500">{salesman.jobTitle}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingCommissionRate === salesman.employeeId ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.5"
                              value={newCommissionRate}
                              onChange={e => setNewCommissionRate(e.target.value)}
                              className="w-20 rounded-md border border-brand-gray-600 bg-brand-gray-800 px-2 py-1 text-white text-sm"
                              placeholder="%"
                            />
                            <button
                              onClick={() => handleUpdateCommissionRate(salesman.employeeId)}
                              className="text-green-600 hover:text-green-800 text-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingCommissionRate(null);
                                setNewCommissionRate('');
                              }}
                              className="text-brand-gray-500 hover:text-brand-gray-700 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-brand-gray-900">{salesman.defaultCommissionRate}%</span>
                            <button
                              onClick={() => {
                                setEditingCommissionRate(salesman.employeeId);
                                setNewCommissionRate(salesman.defaultCommissionRate.toString());
                              }}
                              className="text-brand-cyan-600 hover:text-brand-cyan-800 text-xs"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-900">{salesman.totalJobsSold}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-900">{salesman.completedJobs}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-gray-900">{formatCurrency(salesman.totalSalesCompleted)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{formatCurrency(salesman.earnedCommissions)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">{formatCurrency(salesman.paidCommissions)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={async () => {
                            const detail = await salesService.getSalesmanDetail(salesman.employeeId);
                            setSelectedSalesman(detail);
                          }}
                          className="text-brand-cyan-600 hover:text-brand-cyan-800"
                        >
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

      {activeTab === 'commissions' && (
        <div className="space-y-4">
          <div className="flex gap-4 mb-4">
            <select
              value={filterEmployee}
              onChange={e => setFilterEmployee(e.target.value)}
              className="rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white text-sm"
            >
              <option value="">All Salesmen</option>
              {salesmen.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white text-sm"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="earned">Earned</option>
              <option value="paid">Paid</option>
            </select>
            {earnedCommissions.length > 0 && (
              <button
                onClick={() => setShowPayrollModal(true)}
                className="ml-auto inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
              >
                Process Commission Payroll
              </button>
            )}
          </div>

          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-brand-gray-200">
              <thead className="bg-brand-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Salesman</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Job</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Sale Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Commission</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-brand-gray-200">
                {commissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-brand-gray-500">
                      No commission records found.
                    </td>
                  </tr>
                ) : (
                  commissions.map(commission => (
                    <tr key={commission.id} className="hover:bg-brand-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-900">{commission.employeeName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-900">{commission.jobNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-900">{commission.customerName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-900">{formatCurrency(commission.saleAmount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-900">{commission.commissionRate}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{formatCurrency(commission.commissionAmount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          commission.status === 'paid' ? 'bg-purple-100 text-purple-800' :
                          commission.status === 'earned' ? 'bg-green-100 text-green-800' :
                          commission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {commission.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'assign' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-brand-gray-900 mb-4">Assign Salesman to Job</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-2">Select Job</label>
              <select
                value={assignJobId}
                onChange={e => setAssignJobId(e.target.value)}
                className="w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white"
              >
                <option value="">Choose a job...</option>
                {unassignedJobs.map(job => (
                  <option key={job.id} value={job.id}>
                    {job.jobNumber} - {job.customerName} ({job.status})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-2">Select Salesman</label>
              <select
                value={assignEmployeeId}
                onChange={e => {
                  setAssignEmployeeId(e.target.value);
                  const emp = employees.find(emp => emp.id === e.target.value);
                  if (emp?.defaultCommissionRate) {
                    setAssignCommissionRate(emp.defaultCommissionRate.toString());
                  }
                }}
                className="w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white"
              >
                <option value="">Choose a salesman...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.jobTitle}) {emp.defaultCommissionRate ? `- ${emp.defaultCommissionRate}%` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-2">Sale Amount ($)</label>
              <input
                type="number"
                value={assignSaleAmount}
                onChange={e => setAssignSaleAmount(e.target.value)}
                className="w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white"
                placeholder="Enter sale amount"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-2">Commission Rate (%)</label>
              <input
                type="number"
                step="0.5"
                value={assignCommissionRate}
                onChange={e => setAssignCommissionRate(e.target.value)}
                className="w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white"
                placeholder="Custom rate (optional)"
              />
            </div>
          </div>
          <div className="mt-6">
            <button
              onClick={handleAssignSalesman}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-cyan-600 hover:bg-brand-cyan-700"
            >
              Assign Salesman & Create Commission
            </button>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-brand-gray-900 mb-4">Assign Sale to Salesman</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-gray-700 mb-1">Job</label>
                <select
                  value={assignJobId}
                  onChange={e => setAssignJobId(e.target.value)}
                  className="w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white"
                >
                  <option value="">Select job...</option>
                  {unassignedJobs.map(job => (
                    <option key={job.id} value={job.id}>
                      {job.jobNumber} - {job.customerName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-gray-700 mb-1">Salesman</label>
                <select
                  value={assignEmployeeId}
                  onChange={e => {
                    setAssignEmployeeId(e.target.value);
                    const emp = employees.find(emp => emp.id === e.target.value);
                    if (emp?.defaultCommissionRate) {
                      setAssignCommissionRate(emp.defaultCommissionRate.toString());
                    }
                  }}
                  className="w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white"
                >
                  <option value="">Select salesman...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-gray-700 mb-1">Sale Amount</label>
                <input
                  type="number"
                  value={assignSaleAmount}
                  onChange={e => setAssignSaleAmount(e.target.value)}
                  className="w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-gray-700 mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={assignCommissionRate}
                  onChange={e => setAssignCommissionRate(e.target.value)}
                  className="w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-sm font-medium text-brand-gray-700 hover:text-brand-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignSalesman}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-cyan-600 rounded-md hover:bg-brand-cyan-700"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {showPayrollModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-brand-gray-900 mb-4">Process Commission Payroll</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-gray-700 mb-1">Employee</label>
                <select
                  value={payrollEmployeeId}
                  onChange={e => {
                    setPayrollEmployeeId(e.target.value);
                    setSelectedCommissionIds(
                      earnedCommissions
                        .filter(c => c.employeeId === e.target.value)
                        .map(c => c.id)
                    );
                  }}
                  className="w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white"
                >
                  <option value="">Select employee...</option>
                  {[...new Set(earnedCommissions.map(c => c.employeeId))].map(empId => {
                    const emp = employees.find(e => e.id === empId);
                    return (
                      <option key={empId} value={empId}>{emp?.name || empId}</option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-gray-700 mb-1">Pay Period (Optional)</label>
                <select
                  value={payrollPayPeriodId}
                  onChange={e => setPayrollPayPeriodId(e.target.value)}
                  className="w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white"
                >
                  <option value="">No pay period</option>
                  {payPeriods.map(period => (
                    <option key={period.id} value={period.id}>
                      {period.startDate} to {period.endDate}
                    </option>
                  ))}
                </select>
              </div>
              {payrollEmployeeId && (
                <div>
                  <p className="text-sm text-brand-gray-700 mb-2">
                    Selected: {selectedCommissionIds.length} commission(s) totaling{' '}
                    {formatCurrency(
                      earnedCommissions
                        .filter(c => selectedCommissionIds.includes(c.id))
                        .reduce((sum, c) => sum + c.commissionAmount, 0)
                    )}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowPayrollModal(false)}
                className="px-4 py-2 text-sm font-medium text-brand-gray-700 hover:text-brand-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPayroll}
                disabled={processingPayroll || selectedCommissionIds.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {processingPayroll ? 'Processing...' : 'Process Payroll'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedSalesman && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-brand-gray-900">{selectedSalesman.name}</h3>
                <p className="text-sm text-brand-gray-500">{selectedSalesman.jobTitle} - {selectedSalesman.defaultCommissionRate}% commission</p>
              </div>
              <button
                onClick={() => setSelectedSalesman(null)}
                className="text-brand-gray-500 hover:text-brand-gray-700"
              >
                Close
              </button>
            </div>
            <table className="min-w-full divide-y divide-brand-gray-200">
              <thead className="bg-brand-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-brand-gray-500 uppercase">Job #</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-brand-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-brand-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-brand-gray-500 uppercase">Sale Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-brand-gray-500 uppercase">Commission</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-brand-gray-200">
                {selectedSalesman.jobs.map(job => (
                  <tr key={job.id}>
                    <td className="px-4 py-2 text-sm text-brand-gray-900">{job.jobNumber}</td>
                    <td className="px-4 py-2 text-sm text-brand-gray-900">{job.customerName}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        job.status === 'completed' ? 'bg-green-100 text-green-800' :
                        job.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-brand-gray-900">{formatCurrency(job.saleAmount)}</td>
                    <td className="px-4 py-2 text-sm font-medium text-green-600">{formatCurrency(job.commissionAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
