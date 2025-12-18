const db = require('../../db');

const DEFAULT_DURATION_HOURS = 2.5;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getTreeSizeCategory = (treeHeight) => {
  const height = toNumber(treeHeight, 0);
  if (height <= 20) return 'small';
  if (height <= 40) return 'medium';
  if (height <= 60) return 'large';
  return 'xlarge';
};

const recordDuration = async (jobId, actualHours, metadata = {}) => {
  console.log(`[JobDuration] Recording duration for job ${jobId}: ${actualHours} hours`);
  
  const { rows: jobs } = await db.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
  if (!jobs.length) {
    throw new Error(`Job ${jobId} not found`);
  }
  const job = jobs[0];
  
  const estimatedHours = toNumber(job.estimated_hours, DEFAULT_DURATION_HOURS);
  const variancePercentage = estimatedHours > 0 
    ? ((actualHours - estimatedHours) / estimatedHours) * 100 
    : 0;
  
  let jobType = metadata.jobType || job.job_type || null;
  let serviceType = metadata.serviceType || null;
  let treeSizeCategory = metadata.treeSizeCategory || null;
  
  try {
    const { rows: quoteData } = await db.query(
      `SELECT q.line_items, q.tree_height, q.tree_count
       FROM quotes q
       WHERE q.id = $1`,
      [job.quote_id]
    );
    
    if (quoteData.length > 0) {
      const quote = quoteData[0];
      
      if (!treeSizeCategory && quote.tree_height) {
        treeSizeCategory = getTreeSizeCategory(quote.tree_height);
      }
      
      if (quote.line_items) {
        try {
          const lineItems = typeof quote.line_items === 'string' 
            ? JSON.parse(quote.line_items) 
            : quote.line_items;
          
          if (Array.isArray(lineItems) && lineItems.length > 0) {
            if (!serviceType) {
              serviceType = lineItems[0].service || lineItems[0].description || null;
            }
            if (!jobType && lineItems[0].category) {
              jobType = lineItems[0].category;
            }
          }
        } catch (e) {
        }
      }
    }
  } catch (e) {
    console.warn('[JobDuration] Could not fetch quote data:', e.message);
  }
  
  const { rows: crewAssignments } = await db.query(
    `SELECT COUNT(DISTINCT crew_id) as crew_count 
     FROM crew_assignments WHERE job_id = $1`,
    [jobId]
  );
  const crewSize = crewAssignments.length > 0 ? toNumber(crewAssignments[0].crew_count, 1) : 1;
  
  await db.query(
    `INSERT INTO job_duration_history (
      job_id, estimated_hours, actual_hours, variance_percentage,
      job_type, tree_sizes, services_performed, weather_conditions,
      crew_size, difficulty_rating, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      jobId,
      estimatedHours,
      actualHours,
      variancePercentage,
      jobType,
      treeSizeCategory ? JSON.stringify([treeSizeCategory]) : null,
      serviceType ? JSON.stringify([serviceType]) : null,
      metadata.weatherConditions ? JSON.stringify(metadata.weatherConditions) : null,
      crewSize,
      metadata.difficultyRating || null,
      metadata.notes || null
    ]
  );
  
  console.log(`[JobDuration] Duration recorded: estimated=${estimatedHours}h, actual=${actualHours}h, variance=${variancePercentage.toFixed(1)}%`);
  
  await updateDurationStats(jobType, serviceType, treeSizeCategory);
  
  return {
    jobId,
    estimatedHours,
    actualHours,
    variancePercentage: Math.round(variancePercentage * 10) / 10,
    jobType,
    serviceType,
    treeSizeCategory,
    crewSize
  };
};

const updateDurationStats = async (jobType, serviceType, treeSizeCategory) => {
  const lookupKeys = [];
  
  if (jobType) lookupKeys.push({ jobType, serviceType: null, treeSizeCategory: null });
  if (serviceType) lookupKeys.push({ jobType: null, serviceType, treeSizeCategory: null });
  if (treeSizeCategory) lookupKeys.push({ jobType: null, serviceType: null, treeSizeCategory });
  if (jobType && serviceType) lookupKeys.push({ jobType, serviceType, treeSizeCategory: null });
  if (jobType && treeSizeCategory) lookupKeys.push({ jobType, serviceType: null, treeSizeCategory });
  if (serviceType && treeSizeCategory) lookupKeys.push({ jobType: null, serviceType, treeSizeCategory });
  if (jobType && serviceType && treeSizeCategory) lookupKeys.push({ jobType, serviceType, treeSizeCategory });
  
  for (const key of lookupKeys) {
    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;
    
    if (key.jobType) {
      whereClause += ` AND job_type = $${paramIndex}`;
      params.push(key.jobType);
      paramIndex++;
    }
    if (key.serviceType) {
      whereClause += ` AND services_performed @> $${paramIndex}::jsonb`;
      params.push(JSON.stringify([key.serviceType]));
      paramIndex++;
    }
    if (key.treeSizeCategory) {
      whereClause += ` AND tree_sizes @> $${paramIndex}::jsonb`;
      params.push(JSON.stringify([key.treeSizeCategory]));
      paramIndex++;
    }
    
    const { rows: stats } = await db.query(
      `SELECT 
        COUNT(*) as sample_count,
        AVG(actual_hours) as avg_duration,
        MIN(actual_hours) as min_duration,
        MAX(actual_hours) as max_duration,
        STDDEV(actual_hours) as std_dev,
        AVG(variance_percentage) as avg_variance
       FROM job_duration_history
       WHERE ${whereClause}`,
      params
    );
    
    if (stats.length > 0 && stats[0].sample_count > 0) {
      const s = stats[0];
      
      await db.query(
        `INSERT INTO job_duration_stats (
          job_type, service_type, tree_size_category,
          sample_count, avg_duration_hours, min_duration_hours,
          max_duration_hours, std_dev_hours, avg_variance_percentage, last_updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (job_type, service_type, tree_size_category)
        DO UPDATE SET
          sample_count = $4,
          avg_duration_hours = $5,
          min_duration_hours = $6,
          max_duration_hours = $7,
          std_dev_hours = $8,
          avg_variance_percentage = $9,
          last_updated = NOW()`,
        [
          key.jobType,
          key.serviceType,
          key.treeSizeCategory,
          toNumber(s.sample_count, 0),
          toNumber(s.avg_duration, DEFAULT_DURATION_HOURS),
          toNumber(s.min_duration, DEFAULT_DURATION_HOURS),
          toNumber(s.max_duration, DEFAULT_DURATION_HOURS),
          toNumber(s.std_dev, 0),
          toNumber(s.avg_variance, 0)
        ]
      );
    }
  }
};

const predictDuration = async (jobCharacteristics) => {
  console.log('[JobDuration] Predicting duration for job characteristics:', jobCharacteristics);
  
  const { jobType, serviceType, treeSizeCategory, treeCount, complexity } = jobCharacteristics;
  
  let query = `
    SELECT * FROM job_duration_stats
    WHERE (job_type = $1 OR job_type IS NULL)
      AND (service_type = $2 OR service_type IS NULL)
      AND (tree_size_category = $3 OR tree_size_category IS NULL)
    ORDER BY 
      CASE WHEN job_type IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN service_type IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN tree_size_category IS NOT NULL THEN 1 ELSE 0 END DESC,
      sample_count DESC
    LIMIT 5
  `;
  
  const { rows: stats } = await db.query(query, [
    jobType || null,
    serviceType || null,
    treeSizeCategory || null
  ]);
  
  if (stats.length === 0) {
    let baseDuration = DEFAULT_DURATION_HOURS;
    
    if (treeSizeCategory === 'xlarge') baseDuration = 4;
    else if (treeSizeCategory === 'large') baseDuration = 3;
    else if (treeSizeCategory === 'medium') baseDuration = 2.5;
    else if (treeSizeCategory === 'small') baseDuration = 1.5;
    
    const trees = toNumber(treeCount, 1);
    if (trees > 1) {
      baseDuration += (trees - 1) * (baseDuration * 0.6);
    }
    
    return {
      predictedHours: Math.round(baseDuration * 10) / 10,
      confidence: 'low',
      confidenceScore: 30,
      source: 'default_estimate',
      sampleCount: 0,
      note: 'No historical data available - using default estimates'
    };
  }
  
  let totalWeight = 0;
  let weightedSum = 0;
  let totalSamples = 0;
  
  for (const stat of stats) {
    let matchScore = 0;
    if (stat.job_type === jobType) matchScore += 3;
    if (stat.service_type === serviceType) matchScore += 2;
    if (stat.tree_size_category === treeSizeCategory) matchScore += 2;
    
    const sampleWeight = Math.min(stat.sample_count / 10, 2);
    const weight = (matchScore + 1) * sampleWeight;
    
    weightedSum += toNumber(stat.avg_duration_hours, DEFAULT_DURATION_HOURS) * weight;
    totalWeight += weight;
    totalSamples += toNumber(stat.sample_count, 0);
  }
  
  let predictedHours = totalWeight > 0 
    ? weightedSum / totalWeight 
    : DEFAULT_DURATION_HOURS;
  
  const trees = toNumber(treeCount, 1);
  if (trees > 1) {
    const perTreeTime = predictedHours;
    predictedHours = perTreeTime + (trees - 1) * (perTreeTime * 0.5);
  }
  
  const complexityFactor = toNumber(complexity, 3);
  if (complexityFactor > 3) {
    predictedHours *= 1 + (complexityFactor - 3) * 0.1;
  } else if (complexityFactor < 3) {
    predictedHours *= 1 - (3 - complexityFactor) * 0.08;
  }
  
  let confidence = 'medium';
  let confidenceScore = 60;
  
  if (totalSamples >= 20) {
    confidence = 'high';
    confidenceScore = 85;
  } else if (totalSamples >= 10) {
    confidence = 'medium-high';
    confidenceScore = 75;
  } else if (totalSamples >= 5) {
    confidence = 'medium';
    confidenceScore = 60;
  } else {
    confidence = 'low';
    confidenceScore = 40;
  }
  
  const bestMatch = stats[0];
  
  return {
    predictedHours: Math.round(predictedHours * 10) / 10,
    confidence,
    confidenceScore,
    source: 'historical_data',
    sampleCount: totalSamples,
    rangeMin: Math.round(toNumber(bestMatch.min_duration_hours, predictedHours * 0.7) * 10) / 10,
    rangeMax: Math.round(toNumber(bestMatch.max_duration_hours, predictedHours * 1.5) * 10) / 10,
    avgVariance: Math.round(toNumber(bestMatch.avg_variance_percentage, 0) * 10) / 10,
    matchDetails: stats.map(s => ({
      jobType: s.job_type,
      serviceType: s.service_type,
      treeSizeCategory: s.tree_size_category,
      sampleCount: s.sample_count,
      avgDuration: toNumber(s.avg_duration_hours, 0)
    }))
  };
};

const getAveragesByType = async (jobType) => {
  console.log(`[JobDuration] Getting averages for job type: ${jobType}`);
  
  const { rows: typeStats } = await db.query(
    `SELECT * FROM job_duration_stats WHERE job_type = $1`,
    [jobType]
  );
  
  const { rows: historyStats } = await db.query(
    `SELECT 
      COUNT(*) as total_jobs,
      AVG(actual_hours) as avg_duration,
      MIN(actual_hours) as min_duration,
      MAX(actual_hours) as max_duration,
      AVG(variance_percentage) as avg_variance,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY actual_hours) as median_duration
     FROM job_duration_history
     WHERE job_type = $1`,
    [jobType]
  );
  
  const { rows: recentTrend } = await db.query(
    `SELECT 
      AVG(actual_hours) as recent_avg,
      COUNT(*) as recent_count
     FROM job_duration_history
     WHERE job_type = $1 
       AND recorded_at >= NOW() - INTERVAL '30 days'`,
    [jobType]
  );
  
  const history = historyStats[0] || {};
  const recent = recentTrend[0] || {};
  
  return {
    jobType,
    overall: {
      totalJobs: toNumber(history.total_jobs, 0),
      avgDuration: Math.round(toNumber(history.avg_duration, DEFAULT_DURATION_HOURS) * 10) / 10,
      medianDuration: Math.round(toNumber(history.median_duration, DEFAULT_DURATION_HOURS) * 10) / 10,
      minDuration: Math.round(toNumber(history.min_duration, 0) * 10) / 10,
      maxDuration: Math.round(toNumber(history.max_duration, 0) * 10) / 10,
      avgVariancePercent: Math.round(toNumber(history.avg_variance, 0) * 10) / 10
    },
    recent30Days: {
      jobCount: toNumber(recent.recent_count, 0),
      avgDuration: Math.round(toNumber(recent.recent_avg, DEFAULT_DURATION_HOURS) * 10) / 10
    },
    breakdown: typeStats.map(s => ({
      serviceType: s.service_type,
      treeSizeCategory: s.tree_size_category,
      sampleCount: s.sample_count,
      avgDuration: toNumber(s.avg_duration_hours, 0),
      stdDev: toNumber(s.std_dev_hours, 0)
    }))
  };
};

const getDurationHistory = async (jobId) => {
  const { rows } = await db.query(
    `SELECT * FROM job_duration_history WHERE job_id = $1 ORDER BY recorded_at DESC`,
    [jobId]
  );
  
  return rows.map(r => ({
    id: r.id,
    estimatedHours: toNumber(r.estimated_hours, 0),
    actualHours: toNumber(r.actual_hours, 0),
    variancePercentage: toNumber(r.variance_percentage, 0),
    jobType: r.job_type,
    treeSizes: r.tree_sizes,
    servicesPerformed: r.services_performed,
    crewSize: r.crew_size,
    difficultyRating: r.difficulty_rating,
    recordedAt: r.recorded_at
  }));
};

module.exports = {
  recordDuration,
  predictDuration,
  getAveragesByType,
  getDurationHistory,
  getTreeSizeCategory
};
