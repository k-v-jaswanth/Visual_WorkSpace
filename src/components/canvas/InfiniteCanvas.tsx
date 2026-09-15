'use client';
import { useRef, useCallback, useEffect, useState } from 'react';
import { CanvasNode, CanvasConnector, Viewport, RemoteCursor, Position, DrawingNodeData } from '@/types/canvas';
import { NodeType } from '@/types/canvas';
import CanvasNodeComponent from './CanvasNode';
import ConnectorLayer from './Connector';
import CursorOverlay from './CursorOverlay';
import MiniMap from './MiniMap';
import { createNode, createDrawingNode } from '@/lib/nodeFactory';
import { screenToCanvas } from '@/lib/canvasUtils';

interface Props {
  nodes: CanvasNode[];
  connectors: CanvasConnector[];
  viewport: Viewport;
  selectedNodeId: string | null;
  activeTool: string;
  remoteCursors: RemoteCursor[];
  currentUserId: string;
  penColor?: string;
  penWidth?: number;
  onViewportChange: (vp: Viewport) => void;
  onNodeSelect: (id: string | null) => void;
  onNodeAdd: (node: CanvasNode) => void;
  onNodeUpdate: (update: Partial<CanvasNode> & { id: string }) => void;
  onNodeDelete: (id: string) => void;
  onConnectorAdd?: (connector: CanvasConnector) => void;
  onConnectorDelete?: (id: string) => void;
  onCursorMove: (pos: Position) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

function svgPathFromPoints(points: Array<{ x: number; y: number }>): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;
    d += ` Q ${p0.x} ${p0.y}, ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export default function InfiniteCanvas({
  nodes, connectors, viewport, selectedNodeId, activeTool,
  remoteCursors, currentUserId, penColor = '#1e293b', penWidth = 4,
  onViewportChange, onNodeSelect,
  onNodeAdd, onNodeUpdate, onNodeDelete, onConnectorAdd, onConnectorDelete, onCursorMove, onUndo, onRedo,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const mouseCanvasPos = useRef<{ x: number; y: number } | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 800 });
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  const [currentStroke, setCurrentStroke] = useState<Array<{ x: number; y: number }>>([]);
  const isDrawing = useRef(false);
  const currentStrokeRef = useRef<Array<{ x: number; y: number }>>([]);
  const cursorThrottle = useRef<number>(0);
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setContainerSize({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Non-passive wheel handler to prevent browser zoom ──────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault(); // MUST prevent default BEFORE React sees it
      const vp = viewportRef.current;
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom or Ctrl+wheel
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(4, vp.scale * factor));
        const scaleChange = newScale / vp.scale;
        onViewportChange({
          scale: newScale,
          x: cx - (cx - vp.x) * scaleChange,
          y: cy - (cy - vp.y) * scaleChange,
        });
      } else {
        // Scroll to pan
        onViewportChange({ ...vp, x: vp.x - e.deltaX, y: vp.y - e.deltaY });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [onViewportChange]);

  // ── Keyboard: Ctrl+Z / Ctrl+Y / Delete ─────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo?.();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        onRedo?.();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        onNodeDelete(selectedNodeId);
      } else if (e.key === 'Escape') {
        onNodeSelect(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedNodeId, onUndo, onRedo, onNodeDelete, onNodeSelect]);

  // ── Prevent browser zoom via Ctrl+scroll on the whole document ─────────────
  useEffect(() => {
    const preventZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
    document.addEventListener('wheel', preventZoom, { passive: false });
    return () => document.removeEventListener('wheel', preventZoom);
  }, []);

  // ── Clipboard Paste (Ctrl+V) for Images & Links ───────────────────────────
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      // 1. Check for image files in clipboard
      let imageFile: File | null = null;
      if (clipboardData.items) {
        for (let i = 0; i < clipboardData.items.length; i++) {
          const item = clipboardData.items[i];
          if (item.type.startsWith('image/')) {
            imageFile = item.getAsFile();
            if (imageFile) break;
          }
        }
      }
      if (!imageFile && clipboardData.files) {
        for (let i = 0; i < clipboardData.files.length; i++) {
          const file = clipboardData.files[i];
          if (file.type.startsWith('image/')) {
            imageFile = file;
            break;
          }
        }
      }

      if (imageFile) {
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = (loadEv) => {
          const dataUrl = loadEv.target?.result as string;
          if (!dataUrl) return;

          const img = new Image();
          img.onload = () => {
            const vp = viewportRef.current;
            const targetCanvasX = mouseCanvasPos.current
              ? mouseCanvasPos.current.x
              : (-vp.x + (containerRef.current?.offsetWidth || 800) / 2) / vp.scale;
            const targetCanvasY = mouseCanvasPos.current
              ? mouseCanvasPos.current.y
              : (-vp.y + (containerRef.current?.offsetHeight || 600) / 2) / vp.scale;

            const maxW = 440;
            const maxH = 340;
            let finalW = img.naturalWidth || 320;
            let finalH = img.naturalHeight || 220;
            if (finalW > maxW || finalH > maxH) {
              const ratio = Math.min(maxW / finalW, maxH / finalH);
              finalW = Math.round(finalW * ratio);
              finalH = Math.round(finalH * ratio);
            }

            const newNode = createNode(
              'image',
              { x: Math.round(targetCanvasX - finalW / 2), y: Math.round(targetCanvasY - finalH / 2) },
              {
                src: dataUrl,
                alt: imageFile?.name || 'Pasted Image',
                caption: imageFile?.name || 'Pasted Image',
              },
              currentUserId
            );
            newNode.size = { width: finalW, height: finalH };
            onNodeAdd(newNode);
            onNodeSelect(newNode.id);
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(imageFile);
        return;
      }

      // 2. If not an image file and user is not typing in a text field, check if it's an image URL
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
        const text = clipboardData.getData('text/plain').trim();
        if (text) {
          const isImageUrl = text.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i) || text.startsWith('data:image/');
          if (isImageUrl) {
            e.preventDefault();
            const vp = viewportRef.current;
            const targetCanvasX = mouseCanvasPos.current
              ? mouseCanvasPos.current.x
              : (-vp.x + (containerRef.current?.offsetWidth || 800) / 2) / vp.scale;
            const targetCanvasY = mouseCanvasPos.current
              ? mouseCanvasPos.current.y
              : (-vp.y + (containerRef.current?.offsetHeight || 600) / 2) / vp.scale;

            const newNode = createNode(
              'image',
              { x: Math.round(targetCanvasX - 160), y: Math.round(targetCanvasY - 110) },
              {
                src: text,
                alt: 'Pasted Image',
                caption: 'Pasted Image',
              },
              currentUserId
            );
            onNodeAdd(newNode);
            onNodeSelect(newNode.id);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onNodeAdd, onNodeSelect, currentUserId]);

  // ── Drag and drop image files directly onto canvas ────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find((f) => f.type.startsWith('image/'));
    if (!imageFile) return;

    const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport.x, viewport.y, viewport.scale);
    const reader = new FileReader();
    reader.onload = (loadEv) => {
      const dataUrl = loadEv.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const maxW = 440;
        const maxH = 340;
        let finalW = img.naturalWidth || 320;
        let finalH = img.naturalHeight || 220;
        if (finalW > maxW || finalH > maxH) {
          const ratio = Math.min(maxW / finalW, maxH / finalH);
          finalW = Math.round(finalW * ratio);
          finalH = Math.round(finalH * ratio);
        }

        const newNode = createNode(
          'image',
          { x: Math.round(canvasPos.x - finalW / 2), y: Math.round(canvasPos.y - finalH / 2) },
          {
            src: dataUrl,
            alt: imageFile.name || 'Dropped Image',
            caption: imageFile.name,
          },
          currentUserId
        );
        newNode.size = { width: finalW, height: finalH };
        onNodeAdd(newNode);
        onNodeSelect(newNode.id);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(imageFile);
  }, [viewport, onNodeAdd, onNodeSelect, currentUserId]);

  // ── Mouse events for Pen / Eraser / Pan ─────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;

    if (activeTool === 'pen') {
      const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport.x, viewport.y, viewport.scale);
      isDrawing.current = true;
      currentStrokeRef.current = [canvasPos];
      setCurrentStroke([canvasPos]);
      return;
    }

    const target = e.target as HTMLElement;
    if (target === containerRef.current || target.classList.contains('canvas-viewport') || target.tagName === 'svg') {
      onNodeSelect(null);

      if (activeTool !== 'select' && activeTool !== 'pan' && activeTool !== 'connector' && activeTool !== 'eraser') {
        const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport.x, viewport.y, viewport.scale);
        let nodeType: NodeType = 'text';
        switch (activeTool) {
          case 'text': nodeType = 'text'; break;
          case 'sticky': nodeType = 'sticky'; break;
          case 'task': nodeType = 'task'; break;
          case 'mindmap': nodeType = 'mindmap'; break;
          case 'flow': nodeType = 'flow'; break;
          case 'image': nodeType = 'image'; break;
        }
        const node = createNode(nodeType, { x: canvasPos.x - 140, y: canvasPos.y - 60 }, {}, currentUserId);
        onNodeAdd(node);
        onNodeSelect(node.id);
        return;
      }

      if (activeTool === 'connector') {
        setConnectingNodeId(null);
      }

      if (activeTool !== 'eraser') {
        isPanning.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
      }
    }
  }, [activeTool, viewport, onNodeAdd, onNodeSelect, currentUserId]);

  const handleNodeClick = useCallback((id: string) => {
    if (activeTool === 'eraser') {
      onNodeDelete(id);
      return;
    }
    if (activeTool === 'connector') {
      if (!connectingNodeId) {
        setConnectingNodeId(id);
      } else if (connectingNodeId !== id) {
        onConnectorAdd?.({
          id: Math.random().toString(36).substring(2, 9),
          fromNodeId: connectingNodeId,
          toNodeId: id,
          label: 'connects to',
          color: 'rgba(124, 58, 237, 0.85)',
        });
        setConnectingNodeId(null);
      }
      return;
    }
    onNodeSelect(id);
  }, [activeTool, connectingNodeId, onConnectorAdd, onNodeSelect, onNodeDelete]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const vp = viewportRef.current;
    const canvasPos = screenToCanvas(e.clientX, e.clientY, vp.x, vp.y, vp.scale);
    mouseCanvasPos.current = canvasPos;

    if (activeTool === 'pen' && isDrawing.current) {
      currentStrokeRef.current.push(canvasPos);
      setCurrentStroke([...currentStrokeRef.current]);
      return;
    }

    if (isPanning.current) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      onViewportChange({ ...viewportRef.current, x: viewportRef.current.x + dx, y: viewportRef.current.y + dy });
    }
    const now = Date.now();
    if (now - cursorThrottle.current > 50) {
      cursorThrottle.current = now;
      onCursorMove(canvasPos);
    }
  }, [activeTool, onViewportChange, onCursorMove]);

  const handleMouseUp = useCallback(() => {
    if (activeTool === 'pen' && isDrawing.current) {
      isDrawing.current = false;
      const pts = currentStrokeRef.current;
      if (pts.length > 1) {
        const drawNode = createDrawingNode(pts, penColor || '#1e293b', penWidth || 4, currentUserId);
        onNodeAdd(drawNode);
      }
      currentStrokeRef.current = [];
      setCurrentStroke([]);
      return;
    }
    isPanning.current = false;
  }, [activeTool, penColor, penWidth, currentUserId, onNodeAdd]);

  const getCursor = () => {
    if (activeTool === 'pan' || isPanning.current) return 'grab';
    if (activeTool === 'connector') return 'cell';
    if (activeTool === 'pen') return 'crosshair';
    if (activeTool === 'eraser') return 'cell';
    if (activeTool !== 'select') return 'crosshair';
    return 'default';
  };

  const drawingNodes = nodes.filter((n) => n.type === 'drawing');
  const cardNodes = nodes.filter((n) => n.type !== 'drawing');

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      style={{ cursor: getCursor() }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Viewport transform layer */}
      <div
        className="canvas-viewport"
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})` }}
      >
        {/* SVG Freehand Drawing Layer */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
            pointerEvents: activeTool === 'eraser' ? 'auto' : 'none',
            zIndex: 10,
          }}
        >
          {drawingNodes.map((node) => {
            const data = node.data as unknown as DrawingNodeData;
            const points = data?.points || [];
            const color = data?.color || '#1e293b';
            const strokeW = data?.strokeWidth || 4;
            return (
              <path
                key={node.id}
                d={svgPathFromPoints(points)}
                stroke={color}
                strokeWidth={strokeW}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  cursor: activeTool === 'eraser' ? 'pointer' : 'default',
                  pointerEvents: activeTool === 'eraser' ? 'stroke' : 'none',
                  transition: 'opacity 0.15s ease',
                }}
                onClick={(e) => {
                  if (activeTool === 'eraser') {
                    e.stopPropagation();
                    onNodeDelete(node.id);
                  }
                }}
                onMouseEnter={(e) => {
                  if (activeTool === 'eraser' && e.buttons === 1) {
                    onNodeDelete(node.id);
                  }
                }}
              />
            );
          })}
          {currentStroke.length > 1 && (
            <path
              d={svgPathFromPoints(currentStroke)}
              stroke={penColor || '#1e293b'}
              strokeWidth={penWidth || 4}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
            />
          )}
        </svg>

        <ConnectorLayer connectors={connectors} nodes={cardNodes} />
        {cardNodes.map((node) => (
          <CanvasNodeComponent
            key={node.id}
            node={node}
            selected={selectedNodeId === node.id || connectingNodeId === node.id}
            scale={viewport.scale}
            onSelect={handleNodeClick}
            onUpdate={onNodeUpdate}
            onDelete={onNodeDelete}
          />
        ))}
      </div>

      {connectingNodeId && (
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(109, 40, 217, 0.95)', color: '#fff',
          padding: '7px 18px', borderRadius: '99px', fontSize: '12px', fontWeight: 600,
          boxShadow: '0 4px 18px rgba(109, 40, 217, 0.45)', display: 'flex', alignItems: 'center', gap: '10px',
          zIndex: 40, backdropFilter: 'blur(8px)',
        }}>
          <span>⤹ Click second card to link them</span>
          <button
            onClick={() => setConnectingNodeId(null)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '13px', opacity: 0.8 }}
          >✕</button>
        </div>
      )}

      <CursorOverlay cursors={remoteCursors} viewport={viewport} />

      <MiniMap
        nodes={nodes}
        connectors={connectors}
        viewport={viewport}
        containerWidth={containerSize.width}
        containerHeight={containerSize.height}
      />

      {/* Zoom % indicator */}
      <div style={{
        position: 'absolute', bottom: 88, left: '50%', transform: 'translateX(-50%)',
        fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
        background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)',
        padding: '3px 10px', borderRadius: 'var(--radius-sm)',
        backdropFilter: 'blur(8px)', boxShadow: 'var(--shadow-sm)',
        userSelect: 'none',
      }}>
        {Math.round(viewport.scale * 100)}%
      </div>

      {nodes.length === 0 && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.15 }}>✦</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>Your canvas is empty</div>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', opacity: 0.7 }}>Paste an image (Ctrl+V) or start talking to generate nodes</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', opacity: 0.5, marginTop: '8px' }}>Or click a tool below to add elements manually</div>
        </div>
      )}
    </div>
  );
}
