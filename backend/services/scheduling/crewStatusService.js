const db = require('../../db');

const VALID_STATUSES = ['available', 'en_route', 'on_site', 'on_break', 'off_duty'];

const updateStatus = async (crewId, status, location = {}, metadata = {}) => {
  console.log(`[CrewStatus] Updating status for crew ${crewId}: ${status}`);
  
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid status: ${status}. Valid statuses are: ${VALID_STATUSES.join(', ')}`);
  }
  
  const { rows: crewRows } = await db.query('SELECT * FROM crews WHERE id = $1', [crewId]);
  if (!crewRows.length) {
    throw new Error(`Crew ${crewId} not found`);
  }
  
  const { rows: inserted } = await db.query(
    `INSERT INTO crew_status_updates (
      crew_id, status, current_job_id,
      latitude, longitude, location_accuracy,
      heading, speed, battery_level, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      crewId,
      status,
      metadata.currentJobId || null,
      location.latitude || null,
      location.longitude || null,
      location.accuracy || null,
      location.heading || null,
      location.speed || null,
      metadata.batteryLevel || null,
      metadata.updatedBy || null
    ]
  );
  
  console.log(`[CrewStatus] Status updated for crew ${crewId}`);
  
  return {
    id: inserted[0].id,
    crewId,
    crewName: crewRows[0].name,
    status,
    currentJobId: metadata.currentJobId || null,
    location: location.latitude ? {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      heading: location.heading,
      speed: location.speed
    } : null,
    batteryLevel: metadata.batteryLevel,
    updatedBy: metadata.updatedBy,
    updatedAt: inserted[0].created_at
  };
};

const getCurrentStatus = async (crewId) => {
  console.log(`[CrewStatus] Getting current status for crew ${crewId}`);
  
  const { rows: crewRows } = await db.query('SELECT * FROM crews WHERE id = $1', [crewId]);
  if (!crewRows.length) {
    throw new Error(`Crew ${crewId} not found`);
  }
  const crew = crewRows[0];
  
  const { rows: statusRows } = await db.query(
    `SELECT csu.*, j.customer_name, j.job_number, j.job_location
     FROM crew_status_updates csu
     LEFT JOIN jobs j ON csu.current_job_id = j.id
     WHERE csu.crew_id = $1
     ORDER BY csu.created_at DESC
     LIMIT 1`,
    [crewId]
  );
  
  if (!statusRows.length) {
    return {
      crewId,
      crewName: crew.name,
      status: 'off_duty',
      currentJob: null,
      location: null,
      lastUpdated: null,
      note: 'No status updates recorded'
    };
  }
  
  const latest = statusRows[0];
  
  return {
    crewId,
    crewName: crew.name,
    status: latest.status,
    currentJob: latest.current_job_id ? {
      jobId: latest.current_job_id,
      jobNumber: latest.job_number,
      customerName: latest.customer_name,
      location: latest.job_location
    } : null,
    location: latest.latitude ? {
      latitude: Number(latest.latitude),
      longitude: Number(latest.longitude),
      accuracy: latest.location_accuracy ? Number(latest.location_accuracy) : null,
      heading: latest.heading ? Number(latest.heading) : null,
      speed: latest.speed ? Number(latest.speed) : null
    } : null,
    batteryLevel: latest.battery_level,
    updatedBy: latest.updated_by,
    lastUpdated: latest.created_at
  };
};

