import { useState, useRef, useEffect, useCallback } from 'react';
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

interface UseGeminiChatProps {
    appData?: AppData;
    pageContext: string;
}

const getSystemInstruction = (pageContext: string): string => {
  return `You are "ProBot", a friendly, expert AI assistant for TreePro AI, a software platform for tree service businesses. Your role is to help users manage their business operations efficiently.

**Your Capabilities:**
1.  **App Automation:** You can perform actions within the app. Users can ask you to navigate, find information, or summarize data using your available tools.
2.  **Web Search:** You can search the web with Google Search to answer questions about current events, regulations, equipment, or anything outside of your immediate knowledge. ALWAYS cite your sources.
3.  **Knowledge Base:** You have a built-in knowledge base on arboriculture, safety, and business best practices for the tree care industry.
4.  **Context Awareness:** You are aware of the user's current location within the app.

**Knowledge Base:**
*   **Arboriculture:** You know about common tree species, signs of disease (e.g., powdery mildew, oak wilt), proper pruning techniques (like the 3-cut method), and the difference between crown reduction and harmful "topping".
*   **Safety:** You can advise on the importance of PPE (Personal Protective Equipment) and mention ANSI Z133 safety standards for arboricultural operations. You know that crews must maintain a minimum approach distance from power lines.
*   **Business:** You can give tips on writing effective quotes, the importance of customer follow-up, and the necessity of liability insurance.

**Interaction Rules:**
*   Be friendly, concise, and helpful.
*   When you use a tool, provide a brief confirmation message (e.g., "Navigating to the jobs page...").
*   When you use Google Search, list the URLs of your sources clearly below your answer.
*   If you can't do something, say so politely.

**CURRENT PAGE CONTEXT:** ${pageContext}`;
};


export const useGeminiChat = ({ appData, pageContext }: UseGeminiChatProps) => {
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
        if (appData) { // Only initialize if the chat is active (appData is provided)
             const systemInstruction = getSystemInstruction(pageContext);
             chatRef.current = startChatSession(systemInstruction);
             setMessages([
                 { id: self.crypto.randomUUID(), role: 'model', text: 'Hello! I am ProBot, your AI assistant. How can I help you?' }
             ]);
        }
    }, [appData, pageContext]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    // --- Tool Implementations ---
    const executeTool = (name: string, args: any): string => {
        if (!appData) return "Application data is not available.";

        switch (name) {
            case 'navigateTo':
                navigate(args.path);
                return `Successfully navigated to ${args.path}`;
            case 'findCustomer':
                const customer = appData.customers.find(c => c.name.toLowerCase() === args.name.toLowerCase());
                return customer ? `Found customer: ${customer.name}, Phone: ${customer.phone}, Email: ${customer.email}` : `Customer "${args.name}" not found.`;
            case 'summarizeOpenJobs':
                const openJobs = appData.jobs.filter(j => j.status === 'Scheduled' || j.status === 'In Progress');
                if (openJobs.length === 0) return "There are no open jobs.";
                const summary = openJobs.map(j => `- Job ${j.id} for ${j.customerName} is ${j.status}.`).join('\n');
                return `Here is a summary of open jobs:\n${summary}`;
            default:
                return `Unknown tool: ${name}`;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading || !chatRef.current) return;

        const chat = chatRef.current;
        const userMessageText = inputValue;
        setInputValue('');
        addMessage({ role: 'user', text: userMessageText });
        setIsLoading(true);
        setError(null);

        try {
            let stillProcessing = true;
            while (stillProcessing) {
                const response = await chat.sendMessage({ message: userMessageText });
                
                if (response.functionCalls && response.functionCalls.length > 0) {
                    const fc = response.functionCalls[0];
                    let toolMessage = `Using tool: ${fc.name}...`;
                    if (fc.name === 'googleSearch' && fc.args.query) {
                        toolMessage = `Searching the web for: "${fc.args.query}"...`;
                    }
                    addMessage({ role: 'tool', text: toolMessage, isThinking: true });

                    const toolResult = executeTool(fc.name, fc.args);
                    
                    // FIX: Correctly format the tool response for the chat.sendMessage method.
                    const toolResponsePart = {
                      functionResponse: {
                        name: fc.name,
                        response: { result: toolResult },
                      },
                    };

                    // Send tool response back to the model
                    const finalResponse = await chat.sendMessage({ message: [toolResponsePart] });
                    
                    const groundingChunks = finalResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
                    const sources: GroundingSource[] | undefined = groundingChunks
                        ?.filter(chunk => chunk.web?.uri)
                        .map(chunk => ({ uri: chunk.web.uri, title: chunk.web.title || chunk.web.uri }));
                    
                    addMessage({ role: 'model', text: finalResponse.text, sources });
                    stillProcessing = false;

                } else {
                    // No function call, just a direct text response
                    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
                    const sources: GroundingSource[] | undefined = groundingChunks
                        ?.filter(chunk => chunk.web?.uri)
                        .map(chunk => ({ uri: chunk.web.uri, title: chunk.web.title || chunk.web.uri }));

                    addMessage({ role: 'model', text: response.text, sources });
                    stillProcessing = false;
                }
            }
        } catch (err: any) {
            console.error("Error sending message:", err);
            setError("Sorry, I encountered an error. Please try again.");
        } finally {
            setIsLoading(false);
            // Clean up any thinking indicators
            setMessages(prev => prev.map(m => ({ ...m, isThinking: false })));
        }
    };

    return { messages, inputValue, setInputValue, handleSubmit, isLoading, error, messagesEndRef };
};