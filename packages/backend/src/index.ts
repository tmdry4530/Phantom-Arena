/**
 * Ghost Protocol 메인 서버 진입점
 * Express HTTP 서버, Socket.io WebSocket, 게임 루프 매니저를 초기화하고 시작한다.
 */
import express from 'express';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import pino from 'pino';
import { loadEnv } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { GameLoopManager } from './game/GameLoopManager.js';
import { SocketManager } from './websocket/SocketManager.js';

/** 구조화된 로거 인스턴스 */
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

/** 서버 시작 */
function main(): void {
  const env = loadEnv();

  /** Express 앱 인스턴스 */
  const app = express();

  /** HTTP 서버 — Socket.io와 공유 */
  const httpServer = createServer(app);

  /** Socket.io 서버 인스턴스 */
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
    },
  });

  // 미들웨어 설정
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  // 게임 루프 매니저 & 소켓 매니저 초기화
  const gameLoopManager = new GameLoopManager();
  const socketManager = new SocketManager(io, gameLoopManager);

  // 상태 확인 엔드포인트
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: Date.now(),
      connections: socketManager.getConnectedCount(),
      activeSessions: gameLoopManager.getActiveSessions().length,
    });
  });

  // API v1 루트
  app.get('/api/v1', (_req, res) => {
    res.json({
      name: 'Ghost Protocol API',
      version: '0.1.0',
      description: 'AI 에이전트 팩맨 아레나 API',
    });
  });

  // 서바이벌 세션 생성
  app.post('/api/v1/survival', (_req, res) => {
    const sessionId = `surv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const seed = Math.floor(Math.random() * 0xFFFFFFFF);

    gameLoopManager.createSession({
      sessionId: `survival:${sessionId}`,
      sessionType: 'survival',
      variant: 'classic',
      seed,
      difficulty: 1,
      agents: ['player'],
    });

    gameLoopManager.startSession(`survival:${sessionId}`);

    res.status(201).json({
      sessionId,
      roomId: `survival:${sessionId}`,
      seed,
    });
  });

  // 활성 세션 조회
  app.get('/api/v1/sessions', (_req, res) => {
    res.json({
      sessions: gameLoopManager.getActiveSessions(),
    });
  });

  // 에러 핸들러 (반드시 마지막에 등록)
  app.use(errorHandler);

  // Graceful Shutdown
  const shutdown = () => {
    logger.info('서버 종료 중...');
    socketManager.shutdown();
    httpServer.close(() => {
      logger.info('서버 종료 완료');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // 서버 시작
  httpServer.listen(env.PORT, () => {
    logger.info(`Ghost Protocol 서버 시작: http://localhost:${env.PORT.toString()}`);
    logger.info(`WebSocket 대기 중: ws://localhost:${env.PORT.toString()}`);
  });
}

try {
  main();
} catch (error: unknown) {
  console.error('서버 시작 실패:', error);
  process.exit(1);
}
