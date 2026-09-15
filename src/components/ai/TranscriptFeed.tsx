'use client';
import { useRef, useEffect } from 'react';
import { TranscriptEntry } from '@/types/ai';

interface Props {
  entries: TranscriptEntry[];
  interimText?: string;
  speakerName?: string;
}

export default function TranscriptFeed({ entries, interimText, speakerName }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length, interimText]);

  if (entries.length === 0 && !interimText) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '24px 0' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎙️</div>
        <div>Transcript will appear here</div>
        <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>Enable mic to start</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {entries.map((entry) => {
        const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return (
          <div key={entry.id} className="transcript-entry">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div className="transcript-speaker">{entry.speaker}</div>
              <div className="transcript-time">{time}</div>
            </div>
            <div className="transcript-text">{entry.text}</div>
          </div>
        );
      })}
      {interimText && (
        <div className="transcript-entry" style={{ opacity: 0.6, borderStyle: 'dashed' }}>
          <div className="transcript-speaker">{speakerName}</div>
          <div className="transcript-text" style={{ fontStyle: 'italic' }}>{interimText}…</div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
