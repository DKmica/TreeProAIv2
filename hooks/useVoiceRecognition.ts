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
  const modeRef = useRef<VoiceMode>('off');
  const onCommandRef = useRef(onCommand);

  const hasSupport = !!(
    typeof window !== 'undefined' && 
    (window.SpeechRecognition || window.webkitSpeechRecognition)
  );

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    if (!hasSupport) {
      console.log('⚠️ Voice recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log(`🎤 Recognition started in ${modeRef.current === 'wake' ? 'WAKE' : 'COMMAND'} mode`);
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
      
      if (modeRef.current === 'wake') {
        console.log(`🔍 Wake word mode - heard: "${fullTranscript}"`);
        
        if (fullTranscript.includes(WAKE_WORD)) {
          console.log('✅ Wake word detected! Switching to command mode...');
          
          modeRef.current = 'command';
          setMode('command');
          setTranscript('');
          currentTranscriptRef.current = '';
          setError(null);
          
          try {
            recognition.stop();
          } catch (e) {
            console.error('Error stopping recognition:', e);
          }
        }
      } else if (modeRef.current === 'command') {
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
            onCommandRef.current(command);
          }
          
          modeRef.current = 'off';
          setMode('off');
          setTranscript('');
          currentTranscriptRef.current = '';
          
          try {
            recognition.stop();
          } catch (e) {
            console.error('Error stopping recognition:', e);
          }
        }, COMMAND_SILENCE_TIMEOUT);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('🚨 Speech recognition error:', event.error);
      
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        modeRef.current = 'off';
        setMode('off');
        setError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (event.error === 'no-speech') {
        console.log('⚠️ No speech detected - continuing to listen');
      } else if (event.error !== 'aborted') {
        modeRef.current = 'off';
        setMode('off');
        setError(`Voice recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log(`⏹️ Recognition ended in ${modeRef.current === 'wake' ? 'WAKE' : modeRef.current === 'command' ? 'COMMAND' : 'OFF'} mode`);
      
      if (modeRef.current === 'command') {
        console.log('🔄 Switching back to wake word mode...');
        modeRef.current = 'wake';
        setMode('wake');
        setTranscript('');
        currentTranscriptRef.current = '';
      }
      
      if (modeRef.current === 'wake' || modeRef.current === 'command') {
        try {
          console.log('🔄 Auto-restarting recognition...');
          recognition.start();
        } catch (e: any) {
          if (e.name !== 'InvalidStateError') {
            console.error('Error restarting recognition:', e);
          }
        }
      } else {
        console.log('⏸️ Mode is OFF - not restarting');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      console.log('🧹 Cleaning up voice recognition');
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      try {
        recognition.abort();
      } catch (e) {
        console.error('Error aborting recognition on cleanup:', e);
      }
    };
  }, [hasSupport]);

  const startListening = useCallback(() => {
    if (!hasSupport || !recognitionRef.current) {
      console.error('❌ Cannot start - no speech recognition support');
      return;
    }

    console.log('🎤 User activated voice recognition - starting wake word mode');
    modeRef.current = 'wake';
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
    
    modeRef.current = 'off';
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
