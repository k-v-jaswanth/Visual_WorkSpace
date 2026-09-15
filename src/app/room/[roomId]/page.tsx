'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { User } from '@/types/room';
import { CanvasNode, CanvasConnector, RemoteCursor, Position, Viewport } from '@/types/canvas';
import { TranscriptEntry } from '@/types/ai';
import { RoomMode } from '@/types/room';

import { useCanvas } from '@/hooks/useCanvas';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useEchoAI } from '@/hooks/useEchoAI';
import { useSocket } from '@/hooks/useSocket';
import { getSocket } from '@/lib/socket';
import { createImageNode, createNode } from '@/lib/nodeFactory';
import { generateId } from '@/lib/canvasUtils';

import InfiniteCanvas from '@/components/canvas/InfiniteCanvas';
import VideoPanel from '@/components/video/VideoPanel';
import EchoPanel from '@/components/ai/EchoPanel';
import BottomToolbar from '@/components/toolbar/BottomToolbar';
import SimulationModal from '@/components/ai/SimulationModal';

const AUTO_GENERATE_THRESHOLD = 3;

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [currentUser, setCurrentUser] = useState<User>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('echo-user');
        if (stored) {
          const u = JSON.parse(stored);
          const userName = (u.name && u.name !== 'Anonymous' && u.name !== 'anon') ? u.name : 'Jaswanth';
          return { ...u, name: userName, micOn: true, cameraOn: true, isOwner: true };
        }
      } catch {}
    }
    return { id: 'usr-jaswanth', name: 'Jaswanth', color: '#7c3aed', micOn: true, cameraOn: true, isOwner: true };
  });
  const [remoteUsers, setRemoteUsers] = useState<User[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const [mode, setMode] = useState<RoomMode>('brainstorm');
  const [isFollowMe, setIsFollowMe] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; msg: string; type: string }>>([]);
  const [transcriptSinceLastGenerate, setTranscriptSinceLastGenerate] = useState(0);
  const [showVideoPanel, setShowVideoPanel] = useState(true);
  const [showEchoPanel, setShowEchoPanel] = useState(true);
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [penColor, setPenColor] = useState('#1e293b');
  const [penWidth, setPenWidth] = useState(4);
  const autoGenerateRef = useRef(false);

  const canvas = useCanvas();
  const echoAI = useEchoAI();
  const speech = useSpeechRecognition();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('echo-user');
      if (stored) {
        const u = JSON.parse(stored);
        const userName = (u.name && u.name !== 'Anonymous' && u.name !== 'anon') ? u.name : 'Jaswanth';
        setCurrentUser({ ...u, name: userName, micOn: true, cameraOn: true, isOwner: true });
      }
    } catch {}
  }, []);

  const socket = getSocket();
  const socketHook = useSocket({
    roomId,
    user: currentUser,
  });
  const webrtc = useWebRTC(
    socket,
    currentUser,
    remoteUsers
  );

  const showToast = useCallback((msg: string, type = 'info') => {
    const id = generateId();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  // ── Socket listeners ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;

    const off1 = socketHook.on('canvas:state', (data: unknown) => {
      const { state } = data as { state: import('@/types/canvas').CanvasState };
      canvas.loadState(state);
    });
    const off2 = socketHook.on('canvas:node-add', (data: unknown) => {
      const { node } = data as { node: CanvasNode };
      canvas.addNode(node);
    });
    const off3 = socketHook.on('canvas:node-update', (data: unknown) => {
      const { node } = data as { node: Partial<CanvasNode> & { id: string } };
      canvas.updateNode(node);
    });
    const off4 = socketHook.on('canvas:node-delete', (data: unknown) => {
      const { nodeId } = data as { nodeId: string };
      canvas.deleteNode(nodeId);
    });
    const offConnectorAdd = socketHook.on('canvas:connector-add', (data: unknown) => {
      const { connector } = data as { connector: CanvasConnector };
      canvas.addConnector(connector);
    });
    const offConnectorDel = socketHook.on('canvas:connector-delete', (data: unknown) => {
      const { connectorId } = data as { connectorId: string };
      canvas.deleteConnector(connectorId);
    });
    const off5 = socketHook.on('cursor:move', (data: unknown) => {
      const c = data as { userId: string; position: Position; name: string; color: string };
      if (c.userId === currentUser.id) return;
      setRemoteCursors((prev) => [...prev.filter((x) => x.userId !== c.userId), { userId: c.userId, userName: c.name, color: c.color, position: c.position }]);
    });
    const off6 = socketHook.on('room:users', (data: unknown) => {
      const { users } = data as { users: User[] };
      setRemoteUsers((prev) => {
        // Keep simulated users that aren't on socket
        const simUsers = prev.filter((u) => u.id.startsWith('sim-'));
        const realUsers = users.filter((u) => u.id !== currentUser.id && u.name !== 'Anonymous' && u.id !== 'anon');
        const combined = [...realUsers];
        simUsers.forEach((s) => {
          if (!combined.some((u) => u.id === s.id)) combined.push(s);
        });
        return combined;
      });
    });
    const off7 = socketHook.on('room:mode-change', (data: unknown) => {
      const { mode: m } = data as { mode: RoomMode };
      setMode(m);
    });
    const off8 = socketHook.on('room:follow-me', (data: unknown) => {
      const { userId, viewport } = data as { userId: string; viewport: Viewport };
      if (userId !== currentUser.id) {
        canvas.applyRemoteViewport(viewport);
        showToast('Following presenter view', 'info');
      }
    });
    const off9 = socketHook.on('ai:transcript', (data: unknown) => {
      const entry = data as TranscriptEntry;
      echoAI.addTranscriptEntry(entry);
    });
    const off10 = socketHook.on('ai:nodes-generated', (data: unknown) => {
      const { nodes, connectors } = data as { nodes: CanvasNode[]; connectors?: CanvasConnector[] };
      if (nodes && nodes.length > 0) canvas.addNodes(nodes);
      if (connectors && connectors.length > 0) canvas.addConnectors(connectors);
    });
    const off11 = socketHook.on('ai:commit-report', (data: unknown) => {
      const { report } = data as { report: import('@/types/room').CommitReport };
      echoAI.setCommitReport(report);
    });
    const off12 = socketHook.on('room:user-left', (data: unknown) => {
      const { userId } = data as { userId: string };
      setRemoteCursors((prev) => prev.filter((c) => c.userId !== userId));
    });

    return () => {
      [off1, off2, off3, off4, offConnectorAdd, offConnectorDel, off5, off6, off7, off8, off9, off10, off11, off12].forEach((off) => off?.());
    };
  }, [currentUser, socketHook, canvas, echoAI, showToast]);

  // ── Canvas broadcasts ────────────────────────────────────────────────────────
  const handleNodeAdd = useCallback((node: CanvasNode) => {
    canvas.addNode(node);
    socket.emit('canvas:node-add', { node });
  }, [canvas, socket]);

  const handleNodeUpdate = useCallback((update: Partial<CanvasNode> & { id: string }) => {
    canvas.updateNode(update);
    socket.emit('canvas:node-update', { node: update });
  }, [canvas, socket]);

  const handleNodeDelete = useCallback((nodeId: string) => {
    canvas.deleteNode(nodeId);
    socket.emit('canvas:node-delete', { nodeId });
  }, [canvas, socket]);

  const handleConnectorAdd = useCallback((connector: CanvasConnector) => {
    canvas.addConnector(connector);
    socket.emit('canvas:connector-add', { connector });
  }, [canvas, socket]);

  const handleCursorMove = useCallback((pos: Position) => {
    if (!currentUser) return;
    socket.emit('cursor:move', { userId: currentUser.id, position: pos, name: currentUser.name, color: currentUser.color });
  }, [socket, currentUser]);

  const handleViewportChange = useCallback((vp: Viewport) => {
    canvas.setViewport(vp);
  }, [canvas]);

  const handleModeChange = useCallback((m: RoomMode) => {
    setMode(m);
    socket.emit('room:mode-change', { mode: m });
    showToast(`Switched to ${m} mode`, 'info');
  }, [socket, showToast]);

  const handleFollowMe = useCallback(() => {
    const next = !isFollowMe;
    setIsFollowMe(next);
    if (next) {
      socket.emit('room:follow-me', { viewport: canvas.viewport });
      showToast('Follow Me active — others are watching your view', 'info');
    } else {
      showToast('Follow Me stopped', 'info');
    }
  }, [isFollowMe, socket, canvas.viewport, showToast]);

  useEffect(() => {
    if (isFollowMe) socket.emit('room:follow-me', { viewport: canvas.viewport });
  }, [canvas.viewport, isFollowMe, socket]);

  // ── Speech → transcript ──────────────────────────────────────────────────────
  const handleTranscriptEntry = useCallback((entry: TranscriptEntry) => {
    echoAI.addTranscriptEntry(entry);
    socket.emit('ai:transcript', entry);
    setTranscriptSinceLastGenerate((n) => n + 1);
  }, [echoAI, socket]);

  // Auto-generate nodes every AUTO_GENERATE_THRESHOLD entries
  useEffect(() => {
    if (transcriptSinceLastGenerate >= AUTO_GENERATE_THRESHOLD && !autoGenerateRef.current && !echoAI.isThinking) {
      autoGenerateRef.current = true;
      setTranscriptSinceLastGenerate(0);
      echoAI.generateNodes(echoAI.transcript, mode, canvas.nodes).then(({ nodes, connectors }) => {
        if (nodes.length > 0) {
          nodes.forEach((n) => { canvas.addNode(n); socket.emit('canvas:node-add', { node: n }); });
        }
        if (connectors && connectors.length > 0) {
          connectors.forEach((c) => { canvas.addConnector(c); socket.emit('canvas:connector-add', { connector: c }); });
        }
        if (nodes.length > 0 || (connectors && connectors.length > 0)) {
          socket.emit('ai:nodes-generated', { nodes, connectors });
          showToast(`✦ Echo added ${nodes.length} elements & ${connectors.length} connections`, 'info');
        }
        autoGenerateRef.current = false;
      });
    }
  }, [transcriptSinceLastGenerate, echoAI, mode, canvas, socket, showToast]);

  const handleGenerateNodes = useCallback(async () => {
    const { nodes, connectors } = await echoAI.generateNodes(echoAI.transcript, mode, canvas.nodes);
    if (nodes.length > 0) {
      nodes.forEach((n) => { canvas.addNode(n); socket.emit('canvas:node-add', { node: n }); });
    }
    if (connectors && connectors.length > 0) {
      connectors.forEach((c) => { canvas.addConnector(c); socket.emit('canvas:connector-add', { connector: c }); });
    }
    if (nodes.length > 0 || (connectors && connectors.length > 0)) {
      socket.emit('ai:nodes-generated', { nodes, connectors });
      showToast(`✦ Echo generated ${nodes.length} elements & ${connectors.length} connections`, 'info');
    }
  }, [echoAI, mode, canvas, socket, showToast]);

  const handleCommit = useCallback(async () => {
    if (!currentUser) return;
    const participants = [currentUser.name, ...remoteUsers.map((u) => u.name)];
    const report = await echoAI.generateCommitReport(participants, `Room ${roomId}`);
    socket.emit('ai:commit-report', { report });
    showToast('📋 Meeting deliverables & executive report generated!', 'info');
    setShowEchoPanel(true);
  }, [currentUser, remoteUsers, echoAI, roomId, socket, showToast]);

  const handleGenerateImage = useCallback(async (prompt: string) => {
    showToast('🖼️ Generating visual element…', 'info');
    const url = await echoAI.generateImage(prompt);
    if (url) {
      const node = createImageNode(url, prompt, { x: 220 + canvas.nodes.length * 24, y: 200 }, currentUser?.id || 'user');
      handleNodeAdd(node);
      showToast('🖼️ Image added to canvas!', 'info');
    } else {
      showToast('Image generation failed', 'error');
    }
  }, [echoAI, canvas.nodes, currentUser, handleNodeAdd, showToast]);

  const handleAskEcho = useCallback(async (text: string) => {
    const entry: TranscriptEntry = { id: generateId(), text, speaker: currentUser?.name || 'User', timestamp: Date.now() };
    handleTranscriptEntry(entry);
    const { nodes, connectors } = await echoAI.generateNodes(echoAI.transcript, mode, canvas.nodes, text);
    if (nodes.length > 0) {
      nodes.forEach((n) => { canvas.addNode(n); socket.emit('canvas:node-add', { node: n }); });
    }
    if (connectors && connectors.length > 0) {
      connectors.forEach((c) => { canvas.addConnector(c); socket.emit('canvas:connector-add', { connector: c }); });
    }
    if (nodes.length > 0 || (connectors && connectors.length > 0)) {
      socket.emit('ai:nodes-generated', { nodes, connectors });
    }
  }, [currentUser, echoAI, handleTranscriptEntry, mode, canvas, socket]);

  const handleSpeechToggle = useCallback(() => {
    if (!currentUser) return;
    speech.toggle(currentUser.name, handleTranscriptEntry);
  }, [speech, currentUser, handleTranscriptEntry]);

  // ── Simulation handlers ──────────────────────────────────────────────────────
  const handleAddSimUser = useCallback((simUser: User) => {
    setRemoteUsers((prev) => {
      if (prev.some((u) => u.id === simUser.id)) return prev;
      return [...prev, simUser];
    });
    showToast(`👤 ${simUser.name} joined the meeting`, 'info');
  }, [showToast]);

  const handleUploadImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file (PNG, JPG, WebP, etc.)', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const vp = canvas.viewport;
        const cx = (-vp.x + (typeof window !== 'undefined' ? window.innerWidth / 2 : 500)) / vp.scale;
        const cy = (-vp.y + (typeof window !== 'undefined' ? window.innerHeight / 2 : 400)) / vp.scale;

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
          { x: Math.round(cx - finalW / 2), y: Math.round(cy - finalH / 2) },
          {
            src: dataUrl,
            alt: file.name,
            caption: file.name,
          },
          currentUser.id
        );
        newNode.size = { width: finalW, height: finalH };
        canvas.addNode(newNode);
        socket.emit('canvas:node-add', { node: newNode });
        canvas.setSelectedNodeId(newNode.id);
        showToast(`Image "${file.name}" added to canvas!`, 'info');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [canvas, currentUser.id, socket, showToast]);

  const handleExportJSON = useCallback(() => {
    const state = {
      roomId,
      exportedAt: new Date().toISOString(),
      nodes: canvas.nodes,
      connectors: canvas.connectors,
      viewport: canvas.viewport,
      transcript: echoAI.transcript,
    };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `canvas-workspace-${roomId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Canvas diagram & transcript backup downloaded (JSON)!', 'info');
  }, [roomId, canvas, echoAI.transcript, showToast]);

  const handleLeaveMeeting = useCallback(() => {
    if (webrtc.localStream) {
      webrtc.localStream.getTracks().forEach((track) => track.stop());
    }
    if (currentUser) {
      socket.emit('room:leave', { userId: currentUser.id });
    }
    showToast('Left meeting', 'info');
    router.push('/');
  }, [webrtc.localStream, currentUser, socket, showToast, router]);

  const handleCommitAndEnd = useCallback(async () => {
    showToast('Generating meeting deliverables…', 'info');
    if (currentUser) {
      const participants = [currentUser.name, ...remoteUsers.map((u) => u.name)];
      const report = await echoAI.generateCommitReport(participants, `Room ${roomId}`);
      socket.emit('ai:commit-report', { report });

      // Automatically download summary markdown deliverable
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const mdContent = `# Meeting Report — Room ${roomId}\nGenerated at ${timeStr}\n\n## Executive Summary\n${report.summary}\n\n## Key Decisions\n${report.decisions.map((d) => `- [x] ${d}`).join('\n')}\n\n## Action Items\n${report.tasks.map((t) => `- [ ] **${t.title}** (${t.assignee || 'Unassigned'})`).join('\n')}\n\n## Next Steps\n${report.nextSteps.map((s) => `1. ${s}`).join('\n')}\n`;
      const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meeting-report-${roomId}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }

    if (webrtc.localStream) {
      webrtc.localStream.getTracks().forEach((track) => track.stop());
    }
    if (currentUser) {
      socket.emit('room:leave', { userId: currentUser.id });
    }
    showToast('Deliverables exported. Session ended.', 'info');
    router.push('/');
  }, [currentUser, remoteUsers, echoAI, roomId, socket, webrtc.localStream, showToast, router]);

  if (!currentUser) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '16px' }}>Loading workspace…</div>
      </div>
    );
  }

  return (
    <div className="workspace-layout">
      {/* ── Left: Video Panel ───────────────────────────────────────────── */}
      <div
        className={`sidebar-panel ${!showVideoPanel ? 'collapsed' : ''}`}
        style={{ width: showVideoPanel ? '320px' : '0' }}
      >
        <VideoPanel
          localUser={currentUser}
          remoteUsers={remoteUsers}
          localStream={webrtc.localStream}
          remoteStreams={webrtc.remoteStreams}
          micOn={webrtc.micOn}
          cameraOn={webrtc.cameraOn}
          isPhysicalCamera={webrtc.isPhysicalCamera}
          onRequestPhysicalCamera={webrtc.requestPhysicalCamera}
          isListening={speech.isListening}
          isThinking={echoAI.isThinking}
          onMicToggle={webrtc.toggleMic}
          onCameraToggle={webrtc.toggleCamera}
          onAskEcho={handleAskEcho}
          onSpeechToggle={handleSpeechToggle}
          onEndMeeting={() => setIsEndModalOpen(true)}
          onHidePanel={() => setShowVideoPanel(false)}
        />
        <button
          id="collapse-video-btn"
          className="sidebar-toggle-btn"
          style={{ right: -18, top: '50%', transform: 'translateY(-50%)', position: 'absolute' }}
          onClick={() => setShowVideoPanel(false)}
          title="Hide participants dashboard"
        >
          ‹
        </button>
      </div>

      {!showVideoPanel && (
        <button
          id="show-video-btn"
          style={{
            position: 'absolute',
            left: 12,
            top: 56,
            zIndex: 35,
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '20px',
            color: '#6d28d9',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onClick={() => setShowVideoPanel(true)}
          title="Show Participants (Click to open)"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
            e.currentTarget.style.borderColor = '#7c3aed';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.3)';
          }}
        >
          👥
        </button>
      )}

      {/* ── Center: Canvas ──────────────────────────────────────────────── */}
      <div className="workspace-center">
        {/* Top bar */}
        <div className="top-bar">
          <div className="room-id-badge">{roomId}</div>

          <button
            id="copy-link-btn"
            className="btn btn-ghost btn-sm"
            onClick={() => { navigator.clipboard.writeText(window.location.href); showToast('Room link copied!', 'info'); }}
          >
            🔗 Share
          </button>

          {/* Participants Dashboard Toggle Button */}
          <button
            id="toggle-participants-btn"
            className={`btn btn-sm ${showVideoPanel ? 'btn-primary' : 'btn-ghost'}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
              fontSize: '12px',
              background: showVideoPanel ? 'rgba(124, 58, 237, 0.2)' : 'transparent',
              borderColor: showVideoPanel ? 'rgba(124, 58, 237, 0.4)' : 'var(--border-subtle)',
              color: showVideoPanel ? '#c084fc' : 'var(--text-secondary)',
            }}
            onClick={() => setShowVideoPanel((prev) => !prev)}
            title={showVideoPanel ? 'Hide Participants Dashboard' : 'Show Participants Dashboard'}
          >
            <span>👥</span>
            <span>{showVideoPanel ? 'Hide Participants' : `Participants (${remoteUsers.length + 1})`}</span>
          </button>

          {/* Simulate Meeting Button */}
          <button
            id="simulate-demo-btn"
            className="btn btn-primary btn-sm animate-pulse-subtle"
            style={{
              background: 'linear-gradient(135deg, #6d28d9, #4f46e5)',
              border: 'none',
              fontWeight: 700,
              fontSize: '12px',
              padding: '5px 12px',
              boxShadow: '0 2px 10px rgba(109, 40, 217, 0.4)',
            }}
            onClick={() => setIsSimModalOpen(true)}
            title="Experience the canvas building itself autonomously"
          >
            🎭 Simulate Meeting
          </button>

          {speech.isListening && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#059669', fontWeight: 600 }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669', animation: 'pulse 1s infinite' }} />
              Listening
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Export deliverables */}
          <button
            id="export-canvas-btn"
            className="btn btn-ghost btn-sm"
            onClick={handleExportJSON}
            title="Export full workspace (nodes, connectors, AI transcript) as JSON backup"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid var(--border-subtle)',
              borderRadius: '7px',
              fontWeight: 600,
              fontSize: '12px',
            }}
          >
            <span>💾</span>
            <span>Export JSON</span>
          </button>

          {/* Undo/redo */}
          <button
            id="undo-btn"
            className="btn btn-ghost btn-sm"
            onClick={canvas.undo}
            disabled={!canvas.canUndo}
            title="Undo (Ctrl+Z)"
          >↩ Undo</button>
          <button
            id="redo-btn"
            className="btn btn-ghost btn-sm"
            onClick={canvas.redo}
            disabled={!canvas.canRedo}
            title="Redo (Ctrl+Y)"
          >↪ Redo</button>

          <button
            id="follow-me-btn"
            className={`btn btn-sm ${isFollowMe ? 'btn-primary' : 'btn-ghost'}`}
            onClick={handleFollowMe}
          >
            📌 {isFollowMe ? 'Following' : 'Follow Me'}
          </button>

          {/* End Meeting Button */}
          <button
            id="end-meeting-top-btn"
            className="btn btn-sm"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              fontWeight: 700,
              fontSize: '12px',
              padding: '4px 10px',
              borderRadius: '7px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={() => setIsEndModalOpen(true)}
            title="End or leave the meeting"
          >
            <span>🔴</span>
            <span>End Meeting</span>
          </button>

          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
            {canvas.nodes.length} nodes · {canvas.connectors.length} links
          </div>
        </div>

        {/* Canvas */}
        <div style={{ position: 'absolute', top: 44, left: 0, right: 0, bottom: 0 }}>
          <InfiniteCanvas
            nodes={canvas.nodes}
            connectors={canvas.connectors}
            viewport={canvas.viewport}
            selectedNodeId={canvas.selectedNodeId}
            activeTool={canvas.activeTool}
            remoteCursors={remoteCursors}
            currentUserId={currentUser.id}
            penColor={penColor}
            penWidth={penWidth}
            onViewportChange={handleViewportChange}
            onNodeSelect={(id) => canvas.setSelectedNodeId(id)}
            onNodeAdd={handleNodeAdd}
            onNodeUpdate={handleNodeUpdate}
            onNodeDelete={handleNodeDelete}
            onConnectorAdd={handleConnectorAdd}
            onConnectorDelete={(id) => {
              canvas.deleteConnector(id);
              socket.emit('canvas:connector-delete', { connectorId: id });
            }}
            onCursorMove={handleCursorMove}
            onUndo={canvas.undo}
            onRedo={canvas.redo}
          />

          <BottomToolbar
            activeTool={canvas.activeTool}
            onToolChange={canvas.setActiveTool}
            onCommit={handleCommit}
            canvasHasNodes={canvas.nodes.length > 0}
            penColor={penColor}
            onPenColorChange={setPenColor}
            penWidth={penWidth}
            onPenWidthChange={setPenWidth}
            onAddImageFile={handleUploadImageFile}
          />
        </div>
      </div>

      {!showEchoPanel && (
        <button
          id="show-echo-btn"
          className="sidebar-toggle-btn right-side"
          style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 30 }}
          onClick={() => setShowEchoPanel(true)}
          title="Show Echo panel"
        >
          ‹
        </button>
      )}

      {/* ── Right: Echo AI Panel ────────────────────────────────────────── */}
      <div
        className={`sidebar-panel ${!showEchoPanel ? 'collapsed' : ''}`}
        style={{ width: showEchoPanel ? '310px' : '0' }}
      >
        <EchoPanel
          mode={mode}
          transcript={echoAI.transcript}
          commitReport={echoAI.commitReport}
          echoMessage={echoAI.echoMessage}
          isThinking={echoAI.isThinking}
          interimText={speech.interimTranscript}
          speakerName={currentUser.name}
          onModeChange={handleModeChange}
          onCommit={handleCommit}
          onGenerateNodes={handleGenerateNodes}
          onGenerateImage={handleGenerateImage}
          onClose={() => setShowEchoPanel(false)}
        />
      </div>

      {/* Simulation Modal */}
      <SimulationModal
        isOpen={isSimModalOpen}
        onClose={() => setIsSimModalOpen(false)}
        onAddSimUser={handleAddSimUser}
        onAddTranscript={handleTranscriptEntry}
        onTriggerGenerate={handleGenerateNodes}
        currentUsers={[currentUser, ...remoteUsers]}
      />

      {/* End Meeting Confirmation Modal */}
      {isEndModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsEndModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#ef4444', flexShrink: 0,
              }}>
                🔴
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#fff' }}>End Meeting?</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Conclude session for Room {roomId}
                </p>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', marginBottom: '20px' }}>
              You can commit your meeting deliverables to download an executive summary and action items, or leave the session immediately.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                id="confirm-commit-end-btn"
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', padding: '12px', fontWeight: 600, fontSize: '13px' }}
                onClick={handleCommitAndEnd}
              >
                📋 Commit Deliverables &amp; End
              </button>

              <button
                id="confirm-leave-btn"
                className="btn btn-danger"
                style={{ padding: '12px', fontWeight: 600, fontSize: '13px' }}
                onClick={handleLeaveMeeting}
              >
                🚪 Leave Meeting Now
              </button>

              <button
                className="btn btn-ghost"
                onClick={() => setIsEndModalOpen(false)}
                style={{ marginTop: '4px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </div>
  );
}
