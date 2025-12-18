const db = require('../../db');

const DEFAULT_CAPACITY_HOURS = 8;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getCrewSkills = async (crewId) => {
  console.log(`[CrewAssignment] Getting skills for crew ${crewId}`);
  
  const { rows } = await db.query(
    `SELECT csp.*, s.name, s.description, s.category, s.is_certification
     FROM crew_skill_profiles csp
     JOIN skills s ON csp.skill_id = s.id
     WHERE csp.crew_id = $1`,
    [crewId]
  );
  
  return rows.map(row => ({
    skillId: row.skill_id,
    skillName: row.name,
    description: row.description,
    category: row.category,
    isCertification: row.is_certification,
    proficiencyLevel: row.proficiency_level,
    certifiedUntil: row.certified_until,
    isExpired: row.certified_until ? new Date(row.certified_until) < new Date() : false,
    notes: row.notes
  }));
};

const getJobSkillRequirements = async (jobId) => {
  const { rows } = await db.query(
    `SELECT jsr.*, s.name, s.description, s.category
     FROM job_skill_requirements jsr
     JOIN skills s ON jsr.skill_id = s.id
     WHERE jsr.job_id = $1`,
    [jobId]
  );
  
  return rows.map(row => ({
    skillId: row.skill_id,
    skillName: row.name,
    description: row.description,
    category: row.category,
    requiredProficiency: row.required_proficiency,
    isMandatory: row.is_mandatory
  }));
};

const checkSkillMatch = async (crewId, jobId) => {
  const crewSkills = await getCrewSkills(crewId);
  const jobRequirements = await getJobSkillRequirements(jobId);
  
  if (jobRequirements.length === 0) {
    return {
      matches: true,
      score: 100,
      missingMandatory: [],
      missingOptional: [],
      matchedSkills: []
    };
  }
  
  const crewSkillMap = new Map(crewSkills.map(s => [s.skillId, s]));
  const missingMandatory = [];
  const missingOptional = [];
  const matchedSkills = [];
  
  for (const req of jobRequirements) {
    const crewSkill = crewSkillMap.get(req.skillId);
    
    if (!crewSkill) {
      if (req.isMandatory) {
        missingMandatory.push(req);
      } else {
        missingOptional.push(req);
      }
      continue;
    }
    
    if (crewSkill.isExpired) {
      if (req.isMandatory) {
        missingMandatory.push({ ...req, reason: 'certification_expired' });
      }
      continue;
    }
    
    if (crewSkill.proficiencyLevel < req.requiredProficiency) {
      if (req.isMandatory) {
        missingMandatory.push({ 
          ...req, 
          reason: 'insufficient_proficiency',
          crewLevel: crewSkill.proficiencyLevel 
        });
      } else {
        missingOptional.push({ 
          ...req, 
          reason: 'insufficient_proficiency',
          crewLevel: crewSkill.proficiencyLevel 
        });
      }
      continue;
    }
    
    matchedSkills.push({
      skillId: req.skillId,
      skillName: req.skillName,
      requiredProficiency: req.requiredProficiency,
      crewProficiency: crewSkill.proficiencyLevel
    });
  }
  
  const mandatoryCount = jobRequirements.filter(r => r.isMandatory).length;
  const matchedMandatoryCount = matchedSkills.filter(m => 
    jobRequirements.find(r => r.skillId === m.skillId && r.isMandatory)
  ).length;
  
  const score = mandatoryCount > 0 
    ? (matchedMandatoryCount / mandatoryCount) * 100 
    : 100;
  
  return {
    matches: missingMandatory.length === 0,
    score: Math.round(score),
    missingMandatory,
    missingOptional,
    matchedSkills
  };
};

