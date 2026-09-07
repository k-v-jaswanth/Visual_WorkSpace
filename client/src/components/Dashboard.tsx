import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  ArrowRight,
  Users,
  Video,
  Sun,
  Moon,
  LogOut,
  FolderKanban,
  Clock,
  ExternalLink,
  Layers,
  Cpu,
  Compass,
} from 'lucide-react';
import { AuthUser } from './AuthModal';

interface RoomSummary {
  id: string;
  name: string;
  topic?: string;
  created_at: string;
  activeParticipants?: number;
}

interface DashboardProps {
  apiBase: string;
  user: AuthUser;
  token: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onSelectRoom: (roomId: string) => void;
  onSignOut: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  apiBase,
  user,
  token,
  theme,
  onToggleTheme,
  onSelectRoom,
  onSignOut,
}) => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomTopic, setNewRoomTopic] = useState('');
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/api/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
      }
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      setIsCreating(true);
      const res = await fetch(`${apiBase}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newRoomName.trim(),
          topic: newRoomTopic.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onSelectRoom(data.room.id);
      }
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinDirect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomInput.trim()) return;
    let targetId = joinRoomInput.trim();
    if (targetId.includes('room=')) {
      const match = targetId.match(/room=([^&]+)/);
      if (match) targetId = match[1];
    }
    onSelectRoom(targetId);
  };

  const templates = [
    {
      id: 'product-launch',
      name: 'Product Launch Sprint',
      topic: 'Mobile Beta Launch & Architecture Milestones',
      icon: Cpu,
    },
    {
      id: 'systems-architecture',
      name: 'Systems Architecture',
      topic: 'Microservices, WebRTC Scaling & Postgres DB',
      icon: Layers,
    },
    {
      id: 'sprint-retro',
      name: 'Sprint Retrospective',
      topic: 'Evaluate team velocity, open risks, and next goals',
      icon: Compass,
    },
  ];

  return (
    <div className="dashboard-container">
      {/* Top Navigation */}
      <header className="dashboard-header">
        <div className="brand">
          <div className="brand-icon">
            <Sparkles size={18} />
          </div>
          <span className="brand-name">CanvasMeet</span>
          <span className="brand-badge-tag">Workspace Hub</span>
        </div>

        <div className="header-right">
          <button
            className="theme-btn"
            onClick={onToggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          <div className="user-profile-badge">
            <div
              className="user-avatar"
              style={{ backgroundColor: user.avatarColor || '#7c3aed' }}
            >
              {(user.name || 'U').slice(0, 2).toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-email">{user.email}</span>
            </div>
          </div>

          <button className="signout-btn" onClick={onSignOut} title="Sign Out">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="dashboard-main">
        {/* Welcome Banner */}
        <section className="welcome-banner">
          <div className="welcome-text">
            <h2>Welcome back, {user.name.split(' ')[0]}!</h2>
            <p>
              Collaborate live with your team: stream WebRTC video, interact on the shared visual canvas, and let AI structure your conversation in real time.
            </p>
          </div>
        </section>

        {/* Action Grid: Create & Join */}
        <div className="dashboard-action-grid">
          {/* Create Room Card */}
          <div className="action-card create-card">
            <div className="card-head">
              <div className="card-icon-wrap">
                <Plus size={20} />
              </div>
              <div>
                <h3>Create Collaborative Session</h3>
                <p>Start a new room with persistent canvas and real-time video</p>
              </div>
            </div>

            <form onSubmit={handleCreateRoom} className="create-form">
              <div className="field-group">
                <label>Room Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mobile Beta Launch Sync"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  required
                />
              </div>

              <div className="field-group">
                <label>Meeting Goal or Topic (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Align design, backend, and security review"
                  value={newRoomTopic}
                  onChange={(e) => setNewRoomTopic(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-launch-room"
                disabled={isCreating || !newRoomName.trim()}
              >
                {isCreating ? (
                  <div className="btn-spinner" />
                ) : (
                  <>
                    <span>Launch Workspace</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Join Room Card */}
          <div className="action-card join-card">
            <div className="card-head">
              <div className="card-icon-wrap join-icon">
                <Video size={20} />
              </div>
              <div>
                <h3>Join Existing Session</h3>
                <p>Enter a room code or paste a shareable link</p>
              </div>
            </div>

            <form onSubmit={handleJoinDirect} className="join-form">
              <div className="field-group">
                <label>Room Code or Link</label>
                <input
                  type="text"
                  placeholder="e.g. product-launch or full URL"
                  value={joinRoomInput}
                  onChange={(e) => setJoinRoomInput(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-join-room"
                disabled={!joinRoomInput.trim()}
              >
                <span>Enter Room</span>
                <ExternalLink size={16} />
              </button>
            </form>

            <div className="quick-templates">
              <small>Or jump into a starter session:</small>
              <div className="template-pills">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    className="template-pill"
                    onClick={() => onSelectRoom(tpl.id)}
                  >
                    <tpl.icon size={13} />
                    <span>{tpl.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Existing Workspaces List */}
        <section className="workspaces-section">
          <div className="section-head">
            <div className="head-title">
              <FolderKanban size={18} />
              <h3>Your Active & Recent Workspaces</h3>
            </div>
            <button className="btn-refresh" onClick={fetchRooms}>
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="btn-spinner" />
              <span>Loading saved workspaces...</span>
            </div>
          ) : rooms.length === 0 ? (
            <div className="empty-rooms">
              <p>No saved workspaces yet. Create your first session above to get started!</p>
            </div>
          ) : (
            <div className="rooms-grid">
              {rooms.map((r) => (
                <div
                  key={r.id}
                  className="room-card"
                  onClick={() => onSelectRoom(r.id)}
                >
                  <div className="room-card-head">
                    <h4>{r.name}</h4>
                    {r.activeParticipants && r.activeParticipants > 0 ? (
                      <span className="live-pill">
                        <i /> {r.activeParticipants} Live
                      </span>
                    ) : (
                      <span className="ready-pill">Ready</span>
                    )}
                  </div>

                  {r.topic && <p className="room-topic">{r.topic}</p>}

                  <div className="room-card-foot">
                    <span className="room-id">/{r.id}</span>
                    <span className="room-action">
                      Enter <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
