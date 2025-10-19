import { GoogleGenAI, Type } from "@google/genai";
import { AIEstimate, SEOSuggestions, EmailCampaign, AICoreInsights, Lead, Job, Quote, Employee, Equipment, LeadScoreSuggestion, JobScheduleSuggestion, MaintenanceAlert } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const estimateSchema = {
    type: Type.OBJECT,
    properties: {
        species_identification: { type: Type.STRING, description: "Identification of the tree species with a confidence score, e.g., 'Red Oak (Quercus rubra) with 92% confidence.'" },
        size_estimation: { type: Type.STRING, description: "Estimation of the tree's height and DBH (Diameter at Breast Height), e.g., 'Estimated height: 80ft, Estimated DBH: 32 inches.'" },
        health_and_risk_assessment: { type: Type.STRING, description: "A detailed assessment of the tree's health, noting any diseases, pests, or structural defects and associated risks." },
        identified_obstacles: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of identified hazards or obstacles, e.g., ['Proximity to house', 'Power lines nearby']." },
        estimated_price_range: {
            type: Type.ARRAY,
            description: "A tuple representing the low and high end of the estimated price range for the entire job, e.g., [800, 1200].",
            items: { type: Type.NUMBER }
        },
        line_items: {
            type: Type.ARRAY,
            description: "A list of suggested line items (services) for the quote based on the assessment.",
            items: {
                type: Type.OBJECT,
                properties: {
                    desc: { type: Type.STRING, description: "Description of the work for this line item." },
                    qty: { type: Type.NUMBER, description: "Quantity." },
                    unit_price: { type: Type.NUMBER, description: "Price per unit." }
                },
                required: ["desc", "qty", "unit_price"]
            }
        },
        difficulty: {
            type: Type.STRING,
            description: "The estimated difficulty of the job.",
            enum: ["Low", "Medium", "High"]
        },
        confidence: {
            type: Type.NUMBER,
            description: "A confidence score from 0.0 to 1.0 for the entire estimate."
        },
        rationale: {
            type: Type.STRING,
            description: "A brief, overall explanation of the factors that influenced the estimate and service suggestions."
        }
    },
    required: ["species_identification", "size_estimation", "health_and_risk_assessment", "identified_obstacles", "estimated_price_range", "line_items", "difficulty", "confidence", "rationale"]
};


export const generateEstimate = async (
  images: { mimeType: string; data: string }[],
  description: string
): Promise<AIEstimate> => {
  const imageParts = images.map(image => ({
    inlineData: {
      mimeType: image.mimeType,
      data: image.data
    }
  }));

  const textPart = {
    text: `
      You are an expert ISA Certified Arborist and estimator for a tree service company called TreePro AI.
      Your task is to perform a detailed visual assessment of the tree(s) in the user-provided images and generate a comprehensive job estimate.

      Customer's Description: "${description}"

      Follow this multi-step process:
      1.  **Analyze Images**: Carefully examine all images. Use reference objects (doors, fences, people) to gauge scale.
      2.  **Detailed Assessment**: Based on your visual analysis, provide the following details:
          - **Species Identification**: Identify the tree species, including a confidence score.
          - **Size Estimation**: Estimate the tree's height in feet and its DBH (Diameter at Breast Height) in inches.
          - **Health & Risk Assessment**: Describe the tree's condition. Note any signs of disease, pests, structural defects (e.g., codominant stems, cankers, fungal growth), or canopy dieback. State the associated risk level.
          - **Identified Obstacles**: List all potential hazards or obstacles that would complicate the job (e.g., proximity to structures, power lines, fences, limited access).
      3.  **Suggest Services**: Based on your assessment, create a list of line items for the services you recommend. Common services include 'Technical Tree Removal', 'Large Tree Pruning', 'Stump Grinding', 'Debris Hauling'.
      4.  **Estimate Pricing**: Provide an estimated price range for the entire job and a unit price for each line item. Use the following context: a standard 2-person crew costs $250/hour; a full day is around $2000. Stump grinding is ~$5 per inch of diameter. High-risk or complex jobs with obstacles will be more expensive.

      Return your complete analysis in the specified JSON format.
    `
  };

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart, ...imageParts] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: estimateSchema
        }
    });

    const jsonText = response.text.trim();
    const cleanedJsonText = jsonText.replace(/^```json\s*|```$/g, '');
    const parsedResponse = JSON.parse(cleanedJsonText);
    
    if (!parsedResponse.estimated_price_range || !parsedResponse.line_items) {
      throw new Error("Invalid response format from AI");
    }

    return parsedResponse as AIEstimate;

  } catch (error) {
    console.error("Error generating estimate with Gemini:", error);
    throw new Error("Failed to generate AI estimate. Please check the console for details.");
  }
};


