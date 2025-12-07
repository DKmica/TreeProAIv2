const db = require('../../modules/core/db');

async function getHistoricalDurationData() {
  const result = await db.query(`
    SELECT 
      job_type,
      tree_sizes,
      difficulty_rating,
      crew_size,
      AVG(actual_hours) as avg_duration,
      STDDEV(actual_hours) as duration_stddev,
      COUNT(*) as sample_count
    FROM job_duration_history
    WHERE actual_hours IS NOT NULL
    GROUP BY job_type, tree_sizes, difficulty_rating, crew_size
    HAVING COUNT(*) >= 3
    ORDER BY job_type, crew_size
  `);
  return result.rows;
}

async function predictJobDuration(jobDetails) {
  const {
    serviceType,
    treeHeightFeet,
    trunkDiameterInches,
    hazardLevel = 'Medium',
    crewSize = 3
  } = jobDetails;

  const heightRange = getHeightRange(treeHeightFeet);
  const diameterRange = getDiameterRange(trunkDiameterInches);

  const historical = await db.query(`
    SELECT 
      AVG(actual_hours) as avg_duration,
      STDDEV(actual_hours) as duration_stddev,
      COUNT(*) as sample_count
    FROM job_duration_history
    WHERE job_type = $1
      AND crew_size = $2
  `, [serviceType, crewSize]);

  if (historical.rows[0]?.sample_count >= 3) {
    const avgDuration = parseFloat(historical.rows[0].avg_duration);
    const stdDev = parseFloat(historical.rows[0].duration_stddev) || avgDuration * 0.2;
    
    return {
      estimatedHours: Math.round(avgDuration * 10) / 10,
      confidenceRange: {
        min: Math.round((avgDuration - stdDev) * 10) / 10,
        max: Math.round((avgDuration + stdDev) * 10) / 10
      },
      confidence: 'high',
      basedOnSamples: parseInt(historical.rows[0].sample_count),
      methodology: 'historical_data'
    };
  }

  const baseDuration = estimateBaseDuration(serviceType, treeHeightFeet, trunkDiameterInches);
  const hazardMultiplier = getHazardMultiplier(hazardLevel);
  const crewMultiplier = getCrewMultiplier(crewSize);
  
  const estimatedHours = Math.round(baseDuration * hazardMultiplier * crewMultiplier * 10) / 10;

  return {
    estimatedHours,
    confidenceRange: {
      min: Math.round(estimatedHours * 0.7 * 10) / 10,
      max: Math.round(estimatedHours * 1.5 * 10) / 10
    },
    confidence: 'low',
    basedOnSamples: parseInt(historical.rows[0]?.sample_count || 0),
    methodology: 'rule_based_estimate'
  };
}

function getHeightRange(heightFeet) {
  if (!heightFeet) return 'medium';
  if (heightFeet < 30) return 'small';
  if (heightFeet < 60) return 'medium';
  if (heightFeet < 80) return 'large';
  return 'extra_large';
}

function getDiameterRange(diameterInches) {
  if (!diameterInches) return 'medium';
  if (diameterInches < 12) return 'small';
  if (diameterInches < 24) return 'medium';
  if (diameterInches < 36) return 'large';
  return 'extra_large';
}

function estimateBaseDuration(serviceType, heightFeet, diameterInches) {
  const baseHours = {
    'tree_removal': 4,
    'tree_trimming': 2,
    'pruning': 1.5,
    'stump_grinding': 1,
    'lot_clearing': 6,
    'emergency': 3,
    'consultation': 1
  };

  let duration = baseHours[serviceType?.toLowerCase()] || 3;

  if (heightFeet) {
    if (heightFeet > 60) duration *= 1.5;
    else if (heightFeet > 80) duration *= 2;
  }

  if (diameterInches) {
    if (diameterInches > 24) duration *= 1.3;
    else if (diameterInches > 36) duration *= 1.6;
    else if (diameterInches > 48) duration *= 2;
  }

  return duration;
}

function getHazardMultiplier(hazardLevel) {
  const multipliers = {
    'Low': 0.9,
    'Medium': 1.0,
    'High': 1.4,
    'Critical': 1.8
  };
  return multipliers[hazardLevel] || 1.0;
}

function getCrewMultiplier(crewSize) {
  if (crewSize <= 2) return 1.3;
  if (crewSize === 3) return 1.0;
  if (crewSize === 4) return 0.85;
  return 0.75;
}

