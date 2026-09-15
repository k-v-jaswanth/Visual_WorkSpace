'use client';
import { TranscriptBlockData } from '@/types/canvas';

interface Props {
  data: TranscriptBlockData;
}

export default function TranscriptBlock({ data }: Props) {
  const time = data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <div className="node-transcript" style={{ height: '100%', padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <div className="node-transcript-speaker">{data.speaker}</div>
        {time && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{time}</div>}
      </div>
      <div className="node-transcript-text">"{data.text}"</div>
    </div>
  );
}
