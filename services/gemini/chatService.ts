import { GoogleGenAI, Chat } from "@google/genai";
import { FunctionDeclaration, Type } from "@google/genai";

// Use environment variable injected by Vite
const geminiApiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;

if (!geminiApiKey) {
    console.error("VITE_GEMINI_API_KEY is not set!");
}

const ai = new GoogleGenAI({ apiKey: geminiApiKey as string });

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
    },
    {
        name: 'rescheduleJob',
        description: 'Reschedule a job to a new date.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                jobId: {
                    type: Type.STRING,
                    description: 'The ID of the job to reschedule.'
                },
                newDate: {
                    type: Type.STRING,
                    description: 'The new date to schedule the job for, in YYYY-MM-DD format.'
                },
            },
            required: ['jobId', 'newDate'],
        },
    },
    {
        name: 'generateInvoice',
        description: 'Generate an invoice for a completed job.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                jobId: {
                    type: Type.STRING,
                    description: 'The ID of the completed job to generate an invoice for.'
                },
            },
            required: ['jobId'],
        },
    },
    {
        name: 'addMaintenanceLog',
        description: 'Add a maintenance log entry for equipment.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                equipmentId: {
                    type: Type.STRING,
                    description: 'The ID of the equipment to add the maintenance log for.'
                },
                description: {
                    type: Type.STRING,
                    description: 'The description of the maintenance performed.'
                },
                cost: {
                    type: Type.NUMBER,
                    description: 'The cost of the maintenance.'
                },
                date: {
                    type: Type.STRING,
                    description: 'The date of the maintenance, in YYYY-MM-DD format.'
                },
            },
            required: ['equipmentId', 'description', 'cost', 'date'],
        },
    },
    {
        name: 'summarizeRevenue',
        description: 'Get revenue summary for a time period.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                period: {
                    type: Type.STRING,
                    description: 'The time period to summarize revenue for.',
                    enum: ['this-month', 'last-month', 'this-year', 'last-year', 'custom']
                },
                startDate: {
                    type: Type.STRING,
                    description: 'The start date for custom period, in YYYY-MM-DD format. Required when period is "custom".'
                },
                endDate: {
                    type: Type.STRING,
                    description: 'The end date for custom period, in YYYY-MM-DD format. Required when period is "custom".'
                },
            },
            required: ['period'],
        },
    },
    {
        name: 'summarizeLeads',
        description: 'Get lead summary with optional filters.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                source: {
                    type: Type.STRING,
                    description: 'Optional filter by lead source (e.g., "Website", "Referral", "Social Media").'
                },
                status: {
                    type: Type.STRING,
                    description: 'Optional filter by lead status.',
                    enum: ['New', 'Contacted', 'Qualified', 'Lost']
                },
                period: {
                    type: Type.STRING,
                    description: 'Optional filter by time period.',
                    enum: ['this-month', 'last-month', 'this-year', 'last-year', 'custom']
                },
            },
        },
    },
    {
        name: 'getJobDetails',
        description: 'Get detailed information about a specific job.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                jobId: {
                    type: Type.STRING,
                    description: 'The ID of the job to get details for.'
                },
            },
            required: ['jobId'],
        },
    },
    {
        name: 'updateJobStatus',
        description: 'Update the status of a job.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                jobId: {
                    type: Type.STRING,
                    description: 'The ID of the job to update.'
                },
                newStatus: {
                    type: Type.STRING,
                    description: 'The new status for the job.',
                    enum: ['Unscheduled', 'Scheduled', 'In Progress', 'Completed', 'Cancelled']
                },
            },
            required: ['jobId', 'newStatus'],
        },
    },
    {
        name: 'searchCustomers',
        description: 'Search for customers by name, email, or phone number.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                searchQuery: {
                    type: Type.STRING,
                    description: 'The search query to find customers by name, email, or phone.'
                },
            },
            required: ['searchQuery'],
        },
    },
    {
        name: 'getEquipmentStatus',
        description: 'Get status and maintenance information for equipment.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                equipmentId: {
                    type: Type.STRING,
                    description: 'Optional equipment ID. If not provided, returns status for all equipment.'
                },
            },
        },
    },
    {
        name: 'createLead',
        description: 'Create a new lead in the system.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                customerId: {
                    type: Type.STRING,
                    description: 'The ID of the customer for this lead.'
                },
                source: {
                    type: Type.STRING,
                    description: 'The source of the lead (e.g., "Website", "Referral", "Social Media").'
                },
                description: {
                    type: Type.STRING,
                    description: 'Description of the lead and customer needs.'
                },
            },
            required: ['customerId', 'source', 'description'],
        },
    }
];

export const startChatSession = (systemInstruction: string): Chat => {
    return ai.chats.create({
        model: 'gemini-2.0-flash',
        config: {
            systemInstruction: systemInstruction,
            tools: [
                { functionDeclarations: appFunctions },
            ],
        }
    });
};