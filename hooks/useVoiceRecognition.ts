import { useState, useEffect, useRef, useCallback } from 'react';

// TypeScript definitions for the Web Speech API for cross-browser compatibility
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
  onaudiostart: (() => void) | null;
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
const WAKE_WORD_STORAGE_KEY = 'treeProAi_wakeWordEnabled';

interface VoiceRecognitionOptions {
  onCommand: (command: string) => void;
  autoSubmitDelay?: number;
  enabled?: boolean;
}


export const useVoiceRecognition = ({ onCommand, autoSubmitDelay = 1200, enabled = true }: VoiceRecognitionOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [isWakeWordEnabled, setIsWakeWordEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(WAKE_WORD_STORAGE_KEY) === 'true';
  });
  const [isAwaitingCommand, setIsAwaitingCommand] = useState(false);
  const [isWakeWordListening, setIsWakeWordListening] = useState(false);

  const commandRecognitionRef = useRef<SpeechRecognition | null>(null);
  const wakeWordRecognitionRef = useRef<SpeechRecognition | null>(null);
  const autoSubmitTimeoutRef = useRef<number | null>(null);
  const commandTranscriptRef = useRef('');
  const isSwitchingModesRef = useRef(false);

  // Ref to hold the latest value of isAwaitingCommand for use in callback closures
  const isAwaitingCommandRef = useRef(isAwaitingCommand);
  useEffect(() => {
    isAwaitingCommandRef.current = isAwaitingCommand;
  }, [isAwaitingCommand]);

  const hasSupport = !!(typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition));

  const startWakeWordListener = useCallback(() => {
    if (hasSupport && isWakeWordEnabled && !isWakeWordListening && !isListening && !isAwaitingCommand && wakeWordRecognitionRef.current && enabled) {
        try {
            wakeWordRecognitionRef.current.start();
            setIsWakeWordListening(true);
        } catch (e: any) {
            if (e.name !== 'InvalidStateError') {
              console.error("Error starting wake word listener:", e);
            }
        }
    }
  }, [hasSupport, isWakeWordEnabled, isWakeWordListening, isListening, isAwaitingCommand, enabled]);

  const startCommandListener = useCallback(() => {
    if (hasSupport && !isListening && commandRecognitionRef.current && enabled) {
        setTranscript('');
        commandTranscriptRef.current = '';
        try {
            commandRecognitionRef.current.start();
            setIsListening(true);
            setError(null);
        } catch (e: any) {
             if (e.name !== 'InvalidStateError') {
                console.error("Error starting command recognition:", e);
                setError("Could not start voice recognition. Please check microphone permissions.");
                setIsAwaitingCommand(false);
                startWakeWordListener();
            }
        }
    }
  }, [hasSupport, isListening, startWakeWordListener, enabled]);


  useEffect(() => {
    if (!hasSupport || !enabled) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    const commandRec = new SpeechRecognition();
    commandRec.continuous = true; 
    commandRec.interimResults = true;
    commandRec.lang = 'en-US';

    commandRec.onresult = (event: SpeechRecognitionEvent) => {
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
      
      const fullTranscript = (finalTranscript + interimTranscript).trim();
      commandTranscriptRef.current = fullTranscript;
      setTranscript(fullTranscript);

      if (autoSubmitTimeoutRef.current) clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = window.setTimeout(() => {
        try { commandRecognitionRef.current?.stop(); } catch (e) { /* ignore */ }
      }, autoSubmitDelay);
    };

    commandRec.onend = () => {
      setIsListening(false);
      if (autoSubmitTimeoutRef.current) clearTimeout(autoSubmitTimeoutRef.current);
      
      const command = commandTranscriptRef.current.trim();
      commandTranscriptRef.current = '';
      setTranscript('');

      if (command) {
        // Case 1: Command successfully captured.
        setIsAwaitingCommand(false); 
        onCommand(command);
        startWakeWordListener(); // Return to wake word mode.
      } else if (isAwaitingCommandRef.current) {
        // Case 2: 'no-speech' timeout, but we should still be awaiting a command.
        // Restart the command listener to give the user another chance.
        startCommandListener();
      } else {
        // Case 3: Ended for another reason (e.g., manual stop) and we were not awaiting a command.
        setIsAwaitingCommand(false); // Ensure it's false.
        startWakeWordListener(); // Safely return to wake word mode.
      }
    };

    commandRec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.error('Command recognition error:', event.error, event.message);
        setError(`Error: ${event.error}. Check mic permissions.`);
      }
    };
    commandRecognitionRef.current = commandRec;

    const wakeWordRec = new SpeechRecognition();
    wakeWordRec.continuous = true;
    wakeWordRec.interimResults = false;
    wakeWordRec.lang = 'en-US';

    wakeWordRec.onresult = (event: SpeechRecognitionEvent) => {
        const lastResult = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        if (lastResult.includes(WAKE_WORD)) {
            console.log("Wake word detected!");
            isSwitchingModesRef.current = true;
            try { wakeWordRecognitionRef.current?.stop(); } catch(e) {/* ignore */}
        }
    };

    wakeWordRec.onend = () => {
      setIsWakeWordListening(false);

      if (isSwitchingModesRef.current) {
        isSwitchingModesRef.current = false;
        setIsAwaitingCommand(true);
        startCommandListener();
      } else if (isWakeWordEnabled && enabled) {
        setTimeout(startWakeWordListener, 100);
      }
    };

    wakeWordRec.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
            console.error('Wake word recognition error:', event.error, event.message);
        }
    };
    wakeWordRecognitionRef.current = wakeWordRec;

    if (isWakeWordEnabled && enabled) {
      startWakeWordListener();
    }

    return () => {
        commandRec.onend = null;
        wakeWordRec.onend = null;
        try { commandRec.abort(); } catch (e) {/*ignore*/}
        try { wakeWordRec.abort(); } catch (e) {/*ignore*/}
    };
  }, [hasSupport, isWakeWordEnabled, enabled, onCommand, startCommandListener, startWakeWordListener, autoSubmitDelay]);


  const manualStartListening = useCallback(() => {
    isSwitchingModesRef.current = false;
    try { wakeWordRecognitionRef.current?.stop(); } catch(e) {/*ignore*/}
    setIsAwaitingCommand(false);
    startCommandListener();
  }, [startCommandListener]);
  
  const manualStopListening = useCallback(() => {
    setIsAwaitingCommand(false); // Manually stopping should cancel the "awaiting" state.
    try { commandRecognitionRef.current?.stop(); } catch(e) {/*ignore*/}
  }, []);

  const toggleWakeWord = useCallback(() => {
    const newValue = !isWakeWordEnabled;
    setIsWakeWordEnabled(newValue);
    localStorage.setItem(WAKE_WORD_STORAGE_KEY, String(newValue));
    
    isSwitchingModesRef.current = false;
    try { wakeWordRecognitionRef.current?.stop(); } catch(e) {/*ignore*/}
    try { commandRecognitionRef.current?.stop(); } catch(e) {/*ignore*/}
    setIsAwaitingCommand(false);

    if (newValue && enabled) {
      startWakeWordListener();
    }
  }, [isWakeWordEnabled, enabled, startWakeWordListener]);

  return {
    isListening,
    transcript,
    error,
    startListening: manualStartListening,
    stopListening: manualStopListening,
    hasSupport,
    isWakeWordEnabled,
    toggleWakeWord,
    isAwaitingCommand,
  };
};
