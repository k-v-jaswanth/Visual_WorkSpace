'use client';
import { useRef } from 'react';

interface Props {
  activeTool: string;
  onToolChange: (tool: string) => void;
  onCommit: () => void;
  canvasHasNodes: boolean;
  penColor?: string;
  onPenColorChange?: (color: string) => void;
  penWidth?: number;
  onPenWidthChange?: (width: number) => void;
  onAddImageFile?: (file: File) => void;
}

const PEN_COLORS = [
  { color: '#1e293b', label: 'Charcoal Black' },
  { color: '#7c3aed', label: 'Vivid Purple' },
  { color: '#2563eb', label: 'Royal Blue' },
  { color: '#059669', label: 'Emerald Green' },
  { color: '#dc2626', label: 'Crimson Red' },
  { color: '#ea580c', label: 'Sunset Orange' },
];

const PEN_WIDTHS = [
  { width: 2, label: 'Thin' },
  { width: 4, label: 'Normal' },
  { width: 8, label: 'Thick' },
];

const TOOLS = [
  { id: 'select', icon: '⊹', label: 'Select & Pan' },
  { id: 'pen', icon: '✏️', label: 'Draw & Sketch (Pen)' },
  { id: 'eraser', icon: '🧹', label: 'Eraser' },
  { separator: true },
  { id: 'text', icon: 'T', label: 'Text Card' },
  { id: 'sticky', icon: '📝', label: 'Sticky Note' },
  { id: 'task', icon: '☑', label: 'Action Task' },
  { id: 'flow', icon: '⬡', label: 'Flow Step' },
  { id: 'mindmap', icon: '🧠', label: 'Mind Map' },
  { id: 'connector', icon: '⤹', label: 'Connect Nodes' },
  { separator: true },
  { id: 'image', icon: '🖼️', label: 'Add Image (From System Folder)' },
  { id: 'screen', icon: '🖥️', label: 'Screen Share' },
  { separator: true },
  { id: 'commit', icon: 'Commit', label: 'Commit Deliverables', isCommit: true },
];

export default function BottomToolbar({
  activeTool,
  onToolChange,
  onCommit,
  canvasHasNodes,
  penColor = '#1e293b',
  onPenColorChange,
  penWidth = 4,
  onPenWidthChange,
  onAddImageFile,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        onAddImageFile?.(files[i]);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Hidden File Input to pick images directly from system folder */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Pen Options Floating Bar (Colors & Sizes) */}
      {activeTool === 'pen' && (
        <div className="pen-options-bar">
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginRight: '2px' }}>
            PEN:
          </span>
          {PEN_COLORS.map((c) => (
            <button
              key={c.color}
              type="button"
              className={`pen-color-dot ${penColor === c.color ? 'active' : ''}`}
              style={{ background: c.color }}
              onClick={() => onPenColorChange?.(c.color)}
              title={c.label}
            />
          ))}

          <div style={{ width: '1px', height: '18px', background: 'rgba(0,0,0,0.1)', margin: '0 4px' }} />

          {PEN_WIDTHS.map((w) => (
            <button
              key={w.width}
              type="button"
              className={`pen-size-btn ${penWidth === w.width ? 'active' : ''}`}
              onClick={() => onPenWidthChange?.(w.width)}
              title={`${w.label} stroke (${w.width}px)`}
            >
              <div
                style={{
                  width: `${Math.max(4, w.width * 1.5)}px`,
                  height: `${Math.max(4, w.width * 1.5)}px`,
                  borderRadius: '50%',
                  background: penColor,
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Main Bottom Toolbar */}
      <div className="bottom-toolbar">
        {TOOLS.map((tool, i) => {
          if ('separator' in tool && tool.separator) {
            return <div key={`sep-${i}`} className="toolbar-separator" />;
          }
          const t = tool as { id: string; icon: string; label: string; className?: string; isCommit?: boolean };
          if (t.isCommit) {
            return (
              <div key={t.id} className="tooltip-wrap">
                <button
                  id="commit-toolbar-btn"
                  className="toolbar-btn commit-tool"
                  onClick={onCommit}
                >
                  {t.icon}
                </button>
                <div className="tooltip">Commit Meeting</div>
              </div>
            );
          }
          return (
            <div key={t.id} className="tooltip-wrap">
              <button
                id={`tool-${t.id}`}
                className={`toolbar-btn ${activeTool === t.id ? 'active' : ''} ${t.className || ''}`}
                onClick={() => {
                  if (t.id === 'image') {
                    fileInputRef.current?.click();
                    return;
                  }
                  if (t.id === 'screen') {
                    handleScreenShare();
                    return;
                  }
                  onToolChange(t.id);
                }}
                title={t.label}
              >
                {t.icon}
              </button>
              <div className="tooltip">{t.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

async function handleScreenShare() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    stream.getVideoTracks()[0].onended = () => {};
  } catch {}
}
