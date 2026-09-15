'use client';
import { useState, useRef } from 'react';

interface Props {
  onSubmit: (text: string) => void;
  onMicToggle: () => void;
  isListening: boolean;
  isThinking: boolean;
  placeholder?: string;
}

export default function AskEchoBar({ onSubmit, onMicToggle, isListening, isThinking, placeholder }: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
      setValue('');
    }
  }

  return (
    <form className="ask-echo-bar" onSubmit={handleSubmit}>
      <div style={{
        width: '24px', height: '24px',
        background: 'linear-gradient(135deg, #6d28d9, #4f46e5)',
        borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', flexShrink: 0,
      }}>✦</div>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={isThinking ? 'Echo is thinking…' : (placeholder || 'Ask Echo…')}
        disabled={isThinking}
        onMouseDown={(e) => e.stopPropagation()}
      />
      {isThinking ? (
        <div className="ai-thinking-dots" style={{ flexShrink: 0 }}>
          <span /><span /><span />
        </div>
      ) : (
        <button
          type="button"
          className={`echo-mic-btn ${isListening ? 'listening' : ''}`}
          onClick={onMicToggle}
          title={isListening ? 'Stop listening' : 'Start listening'}
        >
          {isListening ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
              <rect x="2" y="2" width="3" height="8" rx="1" />
              <rect x="7" y="2" width="3" height="8" rx="1" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
              <rect x="4" y="1" width="4" height="7" rx="2" />
              <path d="M2 6c0 2.2 1.8 4 4 4s4-1.8 4-4" stroke="white" strokeWidth="1.2" fill="none" />
              <line x1="6" y1="10" x2="6" y2="12" stroke="white" strokeWidth="1.2" />
            </svg>
          )}
        </button>
      )}
    </form>
  );
}
