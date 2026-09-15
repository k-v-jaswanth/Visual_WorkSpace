'use client';
import { TextCardData } from '@/types/canvas';
import { useState, useRef } from 'react';

interface Props {
  data: TextCardData;
  onUpdate?: (data: TextCardData) => void;
}

export default function TextCard({ data, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(data.content || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleDoubleClick() {
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function handleBlur() {
    setEditing(false);
    onUpdate?.({ ...data, content });
  }

  return (
    <div className="node-content node-text" onDoubleClick={handleDoubleClick} style={{ height: '100%' }}>
      {editing ? (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleBlur}
          style={{
            width: '100%', height: '100%', background: 'none', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6', resize: 'none',
            padding: '14px 16px', fontFamily: 'inherit',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        />
      ) : (
        <div style={{ padding: '14px 16px', fontSize: '14px', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {content || <span style={{ color: 'var(--text-muted)' }}>Double-click to edit...</span>}
        </div>
      )}
    </div>
  );
}
