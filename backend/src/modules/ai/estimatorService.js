const { GoogleGenAI } = require('@google/genai');
const db = require('../../modules/core/db');

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
let ai = null;

if (GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

const aiTreeEstimateSchema = {
  type: 'object',
  properties: {
    tree_identification: { type: 'string', description: 'The species of the tree(s) identified in the media.' },
    health_assessment: { type: 'string', description: 'A detailed assessment of the tree\'s health, noting any diseases, pests, or decay.' },
    measurements: {
      type: 'object',
      properties: {
        height_feet: { type: 'number', description: 'Estimated height of the tree in feet.' },
        canopy_width_feet: { type: 'number', description: 'Estimated width of the tree\'s canopy in feet.' },
        trunk_diameter_inches: { type: 'number', description: 'Estimated diameter of the trunk at breast height in inches.' }
      },
      required: ['height_feet', 'canopy_width_feet', 'trunk_diameter_inches']
    },
    hazards_obstacles: {
      type: 'array',
      items: { type: 'string' },
      description: 'A list of potential hazards (e.g., power lines, proximity to structures, dead branches) or obstacles.'
    },
    detailed_assessment: { type: 'string', description: 'A comprehensive summary explaining how the job would be performed.' },
    suggested_services: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          service_name: { type: 'string', description: 'A clear name for the suggested service.' },
          description: { type: 'string', description: 'A brief explanation of what the service entails.' },
          price_range: {
            type: 'object',
            properties: {
              min: { type: 'number', description: 'The low end of the estimated price.' },
              max: { type: 'number', description: 'The high end of the estimated price.' }
            },
            required: ['min', 'max']
          }
        },
        required: ['service_name', 'description', 'price_range']
      }
    },
    required_equipment: { type: 'array', items: { type: 'string' }, description: 'A list of major equipment needed.' },
    required_manpower: { type: 'number', description: 'Estimated number of crew members needed.' },
    estimated_duration_hours: { type: 'number', description: 'Estimated time to complete the job in hours.' }
  },
  required: ['tree_identification', 'health_assessment', 'measurements', 'hazards_obstacles', 'detailed_assessment', 'suggested_services', 'required_equipment', 'required_manpower', 'estimated_duration_hours']
};

async function getRecentFeedback(limit = 5) {
  try {
    const result = await db.query(`
      SELECT tree_species, trunk_diameter_inches, tree_height_feet, hazards,
             ai_suggested_price_min, ai_suggested_price_max, final_approved_price,
             feedback_rating, feedback_notes
      FROM ai_estimate_logs
      WHERE feedback_rating IS NOT NULL AND feedback_rating != 'accurate'
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  } catch (error) {
    console.warn('Unable to load estimate feedback:', error.message);
    return [];
  }
}

function formatFeedbackContext(feedback) {
  if (!feedback || feedback.length === 0) return '';
  
  const entries = feedback.map((item, index) => {
    const species = item.tree_species || 'Unknown species';
    const diameter = item.trunk_diameter_inches ? `${item.trunk_diameter_inches}" diameter` : 'Unknown diameter';
    const height = item.tree_height_feet ? `${item.tree_height_feet}ft tall` : 'Height unknown';
    const hazards = item.hazards && item.hazards.length > 0 ? `Hazards: ${item.hazards.join(', ')}.` : '';
    const actual = item.final_approved_price ? `$${item.final_approved_price}` : 'Actual price not provided';
    const aiRange = `$${item.ai_suggested_price_min} - $${item.ai_suggested_price_max}`;
    const rating = item.feedback_rating === 'too_high' ? 'AI was too high' : 'AI was too low';
    const notes = item.feedback_notes ? `Note: "${item.feedback_notes}"` : '';
    
    return `${index + 1}. ${species} (${diameter}, ${height}). AI suggested ${aiRange}; ${rating}. Actual: ${actual}. ${hazards} ${notes}`.trim();
  });
  
  return entries.join('\n');
}

async function generateEstimate(imageData) {
  if (!ai) {
    throw new Error('Gemini API key not configured');
  }

  const feedbackContext = formatFeedbackContext(await getRecentFeedback());
  
  const promptSections = [];
  
  if (feedbackContext) {
    promptSections.push(`REFERENCE CUSTOMER FEEDBACK\nThe following are recent customer corrections to past AI estimates. Learn from these outcomes:\n${feedbackContext}`);
  }

  promptSections.push(`You are an expert ISA Certified Arborist providing a detailed assessment and quote estimate for a potential tree service job.

Analyze the media and provide the following information in a structured JSON format:
1. **tree_identification**: Identify the tree's species.
2. **health_assessment**: Assess the tree's overall health.
3. **measurements**: Estimate height (ft), canopy width (ft), and trunk diameter (in).
4. **hazards_obstacles**: List any hazards like power lines, structures, fences, etc.
5. **detailed_assessment**: Describe the scope of work and how the job would be executed.
6. **suggested_services**: Include "Tree Removal (Including Debris Removal & Haul-Away)" as the first service. The removal price MUST include ALL costs. Then propose additional services if applicable.
7. **required_equipment**: List the necessary equipment.
8. **required_manpower**: Estimate the number of crew needed.
9. **estimated_duration_hours**: Estimate the job duration in hours.

CRITICAL PRICING GUIDELINES:

**Base Removal Prices (INCLUDING debris removal & haul-away):**
- Small tree (under 30ft, 6-12" trunk): $500-$2,000
- Medium tree (30-60ft, 12-24" trunk): $1,500-$4,000
- Large tree (60-80ft, 24-36" trunk): $3,000-$7,000
- Extra-large tree (80ft+, 36"+ trunk): $5,000-$15,000+

**Trunk Diameter is CRITICAL - use it as primary pricing factor:**
- 40"+ trunk diameter = add $2,000-$5,000 to base price
- 50"+ trunk diameter = add $4,000-$8,000 to base price

**Hazard Multipliers:**
- Near structures/houses: +30-60%
- Power lines overhead: +40-80%
- Limited access (no bucket truck): +50-100%
- Multiple hazards combined: quote at or ABOVE maximum range

Return ONLY the JSON object.`);

  const prompt = promptSections.join('\n\n');

  const imageParts = imageData.map(file => ({
    inlineData: {
      mimeType: file.mimeType,
      data: file.data,
    },
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: { parts: [{ text: prompt }, ...imageParts] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: aiTreeEstimateSchema
      }
    });

    const cleanedJsonText = response.text.trim().replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJsonText);
  } catch (error) {
    console.error('Error generating tree estimate:', error);
    throw new Error(`Failed to generate AI tree estimate: ${error.message}`);
  }
}

