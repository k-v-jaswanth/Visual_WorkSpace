'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { CanvasNode, CanvasConnector, CanvasState, Viewport } from '@/types/canvas';
import { User } from '@/types/room';
import { generateId } from '@/lib/canvasUtils';

interface UseSocketOptions {
  roomId: string;
  user: User;
}

export function useSocket({ roomId, user }: UseSocketOptions) {
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const socket = socketRef.current;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('room:join', { roomId, user });
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('room:users', ({ users: u }: { users: User[] }) => setUsers(u));

    if (socket.connected) {
      setConnected(true);
      socket.emit('room:join', { roomId, user });
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room:users');
    };
  }, [roomId, user.id]);

  const emit = useCallback((event: string, data: unknown) => {
    socketRef.current.emit(event, data);
  }, []);

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    socketRef.current.on(event, handler);
    return () => { socketRef.current.off(event, handler); };
  }, []);

  return { socket: socketRef.current, connected, users, emit, on };
}
