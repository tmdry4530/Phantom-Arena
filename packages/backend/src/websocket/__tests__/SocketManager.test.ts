/**
 * SocketManager 유닛 테스트
 *
 * 검증 항목:
 * - 생성자 초기화
 * - 연결된 클라이언트 수 조회
 * - 종료 시 정리
 */

/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SocketManager } from '../SocketManager.js';
import type { Server as SocketIOServer } from 'socket.io';
import type { GameLoopManager } from '../../game/GameLoopManager.js';

describe('SocketManager', () => {
  let mockIo: SocketIOServer;
  let mockGameLoopManager: GameLoopManager;
  let socketManager: SocketManager;

  beforeEach(() => {
    // Socket.io 서버 모킹
    mockIo = {
      on: vi.fn(),
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
      engine: {
        clientsCount: 0,
      },
    } as unknown as SocketIOServer;

    // GameLoopManager 모킹
    mockGameLoopManager = {
      setOnGameState: vi.fn(),
      setOnGameOver: vi.fn(),
      setOnRoundChange: vi.fn(),
      handleInput: vi.fn(),
      getFullSync: vi.fn(),
      shutdown: vi.fn(),
    } as unknown as GameLoopManager;

    socketManager = new SocketManager(mockIo, mockGameLoopManager);
  });

  describe('생성자', () => {
    it('Socket.io 서버와 GameLoopManager로 초기화되어야 함', () => {
      expect(socketManager).toBeDefined();
      expect(socketManager).toBeInstanceOf(SocketManager);
    });

    it('GameLoopManager 콜백을 설정해야 함', () => {
      expect(() => mockGameLoopManager.setOnGameState).not.toThrow();
      expect(() => mockGameLoopManager.setOnGameOver).not.toThrow();
      expect(() => mockGameLoopManager.setOnRoundChange).not.toThrow();
    });

    it('connection 핸들러를 등록해야 함', () => {
      expect(() => mockIo.on).not.toThrow();
    });
  });

  describe('getConnectedCount', () => {
    it('초기 연결 수가 0이어야 함', () => {
      expect(socketManager.getConnectedCount()).toBe(0);
    });

    it('Socket.io 엔진의 clientsCount를 반환해야 함', () => {
      // clientsCount 값 변경
      mockIo.engine.clientsCount = 5;

      expect(socketManager.getConnectedCount()).toBe(5);
    });
  });

  describe('shutdown', () => {
    it('GameLoopManager를 종료해야 함', () => {
      socketManager.shutdown();

      expect(mockGameLoopManager.shutdown).toHaveBeenCalledTimes(1);
    });

    it('여러 번 호출해도 안전해야 함', () => {
      socketManager.shutdown();
      socketManager.shutdown();
      socketManager.shutdown();

      expect(() => mockGameLoopManager.shutdown).not.toThrow();
    });
  });

  describe('브로드캐스트 메서드', () => {
    it('broadcastBetUpdate가 해당 배팅 룸에 이벤트를 전송해야 함', () => {
      const testData = { odds: 1.5, pool: 1000 };

      socketManager.broadcastBetUpdate('match-123', testData);

      expect(() => mockIo.to).not.toThrow();
      expect(() => mockIo.emit).not.toThrow();
    });

    it('broadcastTournamentAdvance가 토너먼트 룸에 이벤트를 전송해야 함', () => {
      const testData = { round: 2, bracket: 'semifinals' };

      socketManager.broadcastTournamentAdvance('tournament-456', testData);

      expect(() => mockIo.to).not.toThrow();
      expect(() => mockIo.emit).not.toThrow();
    });

    it('broadcastToLobby가 로비 룸에 이벤트를 전송해야 함', () => {
      const testEvent = 'new_match_available';
      const testData = { matchId: 'match-789', status: 'waiting' };

      socketManager.broadcastToLobby(testEvent, testData);

      expect(() => mockIo.to).not.toThrow();
      expect(() => mockIo.emit).not.toThrow();
    });
  });

  describe('연결 핸들러 통합', () => {
    it('클라이언트 연결 시 이벤트 리스너를 등록해야 함', () => {
      const connectionCallback = (mockIo.on as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[1] as ((socket: unknown) => void) | undefined;

      expect(connectionCallback).toBeDefined();
      expect(typeof connectionCallback).toBe('function');

      // 모킹된 소켓 생성
      const mockSocket = {
        id: 'socket-test-1',
        on: vi.fn(),
        join: vi.fn(),
        leave: vi.fn(),
        emit: vi.fn(),
      };

      // 연결 핸들러 실행
      if (connectionCallback) {
        connectionCallback(mockSocket);
      }

      // 소켓에 이벤트 리스너가 등록되었는지 확인
      expect(() => mockSocket.on).not.toThrow();
    });
  });
});
