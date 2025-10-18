import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { ChatMessage } from '../types';
import SpinnerIcon from '../components/icons/SpinnerIcon';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const ChatPage: React.FC = () => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const initChat = () => {
            const chatSession = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: 'You are a friendly and helpful assistant for TreePro AI, a software platform for tree service businesses. Your role is to help users manage their business operations efficiently. You can answer questions about leads, quotes, jobs, scheduling, and invoicing within the context of the app.',
                },
            });
            setChat(chatSession);
            setMessages([
                { role: 'model', text: 'Hello! I am your TreePro AI assistant. How can I help you manage your business today?' }
            ]);
        };
        initChat();
    }, []);

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
        
        // Add a placeholder for the model's response
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

    return (
        <div>
            <h1 className="text-2xl font-bold text-brand-gray-900">AI Assistant</h1>
            <p className="mt-2 text-sm text-brand-gray-700">Ask questions and get help managing your business.</p>
            
            <div className="mt-6 flex flex-col h-[calc(100vh-14rem)] bg-white rounded-lg shadow-lg border border-brand-gray-200">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-lg px-4 py-2 rounded-xl ${msg.role === 'user' ? 'bg-brand-green-600 text-white' : 'bg-brand-gray-200 text-brand-gray-800'}`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.role === 'model' && (
                         <div className="flex justify-start">
                             <div className="max-w-lg px-4 py-2 rounded-xl bg-brand-gray-200 text-brand-gray-800">
                                <SpinnerIcon className="h-5 w-5 text-brand-gray-500" />
                            </div>
                         </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {error && <div className="p-4 border-t border-brand-gray-200 text-center text-sm text-red-600">{error}</div>}

                <div className="border-t border-brand-gray-200 p-4 bg-white rounded-b-lg">
                    <form onSubmit={handleSubmit} className="flex items-center space-x-3">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask about creating a quote, scheduling a job, etc..."
                            className="flex-1 block w-full rounded-md border-brand-gray-300 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500 sm:text-sm"
                            aria-label="Chat input"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !inputValue.trim()}
                            className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 disabled:bg-brand-gray-300 disabled:cursor-not-allowed"
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

export default ChatPage;
