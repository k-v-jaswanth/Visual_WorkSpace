'use client';
import { CanvasNode, CanvasConnector, Viewport } from '@/types/canvas';
import { useMemo } from 'react';

interface Props {
  nodes: CanvasNode[];
  connectors: CanvasConnector[];
  viewport: Viewport;
  containerWidth: number;
  containerHeight: number;
  onViewportClick?: (pos: { x: number; y: number }) => void;
}

const MINIMAP_W = 160;
const MINIMAP_H = 100;

export default function MiniMap({ nodes, connectors, viewport, containerWidth, containerHeight, onViewportClick }: Props) {
  const { canvasBounds, nodeEls, vpStyle } = useMemo(() => {
    // Find the bounding box of all nodes
    let minX = 0, minY = 0, maxX = 2000, maxY = 1500;
    if (nodes.length > 0) {
      minX = Math.min(...nodes.map((n) => n.position.x)) - 100;
      minY = Math.min(...nodes.map((n) => n.position.y)) - 100;
      maxX = Math.max(...nodes.map((n) => n.position.x + n.size.width)) + 100;
      maxY = Math.max(...nodes.map((n) => n.position.y + n.size.height)) + 100;
    }
    const worldW = maxX - minX;
    const worldH = maxY - minY;
    const scaleX = MINIMAP_W / worldW;
    const scaleY = MINIMAP_H / worldH;

    const nodeEls = nodes.map((n) => ({
      id: n.id,
      x: (n.position.x - minX) * scaleX,
      y: (n.position.y - minY) * scaleY,
      w: Math.max(4, n.size.width * scaleX),
      h: Math.max(3, n.size.height * scaleY),
      color: n.color || '#6d28d9',
    }));

    // Viewport rect in world space
    const vpWorldX = -viewport.x / viewport.scale;
    const vpWorldY = -viewport.y / viewport.scale;
    const vpWorldW = containerWidth / viewport.scale;
    const vpWorldH = containerHeight / viewport.scale;

    const vpStyle = {
      left: (vpWorldX - minX) * scaleX,
      top: (vpWorldY - minY) * scaleY,
      width: vpWorldW * scaleX,
      height: vpWorldH * scaleY,
    };

    return { canvasBounds: { minX, minY, maxX, maxY }, nodeEls, vpStyle, scaleX, scaleY };
  }, [nodes, viewport, containerWidth, containerHeight]);

  return (
    <div className="minimap" title="Canvas overview">
      <div style={{ position: 'absolute', top: '4px', left: '6px', fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Map
      </div>
      {nodeEls.map((n) => (
        <div
          key={n.id}
          className="minimap-node"
          style={{ left: n.x, top: n.y, width: n.w, height: n.h, background: `${n.color}88` }}
        />
      ))}
      <div
        className="minimap-viewport"
        style={{
          left: vpStyle.left,
          top: vpStyle.top,
          width: Math.max(10, vpStyle.width),
          height: Math.max(8, vpStyle.height),
        }}
      />
    </div>
  );
}
