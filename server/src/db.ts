import fs from 'fs';
import path from 'path';
import pg from 'pg';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  avatar_color: string;
  created_at: string;
}

export interface Room {
  id: string;
  name: string;
  topic: string;
  created_by?: string;
  created_at: string;
  participantCount?: number;
}

export interface CanvasState {
  room_id: string;
  nodes: any[];
  edges: any[];
  updated_at: string;
}

export interface Message {
  id: string | number;
  room_id: string;
  user_id?: string;
  sender_name: string;
  body: string;
  type: string; // 'chat' | 'ai' | 'system'
  created_at: string;
}

interface LocalDBData {
  users: Record<string, User>;
  rooms: Record<string, Room>;
  canvas_states: Record<string, CanvasState>;
  messages: Message[];
}

class DatabaseService {
  private pool: pg.Pool | null = null;
  private isPostgres = false;
  private localDataPath: string;
  private localData: LocalDBData = {
    users: {},
    rooms: {},
    canvas_states: {},
    messages: [],
  };

  constructor() {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.localDataPath = path.join(dataDir, 'canvasmeet.db.json');
    this.loadLocalData();
  }

  private loadLocalData() {
    try {
      if (fs.existsSync(this.localDataPath)) {
        const raw = fs.readFileSync(this.localDataPath, 'utf-8');
        this.localData = JSON.parse(raw);
        if (!this.localData.users) this.localData.users = {};
        if (!this.localData.rooms) this.localData.rooms = {};
        if (!this.localData.canvas_states) this.localData.canvas_states = {};
        if (!this.localData.messages) this.localData.messages = [];
      } else {
        this.saveLocalData();
      }
    } catch (err) {
      console.warn('Could not parse local JSON database, initializing clean state.', err);
      this.saveLocalData();
    }
  }

