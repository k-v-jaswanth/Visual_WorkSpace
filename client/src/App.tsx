import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  MarkerType,
  ReactFlowProvider,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { io, Socket } from 'socket.io-client';
import {
  Sparkles,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  Share2,
  Check,
  Send,
  X,
  Bot,
  Sun,
  Moon,
  LogOut,
  Target,
  CheckCircle2,
  CheckSquare,
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  Trash2,
  LayoutDashboard,
  Maximize2,
  Users,
  Square,
  Volume2,
  Image as ImageIcon,
  StickyNote,
  Type,
} from 'lucide-react';

import { AuthModal, AuthUser } from './components/AuthModal';
import { Dashboard } from './components/Dashboard';
import { nodeTypes } from './components/CustomNodes';
import { CanvasToolbar, CanvasTool } from './components/CanvasToolbar';
import DrawingCanvas, { Stroke } from './components/DrawingCanvas';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface Participant {
  id: string; // socket.id
  userId?: string;
  name: string;
  avatarColor: string;
  initials: string;
  mic: boolean;
  camera: boolean;
  stream?: MediaStream;
}

interface ChatMessage {
  id?: string | number;
  room_id?: string;
  sender_name: string;
  body: string;
  type: string; // 'chat' | 'ai' | 'system'
  created_at?: string;
}