export const generateSocialMediaPost = async (topic: string, platform: string): Promise<string> => {
    const prompt = `
        You are the social media manager for "TreePro AI", a professional tree care service.
        Your task is to write a social media post.

        Topic: "${topic}"
        Platform: ${platform}

        Instructions:
        - The tone should be friendly, professional, and trustworthy.
        - If the platform is Instagram or Facebook, suggest relevant hashtags (e.g., #TreeCare, #Arborist, #TreeProAI, #YourCityTreeService).
        - If the platform is Twitter, keep it concise and under 280 characters.
        - The post should be engaging and encourage interaction (e.g., asking a question, prompting a "call now").
        - End with a clear call to action.

        Generate the post text now.
    `;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt
        });
        return response.text;
    } catch (error) {
        console.error("Error generating social media post:", error);
        throw new Error("Failed to generate social media post.");
    }
};

const seoSchema = {
    type: Type.OBJECT,
    properties: {
        suggested_title: {
            type: Type.STRING,
            description: "An SEO-optimized title tag for the web page, under 60 characters."
        },
        suggested_meta_description: {
            type: Type.STRING,
            description: "An SEO-optimized meta description, under 160 characters, with a call-to-action."
        },
        optimization_tips: {
            type: Type.ARRAY,
            description: "A list of actionable tips to improve the on-page SEO of the provided content.",
            items: { type: Type.STRING }
        }
    },
    required: ["suggested_title", "suggested_meta_description", "optimization_tips"]
};

