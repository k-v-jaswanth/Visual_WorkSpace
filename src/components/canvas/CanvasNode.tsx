'use client';
import type { CanvasNode as CanvasNodeType } from '@/types/canvas';
import TextCard from './NodeTypes/TextCard';
import StickyNote from './NodeTypes/StickyNote';
import ImageNode from './NodeTypes/ImageNode';
import FlowNode from './NodeTypes/FlowNode';
import MindMapNode from './NodeTypes/MindMapNode';
import TaskNode from './NodeTypes/TaskNode';
import TranscriptBlock from './NodeTypes/TranscriptBlock';
import { useRef } from 'react';

interface Props {
  node: CanvasNodeType;
  selected: boolean;
  scale: number;
  onSelect: (id: string) => void;
  onUpdate: (update: Partial<CanvasNodeType> & { id: string }) => void;
  onDelete: (id: string) => void;
}

export default function CanvasNode({ node, selected, scale, onSelect, onUpdate, onDelete }: Props) {
  if (node.type === 'drawing') return null;
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, startNodeX: 0, startNodeY: 0 });
  const resizeRef = useRef({ isResizing: false, startX: 0, startY: 0, startW: 0, startH: 0 });

  function handleMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('.no-drag, button, input, textarea')) return;
    e.stopPropagation();
    onSelect(node.id);
    const drag = dragRef.current;
    drag.isDragging = true;
    drag.startX = e.clientX;
    drag.startY = e.clientY;
    drag.startNodeX = node.position.x;
    drag.startNodeY = node.position.y;

    function onMove(ev: MouseEvent) {
      if (!drag.isDragging) return;
      const dx = (ev.clientX - drag.startX) / scale;
      const dy = (ev.clientY - drag.startY) / scale;
      onUpdate({ id: node.id, position: { x: drag.startNodeX + dx, y: drag.startNodeY + dy } });
    }
    function onUp() {
      drag.isDragging = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function handleResizeMouseDown(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const r = resizeRef.current;
    r.isResizing = true;
    r.startX = e.clientX;
    r.startY = e.clientY;
    r.startW = node.size.width;
    r.startH = node.size.height;

    function onMove(ev: MouseEvent) {
      if (!r.isResizing) return;
      const dx = (ev.clientX - r.startX) / scale;
      const dy = (ev.clientY - r.startY) / scale;
      onUpdate({
        id: node.id,
        size: { width: Math.max(120, r.startW + dx), height: Math.max(60, r.startH + dy) },
      });
    }
    function onUp() {
      r.isResizing = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function renderContent() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = node.data as any;
    switch (node.type) {
      case 'text':
        return <TextCard data={d} onUpdate={(data) => onUpdate({ id: node.id, data: data as unknown as Record<string, unknown> })} />;
      case 'sticky':
        return <StickyNote data={d} onUpdate={(data) => onUpdate({ id: node.id, data: data as unknown as Record<string, unknown> })} />;
      case 'image':
        return <ImageNode data={d} />;
      case 'flow':
        return <FlowNode data={d} onUpdate={(data) => onUpdate({ id: node.id, data: data as unknown as Record<string, unknown> })} />;
      case 'mindmap':
        return <MindMapNode data={d} />;
      case 'task':
        return <TaskNode data={d} onUpdate={(data) => onUpdate({ id: node.id, data: data as unknown as Record<string, unknown> })} />;
      case 'transcript':
        return <TranscriptBlock data={d} />;
      default:
        return <div style={{ padding: '12px', color: 'var(--text-muted)' }}>Unknown node</div>;
    }
  }

  const isSticky = node.type === 'sticky';
  const bg = isSticky ? 'transparent' : (node.color ? `${node.color}11` : 'var(--bg-secondary)');
  const border = isSticky ? 'none' : `1px solid ${node.color ? `${node.color}33` : 'var(--border-subtle)'}`;

  return (
    <div
      className={`canvas-node-wrapper ${selected ? 'selected' : ''}`}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: node.size.width,
        height: node.size.height,
        zIndex: selected ? 100 : (node.zIndex || 1),
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        className="canvas-node"
        style={{
          width: '100%',
          height: '100%',
          background: bg,
          border,
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        {renderContent()}
      </div>

      {/* Delete button */}
      {selected && (
        <button
          className="node-delete-btn"
          onMouseDown={(e) => { e.stopPropagation(); onDelete(node.id); }}
          title="Delete node"
        >✕</button>
      )}

      {/* Resize handle */}
      <div className="node-resize-handle" onMouseDown={handleResizeMouseDown} />

      {/* Echo AI badge */}
      {node.createdBy === 'echo-ai' && (
        <div style={{
          position: 'absolute', top: -8, left: 8,
          background: 'linear-gradient(135deg, #6d28d9, #4f46e5)',
          color: '#fff', fontSize: '9px', fontWeight: 700,
          padding: '1px 5px', borderRadius: '99px',
          pointerEvents: 'none',
        }}>✦ Echo</div>
      )}
    </div>
  );
}
