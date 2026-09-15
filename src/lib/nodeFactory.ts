import { CanvasNode, NodeType, Position, Size } from '@/types/canvas';
import { generateId } from './canvasUtils';

interface NodeTemplate {
  type: NodeType;
  size: Size;
  defaultData: Record<string, unknown>;
  color?: string;
}

const NODE_TEMPLATES: Record<NodeType, NodeTemplate> = {
  text: { type: 'text', size: { width: 280, height: 120 }, defaultData: { content: '' }, color: '#1e1e2e' },
  sticky: { type: 'sticky', size: { width: 220, height: 180 }, defaultData: { content: '', color: '#fbbf24' }, color: '#fbbf24' },
  image: { type: 'image', size: { width: 320, height: 220 }, defaultData: { src: '', alt: '' } },
  flow: { type: 'flow', size: { width: 200, height: 80 }, defaultData: { title: '', shape: 'rect', status: 'pending' }, color: '#6366f1' },
  mindmap: { type: 'mindmap', size: { width: 300, height: 200 }, defaultData: { topic: '', subtopics: [] }, color: '#8b5cf6' },
  transcript: { type: 'transcript', size: { width: 360, height: 100 }, defaultData: { text: '', speaker: '' }, color: '#0f172a' },
  task: { type: 'task', size: { width: 260, height: 110 }, defaultData: { title: '', status: 'todo', priority: 'medium' }, color: '#10b981' },
  connector: { type: 'connector', size: { width: 0, height: 0 }, defaultData: {} },
  drawing: { type: 'drawing', size: { width: 0, height: 0 }, defaultData: { points: [], color: '#1e293b', strokeWidth: 4 } },
};

export function createNode(
  type: NodeType,
  position: Position,
  data: Record<string, unknown> = {},
  createdBy = 'user'
): CanvasNode {
  const template = NODE_TEMPLATES[type];
  return {
    id: generateId(),
    type,
    position,
    size: { ...template.size },
    data: { ...template.defaultData, ...data },
    createdAt: Date.now(),
    createdBy,
    color: template.color,
    zIndex: 1,
  };
}

export function createTextCard(text: string, position: Position, createdBy = 'echo-ai'): CanvasNode {
  return createNode('text', position, { content: text }, createdBy);
}

export function createStickyNote(text: string, position: Position, color = '#fbbf24', createdBy = 'echo-ai'): CanvasNode {
  return createNode('sticky', position, { content: text, color }, createdBy);
}

export function createImageNode(src: string, alt: string, position: Position, createdBy = 'echo-ai'): CanvasNode {
  return createNode('image', position, { src, alt, aiGenerated: true }, createdBy);
}

export function createTaskNode(
  title: string,
  assignee: string | undefined,
  priority: 'low' | 'medium' | 'high',
  position: Position,
  createdBy = 'echo-ai'
): CanvasNode {
  return createNode('task', position, { title, assignee, priority, status: 'todo' }, createdBy);
}

export function createTranscriptBlock(text: string, speaker: string, timestamp: number, position: Position): CanvasNode {
  return createNode('transcript', position, { text, speaker, timestamp }, 'echo-ai');
}

export function createFlowNode(title: string, description: string, shape: 'rect' | 'diamond' | 'oval', position: Position): CanvasNode {
  return createNode('flow', position, { title, description, shape, status: 'pending' }, 'echo-ai');
}

export function createMindMapNode(topic: string, subtopics: string[], position: Position): CanvasNode {
  return createNode('mindmap', position, { topic, subtopics }, 'echo-ai');
}

export function autoLayout(nodes: CanvasNode[], startX = 100, startY = 100, cols = 3, gapX = 320, gapY = 200): CanvasNode[] {
  return nodes.map((node, i) => ({
    ...node,
    position: {
      x: startX + (i % cols) * gapX,
      y: startY + Math.floor(i / cols) * gapY,
    },
  }));
}

export function createDrawingNode(
  points: Array<{ x: number; y: number }>,
  color = '#1e293b',
  strokeWidth = 4,
  createdBy = 'user'
): CanvasNode {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  points.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  });
  if (minX === Infinity) { minX = 0; minY = 0; maxX = 100; maxY = 100; }

  return {
    id: generateId(),
    type: 'drawing',
    position: { x: minX, y: minY },
    size: { width: Math.max(20, maxX - minX), height: Math.max(20, maxY - minY) },
    data: { points, color, strokeWidth },
    createdAt: Date.now(),
    createdBy,
    color,
    zIndex: 10,
  };
}
