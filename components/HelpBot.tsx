import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { ChatMessage } from '../types';
import SpinnerIcon from './icons/SpinnerIcon';
import ChatIcon from './icons/ChatIcon';
import XIcon from './icons/XIcon';


const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const getSystemInstruction = (pathname: string): string => {
  const baseInstruction = 'You are a friendly and helpful assistant for TreePro AI, a software platform for tree service businesses. Your role is to help users manage their business operations efficiently. You can answer questions about leads, quotes, jobs, scheduling, and invoicing within the context of the app.';
  
  let pageContext = '';
  if (pathname.startsWith('/dashboard')) {
    pageContext = "The user is currently on the Dashboard page, which shows an overview of the business, including key metrics and a live map of jobs and crews.";
  } else if (pathname.startsWith('/ai-core')) {
    pageContext = "The user is on the AI Core page, which provides intelligent insights like lead scoring, automated job scheduling suggestions, and equipment maintenance alerts.";
  } else if (pathname.startsWith('/leads')) {
    pageContext = "The user is on the Leads page. They can view, add, and manage all incoming customer leads here.";
  } else if (pathname.startsWith('/quotes')) {
    pageContext = "The user is on the Quotes page. They can create manual quotes or use the AI-powered estimator. They can also view all existing quotes.";
  } else if (pathname.startsWith('/jobs')) {
    pageContext = "The user is on the Jobs page, where they manage all active jobs converted from quotes. They can view job details, update status, and assign crew members.";
  } else if (pathname.startsWith('/customers')) {
    pageContext = "The user is on the Customers page, which lists all customer information.";
  } else if (pathname.startsWith('/invoices')) {
    pageContext = "The user is on the Invoices page, for managing billing and payments.";
  } else if (pathname.startsWith('/calendar')) {
    pageContext = "The user is on the Calendar page. This page provides a drag-and-drop interface for scheduling jobs.";
  } else if (pathname.startsWith('/employees')) {
    pageContext = "The user is on the Employees page, used for managing staff and crew members.";
  } else if (pathname.startsWith('/equipment')) {
    pageContext = "The user is on the Equipment page, where they can track all company assets like trucks and tools.";
  } else if (pathname.startsWith('/marketing')) {
    pageContext = "The user is on the Marketing page. This page has AI tools to generate social media posts, optimize SEO, and create email campaigns.";
  }

  if (pageContext) {
    return `${baseInstruction}\n\nCURRENT PAGE CONTEXT: ${pageContext}`;
  }

  return baseInstruction;
};


const HelpBot: React.FC<{ currentLocation: string }> = ({ currentLocation }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            const systemInstruction = getSystemInstruction(currentLocation);
            const chatSession = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: systemInstruction,
                },
            });
            setChat(chatSession);
            setMessages([
                { role: 'model', text: 'Hello! I am your TreePro AI assistant. How can I help you manage your business today?' }
            ]);
        }
    }, [isOpen, currentLocation]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading || !chat) return;

        const userMessage: ChatMessage = { role: 'user', text: inputValue };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);
        setError(null);
        
        setMessages(prev => [...prev, { role: 'model', text: '' }]);

        try {
            const responseStream = await chat.sendMessageStream({ message: userMessage.text });
            
            for await (const chunk of responseStream) {
                 setMessages(prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage && lastMessage.role === 'model') {
                        const updatedMessages = [...prev];
                        updatedMessages[prev.length - 1] = { ...lastMessage, text: lastMessage.text + chunk.text };
                        return updatedMessages;
                    }
                    return prev;
                });
            }
        } catch (err: any) {
            console.error("Error sending message:", err);
            setError("Sorry, I encountered an error. Please try again.");
            setMessages(prev => prev.slice(0, -1)); // Remove model placeholder
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-brand-cyan-600 text-white p-4 rounded-full shadow-lg hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2 transition-transform transform hover:scale-110"
                aria-label="Open AI Assistant"
            >
                <ChatIcon className="h-8 w-8" />
            </button>
        );
    }


    return (
        <div className="fixed bottom-6 right-6 z-50">
            <div className="flex flex-col w-96 max-h-[70vh] h-[550px] bg-white rounded-lg shadow-2xl border border-brand-navy-200">
                <header className="flex items-center justify-between p-4 bg-brand-navy-900 text-white rounded-t-lg">
                    <h2 className="text-lg font-semibold">AI Assistant</h2>
                    <button onClick={() => setIsOpen(false)} className="hover:bg-brand-navy-700 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-white" aria-label="Close chat">
                        <XIcon className="h-6 w-6" />
                    </button>
                </header>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs px-4 py-2 rounded-xl ${msg.role === 'user' ? 'bg-brand-cyan-600 text-white' : 'bg-brand-navy-200 text-brand-navy-800'}`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.role === 'model' && (
                         <div className="flex justify-start">
                             <div className="max-w-lg px-4 py-2 rounded-xl bg-brand-navy-200 text-brand-navy-800">
                                <SpinnerIcon className="h-5 w-5 text-brand-navy-500" />
                            </div>
                         </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {error && <div className="p-2 border-t border-brand-navy-200 text-center text-xs text-red-600">{error}</div>}

                <div className="border-t border-brand-navy-200 p-4 bg-white rounded-b-lg">
                    <form onSubmit={handleSubmit} className="flex items-center space-x-3">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask a question..."
                            className="flex-1 block w-full rounded-md border-brand-navy-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm"
                            aria-label="Chat input"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !inputValue.trim()}
                            className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-cyan-600 p-2 text-white shadow-sm hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2 disabled:bg-brand-navy-300 disabled:cursor-not-allowed"
                            aria-label="Send message"
                        >
                           {isLoading ? <SpinnerIcon className="h-5 w-5" /> : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086L2.279 16.76a.75.75 0 00.95.826l16-5.333a.75.75 0 000-1.492l-16-5.333z" />
                            </svg>
                           )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default HelpBot;