import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Download, Calendar, Search, Filter, AlertTriangle, CheckCircle } from 'lucide-react';
import type { JobMaterial } from '../types';

interface ComplianceRecord extends JobMaterial {
  jobTitle?: string;
  customerName?: string;
  propertyAddress?: string;
  employeeName?: string;
}

interface ComplianceStats {
  totalApplications: number;
  compliantRecords: number;
  incompleteRecords: number;
  uniqueMaterials: number;
  uniqueApplicators: number;
}

export default function PHCComplianceReport() {
  const [records, setRecords] = useState<ComplianceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompliance, setFilterCompliance] = useState<'all' | 'compliant' | 'incomplete'>('all');

  useEffect(() => {
    fetchComplianceData();
  }, [startDate, endDate]);

  const fetchComplianceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/phc-reports/compliance?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch compliance data: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setRecords(data.data);
      } else {
        throw new Error(data.error || 'Failed to load compliance data');
      }
    } catch (err: any) {
      console.error('Failed to fetch PHC compliance data:', err);
      setError(err?.message || 'Failed to load compliance data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isRecordCompliant = (record: ComplianceRecord): boolean => {
    return !!(
      record.materialName &&
      record.quantityUsed &&
      record.applicationMethod &&
      record.appliedBy &&
      record.appliedAt
    );
  };

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const matchesSearch = searchTerm === '' ||
        record.materialName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.epaRegNumber?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCompliance = filterCompliance === 'all' ||
        (filterCompliance === 'compliant' && isRecordCompliant(record)) ||
        (filterCompliance === 'incomplete' && !isRecordCompliant(record));

      return matchesSearch && matchesCompliance;
    });
  }, [records, searchTerm, filterCompliance]);

  const stats: ComplianceStats = useMemo(() => {
    const compliantCount = records.filter(isRecordCompliant).length;
    const uniqueMaterials = new Set(records.map(r => r.materialName)).size;
    const uniqueApplicators = new Set(records.map(r => r.appliedBy).filter(Boolean)).size;

    return {
      totalApplications: records.length,
      compliantRecords: compliantCount,
      incompleteRecords: records.length - compliantCount,
      uniqueMaterials,
      uniqueApplicators
    };
  }, [records]);

  const exportToCSV = () => {
    const headers = [
      'Date Applied',
      'Material Name',
      'EPA Reg #',
      'Quantity',
      'Unit',
      'Application Method',
      'Application Rate',
      'Target Pest/Condition',
      'Applicator',
      'Customer',
      'Property Address',
      'Weather Conditions',
      'Wind Speed (mph)',
      'Temperature (F)',
      'REI (hours)',
      'PPE Used',
      'Notes',
      'Compliant'
    ];

    const rows = filteredRecords.map(record => [
      record.appliedAt ? new Date(record.appliedAt).toLocaleDateString() : '',
      record.materialName || '',
      record.epaRegNumber || '',
      record.quantityUsed || '',
      record.unit || '',
      record.applicationMethod || '',
      record.applicationRate || '',
      record.targetPestOrCondition || '',
      record.employeeName || '',
      record.customerName || '',
      record.propertyAddress || '',
      record.weatherConditions || '',
      record.windSpeedMph || '',
      record.temperatureF || '',
      record.reiHours || '',
      (record.ppeUsed || []).join('; '),
      record.notes || '',
      isRecordCompliant(record) ? 'Yes' : 'No'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `phc-compliance-report-${startDate}-to-${endDate}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-green-500" />
            PHC Compliance Report
          </h1>
          <p className="text-gray-400 mt-1">
            Track and export pesticide/chemical application records for regulatory compliance
          </p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={filteredRecords.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-white">{stats.totalApplications}</div>
          <div className="text-sm text-gray-400">Total Applications</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-green-400">{stats.compliantRecords}</div>
          <div className="text-sm text-gray-400">Complete Records</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-yellow-400">{stats.incompleteRecords}</div>
          <div className="text-sm text-gray-400">Incomplete Records</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-blue-400">{stats.uniqueMaterials}</div>
          <div className="text-sm text-gray-400">Unique Materials</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-purple-400">{stats.uniqueApplicators}</div>
          <div className="text-sm text-gray-400">Applicators</div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by material, customer, applicator, or EPA #..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterCompliance}
                onChange={(e) => setFilterCompliance(e.target.value as 'all' | 'compliant' | 'incomplete')}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Records</option>
                <option value="compliant">Complete Only</option>
                <option value="incomplete">Incomplete Only</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-red-400 font-medium">Error loading compliance data</p>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
          <button
            onClick={fetchComplianceData}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      ) : filteredRecords.length === 0 && !error ? (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
          <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Records Found</h3>
          <p className="text-gray-400">
            No chemical/material application records found for the selected date range.
          </p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-750">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Material</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">EPA #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Target</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Applicator</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-750">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      {record.appliedAt ? new Date(record.appliedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">
                      {record.materialName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                      {record.epaRegNumber || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      {record.quantityUsed ? `${record.quantityUsed} ${record.unit}` : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      {record.applicationMethod || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      {record.targetPestOrCondition || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      {record.employeeName || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      {record.customerName || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isRecordCompliant(record) ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-400">
                          <AlertTriangle className="w-4 h-4" />
                          Incomplete
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Compliance Note</h3>
        <p className="text-xs text-gray-500">
          This report is generated for record-keeping purposes. A record is considered "Complete" when it includes
          material name, quantity used, application method, applicator name, and application date. Ensure all
          pesticide applications comply with local, state, and federal regulations including EPA requirements.
          Retain records for the period required by your jurisdiction (typically 2-3 years minimum).
        </p>
      </div>
    </div>
  );
}
