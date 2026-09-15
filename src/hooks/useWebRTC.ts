'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { User } from '@/types/room';
import { Socket } from 'socket.io-client';

interface PeerConnection {
  userId: string;
  pc: RTCPeerConnection;
  stream?: MediaStream;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * Creates an animated canvas video stream when physical webcam is unavailable or locked.
 * Ensures the participant ALWAYS has an active live video feed until they explicitly turn it off.
 */
function createLiveFallbackStream(name: string, color: string): { stream: MediaStream; cleanup: () => void } {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  let animId = 0;
  let angle = 0;
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'EC';

  const render = () => {
    if (!ctx) return;
    angle += 0.03;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.6, '#1e1b4b');
    grad.addColorStop(1, '#2e1065');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dynamic orb
    const orbX = canvas.width / 2 + Math.cos(angle * 0.7) * 70;
    const orbY = canvas.height / 2 + Math.sin(angle * 0.5) * 35;
    const orbGrad = ctx.createRadialGradient(orbX, orbY, 10, orbX, orbY, 150);
    orbGrad.addColorStop(0, `${color}55`);
    orbGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = orbGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Center avatar circle with pulse
    const cx = canvas.width / 2;
    const cy = canvas.height / 2 - 12;
    const pulse = Math.sin(angle * 2) * 5;

    ctx.beginPath();
    ctx.arc(cx, cy, 52 + pulse, 0, Math.PI * 2);
    ctx.strokeStyle = `${color}88`;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 45, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, cx, cy);

    // Animated audio wave bars
    const barCount = 7;
    const barWidth = 4;
    const barGap = 4;
    const totalW = barCount * barWidth + (barCount - 1) * barGap;
    const startX = cx - totalW / 2;
    ctx.fillStyle = '#a855f7';
    for (let i = 0; i < barCount; i++) {
      const h = 8 + Math.abs(Math.sin(angle * 3 + i)) * 18;
      ctx.fillRect(startX + i * (barWidth + barGap), cy + 62 - h / 2, barWidth, h);
    }

    // Live Cam pill
    ctx.fillStyle = 'rgba(220, 38, 38, 0.85)';
    ctx.beginPath();
    ctx.roundRect(cx - 42, canvas.height - 48, 84, 22, 11);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('● LIVE FEED', cx, canvas.height - 37);

    animId = requestAnimationFrame(render);
  };

  render();

  const canvasStream = canvas.captureStream(30);

  // Add silent audio track so WebRTC audio negotiation always succeeds
  let audioTrack: MediaStreamTrack | null = null;
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.gain.value = 0; // Silent
    osc.connect(gain);
    const dest = audioCtx.createMediaStreamDestination();
    gain.connect(dest);
    osc.start();
    audioTrack = dest.stream.getAudioTracks()[0] || null;
  } catch {
    // AudioContext not available
  }

  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...(audioTrack ? [audioTrack] : []),
  ]);

  return {
    stream: combinedStream,
    cleanup: () => {
      cancelAnimationFrame(animId);
      combinedStream.getTracks().forEach((t) => t.stop());
    },
  };
}

