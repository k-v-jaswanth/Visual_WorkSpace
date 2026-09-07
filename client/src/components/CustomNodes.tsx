import React, { memo, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, NodeProps, NodeResizer, useReactFlow } from 'reactflow';
import {
  Target,
  CheckCircle2,
  CheckSquare,
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  X,
  User as UserIcon,
  MessageCircle,
} from 'lucide-react';

export interface CustomNodeData {
  title: string;
  body?: string;
  imageUrl?: string;
  caption?: string;
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
  owner?: string;
  status?: string;
  type?: string;
  width?: number;
  height?: number;
  minimized?: boolean;
  prevWidth?: number;
  prevHeight?: number;
  shape?: 'rect' | 'circle' | 'triangle' | 'line';
  fill?: string;
  author?: string;
  onDelete?: (id: string) => void;
}

function usePatchNode(id: string) {
  const { setNodes } = useReactFlow();
  return useCallback(
    (patch: Partial<CustomNodeData>, stylePatch?: React.CSSProperties) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: { ...n.data, ...patch },
                style: stylePatch ? { ...n.style, ...stylePatch } : n.style,
              }
            : n
        )
      );
    },
    [id, setNodes]
  );
}

const NodeWrapper = ({
  id,
  type,
  icon: Icon,
  badgeText,
  badgeClass,
  data,
  children,
}: {
  id: string;
  type: string;
  icon: any;
  badgeText: string;
  badgeClass: string;
  data: CustomNodeData;
  children?: React.ReactNode;
}) => {
  const { deleteElements } = useReactFlow();

  return (
    <div className={`workspace-node node-${type.toLowerCase()}`}>
      <Handle type="target" position={Position.Top} className="node-handle handle-top" />
      <Handle type="target" position={Position.Left} className="node-handle handle-left" />

      <div className="node-header">
        <span className={`node-badge ${badgeClass}`}>
          <Icon size={12} />
          {badgeText}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {data.status && <span className="node-status-pill">{data.status}</span>}
          <button
            className="node-delete-btn nodrag"
            title="Delete node"
            onClick={(e) => {
              e.stopPropagation();
              deleteElements({ nodes: [{ id }] });
            }}
          >
            <X size={10} />
          </button>
        </div>
      </div>

      <div className="node-content">
        <h4 className="node-title">{data.title}</h4>
        {data.body && <p className="node-body">{data.body}</p>}
        {children}
      </div>

      <Handle type="source" position={Position.Right} className="node-handle handle-right" />
      <Handle type="source" position={Position.Bottom} className="node-handle handle-bottom" />
    </div>
  );
};

export const GoalNode = memo(({ id, data }: NodeProps<CustomNodeData>) => (
  <NodeWrapper id={id} type="goal" icon={Target} badgeText="GOAL" badgeClass="badge-goal" data={data} />
));

export const DecisionNode = memo(({ id, data }: NodeProps<CustomNodeData>) => (
  <NodeWrapper id={id} type="decision" icon={CheckCircle2} badgeText="DECISION" badgeClass="badge-decision" data={data} />
));

export const TaskNode = memo(({ id, data }: NodeProps<CustomNodeData>) => {
  const priorityClass = data.priority ? `priority-${data.priority.toLowerCase()}` : 'priority-medium';
  return (
    <NodeWrapper id={id} type="task" icon={CheckSquare} badgeText="TASK" badgeClass="badge-task" data={data}>
      <div className="task-meta">
        {data.priority && <span className={`task-priority ${priorityClass}`}>{data.priority}</span>}
        {data.owner && (
          <span className="task-owner">
            <UserIcon size={11} />
            {data.owner}
          </span>
        )}
      </div>
    </NodeWrapper>
  );
});

export const RiskNode = memo(({ id, data }: NodeProps<CustomNodeData>) => (
  <NodeWrapper id={id} type="risk" icon={AlertTriangle} badgeText="RISK" badgeClass="badge-risk" data={data}>
    {data.priority && <span className="risk-severity">Severity: {data.priority}</span>}
  </NodeWrapper>
));