async function logEstimate(estimateData) {
  const {
    imageCount,
    treeSpecies,
    treeHeightFeet,
    trunkDiameterInches,
    canopyWidthFeet,
    hazards,
    locationDescription,
    aiSuggestedPriceMin,
    aiSuggestedPriceMax,
    suggestedServices,
    healthAssessment,
    detailedAssessment,
    requiredEquipment,
    requiredManpower,
    estimatedDurationHours,
    quoteId,
    jobId,
    clientId,
    propertyId,
    createdBy
  } = estimateData;

  const result = await db.query(`
    INSERT INTO ai_estimate_logs (
      image_count, tree_species, tree_height_feet, trunk_diameter_inches,
      canopy_width_feet, hazards, location_description,
      ai_suggested_price_min, ai_suggested_price_max, suggested_services,
      health_assessment, detailed_assessment, required_equipment,
      required_manpower, estimated_duration_hours,
      quote_id, job_id, client_id, property_id, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    RETURNING *
  `, [
    imageCount || 1,
    treeSpecies,
    treeHeightFeet,
    trunkDiameterInches,
    canopyWidthFeet,
    hazards || [],
    locationDescription,
    aiSuggestedPriceMin,
    aiSuggestedPriceMax,
    JSON.stringify(suggestedServices || []),
    healthAssessment,
    detailedAssessment,
    requiredEquipment || [],
    requiredManpower,
    estimatedDurationHours,
    quoteId,
    jobId,
    clientId,
    propertyId,
    createdBy
  ]);

  return result.rows[0];
}

async function updateEstimateFeedback(estimateId, feedback) {
  const { finalApprovedPrice, feedbackRating, feedbackNotes, quoteId, jobId } = feedback;

  const result = await db.query(`
    UPDATE ai_estimate_logs
    SET final_approved_price = COALESCE($1, final_approved_price),
        feedback_rating = COALESCE($2, feedback_rating),
        feedback_notes = COALESCE($3, feedback_notes),
        quote_id = COALESCE($4, quote_id),
        job_id = COALESCE($5, job_id),
        updated_at = NOW()
    WHERE id = $6
    RETURNING *
  `, [finalApprovedPrice, feedbackRating, feedbackNotes, quoteId, jobId, estimateId]);

  return result.rows[0];
}

async function exportTrainingData(options = {}) {
  const { startDate, endDate, onlyWithFeedback = false, format = 'json' } = options;

  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (startDate) {
    whereClause += ` AND created_at >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    whereClause += ` AND created_at <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  if (onlyWithFeedback) {
    whereClause += ' AND feedback_rating IS NOT NULL';
  }

  const result = await db.query(`
    SELECT 
      id, image_count, tree_species, tree_height_feet, trunk_diameter_inches,
      canopy_width_feet, hazards, location_description,
      ai_suggested_price_min, ai_suggested_price_max, suggested_services,
      health_assessment, detailed_assessment, required_equipment,
      required_manpower, estimated_duration_hours,
      final_approved_price, feedback_rating, feedback_notes,
      quote_id, job_id, client_id, property_id,
      created_at, updated_at
    FROM ai_estimate_logs
    ${whereClause}
    ORDER BY created_at DESC
  `, params);

  if (format === 'csv') {
    return convertToCSV(result.rows);
  }

  return result.rows;
}

function convertToCSV(data) {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

async function getEstimateStats() {
  const result = await db.query(`
    SELECT 
      COUNT(*) as total_estimates,
      COUNT(feedback_rating) as estimates_with_feedback,
      COUNT(*) FILTER (WHERE feedback_rating = 'accurate') as accurate_count,
      COUNT(*) FILTER (WHERE feedback_rating = 'too_high') as too_high_count,
      COUNT(*) FILTER (WHERE feedback_rating = 'too_low') as too_low_count,
      AVG(CASE WHEN feedback_rating = 'accurate' THEN 1 ELSE 0 END) * 100 as accuracy_rate,
      AVG(ai_suggested_price_max - ai_suggested_price_min) as avg_price_range,
      AVG(CASE WHEN final_approved_price IS NOT NULL 
          THEN ABS((ai_suggested_price_min + ai_suggested_price_max) / 2 - final_approved_price) 
          ELSE NULL END) as avg_price_deviation
    FROM ai_estimate_logs
  `);

  return result.rows[0];
}

module.exports = {
  generateEstimate,
  logEstimate,
  updateEstimateFeedback,
  exportTrainingData,
  getEstimateStats,
  getRecentFeedback
};
