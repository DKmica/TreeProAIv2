const db = require('../../db');
const crewAssignmentService = require('./crewAssignmentService');

const DEFAULT_CAPACITY_HOURS = 8;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildDateRange = (startDate, days) => {
  const range = [];
  const cursor = new Date(startDate);
  for (let i = 0; i < days; i++) {
    range.push(cursor.toISOString().split('T')[0]);
    cursor.setDate(cursor.getDate() + 1);
  }
  return range;
};

const getConflicts = async (crewId, date) => {
  console.log(`[ConflictResolution] Getting conflicts for crew ${crewId} on ${date}`);
  
  const { rows: crewRows } = await db.query('SELECT * FROM crews WHERE id = $1', [crewId]);
  if (!crewRows.length) {
    throw new Error(`Crew ${crewId} not found`);
  }
  const crew = crewRows[0];
  
  const capacity = await crewAssignmentService.checkCapacity(crewId, date);
  const conflicts = [];
  
  if (!capacity.isAvailable) {
    conflicts.push({
      type: 'unavailable',
      severity: 'critical',
      description: `Crew is marked unavailable: ${capacity.unavailableReason || 'calendar blocked'}`,
      affectedJobs: [],
      resolution: 'Reassign jobs to another crew or change availability'
    });
  }
  
  if (capacity.remainingHours < 0) {
    const overbooked = Math.abs(capacity.remainingHours);
    
    const { rows: assignments } = await db.query(
      `SELECT ca.*, j.id as job_id, j.customer_name, j.estimated_hours, j.job_number
       FROM crew_assignments ca
       JOIN jobs j ON ca.job_id = j.id
       WHERE ca.crew_id = $1 AND ca.assigned_date = $2
         AND j.status NOT IN ('cancelled', 'completed')
       ORDER BY j.estimated_hours DESC`,
      [crewId, date]
    );
    
    conflicts.push({
      type: 'overbooking',
      severity: overbooked > 2 ? 'critical' : 'high',
      description: `Crew is overbooked by ${overbooked.toFixed(1)} hours`,
      overbooked,
      totalScheduled: capacity.scheduledHours,
      totalCapacity: capacity.totalCapacityHours,
      affectedJobs: assignments.map(a => ({
        jobId: a.job_id,
        jobNumber: a.job_number,
        customerName: a.customer_name,
        estimatedHours: toNumber(a.estimated_hours, 2.5)
      })),
      resolution: 'Reassign one or more jobs to reduce workload'
    });
  }
  
  const { rows: overlappingJobs } = await db.query(
    `SELECT ca1.job_id as job1_id, ca2.job_id as job2_id,
            j1.customer_name as job1_customer, j2.customer_name as job2_customer,
            j1.job_number as job1_number, j2.job_number as job2_number,
            j1.scheduled_time as job1_time, j2.scheduled_time as job2_time,
            j1.estimated_hours as job1_hours, j2.estimated_hours as job2_hours
     FROM crew_assignments ca1
     JOIN crew_assignments ca2 ON ca1.crew_id = ca2.crew_id 
       AND ca1.assigned_date = ca2.assigned_date
       AND ca1.job_id < ca2.job_id
     JOIN jobs j1 ON ca1.job_id = j1.id
     JOIN jobs j2 ON ca2.job_id = j2.id
     WHERE ca1.crew_id = $1 AND ca1.assigned_date = $2
       AND j1.scheduled_time IS NOT NULL AND j2.scheduled_time IS NOT NULL
       AND j1.status NOT IN ('cancelled', 'completed')
       AND j2.status NOT IN ('cancelled', 'completed')`,
    [crewId, date]
  );
  
  for (const overlap of overlappingJobs) {
    if (overlap.job1_time && overlap.job2_time) {
      const time1 = new Date(`2000-01-01T${overlap.job1_time}`);
      const time2 = new Date(`2000-01-01T${overlap.job2_time}`);
      const hours1 = toNumber(overlap.job1_hours, 2.5);
      const end1 = new Date(time1.getTime() + hours1 * 60 * 60 * 1000);
      
      if (time2 < end1) {
        conflicts.push({
          type: 'time_overlap',
          severity: 'high',
          description: `Job time conflict between ${overlap.job1_customer} and ${overlap.job2_customer}`,
          job1: {
            jobId: overlap.job1_id,
            jobNumber: overlap.job1_number,
            customerName: overlap.job1_customer,
            scheduledTime: overlap.job1_time
          },
          job2: {
            jobId: overlap.job2_id,
            jobNumber: overlap.job2_number,
            customerName: overlap.job2_customer,
            scheduledTime: overlap.job2_time
          },
          resolution: 'Adjust job times or reassign one job'
        });
      }
    }
  }
  
  const { rows: skillIssues } = await db.query(
    `SELECT ca.job_id, j.customer_name, j.job_number,
            jsr.skill_id, s.name as skill_name, jsr.required_proficiency, jsr.is_mandatory
     FROM crew_assignments ca
     JOIN jobs j ON ca.job_id = j.id
     JOIN job_skill_requirements jsr ON j.id = jsr.job_id
     JOIN skills s ON jsr.skill_id = s.id
     LEFT JOIN crew_skill_profiles csp ON ca.crew_id = csp.crew_id AND jsr.skill_id = csp.skill_id
     WHERE ca.crew_id = $1 AND ca.assigned_date = $2
       AND jsr.is_mandatory = true
       AND j.status NOT IN ('cancelled', 'completed')
       AND (csp.id IS NULL OR csp.proficiency_level < jsr.required_proficiency
            OR (csp.certified_until IS NOT NULL AND csp.certified_until < CURRENT_DATE))`,
    [crewId, date]
  );
  
  if (skillIssues.length > 0) {
    const groupedByJob = {};
    for (const issue of skillIssues) {
      if (!groupedByJob[issue.job_id]) {
        groupedByJob[issue.job_id] = {
          jobId: issue.job_id,
          jobNumber: issue.job_number,
          customerName: issue.customer_name,
          missingSkills: []
        };
      }
      groupedByJob[issue.job_id].missingSkills.push({
        skillId: issue.skill_id,
        skillName: issue.skill_name,
        requiredProficiency: issue.required_proficiency
      });
    }
    
    for (const jobData of Object.values(groupedByJob)) {
      conflicts.push({
        type: 'skill_mismatch',
        severity: 'high',
        description: `Crew lacks required skills for ${jobData.customerName}`,
        job: {
          jobId: jobData.jobId,
          jobNumber: jobData.jobNumber,
          customerName: jobData.customerName
        },
        missingSkills: jobData.missingSkills,
        resolution: 'Reassign to a qualified crew or adjust job requirements'
      });
    }
  }
  
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  conflicts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  
  return {
    crewId,
    crewName: crew.name,
    date,
    conflictCount: conflicts.length,
    hasCritical: conflicts.some(c => c.severity === 'critical'),
    conflicts,
    capacity
  };
};