export const QuestionNode = memo(({ id, data }: NodeProps<CustomNodeData>) => (
  <NodeWrapper id={id} type="question" icon={HelpCircle} badgeText="QUESTION" badgeClass="badge-question" data={data} />
));

export const IdeaNode = memo(({ id, data }: NodeProps<CustomNodeData>) => (
  <NodeWrapper id={id} type="idea" icon={Lightbulb} badgeText="IDEA" badgeClass="badge-idea" data={data} />
));

export const ImageNode = memo(({ id, data, selected }: NodeProps<CustomNodeData>) => {
  const { deleteElements, setNodes } = useReactFlow();
  const patch = usePatchNode(id);
  const [fullscreen, setFullscreen] = useState(false);
  const minimized = !!data.minimized;

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== id) return n;
        const hasSize = n.style?.width || n.width || n.data?.width;
        if (hasSize) return n;
        return {
          ...n,
          style: { ...n.style, width: 380, height: 280 },
          data: { ...n.data, width: 380, height: 280, minimized: false },
        };
      })
    );
  }, [id, setNodes]);

  const toggleMinimized = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== id) return n;
        const currentW = Number(n.style?.width ?? n.width ?? n.data?.width ?? 380);
        const currentH = Number(n.style?.height ?? n.height ?? n.data?.height ?? 280);
        const nextMin = !n.data?.minimized;
        if (nextMin) {
          return {
            ...n,
            data: {
              ...n.data,
              minimized: true,
              prevWidth: currentW,
              prevHeight: currentH,
              width: currentW,
              height: currentH,
            },
            style: { ...n.style, width: 248, height: 72 },
          };
        }
        const restoreW = n.data?.prevWidth || n.data?.width || 380;
        const restoreH = n.data?.prevHeight || n.data?.height || 280;
        return {
          ...n,
          data: { ...n.data, minimized: false },
          style: { ...n.style, width: restoreW, height: restoreH },
        };
      })
    );
  };

  return (
    <>
      {fullscreen &&
        data.imageUrl &&
        createPortal(
          <div className="img-lightbox-overlay" onClick={() => setFullscreen(false)}>
            <img
              src={data.imageUrl}
              alt={data.title || 'Screenshot'}
              onClick={(e) => e.stopPropagation()}
            />
            <button className="img-lightbox-close" onClick={() => setFullscreen(false)}>
              ✕ Close
            </button>
          </div>,
          document.body
        )}

      <div className={`workspace-node node-image ${minimized ? 'node-image-minimized' : ''} ${selected ? 'is-selected' : ''}`}>
        {!minimized && (
          <NodeResizer
            isVisible={!!selected && !minimized}
            minWidth={160}
            minHeight={120}
            color="#8b5cf6"
            keepAspectRatio={false}
            handleStyle={{ width: 10, height: 10, borderRadius: 2 }}
            onResizeEnd={(_e, params) => {
              patch(
                { width: params.width, height: params.height, prevWidth: params.width, prevHeight: params.height },
                { width: params.width, height: params.height }
              );
            }}
          />
        )}

        <Handle type="target" position={Position.Top} className="node-handle handle-top" />
        <Handle type="target" position={Position.Left} className="node-handle handle-left" />

        <div className="node-header image-drag-handle">
          <span className="node-badge badge-image">
            <ImageIcon size={12} />
            {minimized ? 'IMAGE' : 'SCREENSHOT / IMAGE'}
          </span>
          <div className="image-node-actions nodrag nopan">
            {!minimized && (
              <button
                className="node-img-expand-btn"
                title="View fullscreen"
                onClick={(e) => {
                  e.stopPropagation();
                  setFullscreen(true);
                }}
              >
                <Maximize2 size={12} />
              </button>
            )}
            <button
              className="node-img-expand-btn"
              title={minimized ? 'Expand image' : 'Minimize image'}
              onClick={toggleMinimized}
            >
              {minimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
            </button>
            <button
              className="node-delete-btn"
              title="Delete image"
              onClick={(e) => {
                e.stopPropagation();
                deleteElements({ nodes: [{ id }] });
              }}
            >
              <X size={10} />
            </button>
          </div>
        </div>

        {minimized ? (
          <div className="image-mini-row">
            <button className="image-mini-thumb nodrag" title="Click to expand" onClick={toggleMinimized}>
              {data.imageUrl && <img src={data.imageUrl} alt="" draggable={false} />}
            </button>
            <span className="image-mini-title">{data.title || 'Image'}</span>
          </div>
        ) : (
          <>
            {data.title && <h4 className="node-title image-node-title">{data.title}</h4>}
            {data.imageUrl && (
              <div
                className="image-preview-container"
                title="Drag corner to resize · double-click for fullscreen"
                onDoubleClick={() => setFullscreen(true)}
              >
                <img
                  src={data.imageUrl}
                  alt={data.title || 'Screenshot'}
                  className="pasted-canvas-image"
                  draggable={false}
                />
              </div>
            )}
            {data.caption && <p className="node-caption">{data.caption}</p>}
          </>
        )}

        <Handle type="source" position={Position.Right} className="node-handle handle-right" />
        <Handle type="source" position={Position.Bottom} className="node-handle handle-bottom" />
      </div>
    </>
  );
});

