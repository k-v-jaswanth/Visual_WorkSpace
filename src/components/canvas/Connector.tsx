'use client';
import { CanvasConnector, CanvasNode } from '@/types/canvas';
import { useMemo } from 'react';

interface Props {
  connectors: CanvasConnector[];
  nodes: CanvasNode[];
}

function getNodeCenter(node: CanvasNode) {
  return {
    x: node.position.x + node.size.width / 2,
    y: node.position.y + node.size.height / 2,
  };
}

export default function ConnectorLayer({ connectors, nodes }: Props) {
  const nodeMap = useMemo(() => {
    const m = new Map<string, CanvasNode>();
    nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [nodes]);

  if (connectors.length === 0) return null;

  return (
    <svg
      style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none', zIndex: 0 }}
      width="1"
      height="1"
    >
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="rgba(124,58,237,0.7)" />
        </marker>
      </defs>
      {connectors.map((c) => {
        const from = nodeMap.get(c.fromNodeId);
        const to = nodeMap.get(c.toNodeId);
        if (!from || !to) return null;
        const fp = getNodeCenter(from);
        const tp = getNodeCenter(to);
        // Cubic bezier control points
        const dx = tp.x - fp.x;
        const dy = tp.y - fp.y;
        const cx1 = fp.x + dx * 0.5;
        const cy1 = fp.y;
        const cx2 = tp.x - dx * 0.5;
        const cy2 = tp.y;
        const d = `M ${fp.x} ${fp.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tp.x} ${tp.y}`;
        return (
          <g key={c.id}>
            <path d={d} stroke="rgba(124,58,237,0.15)" strokeWidth="4" fill="none" />
            <path
              d={d}
              stroke={c.color || 'rgba(124,58,237,0.7)'}
              strokeWidth="1.5"
              fill="none"
              strokeDasharray="6 3"
              markerEnd="url(#arrowhead)"
            />
            {c.label && (
              <text
                x={(fp.x + tp.x) / 2}
                y={(fp.y + tp.y) / 2 - 8}
                textAnchor="middle"
                fill="rgba(167,139,250,0.9)"
                fontSize="11"
                fontWeight="600"
                fontFamily="Inter, sans-serif"
              >{c.label}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
