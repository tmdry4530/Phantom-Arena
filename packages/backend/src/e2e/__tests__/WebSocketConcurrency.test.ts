/**
 * WebSocket 동시성 E2E 테스트
 *
 * 검증 항목:
 * - 다중 클라이언트 동시 연결 및 추적
 * - 룸 참가/퇴장 및 브로드캐스트 격리
 * - 배팅/토너먼트 룸 브로드캐스트
 * - 플레이어 입력 동시 처리 및 유효성 검증
 * - 재연결 후 룸 재참가 및 전체 동기화
 * - 동시성 스트레스 (대량 참가/퇴장)
 * - 에러 핸들링 (잘못된 데이터)
 *
 * 주의: 실제 타이머 사용 (WebSocket I/O에 fake timer 사용 불가)
 */

import { createServer, type Server as HttpServer } from 'node:http';
import { type AddressInfo } from 'node:net';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import { GameLoopManager } from '../../game/GameLoopManager.js';
import { SocketManager } from '../../websocket/SocketManager.js';
import { WS_EVENTS } from '@ghost-protocol/shared';

// ===== 테스트 인프라 =====

let httpServer: HttpServer;
let ioServer: SocketIOServer;
let gameLoopManager: GameLoopManager;
let socketManager: SocketManager;
let port: number;

/** 테스트 중 생성된 모든 클라이언트 추적 (정리용) */
const activeClients: ClientSocket[] = [];

/**
 * 연결된 클라이언트 소켓 생성
 * @returns 연결 완료된 클라이언트 소켓 Promise
 */
function createClient(): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const client = ioc(`http://localhost:${String(port)}`, {
      transports: ['websocket'],
      forceNew: true,
    });
    const timer = setTimeout(() => {
      reject(new Error('클라이언트 연결 타임아웃'));
    }, 5000);
    client.on('connect', () => {
      clearTimeout(timer);
      activeClients.push(client);
      resolve(client);
    });
    client.on('connect_error', (err: Error) => {
      clearTimeout(timer);
      reject(new Error(`클라이언트 연결 실패: ${err.message}`));
    });
  });
}

/**
 * 여러 클라이언트를 동시에 생성
 * @param count 생성할 클라이언트 수
 * @returns 연결 완료된 클라이언트 배열
 */
function createClients(count: number): Promise<ClientSocket[]> {
  const promises: Promise<ClientSocket>[] = [];
  for (let i = 0; i < count; i++) {
    promises.push(createClient());
  }
  return Promise.all(promises);
}

/**
 * 특정 이벤트를 대기 (타임아웃 포함)
 * @param socket 클라이언트 소켓
 * @param event 대기할 이벤트 이름
 * @param timeout 타임아웃 (ms)
 * @returns 이벤트 데이터
 */
function waitForEvent<T = unknown>(
  socket: ClientSocket,
  event: string,
  timeout = 5000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`이벤트 대기 타임아웃: ${event}`));
    }, timeout);
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

/**
 * 특정 이벤트가 발생하지 않음을 확인
 * @param socket 클라이언트 소켓
 * @param event 감지할 이벤트 이름
 * @param waitMs 대기 시간 (ms)
 * @returns 이벤트 미수신 시 true, 수신 시 false
 */
function expectNoEvent(
  socket: ClientSocket,
  event: string,
  waitMs = 300,
): Promise<boolean> {
  return new Promise((resolve) => {
    let received = false;
    const handler = () => {
      received = true;
    };
    socket.on(event, handler);
    setTimeout(() => {
      socket.off(event, handler);
      resolve(!received);
    }, waitMs);
  });
}

/**
 * 짧은 대기 (이벤트 전파 보장용)
 * @param ms 대기 시간 (ms)
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * 클라이언트 연결 해제 및 완료 대기
 * @param client 해제할 클라이언트
 */