export function useWebRTC(socket: Socket, currentUser: User, roomUsers: User[]) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [isPhysicalCamera, setIsPhysicalCamera] = useState(false);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const fallbackCleanupRef = useRef<(() => void) | null>(null);

  const getLocalStream = useCallback(async () => {
    let videoTrack: MediaStreamTrack | null = null;
    let audioTrack: MediaStreamTrack | null = null;
    let isPhysical = false;

    // Try real camera first
    try {
      const vStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      videoTrack = vStream.getVideoTracks()[0] || null;
      if (videoTrack) isPhysical = true;
    } catch {
      try {
        const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoTrack = vStream.getVideoTracks()[0] || null;
        if (videoTrack) isPhysical = true;
      } catch (camErr) {
        console.warn('Physical camera not available initially, using HD studio live stream:', camErr);
      }
    }

    // Try real audio
    try {
      const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioTrack = aStream.getAudioTracks()[0] || null;
    } catch (micErr) {
      console.warn('Physical microphone not available, using silent audio track:', micErr);
    }

    // If no physical camera, use fallback animated studio canvas stream
    if (!videoTrack) {
      const fallback = createLiveFallbackStream(currentUser.name, currentUser.color);
      fallbackCleanupRef.current = fallback.cleanup;
      videoTrack = fallback.stream.getVideoTracks()[0] || null;
    }

    // If no physical audio, use silent audio track
    if (!audioTrack) {
      const fallback = createLiveFallbackStream(currentUser.name, currentUser.color);
      audioTrack = fallback.stream.getAudioTracks()[0] || null;
    }

    const combined = new MediaStream([
      ...(videoTrack ? [videoTrack] : []),
      ...(audioTrack ? [audioTrack] : []),
    ]);

    localStreamRef.current = combined;
    setLocalStream(combined);
    setIsPhysicalCamera(isPhysical);
    return combined;
  }, [currentUser.name, currentUser.color]);

  const requestPhysicalCamera = useCallback(async () => {
    try {
      const realStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      const newVideoTrack = realStream.getVideoTracks()[0];
      if (!newVideoTrack) return false;

      // Replace video track in localStream
      if (localStreamRef.current) {
        const oldTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldTrack) {
          localStreamRef.current.removeTrack(oldTrack);
          oldTrack.stop();
        }
        localStreamRef.current.addTrack(newVideoTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

        // Update senders in all active peer connections
        peersRef.current.forEach(({ pc }) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(newVideoTrack).catch(() => {});
          } else {
            try { pc.addTrack(newVideoTrack, localStreamRef.current!); } catch {}
          }
        });
      }

      setIsPhysicalCamera(true);
      setCameraOn(true);
      socket.emit('room:user-update', { userId: currentUser.id, cameraOn: true });
      return true;
    } catch (err) {
      console.warn('Physical camera permission error:', err);
      return false;
    }
  }, [socket, currentUser.id]);

  const createPeerConnection = useCallback((targetUserId: string): RTCPeerConnection => {
    // If existing connection exists, close it cleanly first
    const existing = peersRef.current.get(targetUserId);
    if (existing) {
      try { existing.pc.close(); } catch {}
      peersRef.current.delete(targetUserId);
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('rtc:ice', { to: targetUserId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        const existingStream = next.get(targetUserId);
        if (existingStream) {
          if (!existingStream.getTracks().some((t) => t.id === e.track.id)) {
            existingStream.addTrack(e.track);
          }
          return new Map(next);
        } else {
          const stream = e.streams[0] || new MediaStream([e.track]);
          next.set(targetUserId, stream);
          return next;
        }
      });
    };

    // Add local tracks if ready
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, localStreamRef.current!);
        } catch {}
      });
    }

    peersRef.current.set(targetUserId, { userId: targetUserId, pc });
    return pc;
  }, [socket]);

  const initiateCall = useCallback(async (targetUserId: string) => {
    try {
      const pc = createPeerConnection(targetUserId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('rtc:offer', { to: targetUserId, offer });
    } catch (err) {
      console.warn('Failed to initiate call to', targetUserId, err);
    }
  }, [createPeerConnection, socket]);

  // Request local stream on mount
  useEffect(() => {
    getLocalStream();
  }, [getLocalStream]);

  // Whenever localStream changes, update all existing peer connections
  useEffect(() => {
    if (!localStream) return;
    peersRef.current.forEach(({ pc }) => {
      localStream.getTracks().forEach((track) => {
        const senders = pc.getSenders();
        const hasTrack = senders.some((s) => s.track === track || s.track?.kind === track.kind);
        if (!hasTrack) {
          try { pc.addTrack(track, localStream); } catch {}
        }
      });
    });
  }, [localStream]);

  // Handle incoming signaling messages
  useEffect(() => {
    const handleOffer = async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      try {
        const pc = createPeerConnection(from);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('rtc:answer', { to: from, answer });
      } catch (err) {
        console.warn('Error handling RTC offer from', from, err);
      }
    };

    const handleAnswer = async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      try {
        const peer = peersRef.current.get(from);
        if (peer && peer.pc.signalingState !== 'stable') {
          await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.warn('Error handling RTC answer from', from, err);
      }
    };

    const handleIce = async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      try {
        const peer = peersRef.current.get(from);
        if (peer && candidate) {
          await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.warn('Error handling ICE candidate from', from, err);
      }
    };

    const handleUserJoined = ({ user }: { user: User }) => {
      if (user.id !== currentUser.id) {
        setTimeout(() => initiateCall(user.id), 600);
      }
    };

    const handleUserLeft = ({ userId }: { userId: string }) => {
      const peer = peersRef.current.get(userId);
      if (peer) {
        try { peer.pc.close(); } catch {}
        peersRef.current.delete(userId);
      }
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    };

    socket.on('rtc:offer', handleOffer);
    socket.on('rtc:answer', handleAnswer);
    socket.on('rtc:ice', handleIce);
    socket.on('room:user-joined', handleUserJoined);
    socket.on('room:user-left', handleUserLeft);

    return () => {
      socket.off('rtc:offer', handleOffer);
      socket.off('rtc:answer', handleAnswer);
      socket.off('rtc:ice', handleIce);
      socket.off('room:user-joined', handleUserJoined);
      socket.off('room:user-left', handleUserLeft);
    };
  }, [socket, currentUser.id, createPeerConnection, initiateCall]);

  const toggleMic = useCallback(() => {
    const nextMic = !micOn;
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = nextMic; });
    }
    setMicOn(nextMic);
    socket.emit('room:user-update', { userId: currentUser.id, micOn: nextMic });
  }, [micOn, socket, currentUser.id]);

  const toggleCamera = useCallback(async () => {
    const nextCam = !cameraOn;
    if (nextCam && !isPhysicalCamera) {
      // If turning camera on, attempt requesting real camera
      await requestPhysicalCamera();
    }
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = nextCam; });
    }
    setCameraOn(nextCam);
    socket.emit('room:user-update', { userId: currentUser.id, cameraOn: nextCam });
  }, [cameraOn, isPhysicalCamera, requestPhysicalCamera, socket, currentUser.id]);

  const cleanup = useCallback(() => {
    peersRef.current.forEach(({ pc }) => {
      try { pc.close(); } catch {}
    });
    peersRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    if (fallbackCleanupRef.current) {
      fallbackCleanupRef.current();
      fallbackCleanupRef.current = null;
    }
  }, []);

  return {
    localStream,
    remoteStreams,
    micOn,
    cameraOn,
    isPhysicalCamera,
    requestPhysicalCamera,
    toggleMic,
    toggleCamera,
    cleanup,
  };
}
