import { GoogleGenAI, Type } from "@google/genai";
import { AICoreInsights, Lead, Job, Quote, Employee, Equipment, UpsellSuggestion, MaintenanceAdvice } from "../../types";

// Use environment variable injected by Vite
const geminiApiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;

if (!geminiApiKey) {
    console.error("VITE_GEMINI_API_KEY is not set!");
}

const ai = new GoogleGenAI({ apiKey: geminiApiKey as string });

const aiCoreSchema = {
    type: Type.OBJECT,
    properties: {
        businessSummary: { type: Type.STRING, description: "A brief, 1-2 sentence summary of the current business status." },
        leadScores: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    leadId: { type: Type.STRING },
                    customerName: { type: Type.STRING },
                    score: { type: Type.NUMBER, description: "Score from 1-100." },
                    reasoning: { type: Type.STRING },
                    recommendedAction: { type: Type.STRING, enum: ['Prioritize Follow-up', 'Standard Follow-up', 'Nurture'] }
                },
                required: ["leadId", "customerName", "score", "reasoning", "recommendedAction"]
            }
        },
        jobSchedules: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    quoteId: { type: Type.STRING },
                    customerName: { type: Type.STRING },
                    suggestedDate: { type: Type.STRING, description: "Suggested date in YYYY-MM-DD format." },
                    suggestedCrew: { type: Type.ARRAY, items: { type: Type.STRING } },
                    reasoning: { type: Type.STRING }
                },
                required: ["quoteId", "customerName", "suggestedDate", "suggestedCrew", "reasoning"]
            }
        },
        maintenanceAlerts: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    equipmentId: { type: Type.STRING },
                    equipmentName: { type: Type.STRING },
                    reasoning: { type: Type.STRING },
                    recommendedAction: { type: Type.STRING, enum: ['Schedule Service Immediately', 'Schedule Routine Check-up'] }
                },
                 required: ["equipmentId", "equipmentName", "reasoning", "recommendedAction"]
            }
        }
    },
    required: ["businessSummary", "leadScores", "jobSchedules", "maintenanceAlerts"]
};

