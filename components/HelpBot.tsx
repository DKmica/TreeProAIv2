import React, { useEffect } from 'react';
import SpinnerIcon from './icons/SpinnerIcon';
import ChatIcon from './icons/ChatIcon';
import XIcon from './icons/XIcon';
import ToolIcon from './icons/ToolIcon';
import FunctionCallIcon from './icons/FunctionCallIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import BroadcastIcon from './icons/BroadcastIcon';

// Forward-declare the types from the hooks to avoid circular dependencies
type UseGeminiChatReturnType = ReturnType<typeof import('../hooks/useGeminiChat').useGeminiChat>;
type UseVoiceRecognitionReturnType = ReturnType<typeof import('../hooks/useVoiceRecognition').useVoiceRecognition>;

interface HelpBotProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  chat: UseGeminiChatReturnType;
  voice: UseVoiceRecognitionReturnType;
}

const HelpBot: React.FC<HelpBotProps> = ({ isOpen, setIsOpen, chat, voice }) => {
    const { messages, inputValue, setInputValue, handleSubmit, isLoading, error, messagesEndRef } = chat;

    useEffect(() => {
        if (voice.transcript) {
            setInputValue(voice.transcript);
        }
    }, [voice.transcript, setInputValue]);

    useEffect(() => {
        if (isOpen && voice.isWakeWordEnabled && voice.hasSupport) {
            console.log("🎤 HelpBot opened - requesting microphone permission and starting wake word listener...");
            voice.startListening();
            setTimeout(() => {
                voice.stopListening();
                voice.startWakeWordListener();
            }, 100);
        }
    }, [isOpen, voice]);

    const handleMicClick = () => {
        if (voice.isListening) {
            voice.stopListening();
        } else {
            voice.startListening();
        }
    };


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

    const getPlaceholder = () => {
        if (voice.isAwaitingCommand) return "Listening for command...";
        if (voice.isListening) return "Listening...";
        if (voice.isWakeWordEnabled) return 'Say "Yo, Probot" or type...';
        return "Ask a question...";
    };


    return (
        <div className="fixed bottom-6 right-6 z-50">
            <div className="flex flex-col w-96 max-h-[70vh] h-[550px] bg-white rounded-lg shadow-2xl border border-brand-gray-200">
                <header className="flex items-center justify-between p-4 bg-brand-green-700 text-white rounded-t-lg">
                    <h2 className="text-lg font-semibold">AI Assistant</h2>
                    <div className="flex items-center gap-2">
                        {voice.hasSupport && (
                            <button
                                onClick={voice.toggleWakeWord}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                    voice.isWakeWordEnabled
                                        ? 'bg-white text-brand-green-700 hover:bg-gray-100'
                                        : 'bg-brand-green-600 text-white hover:bg-brand-green-500'
                                }`}
                                title={voice.isWakeWordEnabled ? 'Wake word "Yo Probot" is ON' : 'Wake word is OFF - click to enable'}
                            >
                                <BroadcastIcon className="h-4 w-4 inline mr-1" />
                                {voice.isWakeWordEnabled ? 'ON' : 'OFF'}
                            </button>
                        )}
                        <button onClick={() => setIsOpen(false)} className="hover:bg-brand-green-600 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-white" aria-label="Close chat">
                            <XIcon className="h-6 w-6" />
                        </button>
                    </div>
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

                {error && <div className="p-2 border-t border-brand-gray-200 text-center text-xs text-red-600">{error}</div>}

                <div className="border-t border-brand-gray-200 p-4 bg-white rounded-b-lg">
                    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                        {voice.hasSupport && (
                            <button
                                type="button"
                                onClick={voice.toggleWakeWord}
                                title={voice.isWakeWordEnabled ? 'Disable wake word "Yo, Probot"' : 'Enable wake word "Yo, Probot"'}
                                className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-green-500 ${
                                    voice.isWakeWordEnabled ? 'bg-brand-green-100 text-brand-green-600' : 'text-brand-gray-400 hover:bg-brand-gray-100'
                                }`}
                                aria-label={voice.isWakeWordEnabled ? 'Disable wake word' : 'Enable wake word'}
                            >
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
                                title={voice.isListening ? 'Stop listening' : 'Start listening'}
                                className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-green-500 ${
                                    voice.isListening || voice.isAwaitingCommand ? 'bg-red-100 text-red-600 animate-pulse' : 'text-brand-gray-500 hover:bg-brand-gray-100'
                                }`}
                                aria-label={voice.isListening ? 'Stop listening' : 'Start listening'}
                            >
                                <MicrophoneIcon className="h-5 w-5" />
                            </button>
                        )}
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
                     {voice.error && <p className="text-xs text-red-600 mt-2">{voice.error}</p>}
                </div>
            </div>
        </div>
    );
};

export default HelpBot;