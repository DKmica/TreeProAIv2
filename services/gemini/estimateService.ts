import { GoogleGenAI, Type } from "@google/genai";
import { AITreeEstimate, JobHazardAnalysis, EstimateFeedback, Quote, CustomerUpload } from "../../types";
import { estimateFeedbackService } from "../apiService";

// Use environment variable injected by Vite
const geminiApiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;

if (!geminiApiKey) {
    console.error("VITE_GEMINI_API_KEY is not set!");
}

const ai = new GoogleGenAI({ apiKey: geminiApiKey as string });

const aiTreeEstimateSchema = {
    type: Type.OBJECT,
    properties: {
        tree_identification: { type: Type.STRING, description: "The species of the tree(s) identified in the media." },
        health_assessment: { type: Type.STRING, description: "A detailed assessment of the tree's health, noting any diseases, pests, or decay." },
        measurements: {
            type: Type.OBJECT,
            properties: {
                height_feet: { type: Type.NUMBER, description: "Estimated height of the tree in feet." },
                canopy_width_feet: { type: Type.NUMBER, description: "Estimated width of the tree's canopy in feet." },
                trunk_diameter_inches: { type: Type.NUMBER, description: "Estimated diameter of the trunk at breast height in inches." }
            },
            required: ["height_feet", "canopy_width_feet", "trunk_diameter_inches"]
        },
        hazards_obstacles: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of potential hazards (e.g., power lines, proximity to structures, dead branches) or obstacles."
        },
        detailed_assessment: { type: Type.STRING, description: "A comprehensive summary explaining how the job would be performed, including access considerations and specific techniques." },
        suggested_services: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    service_name: { type: Type.STRING, description: "A clear name for the suggested service (e.g., 'Tree Removal', 'Crown Reduction')." },
                    description: { type: Type.STRING, description: "A brief explanation of what the service entails." },
                    price_range: {
                        type: Type.OBJECT,
                        properties: {
                            min: { type: Type.NUMBER, description: "The low end of the estimated price for this service." },
                            max: { type: Type.NUMBER, description: "The high end of the estimated price for this service." }
                        },
                        required: ["min", "max"]
                    }
                },
                required: ["service_name", "description", "price_range"]
            }
        },
        required_equipment: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of major equipment needed (e.g., 'Bucket Truck', 'Stump Grinder')." },
        required_manpower: { type: Type.NUMBER, description: "Estimated number of crew members needed." },
        estimated_duration_hours: { type: Type.NUMBER, description: "Estimated time to complete the job in hours." }
    },
    required: ["tree_identification", "health_assessment", "measurements", "hazards_obstacles", "detailed_assessment", "suggested_services", "required_equipment", "required_manpower", "estimated_duration_hours"]
};

const getFeedbackSummaries = (feedback: EstimateFeedback[]): string => {
    if (feedback.length === 0) {
        return '';
    }

    const entries = feedback.map((item, index) => {
        const species = item.treeSpecies || 'Unknown species';
        const diameter = item.trunkDiameter ? `${item.trunkDiameter}" diameter` : 'Unknown diameter';
        const height = item.treeHeight ? `${item.treeHeight}ft tall` : 'Height unknown';
        const hazards = item.hazards && item.hazards.length > 0 ? `Hazards: ${item.hazards.join(', ')}.` : '';
        const actual = item.actualPriceQuoted ? `$${item.actualPriceQuoted.toFixed(2)}` : 'Actual price not provided';
        const aiRange = `$${item.aiSuggestedPriceMin.toFixed(2)} - $${item.aiSuggestedPriceMax.toFixed(2)}`;
        const rating = item.feedbackRating === 'too_high' ? 'AI was too high' : item.feedbackRating === 'too_low' ? 'AI was too low' : 'AI was accurate';
        const notes = item.userNotes ? `Customer note: "${item.userNotes}"` : '';

        return `${index + 1}. ${species} (${diameter}, ${height}). AI suggested ${aiRange}; ${rating}. Actual: ${actual}. ${hazards} ${notes}`.trim();
    });

    return entries.join('\n');
};

const fetchRecentCorrections = async (): Promise<string> => {
    try {
        const feedback = await estimateFeedbackService.getEstimateFeedback();
        if (!feedback || feedback.length === 0) {
            return '';
        }

        const corrected = feedback
            .filter(entry => entry.feedbackRating !== 'accurate')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 3);

        if (corrected.length === 0) {
            return '';
        }

        return getFeedbackSummaries(corrected);
    } catch (error) {
        console.warn('Unable to load estimate feedback context:', error);
        return '';
    }
};