function disconnectClient(client: ClientSocket): Promise<void> {
  return new Promise((resolve) => {
    if (client.disconnected) {
      resolve();
      return;
    }
    client.on('disconnect', () => {
      resolve();
    });
    client.disconnect();
  });
}

// ===== 서버 설정/해제 =====

beforeAll(
  async () => {
    httpServer = createServer();
    ioServer = new SocketIOServer(httpServer, {
      cors: { origin: '*' },
      transports: ['websocket'],
    });

    gameLoopManager = new GameLoopManager();
    socketManager = new SocketManager(ioServer, gameLoopManager);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address() as AddressInfo;
        port = addr.port;
        resolve();
      });
    });
  },
  10000,
);

afterEach(async () => {
  // 모든 활성 클라이언트 연결 해제
  const disconnectPromises = activeClients
    .filter((c) => c.connected)
    .map((c) => disconnectClient(c));
  await Promise.all(disconnectPromises);
  activeClients.length = 0;

  // 게임 세션 정리
  gameLoopManager.shutdown();

  // 서버 이벤트 전파 대기
  await delay(100);
});

afterAll(() => {
  socketManager.shutdown();
  void ioServer.close();
  return new Promise<void>((resolve) => {
    void httpServer.close(() => {
      resolve();
    });
  });
});

// ===== 테스트 케이스 =====