async function detectSchedulingConflicts(proposedJob) {
  const { scheduledDate, startTime, endTime, crewMembers = [], equipmentIds = [] } = proposedJob;

  const conflicts = [];

  if (crewMembers.length > 0) {
    const crewConflicts = await db.query(`
      SELECT j.id, j.special_instructions as description, j.scheduled_date, 
             TO_CHAR(j.work_start_time, 'HH24:MI') as start_time, 
             TO_CHAR(j.work_end_time, 'HH24:MI') as end_time,
             j.assigned_crew,
             COALESCE(j.customer_name, c.first_name || ' ' || c.last_name) as customer_name
      FROM jobs j
      LEFT JOIN clients c ON j.client_id = c.id
      WHERE j.scheduled_date = $1
        AND j.status NOT IN ('Cancelled', 'Completed')
        AND j.assigned_crew ?| $2::text[]
    `, [scheduledDate, crewMembers]);

    for (const job of crewConflicts.rows) {
      if (hasTimeOverlap(startTime, endTime, job.start_time, job.end_time)) {
        const overlappingCrew = (job.assigned_crew || []).filter((m) => 
          crewMembers.some(cm => cm.toLowerCase() === m.toLowerCase())
        );
        conflicts.push({
          type: 'crew_overlap',
          severity: 'high',
          jobId: job.id,
          jobDescription: job.description,
          customer: job.customer_name,
          overlappingMembers: overlappingCrew,
          existingTime: { start: job.start_time, end: job.end_time }
        });
      }
    }
  }

  if (equipmentIds.length > 0) {
    const equipmentConflicts = await db.query(`
      SELECT eu.equipment_id, eu.job_id, eu.start_time, eu.end_time,
             e.name as equipment_name,
             j.special_instructions as job_description
      FROM equipment_usage eu
      JOIN equipment e ON eu.equipment_id = e.id
      JOIN jobs j ON eu.job_id = j.id
      WHERE eu.usage_date = $1
        AND eu.equipment_id = ANY($2::uuid[])
        AND j.status NOT IN ('Cancelled', 'Completed')
    `, [scheduledDate, equipmentIds]);

    for (const usage of equipmentConflicts.rows) {
      if (hasTimeOverlap(startTime, endTime, usage.start_time, usage.end_time)) {
        conflicts.push({
          type: 'equipment_overlap',
          severity: 'medium',
          equipmentId: usage.equipment_id,
          equipmentName: usage.equipment_name,
          existingJobId: usage.job_id,
          jobDescription: usage.job_description,
          existingTime: { start: usage.start_time, end: usage.end_time }
        });
      }
    }
  }

  const jobCountResult = await db.query(`
    SELECT COUNT(*) as job_count
    FROM jobs
    WHERE scheduled_date = $1
      AND status NOT IN ('Cancelled', 'Completed')
  `, [scheduledDate]);

  const jobCount = parseInt(jobCountResult.rows[0].job_count);
  if (jobCount >= 5) {
    conflicts.push({
      type: 'capacity_warning',
      severity: 'low',
      message: `Already ${jobCount} jobs scheduled for this date`,
      currentLoad: jobCount
    });
  }

  return conflicts;
}

function hasTimeOverlap(start1, end1, start2, end2) {
  if (!start1 && !start2) return true;
  if (!start1 || !start2) return true;
  
  const s1 = timeToMinutes(start1);
  const e1 = end1 ? timeToMinutes(end1) : s1 + 240;
  const s2 = timeToMinutes(start2);
  const e2 = end2 ? timeToMinutes(end2) : s2 + 240;
  
  if (isNaN(s1) || isNaN(e1) || isNaN(s2) || isNaN(e2)) {
    return true;
  }
  
  return s1 < e2 && s2 < e1;
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  
  if (typeof timeStr === 'string' && timeStr.includes('T')) {
    const date = new Date(timeStr);
    if (!isNaN(date.getTime())) {
      return date.getHours() * 60 + date.getMinutes();
    }
  }
  
  if (typeof timeStr === 'string' && /^\d{1,2}:\d{2}/.test(timeStr)) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }
  
  return NaN;
}

