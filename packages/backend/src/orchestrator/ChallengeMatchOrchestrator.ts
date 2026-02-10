/**
 * 챌린지 매치 오케스트레이터
 * 유저 에이전트(팩맨) vs 서버 AI 고스트 실시간 대전의 라이프사이클을 관장한다.
 *
 * 상태 전이:
 * created → waiting_agent → countdown → active → completed/expired
 */
import type { GameLoopManager } from '../game/GameLoopManager.js';
import type { SocketManager } from '../websocket/SocketManager.js';
import type { BettingOrchestrator } from './BettingOrchestrator.js';
import type {
  Direction,
  DifficultyTier,
  GameState,
  ChallengeMatchInfo,
  ChallengeStatus,
} from '@ghost-protocol/shared';
import { WS_EVENTS } from '@ghost-protocol/shared';
import pino from 'pino';

/** 서버 AI 고스트 가상 주소 (배팅 사이드 B) */
const SERVER_AI_ADDRESS = '0x' + 'ghost'.padStart(40, '0');

/** 내부 챌린지 매치 상태 (mutable) */
interface ChallengeMatch {
  id: string;
  agentId: string;
  sessionToken: string;
  difficulty: DifficultyTier;
  status: ChallengeStatus;
  sessionId: string;
  onChainMatchId: number;
  createdAt: number;
  agentSocketId: string | null;
  score: number;
  winner: 'pacman' | 'ghost' | null;
  expiryTimer: ReturnType<typeof setTimeout> | null;
  gameDurationTimer: ReturnType<typeof setTimeout> | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
}

/**
 * 챌린지 매치 오케스트레이터
 * 매치 생성 → 에이전트 연결 → 카운트다운 → 게임 실행 → 결과 판정
 */
export class ChallengeMatchOrchestrator {
  /** 활성 챌린지 맵 (matchId → ChallengeMatch) */
  private readonly matches: Map<string, ChallengeMatch> = new Map();

  /** 에이전트 소켓 → 매치 매핑 (socketId → matchId) */
  private readonly agentSocketMap: Map<string, string> = new Map();

  private readonly gameLoopManager: GameLoopManager;
  private readonly socketManager: SocketManager;
  private readonly bettingOrchestrator: BettingOrchestrator | null;

  /** 온체인 matchId 카운터 (토너먼트와 충돌 방지를 위해 1000부터 시작) */
  private onChainMatchCounter = 1000;

  private readonly logger = pino({ name: 'challenge-orchestrator' });

  /** 기존 게임 오버 콜백 보관 */
  private originalGameOverCallback:
    | ((sessionId: string, state: GameState) => void)
    | null = null;

  /** 동시 활성 챌린지 최대 수 */
  private readonly MAX_CONCURRENT = 10;

  /** 에이전트 연결 타임아웃 (60초) */
  private readonly AGENT_CONNECT_TIMEOUT = 60_000;

  /** 게임 시간 제한 (5분) */
  private readonly GAME_DURATION_LIMIT = 300_000;

  /** 재연결 유예 기간 (10초) */
  private readonly RECONNECT_GRACE = 10_000;

  /** 카운트다운 초 */
  private readonly COUNTDOWN_SECONDS = 3;

  /** 배팅 창 시간 (초) */
  private readonly BETTING_WINDOW_SECONDS = 30;

  constructor(
    gameLoopManager: GameLoopManager,
    socketManager: SocketManager,
    bettingOrchestrator?: BettingOrchestrator,
  ) {
    this.gameLoopManager = gameLoopManager;
    this.socketManager = socketManager;
    this.bettingOrchestrator = bettingOrchestrator ?? null;
    this.wrapGameOverCallback();
  }

