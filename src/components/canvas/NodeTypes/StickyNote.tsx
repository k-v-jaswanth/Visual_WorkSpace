'use client';
import { StickyNoteData } from '@/types/canvas';
import { useState, useRef } from 'react';

interface Props {
  data: StickyNoteData;
  onUpdate?: (data: StickyNoteData) => void;
}

const STICKY_COLORS = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c'];

export default function StickyNote({ data, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(data.content || '');
  const [color, setColor] = useState(data.color || '#fbbf24');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleDoubleClick() {
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function handleBlur() {
    setEditing(false);
    onUpdate?.({ content, color });
  }

  return (
    <div
      className="node-sticky"
      style={{ background: color, height: '100%', borderRadius: 'var(--radius-lg)', padding: '16px', position: 'relative' }}
      onDoubleClick={handleDoubleClick}
    >
      {editing ? (
        <>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
            {STICKY_COLORS.map((c) => (
              <button
                key={c}
                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setColor(c); onUpdate?.({ content, color: c }); }}
                style={{
                  width: '16px', height: '16px', borderRadius: '50%', background: c,
                  border: c === color ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer',
                }}
              />
            ))}
          </div>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleBlur}
            style={{
              width: '100%', height: 'calc(100% - 30px)', background: 'none', border: 'none', outline: 'none',
              color: '#1a1a1a', fontSize: '14px', lineHeight: '1.5', resize: 'none', fontFamily: 'inherit',
            }}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </>
      ) : (
        <div style={{ fontSize: '14px', lineHeight: '1.5', color: '#1a1a1a', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {content || <span style={{ opacity: 0.5 }}>Double-click to edit...</span>}
        </div>
      )}
      {/* Fold corner */}
      <div style={{
        position: 'absolute', bottom: 0, right: 0,
        width: 0, height: 0,
        borderLeft: '18px solid transparent',
        borderBottom: `18px solid rgba(0,0,0,0.15)`,
      }} />
    </div>
  );
}