const checkCapacity = async (crewId, date) => {
  console.log(`[CrewAssignment] Checking capacity for crew ${crewId} on ${date}`);
  
  const { rows: crewRows } = await db.query(
    'SELECT * FROM crews WHERE id = $1',
    [crewId]
  );
  
  if (!crewRows.length) {
    throw new Error(`Crew ${crewId} not found`);
  }
  
  const crew = crewRows[0];
  const defaultCapacity = toNumber(crew.capacity, DEFAULT_CAPACITY_HOURS);
  
  const { rows: calendarOverrides } = await db.query(
    `SELECT * FROM crew_capacity_calendar WHERE crew_id = $1 AND date = $2`,
    [crewId, date]
  );
  
  let availableHours = defaultCapacity;
  let isAvailable = true;
  let reason = null;
  
  if (calendarOverrides.length > 0) {
    const override = calendarOverrides[0];
    isAvailable = override.is_available;
    reason = override.reason;
    if (override.available_hours !== null) {
      availableHours = toNumber(override.available_hours, defaultCapacity);
    }
  }
  
  const { rows: assignments } = await db.query(
    `SELECT ca.*, j.estimated_hours
     FROM crew_assignments ca
     JOIN jobs j ON ca.job_id = j.id
     WHERE ca.crew_id = $1 AND ca.assigned_date = $2
       AND j.status NOT IN ('cancelled', 'completed')`,
    [crewId, date]
  );
  
  const scheduledHours = assignments.reduce((total, a) => {
    return total + toNumber(a.estimated_hours, 2.5);
  }, 0);
  
  const remainingHours = Math.max(availableHours - scheduledHours, 0);
  const utilizationPercentage = availableHours > 0 
    ? (scheduledHours / availableHours) * 100 
    : 0;
  
  let status = 'available';
  if (!isAvailable) {
    status = 'unavailable';
  } else if (remainingHours <= 0) {
    status = 'at_capacity';
  } else if (utilizationPercentage >= 85) {
    status = 'limited';
  }
  
  return {
    crewId,
    crewName: crew.name,
    date,
    isAvailable,
    unavailableReason: reason,
    totalCapacityHours: availableHours,
    scheduledHours,
    remainingHours,
    utilizationPercentage: Math.round(utilizationPercentage * 10) / 10,
    assignmentCount: assignments.length,
    status,
    hasOverride: calendarOverrides.length > 0
  };
};

const findMatchingCrews = async (jobId, date, options = {}) => {
  console.log(`[CrewAssignment] Finding matching crews for job ${jobId} on ${date}`);
  
  const { rows: jobRows } = await db.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
  if (!jobRows.length) {
    throw new Error(`Job ${jobId} not found`);
  }
  const job = jobRows[0];
  const jobDuration = toNumber(job.estimated_hours, 2.5);
  
  const { rows: allCrews } = await db.query('SELECT * FROM crews WHERE active = true');
  
  const results = [];
  
  for (const crew of allCrews) {
    const capacity = await checkCapacity(crew.id, date);
    const skillMatch = await checkSkillMatch(crew.id, jobId);
    
    if (!capacity.isAvailable) {
      if (options.includeUnavailable) {
        results.push({
          crewId: crew.id,
          crewName: crew.name,
          eligible: false,
          reason: `Unavailable: ${capacity.unavailableReason || 'calendar blocked'}`,
          capacity,
          skillMatch
        });
      }
      continue;
    }
    
    if (capacity.remainingHours < jobDuration) {
      if (options.includeUnavailable) {
        results.push({
          crewId: crew.id,
          crewName: crew.name,
          eligible: false,
          reason: `Insufficient capacity: ${capacity.remainingHours.toFixed(1)}h remaining, need ${jobDuration}h`,
          capacity,
          skillMatch
        });
      }
      continue;
    }
    
    if (!skillMatch.matches) {
      if (options.includeUnavailable) {
        results.push({
          crewId: crew.id,
          crewName: crew.name,
          eligible: false,
          reason: 'Missing required skills',
          capacity,
          skillMatch
        });
      }
      continue;
    }
    
    const overallScore = (
      skillMatch.score * 0.5 + 
      (100 - capacity.utilizationPercentage) * 0.3 +
      (capacity.remainingHours / capacity.totalCapacityHours) * 100 * 0.2
    );
    
    results.push({
      crewId: crew.id,
      crewName: crew.name,
      eligible: true,
      score: Math.round(overallScore),
      capacity,
      skillMatch
    });
  }
  
  results.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    return (b.score || 0) - (a.score || 0);
  });
  
  return {
    jobId,
    jobDuration,
    date,
    matchingCrews: results.filter(r => r.eligible),
    unavailableCrews: options.includeUnavailable ? results.filter(r => !r.eligible) : [],
    totalCrews: allCrews.length,
    eligibleCount: results.filter(r => r.eligible).length
  };
};

