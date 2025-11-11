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

// Accept multiple variations since speech recognition may mishear
const WAKE_WORDS = ["yo probot", "your probot", "hey probot", "yo robot", "your robot"];
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
  const [isWakeWordEnabled, setIsWakeWordEnabled] = useState(true);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const currentTranscriptRef = useRef('');
  const modeRef = useRef<VoiceMode>('off');
  const onCommandRef = useRef(onCommand);
  const isActiveRef = useRef(false);
  const hasRemovedWakeWordRef = useRef(false);
  const wakeWordEnabledRef = useRef(isWakeWordEnabled);

  const hasSupport = !!(
    typeof window !== 'undefined' && 
    (window.SpeechRecognition || window.webkitSpeechRecognition)
  );

  // Keep refs in sync
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    wakeWordEnabledRef.current = isWakeWordEnabled;
  }, [isWakeWordEnabled]);

  // Initialize speech recognition
  useEffect(() => {
    if (!hasSupport) {
      console.log('⚠️ Voice recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Continuous listening - never stops until user clicks stop
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log(`🎤 Recognition started in ${modeRef.current.toUpperCase()} mode`);
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
      
      // WAKE MODE: Listen for "yo probot" (or variations)
      if (modeRef.current === 'wake') {
        console.log(`🔍 Listening for wake word... heard: "${fullTranscript}"`);

        // Check if any wake word variation is detected
        const detectedWakeWord = WAKE_WORDS.find(word => fullTranscript.includes(word));
        if (detectedWakeWord) {
          console.log(`✅ WAKE WORD DETECTED ("${detectedWakeWord}")! Switching to command mode`);
          
          // Switch to command mode - DON'T stop recognition
          modeRef.current = 'command';
          setMode('command');
          setTranscript('');
          currentTranscriptRef.current = '';
          hasRemovedWakeWordRef.current = false;
          setError(null);
        }
      }
      // COMMAND MODE: Capture the user's command
      else if (modeRef.current === 'command') {
        // Get all new final results from this event
        let newFinalText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            newFinalText += event.results[i][0].transcript + ' ';
          }
        }
        
        // Remove wake word from the first chunk if present and not yet removed
        if (newFinalText.trim() && !hasRemovedWakeWordRef.current) {
          const lowerNewFinal = newFinalText.toLowerCase();
          // Check for any wake word variation
          for (const wakeWord of WAKE_WORDS) {
            if (lowerNewFinal.includes(wakeWord)) {
              const wakeWordIndex = lowerNewFinal.indexOf(wakeWord);
              newFinalText = newFinalText.substring(wakeWordIndex + wakeWord.length).trim() + ' ';
              hasRemovedWakeWordRef.current = true;
              break;
            }
          }
        }
        
        // Accumulate (append) new final text
        if (newFinalText.trim()) {
          currentTranscriptRef.current += newFinalText;
        }
        
        // Update display with accumulated + interim
        const displayText = currentTranscriptRef.current + interimTranscript;
        setTranscript(displayText.trim());
        console.log(`💬 Capturing command: "${displayText.trim()}"`);
        
        // Clear existing silence timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        
        // Set new silence timeout
        silenceTimeoutRef.current = window.setTimeout(() => {
          console.log('⏰ Silence detected - submitting command');
          
          const command = currentTranscriptRef.current.trim();
          if (command) {
            console.log(`✅ Submitting command: "${command}"`);
            onCommandRef.current(command);
          }
          
          // Go back to wake word mode
          console.log('🔄 Going back to wake word mode');
          modeRef.current = 'wake';
          setMode('wake');
          setTranscript('');
          currentTranscriptRef.current = '';
          hasRemovedWakeWordRef.current = false;
        }, COMMAND_SILENCE_TIMEOUT);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('🚨 Speech recognition error:', event.error);
      
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        modeRef.current = 'off';
        setMode('off');
        isActiveRef.current = false;
        setError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (event.error === 'no-speech') {
        console.log('⚠️ No speech detected - continuing to listen');
      } else if (event.error !== 'aborted') {
        console.log(`⚠️ Recognition error: ${event.error} - will auto-restart`);
      }
    };

    recognition.onend = () => {
      console.log(`⏹️ Recognition ended - mode: ${modeRef.current.toUpperCase()}, active: ${isActiveRef.current}`);
      
      // Auto-restart if still active
      if (isActiveRef.current && modeRef.current !== 'off') {
        try {
          console.log('🔄 Auto-restarting recognition...');
          recognition.start();
        } catch (e: any) {
          if (e.name !== 'InvalidStateError') {
            console.error('Error restarting recognition:', e);
          }
        }
      } else {
        console.log('⏸️ Voice recognition stopped');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      console.log('🧹 Cleaning up voice recognition');
      isActiveRef.current = false;
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

    console.log('🎤 Starting voice recognition - listening for "Yo Probot"');

    // Set to active and wake mode
    isActiveRef.current = true;
    const initialMode: VoiceMode = wakeWordEnabledRef.current ? 'wake' : 'command';
    modeRef.current = initialMode;
    setMode(initialMode);
    setTranscript('');
    setError(null);
    currentTranscriptRef.current = '';
    hasRemovedWakeWordRef.current = !wakeWordEnabledRef.current;

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
    console.log('⏹️ Stopping voice recognition');

    // Clear active flag and silence timeout
    isActiveRef.current = false;
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    
    // Set to off mode
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

  const toggleWakeWord = useCallback(() => {
    setIsWakeWordEnabled(prev => {
      const next = !prev;
      wakeWordEnabledRef.current = next;

      if (isActiveRef.current) {
        const nextMode: VoiceMode = next ? 'wake' : 'command';
        modeRef.current = nextMode;
        setMode(nextMode);
        currentTranscriptRef.current = '';
        setTranscript('');
        hasRemovedWakeWordRef.current = !next;
      }

      return next;
    });
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
    isWakeWordEnabled,
    toggleWakeWord,
  };
};
