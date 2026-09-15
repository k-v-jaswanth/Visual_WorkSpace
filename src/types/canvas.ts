export type NodeType =
  | 'text'
  | 'image'
  | 'flow'
  | 'mindmap'
  | 'transcript'
  | 'task'
  | 'sticky'
  | 'connector';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface CanvasNode {
  id: string;
  type: NodeType;
  position: Position;
  size: Size;
  data: Record<string, unknown>;
  createdAt: number;
  createdBy: string;
  color?: string;
  locked?: boolean;
  zIndex?: number;
}

export interface CanvasConnector {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  color?: string;
}

export interface CanvasState {
  nodes: CanvasNode[];
  connectors: CanvasConnector[];
  viewport: Viewport;
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export interface RemoteCursor {
  userId: string;
  userName: string;
  color: string;
  position: Position; // canvas coordinates
}

export interface TextCardData {
  content: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  background?: string;
}

export interface ImageNodeData {
  src: string;
  alt?: string;
  caption?: string;
  aiGenerated?: boolean;
}

export interface FlowNodeData {
  title: string;
  description?: string;
  shape?: 'rect' | 'diamond' | 'oval' | 'parallelogram';
  status?: 'pending' | 'active' | 'done';
}

export interface MindMapNodeData {
  topic: string;
  subtopics?: string[];
  color?: string;
}

export interface TranscriptBlockData {
  text: string;
  speaker?: string;
  timestamp?: number;
  audioUrl?: string;
}

export interface TaskNodeData {
  title: string;
  assignee?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
}

export interface StickyNoteData {
  content: string;
  color: string;
}
