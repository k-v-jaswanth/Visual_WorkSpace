'use client';
import { useEffect, useRef } from 'react';
import { User } from '@/types/room';

interface Props {
  user: User;
  stream: MediaStream | null;
  isLocal?: boolean;
  micOn?: boolean;
  cameraOn?: boolean;
  isPhysicalCamera?: boolean;
  onRequestPhysicalCamera?: () => void;
}

export default function VideoTile({
  user,
  stream,
  isLocal,
  micOn = true,
  cameraOn = true,
  isPhysicalCamera = false,
  onRequestPhysicalCamera,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Keep video srcObject updated whenever stream or camera state changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream && cameraOn) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      if (isLocal) video.muted = true;
      video.play().catch(() => {});
    } else if (!cameraOn) {
      video.srcObject = null;
    }
  }, [stream, isLocal, cameraOn]);

  const initials = user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'EC';
  const showVideo = cameraOn && Boolean(stream);

  return (
    <div
      className={`video-tile ${micOn ? 'is-speaking' : ''}`}
      style={{
        aspectRatio: '16/10',
        minHeight: '190px',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '20px',
      }}
    >
      {/* Video element */}
      <video
        ref={(el) => {
          videoRef.current = el;
          if (el && stream && cameraOn && el.srcObject !== stream) {
            el.srcObject = stream;
            if (isLocal) el.muted = true;
            el.play().catch(() => {});
          }
        }}
        autoPlay
        playsInline
        muted={isLocal}
        onLoadedMetadata={() => {
          videoRef.current?.play().catch(() => {});
        }}
        onCanPlay={() => {
          videoRef.current?.play().catch(() => {});
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: isLocal ? 'scaleX(-1)' : 'none',
          display: showVideo ? 'block' : 'none',
        }}
      />

      {/* Avatar placeholder when camera is off */}
      {!showVideo && (
        <div
          className="video-avatar-placeholder"
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at center, #1e1b4b 0%, #0c0a17 100%)',
            position: 'relative',
          }}
        >
          {/* Speaking Animated Aura Ring */}
          <div style={{ position: 'relative' }}>
            {micOn && <div className="avatar-pulse-ring" />}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: user.color || '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 700,
                color: '#fff',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                border: '2px solid rgba(255,255,255,0.2)',
              }}
            >
              {initials}
            </div>
          </div>

          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', marginTop: '12px', fontWeight: 500 }}>
            {cameraOn ? '● Live Studio Feed' : 'Camera Muted'}
          </div>
        </div>
      )}

      {/* Top Left: LIVE HD Badge */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          zIndex: 10,
        }}
      >
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '999px',
            padding: '3px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '10px',
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '0.4px',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#ef4444',
              boxShadow: '0 0 6px #ef4444',
            }}
          />
          LIVE HD
        </div>

        {user.isOwner && (
          <div
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '999px',
              letterSpacing: '0.5px',
            }}
          >
            HOST
          </div>
        )}
      </div>

      {/* Top Right: Physical Camera Switch Button if on virtual fallback */}
      {isLocal && !isPhysicalCamera && onRequestPhysicalCamera && (
        <button
          onClick={onRequestPhysicalCamera}
          title="Click to activate physical webcam"
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'rgba(168, 199, 250, 0.2)',
            border: '1px solid rgba(168, 199, 250, 0.4)',
            color: '#a8c7fa',
            borderRadius: '999px',
            padding: '3px 9px',
            fontSize: '10px',
            fontWeight: 600,
            cursor: 'pointer',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>📷</span> Connect Webcam
        </button>
      )}

      {/* Overlay: Name and Speaking Waveform */}
      <div className="video-tile-overlay" style={{ zIndex: 5 }}>
        <div />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
          {/* Animated Waveform when mic is active */}
          {micOn && (
            <div className="audio-waveform" style={{ gap: '3px', height: '22px' }}>
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="audio-bar"
                  style={{
                    animationDelay: `${i * 0.12}s`,
                    background: '#10b981',
                    width: '3.5px',
                    borderRadius: '2px',
                  }}
                />
              ))}
            </div>
          )}

          <div
            className="video-tile-name"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(13, 12, 20, 0.82)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '4px 10px',
              borderRadius: '8px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>
              {user.name}{isLocal ? ' (You)' : ''}
            </span>
            <span
              style={{
                color: '#34A853',
                fontSize: '11px',
                fontWeight: 900,
                background: 'rgba(52, 168, 83, 0.18)',
                padding: '1px 5px',
                borderRadius: '999px',
              }}
              title="Real-Time Verified Account"
            >
              ✓
            </span>
          </div>
        </div>
      </div>

      {!micOn && (
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            background: 'rgba(239, 68, 68, 0.85)',
            borderRadius: '50%',
            width: '26px',
            height: '26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: '#fff',
            zIndex: 10,
          }}
        >
          🔇
        </div>
      )}
    </div>
  );
}
