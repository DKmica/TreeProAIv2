import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chat } from '@google/genai';
import { ChatMessage, GroundingSource, Customer, Lead, Quote, Job, Invoice, Employee, Equipment } from '../types';
import { startChatSession } from '../services/geminiService';

interface AppData {
  customers: Customer[];
  leads: Lead[];
  quotes: Quote[];
  jobs: Job[];
  invoices: Invoice[];
  employees: Employee[];
  equipment: Equipment[];
}

interface AppState {
  data: AppData;
  setters: {
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
    setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>;
    setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
    setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
    setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
    setEquipment: React.Dispatch<React.SetStateAction<Equipment[]>>;
  }
}

interface UseGeminiChatProps {
    appState?: AppState;
    pageContext: string;
}

const getSystemInstruction = (pageContext: string): string => {
  return `You are "ProBot", a friendly, expert AI assistant for TreePro AI, a software platform for tree service businesses. Your role is to help users manage their business operations efficiently. You have two primary areas of expertise: Arboriculture and the TreePro AI application.

**Your Personas:**
1.  **Expert Arborist:** You are an ISA Certified Arborist with extensive knowledge. You can answer questions about tree identification, disease diagnosis, pruning techniques, safety standards, and general tree care.
2.  **Expert TreePro Assistant:** You are an expert on the TreePro AI software. You understand all its features and can help users navigate the app, find information, and automate tasks.

**Your Capabilities:**
1.  **App Automation (Tools):** You can perform actions within the app. Users can ask you to navigate, find information, create new items, or summarize data using your available tools. You will be provided with a list of functions you can call.
2.  **Knowledge Base:** You have a built-in knowledge base on arboriculture, safety, and business best practices for the tree care industry. For topics outside of your knowledge base, you should inform the user you cannot search the web for live information.

**Arboriculture Knowledge Base (Examples):**
*   **Tree Health:** You can identify signs of common diseases like powdery mildew, oak wilt, or pests like the Emerald Ash Borer.
*   **Pruning & Techniques:** You can explain proper pruning cuts (e.g., the 3-cut method), the difference between crown reduction and harmful "topping," and the best time of year to prune specific species.
*   **Safety Standards:** You can advise on the importance of Personal Protective Equipment (PPE) like helmets and chaps. You know about ANSI Z133 safety standards and the critical need to maintain a Minimum Approach Distance (MAD) from power lines.
*   **General Knowledge:** You know that girdling roots can kill a tree, and that "volcano mulching" is harmful.

**TreePro App Knowledge (Tool Usage Examples):**
*   If a user asks "Show me Jane Smith's info," you should use the \`findCustomer\` tool with the name "Jane Smith".
*   If a user says "Take me to the schedule," or "Show me today's jobs" you should use the \`navigateTo\` tool with the path "/calendar".
*   If a user asks "What jobs are open right now?", you should use the \`summarizeOpenJobs\` tool.
*   If a user says "I need to add a new customer," or "New customer," you should use the \`openCreationForm\` tool with \`itemType: 'customer'\`.
*   If a user asks "Can you create a quote?", you should use \`openCreationForm\` with \`itemType: 'quote'\`.
*   If a user asks "Create a new customer named John Appleseed, email john@apple.com", you should use the \`createCustomer\` tool with the appropriate parameters.
*   If a user says "Generate a quote for John Appleseed for tree removal at $1500", you should use the \`createQuote\` tool.

**Interaction Rules:**
*   Be friendly, professional, concise, and helpful.
*   When you use a tool, provide a brief confirmation message in a "tool" response (e.g., "Searching for customer John Doe...").
*   Format your responses for readability using markdown (e.g., bullet points, bold text).
*   If you can't do something, say so politely and explain why.

**CURRENT PAGE CONTEXT:** ${pageContext}`;
};