export const generateTreeEstimate = async (files: { mimeType: string, data: string }[]): Promise<AITreeEstimate> => {
    const correctionsContext = await fetchRecentCorrections();

    const promptSections: string[] = [];

    if (correctionsContext) {
        promptSections.push(`REFERENCE CUSTOMER FEEDBACK\nThe following are recent customer corrections to past AI estimates. Learn from these outcomes and adjust your new pricing accordingly:\n${correctionsContext}`);
    }

    promptSections.push(`You are an expert ISA Certified Arborist providing a detailed assessment and quote estimate for a potential tree service job based on the provided images and/or videos.

    Analyze the media and provide the following information in a structured JSON format:
    1.  **tree_identification**: Identify the tree's species.
    2.  **health_assessment**: Assess the tree's overall health.
    3.  **measurements**: Estimate height (ft), canopy width (ft), and trunk diameter (in).
    4.  **hazards_obstacles**: List any hazards like power lines, structures, fences, etc.
    5.  **detailed_assessment**: Describe the scope of work and how the job would be executed.
    6.  **suggested_services**: ALWAYS include "Tree Removal (Including Debris Removal & Haul-Away)" as the first service. The removal price MUST include ALL costs: cutting, rigging, chipping, hauling debris to disposal site, and cleanup. Then propose additional services if applicable (e.g., pruning, stump grinding, cabling, brush clearing). For each service, provide a name, a brief description, and a realistic price range with a 30-50% difference between min and max. The removal price should reflect the tree's size, trunk diameter, location, hazards, complexity, AND debris removal/haul-away costs.
    7.  **required_equipment**: List the necessary equipment.
    8.  **required_manpower**: Estimate the number of crew needed.
    9.  **estimated_duration_hours**: Estimate the job duration in hours.

    CRITICAL PRICING GUIDELINES (based on actual professional tree service pricing):
    
    **Base Removal Prices (INCLUDING debris removal & haul-away):**
    - Small tree (under 30ft, 6-12" trunk): $500-$2,000
    - Medium tree (30-60ft, 12-24" trunk): $1,500-$4,000
    - Large tree (60-80ft, 24-36" trunk): $3,000-$7,000
    - Extra-large tree (80ft+, 36"+ trunk): $5,000-$15,000+
    
    **Trunk Diameter is CRITICAL - use it as primary pricing factor:**
    - 40"+ trunk diameter = add $2,000-$5,000 to base price
    - 50"+ trunk diameter = add $4,000-$8,000 to base price
    
    **Hazard Multipliers (use HIGH end or above range):**
    - Near structures/houses: +30-60% (quote toward HIGH end of range)
    - Power lines overhead: +40-80%
    - Limited access (no bucket truck): +50-100%
    - Multiple hazards combined: quote at or ABOVE maximum range
    
    **REAL EXAMPLE for calibration:**
    85ft Pin Oak, 48" trunk diameter, between two houses = $7,000
    
    **Default to MIDDLE-TO-HIGH pricing:** When uncertain, quote the middle or high end of the range, NOT the low end. Professional tree services don't lowball estimates.

    Debris removal is NEVER a separate service - it's ALWAYS included in removal price.

    Before finalizing your new price ranges, compare them against the feedback data provided above. If past customers said AI was too high, lean lower. If they said too low, lean higher. Explicitly factor in similar species, trunk diameter, and hazards when adjusting ranges.

    Return ONLY the JSON object.`);

    const prompt = promptSections.join('\n\n');

    const imageParts = files.map(file => ({
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
        return JSON.parse(cleanedJsonText) as AITreeEstimate;
    } catch (error: any) {
        console.error("Error generating tree estimate:", error);
        const errorMessage = error?.message || error?.toString() || "Unknown error";
        throw new Error(`Failed to generate AI tree estimate: ${errorMessage}`);
    }
};

const jhaSchema = {
    type: Type.OBJECT,
    properties: {
        identified_hazards: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of potential hazards identified from the images and job description."
        },
        recommended_ppe: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of recommended Personal Protective Equipment (PPE)."
        },
        analysis_timestamp: {
            type: Type.STRING,
            description: "The ISO 8601 timestamp of when the analysis was generated."
        }
    },
    required: ["identified_hazards", "recommended_ppe", "analysis_timestamp"]
};

