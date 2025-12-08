import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Client, Job, Property } from '../../types';
import JobIcon from '../../components/icons/JobIcon';
import SpinnerIcon from '../../components/icons/SpinnerIcon';
import { useJobsQuery, useClientsQuery } from '../../hooks/useDataQueries';
import { useCrewSync } from '../../contexts/CrewSyncContext';

interface RouteStop {
  order: number;
  jobId: string;
  customerName: string;
  address: string;
  distanceMiles: number;
  estimatedDriveMinutes: number;
}

const getClientDisplayName = (client: Client): string => {
  if (client.companyName) return client.companyName;
  const firstName = client.firstName || '';
  const lastName = client.lastName || '';
  return `${firstName} ${lastName}`.trim() || 'Unknown Client';
};

const getClientAddress = (client: Client): string => {
  const parts = [
    client.billingAddressLine1,
    client.billingCity,
    client.billingState,
    client.billingZip,
  ].filter(Boolean);
  return parts.join(', ') || '';
};

const CrewDashboard: React.FC = () => {
  const { data: jobs = [], isLoading: jobsLoading } = useJobsQuery();
  const { data: clients = [], isLoading: clientsLoading } = useClientsQuery();
  const { isOnline, pendingActions, syncPendingActions, syncing } = useCrewSync();

  const currentUserId = 'emp1';
  const today = new Date().toISOString().split('T')[0];

  const [isPlanningRoute, setIsPlanningRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routePlan, setRoutePlan] = useState<{ stops: RouteStop[]; totalDistance: number; totalDriveMinutes: number; mapsUrl?: string } | null>(null);

  const todaysJobs = useMemo(() => {
    return jobs.filter(job =>
      job.scheduledDate === today &&
      job.assignedCrew.includes(currentUserId) &&
      job.status !== 'completed' &&
      job.status !== 'cancelled'
    ).sort((a, b) => {
      const activeStatuses = ['in_progress', 'on_site', 'en_route'];
      const aActive = activeStatuses.includes(a.status);
      const bActive = activeStatuses.includes(b.status);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return 0;
    });
  }, [jobs, today, currentUserId]);

  const clientByName = useMemo(() => {
    const map = new Map<string, Client>();
    clients.forEach(client => {
      const displayName = getClientDisplayName(client);
      map.set(displayName.toLowerCase(), client);
    });
    return map;
  }, [clients]);

  const toRadians = (value: number) => (value * Math.PI) / 180;

  const getDistanceMiles = (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
    const R = 3958.8;
    const dLat = toRadians(to.lat - from.lat);
    const dLon = toRadians(to.lng - from.lng);
    const lat1 = toRadians(from.lat);
    const lat2 = toRadians(to.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const buildGoogleMapsUrl = (stops: RouteStop[]) => {
    if (stops.length === 0) return undefined;
    const addresses = stops.map(stop => encodeURIComponent(stop.address));
    if (addresses.length === 1) {
      return `https://www.google.com/maps/dir/?api=1&destination=${addresses[0]}&travelmode=driving`;
    }
    const [origin, ...rest] = addresses;
    const destination = rest.pop();
    const waypoints = rest.join('%7C');
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving${waypoints ? `&waypoints=${waypoints}` : ''}`;
  };

  const getJobCoordinates = (job: Job, client?: Client): { lat: number; lng: number } | null => {
    if (job.property?.lat != null && job.property?.lon != null) {
      return { lat: job.property.lat, lng: job.property.lon };
    }
    return null;
  };

  const getJobAddress = (job: Job, client?: Client): string => {
    if (job.jobLocation) return job.jobLocation;
    if (job.property) {
      const parts = [
        job.property.addressLine1,
        job.property.city,
        job.property.state,
        job.property.zipCode,
      ].filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
    }
    if (client) return getClientAddress(client);
    return '';
  };

  const handlePlanRoute = () => {
    setIsPlanningRoute(true);
    setRouteError(null);

    try {
      const jobsWithCoords = todaysJobs
        .map(job => {
          const client = clientByName.get(job.customerName.toLowerCase());
          const coords = getJobCoordinates(job, client);
          const address = getJobAddress(job, client);
          return coords ? { job, client, coords, address } : null;
        })
        .filter((value): value is { job: Job; client: Client | undefined; coords: { lat: number; lng: number }; address: string } => Boolean(value));

      if (jobsWithCoords.length === 0) {
        setRoutePlan(null);
        setRouteError('No jobs for today have location coordinates available.');
        return;
      }

      const ordered: typeof jobsWithCoords = [];
      const remaining = [...jobsWithCoords];
      let current = remaining.find(item => ['in_progress', 'on_site', 'en_route'].includes(item.job.status)) || remaining[0];
      ordered.push(current);
      remaining.splice(remaining.indexOf(current), 1);

      while (remaining.length > 0) {
        let closestIndex = 0;
        let minDistance = Number.POSITIVE_INFINITY;

        remaining.forEach((candidate, index) => {
          const distance = getDistanceMiles(current.coords, candidate.coords);
          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
          }
        });

        current = remaining.splice(closestIndex, 1)[0];
        ordered.push(current);
      }

      const stops: RouteStop[] = ordered.map((entry, index) => {
        const previous = index === 0 ? null : ordered[index - 1];
        const distance = previous ? getDistanceMiles(previous.coords, entry.coords) : 0;
        const estimatedDriveMinutes = previous ? Math.max(5, Math.round((distance / 30) * 60)) : 0;

        return {
          order: index + 1,
          jobId: entry.job.id,
          customerName: entry.job.customerName,
          address: entry.address,
          distanceMiles: Number(distance.toFixed(1)),
          estimatedDriveMinutes,
        };
      });

      const totalDistance = stops.reduce((sum, stop) => sum + stop.distanceMiles, 0);
      const totalDriveMinutes = stops.reduce((sum, stop) => sum + stop.estimatedDriveMinutes, 0);

      setRoutePlan({
        stops,
        totalDistance: Number(totalDistance.toFixed(1)),
        totalDriveMinutes,
        mapsUrl: buildGoogleMapsUrl(stops) || undefined,
      });
    } catch (error: any) {
      console.error('Failed to optimize route', error);
      setRoutePlan(null);
      setRouteError(error.message || 'Unable to plan route.');
    } finally {
      setIsPlanningRoute(false);
    }
  };

  const getStatusClasses = (status: Job['status']) => {
    switch (status) {
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (jobsLoading || clientsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SpinnerIcon className="h-12 w-12 text-brand-green-600" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <h1 className="text-2xl font-bold text-brand-gray-900">Today's Jobs</h1>
      <p className="mt-1 text-brand-gray-600">Jobs assigned to you for {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-brand-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-brand-gray-800">Connectivity</p>
          <p className="mt-1 text-sm text-brand-gray-600">{isOnline ? 'Online — data will sync automatically' : 'Offline — logging to device storage'}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-brand-gray-500">
            <span>{pendingActions.length} pending action{pendingActions.length === 1 ? '' : 's'}</span>
            <button
              onClick={syncPendingActions}
              disabled={!isOnline || syncing || pendingActions.length === 0}
              className="inline-flex items-center rounded-md border border-brand-gray-200 px-2 py-1 font-semibold text-brand-gray-700 hover:bg-brand-gray-50 disabled:text-brand-gray-400 disabled:bg-brand-gray-100"
            >
              {syncing ? 'Syncing…' : 'Force sync'}
            </button>
          </div>
        </div>
        <div className="rounded-lg border border-brand-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-brand-gray-800">Offline kit</p>
          <p className="mt-1 text-sm text-brand-gray-600">Clock-ins, notes, photos, and checklists are saved locally if the network drops.</p>
          <p className="mt-2 text-xs text-brand-gray-500">Resume connectivity to push changes back to HQ.</p>
        </div>
      </div>

      {todaysJobs.length > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            onClick={handlePlanRoute}
            disabled={isPlanningRoute}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 disabled:bg-brand-gray-300 disabled:cursor-not-allowed"
          >
            {isPlanningRoute ? <SpinnerIcon className="h-5 w-5 mr-2" /> : null}
            {isPlanningRoute ? 'Calculating Route...' : 'Plan My Day'}
          </button>
          {routePlan?.totalDistance !== undefined && (
            <div className="text-sm text-brand-gray-700">
              Optimized drive: <strong>{routePlan.totalDistance} mi</strong> · ~{routePlan.totalDriveMinutes} min behind the wheel
            </div>
          )}
        </div>
      )}

      {routeError && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {routeError}
        </div>
      )}

      {routePlan?.stops && routePlan.stops.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold text-brand-gray-800">Optimized Route</h2>
          <ol className="mt-3 space-y-3">
            {routePlan.stops.map(stop => (
              <li key={stop.jobId} className="rounded-md border border-brand-gray-200 p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-brand-green-700">Stop {stop.order}</p>
                    <p className="text-base font-semibold text-brand-gray-900">{stop.customerName}</p>
                    <p className="text-sm text-brand-gray-600">{stop.address}</p>
                  </div>
                  <div className="text-right text-xs text-brand-gray-500">
                    {stop.order > 1 && (
                      <>
                        <p>{stop.distanceMiles} mi drive</p>
                        <p>≈ {stop.estimatedDriveMinutes} min</p>
                      </>
                    )}
                  </div>
                </div>
                <Link
                  to={`/crew/job/${stop.jobId}`}
                  className="mt-2 inline-flex items-center text-sm font-semibold text-brand-green-600 hover:text-brand-green-700"
                >
                  View job details →
                </Link>
              </li>
            ))}
          </ol>
          {routePlan?.mapsUrl && (
            <a
              href={routePlan.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center text-sm font-semibold text-brand-green-600 hover:text-brand-green-700"
            >
              Open optimized route in Google Maps →
            </a>
          )}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {todaysJobs.length > 0 ? (
          todaysJobs.map(job => (
            <Link key={job.id} to={`/crew/job/${job.id}`} className="block bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow active:scale-[0.98]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-lg text-brand-gray-800">{job.customerName}</p>
                  <p className="text-sm text-brand-gray-500 flex items-center mt-1">
                    <JobIcon className="w-4 h-4 mr-1.5 text-brand-gray-400" />
                    Job ID: {job.id}
                  </p>
                </div>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold border ${getStatusClasses(job.status)}`}>
                  {job.status}
                </span>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <JobIcon className="mx-auto h-12 w-12 text-brand-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-brand-gray-900">No Jobs Scheduled for Today</h3>
            <p className="mt-1 text-sm text-brand-gray-500">Check back later or enjoy your day off!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrewDashboard;
