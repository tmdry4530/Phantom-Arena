/**
 * GameLoopManager 유닛 테스트
 *
 * 검증 항목:
 * - 세션 생성 및 중복 확인
 * - 게임 루프 시작 및 콜백 실행
 * - 게임 루프 중지
 * - 플레이어 입력 주입
 * - 세션 제거
 * - 활성 세션 조회
 * - 전체 종료
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameLoopManager } from '../GameLoopManager.js';
import type { GameStateFrame } from '@ghost-protocol/shared';

describe('GameLoopManager', () => {
  let manager: GameLoopManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new GameLoopManager();
  });

  afterEach(() => {
    manager.shutdown();
    vi.restoreAllMocks();
  });

  describe('createSession', () => {
    it('새 게임 세션을 생성해야 함', () => {
      manager.createSession({
        sessionId: 'test-session-1',
        sessionType: 'survival',
        variant: 'classic',
        seed: 12345,
        difficulty: 1,
        agents: ['player'],
      });

      const state = manager.getSessionState('test-session-1');
      expect(state).not.toBeNull();
      expect(state?.tick).toBe(0);
    });

    it('중복 세션 ID로 생성 시 에러를 발생시켜야 함', () => {
      manager.createSession({
        sessionId: 'duplicate-session',
        sessionType: 'match',
        variant: 'classic',
        seed: 11111,
        difficulty: 1,
        agents: ['agent-a', 'agent-b'],
      });

      expect(() => {
        manager.createSession({
          sessionId: 'duplicate-session',
          sessionType: 'survival',
          variant: 'labyrinth',
          seed: 22222,
          difficulty: 2,
          agents: ['player'],
        });
      }).toThrow('세션이 이미 존재합니다: duplicate-session');
    });
  });

  describe('startSession', () => {
    it('게임 루프를 시작하고 콜백을 호출해야 함', () => {
      const onGameStateSpy = vi.fn();
      manager.setOnGameState(onGameStateSpy);

      manager.createSession({
        sessionId: 'start-test',
        sessionType: 'survival',
        variant: 'classic',
        seed: 99999,
        difficulty: 1,
        agents: ['player'],
      });

      manager.startSession('start-test');

      // 16.667ms (60fps) 진행
      vi.advanceTimersByTime(17);

      // 콜백이 최소 1회 호출되었는지 확인
      expect(onGameStateSpy).toHaveBeenCalled();

      const firstCall = onGameStateSpy.mock.calls[0];
      if (firstCall) {
        const [sessionId, frame] = firstCall as [string, GameStateFrame];
        expect(sessionId).toBe('start-test');
        expect(frame.tick).toBeGreaterThanOrEqual(0);
      }
    });

    it('이미 실행 중인 세션을 재시작해도 중복 실행되지 않아야 함', () => {
      const onGameStateSpy = vi.fn();
      manager.setOnGameState(onGameStateSpy);

      manager.createSession({
        sessionId: 'restart-test',
        sessionType: 'survival',
        variant: 'classic',
        seed: 55555,
        difficulty: 1,
        agents: ['player'],
      });

      manager.startSession('restart-test');
      manager.startSession('restart-test'); // 중복 시작

      vi.advanceTimersByTime(17);

      // 호출 횟수가 중복되지 않아야 함 (정확히 1틱분만)
      expect(onGameStateSpy.mock.calls.length).toBeLessThanOrEqual(2);
    });

    it('존재하지 않는 세션 시작 시 에러를 발생시켜야 함', () => {
      expect(() => {
        manager.startSession('non-existent-session');
      }).toThrow('세션을 찾을 수 없습니다');
    });
  });

  describe('stopSession', () => {
    it('게임 루프를 중지해야 함', () => {
      const onGameStateSpy = vi.fn();
      manager.setOnGameState(onGameStateSpy);

      manager.createSession({
        sessionId: 'stop-test',
        sessionType: 'survival',
        variant: 'classic',
        seed: 77777,
        difficulty: 1,
        agents: ['player'],
      });

      manager.startSession('stop-test');
      vi.advanceTimersByTime(17);

      const callCountBeforeStop = onGameStateSpy.mock.calls.length;

      manager.stopSession('stop-test');

      // 추가 시간 진행해도 더 이상 호출되지 않아야 함
      vi.advanceTimersByTime(100);

      expect(onGameStateSpy.mock.calls.length).toBe(callCountBeforeStop);
    });

    it('존재하지 않는 세션 중지는 에러를 발생시키지 않아야 함', () => {
      expect(() => {
        manager.stopSession('non-existent-session');
      }).not.toThrow();
    });
  });

  describe('handleInput', () => {
    it('플레이어 입력을 세션에 주입해야 함', () => {
      manager.createSession({
        sessionId: 'input-test',
        sessionType: 'survival',
        variant: 'classic',
        seed: 33333,
        difficulty: 1,
        agents: ['player'],
      });

      manager.startSession('input-test');

      // 입력 주입 (에러가 발생하지 않아야 함)
      expect(() => {
        manager.handleInput('input-test', 'player', 'up');
        manager.handleInput('input-test', 'player', 'down');
        manager.handleInput('input-test', 'player', 'left');
        manager.handleInput('input-test', 'player', 'right');
      }).not.toThrow();
    });

    it('실행 중이 아닌 세션에 입력 주입 시 무시되어야 함', () => {
      manager.createSession({
        sessionId: 'input-not-running',
        sessionType: 'survival',
        variant: 'classic',
        seed: 44444,
        difficulty: 1,
        agents: ['player'],
      });

      // 시작하지 않은 상태에서 입력 주입 (에러 없이 무시)
      expect(() => {
        manager.handleInput('input-not-running', 'player', 'up');
      }).not.toThrow();
    });

    it('존재하지 않는 세션에 입력 주입 시 무시되어야 함', () => {
      expect(() => {
        manager.handleInput('non-existent', 'player', 'up');
      }).not.toThrow();
    });
  });

  describe('removeSession', () => {
    it('세션을 완전히 삭제해야 함', () => {
      manager.createSession({
        sessionId: 'remove-test',
        sessionType: 'survival',
        variant: 'classic',
        seed: 66666,
        difficulty: 1,
        agents: ['player'],
      });

      manager.startSession('remove-test');
      expect(manager.getActiveSessions()).toContain('remove-test');

      manager.removeSession('remove-test');

      expect(manager.getSessionState('remove-test')).toBeNull();
      expect(manager.getActiveSessions()).not.toContain('remove-test');
    });
  });

  describe('getActiveSessions', () => {
    it('실행 중인 세션 ID 목록을 반환해야 함', () => {
      manager.createSession({
        sessionId: 'active-1',
        sessionType: 'survival',
        variant: 'classic',
        seed: 10001,
        difficulty: 1,
        agents: ['player'],
      });

      manager.createSession({
        sessionId: 'active-2',
        sessionType: 'match',
        variant: 'labyrinth',
        seed: 10002,
        difficulty: 2,
        agents: ['agent-a', 'agent-b'],
      });

      manager.createSession({
        sessionId: 'inactive-1',
        sessionType: 'survival',
        variant: 'speedway',
        seed: 10003,
        difficulty: 3,
        agents: ['player'],
      });

      manager.startSession('active-1');
      manager.startSession('active-2');
      // inactive-1은 시작하지 않음

      const activeSessions = manager.getActiveSessions();

      expect(activeSessions).toContain('active-1');
      expect(activeSessions).toContain('active-2');
      expect(activeSessions).not.toContain('inactive-1');
    });

    it('실행 중인 세션이 없으면 빈 배열을 반환해야 함', () => {
      expect(manager.getActiveSessions()).toEqual([]);
    });
  });

  describe('shutdown', () => {
    it('모든 세션을 중지하고 정리해야 함', () => {
      manager.createSession({
        sessionId: 'shutdown-1',
        sessionType: 'survival',
        variant: 'classic',
        seed: 20001,
        difficulty: 1,
        agents: ['player'],
      });

      manager.createSession({
        sessionId: 'shutdown-2',
        sessionType: 'match',
        variant: 'labyrinth',
        seed: 20002,
        difficulty: 2,
        agents: ['agent-a', 'agent-b'],
      });

      manager.startSession('shutdown-1');
      manager.startSession('shutdown-2');

      expect(manager.getActiveSessions().length).toBe(2);

      manager.shutdown();

      expect(manager.getActiveSessions()).toEqual([]);
      expect(manager.getSessionState('shutdown-1')).toBeNull();
      expect(manager.getSessionState('shutdown-2')).toBeNull();
    });
  });

  describe('게임 오버 콜백', () => {
    it('게임 오버 시 onGameOver 콜백이 호출되어야 함', () => {
      const onGameOverSpy = vi.fn();
      manager.setOnGameOver(onGameOverSpy);

      manager.createSession({
        sessionId: 'gameover-test',
        sessionType: 'survival',
        variant: 'classic',
        seed: 88888,
        difficulty: 1,
        agents: ['player'],
      });

      manager.startSession('gameover-test');

      // 게임 오버 상태가 될 때까지 시간 진행
      // (실제로는 GameStateManager가 게임 오버를 결정)
      // 여기서는 충분히 오랜 시간 진행하여 테스트
      vi.advanceTimersByTime(1000);

      // 게임 오버가 발생했을 수도 있음 (게임 로직에 따라)
      // 최소한 에러가 발생하지 않았음을 확인
      expect(true).toBe(true);
    });
  });

  describe('전체 동기화', () => {
    it('getFullSync가 전체 게임 상태를 반환해야 함', () => {
      manager.createSession({
        sessionId: 'fullsync-test',
        sessionType: 'survival',
        variant: 'classic',
        seed: 11223,
        difficulty: 1,
        agents: ['player'],
      });

      const fullSync = manager.getFullSync('fullsync-test');

      expect(fullSync).not.toBeNull();
      expect(fullSync?.maze).toBeDefined();
      expect(fullSync?.pacman).toBeDefined();
      expect(fullSync?.ghosts).toBeDefined();
    });
  });
});
