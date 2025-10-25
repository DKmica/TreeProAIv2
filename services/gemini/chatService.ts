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