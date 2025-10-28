import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechGrammarList;
  resultIndex: number;
}

interface SpeechGrammarList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: { new (): SpeechRecognition };
    webkitSpeechRecognition: { new (): SpeechRecognition };
  }
}

const WAKE_WORD = "yo probot";
const COMMAND_SILENCE_TIMEOUT = 1500;

type VoiceMode = 'off' | 'wake' | 'command';

interface VoiceRecognitionOptions {
  onCommand: (command: string) => void;
  enabled?: boolean;
}

export const useVoiceRecognition = ({ onCommand, enabled = true }: VoiceRecognitionOptions) => {
  const [mode, setMode] = useState<VoiceMode>('off');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const currentTranscriptRef = useRef('');

  const hasSupport = !!(
    typeof window !== 'undefined' && 
    (window.SpeechRecognition || window.webkitSpeechRecognition)
  );

  useEffect(() => {
    if (!hasSupport || !enabled) {
      console.log('⚠️ Voice recognition not supported or disabled');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log(`🎤 Recognition started in ${mode === 'wake' ? 'WAKE' : 'COMMAND'} mode`);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      
      const fullTranscript = (finalTranscript + interimTranscript).trim().toLowerCase();
      currentTranscriptRef.current = fullTranscript;
      
      if (mode === 'wake') {
        console.log(`🔍 Wake word mode - heard: "${fullTranscript}"`);
        
        if (fullTranscript.includes(WAKE_WORD)) {
          console.log('✅ Wake word detected! Switching to command mode...');
          
          try {
            recognition.stop();
          } catch (e) {
            console.error('Error stopping recognition:', e);
          }
          
          setMode('command');
          setTranscript('');
          currentTranscriptRef.current = '';
          setError(null);
        }
      } else if (mode === 'command') {
        const displayTranscript = finalTranscript || interimTranscript;
        setTranscript(displayTranscript);
        console.log(`💬 Command mode - transcript: "${displayTranscript}"`);
        
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        
        silenceTimeoutRef.current = window.setTimeout(() => {
          console.log('⏰ Silence timeout - submitting command');
          
          const command = currentTranscriptRef.current.trim();
          if (command) {
            console.log(`✅ Submitting command: "${command}"`);
            onCommand(command);
          }
          
          try {
            recognition.stop();
          } catch (e) {
            console.error('Error stopping recognition:', e);
          }
          
          setMode('off');
          setTranscript('');
          currentTranscriptRef.current = '';
        }, COMMAND_SILENCE_TIMEOUT);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('🚨 Speech recognition error:', event.error);
      
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone access denied. Please allow microphone access in your browser settings.');
        setMode('off');
      } else if (event.error === 'no-speech') {
        console.log('⚠️ No speech detected - continuing to listen');
      } else if (event.error !== 'aborted') {
        setError(`Voice recognition error: ${event.error}`);
        setMode('off');
      }
    };

    recognition.onend = () => {
      console.log(`⏹️ Recognition ended in ${mode === 'wake' ? 'WAKE' : 'COMMAND'} mode`);
      
      if (mode === 'command') {
        console.log('🔄 Restarting in wake word mode...');
        setMode('wake');
        setTranscript('');
        currentTranscriptRef.current = '';
      }
      
      if (mode === 'wake' || mode === 'command') {
        try {
          console.log('🔄 Auto-restarting recognition...');
          recognition.start();
        } catch (e: any) {
          if (e.name !== 'InvalidStateError') {
            console.error('Error restarting recognition:', e);
          }
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      console.log('🧹 Cleaning up voice recognition');
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      try {
        recognition.stop();
      } catch (e) {
        console.error('Error stopping recognition on cleanup:', e);
      }
    };
  }, [hasSupport, enabled, mode, onCommand]);

  const startListening = useCallback(() => {
    if (!hasSupport || !recognitionRef.current) {
      console.error('❌ Cannot start - no speech recognition support');
      return;
    }

    console.log('🎤 User activated voice recognition - starting wake word mode');
    setMode('wake');
    setTranscript('');
    setError(null);
    currentTranscriptRef.current = '';

    try {
      recognitionRef.current.start();
    } catch (e: any) {
      if (e.name !== 'InvalidStateError') {
        console.error('❌ Error starting recognition:', e);
        setError('Failed to start voice recognition. Please try again.');
      }
    }
  }, [hasSupport]);

  const stopListening = useCallback(() => {
    console.log('⏹️ User stopped voice recognition');
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    
    setMode('off');
    setTranscript('');
    currentTranscriptRef.current = '';
    
    try {
      recognitionRef.current?.stop();
    } catch (e) {
      console.error('Error stopping recognition:', e);
    }
  }, []);

  return {
    mode,
    transcript,
    error,
    hasSupport,
    isListening: mode !== 'off',
    isWakeWordListening: mode === 'wake',
    isAwaitingCommand: mode === 'command',
    startListening,
    stopListening,
  };
};
