import { GoogleGenAI, Type, FunctionDeclaration, Chat } from "@google/genai";
import { SEOSuggestions, EmailCampaign, AICoreInsights, Lead, Job, Quote, Employee, Equipment, AITreeEstimate, UpsellSuggestion, JobHazardAnalysis, MaintenanceAdvice } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// --- New Advanced Chat Service ---

const appFunctions: FunctionDeclaration[] = [
    {
        name: 'navigateTo',
        description: 'Navigate to a specific page within the TreePro AI application.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                path: {
                    type: Type.STRING,
                    description: 'The path to navigate to (e.g., "/quotes", "/jobs").',
                    enum: ['/dashboard', '/ai-core', '/leads', '/quotes', '/jobs', '/customers', '/invoices', '/calendar', '/employees', '/equipment', '/marketing', '/settings']
                },
            },
            required: ['path'],
        },
    },
    {
        name: 'openCreationForm',
        description: 'Navigate to the appropriate page and open the creation form for a new item, such as a quote, customer, job, or lead.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                itemType: {
                    type: Type.STRING,
                    description: 'The type of item to create.',
                    enum: ['quote', 'customer', 'job', 'lead', 'employee', 'equipment']
                },
            },
            required: ['itemType'],
        },
    },
    {
        name: 'findCustomer',
        description: 'Find a customer by their name and get their contact details.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: 'The full name of the customer to find.' },
            },
            required: ['name'],
        },
    },
    {
        name: 'summarizeOpenJobs',
        description: 'Get a summary of all jobs that are currently "Scheduled" or "In Progress".',
    },
    {
        name: 'createCustomer',
        description: 'Create a new customer record in the system.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: 'The full name of the customer.' },
                email: { type: Type.STRING, description: 'The email address of the customer.' },
                phone: { type: Type.STRING, description: 'The phone number of the customer.' },
                address: { type: Type.STRING, description: 'The full address of the customer.' },
            },
            required: ['name', 'email'],
        },
    },
    {
        name: 'createQuote',
        description: 'Create a new quote for a customer.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                customerName: { type: Type.STRING, description: 'The name of the existing customer for whom the quote is being created.' },
                lineItems: {
                    type: Type.ARRAY,
                    description: 'A list of services and their prices.',
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            description: { type: Type.STRING, description: 'The description of the service.' },
                            price: { type: Type.NUMBER, description: 'The price of the service.' },
                        },
                        required: ['description', 'price'],
                    },
                },
                stumpGrindingPrice: { type: Type.NUMBER, description: 'Optional price for stump grinding if not included in line items.' },
            },
            required: ['customerName', 'lineItems'],
        },
    },
    {
        name: 'createJob',
        description: 'Create and schedule a new job from an existing, accepted quote.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                quoteId: { type: Type.STRING, description: 'The ID of the accepted quote to create the job from.' },
                scheduledDate: { type: Type.STRING, description: 'The date to schedule the job for, in YYYY-MM-DD format.' },
                assignedCrew: {
                    type: Type.ARRAY,
                    description: 'A list of employee names to assign to the job.',
                    items: { type: Type.STRING },
                },
            },
            required: ['quoteId', 'scheduledDate', 'assignedCrew'],
        },
    }
];

export const startChatSession = (systemInstruction: string): Chat => {
    return ai.chats.create({
        model: 'gemini-2.5-pro',
        config: {
            systemInstruction: systemInstruction,
            tools: [
                { functionDeclarations: appFunctions },
            ],
        }
    });
};

// --- Existing Services ---

export const generateJobHazardAnalysis = async (files: { mimeType: string, data: string }[], services: string): Promise<JobHazardAnalysis> => {
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


export const generateTreeEstimate = async (files: { mimeType: string, data: string }[]): Promise<AITreeEstimate> => {
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
            model: 'gemini-2.5-flash',
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
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: aiCoreSchema
            }
        });

        const cleanedJsonText = response.text.trim().replace(/^```json\s*|```$/g, '');
        return JSON.parse(cleanedJsonText) as AICoreInsights;

    } catch (error) {
        console.error("Error getting AI Core insights:", error);
        throw new Error("Failed to generate AI Core insights.");
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
            model: 'gemini-2.5-pro',
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
    } catch (error) {
        console.error("Error generating upsell suggestions:", error);
        throw new Error("Failed to generate AI upsell suggestions.");
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
    } catch (error) {
        console.error("Error generating maintenance advice:", error);
        throw new Error("Failed to generate AI maintenance advice.");
    }
};