  private saveLocalData() {
    try {
      const tempPath = `${this.localDataPath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.localData, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.localDataPath);
    } catch (err) {
      console.error('Failed to write local database file:', err);
    }
  }

  public async init() {
    if (process.env.DATABASE_URL) {
      try {
        const pool = new pg.Pool({
          connectionString: process.env.DATABASE_URL,
          connectionTimeoutMillis: 3000,
        });
        // Test connection
        const client = await pool.connect();
        client.release();
        this.pool = pool;
        this.isPostgres = true;
        console.log('Connected successfully to PostgreSQL database.');
        await this.initPgSchema();
        return;
      } catch (err) {
        console.warn('PostgreSQL connection failed. Operating with persistent local storage.', (err as any).message);
        this.pool = null;
        this.isPostgres = false;
      }
    } else {
      console.log('No DATABASE_URL configured. Operating with persistent local storage at:', this.localDataPath);
    }
  }

  private async initPgSchema() {
    if (!this.pool) return;
    const schema = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        avatar_color TEXT NOT NULL DEFAULT '#7c3aed',
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        topic TEXT DEFAULT '',
        created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS canvas_states (
        room_id TEXT PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
        nodes JSONB NOT NULL DEFAULT '[]',
        edges JSONB NOT NULL DEFAULT '[]',
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS messages (
        id BIGSERIAL PRIMARY KEY,
        room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        sender_name TEXT NOT NULL,
        body TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'chat',
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `;
    await this.pool.query(schema);
  }

  // --- Users ---
  public async createUser(user: { id: string; name: string; email: string; password_hash: string; avatar_color: string }): Promise<User> {
    const newUser: User = {
      ...user,
      created_at: new Date().toISOString(),
    };

    if (this.isPostgres && this.pool) {
      const res = await this.pool.query(
        `INSERT INTO users (id, name, email, password_hash, avatar_color, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, email, password_hash, avatar_color, created_at`,
        [newUser.id, newUser.name, newUser.email, newUser.password_hash, newUser.avatar_color, newUser.created_at]
      );
      return res.rows[0];
    } else {
      this.localData.users[newUser.id] = newUser;
      this.saveLocalData();
      return newUser;
    }
  }

  public async findUserByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query(`SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1`, [normalized]);
      return res.rows[0] || null;
    } else {
      const user = Object.values(this.localData.users).find((u) => u.email.toLowerCase() === normalized);
      return user || null;
    }
  }

  public async findUserById(id: string): Promise<User | null> {
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]);
      return res.rows[0] || null;
    } else {
      return this.localData.users[id] || null;
    }
  }

  // --- Rooms ---
  public async createRoom(room: { id: string; name: string; topic?: string; created_by?: string }): Promise<Room> {
    const newRoom: Room = {
      id: room.id,
      name: room.name,
      topic: room.topic || '',
      created_by: room.created_by,
      created_at: new Date().toISOString(),
    };

    if (this.isPostgres && this.pool) {
      const res = await this.pool.query(
        `INSERT INTO rooms (id, name, topic, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, topic = EXCLUDED.topic
         RETURNING *`,
        [newRoom.id, newRoom.name, newRoom.topic, newRoom.created_by || null, newRoom.created_at]
      );
      return res.rows[0];
    } else {
      this.localData.rooms[newRoom.id] = newRoom;
      this.saveLocalData();
      return newRoom;
    }
  }

  public async getRoom(id: string): Promise<Room | null> {
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query(`SELECT * FROM rooms WHERE id = $1 LIMIT 1`, [id]);
      return res.rows[0] || null;
    } else {
      return this.localData.rooms[id] || null;
    }
  }

  public async listRooms(): Promise<Room[]> {
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query(`SELECT * FROM rooms ORDER BY created_at DESC LIMIT 50`);
      return res.rows;
    } else {
      return Object.values(this.localData.rooms).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }

  // --- Canvas States ---
  public async saveCanvasState(roomId: string, nodes: any[], edges: any[]): Promise<CanvasState> {
    const now = new Date().toISOString();
    if (this.isPostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO canvas_states (room_id, nodes, edges, updated_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (room_id) DO UPDATE
         SET nodes = EXCLUDED.nodes, edges = EXCLUDED.edges, updated_at = EXCLUDED.updated_at`,
        [roomId, JSON.stringify(nodes), JSON.stringify(edges), now]
      );
    } else {
      this.localData.canvas_states[roomId] = {
        room_id: roomId,
        nodes,
        edges,
        updated_at: now,
      };
      this.saveLocalData();
    }
    return { room_id: roomId, nodes, edges, updated_at: now };
  }

  public async getCanvasState(roomId: string): Promise<{ nodes: any[]; edges: any[] }> {
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query(`SELECT nodes, edges FROM canvas_states WHERE room_id = $1 LIMIT 1`, [roomId]);
      if (res.rows[0]) {
        return {
          nodes: typeof res.rows[0].nodes === 'string' ? JSON.parse(res.rows[0].nodes) : res.rows[0].nodes,
          edges: typeof res.rows[0].edges === 'string' ? JSON.parse(res.rows[0].edges) : res.rows[0].edges,
        };
      }
    } else {
      const state = this.localData.canvas_states[roomId];
      if (state) {
        return { nodes: state.nodes || [], edges: state.edges || [] };
      }
    }
    return { nodes: [], edges: [] };
  }

  // --- Messages ---
  public async saveMessage(msg: { room_id: string; user_id?: string; sender_name: string; body: string; type?: string }): Promise<Message> {
    const now = new Date().toISOString();
    const type = msg.type || 'chat';

    if (this.isPostgres && this.pool) {
      const res = await this.pool.query(
        `INSERT INTO messages (room_id, user_id, sender_name, body, type, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, room_id, user_id, sender_name, body, type, created_at`,
        [msg.room_id, msg.user_id || null, msg.sender_name, msg.body, type, now]
      );
      return res.rows[0];
    } else {
      const newMsg: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        room_id: msg.room_id,
        user_id: msg.user_id,
        sender_name: msg.sender_name,
        body: msg.body,
        type,
        created_at: now,
      };
      this.localData.messages.push(newMsg);
      // Keep last 1000 messages in local file to avoid unbounded growth
      if (this.localData.messages.length > 1000) {
        this.localData.messages = this.localData.messages.slice(-1000);
      }
      this.saveLocalData();
      return newMsg;
    }
  }

  public async getRoomMessages(roomId: string, limit = 50): Promise<Message[]> {
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query(
        `SELECT * FROM messages WHERE room_id = $1 ORDER BY created_at ASC LIMIT $2`,
        [roomId, limit]
      );
      return res.rows;
    } else {
      return this.localData.messages
        .filter((m) => m.room_id === roomId)
        .slice(-limit);
    }
  }
}

export const db = new DatabaseService();
