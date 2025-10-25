import { GoogleGenAI, Type } from "@google/genai";
import { AITreeEstimate, JobHazardAnalysis } from "../../types";

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

export const generateTreeEstimate = async (files: { mimeType: string, data: string }[]): Promise<AITreeEstimate> => {
    const prompt = `You are an expert ISA Certified Arborist providing a detailed assessment and quote estimate for a potential tree service job based on the provided images and/or videos.

    Analyze the media and provide the following information in a structured JSON format:
    1.  **tree_identification**: Identify the tree's species.
    2.  **health_assessment**: Assess the tree's overall health.
    3.  **measurements**: Estimate height (ft), canopy width (ft), and trunk diameter (in).
    4.  **hazards_obstacles**: List any hazards like power lines, structures, fences, etc.
    5.  **detailed_assessment**: Describe the scope of work and how the job would be executed.
    6.  **suggested_services**: Propose specific services (e.g., removal, pruning, cabling). For each service, provide a name, a brief description, and a tight, realistic price range with a 30-50% difference between min and max.
    7.  **required_equipment**: List the necessary equipment.
    8.  **required_manpower**: Estimate the number of crew needed.
    9.  **estimated_duration_hours**: Estimate the job duration in hours.

    Return ONLY the JSON object.`;

    const imageParts = files.map(file => ({
        inlineData: {
            mimeType: file.mimeType,
            data: file.data,
        },
    }));

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [{ text: prompt }, ...imageParts] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: aiTreeEstimateSchema
            }
        });
        const cleanedJsonText = response.text.trim().replace(/^```json\s*|```$/g, '');
        return JSON.parse(cleanedJsonText) as AITreeEstimate;
    } catch (error) {
        console.error("Error generating tree estimate:", error);
        throw new Error("Failed to generate AI tree estimate.");
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
            model: 'gemini-2.5-pro',
            contents: { parts: [{ text: prompt }, ...imageParts] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: jhaSchema
            }
        });
        const cleanedJsonText = response.text.trim().replace(/^```json\s*|```$/g, '');
        return JSON.parse(cleanedJsonText) as JobHazardAnalysis;
    } catch (error) {
        console.error("Error generating JHA:", error);
        throw new Error("Failed to generate AI Job Hazard Analysis.");
    }
};