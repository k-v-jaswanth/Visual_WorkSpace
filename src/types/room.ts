export interface User {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  isOwner?: boolean;
  micOn: boolean;
  cameraOn: boolean;
  isFollowing?: string; // userId of who they're following
}

export interface Room {
  id: string;
  name: string;
  users: User[];
  createdAt: number;
  mode: RoomMode;
  followMeUserId?: string; // if set, all viewers snap to this user's viewport
}

export type RoomMode = 'brainstorm' | 'operations' | 'teaching' | 'free';

export interface SocketEvents {
  // Canvas sync
  'canvas:node-add': { node: import('./canvas').CanvasNode };
  'canvas:node-update': { node: Partial<import('./canvas').CanvasNode> & { id: string } };
  'canvas:node-delete': { nodeId: string };
  'canvas:connector-add': { connector: import('./canvas').CanvasConnector };
  'canvas:connector-delete': { connectorId: string };
  'canvas:state': { state: import('./canvas').CanvasState };

  // Cursor
  'cursor:move': { userId: string; position: import('./canvas').Position; name: string; color: string };

  // Room
  'room:join': { roomId: string; user: User };
  'room:leave': { userId: string };
  'room:users': { users: User[] };
  'room:user-update': Partial<User> & { userId: string };
  'room:mode-change': { mode: import('./room').RoomMode };
  'room:follow-me': { userId: string; viewport: import('./canvas').Viewport };
  'room:follow-stop': { userId: string };

  // AI
  'ai:transcript': { text: string; speaker: string; timestamp: number };
  'ai:nodes-generated': { nodes: import('./canvas').CanvasNode[] };
  'ai:commit-report': { report: CommitReport };

  // WebRTC signaling
  'rtc:offer': { from: string; to: string; offer: RTCSessionDescriptionInit };
  'rtc:answer': { from: string; to: string; answer: RTCSessionDescriptionInit };
  'rtc:ice': { from: string; to: string; candidate: RTCIceCandidateInit };
}

export interface CommitReport {
  summary: string;
  keyPoints: string[];
  decisions: string[];
  tasks: Array<{ title: string; assignee?: string; priority: string }>;
  nextSteps: string[];
  generatedAt: number;
}
