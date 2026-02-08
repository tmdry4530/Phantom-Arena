/**
 * WebSocket 연결 관리 훅
 * 싱글톤 패턴으로 앱 전체에서 하나의 연결만 유지
 */
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

/** WebSocket 연결 상태 */
interface SocketState {
  /** 연결됨 여부 */
  connected: boolean;
  /** 에러 메시지 */
  error: string | null;
  /** Socket 인스턴스 */
  socket: Socket | null;
}

/** 싱글톤 소켓 인스턴스 */
let globalSocket: Socket | null = null;

/** WebSocket URL (환경변수 또는 기본값) */
const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined) ?? 'ws://localhost:3001';

/**
 * 소켓 연결 가져오기 (싱글톤)
 * 최초 호출 시 연결 생성, 이후 기존 연결 반환
 */
function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
    });
  }
  return globalSocket;
}

/**
 * WebSocket 연결 관리 훅
 * 컴포넌트 마운트 시 연결, 언마운트 시 리스너 정리
 */
export function useSocket(): SocketState {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      setError(null);
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onConnectError = (err: Error) => {
      setError(err.message);
      setConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    // 이미 연결되어 있을 수 있음
    if (socket.connected) {
      setConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
    };
  }, []);

  return { connected, error, socket: socketRef.current };
}

/** 소켓 연결 해제 (앱 종료 시) */
export function disconnectSocket(): void {
  if (globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
  }
}