interface AIResult {
  summary: string;
  nodes: {
    id: string;
    type: 'Goal' | 'Decision' | 'Task' | 'Risk' | 'Question' | 'Idea';
    title: string;
    body: string;
    priority?: 'Critical' | 'High' | 'Medium' | 'Low';
    owner?: string;
    status?: string;
  }[];
  edges: {
    id?: string;
    source: string;
    target: string;
    label?: string;
  }[];
  nextSteps: string[];
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('cm_theme') as 'dark' | 'light') || 'dark';
  });

  // Auth state
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('cm_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('cm_token') || null;
  });

  // Room state
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(() => {
    return new URLSearchParams(window.location.search).get('room') || null;
  });
  const [roomTopic, setRoomTopic] = useState<string>('');

  // Canvas state
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);

  // Meeting & Collaboration state
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [transcript, setTranscript] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [camera, setCamera] = useState(true);
  const [mic, setMic] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [copied, setCopied] = useState(false);

  // Toolbar & Drawing state
  const [activeTool, setActiveTool] = useState<CanvasTool>('select');
  const [penColor, setPenColor] = useState('#f43f5e');
  const [penSize, setPenSize] = useState(4);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [undoneStrokes, setUndoneStrokes] = useState<Stroke[]>([]);
  const [nodesHistory, setNodesHistory] = useState<{ nodes: any[]; edges: any[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // References
  const socket = useRef<Socket | null>(null);
  const localVideo = useRef<HTMLVideoElement>(null);
  const peers = useRef<Record<string, RTCPeerConnection>>({});
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const recognition = useRef<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const copiedNodesRef = useRef<any[]>([]);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 220, y: 160 });
  const lastPointerClient = useRef<{ x: number; y: number }>({ x: 400, y: 300 });
  const rfRef = useRef<ReactFlowInstance | null>(null);
  const drawingHist = useRef<Stroke[][]>([[]]);
  const drawingIdx = useRef(0);
  const [drawRev, setDrawRev] = useState(0);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cm_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Verify token on initial load
  useEffect(() => {
    if (token) {
      fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) {
            handleSignOut();
          }
        })
        .catch(() => {});
    }
  }, [token]);

  const handleAuthenticated = (authUser: AuthUser, authToken: string) => {
    setUser(authUser);
    setToken(authToken);
  };

  const handleSignOut = () => {
    localStorage.removeItem('cm_token');
    localStorage.removeItem('cm_user');
    setUser(null);
    setToken(null);
    setCurrentRoomId(null);
    window.history.replaceState({}, '', window.location.pathname);
  };

  const enterRoom = (roomId: string) => {
    setCurrentRoomId(roomId);
    const newUrl = `${window.location.pathname}?room=${roomId}`;
    window.history.pushState({ room: roomId }, '', newUrl);
  };

  const leaveRoom = () => {
    if (socket.current) {
      socket.current.disconnect();
      socket.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    Object.values(peers.current).forEach((p) => p.close());
    peers.current = {};
    setCurrentRoomId(null);
    window.history.replaceState({}, '', window.location.pathname);
  };

  // -------------------------------------------------------------
  // WebRTC Setup
  // -------------------------------------------------------------
  const makePeer = useCallback((peerId: string, initiator: boolean) => {
    if (peers.current[peerId]) return peers.current[peerId];

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
      ],
    });
    peers.current[peerId] = pc;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, streamRef.current!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket.current) {
        socket.current.emit('webrtc:ice', { to: peerId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === peerId ? { ...p, stream: event.streams[0] } : p))
      );
    };

    if (initiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          socket.current?.emit('webrtc:offer', { to: peerId, offer: pc.localDescription });
        })
        .catch(console.error);
    }

    return pc;
  }, []);

  const startMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (localVideo.current) {
        localVideo.current.srcObject = stream;
        localVideo.current.muted = true;
        await localVideo.current.play().catch(() => {});
      }
      setCamera(true);
      setMic(true);
    } catch (err) {
      console.warn('Media capture permission not granted or devices unavailable:', err);
    }
  };

  // Toggle Mic
  const toggleMic = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      const newState = !mic;
      setMic(newState);
      socket.current?.emit('media:toggle', { roomId: currentRoomId, mic: newState });
    }
  };

  // Toggle Cam
  const toggleCam = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      const newState = !camera;
      setCamera(newState);
      socket.current?.emit('media:toggle', { roomId: currentRoomId, camera: newState });
    }
  };

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    if (!screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        Object.values(peers.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        if (localVideo.current) {
          localVideo.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          stopScreenShare();
        };

        setScreenSharing(true);
      } catch (err) {
        console.error('Screen sharing error:', err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (streamRef.current) {
      const camTrack = streamRef.current.getVideoTracks()[0];
      Object.values(peers.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && camTrack) {
          sender.replaceTrack(camTrack);
        }
      });
      if (localVideo.current) {
        localVideo.current.srcObject = streamRef.current;
      }
    }
    setScreenSharing(false);
  };

  // -------------------------------------------------------------
  // Room Connection & Socket Sync
  // -------------------------------------------------------------
  useEffect(() => {
    if (!user || !currentRoomId) return;

    startMedia();

    // Fetch room metadata & initial state
    fetch(`${API}/api/rooms/${currentRoomId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.room?.topic) setRoomTopic(data.room.topic);
        if (data.canvas?.nodes?.length) setNodes(data.canvas.nodes);
        if (data.canvas?.edges?.length) setEdges(data.canvas.edges);
        if (data.messages?.length) setMessages(data.messages);
      })
      .catch((err) => console.error('Failed to fetch initial room state:', err));

    const s = io(API, { transports: ['websocket', 'polling'] });
    socket.current = s;

    s.emit('room:join', {
      roomId: currentRoomId,
      userId: user.id,
      name: user.name,
      avatarColor: user.avatarColor,
      email: user.email,
    });

    s.on('room:state', (st: any) => {
      if (st.participants) setParticipants(st.participants);
      if (st.canvas?.nodes?.length) setNodes(st.canvas.nodes);
      if (st.canvas?.edges?.length) setEdges(st.canvas.edges);
      if (st.messages?.length) setMessages(st.messages);
    });

    s.on('room:participants', (ps: Participant[]) => {
      setParticipants(ps);
    });

    s.on('canvas:update', ({ nodes: newNodes, edges: newEdges }: any) => {
      if (newNodes) setNodes(newNodes);
      if (newEdges) setEdges(newEdges);
    });

    s.on('chat:message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    s.on('webrtc:new-peer', ({ id }: { id: string }) => {
      makePeer(id, true);
    });

    s.on('webrtc:offer', async ({ from, offer }: any) => {
      const pc = makePeer(from, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      s.emit('webrtc:answer', { to: from, answer });
    });

    s.on('webrtc:answer', async ({ from, answer }: any) => {
      const pc = peers.current[from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    s.on('webrtc:ice', async ({ from, candidate }: any) => {
      const pc = peers.current[from];
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('ICE candidate addition failed:', e);
        }
      }
    });

    s.on('webrtc:peer-left', ({ id }: { id: string }) => {
      if (peers.current[id]) {
        peers.current[id].close();
        delete peers.current[id];
      }
    });

    return () => {
      s.disconnect();
      socket.current = null;
      Object.values(peers.current).forEach((p) => p.close());
      peers.current = {};
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [user, currentRoomId, makePeer]);

  // Sync canvas modifications with debounced emit
  const syncCanvas = useCallback(
    (nextNodes: any[], nextEdges: any[]) => {
      if (!currentRoomId || !socket.current) return;
      socket.current.emit('canvas:update', {
        roomId: currentRoomId,
        nodes: nextNodes,
        edges: nextEdges,
      });
    },
    [currentRoomId]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        id: `e-${uid()}`,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 2 },
      };
      setEdges((eds) => {
        const next = addEdge(edge, eds);
        syncCanvas(nodes, next);
        return next;
      });
    },
    [edges, nodes, syncCanvas]
  );

  // -------------------------------------------------------------
  // Manual Node Additions (all types)
  // -------------------------------------------------------------
  const addManualNode = (type: 'Goal' | 'Decision' | 'Task' | 'Risk' | 'Question' | 'Idea' | 'Sticky' | 'Text' | 'Reaction') => {
    const titles: Record<string, string> = {
      Goal: 'New Project Goal',
      Decision: 'Architectural Decision',
      Task: 'Sprint Action Item',
      Risk: 'Potential Risk / Blocker',
      Question: 'Open Team Question',
      Idea: 'Brainstorm Concept',
      Sticky: 'Click to add a note...',
      Text: 'Text Label',
      Reaction: '❤️',
    };

    const newNode = {
      id: `node-${type.toLowerCase()}-${uid()}`,
      type,
      position: {
        x: 120 + (nodes.length % 4) * 300,
        y: 100 + Math.floor(nodes.length / 4) * 220,
      },
      data: {
        title: titles[type],
        body: type === 'Sticky' ? titles[type] : (
          type === 'Text' ? '' : `New ${type.toLowerCase()} added to the canvas.`
        ),
        status: type === 'Goal' ? 'In Progress' : type === 'Decision' ? 'Approved' : undefined,
        priority: type === 'Task' ? 'High' : type === 'Risk' ? 'Critical' : undefined,
        owner: type === 'Task' ? user?.name : undefined,
      },
    };

    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes);
    syncCanvas(nextNodes, edges);
    pushHistory(nextNodes, edges);
  };

  // -------------------------------------------------------------
  // Undo / Redo logic (for node state history)
  // -------------------------------------------------------------
  const pushHistory = useCallback((nextNodes: any[], nextEdges: any[]) => {
    setNodesHistory((h) => {
      const trimmed = historyIndex >= 0 ? h.slice(0, historyIndex + 1) : h;
      const updated = [...trimmed, { nodes: nextNodes, edges: nextEdges }];
      setHistoryIndex(updated.length - 1);
      return updated;
    });
  }, [historyIndex]);

  const commitStrokes = useCallback((next: Stroke[]) => {
    const trimmed = drawingHist.current.slice(0, drawingIdx.current + 1);
    trimmed.push(next);
    drawingHist.current = trimmed;
    drawingIdx.current = trimmed.length - 1;
    setStrokes(next);
    setDrawRev((n) => n + 1);
  }, []);

  const handleUndo = useCallback(() => {
    if (drawingIdx.current > 0) {
      drawingIdx.current -= 1;
      setStrokes(drawingHist.current[drawingIdx.current]);
      setDrawRev((n) => n + 1);
      return;
    }
    if (historyIndex > 0) {
      const prev = nodesHistory[historyIndex - 1];
      setNodes(prev.nodes);
      setEdges(prev.edges);
      setHistoryIndex((i) => i - 1);
      syncCanvas(prev.nodes, prev.edges);
    }
  }, [historyIndex, nodesHistory, syncCanvas]);

  const handleRedo = useCallback(() => {
    if (drawingIdx.current < drawingHist.current.length - 1) {
      drawingIdx.current += 1;
      setStrokes(drawingHist.current[drawingIdx.current]);
      setDrawRev((n) => n + 1);
      return;
    }
    if (historyIndex < nodesHistory.length - 1) {
      const next = nodesHistory[historyIndex + 1];
      setNodes(next.nodes);
      setEdges(next.edges);
      setHistoryIndex((i) => i + 1);
      syncCanvas(next.nodes, next.edges);
    }
  }, [historyIndex, nodesHistory, syncCanvas]);

  // Ctrl+Z / Ctrl+Y global shortcuts
  useEffect(() => {
    if (!currentRoomId) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentRoomId, handleUndo, handleRedo]);

  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (!rfRef.current) return;
      if (activeTool === 'select' || activeTool === 'hand' || activeTool === 'pencil' || activeTool === 'eraser') {
        return;
      }

      const pos = rfRef.current.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      let newNode: any = null;

      if (activeTool === 'sticky') {
        newNode = {
          id: `node-sticky-${uid()}`,
          type: 'Sticky',
          position: pos,
          style: { width: 220, height: 180 },
          data: { title: 'Sticky note', body: '' },
        };
      } else if (activeTool === 'text') {
        newNode = {
          id: `node-text-${uid()}`,
          type: 'Text',
          position: pos,
          style: { width: 220, height: 72 },
          data: { title: 'Text label' },
        };
      } else if (activeTool === 'reaction') {
        newNode = {
          id: `node-reaction-${uid()}`,
          type: 'Reaction',
          position: pos,
          style: { width: 100, height: 100 },
          data: { title: '❤️' },
        };
      } else if (activeTool === 'comment') {
        newNode = {
          id: `node-comment-${uid()}`,
          type: 'Comment',
          position: pos,
          style: { width: 240, height: 130 },
          data: { title: 'Comment', body: '', author: user?.name || 'You' },
        };
      } else if (activeTool.startsWith('shape-')) {
        const presets: Record<string, { shape: string; fill: string; w: number; h: number }> = {
          'shape-rect': { shape: 'rect', fill: '#3b82f6', w: 170, h: 110 },
          'shape-circle': { shape: 'circle', fill: '#f43f5e', w: 140, h: 140 },
          'shape-triangle': { shape: 'triangle', fill: '#f59e0b', w: 150, h: 130 },
          'shape-line': { shape: 'line', fill: '#0f172a', w: 240, h: 28 },
        };
        const p = presets[activeTool];
        if (p) {
          newNode = {
            id: `node-shape-${uid()}`,
            type: 'Shape',
            position: pos,
            style: { width: p.w, height: p.h },
            data: { title: p.shape, shape: p.shape, fill: p.fill, width: p.w, height: p.h },
          };
        }
      }

      if (newNode) {
        setNodes((current) => {
          const next = [...current, newNode];
          syncCanvas(next, edges);
          pushHistory(next, edges);
          return next;
        });
      }
    },
    [activeTool, edges, syncCanvas, pushHistory, user?.name]
  );

  const clearCanvas = () => {
    if (confirm('Are you sure you want to clear the canvas for all participants?')) {
      setNodes([]);
      setEdges([]);
      setStrokes([]);
      setUndoneStrokes([]);
      drawingHist.current = [[]];
      drawingIdx.current = 0;
      setDrawRev((n) => n + 1);
      syncCanvas([], []);
    }
  };



  // -------------------------------------------------------------
  // Clipboard Image Paste & Screenshot Handling (Snipping Tool, Print Screen, Ctrl+V)
  // -------------------------------------------------------------
  const insertImageNode = useCallback(
    (imageUrl: string, title?: string, position?: { x: number; y: number }) => {
      const pos =
        position ||
        (rfRef.current
          ? rfRef.current.screenToFlowPosition(lastPointerClient.current)
          : {
              x: Math.max(60, (lastMousePos.current?.x || 200) - 120),
              y: Math.max(60, (lastMousePos.current?.y || 160) - 60),
            });

      const newImageNode = {
        id: `node-img-${uid()}`,
        type: 'Image',
        position: pos,
        style: { width: 380, height: 280 },
        data: {
          title:
            title ||
            `Screenshot ${new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}`,
          imageUrl,
          caption: 'Pasted from clipboard (Snipping Tool / Print Screen)',
          status: 'Image',
          width: 380,
          height: 280,
          minimized: false,
        },
      };

      setNodes((current) => {
        const next = [
          ...current.map((n) => ({ ...n, selected: false })),
          { ...newImageNode, selected: true },
        ];
        syncCanvas(next, edges);
        return next;
      });

      setToastMessage('📸 Screenshot pasted onto whiteboard!');
      setTimeout(() => setToastMessage(null), 3000);
      setActiveTool('select');
    },
    [edges, syncCanvas, setNodes]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        const rect = e.currentTarget.getBoundingClientRect();
        const dropPos = rfRef.current
          ? rfRef.current.screenToFlowPosition({ x: e.clientX, y: e.clientY })
          : {
              x: e.clientX - rect.left - 120,
              y: e.clientY - rect.top - 60,
            };
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          if (dataUrl) {
            insertImageNode(dataUrl, file.name || 'Dropped Screenshot', dropPos);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const addImageFromFile = useCallback(
    (file: File, position?: { x: number; y: number }) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) insertImageNode(dataUrl, file.name || 'Uploaded Screenshot', position);
      };
      reader.readAsDataURL(file);
    },
    [insertImageNode]
  );

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addImageFromFile(file);
    e.target.value = '';
  };

  // Global listeners for Paste (Ctrl+V) & Copy (Ctrl+C)
  useEffect(() => {
    if (!currentRoomId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const canvasEl = document.querySelector('.reactflow-wrapper');
      if (canvasEl) {
        const rect = canvasEl.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          lastMousePos.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          };
          lastPointerClient.current = { x: e.clientX, y: e.clientY };
        }
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      // 1. Check if an image is in the clipboard (from Snipping Tool, Print Screen, copied screenshot)
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
              insertImageNode(dataUrl, 'Pasted Screenshot');
            }
          };
          reader.readAsDataURL(file);
          return;
        }
      }

      // 2. If no image, check if user is pasting previously copied canvas nodes (Ctrl+V)
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag !== 'input' && activeTag !== 'textarea') {
        if (copiedNodesRef.current.length > 0) {
          e.preventDefault();
          const duplicates = copiedNodesRef.current.map((cn, idx) => ({
            ...cn,
            id: `node-${cn.type?.toLowerCase() || 'copy'}-${uid()}`,
            position: {
              x: (cn.position?.x || 120) + 40 + idx * 20,
              y: (cn.position?.y || 100) + 40 + idx * 20,
            },
            selected: false,
          }));
          setNodes((current) => {
            const updated = [...current, ...duplicates];
            syncCanvas(updated, edges);
            return updated;
          });
          setToastMessage(`📋 Pasted ${duplicates.length} node(s)`);
          setTimeout(() => setToastMessage(null), 2500);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      // Copy selected nodes (Ctrl+C / Cmd+C)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        const selected = nodes.filter((n) => n.selected);
        if (selected.length > 0) {
          copiedNodesRef.current = selected;
          setToastMessage(`✂️ Copied ${selected.length} node(s) to clipboard`);
          setTimeout(() => setToastMessage(null), 2000);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('paste', handlePaste);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentRoomId, nodes, edges, insertImageNode, syncCanvas, setNodes]);

  // -------------------------------------------------------------
  // AI Transformation & Speech Engine
  // -------------------------------------------------------------
  const addAIToCanvas = useCallback(
    (result: AIResult) => {
      const baseX = 80;
      const baseY = 80;
      const colWidth = 320;
      const rowHeight = 220;

      // Group nodes layout: Goals first, then Decisions, Tasks, Risks
      const orderedTypes = ['Goal', 'Decision', 'Task', 'Risk', 'Question', 'Idea'];
      const sortedNodes = [...result.nodes].sort(
        (a, b) => orderedTypes.indexOf(a.type) - orderedTypes.indexOf(b.type)
      );

      const newCanvasNodes = sortedNodes.map((n, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        return {
          id: n.id || `node-${n.type.toLowerCase()}-${uid()}`,
          type: n.type,
          position: {
            x: baseX + col * colWidth,
            y: baseY + row * rowHeight,
          },
          data: {
            title: n.title,
            body: n.body,
            priority: n.priority,
            owner: n.owner,
            status: n.status || 'Active',
          },
        };
      });

      const newCanvasEdges = result.edges.map((e) => ({
        id: e.id || `edge-${uid()}`,
        source: e.source,
        target: e.target,
        label: e.label,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 2 },
      }));

      setNodes(newCanvasNodes);
      setEdges(newCanvasEdges);
      syncCanvas(newCanvasNodes, newCanvasEdges);
    },
    [syncCanvas, setNodes, setEdges]
  );

  const analyzeTranscript = async (customPrompt?: string) => {
    const textToAnalyze = customPrompt || transcript;
    if (!textToAnalyze.trim()) return;

    setAiBusy(true);

    // Save prompt to chat
    if (socket.current && currentRoomId) {
      socket.current.emit('chat:message', {
        roomId: currentRoomId,
        userId: user?.id,
        name: user?.name || 'You',
        text: textToAnalyze,
        type: 'chat',
      });
    }

    try {
      const res = await fetch(`${API}/api/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ transcript: textToAnalyze }),
      });

      if (!res.ok) throw new Error('AI analysis request failed.');
      const result: AIResult = await res.json();

      // Push AI summary to chat
      if (socket.current && currentRoomId) {
        socket.current.emit('chat:message', {
          roomId: currentRoomId,
          name: 'Canvas Copilot',
          text: result.summary,
          type: 'ai',
        });
      }

      addAIToCanvas(result);
      setTranscript('');
    } catch (err: any) {
      console.error('AI analysis error:', err);
    } finally {
      setAiBusy(false);
    }
  };

  // Speech Recognition
  const startSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Live speech recognition is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }

    try {
      const recognizer = new SpeechRecognition();
      recognition.current = recognizer;
      recognizer.continuous = true;
      recognizer.interimResults = true;

      recognizer.onresult = (event: any) => {
        let text = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          text += event.results[i][0].transcript + ' ';
        }
        setTranscript(text);
      };

      recognizer.onerror = (e: any) => {
        console.warn('Speech recognition event:', e.error);
      };

      recognizer.onend = () => {
        setListening(false);
      };

      recognizer.start();
      setListening(true);
    } catch (err) {
      console.error('Speech recognition initiation error:', err);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognition.current) {
      recognition.current.stop();
      recognition.current = null;
    }
    setListening(false);
  };

  // Send Chat message manually
  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript.trim() || !socket.current || !currentRoomId) return;

    socket.current.emit('chat:message', {
      roomId: currentRoomId,
      userId: user?.id,
      name: user?.name || 'You',
      text: transcript.trim(),
      type: 'chat',
    });

    setTranscript('');
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${currentRoomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // -------------------------------------------------------------
  // Routing Views
  // -------------------------------------------------------------

  // View 1: Authentication Modal (Real Sign Up & Sign In)
  if (!user || !token) {
    return (
      <AuthModal
        apiBase={API}
        onAuthenticated={handleAuthenticated}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // View 2: Dashboard / Lobby
  if (!currentRoomId) {
    return (
      <Dashboard
        apiBase={API}
        user={user}
        token={token}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSelectRoom={enterRoom}
        onSignOut={handleSignOut}
      />
    );
  }

  // View 3: Active Workspace Meeting & Canvas
  return (
    <div className="workspace-app">
      {/* App Header */}
      <header className="workspace-header">
        <div className="header-left">
          <button className="hub-back-btn" onClick={leaveRoom} title="Back to Workspace Hub">
            <LayoutDashboard size={18} />
          </button>
          <div className="brand-logo">
            <Sparkles size={18} />
            <span>CanvasMeet</span>
          </div>
          <div className="room-meta">
            <span className="room-badge">ROOM</span>
            <span className="room-title-text">{currentRoomId}</span>
            {roomTopic && <span className="room-topic-badge">{roomTopic}</span>}
          </div>
        </div>

        <div className="header-center">
          <div className="live-status-badge">
            <span className="live-dot" />
            <span>{participants.length} Active Collaborators</span>
          </div>
        </div>

        <div className="header-right">
          {/* Share Button */}
          <button className="btn-share" onClick={copyShareLink}>
            {copied ? <Check size={16} className="text-emerald" /> : <Share2 size={16} />}
            <span>{copied ? 'Link Copied!' : 'Share Room'}</span>
          </button>

          {/* Theme Switcher */}
          <button
            className="btn-theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* User Profile */}
          <div className="user-dropdown-btn">
            <div
              className="user-avatar-circle"
              style={{ backgroundColor: user.avatarColor || '#7c3aed' }}
            >
              {(user.name || 'U').slice(0, 2).toUpperCase()}
            </div>
            <span className="user-display-name">{user.name.split(' ')[0]}</span>
            <button className="btn-logout" onClick={handleSignOut} title="Sign Out">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="workspace-main">
        {/* Left Panel: Meeting Video & Attendees */}
        <aside className="meeting-panel">
          <div className="panel-section-title">
            <span>LIVE MEETING</span>
            <span className="peer-count">{participants.length} online</span>
          </div>

          {/* Video Grid */}
          <div className="video-tiles-grid">
            {/* Local Video */}
            <div className="video-card local-card">
              <video ref={localVideo} autoPlay playsInline muted />
              <div className="video-card-footer">
                <span className="user-label">
                  {user.name} (You)
                </span>
                <div className="stream-indicators">
                  {mic ? <Volume2 size={13} className="text-emerald" /> : <MicOff size={13} className="text-rose" />}
                  {!camera && <VideoOff size={13} className="text-rose" />}
                </div>
              </div>
            </div>

            {/* Remote Peer Videos */}
            {participants
              .filter((p) => p.id !== socket.current?.id)
              .map((peer) => (
                <div className="video-card peer-card" key={peer.id}>
                  {peer.stream ? (
                    <video
                      autoPlay
                      playsInline
                      ref={(el) => {
                        if (el) el.srcObject = peer.stream!;
                      }}
                    />
                  ) : (
                    <div
                      className="avatar-placeholder"
                      style={{ backgroundColor: peer.avatarColor }}
                    >
                      <span>{peer.initials}</span>
                    </div>
                  )}
                  <div className="video-card-footer">
                    <span className="user-label">{peer.name}</span>
                    <div className="stream-indicators">
                      {peer.mic ? <Volume2 size={13} /> : <MicOff size={13} className="text-rose" />}
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Meeting Controls Bar */}
          <div className="meeting-toolbar">
            <button
              className={`ctrl-btn ${!mic ? 'muted' : ''}`}
              onClick={toggleMic}
              title={mic ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {mic ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            <button
              className={`ctrl-btn ${!camera ? 'muted' : ''}`}
              onClick={toggleCam}
              title={camera ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {camera ? <Video size={18} /> : <VideoOff size={18} />}
            </button>
            <button
              className={`ctrl-btn ${screenSharing ? 'active-share' : ''}`}
              onClick={toggleScreenShare}
              title="Share Screen"
            >
              <MonitorUp size={18} />
            </button>
            <button className="ctrl-btn leave-btn" onClick={leaveRoom} title="Leave Session">
              <Square size={17} />
            </button>
          </div>

          {/* Attendees List */}
          <div className="attendees-section">
            <div className="panel-section-title">
              <span>COLLABORATORS</span>
              <Users size={14} />
            </div>
            <div className="attendees-list">
              <div className="attendee-item you-item">
                <span className="attendee-dot" style={{ backgroundColor: user.avatarColor }} />
                <span className="attendee-name">{user.name}</span>
                <span className="attendee-tag">Host</span>
              </div>
              {participants
                .filter((p) => p.id !== socket.current?.id)
                .map((peer) => (
                  <div className="attendee-item" key={peer.id}>
                    <span className="attendee-dot" style={{ backgroundColor: peer.avatarColor }} />
                    <span className="attendee-name">{peer.name}</span>
                  </div>
                ))}
            </div>
          </div>
        </aside>

        {/* Center: Interactive AI Visual Canvas */}
        <section className="canvas-section">
          {/* Canvas Floating Toolbar */}
          <div className="canvas-header-toolbar">
            <div className="toolbar-left">
              <span className="canvas-heading">Shared Canvas</span>
              <span className="node-count-badge">{nodes.length} Elements</span>
            </div>

            <div className="canvas-quick-add-group">
              <button
                className="add-node-btn btn-add-goal"
                onClick={() => addManualNode('Goal')}
                title="Add Goal"
              >
                <Target size={14} />
                <span>+ Goal</span>
              </button>
              <button
                className="add-node-btn btn-add-dec"
                onClick={() => addManualNode('Decision')}
                title="Add Decision"
              >
                <CheckCircle2 size={14} />
                <span>+ Decision</span>
              </button>
              <button
                className="add-node-btn btn-add-task"
                onClick={() => addManualNode('Task')}
                title="Add Task"
              >
                <CheckSquare size={14} />
                <span>+ Task</span>
              </button>
              <button
                className="add-node-btn btn-add-risk"
                onClick={() => addManualNode('Risk')}
                title="Add Risk"
              >
                <AlertTriangle size={14} />
                <span>+ Risk</span>
              </button>
              <button
                className="add-node-btn btn-add-question"
                onClick={() => addManualNode('Question')}
                title="Add Question"
              >
                <HelpCircle size={14} />
                <span>+ Question</span>
              </button>
              <button
                className="add-node-btn btn-add-idea"
                onClick={() => addManualNode('Idea')}
                title="Add Idea"
              >
                <Lightbulb size={14} />
                <span>+ Idea</span>
              </button>
              <label className="add-node-btn btn-add-image" title="Upload image or press Ctrl+V to paste screenshot">
                <ImageIcon size={14} />
                <span>+ Image / Screenshot</span>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageFileUpload}
                />
              </label>

              <div className="toolbar-divider" />

              <button className="tool-icon-btn" onClick={clearCanvas} title="Clear Canvas">
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* ReactFlow Interactive Canvas */}
          <ReactFlowProvider>
          <div
            className={`reactflow-wrapper tool-${activeTool}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {toastMessage && <div className="paste-toast">{toastMessage}</div>}
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onInit={(instance) => {
                rfRef.current = instance;
              }}
              onPaneClick={handlePaneClick}
              onNodesChange={(changes) => {
                const next = applyNodeChanges(changes, nodes);
                onNodesChange(changes);
                syncCanvas(next, edges);
              }}
              onEdgesChange={(changes) => {
                const next = applyEdgeChanges(changes, edges);
                onEdgesChange(changes);
                syncCanvas(nodes, next);
              }}
              onConnect={onConnect}
              panOnDrag={activeTool === 'hand' ? true : [1, 2]}
              selectionOnDrag={activeTool === 'select'}
              nodesDraggable={activeTool === 'select'}
              nodesConnectable={activeTool === 'select'}
              elementsSelectable={activeTool === 'select'}
              panOnScroll
              zoomOnDoubleClick={activeTool === 'select' || activeTool === 'hand'}
              fitView
              minZoom={0.2}
              maxZoom={3}
              attributionPosition="bottom-left"
            >
              <Background
                gap={24}
                size={1}
                color={theme === 'dark' ? '#252236' : '#cbd5e1'}
              />
              <MiniMap
                nodeColor={() => (theme === 'dark' ? '#7c3aed' : '#8b5cf6')}
                maskColor={theme === 'dark' ? 'rgba(11, 11, 16, 0.7)' : 'rgba(241, 245, 249, 0.7)'}
              />
            </ReactFlow>

            <DrawingCanvas
              active={activeTool === 'pencil' || activeTool === 'eraser'}
              tool={activeTool === 'eraser' ? 'eraser' : 'pencil'}
              color={penColor}
              size={penSize}
              strokes={strokes}
              onStrokesChange={commitStrokes}
            />

            <CanvasToolbar
              activeTool={activeTool}
              onToolChange={setActiveTool}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={(drawRev >= 0 && drawingIdx.current > 0) || historyIndex > 0}
              canRedo={(drawRev >= 0 && drawingIdx.current < drawingHist.current.length - 1) || historyIndex < nodesHistory.length - 1}
              penColor={penColor}
              onPenColorChange={setPenColor}
              penSize={penSize}
              onPenSizeChange={setPenSize}
              onImageUpload={addImageFromFile}
            />

            {/* Empty State Overlay */}
            {nodes.length === 0 && strokes.length === 0 && (
              <div className="empty-canvas-prompt">
                <div className="prompt-icon-glow">
                  <Sparkles size={36} />
                </div>
                <h3>The Conversation Becomes The Canvas</h3>
                <p>
                  Speak or type ideas below, or take a screenshot with <strong>Snipping Tool / Print Screen</strong> and press <strong>Ctrl+V</strong> to paste directly onto the whiteboard!
                </p>
                <div className="prompt-suggestions">
                  <button
                    className="suggestion-btn"
                    onClick={() => {
                      const demo =
                        'We should launch the mobile beta next Friday. Priya owns design and UX polish, Sam owns backend infrastructure. The biggest risk is onboarding latency.';
                      setTranscript(demo);
                      analyzeTranscript(demo);
                    }}
                  >
                    <Sparkles size={14} />
                    <span>Run Mobile Beta Launch Demo</span>
                  </button>
                  <button
                    className="suggestion-btn"
                    onClick={() => {
                      const archDemo =
                        'Architecture decision: Migrate to PostgreSQL with Docker. Sarah owns database migrations, Alex will handle WebRTC TURN server. Risk of connection drop on restricted networks.';
                      setTranscript(archDemo);
                      analyzeTranscript(archDemo);
                    }}
                  >
                    <Sparkles size={14} />
                    <span>Run Architecture Sync Demo</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          </ReactFlowProvider>

          {/* Bottom AI Conversation & Speech Composer */}
          <div className="conversation-composer">
            <div className="composer-row">
              {/* Mic / Voice Capture Button */}
              <button
                className={`btn-voice-input ${listening ? 'listening-pulse' : ''}`}
                onClick={listening ? stopSpeechRecognition : startSpeechRecognition}
                title={listening ? 'Stop Listening' : 'Speak to Canvas (Speech Recognition)'}
              >
                {listening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {/* Natural Language Input */}
              <textarea
                className="composer-textarea"
                placeholder="Talk or type: e.g. 'We decided to ship next Friday. Priya owns design. Sam owns backend. Latency is the primary risk.'"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    analyzeTranscript();
                  }
                }}
              />

              {/* AI Transform Sparkle Button */}
              <button
                className="btn-ai-generate"
                onClick={() => analyzeTranscript()}
                disabled={aiBusy || !transcript.trim()}
                title="Transform Discussion to Canvas"
              >
                {aiBusy ? (
                  <div className="btn-spinner" />
                ) : (
                  <>
                    <Sparkles size={17} />
                    <span>Structure Canvas</span>
                  </>
                )}
              </button>

              {/* Send to Chat Button */}
              <button
                className="btn-send-chat"
                onClick={sendChatMessage}
                disabled={!transcript.trim()}
                title="Send as Chat Message"
              >
                <Send size={16} />
              </button>
            </div>

            <div className="composer-footer">
              <div className="ai-hint">
                <Sparkles size={12} />
                <span>
                  {listening
                    ? 'AI is actively listening to your speech...'
                    : 'AI recognizes goals, decisions, assignees, priorities, and blockers automatically.'}
                </span>
              </div>
              <div className="quick-action-pills">
                <button
                  onClick={() =>
                    analyzeTranscript(
                      'Synthesize key project goals and immediate action items with assignees.'
                    )
                  }
                >
                  Action Items
                </button>
                <button
                  onClick={() =>
                    analyzeTranscript('Spot risks, blockers, and architecture dependencies.')
                  }
                >
                  Spot Risks
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Right Panel: Live Discussion & Copilot Thread */}
        {showChat && (
          <aside className="chat-panel">
            <div className="chat-panel-head">
              <div className="chat-title">
                <Bot size={18} />
                <div>
                  <h4>Workspace Copilot & Chat</h4>
                  <small>Real-time team discussion</small>
                </div>
              </div>
              <button
                className="btn-close-panel"
                onClick={() => setShowChat(false)}
                title="Collapse Chat"
              >
                <X size={16} />
              </button>
            </div>

            <div className="chat-messages-scroll">
              {messages.length === 0 ? (
                <div className="chat-empty-hint">
                  <Bot size={32} />
                  <h5>AI Copilot Ready</h5>
                  <p>
                    Transcripts, user chat, and AI canvas synthesis summaries will appear here in real time.
                  </p>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div key={idx} className={`chat-bubble-wrap ${m.type || 'chat'}`}>
                    <div className="chat-meta">
                      <span className="sender-name">
                        {m.type === 'ai' ? '🤖 Canvas Copilot' : m.sender_name}
                      </span>
                    </div>
                    <div className="chat-bubble-content">{m.body}</div>
                  </div>
                ))
              )}
            </div>

            <div className="copilot-shortcuts">
              <button
                className="shortcut-btn"
                onClick={() =>
                  analyzeTranscript(
                    'Summarize the conversation so far into goals, decisions, tasks, and risks.'
                  )
                }
              >
                Summarize Session
              </button>
              <button
                className="shortcut-btn"
                onClick={() =>
                  analyzeTranscript(
                    'Extract all assigned tasks, specify owners and set priorities.'
                  )
                }
              >
                Map Task Owners
              </button>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
