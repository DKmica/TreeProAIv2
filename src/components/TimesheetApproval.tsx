import { useState } from 'react';
import { CheckCircle, XCircle, MapPin, Clock } from 'lucide-react';
import { TimeEntry } from '../../types';

interface TimesheetApprovalProps {
  timeEntries: TimeEntry[];
  onApprovalChange: () => void;
}

export default function TimesheetApproval({ timeEntries, onApprovalChange }: TimesheetApprovalProps) {
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleApprove = async (entryId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/time-entries/${entryId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedBy: 'current-user-id'
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage('✅ Time entry approved successfully!');
        onApprovalChange();
      } else {
        setMessage('❌ ' + result.error);
      }
    } catch (err: any) {
      setMessage('❌ Failed to approve: ' + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleReject = async (entryId: string) => {
    if (!rejectionReason.trim()) {
      setMessage('❌ Please provide a rejection reason');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/time-entries/${entryId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedBy: 'current-user-id',
          rejectionReason: rejectionReason
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage('✅ Time entry rejected');
        setSelectedEntry(null);
        setRejectionReason('');
        onApprovalChange();
      } else {
        setMessage('❌ ' + result.error);
      }
    } catch (err: any) {
      setMessage('❌ Failed to reject: ' + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 5000);
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

  const formatLocation = (location?: { lat: number; lng: number; address?: string }) => {
    if (!location) return 'Not recorded';
    if (location.address) return location.address;
    return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
  };

  if (timeEntries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No time entries pending approval
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('✅') 
            ? 'bg-green-900/20 border border-green-600 text-green-400' 
            : 'bg-red-900/20 border border-red-600 text-red-400'
        }`}>
          {message}
        </div>
      )}

      <div className="grid gap-4">
        {timeEntries.map(entry => (
          <div key={entry.id} className="bg-gray-800 rounded-lg p-6">
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">Employee</div>
                <div className="text-white font-semibold">{entry.employeeName}</div>
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-1">Job</div>
                {entry.jobTitle ? (
                  <div>
                    <div className="text-white">{entry.jobTitle}</div>
                    <div className="text-xs text-gray-500">{entry.jobClientName}</div>
                  </div>
                ) : (
                  <div className="text-gray-500">No specific job</div>
                )}
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-1">Clock In</div>
                <div className="text-white">
                  {new Date(entry.clockIn).toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <MapPin className="w-3 h-3" />
                  {formatLocation(entry.clockInLocation)}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-1">Clock Out</div>
                <div className="text-white">
                  {entry.clockOut ? new Date(entry.clockOut).toLocaleString() : 'Not clocked out'}
                </div>
                {entry.clockOut && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <MapPin className="w-3 h-3" />
                    {formatLocation(entry.clockOutLocation)}
                  </div>
                )}
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-1">Hours Worked</div>
                <div className="text-white font-semibold text-lg">
                  {formatDuration(entry.hoursWorked)}
                </div>
                {entry.breakMinutes && entry.breakMinutes > 0 && (
                  <div className="text-xs text-gray-500">
                    Break: {entry.breakMinutes} min
                  </div>
                )}
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-1">Amount</div>
                <div className="text-cyan-400 font-semibold text-lg">
                  {formatCurrency(entry.totalAmount)}
                </div>
                <div className="text-xs text-gray-500">
                  @ ${entry.hourlyRate}/hr
                </div>
              </div>
            </div>

            {entry.notes && (
              <div className="mb-4 p-3 bg-gray-700/50 rounded">
                <div className="text-sm text-gray-400 mb-1">Notes</div>
                <div className="text-white text-sm">{entry.notes}</div>
              </div>
            )}

            {selectedEntry?.id === entry.id ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Rejection Reason
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    placeholder="Explain why this entry is being rejected..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleReject(entry.id)}
                    disabled={loading}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded font-semibold"
                  >
                    {loading ? 'Rejecting...' : 'Confirm Reject'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedEntry(null);
                      setRejectionReason('');
                    }}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(entry.id)}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded font-semibold flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {loading ? 'Approving...' : 'Approve'}
                </button>
                <button
                  onClick={() => setSelectedEntry(entry)}
                  disabled={loading}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded font-semibold flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
