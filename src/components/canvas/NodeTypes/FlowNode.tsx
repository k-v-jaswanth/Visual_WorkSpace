'use client';
import { FlowNodeData } from '@/types/canvas';

interface Props {
  data: FlowNodeData;
  onUpdate?: (data: FlowNodeData) => void;
}

const STATUS_COLORS = {
  pending: '#6b7280',
  active: '#3b82f6',
  done: '#10b981',
};

const SHAPES: Record<string, React.CSSProperties> = {
  rect: { borderRadius: '8px' },
  diamond: { transform: 'rotate(45deg)', borderRadius: '4px' },
  oval: { borderRadius: '999px' },
  parallelogram: { transform: 'skewX(-15deg)', borderRadius: '6px' },
};

export default function FlowNode({ data, onUpdate }: Props) {
  const shape = data.shape || 'rect';
  const status = data.status || 'pending';
  const statusColor = STATUS_COLORS[status];

  return (
    <div className="node-flow" style={{ height: '100%', padding: '0 4px' }}>
      <div
        style={{
          ...SHAPES[shape],
          background: `linear-gradient(135deg, ${statusColor}22, ${statusColor}11)`,
          border: `2px solid ${statusColor}44`,
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '8px',
          position: 'relative',
        }}
      >
        <div style={{ transform: shape === 'diamond' ? 'rotate(-45deg)' : shape === 'parallelogram' ? 'skewX(15deg)' : 'none' }}>
          <div className="node-flow-title">{data.title}</div>
          {data.description && <div className="node-flow-desc">{data.description}</div>}
        </div>
        {/* Status dot */}
        <div style={{
          position: 'absolute', top: '6px', right: '6px',
          width: '8px', height: '8px', borderRadius: '50%', background: statusColor,
          transform: shape === 'diamond' ? 'rotate(-45deg)' : 'none',
        }} />
      </div>
    </div>
  );
}
