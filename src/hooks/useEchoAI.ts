'use client';
import { useState, useCallback, useRef } from 'react';
import { CanvasNode, CanvasConnector } from '@/types/canvas';
import { TranscriptEntry } from '@/types/ai';
import { RoomMode, CommitReport } from '@/types/room';
import { generateLocalSemanticGraph } from '@/lib/aiClient';

export interface GeneratedElements {
  nodes: CanvasNode[];
  connectors: CanvasConnector[];
}

export function useEchoAI() {
  const [isThinking, setIsThinking] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [commitReport, setCommitReport] = useState<CommitReport | null>(null);
  const [echoMessage, setEchoMessage] = useState<string>('');
  const roomStartRef = useRef<number>(Date.now());

  const addTranscriptEntry = useCallback((entry: TranscriptEntry) => {
    setTranscript((prev) => [...prev, entry]);
  }, []);

  const generateNodes = useCallback(async (
    currentTranscript: TranscriptEntry[],
    mode: RoomMode,
    existingNodes: CanvasNode[],
    instruction?: string
  ): Promise<GeneratedElements> => {
    if (currentTranscript.length === 0 && !instruction) {
      return { nodes: [], connectors: [] };
    }
    setIsThinking(true);
    setEchoMessage('✦ Echo is analyzing conversation & mapping ideas…');
    try {
      const res = await fetch('/api/ai/generate-nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: currentTranscript, mode, existingNodes, userInstruction: instruction }),
      });
      const data = await res.json();
      const nodes: CanvasNode[] = data.nodes || [];
      const connectors: CanvasConnector[] = data.connectors || [];

      if (nodes.length === 0) {
        // Fallback to local semantic graph
        const fallback = generateLocalSemanticGraph(currentTranscript, mode, existingNodes, instruction);
        setEchoMessage(`✦ Generated ${fallback.nodes.length} elements & ${fallback.connectors.length} connections`);
        setTimeout(() => setEchoMessage(''), 3500);
        return fallback;
      }

      setEchoMessage(`✦ Generated ${nodes.length} elements & ${connectors.length} connections`);
      setTimeout(() => setEchoMessage(''), 3500);
      return { nodes, connectors };
    } catch (e) {
      console.warn('AI generation error, activating local semantic fallback:', e);
      const fallback = generateLocalSemanticGraph(currentTranscript, mode, existingNodes, instruction);
      setEchoMessage(`✦ Generated ${fallback.nodes.length} elements & ${fallback.connectors.length} connections`);
      setTimeout(() => setEchoMessage(''), 3500);
      return fallback;
    } finally {
      setIsThinking(false);
    }
  }, []);

  const generateCommitReport = useCallback(async (
    participants: string[],
    roomName: string
  ): Promise<CommitReport> => {
    setIsThinking(true);
    setEchoMessage('✦ Synthesizing meeting deliverables & action items…');
    try {
      const duration = Date.now() - roomStartRef.current;
      const res = await fetch('/api/ai/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, roomName, participants, duration }),
      });
      const report = await res.json();
      setCommitReport(report);
      setEchoMessage('✦ Executive report ready!');
      setTimeout(() => setEchoMessage(''), 3500);
      return report;
    } catch {
      const fallback: CommitReport = {
        summary: `Executive session completed for ${roomName}. Real-time visual canvas constructed across collaborative discussions.`,
        keyPoints: transcript.slice(-5).map((t) => t.text.substring(0, 80)),
        decisions: ['Agreed on living canvas visualization architecture.'],
        tasks: [{ title: 'Review generated action items and canvas hierarchy', assignee: participants[0] || 'Team', priority: 'high' }],
        nextSteps: ['Export deliverables and proceed with next development milestone.'],
        generatedAt: Date.now(),
      };
      setCommitReport(fallback);
      return fallback;
    } finally {
      setIsThinking(false);
    }
  }, [transcript]);

  const generateImage = useCallback(async (prompt: string): Promise<string | null> => {
    setIsThinking(true);
    setEchoMessage('✦ Rendering visual artwork…');
    try {
      const res = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      return data.url || null;
    } catch {
      return null;
    } finally {
      setIsThinking(false);
      setTimeout(() => setEchoMessage(''), 2000);
    }
  }, []);

  return {
    isThinking,
    transcript,
    commitReport,
    echoMessage,
    addTranscriptEntry,
    generateNodes,
    generateCommitReport,
    generateImage,
    setCommitReport,
  };
}
