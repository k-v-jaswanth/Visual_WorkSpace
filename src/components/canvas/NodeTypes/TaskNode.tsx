'use client';
import { TaskNodeData } from '@/types/canvas';

interface Props {
  data: TaskNodeData;
  onUpdate?: (data: TaskNodeData) => void;
}

const PRIORITY_COLORS = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' };
const STATUS_ICONS = { 'todo': '○', 'in-progress': '◑', 'done': '●' };
const STATUS_COLORS = { 'todo': '#6b7280', 'in-progress': '#3b82f6', 'done': '#10b981' };

export default function TaskNode({ data, onUpdate }: Props) {
  const priority = data.priority || 'medium';
  const status = data.status || 'todo';

  function cycleStatus() {
    const statuses: TaskNodeData['status'][] = ['todo', 'in-progress', 'done'];
    const idx = statuses.indexOf(status);
    const next = statuses[(idx + 1) % statuses.length];
    onUpdate?.({ ...data, status: next });
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="node-task-header" style={{ borderLeft: `3px solid ${PRIORITY_COLORS[priority]}` }}>
        <button
          onClick={cycleStatus}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            width: '20px', height: '20px', borderRadius: '50%', background: 'none', border: 'none',
            cursor: 'pointer', color: STATUS_COLORS[status], fontSize: '16px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >{STATUS_ICONS[status]}</button>
        <span className="node-task-title" style={{ textDecoration: status === 'done' ? 'line-through' : 'none', opacity: status === 'done' ? 0.6 : 1 }}>
          {data.title}
        </span>
        <span className="badge" style={{
          background: `${PRIORITY_COLORS[priority]}22`,
          color: PRIORITY_COLORS[priority],
          fontSize: '9px', padding: '1px 5px',
        }}>{priority.toUpperCase()}</span>
      </div>
      <div className="node-task-body">
        {data.assignee && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>👤</span>
            <span>{data.assignee}</span>
          </div>
        )}
        {data.dueDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            <span>📅</span>
            <span>{data.dueDate}</span>
          </div>
        )}
      </div>
    </div>
  );
}