export const useGeminiChat = ({ appState, pageContext }: UseGeminiChatProps) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatRef = useRef<Chat | null>(null);
    const navigate = useNavigate();

    const addMessage = (message: Omit<ChatMessage, 'id'>) => {
        setMessages(prev => [...prev, { ...message, id: self.crypto.randomUUID() }]);
    };

    useEffect(() => {
        if (appState) { // Only initialize if the chat is active (appState is provided)
             const systemInstruction = getSystemInstruction(pageContext);
             chatRef.current = startChatSession(systemInstruction);
             setMessages([
                 { id: self.crypto.randomUUID(), role: 'model', text: 'Hello! I am ProBot, your expert arborist and app assistant. How can I help you today?' }
             ]);
        }
    }, [appState, pageContext]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    // --- Tool Implementations ---
    const executeTool = (name: string, args: any): string => {
        if (!appState) return "Application data is not available.";
        const { data, setters } = appState;

        switch (name) {
            case 'navigateTo':
                navigate(args.path);
                return `Successfully navigated to ${args.path}`;
            case 'openCreationForm': {
                const { itemType } = args;
                const pathMap: { [key: string]: string } = {
                    quote: '/quotes',
                    customer: '/customers',
                    job: '/jobs',
                    lead: '/leads',
                    employee: '/employees',
                    equipment: '/equipment',
                };
                const path = pathMap[itemType];
                if (path) {
                    navigate(path, { state: { openCreateForm: true } });
                    return `Opening the form to create a new ${itemType}.`;
                }
                return `Error: Unknown item type "${itemType}".`;
            }
            case 'findCustomer':
                const customer = data.customers.find(c => c.name.toLowerCase() === args.name.toLowerCase());
                return customer ? `Found customer: ${customer.name}, Phone: ${customer.phone}, Email: ${customer.email}` : `Customer "${args.name}" not found.`;
            case 'summarizeOpenJobs':
                const openJobs = data.jobs.filter(j => j.status === 'Scheduled' || j.status === 'In Progress');
                if (openJobs.length === 0) return "There are no open jobs.";
                const summary = openJobs.map(j => `- Job ${j.id} for ${j.customerName} is ${j.status}.`).join('\n');
                return `Here is a summary of open jobs:\n${summary}`;
            case 'createCustomer': {
                if (data.customers.some(c => c.name.toLowerCase() === args.name.toLowerCase())) {
                    return `Error: A customer with the name "${args.name}" already exists.`;
                }
                const newCustomer: Customer = {
                    id: `cust-${Date.now()}`,
                    name: args.name,
                    email: args.email,
                    phone: args.phone || '',
                    address: args.address || '',
                    coordinates: { lat: 0, lng: 0 },
                };
                setters.setCustomers((prev: Customer[]) => [newCustomer, ...prev]);
                return `Successfully created new customer: ${newCustomer.name} (ID: ${newCustomer.id}).`;
            }
    
            case 'createQuote': {
                const customer = data.customers.find(c => c.name.toLowerCase() === args.customerName.toLowerCase());
                if (!customer) {
                    return `Error: Customer "${args.customerName}" not found. Please create the customer first.`;
                }
                const newQuote: Quote = {
                    id: `quote-${Date.now()}`,
                    leadId: '',
                    customerName: customer.name,
                    status: 'Draft',
                    lineItems: args.lineItems.map((item: any) => ({ ...item, selected: true })),
                    stumpGrindingPrice: args.stumpGrindingPrice || 0,
                    createdAt: new Date().toISOString().split('T')[0],
                };
                setters.setQuotes((prev: Quote[]) => [newQuote, ...prev]);
                return `Successfully created a draft quote (ID: ${newQuote.id}) for ${customer.name}.`;
            }
            
            case 'createJob': {
                const quote = data.quotes.find(q => q.id === args.quoteId);
                if (!quote) {
                    return `Error: Quote with ID "${args.quoteId}" not found.`;
                }
                if (quote.status !== 'Accepted') {
                    return `Error: Quote "${args.quoteId}" has not been accepted by the customer. Only accepted quotes can be converted to jobs.`;
                }
                if (data.jobs.some(j => j.quoteId === args.quoteId)) {
                     return `Error: A job for quote "${args.quoteId}" already exists.`;
                }
                const crewIds = args.assignedCrew
                    .map((name: string) => data.employees.find(e => e.name.toLowerCase() === name.toLowerCase())?.id)
                    .filter((id: string | undefined): id is string => !!id);
                
                if (crewIds.length !== args.assignedCrew.length) {
                    const missingNames = args.assignedCrew.filter((name: string) => !data.employees.some(e => e.name.toLowerCase() === name.toLowerCase()));
                    return `Error: The following assigned crew members could not be found: ${missingNames.join(', ')}.`;
                }

                const newJob: Job = {
                    id: `job-${Date.now()}`,
                    quoteId: args.quoteId,
                    customerName: quote.customerName,
                    status: 'Scheduled',
                    scheduledDate: args.scheduledDate,
                    assignedCrew: crewIds,
                };
                setters.setJobs((prev: Job[]) => [newJob, ...prev]);
                return `Successfully created and scheduled Job ID ${newJob.id}.`;
            }
            default:
                return `Error: Tool "${name}" not found.`;
        }
    };
    
    const sendMessage = useCallback(async (messageText: string) => {
        const userMessage = messageText.trim();
        if (!userMessage || !chatRef.current) return;

        setIsLoading(true);
        setError(null);
        addMessage({ role: 'user', text: userMessage });
        setInputValue('');

        try {
            // First, get the full response to check for function calls
            const response = await chatRef.current.sendMessage({ message: userMessage });
            const functionCalls = response.functionCalls;
            
            if (functionCalls && functionCalls.length > 0) {
                 const call = functionCalls[0];
                 const thinkingMessage = `Calling tool: \`${call.name}\` with arguments: ${JSON.stringify(call.args)}`;
                 addMessage({ role: 'tool', text: thinkingMessage, isThinking: true });

                 const result = executeTool(call.name, call.args);

                 setMessages(prev => prev.map(msg => msg.text === thinkingMessage ? { ...msg, text: `Tool \`${call.name}\` executed.`, isThinking: false } : msg));

                 // Send the tool result back and stream the final response
                 const resultStream = await chatRef.current.sendMessageStream({
                    message: JSON.stringify({
                        functionResponse: { name: call.name, response: { result } }
                    })
                 });

                 let finalModelResponse = '';
                 let finalModelMessageId: string | null = null;
                 for await (const chunk of resultStream) {
                    const chunkText = chunk.text;
                    if(chunkText) {
                        finalModelResponse += chunkText;
                        if (finalModelMessageId) {
                            setMessages(prev => prev.map(msg => msg.id === finalModelMessageId ? { ...msg, text: finalModelResponse } : msg));
                        } else {
                            const newMsgId = self.crypto.randomUUID();
                            finalModelMessageId = newMsgId;
                            // FIX: Object literal may only specify known properties, and 'id' does not exist in type 'Omit<ChatMessage, "id">'.
                            setMessages(prev => [...prev, { id: newMsgId, role: 'model', text: finalModelResponse }]);
                        }
                    }
                 }
            } else {
                 // No function call, just stream the text response
                 const stream = await chatRef.current.sendMessageStream({ message: userMessage });
                 let currentModelResponse = '';
                 let modelMessageId: string | null = null;
                 for await (const chunk of stream) {
                     const chunkText = chunk.text;
                     if (chunkText) {
                         currentModelResponse += chunkText;
                         if (modelMessageId) {
                             setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, text: currentModelResponse } : msg));
                         } else {
                             const newMsgId = self.crypto.randomUUID();
                             modelMessageId = newMsgId;
                             // FIX: Object literal may only specify known properties, and 'id' does not exist in type 'Omit<ChatMessage, "id">'.
                             setMessages(prev => [...prev, { id: newMsgId, role: 'model', text: currentModelResponse }]);
                         }
                     }
                 }
            }
        } catch (e: any) {
            console.error("Error sending message:", e);
            const errorMessage = e.body ? (await e.json()).error.message : (e.message || JSON.stringify(e));
            setError(`Error sending message:\n${errorMessage}`);
            addMessage({role: 'model', text: 'Sorry, I encountered an error. Please try again.'});
        } finally {
            setIsLoading(false);
        }
    }, [chatRef.current, appState, navigate]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(inputValue);
    };

    return {
        messages,
        inputValue,
        setInputValue,
        handleSubmit,
        isLoading,
        error,
        messagesEndRef,
        sendMessage,
    };
};