export const getAiCoreInsights = async (
    leads: Lead[],
    jobs: Job[],
    quotes: Quote[],
    employees: Employee[],
    equipment: Equipment[]
): Promise<AICoreInsights> => {

    const today = new Date().toISOString().split('T')[0];
    const prompt = `
        You are the AI Core for TreePro AI, a business management platform for tree service companies. Your function is to analyze all operational data and provide actionable, intelligent insights to automate and optimize the business. Today's date is ${today}.

        Analyze the following business data:
        - All Leads: ${JSON.stringify(leads)}
        - All Jobs: ${JSON.stringify(jobs)}
        - All Quotes: ${JSON.stringify(quotes)}
        - All Employees: ${JSON.stringify(employees.map(e => ({id: e.id, name: e.name, jobTitle: e.jobTitle})))}
        - All Equipment: ${JSON.stringify(equipment)}

        Based on this data, generate a JSON object with the following insights:
        1.  **businessSummary**: A brief, 1-2 sentence summary of the current business status. Mention any urgent items.
        2.  **leadScores**: Analyze all leads with status 'New'. Score each lead from 1 to 100 based on potential value, urgency (keywords like 'emergency', 'ASAP'), and likelihood to convert. An 'Emergency Call' should have a very high score.
        3.  **jobSchedules**: Find all quotes with status 'Accepted' that do not yet have a corresponding job in the jobs list. For each, suggest an optimal schedule date (a weekday in the near future) and a crew assignment (list of employee names). Consider crew composition (e.g., a leader and groundsman). Provide reasoning for your suggestion.
        4.  **maintenanceAlerts**: Analyze the equipment list. Flag any equipment where status is 'Needs Maintenance'. Also, flag equipment where 'lastServiceDate' was more than 6 months ago from today's date (${today}). Provide a recommended action.

        Return ONLY a valid JSON object adhering to the provided schema. Do not include any other text or markdown formatting.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: aiCoreSchema
            }
        });

        const cleanedJsonText = response.text.trim().replace(/^```json\s*|```$/g, '');
        return JSON.parse(cleanedJsonText) as AICoreInsights;

    } catch (error: any) {
        console.error("Error getting AI Core insights:", error);
        const errorMessage = error?.message || error?.toString() || "Unknown error";
        const errorDetails = error?.status ? ` (Status: ${error.status})` : '';
        throw new Error(`Failed to generate AI Core insights: ${errorMessage}${errorDetails}`);
    }
};

const upsellSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            service_name: { type: Type.STRING, description: "A clear name for the suggested service (e.g., 'Stump Grinding', 'Debris Haul-Away')." },
            description: { type: Type.STRING, description: "A brief, customer-facing explanation of what the service entails." },
            suggested_price: { type: Type.NUMBER, description: "A reasonable, competitive price for this standalone service." }
        },
        required: ["service_name", "description", "suggested_price"]
    }
};

export const generateUpsellSuggestions = async (existingServices: string[]): Promise<UpsellSuggestion[]> => {
    const prompt = `
        You are an expert sales assistant for a tree care company. Based on the services already in a customer's quote, suggest relevant upsell or cross-sell opportunities.

        **Existing Services in Quote:**
        - ${existingServices.join('\n- ')}

        **Your Task:**
        Provide a list of 2-3 complementary services. For each suggestion:
        1.  Provide a clear service name.
        2.  Write a brief, compelling description for the customer.
        3.  Suggest a realistic price.

        **Common Upsell Pairings:**
        -   If "Tree Removal", suggest "Stump Grinding", "Debris Haul-Away", or "Soil/Grass Restoration".
        -   If "Tree Pruning" or "Trimming", suggest "Fertilization Treatment", "Cabling and Bracing" for weak branches, or "Pest/Disease Inspection".
        -   If "Emergency Service", suggest "Preventative Pruning for other trees" or "Comprehensive Property Safety Assessment".
        
        Do not suggest services that are already in the quote. Return ONLY a valid JSON array adhering to the provided schema. If there are no logical suggestions, return an empty array.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: upsellSchema
            }
        });
        const cleanedJsonText = response.text.trim().replace(/^```json\s*|```$/g, '');
        // Handle cases where the model might return an empty string for no suggestions
        if (!cleanedJsonText) {
            return [];
        }
        return JSON.parse(cleanedJsonText) as UpsellSuggestion[];
    } catch (error: any) {
        console.error("Error generating upsell suggestions:", error);
        const errorMessage = error?.message || error?.toString() || "Unknown error";
        throw new Error(`Failed to generate AI upsell suggestions: ${errorMessage}`);
    }
};

const maintenanceAdviceSchema = {
    type: Type.OBJECT,
    properties: {
        next_service_recommendation: {
            type: Type.STRING,
            description: "A concise, actionable recommendation for the next service and when it should be performed."
        },
        common_issues: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of common issues or parts to check for this specific make and model."
        }
    },
    required: ["next_service_recommendation", "common_issues"]
};

export const generateMaintenanceAdvice = async (equipment: Equipment): Promise<MaintenanceAdvice> => {
    const prompt = `
        You are an expert equipment maintenance technician specializing in arboriculture machinery. Analyze the provided equipment data and its service history to give proactive maintenance advice.

        **Equipment Details:**
        - Name: ${equipment.name}
        - Make/Model: ${equipment.make} ${equipment.model}
        - Purchase Date: ${equipment.purchaseDate}
        - Last Service Date: ${equipment.lastServiceDate}
        - Maintenance History: ${JSON.stringify(equipment.maintenanceHistory, null, 2)}

        **Your Task:**
        1.  **Next Service Recommendation**: Based on the equipment type, age, and last service date, provide a clear, one-sentence recommendation for its next service. (e.g., "Recommend a full engine service with oil and filter change within the next 3 months or 50 operating hours.").
        2.  **Common Issues**: For this specific make and model (${equipment.make} ${equipment.model}), list 2-3 common issues or parts that wear out and should be inspected regularly. (e.g., "Check hydraulic hoses for cracks", "Inspect grinder teeth for wear and torque", "Ensure chipper blades are sharp and properly gapped").

        Return ONLY a valid JSON object adhering to the provided schema.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: maintenanceAdviceSchema
            }
        });
        const cleanedJsonText = response.text.trim().replace(/^```json\s*|```$/g, '');
        return JSON.parse(cleanedJsonText) as MaintenanceAdvice;
    } catch (error: any) {
        console.error("Error generating maintenance advice:", error);
        const errorMessage = error?.message || error?.toString() || "Unknown error";
        throw new Error(`Failed to generate AI maintenance advice: ${errorMessage}`);
    }
};