export const generateJobHazardAnalysis = async (files: { mimeType: string, data: string }[], services: string): Promise<JobHazardAnalysis> => {
    const prompt = `You are an OSHA-certified safety expert for the arboriculture industry. Your task is to perform a Job Hazard Analysis (JHA) based on the provided images and the list of services to be performed.

    **Services to be Performed:**
    ${services}

    **Analysis Instructions:**
    1.  **Examine the images for common job-site hazards**, including but not limited to:
        -   Overhead power lines or electrical conductors.
        -   Uneven, sloped, or unstable ground.
        -   Proximity to structures (houses, sheds, fences).
        -   Presence of bystanders, vehicles, or public access areas.
        -   Visible tree decay, dead branches (widow-makers), or structural weaknesses.
        -   Limited drop zones for debris.
    2.  **Consider the services to be performed** (e.g., tree removal requires evaluating the felling path, pruning involves aerial work).
    3.  **List all identified hazards** clearly and concisely. If no specific hazards are visible, state "No immediate hazards visible, but maintain standard safety protocols."
    4.  **Recommend necessary Personal Protective Equipment (PPE)** based on the job tasks and potential hazards. Standard PPE includes a hard hat, eye protection, and work boots. Add specific items like chainsaw-resistant chaps, hearing protection, or high-visibility vests as needed.
    5.  Include the current timestamp in ISO 8601 format.

    Return ONLY a valid JSON object adhering to the provided schema.`;

    const imageParts = files.map(file => ({
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
                responseSchema: jhaSchema
            }
        });
        const cleanedJsonText = response.text.trim().replace(/^```json\s*|```$/g, '');
        return JSON.parse(cleanedJsonText) as JobHazardAnalysis;
    } catch (error: any) {
        console.error("Error generating JHA:", error);
        const errorMessage = error?.message || error?.toString() || "Unknown error";
        throw new Error(`Failed to generate AI Job Hazard Analysis: ${errorMessage}`);
    }
};

interface AITreeRiskAssessment {
    risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
    jha_required: boolean;
    risk_factors: string[];
    reasoning: string;
}

const aiTreeRiskSchema = {
    type: Type.OBJECT,
    properties: {
        risk_level: { type: Type.STRING, enum: ['Low', 'Medium', 'High', 'Critical'] },
        jha_required: { type: Type.BOOLEAN },
        risk_factors: { type: Type.ARRAY, items: { type: Type.STRING } },
        reasoning: { type: Type.STRING, description: "A brief explanation for the risk assessment." }
    },
    required: ["risk_level", "jha_required", "risk_factors", "reasoning"]
};

export const generateJobRiskAssessment = async (quote: Quote, customerUploads: CustomerUpload[] = []): Promise<AITreeRiskAssessment> => {
    const services = quote.lineItems.filter(li => li.selected).map(li => li.description).join(', ');
    const hasPhotos = customerUploads.length > 0;

    const prompt = `You are an expert tree service safety manager (OSHA-certified). Analyze the following job details from an accepted quote and assess the risk level.

    **Job Details:**
    - Services: ${services}
    - Stump Grinding: ${quote.stumpGrindingPrice && quote.stumpGrindingPrice > 0 ? 'Yes' : 'No'}
    - Customer Notes: ${quote.specialInstructions || 'None'}
    - Job Location: ${quote.jobLocation || 'Unknown'}
    - Has Photos from Customer: ${hasPhotos}

    **Risk Assessment Rules:**
    - **Low:** Standard pruning, small trees, no obstacles, stump grinding only.
    - **Medium:** Medium tree removal (30-60ft), crown reduction.
    - **High:** Large tree removal (60ft+), work near structures, limited access.
    - **Critical:** Emergency work, storm damage, work near power lines, use of crane.

    **Your Task:**
    Return a JSON object assessing the risk.
    - Set 'jha_required' to 'true' if 'risk_level' is 'Medium', 'High', or 'Critical'.
    - List the specific 'risk_factors' (e.g., "Large tree removal", "Emergency work", "Proximity to structures").
    - Provide a brief 'reasoning'.

    Return ONLY the valid JSON object.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: aiTreeRiskSchema
            }
        });
        const cleanedJsonText = response.text.trim().replace(/^```json\s*|```$/g, '');
        return JSON.parse(cleanedJsonText) as AITreeRiskAssessment;
    } catch (error: any) {
        console.error("Error generating risk assessment:", error);
        throw new Error(`Failed to generate AI risk assessment: ${error.message}`);
    }
};
