import React, { useEffect } from 'react';
import { useAICore } from '../hooks/useAICore';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import ToolIcon from '../components/icons/ToolIcon';
import FunctionCallIcon from '../components/icons/FunctionCallIcon';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import MicrophoneIcon from '../components/icons/MicrophoneIcon';
import BroadcastIcon from '../components/icons/BroadcastIcon';

const ChatPage: React.FC = () => {
    const { messages, inputValue, setInputValue, handleSubmit, isLoading, error, messagesEndRef, sendMessage } = useAICore({
        pageContext: "The user is on the dedicated full-screen Chat page. They may ask about any aspect of the application."
    });

    const voice = useVoiceRecognition({ onCommand: sendMessage });

    useEffect(() => {
        if (voice.transcript) {
            setInputValue(voice.transcript);
        }
    }, [voice.transcript, setInputValue]);

    const handleMicClick = () => {
        if (voice.isListening) {
            voice.stopListening();
        } else {
            voice.startListening();
        }
    };

    const getPlaceholder = () => {
        if (voice.isAwaitingCommand) return "Listening for command...";
        if (voice.isListening) return "Listening...";
        if (voice.isWakeWordEnabled) return 'Say "Yo, Probot" or ask me to find a customer, summarize jobs, etc...';
        return "Ask me to find a customer, summarize open jobs, or ask a question...";
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-brand-gray-900">AI Assistant</h1>
            <p className="mt-2 text-sm text-brand-gray-700">Your intelligent co-pilot for managing your tree service business. Ask questions, get insights, or tell it to perform tasks.</p>
            
            <div className="mt-6 flex flex-col h-[calc(100vh-16rem)] bg-white rounded-lg shadow-lg border border-brand-gray-200">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id}>
                            {msg.role === 'user' && (
                                <div className="flex justify-end">
                                    <div className="max-w-lg px-4 py-2 rounded-xl bg-brand-cyan-600 text-white">
                                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                </div>
                            )}
                            {msg.role === 'model' && (
                                <div className="flex justify-start">
                                    <div className="max-w-2xl px-4 py-2 rounded-xl bg-brand-gray-100 text-brand-gray-800">
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
                                        {msg.isThinking && <SpinnerIcon className="w-4 h-4" />}
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

                {error && <div className="p-4 border-t border-brand-gray-200 text-center text-sm text-red-600">{error}</div>}

                <div className="border-t border-brand-gray-200 p-4 bg-white rounded-b-lg">
                    <form onSubmit={handleSubmit} className="flex items-center space-x-3">
                         {voice.hasSupport && (
                            <button
                                type="button"
                                onClick={voice.toggleWakeWord}
                                title={voice.isWakeWordEnabled ? 'Disable wake word "Yo, Probot"' : 'Enable wake word "Yo, Probot"'}
                                className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green-500 ${
                                    voice.isWakeWordEnabled ? 'bg-brand-green-100 text-brand-green-600' : 'text-brand-gray-400 hover:bg-brand-gray-100'
                                }`}
                            >
                                <span className="sr-only">{voice.isWakeWordEnabled ? 'Disable wake word' : 'Enable wake word'}</span>
                                <BroadcastIcon className="h-5 w-5" />
                            </button>
                        )}
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={getPlaceholder()}
                            className="flex-1 block w-full rounded-md border-brand-gray-300 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500 sm:text-sm"
                            aria-label="Chat input"
                            disabled={isLoading}
                        />
                         {voice.hasSupport && (
                            <button
                                type="button"
                                onClick={handleMicClick}
                                title={voice.isListening ? 'Stop listening' : 'Start listening with your microphone'}
                                className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green-500 ${
                                    voice.isListening || voice.isAwaitingCommand ? 'bg-red-100 text-red-600 animate-pulse' : 'text-brand-gray-500 hover:bg-brand-gray-100'
                                }`}
                            >
                                <span className="sr-only">{voice.isListening ? 'Stop listening' : 'Start listening'}</span>
                                <MicrophoneIcon className="h-5 w-5" />
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={isLoading || !inputValue.trim()}
                            className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 disabled:bg-brand-gray-300 disabled:cursor-not-allowed"
                        >
                           {isLoading ? <SpinnerIcon className="h-5 w-5" /> : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086L2.279 16.76a.75.75 0 00.95.826l16-5.333a.75.75 0 000-1.492l-16-5.333z" />
                            </svg>
                           )}
                        </button>
                    </form>
                    {voice.error && <p className="text-xs text-red-600 mt-2 text-center">{voice.error}</p>}
                </div>
            </div>
        </div>
    );
};

export default ChatPage;