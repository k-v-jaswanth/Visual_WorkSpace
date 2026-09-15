const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// In-memory room store
const rooms = new Map();
const roomUsers = new Map();
const roomCanvases = new Map();
const roomTranscripts = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { id: roomId, name: `Room ${roomId}`, mode: 'brainstorm', createdAt: Date.now() });
    roomUsers.set(roomId, new Map());
    roomCanvases.set(roomId, { nodes: [], connectors: [], viewport: { x: 0, y: 0, scale: 1 } });
    roomTranscripts.set(roomId, []);
  }
  return rooms.get(roomId);
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    await handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: '/api/socket',
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    let currentRoomId = null;
    let currentUser = null;

    socket.on('room:join', ({ roomId, user }) => {
      if (!user || user.id === 'anon' || user.name === 'Anonymous') {
        return;
      }
      currentRoomId = roomId;
      currentUser = user;
      socket.join(roomId);
      getRoom(roomId);

      const usersMap = roomUsers.get(roomId);
      // Remove any lingering anon or Anonymous users
      for (const [uid, u] of usersMap.entries()) {
        if (uid === 'anon' || u.name === 'Anonymous') {
          usersMap.delete(uid);
        }
      }
      usersMap.set(user.id, { ...user, socketId: socket.id });

      // Send current canvas state to new joiner
      const canvas = roomCanvases.get(roomId);
      socket.emit('canvas:state', { state: canvas });

      // Send all users (filtered)
      const users = Array.from(usersMap.values()).filter(
        (u) => u.id !== 'anon' && u.name !== 'Anonymous'
      );
      io.to(roomId).emit('room:users', { users });

      socket.to(roomId).emit('room:user-joined', { user });
    });

    socket.on('canvas:node-add', ({ node }) => {
      if (!currentRoomId) return;
      const canvas = roomCanvases.get(currentRoomId);
      canvas.nodes.push(node);
      socket.to(currentRoomId).emit('canvas:node-add', { node });
    });

    socket.on('canvas:node-update', ({ node }) => {
      if (!currentRoomId) return;
      const canvas = roomCanvases.get(currentRoomId);
      const idx = canvas.nodes.findIndex((n) => n.id === node.id);
      if (idx >= 0) canvas.nodes[idx] = { ...canvas.nodes[idx], ...node };
      socket.to(currentRoomId).emit('canvas:node-update', { node });
    });

    socket.on('canvas:node-delete', ({ nodeId }) => {
      if (!currentRoomId) return;
      const canvas = roomCanvases.get(currentRoomId);
      canvas.nodes = canvas.nodes.filter((n) => n.id !== nodeId);
      canvas.connectors = canvas.connectors.filter((c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId);
      socket.to(currentRoomId).emit('canvas:node-delete', { nodeId });
    });

    socket.on('canvas:connector-add', ({ connector }) => {
      if (!currentRoomId) return;
      const canvas = roomCanvases.get(currentRoomId);
      canvas.connectors.push(connector);
      socket.to(currentRoomId).emit('canvas:connector-add', { connector });
    });

    socket.on('canvas:connector-delete', ({ connectorId }) => {
      if (!currentRoomId) return;
      const canvas = roomCanvases.get(currentRoomId);
      canvas.connectors = canvas.connectors.filter((c) => c.id !== connectorId);
      socket.to(currentRoomId).emit('canvas:connector-delete', { connectorId });
    });

    socket.on('cursor:move', (data) => {
      if (!currentRoomId) return;
      socket.to(currentRoomId).emit('cursor:move', data);
    });

    socket.on('room:follow-me', ({ viewport }) => {
      if (!currentRoomId || !currentUser) return;
      socket.to(currentRoomId).emit('room:follow-me', { userId: currentUser.id, viewport });
    });

    socket.on('room:mode-change', ({ mode }) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (room) room.mode = mode;
      io.to(currentRoomId).emit('room:mode-change', { mode });
    });

    socket.on('room:user-update', (data) => {
      if (!currentRoomId || !data || !data.userId) return;
      const usersMap = roomUsers.get(currentRoomId);
      if (usersMap && usersMap.has(data.userId)) {
        const u = usersMap.get(data.userId);
        Object.assign(u, data);
        io.to(currentRoomId).emit('room:users', { users: Array.from(usersMap.values()) });
      }
    });

    socket.on('ai:transcript', (data) => {
      if (!currentRoomId) return;
      const transcripts = roomTranscripts.get(currentRoomId);
      transcripts.push(data);
      // socket.to (not io.to) — do NOT echo back to sender to avoid duplicate keys
      socket.to(currentRoomId).emit('ai:transcript', data);
    });

    socket.on('ai:nodes-generated', ({ nodes, connectors }) => {
      if (!currentRoomId) return;
      const canvas = roomCanvases.get(currentRoomId);
      if (nodes && Array.isArray(nodes)) nodes.forEach((n) => canvas.nodes.push(n));
      if (connectors && Array.isArray(connectors)) connectors.forEach((c) => canvas.connectors.push(c));
      io.to(currentRoomId).emit('ai:nodes-generated', { nodes: nodes || [], connectors: connectors || [] });
    });

    socket.on('ai:commit-report', ({ report }) => {
      if (!currentRoomId) return;
      io.to(currentRoomId).emit('ai:commit-report', { report });
    });

    // WebRTC signaling
    socket.on('rtc:offer', ({ to, offer }) => {
      const usersMap = currentRoomId ? roomUsers.get(currentRoomId) : null;
      if (!usersMap || !currentUser) return;
      const target = Array.from(usersMap.values()).find((u) => u.id === to);
      if (target) io.to(target.socketId).emit('rtc:offer', { from: currentUser.id, to, offer });
    });

    socket.on('rtc:answer', ({ to, answer }) => {
      const usersMap = currentRoomId ? roomUsers.get(currentRoomId) : null;
      if (!usersMap || !currentUser) return;
      const target = Array.from(usersMap.values()).find((u) => u.id === to);
      if (target) io.to(target.socketId).emit('rtc:answer', { from: currentUser.id, to, answer });
    });

    socket.on('rtc:ice', ({ to, candidate }) => {
      const usersMap = currentRoomId ? roomUsers.get(currentRoomId) : null;
      if (!usersMap || !currentUser) return;
      const target = Array.from(usersMap.values()).find((u) => u.id === to);
      if (target) io.to(target.socketId).emit('rtc:ice', { from: currentUser.id, to, candidate });
    });

    socket.on('disconnect', () => {
      if (currentRoomId && currentUser) {
        const usersMap = roomUsers.get(currentRoomId);
        if (usersMap) {
          usersMap.delete(currentUser.id);
          const users = Array.from(usersMap.values());
          io.to(currentRoomId).emit('room:users', { users });
          io.to(currentRoomId).emit('room:user-left', { userId: currentUser.id });
        }
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Echo ready on http://${hostname}:${port}`);
  });
});
