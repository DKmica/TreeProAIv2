import { Job, Employee, Customer, OptimizedRoute } from '../types';

// This is a mock service. In a real application, this would call the Google Maps Directions API.
export const calculateOptimizedRoute = async (
    crewLeader: Employee,
    jobsForCrew: Job[],
    customers: Customer[]
): Promise<OptimizedRoute> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (jobsForCrew.length === 0) {
        throw new Error("No jobs scheduled for this crew today.");
    }
    
    const startLocation = crewLeader.coordinates;
    const waypoints = jobsForCrew.map(job => {
        const customer = customers.find(c => c.name === job.customerName);
        return { job, customer };
    }).filter(item => item.customer && (item.customer.coordinates.lat !== 0 || item.customer.coordinates.lng !== 0));

    if (waypoints.length < 1) {
        throw new Error("None of the jobs for this crew have valid coordinates.");
    }

    // --- Mocking Logic ---
    // In a real app, you would pass these waypoints to the Directions API
    // with `optimizeWaypoints: true`. Here, we'll just sort by customer name
    // to simulate a change in order.
    const orderedWaypoints = [...waypoints].sort((a, b) => a.customer!.name.localeCompare(b.customer!.name));
    
    const orderedJobs = orderedWaypoints.map(wp => wp.job);
    
    // Create Google Maps URL
    const origin = `${startLocation.lat},${startLocation.lng}`;
    const destination = `${orderedWaypoints[orderedWaypoints.length - 1].customer!.coordinates.lat},${orderedWaypoints[orderedWaypoints.length - 1].customer!.coordinates.lng}`;
    const waypointsString = orderedWaypoints.slice(0, -1).map(wp => `${wp.customer!.coordinates.lat},${wp.customer!.coordinates.lng}`).join('|');
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypointsString}`;

    return {
        orderedJobs,
        totalDistance: "45.8 mi",
        totalDuration: "1 hr 35 mins",
        googleMapsUrl,
    };
};
