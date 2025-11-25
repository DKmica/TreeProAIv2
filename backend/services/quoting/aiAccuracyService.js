const db = require('../../db');
const { v4: uuidv4 } = require('uuid');
const { notFoundError, badRequestError } = require('../../utils/errors');

const ACCURACY_THRESHOLDS = {
  ACCURATE: 10,
  SLIGHTLY_OFF: 20,
  SIGNIFICANTLY_OFF: 30
};

const calculateAccuracyScore = (estimatedPrice, actualPrice) => {
  if (!estimatedPrice || !actualPrice || estimatedPrice === 0) {
    return null;
  }

  const variancePercentage = Math.abs((actualPrice - estimatedPrice) / estimatedPrice) * 100;
  
  if (variancePercentage <= ACCURACY_THRESHOLDS.ACCURATE) {
    return 100 - variancePercentage;
  } else if (variancePercentage <= ACCURACY_THRESHOLDS.SLIGHTLY_OFF) {
    return 80 - (variancePercentage - ACCURACY_THRESHOLDS.ACCURATE);
  } else if (variancePercentage <= ACCURACY_THRESHOLDS.SIGNIFICANTLY_OFF) {
    return 60 - (variancePercentage - ACCURACY_THRESHOLDS.SLIGHTLY_OFF);
  } else {
    return Math.max(0, 50 - (variancePercentage - ACCURACY_THRESHOLDS.SIGNIFICANTLY_OFF));
  }
};

const recordAccuracy = async (quoteId, actualPrice, feedback = {}) => {
  const { rows: quoteRows } = await db.query(`
    SELECT q.id, q.total_price, q.line_items,
           ef.id as existing_feedback_id
    FROM quotes q
    LEFT JOIN estimate_feedback ef ON ef.quote_id = q.id
    WHERE q.id = $1
  `, [quoteId]);

  if (quoteRows.length === 0) {
    throw notFoundError('Quote');
  }

  const quote = quoteRows[0];
  const estimatedPrice = parseFloat(quote.total_price) || 0;
  const actualPriceNum = parseFloat(actualPrice) || 0;

  if (actualPriceNum <= 0) {
    throw badRequestError('Actual price must be greater than 0');
  }

  const varianceAmount = actualPriceNum - estimatedPrice;
  const variancePercentage = estimatedPrice > 0 ? (varianceAmount / estimatedPrice) * 100 : 0;
  const accuracyScore = calculateAccuracyScore(estimatedPrice, actualPriceNum);

  let accuracyCategory;
  if (variancePercentage >= -ACCURACY_THRESHOLDS.ACCURATE && variancePercentage <= ACCURACY_THRESHOLDS.ACCURATE) {
    accuracyCategory = 'accurate';
  } else if (variancePercentage < -ACCURACY_THRESHOLDS.ACCURATE) {
    accuracyCategory = 'overestimate';
  } else {
    accuracyCategory = 'underestimate';
  }

  const varianceAnalysis = {
    estimated_price: estimatedPrice,
    actual_price: actualPriceNum,
    variance_amount: varianceAmount,
    variance_percentage: parseFloat(variancePercentage.toFixed(2)),
    accuracy_score: accuracyScore,
    accuracy_category: accuracyCategory,
    line_items_count: (quote.line_items || []).length,
    feedback_notes: feedback.notes,
    corrections_made: feedback.corrections || [],
    ai_suggestions_followed: feedback.ai_suggestions_followed
  };

  let result;

  if (quote.existing_feedback_id) {
    const { rows } = await db.query(`
      UPDATE estimate_feedback SET
        actual_price = $2,
        variance_analysis = $3,
        ai_suggestions_followed = $4,
        final_price_used = $5,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [
      quote.existing_feedback_id,
      actualPriceNum,
      JSON.stringify(varianceAnalysis),
      feedback.ai_suggestions_followed,
      actualPriceNum
    ]);
    result = rows[0];
  } else {
    const id = uuidv4();
    const { rows } = await db.query(`
      INSERT INTO estimate_feedback (
        id, quote_id, actual_price, variance_analysis,
        ai_suggestions_followed, final_price_used
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      id, quoteId, actualPriceNum, JSON.stringify(varianceAnalysis),
      feedback.ai_suggestions_followed, actualPriceNum
    ]);
    result = rows[0];
  }

  return {
    ...result,
    accuracy_analysis: varianceAnalysis
  };
};

