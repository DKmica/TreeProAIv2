const db = require('../../db');
const { v4: uuidv4 } = require('uuid');
const { notFoundError, badRequestError } = require('../../utils/errors');

const trackConversion = async (quoteId, jobId, data = {}) => {
  const { rows: quoteRows } = await db.query(`
    SELECT id, total_price, selected_option_id, created_at
    FROM quotes WHERE id = $1
  `, [quoteId]);

  if (quoteRows.length === 0) {
    throw notFoundError('Quote');
  }

  const quote = quoteRows[0];

  let jobAmount = null;
  if (jobId) {
    const { rows: jobRows } = await db.query(
      `SELECT id, total_price FROM jobs WHERE id = $1`,
      [jobId]
    );
    if (jobRows.length > 0) {
      jobAmount = jobRows[0].total_price;
    }
  }

  const { rows: followUpRows } = await db.query(
    `SELECT COUNT(*) as count FROM quote_follow_ups WHERE quote_id = $1`,
    [quoteId]
  );

  const quoteAmount = parseFloat(quote.total_price) || 0;
  const jobAmountNum = parseFloat(jobAmount) || quoteAmount;
  const varianceAmount = jobAmountNum - quoteAmount;
  const variancePercentage = quoteAmount > 0 ? (varianceAmount / quoteAmount) * 100 : 0;
  const daysToConversion = Math.floor((new Date() - new Date(quote.created_at)) / (1000 * 60 * 60 * 24));

  const id = uuidv4();
  const { rows } = await db.query(`
    INSERT INTO quote_conversions (
      id, quote_id, job_id, selected_option_id,
      conversion_status, quote_amount, job_amount,
      variance_amount, variance_percentage, days_to_conversion,
      follow_ups_count, conversion_source, notes, converted_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *
  `, [
    id, quoteId, jobId, quote.selected_option_id,
    jobId ? 'converted' : 'pending', quoteAmount, jobAmountNum,
    varianceAmount, variancePercentage, daysToConversion,
    parseInt(followUpRows[0].count), data.conversion_source || 'direct',
    data.notes, jobId ? new Date() : null
  ]);

  return rows[0];
};

const getConversionMetrics = async (startDate, endDate) => {
  const start = startDate || new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString();
  const end = endDate || new Date().toISOString();

  const { rows: summaryRows } = await db.query(`
    SELECT 
      COUNT(*) as total_quotes,
      COUNT(CASE WHEN conversion_status = 'converted' THEN 1 END) as converted_quotes,
      COUNT(CASE WHEN conversion_status = 'lost' THEN 1 END) as lost_quotes,
      COUNT(CASE WHEN conversion_status = 'pending' THEN 1 END) as pending_quotes,
      COALESCE(SUM(quote_amount), 0) as total_quoted_value,
      COALESCE(SUM(CASE WHEN conversion_status = 'converted' THEN job_amount END), 0) as converted_value,
      COALESCE(AVG(days_to_conversion) FILTER (WHERE conversion_status = 'converted'), 0) as avg_days_to_conversion,
      COALESCE(AVG(follow_ups_count) FILTER (WHERE conversion_status = 'converted'), 0) as avg_follow_ups_to_convert,
      COALESCE(AVG(variance_percentage) FILTER (WHERE conversion_status = 'converted'), 0) as avg_variance_percentage
    FROM quote_conversions
    WHERE created_at BETWEEN $1 AND $2
  `, [start, end]);

  const summary = summaryRows[0];
  const totalQuotes = parseInt(summary.total_quotes) || 0;
  const convertedQuotes = parseInt(summary.converted_quotes) || 0;
  const conversionRate = totalQuotes > 0 ? (convertedQuotes / totalQuotes) * 100 : 0;

  const { rows: monthlyRows } = await db.query(`
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      COUNT(*) as total_quotes,
      COUNT(CASE WHEN conversion_status = 'converted' THEN 1 END) as converted,
      COALESCE(SUM(quote_amount), 0) as quoted_value,
      COALESCE(SUM(CASE WHEN conversion_status = 'converted' THEN job_amount END), 0) as converted_value
    FROM quote_conversions
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month DESC
  `, [start, end]);

  const { rows: sourceRows } = await db.query(`
    SELECT 
      conversion_source,
      COUNT(*) as total,
      COUNT(CASE WHEN conversion_status = 'converted' THEN 1 END) as converted,
      ROUND(
        COUNT(CASE WHEN conversion_status = 'converted' THEN 1 END)::numeric / 
        NULLIF(COUNT(*), 0) * 100, 2
      ) as conversion_rate
    FROM quote_conversions
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY conversion_source
    ORDER BY total DESC
  `, [start, end]);

  return {
    period: { start, end },
    summary: {
      total_quotes: totalQuotes,
      converted_quotes: convertedQuotes,
      lost_quotes: parseInt(summary.lost_quotes) || 0,
      pending_quotes: parseInt(summary.pending_quotes) || 0,
      conversion_rate: parseFloat(conversionRate.toFixed(2)),
      total_quoted_value: parseFloat(summary.total_quoted_value) || 0,
      converted_value: parseFloat(summary.converted_value) || 0,
      avg_days_to_conversion: parseFloat(parseFloat(summary.avg_days_to_conversion).toFixed(1)) || 0,
      avg_follow_ups_to_convert: parseFloat(parseFloat(summary.avg_follow_ups_to_convert).toFixed(1)) || 0,
      avg_variance_percentage: parseFloat(parseFloat(summary.avg_variance_percentage).toFixed(2)) || 0
    },
    monthly_breakdown: monthlyRows,
    by_source: sourceRows
  };
};

