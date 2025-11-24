
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Customer, Job } from '../../types';
import JobIcon from '../../components/icons/JobIcon';
import SpinnerIcon from '../../components/icons/SpinnerIcon';

interface CrewDashboardProps {
  jobs: Job[];
  customers: Customer[];
}

interface RouteStop {
  order: number;
  jobId: string;
  customerName: string;
  address: string;
  distanceMiles: number;
  estimatedDriveMinutes: number;
}

const CrewDashboard: React.FC<CrewDashboardProps> = ({ jobs, customers }) => {
  // Simulate logged-in user ID. In a real app, this would come from an auth context.
  const currentUserId = 'emp1'; // Mike Miller

  const today = new Date().toISOString().split('T')[0];

  const [isPlanningRoute, setIsPlanningRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routePlan, setRoutePlan] = useState<{ stops: RouteStop[]; totalDistance: number; totalDriveMinutes: number; mapsUrl?: string } | null>(null);

  const todaysJobs = useMemo(() => {
    return jobs.filter(job =>
      job.scheduledDate === today &&
      job.assignedCrew.includes(currentUserId) &&
      job.status !== 'Completed' &&
      job.status !== 'Cancelled'
    ).sort((a, b) => a.status === 'In Progress' ? -1 : 1); // Show "In Progress" first
  }, [jobs, today, currentUserId]);

  const customerByName = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach(customer => {
      map.set(customer.name.toLowerCase(), customer);
    });
    return map;
  }, [customers]);

  const toRadians = (value: number) => (value * Math.PI) / 180;

  const getDistanceMiles = (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
    const R = 3958.8; // Earth radius in miles
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

  const handlePlanRoute = () => {
    setIsPlanningRoute(true);
    setRouteError(null);

    try {
      const jobsWithCoords = todaysJobs
        .map(job => {
          const customer = customerByName.get(job.customerName.toLowerCase());
          return customer && customer.coordinates ? { job, customer } : null;
        })
        .filter((value): value is { job: Job; customer: Customer } => Boolean(value));

      if (jobsWithCoords.length === 0) {
        setRoutePlan(null);
        setRouteError('No jobs for today have location coordinates available.');
        return;
      }

      const ordered: typeof jobsWithCoords = [];
      const remaining = [...jobsWithCoords];
      let current = remaining.find(item => item.job.status === 'In Progress') || remaining[0];
      ordered.push(current);
      remaining.splice(remaining.indexOf(current), 1);

      while (remaining.length > 0) {
        let closestIndex = 0;
        let minDistance = Number.POSITIVE_INFINITY;

        remaining.forEach((candidate, index) => {
          const distance = getDistanceMiles(current.customer.coordinates, candidate.customer.coordinates);
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
        const distance = previous ? getDistanceMiles(previous.customer.coordinates, entry.customer.coordinates) : 0;
        const estimatedDriveMinutes = previous ? Math.max(5, Math.round((distance / 30) * 60)) : 0; // assume 30 mph average

        return {
          order: index + 1,
          jobId: entry.job.id,
          customerName: entry.job.customerName,
          address: entry.customer.address,
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
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-gray-900">Today's Jobs</h1>
      <p className="mt-1 text-brand-gray-600">Jobs assigned to you for {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

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