export const optimizeSEOContent = async (content: string, keyword: string): Promise<SEOSuggestions> => {
    const prompt = `
        You are an SEO expert working for "TreePro AI", a tree care company.
        Analyze the following webpage content and optimize it for the target keyword.

        Target Keyword: "${keyword}"

        Webpage Content:
        """
        ${content}
        """

        Your task is to provide:
        1. A concise, compelling, and keyword-rich title tag (under 60 characters).
        2. A meta description (under 160 characters) that includes the keyword and a strong call-to-action.
        3. A list of 3-5 actionable tips for improving the content's on-page SEO (e.g., where to add the keyword, suggestions for headings, internal linking ideas).

        Return the result in the specified JSON format.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: seoSchema
            }
        });
        const cleanedJsonText = response.text.trim().replace(/^```json\s*|```$/g, '');
        return JSON.parse(cleanedJsonText) as SEOSuggestions;
    } catch (error) {
        console.error("Error optimizing SEO content:", error);
        throw new Error("Failed to generate SEO optimizations.");
    }
};

const emailSchema = {
    type: Type.OBJECT,
    properties: {
        subject: {
            type: Type.STRING,
            description: "A compelling and concise email subject line."
        },
        body: {
            type: Type.STRING,
            description: "The full body of the email, written in a professional yet friendly tone. Use line breaks for readability."
        }
    },
    required: ["subject", "body"]
};

export const generateEmailCampaign = async (goal: string, audience: string): Promise<EmailCampaign> => {
     const prompt = `
        You are a marketing specialist for "TreePro AI", a professional tree care service.
        Your task is to write a marketing email.

        Campaign Goal: "${goal}"
        Target Audience: "${audience}"

        Instructions:
        - Write a compelling subject line that encourages opens.
        - Write the email body with a clear message.
        - The tone should be professional, helpful, and persuasive.
        - Personalize the email where appropriate (e.g., using "[Customer Name]").
        - End with a clear call-to-action (e.g., "Call us today for a free estimate!", "Visit our website to learn more.").
        - Sign off as "The Team at TreePro AI".

        Return the result in the specified JSON format.
    `;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: emailSchema
            }
        });
        const cleanedJsonText = response.text.trim().replace(/^```json\s*|```$/g, '');
        return JSON.parse(cleanedJsonText) as EmailCampaign;
    } catch (error) {
        console.error("Error generating email campaign:", error);
        throw new Error("Failed to generate email campaign.");
    }
};

// --- AI Core Sub-Functions ---

const _generateLeadScores = async (leads: Lead[]): Promise<LeadScoreSuggestion[]> => {
    if (leads.length === 0) return [];
    const prompt = `
        You are an AI assistant for a tree service company. Score the following new leads from 1-100 based on potential value and urgency.
        Analyze the 'notes' field for keywords like 'emergency', 'ASAP', 'fallen branch', 'storm damage', 'leaning tree', 'on my house'.
        If such keywords are present, set urgency to 'High' and the score to 90+.
        
        Leads: ${JSON.stringify(leads)}

        Return a JSON array of lead scores.
    `;
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                leadId: { type: Type.STRING }, customerName: { type: Type.STRING }, score: { type: Type.NUMBER },
                reasoning: { type: Type.STRING }, recommendedAction: { type: Type.STRING, enum: ['Prioritize Follow-up', 'Standard Follow-up', 'Nurture'] },
                urgency: { type: Type.STRING, enum: ['None', 'Medium', 'High'] }
            },
            required: ["leadId", "customerName", "score", "reasoning", "recommendedAction", "urgency"]
        }
    };
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro', contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: schema }
    });
    return JSON.parse(response.text.trim().replace(/^```json\s*|```$/g, '')) as LeadScoreSuggestion[];
};

const _generateJobSchedules = async (quotes: Quote[], employees: Partial<Employee>[]): Promise<JobScheduleSuggestion[]> => {
    if (quotes.length === 0) return [];
    const today = new Date().toISOString().split('T')[0];
    const prompt = `
        You are an AI scheduler for a tree service company. Today is ${today}.
        Suggest a schedule date (a weekday in the near future) and a crew (list of employee names) for each of the following accepted quotes.
        
        Accepted Quotes: ${JSON.stringify(quotes)}
        Available Employees: ${JSON.stringify(employees)}

        Return a JSON array of job schedule suggestions.
    `;
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                quoteId: { type: Type.STRING }, customerName: { type: Type.STRING },
                suggestedDate: { type: Type.STRING, description: "YYYY-MM-DD format" },
                suggestedCrew: { type: Type.ARRAY, items: { type: Type.STRING } },
                reasoning: { type: Type.STRING }
            },
            required: ["quoteId", "customerName", "suggestedDate", "suggestedCrew", "reasoning"]
        }
    };
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro', contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: schema }
    });
    return JSON.parse(response.text.trim().replace(/^```json\s*|```$/g, '')) as JobScheduleSuggestion[];
};

const _generateMaintenanceAlerts = async (equipment: Equipment[]): Promise<MaintenanceAlert[]> => {
    if (equipment.length === 0) return [];
    const today = new Date().toISOString().split('T')[0];
    const prompt = `
        You are an AI maintenance manager for a tree service company. Today is ${today}.
        Analyze the following equipment list. Flag items that need maintenance.
        An item needs maintenance if its status is 'Needs Maintenance' or if its 'last_maintenance' date was more than 6 months ago.
        
        Equipment: ${JSON.stringify(equipment)}

        Return a JSON array of maintenance alerts.
    `;
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                equipmentId: { type: Type.STRING }, equipmentName: { type: Type.STRING },
                reasoning: { type: Type.STRING },
                recommendedAction: { type: Type.STRING, enum: ['Schedule Service Immediately', 'Schedule Routine Check-up'] }
            },
            required: ["equipmentId", "equipmentName", "reasoning", "recommendedAction"]
        }
    };
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro', contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: schema }
    });
    return JSON.parse(response.text.trim().replace(/^```json\s*|```$/g, '')) as MaintenanceAlert[];
};

const _generateBusinessSummary = async (leads: Lead[], quotes: Quote[]): Promise<string> => {
    if (leads.length === 0 && quotes.length === 0) return "No new activity to summarize.";
    const prompt = `
        You are an AI business analyst. Briefly summarize the current situation in 1-2 sentences based on this data.
        New Leads: ${leads.length}
        Quotes to Schedule: ${quotes.length}
    `;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });
    return response.text;
};


export const getAiCoreInsights = async (
    leads: Lead[],
    jobs: Job[],
    quotes: Quote[],
    employees: Employee[],
    equipment: Equipment[]
): Promise<AICoreInsights> => {
    try {
        // --- Data Optimization ---
        const newLeads = leads.filter(lead => lead.status === 'New');
        const jobQuoteIds = new Set(jobs.map(job => job.quote_id));
        const quotesToSchedule = quotes.filter(quote => quote.status === 'Accepted' && !jobQuoteIds.has(quote.id));
        const relevantEmployees = employees.map(e => ({ id: e.id, name: e.name, role: e.role }));

        // --- Parallel AI Calls ---
        const [
            leadScores,
            jobSchedules,
            maintenanceAlerts,
            businessSummary
        ] = await Promise.all([
            _generateLeadScores(newLeads),
            _generateJobSchedules(quotesToSchedule, relevantEmployees),
            _generateMaintenanceAlerts(equipment),
            _generateBusinessSummary(newLeads, quotesToSchedule)
        ]);

        return {
            businessSummary,
            leadScores,
            jobSchedules,
            maintenanceAlerts,
            financialForecasts: [],
            anomalies: [],
        };

    } catch (error) {
        console.error("Error getting AI Core insights:", error);
        throw new Error("Failed to generate AI Core insights.");
    }
};