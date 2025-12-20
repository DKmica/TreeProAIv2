import React, { useState, useRef, useEffect } from 'react';
import { PortalMessage } from '../types';
import SpinnerIcon from './icons/SpinnerIcon';

interface PortalMessagingProps {
  messages: PortalMessage[];
  onSendMessage: (text: string) => void;
  senderType: 'customer' | 'company';
  isLoading?: boolean;
}

const PortalMessaging: React.FC<PortalMessagingProps> = ({ messages, onSendMessage, senderType, isLoading }) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    onSendMessage(newMessage);
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-lg font-semibold text-brand-gray-800 mb-4 px-6 pt-4">Notes &amp; Messages</h3>
      <div className="flex-1 overflow-y-auto px-6 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === senderType ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl ${msg.sender === senderType ? 'bg-brand-cyan-600 text-white' : 'bg-brand-gray-100 text-brand-gray-800'}`}>
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              <p className={`text-xs mt-1 opacity-70 ${msg.sender === senderType ? 'text-right' : 'text-left'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-brand-gray-200 mt-4">
        <form onSubmit={handleSubmit} className="flex items-center space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 block w-full px-3 py-2 rounded-md border border-brand-gray-600 bg-brand-gray-800 text-white shadow-sm placeholder:text-gray-400 focus:border-brand-cyan-500 focus:ring-1 focus:ring-brand-cyan-500 sm:text-sm"
            aria-label="New message"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !newMessage.trim()}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 disabled:bg-brand-gray-300 disabled:cursor-not-allowed"
          >
            {isLoading ? <SpinnerIcon className="h-5 w-5" /> : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PortalMessaging;
