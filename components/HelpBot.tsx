import React, { useEffect, useState, useRef } from 'react';
import SpinnerIcon from './icons/SpinnerIcon';
import ChatIcon from './icons/ChatIcon';
import XIcon from './icons/XIcon';
import ToolIcon from './icons/ToolIcon';
import FunctionCallIcon from './icons/FunctionCallIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import BroadcastIcon from './icons/BroadcastIcon';

type UseAICoreReturnType = ReturnType<typeof import('../hooks/useAICore').useAICore>;
type UseVoiceRecognitionReturnType = ReturnType<typeof import('../hooks/useVoiceRecognition').useVoiceRecognition>;

interface HelpBotProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  chat: UseAICoreReturnType;
  voice: UseVoiceRecognitionReturnType;
}

const WIDGET_WIDTH = 384;
const WIDGET_HEIGHT = 550;

const HelpBot: React.FC<HelpBotProps> = ({ isOpen, setIsOpen, chat, voice }) => {
    const { messages, inputValue, setInputValue, handleSubmit, isLoading, error, messagesEndRef } = chat;

    const clampPosition = (x: number, y: number) => {
        const clampedX = Math.max(0, Math.min(x, window.innerWidth - WIDGET_WIDTH));
        const clampedY = Math.max(0, Math.min(y, window.innerHeight - WIDGET_HEIGHT));
        return { x: clampedX, y: clampedY };
    };

    const getDefaultPosition = () => {
        return clampPosition(window.innerWidth - 420, window.innerHeight - 620);
    };

    const [position, setPosition] = useState(getDefaultPosition());
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const positionRef = useRef(position);

    useEffect(() => {
        positionRef.current = position;
    }, [position]);

    useEffect(() => {
        const saved = localStorage.getItem('probot-position');
        if (saved) {
            try {
                const savedPos = JSON.parse(saved);
                setPosition(clampPosition(savedPos.x, savedPos.y));
            } catch (e) {
                console.error('Failed to parse saved position:', e);
            }
        }
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setPosition(prev => clampPosition(prev.x, prev.y));
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!isDragging) return;

        const handleMove = (e: MouseEvent) => {
            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;
            setPosition(clampPosition(newX, newY));
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            localStorage.setItem('probot-position', JSON.stringify(positionRef.current));
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        
        setIsDragging(true);
        setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    useEffect(() => {
        if (voice.transcript && voice.isAwaitingCommand) {
            setInputValue(voice.transcript);
        }
    }, [voice.transcript, voice.isAwaitingCommand, setInputValue]);


    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-brand-cyan-600 text-white p-4 rounded-full shadow-lg hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 transition-transform transform hover:scale-110"
                aria-label="Open AI Assistant"
            >
                <ChatIcon className="h-8 w-8" />
            </button>
        );
    }

    const getPlaceholder = () => {
        if (voice.isAwaitingCommand) return "🎤 Listening for command...";
        if (voice.isWakeWordListening) return '🔍 Listening for "Yo Probot"...';
        return "Ask a question or click mic to start voice...";
    };


    return (
        <div 
            className="fixed z-50"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`
            }}
        >
            <div className="flex flex-col w-96 max-h-[70vh] h-[550px] bg-white rounded-lg shadow-2xl border border-brand-gray-200">
                <header 
                    className="flex items-center justify-between p-4 bg-brand-green-700 text-white rounded-t-lg cursor-move"
                    onMouseDown={handleMouseDown}
                >
                    <h2 className="text-lg font-semibold">ProBot AI Assistant</h2>
                    <div className="flex items-center gap-2">
                        {voice.hasSupport && voice.isListening && (
                            <span className={`px-3 py-1 rounded text-xs font-medium ${
                                voice.isAwaitingCommand
                                    ? 'bg-red-100 text-red-700 animate-pulse'
                                    : 'bg-green-100 text-green-700'
                            }`}>
                                {voice.isAwaitingCommand ? '🎤 Command' : '🔍 Wake Word'}
                            </span>
                        )}
                        <button onClick={() => setIsOpen(false)} className="hover:bg-brand-cyan-600 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-white" aria-label="Close chat">
                            <XIcon className="h-6 w-6" />
                        </button>
                    </div>
                </header>
                
                 <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {voice.error && (
                        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
                            <p className="font-semibold">⚠️ Microphone Error:</p>
                            <p>{voice.error}</p>
                            <button 
                                onClick={() => voice.startListening()}
                                className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                            >
                                Grant Microphone Access
                            </button>
                        </div>
                    )}
                    {voice.hasSupport && !voice.isListening && !voice.error && (
                        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded text-sm">
                            <p className="font-semibold">🎤 Voice Control Available</p>
                            <p className="mb-2">Click the microphone button to start voice recognition:</p>
                            <ol className="text-xs list-decimal list-inside space-y-1 mb-3">
                                <li>Say <strong>"Yo Probot"</strong> to activate</li>
                                <li>Speak your command or question</li>
                                <li>ProBot will respond automatically</li>
                            </ol>
                            <button
                                onClick={() => voice.startListening()}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium w-full"
                            >
                                🎤 Start Voice Recognition
                            </button>
                        </div>
                    )}
                    {voice.isWakeWordListening && (
                        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded text-sm">
                            <p className="font-semibold">🔍 Listening for "Yo Probot"</p>
                            <p>Say the wake word to activate command mode.</p>
                        </div>
                    )}
                    {voice.isAwaitingCommand && (
                        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded text-sm animate-pulse">
                            <p className="font-semibold">🎤 Listening for Your Command</p>
                            <p>Speak now... {voice.transcript && <span className="font-mono">"{voice.transcript}"</span>}</p>
                        </div>
                    )}
                    {messages.map((msg) => (
                         <div key={msg.id}>
                            {msg.role === 'user' && (
                                <div className="flex justify-end">
                                    <div className="max-w-xs px-4 py-2 rounded-xl bg-brand-cyan-600 text-white">
                                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                </div>
                            )}
                            {msg.role === 'model' && (
                                <div className="flex justify-start">
                                    <div className="max-w-xs px-4 py-2 rounded-xl bg-brand-gray-100 text-brand-gray-800">
                                        <div className="text-sm prose prose-sm" dangerouslySetInnerHTML={{
                                            __html: msg.text
                                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                .replace(/\n/g, '<br />')
                                        }}></div>
                                    </div>
                                </div>
                            )}
                            {msg.role === 'tool' && (
                                <div className="flex justify-center items-center my-2 text-xs text-brand-gray-600">
                                    <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-brand-gray-50">
                                        <FunctionCallIcon className="w-4 h-4 text-brand-cyan-600" />
                                        <div className="font-mono text-xs whitespace-pre-wrap">{msg.text}</div>
                                        {msg.isThinking && <SpinnerIcon className="w-4 h-4 text-brand-cyan-600" />}
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
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={getPlaceholder()}
                            className="flex-1 block w-full rounded-md border border-brand-gray-300 text-gray-900 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500 sm:text-sm"
                            aria-label="Chat input"
                            disabled={isLoading}
                        />
                        {voice.hasSupport && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (voice.isListening) {
                                        voice.stopListening();
                                    } else {
                                        voice.startListening();
                                    }
                                }}
                                title={voice.isListening ? 'Stop voice recognition' : 'Start voice recognition'}
                                className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-green-500 ${
                                    voice.isAwaitingCommand 
                                        ? 'bg-red-100 text-red-600 animate-pulse' 
                                        : voice.isWakeWordListening
                                        ? 'bg-green-100 text-green-600'
                                        : 'text-brand-gray-500 hover:bg-brand-gray-100'
                                }`}
                                aria-label={voice.isListening ? 'Stop listening' : 'Start listening'}
                            >
                                <MicrophoneIcon className="h-5 w-5" />
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={isLoading || !inputValue.trim()}
                            className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-cyan-600 p-2 text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 disabled:bg-brand-gray-300 disabled:cursor-not-allowed"
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