const getAccuracyStats = async (period = 'month') => {
  let periodStart;
  const now = new Date();

  switch (period) {
    case 'week':
      periodStart = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'quarter':
      periodStart = new Date(now.setMonth(now.getMonth() - 3));
      break;
    case 'year':
      periodStart = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    case 'month':
    default:
      periodStart = new Date(now.setMonth(now.getMonth() - 1));
      break;
  }

  const { rows: statsRows } = await db.query(`
    SELECT 
      COUNT(*) as total_estimates,
      COUNT(CASE WHEN ef.actual_price IS NOT NULL THEN 1 END) as with_feedback,
      COALESCE(AVG((ef.variance_analysis->>'accuracy_score')::numeric), 0) as avg_accuracy_score,
      COALESCE(AVG((ef.variance_analysis->>'variance_percentage')::numeric), 0) as avg_variance_percentage,
      COUNT(CASE WHEN (ef.variance_analysis->>'accuracy_category') = 'accurate' THEN 1 END) as accurate_count,
      COUNT(CASE WHEN (ef.variance_analysis->>'accuracy_category') = 'underestimate' THEN 1 END) as underestimate_count,
      COUNT(CASE WHEN (ef.variance_analysis->>'accuracy_category') = 'overestimate' THEN 1 END) as overestimate_count
    FROM quotes q
    LEFT JOIN estimate_feedback ef ON ef.quote_id = q.id
    WHERE q.created_at >= $1
  `, [periodStart.toISOString()]);

  const stats = statsRows[0];
  const totalWithFeedback = parseInt(stats.with_feedback) || 0;

  const { rows: trendRows } = await db.query(`
    SELECT 
      DATE_TRUNC('week', q.created_at) as week,
      COUNT(*) as estimates,
      COALESCE(AVG((ef.variance_analysis->>'accuracy_score')::numeric), 0) as avg_score
    FROM quotes q
    LEFT JOIN estimate_feedback ef ON ef.quote_id = q.id
    WHERE q.created_at >= $1 AND ef.actual_price IS NOT NULL
    GROUP BY DATE_TRUNC('week', q.created_at)
    ORDER BY week DESC
    LIMIT 12
  `, [periodStart.toISOString()]);

  return {
    period,
    period_start: periodStart.toISOString(),
    period_end: new Date().toISOString(),
    summary: {
      total_estimates: parseInt(stats.total_estimates) || 0,
      estimates_with_feedback: totalWithFeedback,
      feedback_rate: totalWithFeedback > 0 
        ? parseFloat(((totalWithFeedback / parseInt(stats.total_estimates)) * 100).toFixed(2)) 
        : 0,
      avg_accuracy_score: parseFloat(parseFloat(stats.avg_accuracy_score).toFixed(2)) || 0,
      avg_variance_percentage: parseFloat(parseFloat(stats.avg_variance_percentage).toFixed(2)) || 0,
      breakdown: {
        accurate: parseInt(stats.accurate_count) || 0,
        underestimate: parseInt(stats.underestimate_count) || 0,
        overestimate: parseInt(stats.overestimate_count) || 0
      }
    },
    trend: trendRows.map(row => ({
      week: row.week,
      estimates: parseInt(row.estimates),
      avg_score: parseFloat(parseFloat(row.avg_score).toFixed(2))
    }))
  };
};