  /**
   * 새 챌린지 생성
   * @param agentId 에이전트 ID
   * @param difficulty 난이도 (1~5)
   * @param sessionToken 세션 토큰 (인증용)
   * @returns 생성된 챌린지 공개 정보
   * @throws 동시 활성 챌린지 한도 초과 시
   */
  createChallenge(
    agentId: string,
    difficulty: DifficultyTier,
    sessionToken: string,
  ): ChallengeMatchInfo {
    const activeCount = Array.from(this.matches.values()).filter(
      (m) =>
        m.status === 'waiting_agent' ||
        m.status === 'active' ||
        m.status === 'countdown',
    ).length;

    if (activeCount >= this.MAX_CONCURRENT) {
      throw new Error(
        `동시 활성 챌린지 한도 초과 (${String(this.MAX_CONCURRENT)}). 잠시 후 다시 시도하세요.`,
      );
    }

    const id = `challenge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const sessionId = `match:challenge-${id}`;
    const onChainMatchId = ++this.onChainMatchCounter;

    const match: ChallengeMatch = {
      id,
      agentId,
      sessionToken,
      difficulty,
      status: 'waiting_agent',
      sessionId,
      onChainMatchId,
      createdAt: Date.now(),
      agentSocketId: null,
      score: 0,
      winner: null,
      expiryTimer: null,
      gameDurationTimer: null,
      reconnectTimer: null,
    };

    // 에이전트 연결 타임아웃
    match.expiryTimer = setTimeout(() => {
      this.handleExpiry(id);
    }, this.AGENT_CONNECT_TIMEOUT);

    this.matches.set(id, match);

    // 로비에 챌린지 생성 알림
    this.socketManager.broadcastToLobby(WS_EVENTS.CHALLENGE_CREATED, {
      match: this.toPublicInfo(match),
    } as Record<string, unknown>);

    this.logger.info({ matchId: id, agentId, difficulty }, '챌린지 생성됨');

    return this.toPublicInfo(match);
  }

  /**
   * 에이전트 연결 처리
   * @param matchId 챌린지 ID
   * @param socketId 에이전트 소켓 ID
   * @returns 연결 성공 여부
   */
  onAgentConnected(matchId: string, socketId: string): boolean {
    const match = this.matches.get(matchId);
    if (!match || match.status !== 'waiting_agent') {
      this.logger.warn(
        { matchId, socketId },
        '에이전트 연결 실패 — 잘못된 매치 상태',
      );
      return false;
    }

    match.agentSocketId = socketId;
    this.agentSocketMap.set(socketId, matchId);

    if (match.expiryTimer) {
      clearTimeout(match.expiryTimer);
      match.expiryTimer = null;
    }

    // 배팅 오케스트레이터가 있으면 배팅 창 → 카운트다운, 없으면 바로 카운트다운
    if (this.bettingOrchestrator) {
      match.status = 'betting';
      this.logger.info({ matchId, socketId }, '에이전트 연결됨 — 배팅 창 오픈');
      this.startBettingWindow(matchId);
    } else {
      match.status = 'countdown';
      this.logger.info({ matchId, socketId }, '에이전트 연결됨 — 카운트다운 시작');
      this.startCountdown(matchId);
    }

    return true;
  }

  /**
   * 에이전트 액션 처리
   * @param matchId 챌린지 ID
   * @param direction 이동 방향
   */
  handleAgentAction(matchId: string, direction: Direction): void {
    const match = this.matches.get(matchId);
    if (!match || match.status !== 'active') return;

    this.gameLoopManager.handleInput(match.sessionId, match.agentId, direction);
  }

  /**
   * 에이전트 연결 해제 처리
   * @param socketId 에이전트 소켓 ID
   */
  onAgentDisconnected(socketId: string): void {
    const matchId = this.agentSocketMap.get(socketId);
    if (!matchId) return;

    const match = this.matches.get(matchId);
    if (!match) return;

    this.logger.warn({ matchId, socketId }, '에이전트 연결 해제됨');

    if (match.status === 'active') {
      match.reconnectTimer = setTimeout(() => {
        this.handleReconnectTimeout(matchId);
      }, this.RECONNECT_GRACE);
    }

    match.agentSocketId = null;
    this.agentSocketMap.delete(socketId);
  }

  /**
   * 에이전트 재연결 처리
   * @param matchId 챌린지 ID
   * @param socketId 새 소켓 ID
   * @returns 재연결 성공 여부
   */
  onAgentReconnected(matchId: string, socketId: string): boolean {
    const match = this.matches.get(matchId);
    if (!match) return false;

    if (match.reconnectTimer) {
      clearTimeout(match.reconnectTimer);
      match.reconnectTimer = null;
    }

    match.agentSocketId = socketId;
    this.agentSocketMap.set(socketId, matchId);

    this.logger.info({ matchId, socketId }, '에이전트 재연결됨');
    return true;
  }

  /**
   * 활성 챌린지 목록 조회
   * @returns 모든 챌린지 공개 정보
   */
  getActiveMatches(): ChallengeMatchInfo[] {
    return Array.from(this.matches.values()).map((m) => this.toPublicInfo(m));
  }

  /**
   * 특정 챌린지 조회
   * @param matchId 챌린지 ID
   * @returns 챌린지 정보 또는 null
   */
  getMatch(matchId: string): ChallengeMatchInfo | null {
    const match = this.matches.get(matchId);
    return match ? this.toPublicInfo(match) : null;
  }

  /** 오케스트레이터 종료 — 모든 활성 매치 정리 */
  shutdown(): void {
    this.logger.info('챌린지 오케스트레이터 종료 중...');

    for (const match of this.matches.values()) {
      if (match.status === 'active') {
        try {
          this.gameLoopManager.stopSession(match.sessionId);
          this.gameLoopManager.removeSession(match.sessionId);
        } catch {
          this.logger.error({ matchId: match.id }, '세션 정리 실패');
        }
      }
      this.cleanupMatch(match.id);
    }

    this.matches.clear();
    this.agentSocketMap.clear();
  }

  /** 배팅 창 열기 (30초 후 잠금 → 카운트다운) */
  private startBettingWindow(matchId: string): void {
    const match = this.matches.get(matchId);
    if (!match || !this.bettingOrchestrator) return;

    // 온체인 matchId(uint256)로 배팅 창 오픈
    const onChainId = String(match.onChainMatchId);
    this.bettingOrchestrator.openBettingWindow(
      onChainId,
      match.agentId,
      SERVER_AI_ADDRESS,
      this.BETTING_WINDOW_SECONDS,
    );

    this.logger.info(
      { matchId, onChainMatchId: match.onChainMatchId, windowSeconds: this.BETTING_WINDOW_SECONDS },
      '배팅 창 오픈됨',
    );

    // 배팅 창 종료 후 잠금 → 카운트다운 전이
    match.expiryTimer = setTimeout(() => {
      void this.closeBettingAndStartCountdown(matchId);
    }, this.BETTING_WINDOW_SECONDS * 1000);
  }

  /** 배팅 잠금 후 카운트다운 시작 */
  private async closeBettingAndStartCountdown(matchId: string): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match || match.status !== 'betting') return;

    if (this.bettingOrchestrator) {
      try {
        await this.bettingOrchestrator.lockBets(String(match.onChainMatchId));
        this.logger.info({ matchId }, '배팅 잠금 완료');
      } catch {
        this.logger.error({ matchId }, '배팅 잠금 실패 — 게임은 계속 진행');
      }
    }

    match.status = 'countdown';
    this.startCountdown(matchId);
  }

  /** 카운트다운 시작 (3, 2, 1 → 게임 시작) */
  private startCountdown(matchId: string): void {
    const match = this.matches.get(matchId);
    if (!match) return;

    let count = this.COUNTDOWN_SECONDS;

    const interval = setInterval(() => {
      this.socketManager.broadcastToLobby(WS_EVENTS.MATCH_COUNTDOWN, {
        matchId,
        countdown: count,
      } as Record<string, unknown>);

      count--;
      if (count < 0) {
        clearInterval(interval);
        this.startGame(matchId);
      }
    }, 1000);
  }

  /** 게임 세션 생성 및 시작 */
  private startGame(matchId: string): void {
    const match = this.matches.get(matchId);
    if (!match) return;

    try {
      this.gameLoopManager.createSession({
        sessionId: match.sessionId,
        sessionType: 'match',
        variant: 'classic',
        seed: Math.floor(Math.random() * 0xffffffff),
        difficulty: match.difficulty,
        agents: [match.agentId],
      });

      this.gameLoopManager.startSession(match.sessionId);
      match.status = 'active';

      // 게임 시간 제한 타이머
      match.gameDurationTimer = setTimeout(() => {
        this.handleGameTimeout(matchId);
      }, this.GAME_DURATION_LIMIT);

      this.socketManager.broadcastToLobby(WS_EVENTS.MATCH_START, {
        matchId,
        sessionId: match.sessionId,
      } as Record<string, unknown>);

      this.logger.info(
        { matchId, sessionId: match.sessionId },
        '게임 시작됨',
      );
    } catch {
      this.logger.error({ matchId }, '게임 시작 실패');
      match.status = 'expired';
      this.cleanupMatch(matchId);
    }
  }

  /** 게임 종료 처리 (GameLoopManager 콜백) */
  private handleGameOver(sessionId: string, state: GameState): void {
    if (!sessionId.startsWith('match:challenge-')) return;

    const matchId = sessionId.replace('match:', '');
    const match = this.matches.get(matchId);
    if (!match || match.status === 'completed') return;

    // 승패 판정: lives ≤ 0 → 고스트 승리, 그 외 → 팩맨 승리
    const winner: 'pacman' | 'ghost' = state.lives <= 0 ? 'ghost' : 'pacman';

    match.score = state.score;
    match.winner = winner;
    match.status = 'completed';

    if (match.gameDurationTimer) {
      clearTimeout(match.gameDurationTimer);
      match.gameDurationTimer = null;
    }

    // 결과 브로드캐스트
    this.socketManager.broadcastToLobby(WS_EVENTS.MATCH_RESULT, {
      matchId: match.id,
      winner,
      score: state.score,
      lives: state.lives,
    } as Record<string, unknown>);

    this.socketManager.broadcastFeedItem({
      id: `feed-${Date.now().toString(36)}`,
      type: 'challenge_completed',
      message: `챌린지 완료! ${winner === 'pacman' ? '에이전트' : '고스트'} 승리 (점수: ${String(state.score)})`,
      timestamp: Date.now(),
      data: { matchId: match.id, winner, score: state.score },
    });

    this.logger.info(
      { matchId: match.id, winner, score: state.score, lives: state.lives },
      '게임 종료 — 결과 전송',
    );

    // 배팅 정산 (pacman=agentA, ghost=agentB)
    void this.settleMatchBets(match, winner);

    try {
      this.gameLoopManager.removeSession(sessionId);
    } catch {
      this.logger.error({ matchId: match.id }, '세션 제거 실패');
    }

    this.cleanupMatch(matchId);
  }

  /** 게임 타임아웃 처리 (5분 경과) */
  private handleGameTimeout(matchId: string): void {
    const match = this.matches.get(matchId);
    if (!match || match.status !== 'active') return;

    this.logger.warn({ matchId }, '게임 타임아웃 — 시간 초과로 종료');

    let state: GameState | null = null;
    try {
      state = this.gameLoopManager.getSessionState(match.sessionId);
    } catch {
      this.logger.error({ matchId }, '세션 상태 조회 실패');
    }

    const winner: 'pacman' | 'ghost' =
      state !== null && state.lives > 0 ? 'pacman' : 'ghost';

    match.score = state?.score ?? 0;
    match.winner = winner;
    match.status = 'completed';

    this.socketManager.broadcastToLobby(WS_EVENTS.MATCH_RESULT, {
      matchId: match.id,
      winner,
      score: match.score,
      lives: state?.lives ?? 0,
      reason: 'timeout',
    } as Record<string, unknown>);

    // 배팅 정산
    void this.settleMatchBets(match, winner);

    try {
      this.gameLoopManager.stopSession(match.sessionId);
      this.gameLoopManager.removeSession(match.sessionId);
    } catch {
      this.logger.error({ matchId }, '세션 정리 실패');
    }

    this.cleanupMatch(matchId);
  }

  /** 에이전트 미연결 만료 처리 */
  private handleExpiry(matchId: string): void {
    const match = this.matches.get(matchId);
    if (!match || match.status !== 'waiting_agent') return;

    this.logger.warn({ matchId }, '챌린지 만료 — 에이전트 미연결');
    match.status = 'expired';

    this.socketManager.broadcastFeedItem({
      id: `feed-${Date.now().toString(36)}`,
      type: 'challenge_expired',
      message: `챌린지 만료 — 에이전트가 시간 내에 접속하지 않았습니다`,
      timestamp: Date.now(),
      data: { matchId },
    });

    this.cleanupMatch(matchId);
  }

  /** 재연결 타임아웃 처리 (고스트 승리) */
  private handleReconnectTimeout(matchId: string): void {
    const match = this.matches.get(matchId);
    if (!match || match.status !== 'active') return;

    this.logger.warn({ matchId }, '재연결 실패 — 고스트 승리로 처리');

    match.winner = 'ghost';
    match.status = 'completed';

    let state: GameState | null = null;
    try {
      state = this.gameLoopManager.getSessionState(match.sessionId);
    } catch {
      this.logger.error({ matchId }, '세션 상태 조회 실패');
    }

    match.score = state?.score ?? 0;

    this.socketManager.broadcastToLobby(WS_EVENTS.MATCH_RESULT, {
      matchId: match.id,
      winner: 'ghost',
      score: match.score,
      lives: 0,
      reason: 'disconnect',
    } as Record<string, unknown>);

    // 배팅 정산 (연결 해제 → 고스트 승리)
    void this.settleMatchBets(match, 'ghost');

    try {
      this.gameLoopManager.stopSession(match.sessionId);
      this.gameLoopManager.removeSession(match.sessionId);
    } catch {
      this.logger.error({ matchId }, '세션 정리 실패');
    }

    this.cleanupMatch(matchId);
  }

  /** GameLoopManager의 gameOver 콜백을 래핑 */
  private wrapGameOverCallback(): void {
    this.originalGameOverCallback = this.gameLoopManager.getOnGameOver();

    this.gameLoopManager.setOnGameOver(
      (sessionId: string, state: GameState) => {
        this.handleGameOver(sessionId, state);

        // 챌린지가 아닌 세션은 원래 콜백에 위임
        if (!sessionId.startsWith('match:challenge-')) {
          this.originalGameOverCallback?.(sessionId, state);
        }
      },
    );
  }

  /** 배팅 정산 공통 로직 (pacman=agentA, ghost=agentB) */
  private async settleMatchBets(
    match: ChallengeMatch,
    winner: 'pacman' | 'ghost',
  ): Promise<void> {
    if (!this.bettingOrchestrator) return;

    const betSide = winner === 'pacman' ? 'agentA' : 'agentB';
    const onChainId = String(match.onChainMatchId);

    try {
      match.status = 'settling';
      await this.bettingOrchestrator.settleBets(onChainId, betSide);
      match.status = 'settled';
      this.logger.info(
        { matchId: match.id, onChainMatchId: match.onChainMatchId, winner, betSide },
        '배팅 정산 완료',
      );
    } catch {
      this.logger.error(
        { matchId: match.id, onChainMatchId: match.onChainMatchId },
        '배팅 정산 실패',
      );
      match.status = 'completed';
    }
  }

  /** 매치 타이머 정리 (matches Map에서는 삭제하지 않음 — 조회용 유지) */
  private cleanupMatch(matchId: string): void {
    const match = this.matches.get(matchId);
    if (!match) return;

    if (match.expiryTimer) {
      clearTimeout(match.expiryTimer);
      match.expiryTimer = null;
    }
    if (match.gameDurationTimer) {
      clearTimeout(match.gameDurationTimer);
      match.gameDurationTimer = null;
    }
    if (match.reconnectTimer) {
      clearTimeout(match.reconnectTimer);
      match.reconnectTimer = null;
    }
    if (match.agentSocketId) {
      this.agentSocketMap.delete(match.agentSocketId);
    }
  }

  /** 내부 매치 상태를 공개 인터페이스로 변환 */
  private toPublicInfo(match: ChallengeMatch): ChallengeMatchInfo {
    return {
      id: match.id,
      agentId: match.agentId,
      sessionToken: match.sessionToken,
      difficulty: match.difficulty,
      status: match.status,
      sessionId: match.sessionId,
      onChainMatchId: match.onChainMatchId,
      createdAt: match.createdAt,
      agentSocketId: match.agentSocketId,
      score: match.score,
      winner: match.winner,
    };
  }
}
