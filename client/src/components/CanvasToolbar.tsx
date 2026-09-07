import React, { useState, useRef, useEffect } from 'react';
import {
  MousePointer2,
  Hand,
  Pencil,
  StickyNote,
  Heart,
  MessageCircle,
  Type,
  Square,
  Circle,
  Triangle,
  MoreHorizontal,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eraser,
  Minus,
  Image as ImageIcon,
} from 'lucide-react';
import { useReactFlow, useViewport } from 'reactflow';

export type CanvasTool =
  | 'select'
  | 'hand'
  | 'pencil'
  | 'eraser'
  | 'sticky'
  | 'reaction'
  | 'text'
  | 'shape-rect'
  | 'shape-circle'
  | 'shape-line'
  | 'shape-triangle'
  | 'comment';

interface CanvasToolbarProps {
  activeTool: CanvasTool;
  onToolChange: (t: CanvasTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  penColor: string;
  onPenColorChange: (c: string) => void;
  penSize: number;
  onPenSizeChange: (s: number) => void;
  onImageUpload?: (file: File) => void;
}

const COLORS = [
  '#f43f5e', '#f97316', '#facc15',
  '#22c55e', '#3b82f6', '#8b5cf6',
  '#ec4899', '#ffffff', '#94a3b8', '#0f172a',
];

const SHAPE_TOOLS: { id: CanvasTool; icon: React.ReactNode; label: string }[] = [
  { id: 'shape-rect', icon: <Square size={16} />, label: 'Rectangle' },
  { id: 'shape-circle', icon: <Circle size={16} />, label: 'Circle' },
  { id: 'shape-triangle', icon: <Triangle size={16} />, label: 'Triangle' },
  { id: 'shape-line', icon: <Minus size={16} />, label: 'Line' },
];

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  penColor,
  onPenColorChange,
  penSize,
  onPenSizeChange,
  onImageUpload,
}) => {
  const { zoomIn, zoomOut, fitView, zoomTo } = useReactFlow();
  const { zoom } = useViewport();
  const [showPenOptions, setShowPenOptions] = useState(false);
  const [showShapes, setShowShapes] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const zoomPct = Math.round(zoom * 100);
  const isShape = activeTool.startsWith('shape-');

  useEffect(() => {
    if (activeTool === 'pencil' || activeTool === 'eraser') setShowPenOptions(true);
    else setShowPenOptions(false);
  }, [activeTool]);

  useEffect(() => {
    const shortcutMap: Record<string, CanvasTool> = {
      v: 'select',
      h: 'hand',
      p: 'pencil',
      e: 'eraser',
      s: 'sticky',
      t: 'text',
      r: 'reaction',
      c: 'comment',
    };
    const handler = (ev: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      const editable = (document.activeElement as HTMLElement | null)?.isContentEditable;
      if (tag === 'input' || tag === 'textarea' || editable) return;
      if (ev.key === 'Escape') {
        onToolChange('select');
        setShowShapes(false);
        setShowMore(false);
        return;
      }
      if (ev.key === '+' || ev.key === '=') {
        ev.preventDefault();
        zoomIn({ duration: 160 });
        return;
      }
      if (ev.key === '-' || ev.key === '_') {
        ev.preventDefault();
        zoomOut({ duration: 160 });
        return;
      }
      if (ev.key.toLowerCase() === 'f' && !ev.ctrlKey && !ev.metaKey) {
        fitView({ duration: 400, padding: 0.2 });
        return;
      }
      const tool = shortcutMap[ev.key.toLowerCase()];
      if (tool) onToolChange(tool);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onToolChange, zoomIn, zoomOut, fitView]);

  const mainTools: { id: CanvasTool; icon: React.ReactNode; label: string; shortcut?: string }[] = [
    { id: 'select', icon: <MousePointer2 size={18} />, label: 'Select & Move', shortcut: 'V' },
    { id: 'hand', icon: <Hand size={18} />, label: 'Pan canvas', shortcut: 'H' },
    { id: 'pencil', icon: <Pencil size={18} />, label: 'Draw', shortcut: 'P' },
    { id: 'sticky', icon: <StickyNote size={18} />, label: 'Sticky note', shortcut: 'S' },
    { id: 'reaction', icon: <Heart size={18} />, label: 'Reaction', shortcut: 'R' },
    { id: 'comment', icon: <MessageCircle size={18} />, label: 'Comment', shortcut: 'C' },
    { id: 'text', icon: <Type size={18} />, label: 'Text', shortcut: 'T' },
  ];

  return (
    <div className="canvas-toolbar-dock">
      <div className="toolbar-cluster">
        <button
          className={`tb-btn ${!canUndo ? 'tb-disabled' : ''}`}
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          className={`tb-btn ${!canRedo ? 'tb-disabled' : ''}`}
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={16} />
        </button>
      </div>

      <div className="toolbar-cluster toolbar-main-tools">
        {mainTools.map((t) => (
          <button
            key={t.id}
            className={`tb-btn ${activeTool === t.id ? 'tb-active' : ''}`}
            title={`${t.label}${t.shortcut ? ` (${t.shortcut})` : ''}`}
            onClick={() => {
              onToolChange(t.id);
              setShowShapes(false);
              setShowMore(false);
            }}
          >
            {t.icon}
          </button>
        ))}

        <div className="tb-flyout-wrap">
          <button
            className={`tb-btn ${isShape ? 'tb-active' : ''}`}
            title="Shapes"
            onClick={() => {
              setShowShapes((v) => !v);
              setShowMore(false);
            }}
          >
            <span className="tb-shapes-icon">
              <Square size={13} />
              <Circle size={11} />
              <span className="tb-red-dot" />
            </span>
          </button>
          {showShapes && (
            <div className="tb-flyout">
              {SHAPE_TOOLS.map((s) => (
                <button
                  key={s.id}
                  className={`tb-flyout-item ${activeTool === s.id ? 'tb-active' : ''}`}
                  onClick={() => {
                    onToolChange(s.id);
                    setShowShapes(false);
                  }}
                >
                  {s.icon}
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="tb-flyout-wrap">
          <button
            className={`tb-btn ${activeTool === 'eraser' ? 'tb-active' : ''}`}
            title="More tools"
            onClick={() => {
              setShowMore((v) => !v);
              setShowShapes(false);
            }}
          >
            <MoreHorizontal size={18} />
          </button>
          {showMore && (
            <div className="tb-flyout">
              <button
                className={`tb-flyout-item ${activeTool === 'eraser' ? 'tb-active' : ''}`}
                onClick={() => {
                  onToolChange('eraser');
                  setShowMore(false);
                }}
              >
                <Eraser size={16} />
                <span>Eraser (E)</span>
              </button>
              <button
                className="tb-flyout-item"
                onClick={() => {
                  fileRef.current?.click();
                  setShowMore(false);
                }}
              >
                <ImageIcon size={16} />
                <span>Upload image</span>
              </button>
            </div>
          )}
        </div>

        {(showPenOptions || activeTool === 'pencil' || activeTool === 'eraser') && (
          <div className="pen-options-panel">
            <div className="pen-colors-row">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`pen-color-swatch ${penColor === c ? 'swatch-active' : ''}`}
                  style={{ background: c }}
                  onClick={() => onPenColorChange(c)}
                  title={c}
                />
              ))}
            </div>
            <div className="pen-size-row">
              <span>Size</span>
              <input
                type="range"
                min={1}
                max={24}
                value={penSize}
                onChange={(e) => onPenSizeChange(Number(e.target.value))}
              />
              <span className="pen-size-label">{penSize}px</span>
            </div>
          </div>
        )}
      </div>

      <div className="toolbar-cluster">
        <button className="tb-btn" title="Zoom out" onClick={() => zoomOut({ duration: 160 })}>
          <ZoomOut size={16} />
        </button>
        <button
          className="tb-zoom-label"
          title="Reset to 100%"
          onClick={() => zoomTo(1, { duration: 200 })}
        >
          {zoomPct}%
        </button>
        <button className="tb-btn" title="Zoom in" onClick={() => zoomIn({ duration: 160 })}>
          <ZoomIn size={16} />
        </button>
        <button className="tb-btn" title="Fit to screen (F)" onClick={() => fitView({ duration: 400, padding: 0.18 })}>
          <Maximize2 size={16} />
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && onImageUpload) onImageUpload(file);
          e.target.value = '';
        }}
      />
    </div>
  );
};
