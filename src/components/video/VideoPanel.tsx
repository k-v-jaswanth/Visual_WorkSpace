'use client';
import { useState } from 'react';
import { User } from '@/types/room';
import VideoTile from './VideoTile';
import AskEchoBar from './AskEchoBar';

interface Props {
  localUser: User;
  remoteUsers: User[];
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  micOn: boolean;
  cameraOn: boolean;
  isPhysicalCamera?: boolean;
  onRequestPhysicalCamera?: () => void;
  isListening: boolean;
  isThinking: boolean;
  onMicToggle: () => void;
  onCameraToggle: () => void;
  onAskEcho: (text: string) => void;
  onSpeechToggle: () => void;
  onEndMeeting?: () => void;
  onHidePanel?: () => void;
}

export default function VideoPanel({
  localUser,
  remoteUsers,
  localStream,
  remoteStreams,
  micOn,
  cameraOn,
  isPhysicalCamera,
  onRequestPhysicalCamera,
  isListening,
  isThinking,
  onMicToggle,
  onCameraToggle,
  onAskEcho,
  onSpeechToggle,
  onEndMeeting,
  onHidePanel,
}: Props) {
  const [showParticipantsList, setShowParticipantsList] = useState(true);

  // Purge any Anonymous or anon user
  const cleanRemoteUsers = remoteUsers.filter(
    (u) => u.name !== 'Anonymous' && u.id !== 'anon'
  );

  return (
    <div className="video-panel animate-slide-left">
      {/* Header with Hide Dashboard Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="live-dot" />
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '1px' }}>
            LIVE
          </span>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
            · {cleanRemoteUsers.length + 1} participant{cleanRemoteUsers.length !== 0 ? 's' : ''}
          </span>
        </div>

        {onHidePanel && (
          <button
            id="hide-participants-dashboard-btn"
            onClick={onHidePanel}
            title="Hide participants dashboard"
            style={{
              background: 'rgba(0, 0, 0, 0.04)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              color: '#334155',
              borderRadius: '8px',
              padding: '3px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)')}
          >
            <span>◀</span>
            <span>Hide</span>
          </button>
        )}
      </div>

      {/* Local video (Enlarged box with live animations) */}
      <VideoTile
        user={localUser}
        stream={localStream}
        isLocal
        micOn={micOn}
        cameraOn={cameraOn}
        isPhysicalCamera={isPhysicalCamera}
        onRequestPhysicalCamera={onRequestPhysicalCamera}
      />

      {/* Remote videos (Enlarged boxes) */}
      {cleanRemoteUsers.map((u) => (
        <VideoTile
          key={u.id}
          user={u}
          stream={remoteStreams.get(u.id) || null}
          micOn={u.micOn}
          cameraOn={u.cameraOn}
        />
      ))}

      {/* Enlarged Controls Bar */}
      <div className="video-controls-bar" style={{ gap: '10px', padding: '8px 0' }}>
        <button
          id="mic-toggle-btn"
          className="btn-icon"
          onClick={onMicToggle}
          title={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            fontSize: '18px',
            background: micOn ? '#ffffff' : 'rgba(239, 68, 68, 0.12)',
            borderColor: micOn ? 'rgba(0, 0, 0, 0.12)' : 'rgba(239, 68, 68, 0.35)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            color: micOn ? '#1e293b' : '#ef4444',
            cursor: 'pointer',
          }}
        >
          {micOn ? '🎙️' : '🔇'}
        </button>

        <button
          id="camera-toggle-btn"
          className="btn-icon"
          onClick={onCameraToggle}
          title={cameraOn ? 'Stop Camera' : 'Start Camera'}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            fontSize: '18px',
            background: cameraOn ? '#ffffff' : 'rgba(239, 68, 68, 0.12)',
            borderColor: cameraOn ? 'rgba(0, 0, 0, 0.12)' : 'rgba(239, 68, 68, 0.35)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            color: cameraOn ? '#1e293b' : '#ef4444',
            cursor: 'pointer',
          }}
        >
          {cameraOn ? '📹' : '🚫'}
        </button>

        {onRequestPhysicalCamera && (
          <button
            id="camera-switch-btn"
            className="btn-icon"
            onClick={onRequestPhysicalCamera}
            title="Connect / Retry Physical Webcam"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              fontSize: '18px',
              background: '#ffffff',
              borderColor: 'rgba(59, 130, 246, 0.3)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              color: '#3b82f6',
              cursor: 'pointer',
            }}
          >
            📷
          </button>
        )}

        {onEndMeeting && (
          <button
            id="end-meeting-video-btn"
            className="btn-icon"
            onClick={onEndMeeting}
            title="End / Leave Meeting"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              fontSize: '18px',
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              borderColor: 'rgba(239, 68, 68, 0.45)',
              cursor: 'pointer',
            }}
          >
            📞
          </button>
        )}
      </div>

      {/* Participants List Dashboard */}
      <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)', paddingTop: '10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            PARTICIPANTS ({cleanRemoteUsers.length + 1})
          </div>
          <button
            id="toggle-participants-sublist-btn"
            onClick={() => setShowParticipantsList(!showParticipantsList)}
            style={{
              background: 'rgba(0, 0, 0, 0.04)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              color: '#4f46e5',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '2px 8px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title={showParticipantsList ? 'Hide participant list' : 'Show participant list'}
          >
            <span>{showParticipantsList ? '▼ Hide' : '▶ Show'}</span>
          </button>
        </div>

        {showParticipantsList && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {[localUser, ...cleanRemoteUsers].map((u) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 0' }}>
                <div
                  className="avatar"
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: u.color || '#7c3aed',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  {u.name[0].toUpperCase()}
                </div>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600, flex: 1 }}>
                  {u.name}
                </span>
                {u.id === localUser.id && (
                  <span style={{ fontSize: '11px', color: '#4f46e5', background: 'rgba(79, 70, 229, 0.08)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                    You
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ask Echo Bar */}
      <AskEchoBar
        onSubmit={onAskEcho}
        onMicToggle={onSpeechToggle}
        isListening={isListening}
        isThinking={isThinking}
        placeholder="Ask Echo AI…"
      />
    </div>
  );
}