export const StickyNode = memo(({ id, data }: NodeProps<CustomNodeData>) => {
  const { deleteElements } = useReactFlow();
  const patch = usePatchNode(id);
  const [text, setText] = useState(data.body || '');
  const [editing, setEditing] = useState(false);

  return (
    <div className="workspace-node node-sticky">
      <Handle type="target" position={Position.Top} className="node-handle" />
      <Handle type="target" position={Position.Left} className="node-handle" />

      <div className="node-header">
        <span className="node-badge badge-sticky">STICKY NOTE</span>
        <button
          className="node-delete-btn nodrag"
          title="Delete"
          onClick={() => deleteElements({ nodes: [{ id }] })}
        >
          <X size={10} />
        </button>
      </div>

      {editing ? (
        <textarea
          className="sticky-textarea nodrag nopan nowheel"
          value={text}
          autoFocus
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            setEditing(false);
            patch({ body: text, title: text });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setEditing(false);
              patch({ body: text, title: text });
            }
          }}
        />
      ) : (
        <p className="sticky-text" onClick={() => setEditing(true)} title="Click to edit">
          {text || 'Click to add a note...'}
        </p>
      )}

      <Handle type="source" position={Position.Right} className="node-handle" />
      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
});

export const TextNode = memo(({ id, data }: NodeProps<CustomNodeData>) => {
  const { deleteElements } = useReactFlow();
  const patch = usePatchNode(id);
  const [text, setText] = useState(data.title || 'Text label');
  const [editing, setEditing] = useState(false);

  return (
    <div className="workspace-node node-text">
      <Handle type="target" position={Position.Top} className="node-handle" />
      <Handle type="target" position={Position.Left} className="node-handle" />

      <div className="node-header" style={{ justifyContent: 'flex-end' }}>
        <button className="node-delete-btn nodrag" onClick={() => deleteElements({ nodes: [{ id }] })}>
          <X size={10} />
        </button>
      </div>

      {editing ? (
        <input
          className="text-node-input nodrag nopan nowheel"
          value={text}
          autoFocus
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            setEditing(false);
            patch({ title: text });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
              setEditing(false);
              patch({ title: text });
            }
          }}
        />
      ) : (
        <p className="text-node-label" onDoubleClick={() => setEditing(true)} title="Double-click to edit">
          {text}
        </p>
      )}

      <Handle type="source" position={Position.Right} className="node-handle" />
      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
});

