import React, { useRef, useState } from 'react';
import { useReactFlow, useViewport } from 'reactflow';

interface Stroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  tool: 'pencil' | 'eraser';
}

interface DrawingCanvasProps {
  active: boolean;
  tool: 'pencil' | 'eraser';
  color: string;
  size: number;
  strokes: Stroke[];
  onStrokesChange: (strokes: Stroke[]) => void;
  onNewStroke?: (stroke: Stroke) => void;
  onErasedStrokes?: (removed: Stroke[]) => void;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  active,
  tool,
  color,
  size,
  strokes,
  onStrokesChange,
  onNewStroke,
  onErasedStrokes,
}) => {
  const { screenToFlowPosition } = useReactFlow();
  const { x, y, zoom } = useViewport();
  const drawing = useRef(false);
  const currentStroke = useRef<Stroke | null>(null);
  const [live, setLive] = useState<Stroke | null>(null);
  const strokesRef = useRef(strokes);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const sizeRef = useRef(size);
  const zoomRef = useRef(zoom);
  const onStrokesChangeRef = useRef(onStrokesChange);
  const onNewStrokeRef = useRef(onNewStroke);
  const onErasedRef = useRef(onErasedStrokes);
  strokesRef.current = strokes;
  toolRef.current = tool;
  colorRef.current = color;
  sizeRef.current = size;
  zoomRef.current = zoom;
  onStrokesChangeRef.current = onStrokesChange;
  onNewStrokeRef.current = onNewStroke;
  onErasedRef.current = onErasedStrokes;

  const getPos = (e: React.PointerEvent): { x: number; y: number } => {
    return screenToFlowPosition({ x: e.clientX, y: e.clientY });
  };

  const eraseNear = (pos: { x: number; y: number }) => {
    const threshold = Math.max(14, sizeRef.current + 10) / Math.max(0.25, zoomRef.current);
    const kept: Stroke[] = [];
    const removed: Stroke[] = [];
    for (const stroke of strokesRef.current) {
      const hit = stroke.points.some((p) => dist(p, pos) <= threshold);
      if (hit) removed.push(stroke);
      else kept.push(stroke);
    }
    if (removed.length) {
      strokesRef.current = kept;
      onStrokesChangeRef.current(kept);
      onErasedRef.current?.(removed);
    }
  };

  const startDraw = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const pos = getPos(e);
    drawing.current = true;
    if (toolRef.current === 'eraser') {
      eraseNear(pos);
      return;
    }
    currentStroke.current = {
      id: uid(),
      points: [pos],
      color: colorRef.current,
      size: sizeRef.current,
      tool: 'pencil',
    };
    setLive({ ...currentStroke.current, points: [...currentStroke.current.points] });
  };

  const continueDraw = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!active || !drawing.current) return;
    e.preventDefault();
    const pos = getPos(e);
    if (toolRef.current === 'eraser') {
      eraseNear(pos);
      return;
    }
    if (!currentStroke.current) return;
    currentStroke.current.points.push(pos);
    setLive({ ...currentStroke.current, points: [...currentStroke.current.points] });
  };

  const endDraw = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (toolRef.current === 'pencil' && currentStroke.current && currentStroke.current.points.length > 1) {
      const finished = { ...currentStroke.current, points: [...currentStroke.current.points] };
      onStrokesChangeRef.current([...strokesRef.current, finished]);
      onNewStrokeRef.current?.(finished);
    }
    currentStroke.current = null;
    setLive(null);
  };

  const allStrokes = live ? [...strokes, live] : strokes;

  return (
    <svg
      className="drawing-canvas-layer"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: active ? 20 : 4,
        pointerEvents: active ? 'auto' : 'none',
        cursor: active ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default',
        touchAction: 'none',
      }}
      onPointerDown={startDraw}
      onPointerMove={continueDraw}
      onPointerUp={endDraw}
      onPointerCancel={endDraw}
      onPointerLeave={(e) => {
        if (drawing.current) endDraw();
      }}
    >
      <g transform={`translate(${x}, ${y}) scale(${zoom})`}>
        {allStrokes.map((stroke) => {
          if (stroke.points.length < 2) return null;
          return (
            <polyline
              key={stroke.id}
              points={stroke.points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={stroke.color}
              strokeWidth={stroke.size}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </g>
    </svg>
  );
};

export type { Stroke };
export default DrawingCanvas;