describe('WebSocket 동시성 E2E', () => {
  // --------------------------------------------------
  // 1. 다중 클라이언트 연결
  // --------------------------------------------------
  describe('다중 클라이언트 연결', () => {
    it('5명의 클라이언트가 동시에 연결한다', async () => {
      const clients = await createClients(5);

      expect(clients).toHaveLength(5);
      for (const client of clients) {
        expect(client.connected).toBe(true);
      }
    });

    it('연결 수가 정확히 추적된다 (getConnectedCount)', async () => {
      const clients = await createClients(3);
      // Socket.io 엔진이 연결을 등록할 시간 확보
      await delay(100);

      expect(socketManager.getConnectedCount()).toBe(3);

      // 1명 해제
      const firstClient = clients[0];
      if (firstClient !== undefined) {
        await disconnectClient(firstClient);
        await delay(100);

        expect(socketManager.getConnectedCount()).toBe(2);

        // 나머지 배열에서 제거 (afterEach 중복 해제 방지)
        const idx = activeClients.indexOf(firstClient);
        if (idx !== -1) {
          activeClients.splice(idx, 1);
        }
      }
    });

    it('클라이언트 해제 시 추적에서 제거된다', async () => {
      const clients = await createClients(4);
      await delay(50);

      // 모두 해제
      for (const client of clients) {
        await disconnectClient(client);
      }
      await delay(100);

      expect(socketManager.getConnectedCount()).toBe(0);

      // activeClients 정리
      activeClients.length = 0;
    });
  });

  // --------------------------------------------------
  // 2. 룸 참가 및 브로드캐스트
  // --------------------------------------------------
  describe('룸 참가 및 브로드캐스트', () => {
    it('같은 서바이벌 룸에 3명이 참가하면 모두 game_state를 수신한다', async () => {
      const roomId = 'surv-broadcast-test';
      const sessionKey = `survival:${roomId}`;

      // 게임 세션 생성 및 시작
      gameLoopManager.createSession({
        sessionId: sessionKey,
        sessionType: 'survival',
        variant: 'classic',
        seed: 42,
        difficulty: 1,
        agents: ['player'],
      });
      gameLoopManager.startSession(sessionKey);

      const clients = await createClients(3);

      // 각 클라이언트에 game_state 수집 Promise 설정
      const gameStatePromises = clients.map((c) =>
        waitForEvent(c, WS_EVENTS.GAME_STATE, 3000),
      );

      // 모두 같은 방 참가
      for (const client of clients) {
        client.emit(WS_EVENTS.JOIN_SURVIVAL, { roomId });
      }

      // 참가 시 full sync로 game_state를 수신하거나,
      // 게임 루프가 실행 중이므로 다음 틱에서 수신
      const results = await Promise.all(gameStatePromises);

      expect(results).toHaveLength(3);
      for (const result of results) {
        expect(result).toBeDefined();
      }

      // 정리
      gameLoopManager.stopSession(sessionKey);
      gameLoopManager.removeSession(sessionKey);
    });

    it('다른 룸의 클라이언트는 game_state를 수신하지 않는다', async () => {
      const roomA = 'surv-room-a';
      const roomB = 'surv-room-b';
      const sessionKeyA = `survival:${roomA}`;

      // 룸 A에만 게임 세션 생성
      gameLoopManager.createSession({
        sessionId: sessionKeyA,
        sessionType: 'survival',
        variant: 'classic',
        seed: 100,
        difficulty: 1,
        agents: ['player'],
      });
      gameLoopManager.startSession(sessionKeyA);

      const clients = await createClients(2);
      const clientA = clients[0];
      const clientB = clients[1];

      if (clientA === undefined || clientB === undefined) {
        throw new Error('클라이언트 생성 실패');
      }

      // clientA는 roomA, clientB는 roomB 참가
      clientA.emit(WS_EVENTS.JOIN_SURVIVAL, { roomId: roomA });
      clientB.emit(WS_EVENTS.JOIN_SURVIVAL, { roomId: roomB });

      // clientA는 game_state 수신 대기
      const clientAReceived = waitForEvent(clientA, WS_EVENTS.GAME_STATE, 2000);

      // clientB는 game_state를 수신하지 않아야 함
      const clientBNoEvent = expectNoEvent(clientB, WS_EVENTS.GAME_STATE, 500);

      await clientAReceived;
      const noEvent = await clientBNoEvent;
      expect(noEvent).toBe(true);

      // 정리
      gameLoopManager.stopSession(sessionKeyA);
      gameLoopManager.removeSession(sessionKeyA);
    });

    it('방 퇴장 후에는 game_state를 수신하지 않는다', async () => {
      const roomId = 'surv-leave-test';
      const sessionKey = `survival:${roomId}`;

      gameLoopManager.createSession({
        sessionId: sessionKey,
        sessionType: 'survival',
        variant: 'classic',
        seed: 200,
        difficulty: 1,
        agents: ['player'],
      });
      gameLoopManager.startSession(sessionKey);

      const client = await createClient();

      // 방 참가 후 첫 game_state 수신 확인
      client.emit(WS_EVENTS.JOIN_SURVIVAL, { roomId });
      await waitForEvent(client, WS_EVENTS.GAME_STATE, 2000);

      // 방 퇴장 (leave_room에는 전체 룸 키 필요)
      client.emit('leave_room', { roomId: sessionKey });
      await delay(100);

      // 퇴장 후에는 수신하지 않아야 함
      const noEvent = await expectNoEvent(client, WS_EVENTS.GAME_STATE, 500);
      expect(noEvent).toBe(true);

      // 정리
      gameLoopManager.stopSession(sessionKey);
      gameLoopManager.removeSession(sessionKey);
    });
  });

  // --------------------------------------------------
  // 3. 배팅 룸 브로드캐스트
  // --------------------------------------------------
  describe('배팅 룸 브로드캐스트', () => {
    it('배팅 업데이트가 betting 룸의 모든 클라이언트에게 전달된다', async () => {
      const matchId = 'match-bet-test';
      const clients = await createClients(3);

      // 모두 배팅 룸 참가
      for (const client of clients) {
        client.emit(WS_EVENTS.JOIN_BETTING, { roomId: matchId });
      }
      await delay(150);

      // 이벤트 대기 설정
      const betPromises = clients.map((c) =>
        waitForEvent(c, WS_EVENTS.BET_UPDATE, 3000),
      );

      // 서버에서 배팅 업데이트 브로드캐스트
      const betData = { odds: 1.5, pool: 1000, betCount: 7 };
      socketManager.broadcastBetUpdate(matchId, betData);

      const results = await Promise.all(betPromises);

      expect(results).toHaveLength(3);
      for (const result of results) {
        const data = result as Record<string, unknown>;
        expect(data['odds']).toBe(1.5);
        expect(data['pool']).toBe(1000);
        expect(data['betCount']).toBe(7);
      }
    });

    it('토너먼트 진행이 tournament 룸의 모든 클라이언트에게 전달된다', async () => {
      const tournamentId = 'tourney-adv-test';
      const clients = await createClients(2);

      // 모두 토너먼트 룸 참가
      for (const client of clients) {
        client.emit(WS_EVENTS.JOIN_TOURNAMENT, { roomId: tournamentId });
      }
      await delay(150);

      // 이벤트 대기
      const advancePromises = clients.map((c) =>
        waitForEvent(c, WS_EVENTS.TOURNAMENT_ADVANCE, 3000),
      );

      // 서버에서 토너먼트 진행 브로드캐스트
      const advanceData = { round: 2, bracket: 'semifinals' };
      socketManager.broadcastTournamentAdvance(tournamentId, advanceData);

      const results = await Promise.all(advancePromises);

      expect(results).toHaveLength(2);
      for (const result of results) {
        const data = result as Record<string, unknown>;
        expect(data['round']).toBe(2);
        expect(data['bracket']).toBe('semifinals');
      }
    });
  });

  // --------------------------------------------------
  // 4. 플레이어 입력 동시 처리
  // --------------------------------------------------
  describe('플레이어 입력 동시 처리', () => {
    it('여러 클라이언트의 player_input이 올바르게 처리된다', async () => {
      const roomId = 'surv-input-test';
      const sessionKey = `survival:${roomId}`;

      gameLoopManager.createSession({
        sessionId: sessionKey,
        sessionType: 'survival',
        variant: 'classic',
        seed: 300,
        difficulty: 1,
        agents: ['player'],
      });
      gameLoopManager.startSession(sessionKey);

      const clients = await createClients(3);

      // 각 클라이언트가 방에 참가
      for (const client of clients) {
        client.emit(WS_EVENTS.JOIN_SURVIVAL, { roomId });
      }
      await delay(100);

      // 여러 클라이언트가 동시에 입력 전송 (에러 없이 처리되어야 함)
      const directions = ['up', 'down', 'left'] as const;
      for (let i = 0; i < clients.length; i++) {
        const client = clients[i];
        const direction = directions[i];
        if (client !== undefined && direction !== undefined) {
          client.emit(WS_EVENTS.PLAYER_INPUT, {
            sessionId: roomId,
            direction,
          });
        }
      }

      // 게임 루프가 다음 틱에서 입력을 소비할 시간 확보
      await delay(100);

      // 모든 클라이언트가 여전히 game_state를 수신하는지 확인
      const statePromises = clients.map((c) =>
        waitForEvent(c, WS_EVENTS.GAME_STATE, 2000),
      );
      const states = await Promise.all(statePromises);

      expect(states).toHaveLength(3);
      for (const state of states) {
        expect(state).toBeDefined();
      }

      // 정리
      gameLoopManager.stopSession(sessionKey);
      gameLoopManager.removeSession(sessionKey);
    });

    it('잘못된 방향값은 무시된다', async () => {
      const roomId = 'surv-invalid-dir';
      const sessionKey = `survival:${roomId}`;

      gameLoopManager.createSession({
        sessionId: sessionKey,
        sessionType: 'survival',
        variant: 'classic',
        seed: 400,
        difficulty: 1,
        agents: ['player'],
      });
      gameLoopManager.startSession(sessionKey);

      const client = await createClient();
      client.emit(WS_EVENTS.JOIN_SURVIVAL, { roomId });
      await delay(100);

      // 잘못된 방향값 전송 (에러 없이 무시되어야 함)
      client.emit(WS_EVENTS.PLAYER_INPUT, {
        sessionId: roomId,
        direction: 'diagonal',
      });

      client.emit(WS_EVENTS.PLAYER_INPUT, {
        sessionId: roomId,
        direction: '',
      });

      // 서버가 크래시하지 않고 정상적으로 game_state 전송 계속
      const state = await waitForEvent(client, WS_EVENTS.GAME_STATE, 2000);
      expect(state).toBeDefined();

      // 정리
      gameLoopManager.stopSession(sessionKey);
      gameLoopManager.removeSession(sessionKey);
    });

    it('잘못된 데이터 형식은 무시된다', async () => {
      const roomId = 'surv-bad-format';
      const sessionKey = `survival:${roomId}`;

      gameLoopManager.createSession({
        sessionId: sessionKey,
        sessionType: 'survival',
        variant: 'classic',
        seed: 500,
        difficulty: 1,
        agents: ['player'],
      });
      gameLoopManager.startSession(sessionKey);

      const client = await createClient();
      client.emit(WS_EVENTS.JOIN_SURVIVAL, { roomId });
      await delay(100);

      // 다양한 잘못된 형식 전송
      client.emit(WS_EVENTS.PLAYER_INPUT, null);
      client.emit(WS_EVENTS.PLAYER_INPUT, 'not-an-object');
      client.emit(WS_EVENTS.PLAYER_INPUT, 12345);
      client.emit(WS_EVENTS.PLAYER_INPUT, { sessionId: 123, direction: true });

      // 서버가 크래시하지 않고 정상 동작 확인
      const state = await waitForEvent(client, WS_EVENTS.GAME_STATE, 2000);
      expect(state).toBeDefined();

      // 정리
      gameLoopManager.stopSession(sessionKey);
      gameLoopManager.removeSession(sessionKey);
    });
  });

  // --------------------------------------------------
  // 5. 재연결 처리
  // --------------------------------------------------
  describe('재연결 처리', () => {
    it('클라이언트 재연결 후 룸에 다시 참가할 수 있다', async () => {
      const roomId = 'surv-reconnect-test';
      const sessionKey = `survival:${roomId}`;

      gameLoopManager.createSession({
        sessionId: sessionKey,
        sessionType: 'survival',
        variant: 'classic',
        seed: 600,
        difficulty: 1,
        agents: ['player'],
      });
      gameLoopManager.startSession(sessionKey);

      // 첫 번째 연결
      const client1 = await createClient();
      client1.emit(WS_EVENTS.JOIN_SURVIVAL, { roomId });
      await waitForEvent(client1, WS_EVENTS.GAME_STATE, 2000);

      // 연결 해제
      await disconnectClient(client1);
      activeClients.splice(activeClients.indexOf(client1), 1);
      await delay(100);

      // 재연결 (새 소켓)
      const client2 = await createClient();
      client2.emit(WS_EVENTS.JOIN_SURVIVAL, { roomId });

      // 재참가 후 game_state 수신 확인
      const state = await waitForEvent(client2, WS_EVENTS.GAME_STATE, 2000);
      expect(state).toBeDefined();

      // 정리
      gameLoopManager.stopSession(sessionKey);
      gameLoopManager.removeSession(sessionKey);
    });

    it('재연결 시 전체 동기화(full sync)를 수신한다', async () => {
      const roomId = 'surv-fullsync-test';
      const sessionKey = `survival:${roomId}`;

      gameLoopManager.createSession({
        sessionId: sessionKey,
        sessionType: 'survival',
        variant: 'classic',
        seed: 700,
        difficulty: 1,
        agents: ['player'],
      });
      gameLoopManager.startSession(sessionKey);

      // 게임을 몇 틱 진행 (상태 변화 발생)
      await delay(200);

      // 새 클라이언트 접속
      const client = await createClient();

      // join 시 full sync가 emit됨 (handleJoinRoom에서 getFullSync 호출)
      const syncPromise = waitForEvent<Record<string, unknown>>(
        client,
        WS_EVENTS.GAME_STATE,
        3000,
      );
      client.emit(WS_EVENTS.JOIN_SURVIVAL, { roomId });

      const syncData = await syncPromise;

      // full sync는 GameState 전체를 포함 (maze, pacman, ghosts 등)
      expect(syncData).toBeDefined();
      expect(syncData).toHaveProperty('tick');
      expect(syncData).toHaveProperty('pacman');
      expect(syncData).toHaveProperty('ghosts');

      // 정리
      gameLoopManager.stopSession(sessionKey);
      gameLoopManager.removeSession(sessionKey);
    });
  });

  // --------------------------------------------------
  // 6. 동시성 스트레스 테스트
  // --------------------------------------------------
  describe('동시성 스트레스 테스트', () => {
    it(
      '10명의 클라이언트가 동시에 룸에 참가/퇴장한다',
      async () => {
        const roomId = 'surv-stress-test';
        const sessionKey = `survival:${roomId}`;

        gameLoopManager.createSession({
          sessionId: sessionKey,
          sessionType: 'survival',
          variant: 'classic',
          seed: 800,
          difficulty: 1,
          agents: ['player'],
        });
        gameLoopManager.startSession(sessionKey);

        // 10명 동시 연결
        const clients = await createClients(10);
        await delay(100);

        expect(socketManager.getConnectedCount()).toBe(10);

        // 모두 동시에 방 참가
        for (const client of clients) {
          client.emit(WS_EVENTS.JOIN_SURVIVAL, { roomId });
        }
        await delay(200);

        // 모두 game_state를 수신하는지 확인
        const statePromises = clients.map((c) =>
          waitForEvent(c, WS_EVENTS.GAME_STATE, 3000),
        );
        const states = await Promise.all(statePromises);
        expect(states).toHaveLength(10);

        // 절반(5명)이 동시에 퇴장
        for (let i = 0; i < 5; i++) {
          const client = clients[i];
          if (client !== undefined) {
            client.emit('leave_room', { roomId: sessionKey });
          }
        }
        await delay(200);

        // 퇴장한 클라이언트는 수신하지 않아야 함
        const leftNoEvents = clients.slice(0, 5).map((c) =>
          expectNoEvent(c, WS_EVENTS.GAME_STATE, 400),
        );
        const leftResults = await Promise.all(leftNoEvents);
        for (const result of leftResults) {
          expect(result).toBe(true);
        }

        // 남은 5명은 여전히 수신해야 함
        const remainingPromises = clients.slice(5).map((c) =>
          waitForEvent(c, WS_EVENTS.GAME_STATE, 3000),
        );
        const remainingStates = await Promise.all(remainingPromises);
        expect(remainingStates).toHaveLength(5);

        // 정리
        gameLoopManager.stopSession(sessionKey);
        gameLoopManager.removeSession(sessionKey);
      },
      15000,
    );

    it('로비에 여러 클라이언트가 참가하고 글로벌 이벤트를 수신한다', async () => {
      const clients = await createClients(5);

      // 모두 로비 참가
      for (const client of clients) {
        client.emit(WS_EVENTS.JOIN_LOBBY);
      }
      await delay(150);

      // 이벤트 대기 설정
      const lobbyEvent = 'new_match_available';
      const eventPromises = clients.map((c) =>
        waitForEvent(c, lobbyEvent, 3000),
      );

      // 서버에서 로비 글로벌 이벤트 브로드캐스트
      const eventData = { matchId: 'match-lobby-test', status: 'waiting' };
      socketManager.broadcastToLobby(lobbyEvent, eventData);

      const results = await Promise.all(eventPromises);

      expect(results).toHaveLength(5);
      for (const result of results) {
        const data = result as Record<string, unknown>;
        expect(data['matchId']).toBe('match-lobby-test');
        expect(data['status']).toBe('waiting');
      }
    });
  });

  // --------------------------------------------------
  // 7. 에러 핸들링
  // --------------------------------------------------
  describe('에러 핸들링', () => {
    it('유효하지 않은 roomId로 참가 시 에러 이벤트를 수신한다', async () => {
      const client = await createClient();

      // 빈 문자열 roomId
      const errorPromise = waitForEvent<Record<string, unknown>>(
        client,
        'error',
        3000,
      );
      client.emit(WS_EVENTS.JOIN_MATCH, { roomId: '' });

      const errorData = await errorPromise;
      expect(errorData).toBeDefined();
      expect(errorData['message']).toBeDefined();
    });

    it('데이터 없이 join_match 시 에러 이벤트를 수신한다', async () => {
      const client = await createClient();

      // null 전송
      const errorPromise1 = waitForEvent<Record<string, unknown>>(
        client,
        'error',
        3000,
      );
      client.emit(WS_EVENTS.JOIN_MATCH, null);

      const error1 = await errorPromise1;
      expect(error1).toBeDefined();
      expect(error1['message']).toBeDefined();
    });

    it('roomId가 숫자인 잘못된 타입으로 참가 시 에러 이벤트를 수신한다', async () => {
      const client = await createClient();

      const errorPromise = waitForEvent<Record<string, unknown>>(
        client,
        'error',
        3000,
      );
      client.emit(WS_EVENTS.JOIN_SURVIVAL, { roomId: 12345 });

      const errorData = await errorPromise;
      expect(errorData).toBeDefined();
      expect(errorData['message']).toBeDefined();
    });
  });

  // --------------------------------------------------
  // 8. 룸 격리 및 교차 검증
  // --------------------------------------------------
  describe('룸 격리 및 교차 검증', () => {
    it('서로 다른 타입의 룸은 독립적으로 동작한다', async () => {
      const matchId = 'cross-match-1';
      const bettingId = 'cross-match-1'; // 같은 ID지만 다른 룸 타입

      const clients = await createClients(2);
      const matchClient = clients[0];
      const bettingClient = clients[1];

      if (matchClient === undefined || bettingClient === undefined) {
        throw new Error('클라이언트 생성 실패');
      }

      // 각각 다른 타입의 룸 참가
      matchClient.emit(WS_EVENTS.JOIN_MATCH, { roomId: matchId });
      bettingClient.emit(WS_EVENTS.JOIN_BETTING, { roomId: bettingId });
      await delay(150);

      // 배팅 업데이트는 betting 룸에만 전달
      const betPromise = waitForEvent(bettingClient, WS_EVENTS.BET_UPDATE, 3000);
      const matchNoBet = expectNoEvent(matchClient, WS_EVENTS.BET_UPDATE, 400);

      socketManager.broadcastBetUpdate(bettingId, { odds: 2.0 });

      await betPromise;
      const noEvent = await matchNoBet;
      expect(noEvent).toBe(true);
    });

    it('한 클라이언트가 여러 룸에 동시에 참가할 수 있다', async () => {
      const matchId = 'multi-room-match';
      const bettingId = 'multi-room-bet';

      const client = await createClient();

      // 두 개의 룸에 동시 참가
      client.emit(WS_EVENTS.JOIN_MATCH, { roomId: matchId });
      client.emit(WS_EVENTS.JOIN_BETTING, { roomId: bettingId });
      await delay(150);

      // 배팅 업데이트 수신 확인
      const betPromise = waitForEvent(client, WS_EVENTS.BET_UPDATE, 3000);
      socketManager.broadcastBetUpdate(bettingId, { odds: 1.8 });

      const betResult = await betPromise;
      expect(betResult).toBeDefined();

      // 로비 이벤트도 수신 가능
      client.emit(WS_EVENTS.JOIN_LOBBY);
      await delay(100);

      const lobbyPromise = waitForEvent(client, 'lobby_announce', 3000);
      socketManager.broadcastToLobby('lobby_announce', { msg: 'test' });

      const lobbyResult = await lobbyPromise;
      const lobbyData = lobbyResult as Record<string, unknown>;
      expect(lobbyData['msg']).toBe('test');
    });
  });

  // --------------------------------------------------
  // 9. 매치 룸 브로드캐스트 (game_state via GameLoopManager)
  // --------------------------------------------------
  describe('매치 룸 브로드캐스트', () => {
    it('매치 룸 참가자가 game_state 프레임을 수신한다', async () => {
      const roomId = 'match-frame-test';
      const sessionKey = `match:${roomId}`;

      gameLoopManager.createSession({
        sessionId: sessionKey,
        sessionType: 'match',
        variant: 'classic',
        seed: 900,
        difficulty: 2,
        agents: ['agent-a', 'agent-b'],
      });
      gameLoopManager.startSession(sessionKey);

      const clients = await createClients(2);
      const spectator1 = clients[0];
      const spectator2 = clients[1];

      if (spectator1 === undefined || spectator2 === undefined) {
        throw new Error('클라이언트 생성 실패');
      }

      // 매치 룸 참가
      spectator1.emit(WS_EVENTS.JOIN_MATCH, { roomId });
      spectator2.emit(WS_EVENTS.JOIN_MATCH, { roomId });

      // 두 관전자 모두 game_state 수신
      const [frame1, frame2] = await Promise.all([
        waitForEvent<Record<string, unknown>>(spectator1, WS_EVENTS.GAME_STATE, 3000),
        waitForEvent<Record<string, unknown>>(spectator2, WS_EVENTS.GAME_STATE, 3000),
      ]);

      expect(frame1).toHaveProperty('tick');
      expect(frame2).toHaveProperty('tick');

      // 정리
      gameLoopManager.stopSession(sessionKey);
      gameLoopManager.removeSession(sessionKey);
    });
  });

  // --------------------------------------------------
  // 10. 대량 연결 해제 복원력
  // --------------------------------------------------
  describe('대량 연결 해제 복원력', () => {
    it(
      '동시 대량 연결 해제 후에도 남은 클라이언트가 정상 동작한다',
      async () => {
        const roomId = 'surv-mass-disconnect';
        const sessionKey = `survival:${roomId}`;

        gameLoopManager.createSession({
          sessionId: sessionKey,
          sessionType: 'survival',
          variant: 'classic',
          seed: 1000,
          difficulty: 1,
          agents: ['player'],
        });
        gameLoopManager.startSession(sessionKey);

        const clients = await createClients(8);

        // 모두 방 참가
        for (const client of clients) {
          client.emit(WS_EVENTS.JOIN_SURVIVAL, { roomId });
        }
        await delay(200);

        // 6명 동시 연결 해제
        const disconnectBatch = clients.slice(0, 6);
        await Promise.all(
          disconnectBatch.map((c) => disconnectClient(c)),
        );
        // activeClients에서 제거
        for (const c of disconnectBatch) {
          const idx = activeClients.indexOf(c);
          if (idx >= 0) activeClients.splice(idx, 1);
        }
        await delay(200);

        // 남은 2명이 여전히 game_state를 수신하는지 확인
        const remaining = clients.slice(6);
        const statePromises = remaining.map((c) =>
          waitForEvent(c, WS_EVENTS.GAME_STATE, 3000),
        );
        const states = await Promise.all(statePromises);

        expect(states).toHaveLength(2);
        for (const state of states) {
          expect(state).toBeDefined();
        }

        // 정리
        gameLoopManager.stopSession(sessionKey);
        gameLoopManager.removeSession(sessionKey);
      },
      15000,
    );
  });
});
