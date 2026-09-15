'use client';
import { useState, useCallback, useRef } from 'react';
import { TranscriptEntry } from '@/types/ai';
import { generateId } from '@/lib/canvasUtils';

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef<((entry: TranscriptEntry) => void) | null>(null);

  const start = useCallback((speaker: string, onResult: (entry: TranscriptEntry) => void) => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }

    onResultRef.current = onResult;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimTranscript(interim);
      if (final.trim() && onResultRef.current) {
        const entry: TranscriptEntry = {
          id: generateId(),
          text: final.trim(),
          speaker,
          timestamp: Date.now(),
        };
        setTranscript((t) => t + ' ' + final);
        onResultRef.current(entry);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (e: any) => console.warn('Speech error:', e.error);
    recognition.onend = () => {
      // Auto-restart if still meant to be listening
      if (recognitionRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const toggle = useCallback((speaker: string, onResult: (entry: TranscriptEntry) => void) => {
    if (isListening) stop();
    else start(speaker, onResult);
  }, [isListening, start, stop]);

  return { isListening, transcript, interimTranscript, start, stop, toggle };
}
