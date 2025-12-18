const db = require('../../db');
const cacheService = require('../cacheService');

const AVERAGE_SPEED_MPH = 28;
const DEFAULT_JOB_HOURS = 2.5;
const DISTANCE_CACHE_TTL_SECONDS = 3600;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const haversineDistanceMiles = (lat1, lon1, lat2, lon2) => {
  const toRadians = (deg) => (deg * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatMinutesToTime = (minutesFromMidnight) => {
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = Math.round(minutesFromMidnight % 60);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const generateDistanceCacheKey = (origins, destinations) => {
  const originStr = origins.map(o => `${o.lat},${o.lon}`).join('|');
  const destStr = destinations.map(d => `${d.lat},${d.lon}`).join('|');
  return `distance_matrix:${originStr}:${destStr}`;
};

const getDistanceMatrix = async (origins, destinations) => {
  if (!origins.length || !destinations.length) {
    return { rows: [], cached: false };
  }

  const cacheKey = generateDistanceCacheKey(origins, destinations);
  const cached = await cacheService.getJson(cacheKey);
  if (cached) {
    console.log('[RouteOptimization] Distance matrix cache hit');
    return { ...cached, cached: true };
  }

  if (GOOGLE_MAPS_API_KEY) {
    try {
      const originParam = origins.map(o => `${o.lat},${o.lon}`).join('|');
      const destParam = destinations.map(d => `${d.lat},${d.lon}`).join('|');
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originParam)}&destinations=${encodeURIComponent(destParam)}&key=${GOOGLE_MAPS_API_KEY}&units=imperial`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK') {
        const result = {
          rows: data.rows.map(row => ({
            elements: row.elements.map(el => ({
              distanceMeters: el.distance?.value || 0,
              distanceMiles: el.distance?.value ? el.distance.value * 0.000621371 : 0,
              durationSeconds: el.duration?.value || 0,
              durationMinutes: el.duration?.value ? el.duration.value / 60 : 0,
              status: el.status
            }))
          })),
          source: 'google_maps'
        };
        
        await cacheService.setJson(cacheKey, result, DISTANCE_CACHE_TTL_SECONDS);
        console.log('[RouteOptimization] Distance matrix from Google Maps API');
        return { ...result, cached: false };
      }
      console.warn('[RouteOptimization] Google Maps API error:', data.status);
    } catch (error) {
      console.error('[RouteOptimization] Google Maps API failed:', error.message);
    }
  }

  const rows = origins.map(origin => ({
    elements: destinations.map(dest => {
      const distMiles = haversineDistanceMiles(origin.lat, origin.lon, dest.lat, dest.lon);
      const durationMinutes = (distMiles / AVERAGE_SPEED_MPH) * 60;
      return {
        distanceMeters: Math.round(distMiles * 1609.34),
        distanceMiles: distMiles,
        durationSeconds: Math.round(durationMinutes * 60),
        durationMinutes: durationMinutes,
        status: 'OK'
      };
    })
  }));

  const result = { rows, source: 'haversine' };
  await cacheService.setJson(cacheKey, result, DISTANCE_CACHE_TTL_SECONDS);
  console.log('[RouteOptimization] Distance matrix from haversine calculation');
  return { ...result, cached: false };
};

const fetchJobsForCrewDate = async (crewId, date) => {
  const { rows: assignments } = await db.query(
    `SELECT ca.job_id, ca.assigned_date
     FROM crew_assignments ca
     WHERE ca.crew_id = $1 AND ca.assigned_date = $2`,
    [crewId, date]
  );

  if (!assignments.length) {
    return [];
  }

  const jobIds = assignments.map(a => a.job_id);
  const { rows: jobs } = await db.query(
    `SELECT j.*, 
            COALESCE(j.job_lat, c.lat) as location_lat,
            COALESCE(j.job_lon, c.lon) as location_lon
     FROM jobs j
     LEFT JOIN quotes q ON j.quote_id = q.id
     LEFT JOIN leads l ON q.lead_id = l.id
     LEFT JOIN customers c ON l.customer_id = c.id
     WHERE j.id = ANY($1) 
       AND j.status NOT IN ('cancelled', 'completed')`,
    [jobIds]
  );

  return jobs.filter(j => j.location_lat && j.location_lon);
};

const getCrewStartLocation = async (crewId) => {
  const { rows } = await db.query(
    `SELECT home_base_address, home_base_lat, home_base_lon FROM crews WHERE id = $1`,
    [crewId]
  );
  
  if (rows.length && rows[0].home_base_lat && rows[0].home_base_lon) {
    return {
      address: rows[0].home_base_address || 'Company yard',
      lat: Number(rows[0].home_base_lat),
      lon: Number(rows[0].home_base_lon)
    };
  }
  
  return null;
};

const calculateOptimizationScore = (route) => {
  if (!route.stops || route.stops.length === 0) return 0;
  
  const efficiencyScore = route.totalWorkTimeMinutes > 0 
    ? (route.totalWorkTimeMinutes / (route.totalWorkTimeMinutes + route.totalDriveTimeMinutes)) * 100 
    : 0;
  
  const drivePerStopScore = route.stops.length > 0 
    ? Math.max(0, 100 - (route.totalDriveTimeMinutes / route.stops.length) * 2)
    : 0;
  
  return Math.round((efficiencyScore * 0.6 + drivePerStopScore * 0.4) * 100) / 100;
};

const nearestNeighborOrder = (jobs, startLocation) => {
  if (jobs.length <= 1) return jobs;
  
  const ordered = [];
  const remaining = [...jobs];
  let currentLat = startLocation?.lat || remaining[0].location_lat;
  let currentLon = startLocation?.lon || remaining[0].location_lon;
  
  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Number.MAX_VALUE;
    
    remaining.forEach((job, idx) => {
      const dist = haversineDistanceMiles(
        currentLat, currentLon, 
        Number(job.location_lat), Number(job.location_lon)
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = idx;
      }
    });
    
    const next = remaining.splice(nearestIdx, 1)[0];
    ordered.push(next);
    currentLat = Number(next.location_lat);
    currentLon = Number(next.location_lon);
  }
  
  return ordered;
};

const optimizeRoute = async (crewId, date, options = {}) => {
  console.log(`[RouteOptimization] Optimizing route for crew ${crewId} on ${date}`);
  
  const { rows: crewRows } = await db.query('SELECT * FROM crews WHERE id = $1', [crewId]);
  if (!crewRows.length) {
    throw new Error(`Crew ${crewId} not found`);
  }
  const crew = crewRows[0];
  
  const jobs = await fetchJobsForCrewDate(crewId, date);
  
  if (jobs.length === 0) {
    return {
      routePlanId: null,
      crewId,
      crewName: crew.name,
      date,
      status: 'empty',
      startLocation: options.startLocation || null,
      endLocation: options.endLocation || null,
      stops: [],
      totalDistanceMeters: 0,
      totalDistanceMiles: 0,
      totalDriveTimeMinutes: 0,
      totalWorkTimeMinutes: 0,
      optimizationScore: 0,
      warnings: ['No jobs scheduled for this crew on this date'],
      generatedAt: new Date().toISOString()
    };
  }
  
  let startLocation = options.startLocation;
  if (!startLocation) {
    startLocation = await getCrewStartLocation(crewId);
  }
  
  const orderedJobs = nearestNeighborOrder(jobs, startLocation);
  
  const locations = orderedJobs.map(j => ({
    lat: Number(j.location_lat),
    lon: Number(j.location_lon)
  }));
  
  if (startLocation) {
    locations.unshift({ lat: startLocation.lat, lon: startLocation.lon });
  }
  
  const origins = locations.slice(0, -1);
  const destinations = locations.slice(1);
  const distanceMatrix = await getDistanceMatrix(origins, destinations);
  
  const stops = [];
  let totalDistanceMeters = 0;
  let totalDriveTimeSeconds = 0;
  let totalWorkTimeMinutes = 0;
  let clockMinutes = 8 * 60;
  
  for (let i = 0; i < orderedJobs.length; i++) {
    const job = orderedJobs[i];
    const matrixElement = distanceMatrix.rows[i]?.elements[0] || {};
    
    const travelMinutes = matrixElement.durationMinutes || 0;
    const travelMeters = matrixElement.distanceMeters || 0;
    
    clockMinutes += travelMinutes;
    totalDistanceMeters += travelMeters;
    totalDriveTimeSeconds += matrixElement.durationSeconds || 0;
    
    const estimatedDurationMinutes = toNumber(job.estimated_hours, DEFAULT_JOB_HOURS) * 60;
    totalWorkTimeMinutes += estimatedDurationMinutes;
    
    stops.push({
      order: i + 1,
      jobId: job.id,
      jobNumber: job.job_number,
      customerName: job.customer_name,
      location: {
        lat: Number(job.location_lat),
        lon: Number(job.location_lon),
        address: job.job_location || null
      },
      scheduledArrival: formatMinutesToTime(clockMinutes),
      estimatedDurationMinutes,
      travelTimeFromPreviousMinutes: Math.round(travelMinutes),
      travelDistanceFromPreviousMeters: Math.round(travelMeters),
      status: 'pending'
    });
    
    clockMinutes += estimatedDurationMinutes;
  }
  
  const routeResult = {
    crewId,
    crewName: crew.name,
    date,
    status: 'optimized',
    startLocation: startLocation || null,
    endLocation: options.endLocation || null,
    stops,
    totalDistanceMeters,
    totalDistanceMiles: totalDistanceMeters * 0.000621371,
    totalDriveTimeMinutes: totalDriveTimeSeconds / 60,
    totalWorkTimeMinutes,
    optimizationScore: 0,
    distanceSource: distanceMatrix.source,
    warnings: [],
    generatedAt: new Date().toISOString()
  };
  
  routeResult.optimizationScore = calculateOptimizationScore(routeResult);
  
  if (stops.length > 6) {
    routeResult.warnings.push('Consider splitting this route across multiple crews');
  }
  if (routeResult.totalDriveTimeMinutes > 180) {
    routeResult.warnings.push('High drive time - review job locations');
  }
  
  try {
    const { rows: existingPlan } = await db.query(
      `SELECT id FROM route_plans WHERE crew_id = $1 AND date = $2`,
      [crewId, date]
    );
    
    let routePlanId;
    if (existingPlan.length > 0) {
      routePlanId = existingPlan[0].id;
      await db.query(
        `UPDATE route_plans SET 
          status = 'optimized',
          start_location_address = $1,
          start_location_lat = $2,
          start_location_lon = $3,
          end_location_address = $4,
          end_location_lat = $5,
          end_location_lon = $6,
          total_distance_meters = $7,
          total_duration_seconds = $8,
          total_drive_time_seconds = $9,
          total_work_time_seconds = $10,
          optimization_score = $11,
          optimization_metadata = $12,
          updated_at = NOW()
        WHERE id = $13`,
        [
          startLocation?.address,
          startLocation?.lat,
          startLocation?.lon,
          options.endLocation?.address,
          options.endLocation?.lat,
          options.endLocation?.lon,
          totalDistanceMeters,
          Math.round(totalDriveTimeSeconds + totalWorkTimeMinutes * 60),
          Math.round(totalDriveTimeSeconds),
          Math.round(totalWorkTimeMinutes * 60),
          routeResult.optimizationScore,
          JSON.stringify({ source: distanceMatrix.source, cached: distanceMatrix.cached }),
          routePlanId
        ]
      );
      
      await db.query(`DELETE FROM route_plan_stops WHERE route_plan_id = $1`, [routePlanId]);
    } else {
      const { rows: newPlan } = await db.query(
        `INSERT INTO route_plans (
          crew_id, date, status, 
          start_location_address, start_location_lat, start_location_lon,
          end_location_address, end_location_lat, end_location_lon,
          total_distance_meters, total_duration_seconds, total_drive_time_seconds, 
          total_work_time_seconds, optimization_score, optimization_metadata
        ) VALUES ($1, $2, 'optimized', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id`,
        [
          crewId, date,
          startLocation?.address,
          startLocation?.lat,
          startLocation?.lon,
          options.endLocation?.address,
          options.endLocation?.lat,
          options.endLocation?.lon,
          totalDistanceMeters,
          Math.round(totalDriveTimeSeconds + totalWorkTimeMinutes * 60),
          Math.round(totalDriveTimeSeconds),
          Math.round(totalWorkTimeMinutes * 60),
          routeResult.optimizationScore,
          JSON.stringify({ source: distanceMatrix.source, cached: distanceMatrix.cached })
        ]
      );
      routePlanId = newPlan[0].id;
    }
    
    for (const stop of stops) {
      await db.query(
        `INSERT INTO route_plan_stops (
          route_plan_id, job_id, stop_order, scheduled_arrival,
          estimated_duration_minutes, travel_time_from_previous_seconds,
          travel_distance_from_previous_meters, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          routePlanId,
          stop.jobId,
          stop.order,
          stop.scheduledArrival,
          stop.estimatedDurationMinutes,
          stop.travelTimeFromPreviousMinutes * 60,
          stop.travelDistanceFromPreviousMeters,
          'pending'
        ]
      );
    }
    
    routeResult.routePlanId = routePlanId;
    console.log(`[RouteOptimization] Route plan ${routePlanId} saved with ${stops.length} stops`);
  } catch (error) {
    console.error('[RouteOptimization] Failed to save route plan:', error.message);
    routeResult.warnings.push('Route optimized but not saved to database');
  }
  
  return routeResult;
};

const reorderStops = async (routePlanId, newOrder) => {
  console.log(`[RouteOptimization] Reordering stops for route plan ${routePlanId}`);
  
  const { rows: plan } = await db.query(
    `SELECT * FROM route_plans WHERE id = $1`,
    [routePlanId]
  );
  
  if (!plan.length) {
    throw new Error(`Route plan ${routePlanId} not found`);
  }
  
  const { rows: currentStops } = await db.query(
    `SELECT * FROM route_plan_stops WHERE route_plan_id = $1 ORDER BY stop_order`,
    [routePlanId]
  );
  
  const jobIdToStop = new Map(currentStops.map(s => [s.job_id, s]));
  
  for (const newOrderItem of newOrder) {
    if (!jobIdToStop.has(newOrderItem.jobId)) {
      throw new Error(`Job ${newOrderItem.jobId} not in route plan`);
    }
  }
  
  for (const newOrderItem of newOrder) {
    await db.query(
      `UPDATE route_plan_stops SET stop_order = $1, updated_at = NOW() 
       WHERE route_plan_id = $2 AND job_id = $3`,
      [newOrderItem.order, routePlanId, newOrderItem.jobId]
    );
  }
  
  await db.query(
    `UPDATE route_plans SET status = 'draft', updated_at = NOW() WHERE id = $1`,
    [routePlanId]
  );
  
  const { rows: updatedStops } = await db.query(
    `SELECT rps.*, j.customer_name, j.job_location, j.job_lat, j.job_lon
     FROM route_plan_stops rps
     JOIN jobs j ON rps.job_id = j.id
     WHERE rps.route_plan_id = $1
     ORDER BY rps.stop_order`,
    [routePlanId]
  );
  
  console.log(`[RouteOptimization] Route plan ${routePlanId} reordered with ${updatedStops.length} stops`);
  
  return {
    routePlanId,
    status: 'draft',
    stops: updatedStops.map(s => ({
      order: s.stop_order,
      jobId: s.job_id,
      customerName: s.customer_name,
      location: {
        lat: Number(s.job_lat),
        lon: Number(s.job_lon),
        address: s.job_location
      },
      status: s.status
    })),
    message: 'Stops reordered. Re-optimize to recalculate times and distances.'
  };
};

const getRoutePlan = async (crewId, date) => {
  const { rows } = await db.query(
    `SELECT rp.*, c.name as crew_name
     FROM route_plans rp
     JOIN crews c ON rp.crew_id = c.id
     WHERE rp.crew_id = $1 AND rp.date = $2`,
    [crewId, date]
  );
  
  if (!rows.length) return null;
  
  const plan = rows[0];
  
  const { rows: stops } = await db.query(
    `SELECT rps.*, j.customer_name, j.job_location, j.job_lat, j.job_lon, j.job_number
     FROM route_plan_stops rps
     JOIN jobs j ON rps.job_id = j.id
     WHERE rps.route_plan_id = $1
     ORDER BY rps.stop_order`,
    [plan.id]
  );
  
  return {
    routePlanId: plan.id,
    crewId: plan.crew_id,
    crewName: plan.crew_name,
    date: plan.date,
    status: plan.status,
    startLocation: plan.start_location_address ? {
      address: plan.start_location_address,
      lat: plan.start_location_lat,
      lon: plan.start_location_lon
    } : null,
    endLocation: plan.end_location_address ? {
      address: plan.end_location_address,
      lat: plan.end_location_lat,
      lon: plan.end_location_lon
    } : null,
    totalDistanceMeters: plan.total_distance_meters,
    totalDistanceMiles: plan.total_distance_meters ? plan.total_distance_meters * 0.000621371 : 0,
    totalDriveTimeMinutes: plan.total_drive_time_seconds ? plan.total_drive_time_seconds / 60 : 0,
    totalWorkTimeMinutes: plan.total_work_time_seconds ? plan.total_work_time_seconds / 60 : 0,
    optimizationScore: plan.optimization_score,
    stops: stops.map(s => ({
      order: s.stop_order,
      jobId: s.job_id,
      jobNumber: s.job_number,
      customerName: s.customer_name,
      location: {
        lat: Number(s.job_lat),
        lon: Number(s.job_lon),
        address: s.job_location
      },
      scheduledArrival: s.scheduled_arrival,
      estimatedDurationMinutes: s.estimated_duration_minutes,
      travelTimeFromPreviousMinutes: s.travel_time_from_previous_seconds ? s.travel_time_from_previous_seconds / 60 : 0,
      travelDistanceFromPreviousMeters: s.travel_distance_from_previous_meters,
      actualArrival: s.actual_arrival_time,
      actualDeparture: s.actual_departure_time,
      status: s.status
    })),
    publishedAt: plan.published_at,
    createdAt: plan.created_at,
    updatedAt: plan.updated_at
  };
};

module.exports = {
  optimizeRoute,
  getDistanceMatrix,
  reorderStops,
  getRoutePlan,
  haversineDistanceMiles,
  calculateOptimizationScore
};
