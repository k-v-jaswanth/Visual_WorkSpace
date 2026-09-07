import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import OpenAI from 'openai';
import { db } from './db.js';
import {
  hashPassword,
  comparePassword,
  generateToken,
  requireAuth,
  optionalAuth,
  getRandomColor,
  AuthRequest,
} from './auth.js';
import { analyzeTranscriptWithAI } from './ai.js';

const app = express();
const http = createServer(app);
const io = new Server(http, {
  maxHttpBufferSize: 1e8,
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = Number(process.env.PORT || 4000);
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// In-memory runtime tracking for live active participants and ephemeral state
interface Participant {
  id: string; // socket.id
  userId?: string;
  name: string;
  email?: string;
  avatarColor: string;
  initials: string;
  mic: boolean;
  camera: boolean;
  joinedAt: string;
}

const activeRooms = new Map<string, Map<string, Participant>>();

function getRoomParticipants(roomId: string): Participant[] {
  const room = activeRooms.get(roomId);
  return room ? Array.from(room.values()) : [];
}

// -------------------------------------------------------------
// REST API
// -------------------------------------------------------------

// Health check
app.get('/api/health', async (_, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    aiConfigured: !!openai,
    port: PORT,
  });
});

// Auth: Sign Up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await db.findUserByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await hashPassword(password);
    const userId = 'usr_' + Math.random().toString(36).slice(2, 11);
    const avatarColor = getRandomColor();

    const user = await db.createUser({
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      password_hash: passwordHash,
      avatar_color: avatarColor,
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarColor: user.avatar_color,
        createdAt: user.created_at,
      },
      token,
    });
  } catch (error: any) {
    console.error('Sign up error:', error);
    return res.status(500).json({ error: 'Failed to create account.' });
  }
});

// Auth: Sign In
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await db.findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarColor: user.avatar_color,
        createdAt: user.created_at,
      },
      token,
    });
  } catch (error: any) {
    console.error('Sign in error:', error);
    return res.status(500).json({ error: 'Failed to authenticate.' });
  }
});

// Auth: Get Current Profile
app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarColor: user.avatar_color,
      createdAt: user.created_at,
    },
  });
});

// Rooms: List
app.get('/api/rooms', optionalAuth, async (_req, res) => {
  try {
    const rooms = await db.listRooms();
    const enriched = rooms.map((r) => ({
      ...r,
      activeParticipants: (activeRooms.get(r.id)?.size || 0),
    }));
    res.json({ rooms: enriched });
  } catch (error) {
    console.error('List rooms error:', error);
    res.status(500).json({ error: 'Could not fetch rooms' });
  }
});

// Rooms: Create or Register
app.post('/api/rooms', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { name, topic } = req.body;
    const cleanName = (name || 'Collaborative Workspace').trim();
    const slug =
      cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || `room-${Date.now()}`;

    const roomId = req.body.id ? String(req.body.id).toLowerCase() : slug;
    const room = await db.createRoom({
      id: roomId,
      name: cleanName,
      topic: topic || '',
      created_by: req.user?.id,
    });

    res.status(201).json({ room });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Could not create room' });
  }
});

// Rooms: Get Room State & History
app.get('/api/rooms/:id', optionalAuth, async (req, res) => {
  try {
    const rawId = req.params.id;
    const roomId = Array.isArray(rawId) ? rawId[0] : String(rawId);
    let room = await db.getRoom(roomId);
    if (!room) {
      room = await db.createRoom({
        id: roomId,
        name: roomId.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      });
    }

    const canvas = await db.getCanvasState(roomId);
    const messages = await db.getRoomMessages(roomId, 100);

    res.json({
      room,
      canvas,
      messages,
      activeParticipants: getRoomParticipants(roomId),
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Could not fetch room details' });
  }
});

// AI: Analyze Conversation & Generate Workspace Elements
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return res.status(400).json({ error: 'Transcript is required for analysis.' });
    }

    const result = await analyzeTranscriptWithAI(transcript, openai);
    return res.json(result);
  } catch (error: any) {
    console.error('AI analysis error:', error);
    return res.status(500).json({ error: 'AI analysis failed' });
  }
});

// -------------------------------------------------------------
// Real-Time Socket.IO Engine
// -------------------------------------------------------------

