'use client';
import { useState, useCallback, useRef } from 'react';
import { CanvasNode, CanvasConnector, CanvasState, Viewport } from '@/types/canvas';

const MAX_HISTORY = 50;

interface HistoryEntry {
  nodes: CanvasNode[];
  connectors: CanvasConnector[];
}

export function useCanvas(initialState?: Partial<CanvasState>) {
  const [nodes, setNodes] = useState<CanvasNode[]>(initialState?.nodes || []);
  const [connectors, setConnectors] = useState<CanvasConnector[]>(initialState?.connectors || []);
  const [viewport, setViewport] = useState<Viewport>(initialState?.viewport || { x: 0, y: 0, scale: 1 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string>('select');

  // Undo history
  const history = useRef<HistoryEntry[]>([]);
  const historyIndex = useRef<number>(-1);
  const skipHistory = useRef<boolean>(false);

  const saveHistory = useCallback((currentNodes: CanvasNode[], currentConnectors: CanvasConnector[]) => {
    if (skipHistory.current) return;
    // Trim future history on new action
    history.current = history.current.slice(0, historyIndex.current + 1);
    history.current.push({
      nodes: JSON.parse(JSON.stringify(currentNodes)),
      connectors: JSON.parse(JSON.stringify(currentConnectors)),
    });
    if (history.current.length > MAX_HISTORY) history.current.shift();
    historyIndex.current = history.current.length - 1;
  }, []);

  const undo = useCallback(() => {
    if (historyIndex.current <= 0) return;
    historyIndex.current -= 1;
    const entry = history.current[historyIndex.current];
    if (!entry) return;
    skipHistory.current = true;
    setNodes(entry.nodes);
    setConnectors(entry.connectors);
    setSelectedNodeId(null);
    skipHistory.current = false;
  }, []);

  const redo = useCallback(() => {
    if (historyIndex.current >= history.current.length - 1) return;
    historyIndex.current += 1;
    const entry = history.current[historyIndex.current];
    if (!entry) return;
    skipHistory.current = true;
    setNodes(entry.nodes);
    setConnectors(entry.connectors);
    setSelectedNodeId(null);
    skipHistory.current = false;
  }, []);

  const canUndo = historyIndex.current > 0;
  const canRedo = historyIndex.current < history.current.length - 1;

  const addNode = useCallback((node: CanvasNode, broadcast?: (node: CanvasNode) => void) => {
    setNodes((prev) => {
      const next = [...prev, node];
      saveHistory(next, connectors);
      return next;
    });
    broadcast?.(node);
  }, [connectors, saveHistory]);

  const addNodes = useCallback((newNodes: CanvasNode[], broadcast?: (nodes: CanvasNode[]) => void) => {
    setNodes((prev) => {
      const next = [...prev, ...newNodes];
      saveHistory(next, connectors);
      return next;
    });
    broadcast?.(newNodes);
  }, [connectors, saveHistory]);

  const updateNode = useCallback((update: Partial<CanvasNode> & { id: string }, broadcast?: (update: Partial<CanvasNode> & { id: string }) => void) => {
    setNodes((prev) => {
      const next = prev.map((n) => n.id === update.id ? { ...n, ...update } : n);
      // Only save history on non-position/size updates (position/size saves too much)
      if (!('position' in update) && !('size' in update)) {
        saveHistory(next, connectors);
      }
      return next;
    });
    broadcast?.(update);
  }, [connectors, saveHistory]);

  const deleteNode = useCallback((nodeId: string, broadcast?: (id: string) => void) => {
    setNodes((prev) => {
      const next = prev.filter((n) => n.id !== nodeId);
      const nextConnectors = connectors.filter((c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId);
      saveHistory(next, nextConnectors);
      return next;
    });
    setConnectors((prev) => prev.filter((c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    broadcast?.(nodeId);
  }, [connectors, selectedNodeId, saveHistory]);

  const addConnector = useCallback((connector: CanvasConnector, broadcast?: (c: CanvasConnector) => void) => {
    setConnectors((prev) => {
      const next = [...prev, connector];
      saveHistory(nodes, next);
      return next;
    });
    broadcast?.(connector);
  }, [nodes, saveHistory]);

  const addConnectors = useCallback((newConnectors: CanvasConnector[], broadcast?: (c: CanvasConnector[]) => void) => {
    if (newConnectors.length === 0) return;
    setConnectors((prev) => {
      const next = [...prev, ...newConnectors];
      saveHistory(nodes, next);
      return next;
    });
    broadcast?.(newConnectors);
  }, [nodes, saveHistory]);

  const deleteConnector = useCallback((connectorId: string, broadcast?: (id: string) => void) => {
    setConnectors((prev) => {
      const next = prev.filter((c) => c.id !== connectorId);
      saveHistory(nodes, next);
      return next;
    });
    broadcast?.(connectorId);
  }, [nodes, saveHistory]);

  const loadState = useCallback((state: CanvasState) => {
    setNodes(state.nodes || []);
    setConnectors(state.connectors || []);
    if (state.viewport) setViewport(state.viewport);
    // Reset history on state load
    history.current = [{ nodes: state.nodes || [], connectors: state.connectors || [] }];
    historyIndex.current = 0;
  }, []);

  const clearCanvas = useCallback(() => {
    saveHistory(nodes, connectors);
    setNodes([]);
    setConnectors([]);
    setSelectedNodeId(null);
  }, [nodes, connectors, saveHistory]);

  const panViewport = useCallback((dx: number, dy: number) => {
    setViewport((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  }, []);

  const zoomViewport = useCallback((delta: number, cx: number, cy: number) => {
    setViewport((v) => {
      const factor = delta > 0 ? 1.1 : 0.9;
      const newScale = Math.max(0.1, Math.min(4, v.scale * factor));
      const scaleChange = newScale / v.scale;
      return {
        scale: newScale,
        x: cx - (cx - v.x) * scaleChange,
        y: cy - (cy - v.y) * scaleChange,
      };
    });
  }, []);

  const applyRemoteViewport = useCallback((vp: Viewport) => {
    setViewport(vp);
  }, []);

  return {
    nodes,
    connectors,
    viewport,
    selectedNodeId,
    activeTool,
    canUndo,
    canRedo,
    setActiveTool,
    setSelectedNodeId,
    addNode,
    addNodes,
    updateNode,
    deleteNode,
    addConnector,
    addConnectors,
    deleteConnector,
    loadState,
    clearCanvas,
    panViewport,
    zoomViewport,
    applyRemoteViewport,
    setViewport,
    undo,
    redo,
  };
}
