import React, { useState, useRef } from 'react';
import { useGeminiChat } from '../hooks/useGeminiChat';
import { Customer, Lead, Quote, Job, Invoice, Employee, Equipment, ChatMessage } from '../types';
import SpinnerIcon from './icons/SpinnerIcon';
import ChatIcon from './icons/ChatIcon';
import XIcon from './icons/XIcon';
import ToolIcon from './icons/ToolIcon';
import FunctionCallIcon from './icons/FunctionCallIcon';

interface AppData {
  customers: Customer[];
  leads: Lead[];
  quotes: Quote[];
  jobs: Job[];
  invoices: Invoice[];
  employees: Employee[];
  equipment: Equipment[];
}

const getPageContext = (pathname: string): string => {
  if (pathname.startsWith('/dashboard')) return "The user is on the Dashboard, viewing business KPIs and a live map.";
  if (pathname.startsWith('/ai-core')) return "The user is on the AI Core page, viewing intelligent insights and suggestions.";
  if (pathname.startsWith('/leads')) return "The user is on the Leads page, managing potential customer inquiries.";
  if (pathname.startsWith('/quotes')) return "The user is on the Quotes page, creating and managing price estimates.";
  if (pathname.startsWith('/jobs')) return "The user is on the Jobs page, managing scheduled work.";
  if (pathname.startsWith('/customers')) return "The user is on the Customers page, viewing their client list.";
  if (pathname.startsWith('/invoices')) return "The user is on the Invoices page, managing billing.";
  if (pathname.startsWith('/calendar')) return "The user is on the Calendar page, scheduling jobs.";
  if (pathname.startsWith('/employees')) return "The user is on the Employees page, managing staff.";
  if (pathname.startsWith('/equipment')) return "The user is on the Equipment page, tracking company assets.";
  if (pathname.startsWith('/marketing')) return "The user is on the Marketing page, using AI tools for promotion.";
  if (pathname.startsWith('/settings')) return "The user is on the Settings page, managing their profile, company info, and integrations.";
  if (pathname.startsWith('/chat')) return "The user is on the dedicated Chat page.";
  return "The user is on an unknown page.";
};


const HelpBot: React.FC<{ currentLocation: string; appData: AppData }> = ({ currentLocation, appData }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const pageContext = getPageContext(currentLocation);
    const { messages, inputValue, setInputValue, handleSubmit, isLoading, error, messagesEndRef } = useGeminiChat({
        appData: isOpen ? appData : undefined, // Only pass data when the bot is open to avoid unnecessary processing
        pageContext: pageContext
    });

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-brand-green-600 text-white p-4 rounded-full shadow-lg hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 transition-transform transform hover:scale-110"
                aria-label="Open AI Assistant"
            >
                <ChatIcon className="h-8 w-8" />
            </button>
        );
    }


    return (
        <div className="fixed bottom-6 right-6 z-50">
            <div className="flex flex-col w-96 max-h-[70vh] h-[550px] bg-white rounded-lg shadow-2xl border border-brand-gray-200">
                <header className="flex items-center justify-between p-4 bg-brand-green-700 text-white rounded-t-lg">
                    <h2 className="text-lg font-semibold">AI Assistant</h2>
                    <button onClick={() => setIsOpen(false)} className="hover:bg-brand-green-600 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-white" aria-label="Close chat">
                        <XIcon className="h-6 w-6" />
                    </button>
                </header>
                
                 <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                         <div key={msg.id}>
                            {msg.role === 'user' && (
                                <div className="flex justify-end">
                                    <div className="max-w-xs px-4 py-2 rounded-xl bg-brand-green-600 text-white">
                                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                </div>
                            )}
                            {msg.role === 'model' && (
                                <div className="flex justify-start">
                                    <div className="max-w-xs px-4 py-2 rounded-xl bg-brand-gray-100 text-brand-gray-800">
                                        <p className="text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={{__html: msg.text.replace(/\n/g, '<br />')}}></p>
                                         {msg.sources && msg.sources.length > 0 && (
                                            <div className="mt-3 border-t pt-2">
                                                <h4 className="text-xs font-semibold text-brand-gray-600">Sources:</h4>
                                                <ol className="list-decimal list-inside text-xs space-y-1 mt-1">
                                                    {msg.sources.map(source => (
                                                        <li key={source.uri}><a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-brand-green-700 hover:underline">{source.title}</a></li>
                                                    ))}
                                                </ol>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {msg.role === 'tool' && (
                                <div className="flex justify-center items-center my-4 text-xs text-brand-gray-500">
                                    <div className="flex items-center gap-2 border rounded-full px-3 py-1 bg-brand-gray-50">
                                        {msg.text.includes('Searching the web') ? <ToolIcon className="w-4 h-4" /> : <FunctionCallIcon className="w-4 h-4" />}
                                        <span>{msg.text}</span>
                                        <SpinnerIcon className="w-4 h-4" />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && !messages.some(m => m.isThinking) && (
                         <div className="flex justify-start">
                             <div className="max-w-lg px-4 py-3 rounded-xl bg-brand-gray-100 text-brand-gray-800">
                                <SpinnerIcon className="h-5 w-5 text-brand-gray-500" />
                            </div>
                         </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {error && <div className="p-2 border-t border-brand-gray-200 text-center text-xs text-red-600">{error}</div>}

                <div className="border-t border-brand-gray-200 p-4 bg-white rounded-b-lg">
                    <form onSubmit={handleSubmit} className="flex items-center space-x-3">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask a question..."
                            className="flex-1 block w-full rounded-md border-brand-gray-300 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500 sm:text-sm"
                            aria-label="Chat input"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !inputValue.trim()}
                            className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-green-600 p-2 text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 disabled:bg-brand-gray-300 disabled:cursor-not-allowed"
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