const getLostQuoteAnalysis = async () => {
  const { rows: lostReasons } = await db.query(`
    SELECT 
      lost_reason,
      COUNT(*) as count,
      COALESCE(SUM(quote_amount), 0) as total_value
    FROM quote_conversions
    WHERE conversion_status = 'lost' AND lost_reason IS NOT NULL
    GROUP BY lost_reason
    ORDER BY count DESC
    LIMIT 10
  `);

  const { rows: competitorData } = await db.query(`
    SELECT 
      competitor_name,
      COUNT(*) as times_lost,
      COALESCE(AVG(competitor_price - quote_amount), 0) as avg_price_diff
    FROM quote_conversions
    WHERE conversion_status = 'lost' AND competitor_name IS NOT NULL
    GROUP BY competitor_name
    ORDER BY times_lost DESC
    LIMIT 10
  `);

  const { rows: lostStats } = await db.query(`
    SELECT 
      COUNT(*) as total_lost,
      COALESCE(SUM(quote_amount), 0) as total_lost_value,
      COALESCE(AVG(days_to_conversion), 0) as avg_days_before_lost
    FROM quote_conversions
    WHERE conversion_status = 'lost'
  `);

  return {
    total_lost: parseInt(lostStats[0]?.total_lost) || 0,
    total_lost_value: parseFloat(lostStats[0]?.total_lost_value) || 0,
    avg_days_before_lost: parseFloat(parseFloat(lostStats[0]?.avg_days_before_lost).toFixed(1)) || 0,
    top_reasons: lostReasons,
    competitor_analysis: competitorData.map(row => ({
      ...row,
      avg_price_diff: parseFloat(parseFloat(row.avg_price_diff).toFixed(2))
    }))
  };
};