async function suggestOptimalCrew(jobDetails) {
  const { 
    scheduledDate,
    startTime,
    endTime,
    serviceType,
    hazardLevel = 'Medium',
    requiredSkills = [],
    preferredCrewSize = 3
  } = jobDetails;

  const allEmployees = await db.query(`
    SELECT e.id, e.name, e.job_title, e.certifications, e.pay_rate, e.performance_metrics
    FROM employees e
    ORDER BY e.pay_rate ASC
  `);

  const scheduledJobs = await db.query(`
    SELECT jsonb_array_elements_text(j.assigned_crew) as crew_name,
           TO_CHAR(j.work_start_time, 'HH24:MI') as job_start,
           TO_CHAR(j.work_end_time, 'HH24:MI') as job_end
    FROM jobs j
    WHERE j.scheduled_date = $1
      AND j.status NOT IN ('Cancelled', 'Completed')
      AND j.assigned_crew IS NOT NULL
      AND jsonb_typeof(j.assigned_crew) = 'array'
  `, [scheduledDate]);

  const busyEmployees = new Map();
  for (const row of scheduledJobs.rows) {
    const name = row.crew_name?.toLowerCase();
    if (name) {
      if (!busyEmployees.has(name)) {
        busyEmployees.set(name, []);
      }
      busyEmployees.get(name).push({ start: row.job_start, end: row.job_end });
    }
  }

  const employees = allEmployees.rows.filter(emp => {
    const empName = emp.name?.toLowerCase();
    if (!busyEmployees.has(empName)) {
      return true;
    }
    const schedules = busyEmployees.get(empName);
    for (const schedule of schedules) {
      if (!schedule.start && !schedule.end) {
        return false;
      }
      if (hasTimeOverlap(startTime, endTime, schedule.start, schedule.end)) {
        return false;
      }
    }
    return true;
  });

  const scored = employees.map(emp => {
    let score = 50;

    const perfMetrics = emp.performance_metrics || {};
    if (perfMetrics.rating) {
      score += perfMetrics.rating * 10;
    }

    const jobTitleLower = (emp.job_title || '').toLowerCase();
    if (hazardLevel === 'Critical' && (jobTitleLower.includes('certified') || jobTitleLower.includes('lead'))) {
      score += 20;
    }
    if (serviceType === 'tree_removal' && jobTitleLower.includes('climber')) {
      score += 15;
    }

    const certifications = emp.certifications || [];
    for (const skill of requiredSkills) {
      if (certifications.some(c => (c.name || c || '').toLowerCase().includes(skill.toLowerCase()))) {
        score += 10;
      }
    }

    return { ...emp, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const recommended = scored.slice(0, preferredCrewSize);
  const alternates = scored.slice(preferredCrewSize, preferredCrewSize + 2);

  let needsCertifiedArborist = hazardLevel === 'High' || hazardLevel === 'Critical';
  const hasCertified = recommended.some(e => {
    const certs = e.certifications || [];
    return certs.some(c => (c.name || c || '').toLowerCase().includes('arborist'));
  });

  const warnings = [];
  if (needsCertifiedArborist && !hasCertified) {
    warnings.push('High/Critical hazard job may require ISA Certified Arborist');
  }
  if (recommended.length < preferredCrewSize) {
    warnings.push(`Only ${recommended.length} employees available, requested ${preferredCrewSize}`);
  }

  return {
    recommended,
    alternates,
    warnings,
    totalAvailable: employees.length,
    optimalCrewSize: preferredCrewSize
  };
}

async function logJobDuration(jobId, durationData) {
  const {
    treeCount,
    serviceType,
    treeSizes,
    difficultyRating,
    crewSize,
    estimatedHours,
    actualHours,
    weatherConditions,
    notes
  } = durationData;

  const variancePercentage = estimatedHours && actualHours 
    ? Math.round(((actualHours - estimatedHours) / estimatedHours) * 100)
    : null;

  const result = await db.query(`
    INSERT INTO job_duration_history (
      job_id, tree_count, job_type, tree_sizes,
      difficulty_rating, crew_size, estimated_hours, actual_hours,
      variance_percentage, weather_conditions, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `, [
    jobId, treeCount, serviceType, treeSizes,
    difficultyRating, crewSize, estimatedHours, actualHours,
    variancePercentage, weatherConditions, notes
  ]);

  return result.rows[0];
}

async function getSchedulingSuggestions(dateStr) {
  const jobs = await db.query(`
    SELECT j.*, 
           COALESCE(j.customer_name, c.first_name || ' ' || c.last_name) as customer_name,
           p.address_line1, p.city, p.state, p.zip_code,
           p.lat, p.lon
    FROM jobs j
    LEFT JOIN clients c ON j.client_id = c.id
    LEFT JOIN properties p ON j.property_id = p.id
    WHERE j.scheduled_date = $1
      AND j.status NOT IN ('Cancelled', 'Completed')
    ORDER BY j.work_start_time NULLS LAST
  `, [dateStr]);

  const suggestions = [];

  for (const job of jobs.rows) {
    if (!job.assigned_crew || job.assigned_crew.length === 0) {
      const crewSuggestion = await suggestOptimalCrew({
        scheduledDate: dateStr,
        startTime: job.work_start_time,
        endTime: job.work_end_time,
        serviceType: 'tree_removal',
        hazardLevel: job.risk_level || 'Medium'
      });
      
      if (crewSuggestion.recommended.length > 0) {
        suggestions.push({
          type: 'crew_assignment',
          jobId: job.id,
          jobDescription: job.special_instructions,
          customer: job.customer_name,
          suggestedCrew: crewSuggestion.recommended.map(e => e.name)
        });
      }
    }

    const durationPrediction = await predictJobDuration({
      serviceType: 'tree_removal',
      treeHeightFeet: null,
      trunkDiameterInches: null,
      crewSize: (job.assigned_crew || []).length || 3
    });

    if (durationPrediction.confidence === 'high') {
      suggestions.push({
        type: 'duration_estimate',
        jobId: job.id,
        jobDescription: job.special_instructions,
        estimatedHours: durationPrediction.estimatedHours,
        confidence: durationPrediction.confidence,
        range: durationPrediction.confidenceRange
      });
    }
  }

  return {
    date: dateStr,
    jobCount: jobs.rows.length,
    suggestions
  };
}

module.exports = {
  predictJobDuration,
  detectSchedulingConflicts,
  suggestOptimalCrew,
  logJobDuration,
  getSchedulingSuggestions,
  getHistoricalDurationData
};