const assignCrewToJob = async (jobId, crewId, date, options = {}) => {
  console.log(`[CrewAssignment] Assigning crew ${crewId} to job ${jobId} on ${date}`);
  
  const { rows: jobRows } = await db.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
  if (!jobRows.length) {
    throw new Error(`Job ${jobId} not found`);
  }
  const job = jobRows[0];
  
  const { rows: crewRows } = await db.query('SELECT * FROM crews WHERE id = $1', [crewId]);
  if (!crewRows.length) {
    throw new Error(`Crew ${crewId} not found`);
  }
  const crew = crewRows[0];
  
  if (!options.skipValidation) {
    const capacity = await checkCapacity(crewId, date);
    if (!capacity.isAvailable) {
      throw new Error(`Crew ${crew.name} is not available on ${date}: ${capacity.unavailableReason}`);
    }
    
    const jobDuration = toNumber(job.estimated_hours, 2.5);
    if (capacity.remainingHours < jobDuration) {
      throw new Error(`Crew ${crew.name} has insufficient capacity: ${capacity.remainingHours.toFixed(1)}h remaining, need ${jobDuration}h`);
    }
    
    const skillMatch = await checkSkillMatch(crewId, jobId);
    if (!skillMatch.matches && !options.forceAssignment) {
      const missingSkills = skillMatch.missingMandatory.map(s => s.skillName).join(', ');
      throw new Error(`Crew ${crew.name} is missing required skills: ${missingSkills}`);
    }
  }
  
  const { rows: existing } = await db.query(
    `SELECT * FROM crew_assignments WHERE job_id = $1 AND crew_id = $2`,
    [jobId, crewId]
  );
  
  if (existing.length > 0) {
    await db.query(
      `UPDATE crew_assignments SET assigned_date = $1, updated_at = NOW() WHERE job_id = $2 AND crew_id = $3`,
      [date, jobId, crewId]
    );
    console.log(`[CrewAssignment] Updated existing assignment for job ${jobId}`);
  } else {
    await db.query(
      `INSERT INTO crew_assignments (job_id, crew_id, assigned_date) VALUES ($1, $2, $3)`,
      [jobId, crewId, date]
    );
    console.log(`[CrewAssignment] Created new assignment for job ${jobId}`);
  }
  
  if (job.scheduled_date !== date) {
    await db.query(
      `UPDATE jobs SET scheduled_date = $1, updated_at = NOW() WHERE id = $2`,
      [date, jobId]
    );
  }
  
  const updatedCapacity = await checkCapacity(crewId, date);
  
  return {
    success: true,
    jobId,
    crewId,
    crewName: crew.name,
    date,
    jobDuration: toNumber(job.estimated_hours, 2.5),
    remainingCapacity: updatedCapacity.remainingHours,
    message: `Successfully assigned ${crew.name} to job on ${date}`
  };
};

const unassignCrewFromJob = async (jobId, crewId) => {
  console.log(`[CrewAssignment] Unassigning crew ${crewId} from job ${jobId}`);
  
  const { rowCount } = await db.query(
    `DELETE FROM crew_assignments WHERE job_id = $1 AND crew_id = $2`,
    [jobId, crewId]
  );
  
  if (rowCount === 0) {
    return { success: false, message: 'Assignment not found' };
  }
  
  return { success: true, jobId, crewId, message: 'Crew unassigned from job' };
};

const getAvailableCrewsForDate = async (date, options = {}) => {
  console.log(`[CrewAssignment] Getting available crews for ${date}`);
  
  const { rows: allCrews } = await db.query('SELECT * FROM crews WHERE active = true');
  const results = [];
  
  for (const crew of allCrews) {
    const capacity = await checkCapacity(crew.id, date);
    
    if (!capacity.isAvailable) continue;
    if (capacity.remainingHours <= 0) continue;
    
    let skills = [];
    if (options.includeSkills) {
      skills = await getCrewSkills(crew.id);
    }
    
    if (options.requiredSkillIds && options.requiredSkillIds.length > 0) {
      const crewSkillIds = skills.map(s => s.skillId);
      const hasAllSkills = options.requiredSkillIds.every(id => crewSkillIds.includes(id));
      if (!hasAllSkills) continue;
    }
    
    results.push({
      crewId: crew.id,
      crewName: crew.name,
      capacity,
      skills: options.includeSkills ? skills : undefined
    });
  }
  
  results.sort((a, b) => b.capacity.remainingHours - a.capacity.remainingHours);
  
  return {
    date,
    availableCrews: results,
    totalAvailable: results.length
  };
};

module.exports = {
  getCrewSkills,
  getJobSkillRequirements,
  checkSkillMatch,
  checkCapacity,
  findMatchingCrews,
  assignCrewToJob,
  unassignCrewFromJob,
  getAvailableCrewsForDate
};
