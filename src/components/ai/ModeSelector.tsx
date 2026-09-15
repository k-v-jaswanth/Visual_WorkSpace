'use client';
import { RoomMode } from '@/types/room';

interface Props {
  mode: RoomMode;
  onChange: (mode: RoomMode) => void;
}

const MODES: { id: RoomMode; label: string; icon: string; desc: string }[] = [
  { id: 'brainstorm', label: 'Brainstorm', icon: '🧠', desc: 'Ideas & creativity' },
  { id: 'operations', label: 'Operations', icon: '⚡', desc: 'Tasks & decisions' },
  { id: 'teaching', label: 'Teaching', icon: '📚', desc: 'Topics & hierarchy' },
  { id: 'free', label: 'Free', icon: '✨', desc: 'Open canvas' },
];

export default function ModeSelector({ mode, onChange }: Props) {
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Echo Mode</div>
      <div className="mode-selector" style={{ padding: 0 }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            id={`mode-${m.id}`}
            className={`mode-btn ${mode === m.id ? 'active' : ''}`}
            onClick={() => onChange(m.id)}
            title={m.desc}
          >
            <span style={{ marginRight: '4px' }}>{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
