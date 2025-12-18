import { useState, useEffect } from 'react';
import { Clock, MapPin, CheckCircle } from 'lucide-react';
import { Employee, Job } from '../../types';

interface ClockInOutProps {
  employees: Employee[];
  onClockAction: () => void;
}

export default function ClockInOut({ employees, onClockAction }: ClockInOutProps) {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const [notes, setNotes] = useState('');
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeEntry, setActiveEntry] = useState<any>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    loadJobs();
    if (employees.length > 0) {
      setSelectedEmployee(employees[0].id);
      checkActiveEntry(employees[0].id);
    }
  }, [employees]);

  const loadJobs = async () => {
    try {
      const response = await fetch('/api/jobs');
      const data = await response.json();
      setJobs(data.filter((j: Job) => j.status === 'scheduled' || j.status === 'en_route' || j.status === 'on_site' || j.status === 'in_progress'));
    } catch (err) {
      console.error('Failed to load jobs:', err);
    }
  };

  const checkActiveEntry = async (employeeId: string) => {
    try {
      const response = await fetch(`/api/time-entries?employeeId=${employeeId}&status=draft`);
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        const active = result.data.find((e: any) => !e.clockOut);
        if (active) {
          setActiveEntry(active);
        }
      }
    } catch (err) {
      console.error('Failed to check active entry:', err);
    }
  };

  const getLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Location error:', error);
          resolve({ lat: 0, lng: 0 });
        }
      );
    });
  };

  const handleClockIn = async () => {
    if (!selectedEmployee) {
      setMessage('Please select an employee');
      return;
    }

    try {
      setLoading(true);
      const loc = await getLocation();
      
      const response = await fetch('/api/time-entries/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployee,
          jobId: selectedJob || null,
          location: loc,
          notes: notes || null
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage('✅ Clocked in successfully!');
        setActiveEntry(result.data);
        setNotes('');
        onClockAction();
      } else {
        setMessage('❌ ' + result.error);
      }
    } catch (err: any) {
      setMessage('❌ Failed to clock in: ' + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleClockOut = async () => {
    if (!activeEntry) {
      setMessage('No active clock-in found');
      return;
    }

    try {
      setLoading(true);
      const loc = await getLocation();

      const response = await fetch(`/api/time-entries/${activeEntry.id}/clock-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: loc,
          notes: notes || null,
          breakMinutes: breakMinutes || 0
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage('✅ Clocked out successfully!');
        setActiveEntry(null);
        setNotes('');
        setBreakMinutes(0);
        onClockAction();
      } else {
        setMessage('❌ ' + result.error);
      }
    } catch (err: any) {
      setMessage('❌ Failed to clock out: ' + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const getElapsedTime = () => {
    if (!activeEntry?.clockIn) return '0h 0m';
    
    const start = new Date(activeEntry.clockIn);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-gray-800 rounded-lg p-6">
        {activeEntry ? (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-600 rounded-lg">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">Currently Clocked In</span>
            </div>
            <div className="text-white">
              <div className="text-sm text-gray-300 mb-1">
                Since: {new Date(activeEntry.clockIn).toLocaleString()}
              </div>
              <div className="text-2xl font-bold">{getElapsedTime()}</div>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-gray-700/50 rounded-lg text-center text-gray-400">
            Not currently clocked in
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => {
                setSelectedEmployee(e.target.value);
                checkActiveEntry(e.target.value);
              }}
              disabled={!!activeEntry}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white disabled:opacity-50"
            >
              <option value="">Select Employee</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          {!activeEntry && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Job (Optional)
              </label>
              <select
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              >
                <option value="">No specific job</option>
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>
                    {job.title} - {job.clientName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeEntry && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Break Time (minutes)
              </label>
              <input
                type="number"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              placeholder="Add any notes..."
            />
          </div>

          <div className="flex gap-3">
            {!activeEntry ? (
              <button
                onClick={handleClockIn}
                disabled={loading || !selectedEmployee}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Clock className="w-5 h-5" />
                {loading ? 'Clocking In...' : 'Clock In'}
              </button>
            ) : (
              <button
                onClick={handleClockOut}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCircle className="w-5 h-5" />
                {loading ? 'Clocking Out...' : 'Clock Out'}
              </button>
            )}
          </div>

          {message && (
            <div className={`p-3 rounded-lg ${
              message.includes('✅') 
                ? 'bg-green-900/20 border border-green-600 text-green-400' 
                : 'bg-red-900/20 border border-red-600 text-red-400'
            }`}>
              {message}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <MapPin className="w-4 h-4" />
            <span>GPS location will be recorded automatically</span>
          </div>
        </div>
      </div>
    </div>
  );
}
