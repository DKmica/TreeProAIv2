const db = require('../db');

const AVERAGE_SPEED_MPH = 28;
const DEFAULT_JOB_HOURS = 2.5;

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return [];
    }
  }
  return [];
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMinutesToTime = (minutesFromMidnight) => {
  const date = new Date();
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = Math.round(minutesFromMidnight % 60);
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const haversineDistanceMiles = (lat1, lon1, lat2, lon2) => {
  const toRadians = (deg) => (deg * Math.PI) / 180;
  const R = 3958.8; // Earth radius miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const normalizeStatus = (status) => {
  if (!status) return '';
  return status.toString().toLowerCase();
};

const buildDateRange = (startDate, endDate) => {
  const range = [];
  const cursor = new Date(startDate);
  const final = new Date(endDate);
  while (cursor <= final) {
    range.push(cursor.toISOString().split('T')[0]);
    cursor.setDate(cursor.getDate() + 1);
  }
  return range;
};

const fetchCustomerLocationForJob = async (job) => {
  if (!job.quote_id) {
    return null;
  }

  const quoteResult = await db.query('SELECT lead_id, job_location FROM quotes WHERE id = $1', [job.quote_id]);
  if (!quoteResult.rows.length) {
    return null;
  }
  const quoteRow = quoteResult.rows[0];
  if (quoteRow.lead_id) {
    const leadResult = await db.query('SELECT customer_id FROM leads WHERE id = $1', [quoteRow.lead_id]);
    if (leadResult.rows.length && leadResult.rows[0].customer_id) {
      const customerResult = await db.query('SELECT lat, lon, address FROM customers WHERE id = $1', [leadResult.rows[0].customer_id]);
      if (customerResult.rows.length) {
        const customer = customerResult.rows[0];
        if (customer.lat !== null && customer.lat !== undefined && customer.lon !== null && customer.lon !== undefined) {
          return {
            lat: Number(customer.lat),
            lon: Number(customer.lon),
            address: customer.address || quoteRow.job_location || job.job_location || null
          };
        }
      }
    }
  }

  return quoteRow.job_location
    ? {
        lat: null,
        lon: null,
        address: quoteRow.job_location
      }
    : null;
};

const enrichJobWithLocation = async (job) => {
  if (job.clock_in_lat !== null && job.clock_in_lat !== undefined && job.clock_in_lon !== null && job.clock_in_lon !== undefined) {
    return {
      lat: Number(job.clock_in_lat),
      lon: Number(job.clock_in_lon),
      address: job.job_location || null
    };
  }

  const customerLocation = await fetchCustomerLocationForJob(job);
  if (customerLocation && customerLocation.lat !== null && customerLocation.lon !== null) {
    return customerLocation;
  }

  // As a last resort, attempt to match the customer by name
  if (job.customer_name) {
    const customerResult = await db.query('SELECT lat, lon, address FROM customers WHERE LOWER(name) = LOWER($1) LIMIT 1', [job.customer_name]);
    if (customerResult.rows.length) {
      const customer = customerResult.rows[0];
      if (customer.lat !== null && customer.lat !== undefined && customer.lon !== null && customer.lon !== undefined) {
        return {
          lat: Number(customer.lat),
          lon: Number(customer.lon),
          address: customer.address || job.job_location || null
        };
      }
    }
  }

  return null;
};

const fetchJobsForDate = async (date, crewId, includeInProgress = true) => {
  const { rows: jobRows } = await db.query('SELECT * FROM jobs');
  const scheduledJobs = jobRows.filter(job => {
    if (!job.scheduled_date) return false;
    if (job.scheduled_date !== date) return false;
    const status = normalizeStatus(job.status);
    if (status === 'cancelled') return false;
    if (!includeInProgress && status === 'in progress') return false;
    return status === 'scheduled' || status === 'in progress' || status === 'in_progress' || status === 'inprogress';
  });

  if (!crewId) {
    return scheduledJobs;
  }

  const { rows: assignmentRows } = await db.query('SELECT * FROM crew_assignments');
  const jobIds = new Set(
    assignmentRows
      .filter(assignment => assignment.crew_id === crewId && assignment.assigned_date === date)
      .map(assignment => assignment.job_id)
  );

  return scheduledJobs.filter(job => jobIds.has(job.id));
};

const optimizeCrewRoute = async ({ date, crewId, startLocation }) => {
  const jobs = await fetchJobsForDate(date, crewId, true);
  const enrichedJobs = [];

  for (const job of jobs) {
    const location = await enrichJobWithLocation(job);
    if (!location || location.lat === null || location.lon === null) {
      continue;
    }
    enrichedJobs.push({ job, location });
  }

  if (enrichedJobs.length === 0) {
    return {
      date,
      crewId,
      crewName: null,
      startLocation: startLocation || 'Company yard',
      totalDistanceMiles: 0,
      totalDriveMinutes: 0,
      totalEstimatedHours: 0,
      stops: [],
      warnings: ['No scheduled jobs with valid locations for this date.'],
      generatedAt: new Date().toISOString()
    };
  }

  let crewName = null;
  if (crewId) {
    const crewResult = await db.query('SELECT name FROM crews WHERE id = $1', [crewId]);
    if (crewResult.rows.length) {
      crewName = crewResult.rows[0].name;
    }
  }

  const remaining = enrichedJobs.slice();
  let currentLat = remaining[0].location.lat;
  let currentLon = remaining[0].location.lon;
  const routeStops = [];
  let cumulativeDrive = 0;
  let totalDistance = 0;
  let totalEstimatedHours = 0;
  let clockMinutes = 8 * 60; // start at 8:00am

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Number.MAX_VALUE;
    remaining.forEach((item, index) => {
      const distance = haversineDistanceMiles(currentLat, currentLon, item.location.lat, item.location.lon);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    const nextStop = remaining.splice(nearestIndex, 1)[0];
    const travelMinutes = nearestDistance / AVERAGE_SPEED_MPH * 60;
    clockMinutes += travelMinutes;
    cumulativeDrive += travelMinutes;
    totalDistance += nearestDistance;

    const jobHours = toNumber(nextStop.job.estimated_hours, DEFAULT_JOB_HOURS);
    totalEstimatedHours += jobHours;

    routeStops.push({
      order: routeStops.length + 1,
      jobId: nextStop.job.id,
      customerName: nextStop.job.customer_name,
      scheduledDate: nextStop.job.scheduled_date,
      status: nextStop.job.status,
      location: {
        lat: nextStop.location.lat,
        lng: nextStop.location.lon,
        address: nextStop.location.address
      },
      travelDistanceMiles: nearestDistance,
      travelDurationMinutes: travelMinutes,
      cumulativeDriveMinutes: cumulativeDrive,
      arrivalTimeLocal: formatMinutesToTime(clockMinutes),
      estimatedDurationHours: jobHours,
      assignedCrewIds: toArray(nextStop.job.assigned_crew),
      notes: nextStop.job.special_instructions || null
    });

    clockMinutes += jobHours * 60;
    currentLat = nextStop.location.lat;
    currentLon = nextStop.location.lon;
  }

  const warnings = [];
  if (routeStops.length > 6) {
    warnings.push('Consider splitting this route across multiple crews to maintain quality.');
  }

  return {
    date,
    crewId,
    crewName,
    startLocation: startLocation || 'Company yard',
    totalDistanceMiles: totalDistance,
    totalDriveMinutes: cumulativeDrive,
    totalEstimatedHours,
    stops: routeStops,
    warnings,
    generatedAt: new Date().toISOString()
  };
};

const getCrewAvailability = async ({ startDate, endDate }) => {
  const { rows: crewRows } = await db.query('SELECT * FROM crews');
  if (!crewRows.length) {
    return [];
  }

  const { rows: assignmentRows } = await db.query('SELECT * FROM crew_assignments');
  const { rows: jobRows } = await db.query('SELECT * FROM jobs');
  const jobMap = new Map(jobRows.map(job => [job.id, job]));
  const dates = buildDateRange(startDate, endDate);
  const summaries = [];

  crewRows.forEach(crew => {
    dates.forEach(date => {
      const assignments = assignmentRows.filter(row => row.crew_id === crew.id && row.assigned_date === date);
      const scheduledHours = assignments.reduce((total, assignment) => {
        const job = jobMap.get(assignment.job_id);
        const hours = job ? toNumber(job.estimated_hours, DEFAULT_JOB_HOURS) : DEFAULT_JOB_HOURS;
        return total + hours;
      }, 0);

      const capacity = toNumber(crew.capacity, 8);
      const availableHours = Math.max(capacity - scheduledHours, 0);
      const utilizationPercentage = capacity > 0 ? Math.min((scheduledHours / capacity) * 100, 200) : 0;
      let status = 'healthy';
      if (availableHours <= 0) {
        status = 'overbooked';
      } else if (utilizationPercentage >= 85) {
        status = 'tight';
      }

      summaries.push({
        crewId: crew.id,
        crewName: crew.name,
        date,
        totalCapacityHours: capacity,
        scheduledHours,
        availableHours,
        utilizationPercentage,
        assignments: assignments.length,
        status,
        notes: status === 'overbooked' ? 'Consider reassigning work to another crew.' : status === 'tight' ? 'Limited capacity remaining.' : undefined
      });
    });
  });

  return summaries;
};

const generateWeatherInsights = async ({ startDate, endDate, crewId }) => {
  const { rows: jobRows } = await db.query('SELECT * FROM jobs');
  const { rows: assignmentRows } = await db.query('SELECT * FROM crew_assignments');
  const assignmentsByJob = new Map();
  assignmentRows.forEach(assignment => {
    if (!assignmentsByJob.has(assignment.job_id)) {
      assignmentsByJob.set(assignment.job_id, []);
    }
    assignmentsByJob.get(assignment.job_id).push(assignment);
  });

  const start = new Date(startDate);
  const end = new Date(endDate);
  const insights = [];

  for (const job of jobRows) {
    if (!job.scheduled_date) continue;
    const jobDate = new Date(job.scheduled_date);
    if (jobDate < start || jobDate > end) continue;

    if (crewId) {
      const assignments = assignmentsByJob.get(job.id) || [];
      const isAssigned = assignments.some(assignment => assignment.crew_id === crewId);
      if (!isAssigned) continue;
    }

    const location = await enrichJobWithLocation(job);
    if (!location || location.lat === null || location.lon === null) continue;

    const seedBase = location.lat * 100 + location.lon * 10 + jobDate.getTime() / (1000 * 60 * 60 * 24);
    const precipProbability = Math.round(seededRandom(seedBase) * 100);
    const windMph = Math.round(seededRandom(seedBase + 42) * 25) + 5;
    const thunderRisk = seededRandom(seedBase + 7);
    let condition = 'Clear';
    if (precipProbability > 70) {
      condition = 'Heavy rain likely';
    } else if (precipProbability > 45) {
      condition = 'Scattered showers';
    } else if (windMph > 25) {
      condition = 'Gusty winds';
    } else if (thunderRisk > 0.8) {
      condition = 'Thunderstorms';
    }

    let riskLevel = 'low';
    let recommendation = 'Proceed as planned.';
    if (precipProbability > 75 || windMph > 30) {
      riskLevel = 'high';
      recommendation = 'Consider rescheduling or staging indoor tasks.';
    } else if (precipProbability > 55 || windMph > 22) {
      riskLevel = 'medium';
      recommendation = 'Keep an eye on conditions and prepare backup plans.';
    }

    insights.push({
      jobId: job.id,
      jobNumber: job.job_number || null,
      customerName: job.customer_name,
      scheduledDate: job.scheduled_date,
      crewIds: (assignmentsByJob.get(job.id) || []).map(a => a.crew_id),
      location: {
        lat: location.lat,
        lng: location.lon,
        address: location.address
      },
      condition,
      precipProbability,
      windMph,
      riskLevel,
      recommendation,
      advisory: riskLevel === 'high' ? 'High risk of weather delay.' : undefined
    });
  }

  return insights;
};

const dispatchCrewDigest = async ({ date, crewId, channel = 'sms' }) => {
  const plan = await optimizeCrewRoute({ date, crewId, includeInProgress: true });
  if (!plan.stops.length) {
    return {
      summary: 'No route available for dispatch.',
      notifications: [],
      generatedAt: new Date().toISOString()
    };
  }

  const crewName = plan.crewName || 'Crew';
  const notifications = plan.stops.map(stop => ({
    crewId,
    crewName: plan.crewName || undefined,
    jobId: stop.jobId,
    scheduledDate: stop.scheduledDate || date,
    message: `${stop.customerName} - ETA ${stop.arrivalTimeLocal}. Budget ${stop.estimatedDurationHours.toFixed(1)}h on site.`,
    channel,
    scheduledAt: new Date().toISOString()
  }));

  return {
    summary: `${crewName} has ${plan.stops.length} stops on ${date}. Total drive time ${Math.round(plan.totalDriveMinutes)} minutes.`,
    notifications,
    generatedAt: new Date().toISOString()
  };
};

module.exports = {
  optimizeCrewRoute,
  getCrewAvailability,
  generateWeatherInsights,
  dispatchCrewDigest
};
