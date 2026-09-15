import { CanvasNode, CanvasConnector, Position, Size } from '@/types/canvas';
import { TranscriptEntry } from '@/types/ai';
import { RoomMode } from '@/types/room';

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  }
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

export function screenToCanvas(
  screenX: number,
  screenY: number,
  viewportX: number,
  viewportY: number,
  scale: number
): Position {
  return {
    x: (screenX - viewportX) / scale,
    y: (screenY - viewportY) / scale,
  };
}

export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  viewportX: number,
  viewportY: number,
  scale: number
): Position {
  return {
    x: canvasX * scale + viewportX,
    y: canvasY * scale + viewportY,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getBoundingBox(nodes: CanvasNode[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (nodes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  nodes.forEach((n) => {
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + n.size.width);
    maxY = Math.max(maxY, n.position.y + n.size.height);
  });
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function fitViewport(
  nodes: CanvasNode[],
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number; scale: number } {
  if (nodes.length === 0) return { x: canvasWidth / 2, y: canvasHeight / 2, scale: 1 };
  const bb = getBoundingBox(nodes);
  const padding = 80;
  const scaleX = (canvasWidth - padding * 2) / (bb.width || 1);
  const scaleY = (canvasHeight - padding * 2) / (bb.height || 1);
  const scale = clamp(Math.min(scaleX, scaleY), 0.2, 2);
  const x = (canvasWidth - bb.width * scale) / 2 - bb.x * scale;
  const y = (canvasHeight - bb.height * scale) / 2 - bb.y * scale;
  return { x, y, scale };
}

export function getNodeConnectorPoint(
  node: CanvasNode,
  side: 'top' | 'bottom' | 'left' | 'right'
): Position {
  const { position, size } = node;
  switch (side) {
    case 'top':
      return { x: position.x + size.width / 2, y: position.y };
    case 'bottom':
      return { x: position.x + size.width / 2, y: position.y + size.height };
    case 'left':
      return { x: position.x, y: position.y + size.height / 2 };
    case 'right':
      return { x: position.x + size.width, y: position.y + size.height / 2 };
  }
}

export function parseAINodes(raw: unknown[]): CanvasNode[] {
  // Safety parse of AI-returned nodes
  return (raw || []).filter(Boolean).map((n: unknown) => {
    const node = n as Partial<CanvasNode>;
    return {
      id: node.id || generateId(),
      type: node.type || 'text',
      position: node.position || { x: Math.random() * 800, y: Math.random() * 600 },
      size: node.size || { width: 280, height: 120 },
      data: node.data || {},
      createdAt: node.createdAt || Date.now(),
      createdBy: node.createdBy || 'echo-ai',
      color: node.color,
      zIndex: node.zIndex || 1,
    } as CanvasNode;
  });
}