const getImprovementSuggestions = async () => {
  const { rows: underestimatePatterns } = await db.query(`
    SELECT 
      COALESCE(
        jsonb_array_elements(q.line_items)->>'description',
        jsonb_array_elements(q.line_items)->>'tree'
      ) as item_type,
      COUNT(*) as occurrences,
      COALESCE(AVG((ef.variance_analysis->>'variance_percentage')::numeric), 0) as avg_variance
    FROM quotes q
    JOIN estimate_feedback ef ON ef.quote_id = q.id
    WHERE (ef.variance_analysis->>'accuracy_category') = 'underestimate'
      AND q.line_items IS NOT NULL
      AND jsonb_array_length(q.line_items) > 0
    GROUP BY item_type
    HAVING COUNT(*) >= 2
    ORDER BY avg_variance DESC
    LIMIT 5
  `);

  const { rows: overestimatePatterns } = await db.query(`
    SELECT 
      COALESCE(
        jsonb_array_elements(q.line_items)->>'description',
        jsonb_array_elements(q.line_items)->>'tree'
      ) as item_type,
      COUNT(*) as occurrences,
      COALESCE(AVG((ef.variance_analysis->>'variance_percentage')::numeric), 0) as avg_variance
    FROM quotes q
    JOIN estimate_feedback ef ON ef.quote_id = q.id
    WHERE (ef.variance_analysis->>'accuracy_category') = 'overestimate'
      AND q.line_items IS NOT NULL
      AND jsonb_array_length(q.line_items) > 0
    GROUP BY item_type
    HAVING COUNT(*) >= 2
    ORDER BY avg_variance ASC
    LIMIT 5
  `);

  const suggestions = [];

  for (const pattern of underestimatePatterns) {
    if (Math.abs(parseFloat(pattern.avg_variance)) > 15) {
      suggestions.push({
        type: 'price_adjustment',
        severity: 'high',
        item_type: pattern.item_type,
        current_issue: 'Consistently underestimating',
        avg_variance: parseFloat(parseFloat(pattern.avg_variance).toFixed(2)),
        occurrences: parseInt(pattern.occurrences),
        recommendation: `Consider increasing base price for "${pattern.item_type}" by approximately ${Math.abs(parseFloat(pattern.avg_variance)).toFixed(0)}%`
      });
    }
  }

  for (const pattern of overestimatePatterns) {
    if (Math.abs(parseFloat(pattern.avg_variance)) > 15) {
      suggestions.push({
        type: 'price_adjustment',
        severity: 'medium',
        item_type: pattern.item_type,
        current_issue: 'Consistently overestimating',
        avg_variance: parseFloat(parseFloat(pattern.avg_variance).toFixed(2)),
        occurrences: parseInt(pattern.occurrences),
        recommendation: `Consider decreasing base price for "${pattern.item_type}" by approximately ${Math.abs(parseFloat(pattern.avg_variance)).toFixed(0)}%`
      });
    }
  }

  const { rows: lowFeedbackItems } = await db.query(`
    SELECT 
      COUNT(*) as total_quotes,
      COUNT(CASE WHEN ef.id IS NOT NULL THEN 1 END) as with_feedback
    FROM quotes q
    LEFT JOIN estimate_feedback ef ON ef.quote_id = q.id
    WHERE q.created_at >= NOW() - INTERVAL '30 days'
  `);

  const feedbackRate = lowFeedbackItems[0]?.total_quotes > 0
    ? (lowFeedbackItems[0].with_feedback / lowFeedbackItems[0].total_quotes) * 100
    : 0;

  if (feedbackRate < 30) {
    suggestions.push({
      type: 'process_improvement',
      severity: 'medium',
      current_issue: `Low feedback rate (${feedbackRate.toFixed(0)}%)`,
      recommendation: 'Implement a post-job feedback collection process to improve AI accuracy tracking'
    });
  }

  return {
    generated_at: new Date().toISOString(),
    suggestions_count: suggestions.length,
    suggestions: suggestions.sort((a, b) => 
      a.severity === 'high' ? -1 : b.severity === 'high' ? 1 : 0
    )
  };
};