export const ReactionNode = memo(({ id, data }: NodeProps<CustomNodeData>) => {
  const { deleteElements } = useReactFlow();
  const patch = usePatchNode(id);
  const emojis = ['❤️', '👍', '🎯', '🚀', '⚡', '✅', '⚠️', '💡', '🔥', '🎉'];
  const [emoji, setEmoji] = useState(data.title || '❤️');
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="workspace-node node-reaction">
      <Handle type="target" position={Position.Top} className="node-handle" />
      <Handle type="target" position={Position.Left} className="node-handle" />

      <button
        className="node-delete-btn nodrag"
        style={{ position: 'absolute', top: 4, right: 4 }}
        onClick={() => deleteElements({ nodes: [{ id }] })}
      >
        <X size={10} />
      </button>

      <div
        className="reaction-emoji nodrag"
        onClick={() => setShowPicker((v) => !v)}
        title="Click to change emoji"
      >
        {emoji}
      </div>

      {showPicker && (
        <div className="emoji-picker-popup nodrag nopan">
          {emojis.map((em) => (
            <button
              key={em}
              className="emoji-option"
              onClick={(e) => {
                e.stopPropagation();
                setEmoji(em);
                patch({ title: em });
                setShowPicker(false);
              }}
            >
              {em}
            </button>
          ))}
        </div>
      )}

      <Handle type="source" position={Position.Right} className="node-handle" />
      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
});

export const CommentNode = memo(({ id, data }: NodeProps<CustomNodeData>) => {
  const { deleteElements } = useReactFlow();
  const patch = usePatchNode(id);
  const [text, setText] = useState(data.body || '');
  const [editing, setEditing] = useState(!data.body);

  return (
    <div className="workspace-node node-comment">
      <Handle type="target" position={Position.Top} className="node-handle" />
      <Handle type="target" position={Position.Left} className="node-handle" />

      <div className="comment-pin">
        <MessageCircle size={16} />
      </div>

      <div className="node-header">
        <span className="node-badge badge-comment">
          <MessageCircle size={11} />
          {data.author || 'Comment'}
        </span>
        <button className="node-delete-btn nodrag" onClick={() => deleteElements({ nodes: [{ id }] })}>
          <X size={10} />
        </button>
      </div>

      {editing ? (
        <textarea
          className="comment-textarea nodrag nopan nowheel"
          value={text}
          autoFocus
          placeholder="Write a comment..."
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            setEditing(false);
            patch({ body: text, title: text.slice(0, 40) || 'Comment' });
          }}
        />
      ) : (
        <p className="comment-text" onClick={() => setEditing(true)} title="Click to edit">
          {text || 'Click to write a comment...'}
        </p>
      )}

      <Handle type="source" position={Position.Right} className="node-handle" />
      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
});

export const ShapeNode = memo(({ id, data, selected }: NodeProps<CustomNodeData>) => {
  const { deleteElements } = useReactFlow();
  const patch = usePatchNode(id);
  const shape = data.shape || 'rect';
  const fill = data.fill || '#3b82f6';

  return (
    <div className={`workspace-node node-shape shape-${shape} ${selected ? 'is-selected' : ''}`}>
      <NodeResizer
        isVisible={selected}
        minWidth={shape === 'line' ? 80 : 48}
        minHeight={shape === 'line' ? 16 : 48}
        color={fill}
        handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
        onResizeEnd={(_e, params) => {
          patch({ width: params.width, height: params.height }, { width: params.width, height: params.height });
        }}
      />
      <Handle type="target" position={Position.Top} className="node-handle" />
      <Handle type="target" position={Position.Left} className="node-handle" />

      <button
        className="node-delete-btn nodrag shape-delete"
        onClick={() => deleteElements({ nodes: [{ id }] })}
      >
        <X size={10} />
      </button>

      {shape === 'triangle' ? (
        <svg viewBox="0 0 100 100" className="shape-svg" preserveAspectRatio="none">
          <polygon points="50,6 96,94 4,94" fill={fill} />
        </svg>
      ) : shape === 'line' ? (
        <div className="shape-line-bar" style={{ background: fill }} />
      ) : (
        <div
          className={`shape-fill ${shape === 'circle' ? 'is-circle' : 'is-rect'}`}
          style={{ background: fill }}
        />
      )}

      <Handle type="source" position={Position.Right} className="node-handle" />
      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
});

export const nodeTypes = {
  Goal: GoalNode,
  Decision: DecisionNode,
  Task: TaskNode,
  Risk: RiskNode,
  Question: QuestionNode,
  Idea: IdeaNode,
  Image: ImageNode,
  Sticky: StickyNode,
  Text: TextNode,
  Reaction: ReactionNode,
  Comment: CommentNode,
  Shape: ShapeNode,
};