const suggestAlternativeCrews = async (jobId, date, options = {}) => {
  console.log(`[ConflictResolution] Suggesting alternative crews for job ${jobId} on ${date}`);
  
  const { rows: jobRows } = await db.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
  if (!jobRows.length) {
    throw new Error(`Job ${jobId} not found`);
  }
  const job = jobRows[0];
  
  const { rows: currentAssignment } = await db.query(
    `SELECT ca.*, c.name as crew_name
     FROM crew_assignments ca
     JOIN crews c ON ca.crew_id = c.id
     WHERE ca.job_id = $1`,
    [jobId]
  );
  
  const currentCrewId = currentAssignment.length > 0 ? currentAssignment[0].crew_id : null;
  
  const matchingResult = await crewAssignmentService.findMatchingCrews(jobId, date, {
    includeUnavailable: true
  });
  
  const alternatives = matchingResult.matchingCrews
    .filter(crew => crew.crewId !== currentCrewId)
    .map(crew => ({
      crewId: crew.crewId,
      crewName: crew.crewName,
      score: crew.score,
      remainingCapacity: crew.capacity.remainingHours,
      utilizationAfterAssignment: Math.round(
        ((crew.capacity.scheduledHours + toNumber(job.estimated_hours, 2.5)) / 
         crew.capacity.totalCapacityHours) * 100
      ),
      skillMatchScore: crew.skillMatch.score,
      recommendation: crew.score >= 80 ? 'highly_recommended' : 
                      crew.score >= 60 ? 'recommended' : 'possible'
    }));
  
  return {
    jobId,
    jobNumber: job.job_number,
    customerName: job.customer_name,
    date,
    currentCrew: currentAssignment.length > 0 ? {
      crewId: currentAssignment[0].crew_id,
      crewName: currentAssignment[0].crew_name
    } : null,
    alternatives,
    unavailableReasons: matchingResult.unavailableCrews.map(c => ({
      crewId: c.crewId,
      crewName: c.crewName,
      reason: c.reason
    }))
  };
};

