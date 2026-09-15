'use client';
import { ImageNodeData } from '@/types/canvas';
import { useState } from 'react';

interface Props {
  data: ImageNodeData;
  onUpdate?: (data: ImageNodeData) => void;
}

export default function ImageNode({ data, onUpdate }: Props) {
  const [imgError, setImgError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>(data.aiGenerated ? 'cover' : 'contain');

  if (!data.src || imgError) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🖼️</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{data.alt || 'Image'}</div>
        {data.aiGenerated && (
          <div style={{ fontSize: '10px', color: 'var(--accent-purple-light)', marginTop: '4px' }}>AI Generated</div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%', height: '100%', position: 'relative',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        background: '#f8fafc', border: '1px solid var(--border-subtle)',
      }}
      title="Double click to toggle fit mode"
      onDoubleClick={() => setFitMode((m) => (m === 'contain' ? 'cover' : 'contain'))}
    >
      {loading && (
        <div className="skeleton" style={{ position: 'absolute', inset: 0 }} />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={data.src}
        alt={data.alt || ''}
        onLoad={() => setLoading(false)}
        onError={() => { setImgError(true); setLoading(false); }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: fitMode,
          display: loading ? 'none' : 'block',
        }}
      />
      {data.caption && (
        <div className="image-caption">{data.caption}</div>
      )}
      {data.aiGenerated && (
        <div style={{
          position: 'absolute', top: '8px', left: '8px',
          background: 'rgba(109,40,217,0.85)', color: '#fff',
          fontSize: '10px', fontWeight: 700, padding: '2px 6px',
          borderRadius: 'var(--radius-sm)', backdropFilter: 'blur(4px)',
        }}>✦ AI</div>
      )}
    </div>
  );
}
