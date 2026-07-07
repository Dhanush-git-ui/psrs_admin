import { useState, useEffect } from 'react';

export const useVoiceCommand = (onCommandRecognized: (command: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';

        rec.onstart = () => setIsListening(true);
        rec.onend = () => setIsListening(false);
        rec.onresult = (event: any) => {
          const commandText = event.results[0][0].transcript;
          onCommandRecognized(commandText);
        };

        setRecognition(rec);
      }
    }
  }, [onCommandRecognized]);

  const startListening = () => {
    if (recognition) recognition.start();
  };

  const stopListening = () => {
    if (recognition) recognition.stop();
  };

  return { isListening, startListening, stopListening, hasSupport: !!recognition };
};