const suggestAlternativeDates = async (jobId, crewId, options = {}) => {
  const {
    searchDays = 14,
    startFrom = new Date().toISOString().split('T')[0],
    excludeWeekends = false
  } = options;
  
  console.log(`[ConflictResolution] Suggesting alternative dates for job ${jobId} with crew ${crewId}`);
  
  const { rows: jobRows } = await db.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
  if (!jobRows.length) {
    throw new Error(`Job ${jobId} not found`);
  }
  const job = jobRows[0];
  const jobDuration = toNumber(job.estimated_hours, 2.5);
  
  const { rows: crewRows } = await db.query('SELECT * FROM crews WHERE id = $1', [crewId]);
  if (!crewRows.length) {
    throw new Error(`Crew ${crewId} not found`);
  }
  const crew = crewRows[0];
  
  const dates = buildDateRange(startFrom, searchDays);
  const availableDates = [];
  
  for (const date of dates) {
    if (excludeWeekends) {
      const dayOfWeek = new Date(date).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    }
    
    const capacity = await crewAssignmentService.checkCapacity(crewId, date);
    
    if (!capacity.isAvailable) continue;
    if (capacity.remainingHours < jobDuration) continue;
    
    const utilizationAfter = Math.round(
      ((capacity.scheduledHours + jobDuration) / capacity.totalCapacityHours) * 100
    );
    
    availableDates.push({
      date,
      dayOfWeek: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
      remainingCapacity: capacity.remainingHours,
      currentAssignments: capacity.assignmentCount,
      utilizationAfterAssignment: utilizationAfter,
      recommendation: utilizationAfter <= 70 ? 'optimal' :
                      utilizationAfter <= 85 ? 'good' : 'acceptable'
    });
  }
  
  availableDates.sort((a, b) => {
    const recOrder = { optimal: 0, good: 1, acceptable: 2 };
    if (recOrder[a.recommendation] !== recOrder[b.recommendation]) {
      return recOrder[a.recommendation] - recOrder[b.recommendation];
    }
    return new Date(a.date) - new Date(b.date);
  });
  
  return {
    jobId,
    jobNumber: job.job_number,
    customerName: job.customer_name,
    crewId,
    crewName: crew.name,
    requiredDuration: jobDuration,
    searchRange: { from: startFrom, days: searchDays },
    availableDates,
    totalAvailable: availableDates.length
  };
};

const getConflictSeverityScore = async (crewId, date) => {
  const conflicts = await getConflicts(crewId, date);
  
  let score = 0;
  for (const conflict of conflicts.conflicts) {
    switch (conflict.severity) {
      case 'critical':
        score += 100;
        break;
      case 'high':
        score += 50;
        break;
      case 'medium':
        score += 20;
        break;
      case 'low':
        score += 5;
        break;
    }
  }
  
  return {
    crewId,
    date,
    score,
    conflictCount: conflicts.conflictCount,
    hasCritical: conflicts.hasCritical,
    status: score === 0 ? 'clear' :
            score < 50 ? 'minor_issues' :
            score < 100 ? 'needs_attention' : 'critical'
  };
};

const resolveConflict = async (conflictType, resolution) => {
  console.log(`[ConflictResolution] Resolving ${conflictType} conflict`);
  
  switch (resolution.action) {
    case 'reassign_job':
      return await crewAssignmentService.assignCrewToJob(
        resolution.jobId,
        resolution.newCrewId,
        resolution.date,
        { skipValidation: false }
      );
    
    case 'reschedule_job':
      await db.query(
        `UPDATE jobs SET scheduled_date = $1, updated_at = NOW() WHERE id = $2`,
        [resolution.newDate, resolution.jobId]
      );
      
      await db.query(
        `UPDATE crew_assignments SET assigned_date = $1, updated_at = NOW() WHERE job_id = $2`,
        [resolution.newDate, resolution.jobId]
      );
      
      return {
        success: true,
        jobId: resolution.jobId,
        newDate: resolution.newDate,
        message: `Job rescheduled to ${resolution.newDate}`
      };
    
    case 'update_capacity':
      await db.query(
        `INSERT INTO crew_capacity_calendar (crew_id, date, available_hours, is_available, reason)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (crew_id, date) 
         DO UPDATE SET available_hours = $3, is_available = $4, reason = $5, updated_at = NOW()`,
        [resolution.crewId, resolution.date, resolution.newCapacity, true, resolution.reason]
      );
      
      return {
        success: true,
        crewId: resolution.crewId,
        date: resolution.date,
        newCapacity: resolution.newCapacity,
        message: `Capacity updated to ${resolution.newCapacity} hours`
      };
    
    default:
      throw new Error(`Unknown resolution action: ${resolution.action}`);
  }
};

module.exports = {
  getConflicts,
  suggestAlternativeCrews,
  suggestAlternativeDates,
  getConflictSeverityScore,
  resolveConflict
};