io.on('connection', (socket) => {
  let currentRoomId: string | null = null;
  let currentParticipant: Participant | null = null;

  socket.on('room:join', async (data: { roomId: string; userId?: string; name: string; avatarColor?: string; email?: string }) => {
    const { roomId, userId, name, avatarColor, email } = data;
    currentRoomId = roomId;

    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, new Map());
    }
    const roomMap = activeRooms.get(roomId)!;

    const initials = (name || 'Guest')
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const participant: Participant = {
      id: socket.id,
      userId,
      name: name || 'Collaborator',
      email,
      avatarColor: avatarColor || getRandomColor(),
      initials: initials || 'CO',
      mic: true,
      camera: true,
      joinedAt: new Date().toISOString(),
    };
    currentParticipant = participant;
    roomMap.set(socket.id, participant);

    socket.join(roomId);

    // Fetch persistent state from DB
    const canvas = await db.getCanvasState(roomId);
    const messages = await db.getRoomMessages(roomId, 50);

    // Send initial room state to joining participant
    socket.emit('room:state', {
      participants: Array.from(roomMap.values()),
      canvas,
      messages,
      selfId: socket.id,
    });

    // Notify room of updated participant list and new peer for WebRTC
    io.to(roomId).emit('room:participants', Array.from(roomMap.values()));
    socket.to(roomId).emit('webrtc:new-peer', { id: socket.id, name: participant.name });
  });

  // Real-time Canvas sync
  socket.on('canvas:update', async ({ roomId, nodes, edges }: { roomId: string; nodes: any[]; edges: any[] }) => {
    if (!roomId) return;
    // Broadcast immediately to other participants for low latency
    socket.to(roomId).emit('canvas:update', { nodes, edges, updaterId: socket.id });
    // Persist to database asynchronously
    db.saveCanvasState(roomId, nodes, edges).catch((err) =>
      console.error('Failed to persist canvas state:', err)
    );
  });

  // Collaborative Cursors
  socket.on('canvas:cursor', ({ roomId, x, y, name, color }: { roomId: string; x: number; y: number; name: string; color: string }) => {
    if (!roomId) return;
    socket.to(roomId).emit('canvas:cursor', {
      id: socket.id,
      x,
      y,
      name,
      color,
    });
  });

  // Real-time Chat & AI Messages
  socket.on('chat:message', async (data: { roomId: string; userId?: string; name: string; text: string; type?: string }) => {
    const { roomId, userId, name, text, type } = data;
    if (!roomId || !text?.trim()) return;

    try {
      const saved = await db.saveMessage({
        room_id: roomId,
        user_id: userId,
        sender_name: name || 'Participant',
        body: text.trim(),
        type: type || 'chat',
      });

      io.to(roomId).emit('chat:message', saved);
    } catch (err) {
      console.error('Error saving chat message:', err);
    }
  });

  // Media Status (Mic/Camera) toggle sync
  socket.on('media:toggle', ({ roomId, mic, camera }: { roomId: string; mic?: boolean; camera?: boolean }) => {
    if (!roomId || !currentParticipant) return;
    if (typeof mic === 'boolean') currentParticipant.mic = mic;
    if (typeof camera === 'boolean') currentParticipant.camera = camera;

    const roomMap = activeRooms.get(roomId);
    if (roomMap) {
      io.to(roomId).emit('room:participants', Array.from(roomMap.values()));
    }
  });

  // WebRTC Signaling
  socket.on('webrtc:offer', ({ to, offer }: { to: string; offer: any }) => {
    io.to(to).emit('webrtc:offer', { from: socket.id, offer });
  });

  socket.on('webrtc:answer', ({ to, answer }: { to: string; answer: any }) => {
    io.to(to).emit('webrtc:answer', { from: socket.id, answer });
  });

  socket.on('webrtc:ice', ({ to, candidate }: { to: string; candidate: any }) => {
    io.to(to).emit('webrtc:ice', { from: socket.id, candidate });
  });

  // Disconnection cleanup
  socket.on('disconnect', () => {
    if (currentRoomId) {
      const roomMap = activeRooms.get(currentRoomId);
      if (roomMap) {
        roomMap.delete(socket.id);
        if (roomMap.size === 0) {
          activeRooms.delete(currentRoomId);
        } else {
          io.to(currentRoomId).emit('room:participants', Array.from(roomMap.values()));
          io.to(currentRoomId).emit('webrtc:peer-left', { id: socket.id });
        }
      }
    }
  });
});

// Boot Database and Listen
async function startServer() {
  await db.init();
  http.listen(PORT, () => {
    console.log(`CanvasMeet Collaboration Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