const getFollowUpEffectiveness = async () => {
  const { rows } = await db.query(`
    SELECT 
      follow_ups_count,
      COUNT(*) as total_quotes,
      COUNT(CASE WHEN conversion_status = 'converted' THEN 1 END) as converted,
      ROUND(
        COUNT(CASE WHEN conversion_status = 'converted' THEN 1 END)::numeric / 
        NULLIF(COUNT(*), 0) * 100, 2
      ) as conversion_rate
    FROM quote_conversions
    GROUP BY follow_ups_count
    ORDER BY follow_ups_count ASC
  `);

  const { rows: channelRows } = await db.query(`
    SELECT 
      f.channel,
      COUNT(*) as total_follow_ups,
      COUNT(CASE WHEN f.response_received THEN 1 END) as responses,
      ROUND(
        COUNT(CASE WHEN f.response_received THEN 1 END)::numeric / 
        NULLIF(COUNT(*), 0) * 100, 2
      ) as response_rate
    FROM quote_follow_ups f
    GROUP BY f.channel
    ORDER BY total_follow_ups DESC
  `);

  const { rows: typeRows } = await db.query(`
    SELECT 
      f.follow_up_type,
      COUNT(*) as count,
      COUNT(CASE WHEN f.response_received THEN 1 END) as responses
    FROM quote_follow_ups f
    GROUP BY f.follow_up_type
    ORDER BY count DESC
  `);

  return {
    by_follow_up_count: rows.map(row => ({
      follow_ups: row.follow_ups_count,
      total: parseInt(row.total_quotes),
      converted: parseInt(row.converted),
      conversion_rate: parseFloat(row.conversion_rate) || 0
    })),
    by_channel: channelRows.map(row => ({
      channel: row.channel,
      total: parseInt(row.total_follow_ups),
      responses: parseInt(row.responses),
      response_rate: parseFloat(row.response_rate) || 0
    })),
    by_type: typeRows.map(row => ({
      type: row.follow_up_type,
      count: parseInt(row.count),
      responses: parseInt(row.responses)
    }))
  };
};

const recordFollowUp = async (quoteId, data) => {
  const { rows: quoteRows } = await db.query(
    `SELECT id FROM quotes WHERE id = $1`,
    [quoteId]
  );

  if (quoteRows.length === 0) {
    throw notFoundError('Quote');
  }

  const {
    follow_up_type,
    channel,
    notes,
    response_received = false,
    response_summary,
    scheduled_at,
    completed_at,
    created_by
  } = data;

  if (!follow_up_type) {
    throw badRequestError('Follow-up type is required');
  }

  const id = uuidv4();
  const { rows } = await db.query(`
    INSERT INTO quote_follow_ups (
      id, quote_id, follow_up_type, channel, notes,
      response_received, response_summary, scheduled_at,
      completed_at, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [
    id, quoteId, follow_up_type, channel, notes,
    response_received, response_summary, scheduled_at,
    completed_at || (response_received ? new Date() : null), created_by
  ]);

  await db.query(`
    UPDATE quote_conversions
    SET follow_ups_count = follow_ups_count + 1
    WHERE quote_id = $1
  `, [quoteId]);

  return rows[0];
};

const markQuoteLost = async (quoteId, lostData) => {
  const { rows: quoteRows } = await db.query(
    `SELECT id FROM quotes WHERE id = $1`,
    [quoteId]
  );

  if (quoteRows.length === 0) {
    throw notFoundError('Quote');
  }

  const {
    lost_reason,
    competitor_name,
    competitor_price,
    notes
  } = lostData;

  const { rows: existingRows } = await db.query(
    `SELECT id FROM quote_conversions WHERE quote_id = $1`,
    [quoteId]
  );

  if (existingRows.length > 0) {
    await db.query(`
      UPDATE quote_conversions SET
        conversion_status = 'lost',
        lost_reason = $2,
        competitor_name = $3,
        competitor_price = $4,
        notes = COALESCE(notes || E'\n' || $5, $5)
      WHERE quote_id = $1
    `, [quoteId, lost_reason, competitor_name, competitor_price, notes]);
  } else {
    await trackConversion(quoteId, null, { notes });
    await db.query(`
      UPDATE quote_conversions SET
        conversion_status = 'lost',
        lost_reason = $2,
        competitor_name = $3,
        competitor_price = $4
      WHERE quote_id = $1
    `, [quoteId, lost_reason, competitor_name, competitor_price]);
  }

  await db.query(`
    UPDATE quotes SET status = 'Declined', updated_at = NOW()
    WHERE id = $1
  `, [quoteId]);

  const { rows } = await db.query(
    `SELECT * FROM quote_conversions WHERE quote_id = $1`,
    [quoteId]
  );

  return rows[0];
};

module.exports = {
  trackConversion,
  getConversionMetrics,
  getLostQuoteAnalysis,
  getFollowUpEffectiveness,
  recordFollowUp,
  markQuoteLost
};