const updateAggregates = async () => {
  const periods = [
    { name: 'weekly', interval: '7 days' },
    { name: 'monthly', interval: '30 days' },
    { name: 'quarterly', interval: '90 days' }
  ];

  const results = [];

  for (const period of periods) {
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - (period.name === 'weekly' ? 7 : period.name === 'monthly' ? 30 : 90) * 24 * 60 * 60 * 1000);

    const { rows: statsRows } = await db.query(`
      SELECT 
        COUNT(*) as total_estimates,
        COUNT(CASE WHEN ef.actual_price IS NOT NULL THEN 1 END) as with_feedback,
        COALESCE(AVG((ef.variance_analysis->>'accuracy_score')::numeric), 0) as avg_accuracy,
        COALESCE(AVG((ef.variance_analysis->>'variance_percentage')::numeric), 0) as avg_variance,
        COUNT(CASE WHEN (ef.variance_analysis->>'accuracy_category') = 'accurate' THEN 1 END) as accurate_count,
        COUNT(CASE WHEN (ef.variance_analysis->>'accuracy_category') = 'underestimate' THEN 1 END) as underestimate_count,
        COUNT(CASE WHEN (ef.variance_analysis->>'accuracy_category') = 'overestimate' THEN 1 END) as overestimate_count
      FROM quotes q
      LEFT JOIN estimate_feedback ef ON ef.quote_id = q.id
      WHERE q.created_at BETWEEN $1 AND $2
    `, [periodStart.toISOString(), periodEnd.toISOString()]);

    const stats = statsRows[0];

    const { rows: existing } = await db.query(`
      SELECT id FROM ai_estimate_accuracy 
      WHERE time_period = $1 AND period_start = $2
    `, [period.name, periodStart.toISOString().split('T')[0]]);

    if (existing.length > 0) {
      await db.query(`
        UPDATE ai_estimate_accuracy SET
          total_estimates = $3,
          estimates_with_feedback = $4,
          avg_accuracy_score = $5,
          avg_price_variance_percentage = $6,
          accurate_count = $7,
          underestimate_count = $8,
          overestimate_count = $9,
          created_at = NOW()
        WHERE id = $1
      `, [
        existing[0].id,
        periodStart.toISOString().split('T')[0],
        parseInt(stats.total_estimates) || 0,
        parseInt(stats.with_feedback) || 0,
        parseFloat(stats.avg_accuracy) || 0,
        parseFloat(stats.avg_variance) || 0,
        parseInt(stats.accurate_count) || 0,
        parseInt(stats.underestimate_count) || 0,
        parseInt(stats.overestimate_count) || 0
      ]);
    } else {
      const id = uuidv4();
      await db.query(`
        INSERT INTO ai_estimate_accuracy (
          id, time_period, period_start, period_end,
          total_estimates, estimates_with_feedback,
          avg_accuracy_score, avg_price_variance_percentage,
          accurate_count, underestimate_count, overestimate_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        id, period.name, 
        periodStart.toISOString().split('T')[0],
        periodEnd.toISOString().split('T')[0],
        parseInt(stats.total_estimates) || 0,
        parseInt(stats.with_feedback) || 0,
        parseFloat(stats.avg_accuracy) || 0,
        parseFloat(stats.avg_variance) || 0,
        parseInt(stats.accurate_count) || 0,
        parseInt(stats.underestimate_count) || 0,
        parseInt(stats.overestimate_count) || 0
      ]);
    }

    results.push({
      period: period.name,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      total_estimates: parseInt(stats.total_estimates) || 0,
      avg_accuracy: parseFloat(parseFloat(stats.avg_accuracy).toFixed(2)) || 0
    });
  }

  return {
    updated_at: new Date().toISOString(),
    aggregates: results
  };
};

module.exports = {
  recordAccuracy,
  getAccuracyStats,
  getImprovementSuggestions,
  updateAggregates,
  calculateAccuracyScore,
  ACCURACY_THRESHOLDS
};
