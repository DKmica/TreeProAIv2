const db = require('../../modules/core/db');

async function getHistoricalDurationData() {
  const result = await db.query(`
    SELECT 
      service_type,
      tree_height_range,
      trunk_diameter_range,
      hazard_level,
      crew_size,
      AVG(actual_duration_hours) as avg_duration,
      STDDEV(actual_duration_hours) as duration_stddev,
      COUNT(*) as sample_count
    FROM job_duration_history
    WHERE actual_duration_hours IS NOT NULL
    GROUP BY service_type, tree_height_range, trunk_diameter_range, hazard_level, crew_size
    HAVING COUNT(*) >= 3
    ORDER BY service_type, crew_size
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
      AVG(actual_duration_hours) as avg_duration,
      STDDEV(actual_duration_hours) as duration_stddev,
      COUNT(*) as sample_count
    FROM job_duration_history
    WHERE service_type = $1
      AND (tree_height_range = $2 OR tree_height_range IS NULL)
      AND (trunk_diameter_range = $3 OR trunk_diameter_range IS NULL)
      AND (hazard_level = $4 OR hazard_level IS NULL)
  `, [serviceType, heightRange, diameterRange, hazardLevel]);

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
      SELECT j.id, j.description, j.scheduled_date, j.start_time, j.end_time,
             j.assigned_crew,
             c.first_name || ' ' || c.last_name as customer_name
      FROM jobs j
      LEFT JOIN clients c ON j.client_id = c.id
      WHERE j.scheduled_date = $1
        AND j.status NOT IN ('Cancelled', 'Completed')
        AND j.deleted_at IS NULL
        AND j.assigned_crew && $2::text[]
    `, [scheduledDate, crewMembers]);

    for (const job of crewConflicts.rows) {
      if (hasTimeOverlap(startTime, endTime, job.start_time, job.end_time)) {
        const overlappingCrew = job.assigned_crew.filter((m) => 
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
             j.description as job_description
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
      AND deleted_at IS NULL
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
  if (!start1 || !start2) return true;
  
  const s1 = timeToMinutes(start1);
  const e1 = end1 ? timeToMinutes(end1) : s1 + 240;
  const s2 = timeToMinutes(start2);
  const e2 = end2 ? timeToMinutes(end2) : s2 + 240;
  
  return s1 < e2 && s2 < e1;
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
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

  const availableEmployees = await db.query(`
    SELECT e.id, e.name, e.job_title, e.crew, e.skills, e.certifications,
           e.pay_rate, e.performance_rating
    FROM employees e
    WHERE e.status = 'Active'
      AND e.deleted_at IS NULL
      AND e.id NOT IN (
        SELECT unnest(j.assigned_crew_ids)
        FROM jobs j
        WHERE j.scheduled_date = $1
          AND j.status NOT IN ('Cancelled', 'Completed')
          AND j.deleted_at IS NULL
          AND (
            ($2::time IS NULL OR j.start_time IS NULL) OR
            (j.start_time < COALESCE($3::time, j.start_time + interval '4 hours') AND 
             COALESCE(j.end_time, j.start_time + interval '4 hours') > $2::time)
          )
      )
    ORDER BY e.performance_rating DESC NULLS LAST, e.pay_rate ASC
  `, [scheduledDate, startTime, endTime]);

  const employees = availableEmployees.rows;

  const scored = employees.map(emp => {
    let score = 50;

    if (emp.performance_rating) {
      score += emp.performance_rating * 10;
    }

    const jobTitleLower = (emp.job_title || '').toLowerCase();
    if (hazardLevel === 'Critical' && (jobTitleLower.includes('certified') || jobTitleLower.includes('lead'))) {
      score += 20;
    }
    if (serviceType === 'tree_removal' && jobTitleLower.includes('climber')) {
      score += 15;
    }

    const empSkills = emp.skills || [];
    for (const skill of requiredSkills) {
      if (empSkills.some(s => s.toLowerCase().includes(skill.toLowerCase()))) {
        score += 10;
      }
    }

    return { ...emp, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const recommended = scored.slice(0, preferredCrewSize);
  const alternates = scored.slice(preferredCrewSize, preferredCrewSize + 2);

  let needsCertifiedArborist = hazardLevel === 'High' || hazardLevel === 'Critical';
  const hasCertified = recommended.some(e => 
    (e.certifications || []).some(c => c.toLowerCase().includes('arborist'))
  );

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
    treeSpecies,
    treeCount,
    serviceType,
    treeHeightRange,
    trunkDiameterRange,
    hazardLevel,
    crewSize,
    estimatedDurationHours,
    actualDurationHours,
    weatherConditions,
    accessDifficulty,
    notes
  } = durationData;

  const result = await db.query(`
    INSERT INTO job_duration_history (
      job_id, tree_species, tree_count, service_type,
      tree_height_range, trunk_diameter_range, hazard_level, crew_size,
      estimated_duration_hours, actual_duration_hours,
      weather_conditions, access_difficulty, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `, [
    jobId, treeSpecies, treeCount, serviceType,
    treeHeightRange, trunkDiameterRange, hazardLevel, crewSize,
    estimatedDurationHours, actualDurationHours,
    weatherConditions, accessDifficulty, notes
  ]);

  return result.rows[0];
}

async function getSchedulingSuggestions(dateStr) {
  const jobs = await db.query(`
    SELECT j.*, 
           c.first_name || ' ' || c.last_name as customer_name,
           p.address_line1, p.city, p.state, p.zip_code,
           p.latitude, p.longitude
    FROM jobs j
    LEFT JOIN clients c ON j.client_id = c.id
    LEFT JOIN properties p ON j.property_id = p.id
    WHERE j.scheduled_date = $1
      AND j.status NOT IN ('Cancelled', 'Completed')
      AND j.deleted_at IS NULL
    ORDER BY j.start_time NULLS LAST
  `, [dateStr]);

  const suggestions = [];

  for (const job of jobs.rows) {
    if (!job.assigned_crew || job.assigned_crew.length === 0) {
      const crewSuggestion = await suggestOptimalCrew({
        scheduledDate: dateStr,
        startTime: job.start_time,
        endTime: job.end_time,
        serviceType: job.service_type || 'tree_removal',
        hazardLevel: 'Medium'
      });
      
      if (crewSuggestion.recommended.length > 0) {
        suggestions.push({
          type: 'crew_assignment',
          jobId: job.id,
          jobDescription: job.description,
          customer: job.customer_name,
          suggestedCrew: crewSuggestion.recommended.map(e => e.name)
        });
      }
    }

    const durationPrediction = await predictJobDuration({
      serviceType: job.service_type || 'tree_removal',
      treeHeightFeet: job.tree_height,
      trunkDiameterInches: job.trunk_diameter,
      crewSize: (job.assigned_crew || []).length || 3
    });

    if (durationPrediction.confidence === 'high') {
      suggestions.push({
        type: 'duration_estimate',
        jobId: job.id,
        jobDescription: job.description,
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