const getAllCrewStatuses = async (options = {}) => {
  console.log('[CrewStatus] Getting all crew statuses');
  
  const { activeOnly = true } = options;
  
  let crewQuery = 'SELECT * FROM crews';
  if (activeOnly) {
    crewQuery += ' WHERE active = true';
  }
  crewQuery += ' ORDER BY name';
  
  const { rows: crews } = await db.query(crewQuery);
  
  if (crews.length === 0) {
    return { crews: [], summary: { total: 0 } };
  }
  
  const crewIds = crews.map(c => c.id);
  
  const { rows: latestStatuses } = await db.query(
    `SELECT DISTINCT ON (crew_id)
      csu.*, j.customer_name, j.job_number, j.job_location
     FROM crew_status_updates csu
     LEFT JOIN jobs j ON csu.current_job_id = j.id
     WHERE csu.crew_id = ANY($1)
     ORDER BY csu.crew_id, csu.created_at DESC`,
    [crewIds]
  );
  
  const statusMap = new Map(latestStatuses.map(s => [s.crew_id, s]));
  
  const results = crews.map(crew => {
    const status = statusMap.get(crew.id);
    
    return {
      crewId: crew.id,
      crewName: crew.name,
      active: crew.active,
      status: status?.status || 'off_duty',
      currentJob: status?.current_job_id ? {
        jobId: status.current_job_id,
        jobNumber: status.job_number,
        customerName: status.customer_name,
        location: status.job_location
      } : null,
      location: status?.latitude ? {
        latitude: Number(status.latitude),
        longitude: Number(status.longitude),
        accuracy: status.location_accuracy ? Number(status.location_accuracy) : null
      } : null,
      lastUpdated: status?.created_at || null
    };
  });
  
  const summary = {
    total: results.length,
    available: results.filter(r => r.status === 'available').length,
    enRoute: results.filter(r => r.status === 'en_route').length,
    onSite: results.filter(r => r.status === 'on_site').length,
    onBreak: results.filter(r => r.status === 'on_break').length,
    offDuty: results.filter(r => r.status === 'off_duty').length
  };
  
  return { crews: results, summary };
};

const getLocationHistory = async (crewId, options = {}) => {
  console.log(`[CrewStatus] Getting location history for crew ${crewId}`);
  
  const { 
    startDate, 
    endDate, 
    limit = 100 
  } = options;
  
  const { rows: crewRows } = await db.query('SELECT * FROM crews WHERE id = $1', [crewId]);
  if (!crewRows.length) {
    throw new Error(`Crew ${crewId} not found`);
  }
  
  let query = `
    SELECT csu.*, j.customer_name, j.job_number
    FROM crew_status_updates csu
    LEFT JOIN jobs j ON csu.current_job_id = j.id
    WHERE csu.crew_id = $1
      AND csu.latitude IS NOT NULL
  `;
  const params = [crewId];
  let paramIndex = 2;
  
  if (startDate) {
    query += ` AND csu.created_at >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }
  
  if (endDate) {
    query += ` AND csu.created_at <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }
  
  query += ` ORDER BY csu.created_at DESC LIMIT $${paramIndex}`;
  params.push(limit);
  
  const { rows } = await db.query(query, params);
  
  return {
    crewId,
    crewName: crewRows[0].name,
    locations: rows.map(r => ({
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      accuracy: r.location_accuracy ? Number(r.location_accuracy) : null,
      heading: r.heading ? Number(r.heading) : null,
      speed: r.speed ? Number(r.speed) : null,
      status: r.status,
      currentJobId: r.current_job_id,
      jobNumber: r.job_number,
      customerName: r.customer_name,
      timestamp: r.created_at
    })),
    count: rows.length
  };
};

const setCrewOnSite = async (crewId, jobId, location = {}, metadata = {}) => {
  console.log(`[CrewStatus] Setting crew ${crewId} on site at job ${jobId}`);
  
  const { rows: jobs } = await db.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
  if (!jobs.length) {
    throw new Error(`Job ${jobId} not found`);
  }
  
  return await updateStatus(crewId, 'on_site', location, {
    ...metadata,
    currentJobId: jobId
  });
};

const setCrewEnRoute = async (crewId, jobId, location = {}, metadata = {}) => {
  console.log(`[CrewStatus] Setting crew ${crewId} en route to job ${jobId}`);
  
  const { rows: jobs } = await db.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
  if (!jobs.length) {
    throw new Error(`Job ${jobId} not found`);
  }
  
  return await updateStatus(crewId, 'en_route', location, {
    ...metadata,
    currentJobId: jobId
  });
};

const setCrewAvailable = async (crewId, location = {}, metadata = {}) => {
  console.log(`[CrewStatus] Setting crew ${crewId} as available`);
  
  return await updateStatus(crewId, 'available', location, metadata);
};

const setCrewOffDuty = async (crewId, location = {}, metadata = {}) => {
  console.log(`[CrewStatus] Setting crew ${crewId} as off duty`);
  
  return await updateStatus(crewId, 'off_duty', location, metadata);
};

module.exports = {
  updateStatus,
  getCurrentStatus,
  getAllCrewStatuses,
  getLocationHistory,
  setCrewOnSite,
  setCrewEnRoute,
  setCrewAvailable,
  setCrewOffDuty,
  VALID_STATUSES
};
