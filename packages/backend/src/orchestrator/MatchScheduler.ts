import { Queue, Worker, Job } from 'bullmq';
import type IORedis from 'ioredis';
import { GameLoopManager } from '../game/GameLoopManager.js';
import type { MazeVariant, DifficultyTier, GameState } from '@ghost-protocol/shared';
import pino from 'pino';

const logger = pino({ name: 'match-scheduler' });

/** 매치 작업 데이터 */
export interface MatchJobData {
  readonly matchId: string;
  readonly agentA: string;
  readonly agentB: string;
  readonly variant: MazeVariant;
  readonly seed: number;
  readonly difficulty: DifficultyTier;
  readonly tournamentId: string;
  readonly round: number;
}

/** 매치 결과 */
export interface MatchJobResult {
  readonly matchId: string;
  readonly scoreA: number;
  readonly scoreB: number;
  readonly winner: string;
  readonly replayData: Buffer;
  readonly totalTicks: number;
}

/** MatchScheduler 설정 */
export interface MatchSchedulerConfig {
  readonly redisConnection: IORedis;
  readonly concurrency?: number; // 기본값 8
  readonly queueName?: string;
}

/** 매치 완료 콜백 */
export type MatchCompleteCallback = (result: MatchJobResult) => void | Promise<void>;

/**
 * 매치 스케줄러
 * BullMQ 기반 작업 큐로 여러 매치를 동시에 실행합니다.
 */
export class MatchScheduler {
  private readonly queue: Queue<MatchJobData, MatchJobResult>;
  private readonly worker: Worker<MatchJobData, MatchJobResult>;
  private readonly gameLoopManager: GameLoopManager;
  private onMatchComplete: MatchCompleteCallback | null = null;

  constructor(config: MatchSchedulerConfig) {
    const queueName = config.queueName ?? 'arena-matches';
    const concurrency = config.concurrency ?? 8;

    this.gameLoopManager = new GameLoopManager();

    // BullMQ 큐 생성
    this.queue = new Queue<MatchJobData, MatchJobResult>(queueName, {
      connection: config.redisConnection,
    });

    // 워커 생성 (동시 처리 지원)
    this.worker = new Worker<MatchJobData, MatchJobResult>(
      queueName,
      async (job: Job<MatchJobData, MatchJobResult>) => {
        return this.processMatch(job);
      },
      {
        connection: config.redisConnection,
        concurrency,
      },
    );

    // 워커 이벤트 설정
    this.worker.on('completed', (job: Job<MatchJobData, MatchJobResult>) => {
      logger.info({ matchId: job.data.matchId }, '매치 완료');
      void this.onMatchComplete?.(job.returnvalue);
    });

    this.worker.on('failed', (job: Job<MatchJobData, MatchJobResult> | undefined, error: Error) => {
      logger.error({ matchId: job?.data.matchId, error: error.message }, '매치 실패');
    });
  }

  /**
   * 매치 완료 콜백 설정
   */
  setOnMatchComplete(callback: MatchCompleteCallback): void {
    this.onMatchComplete = callback;
  }

  /**
   * 매치 스케줄링
   * @param data 매치 작업 데이터
   * @returns BullMQ Job
   */
  async scheduleMatch(data: MatchJobData): Promise<Job<MatchJobData, MatchJobResult>> {
    logger.info(
      {
        matchId: data.matchId,
        agentA: data.agentA,
        agentB: data.agentB,
      },
      '매치 스케줄링',
    );

    return this.queue.add(`match-${data.matchId}`, data, {
      removeOnComplete: 100, // 최근 100개만 보관
      removeOnFail: 50,
    });
  }

  /**
   * 여러 매치 동시 스케줄링 (같은 라운드)
   */
  async scheduleRoundMatches(
    matches: readonly MatchJobData[],
  ): Promise<Job<MatchJobData, MatchJobResult>[]> {
    logger.info({ count: matches.length }, '라운드 매치 일괄 스케줄링');

    const jobs = await Promise.all(matches.map((match) => this.scheduleMatch(match)));

    return jobs;
  }

  /**
   * 매치 처리 (워커에서 실행)
   */
  private async processMatch(job: Job<MatchJobData, MatchJobResult>): Promise<MatchJobResult> {
    const { matchId, agentA, agentB, variant, seed, difficulty } = job.data;
    const sessionId = `match:${matchId}`;

    logger.info({ matchId, agentA, agentB }, '매치 실행 시작');

    // 게임 세션 생성
    this.gameLoopManager.createSession({
      sessionId,
      sessionType: 'match',
      variant,
      seed,
      difficulty,
      agents: [agentA, agentB],
    });

    // 게임 실행 및 완료 대기
    return new Promise<MatchJobResult>((resolve) => {
      // 게임 오버 콜백에서 결과 반환
      this.gameLoopManager.setOnGameOver((sid: string, state: GameState) => {
        if (sid !== sessionId) return;

        const replayData = this.gameLoopManager.getReplayData(sessionId);
        this.gameLoopManager.removeSession(sessionId);

        // 아레나 모드: scoreA vs scoreB (간단화 - 같은 미로에서 각각 플레이)
        const scoreA = state.score;
        const scoreB = 0; // 두 번째 에이전트 점수 (향후 듀얼 모드 구현)
        const winner = scoreA >= scoreB ? agentA : agentB;

        resolve({
          matchId,
          scoreA,
          scoreB,
          winner,
          replayData: replayData ?? Buffer.alloc(0),
          totalTicks: state.tick,
        });
      });

      // 게임 시작
      this.gameLoopManager.startSession(sessionId);
    });
  }

  /**
   * 대기 중인 작업 수 조회
   */
  async getPendingCount(): Promise<number> {
    return this.queue.getWaitingCount();
  }

  /**
   * 활성 작업 수 조회
   */
  async getActiveCount(): Promise<number> {
    return this.queue.getActiveCount();
  }

  /**
   * 정리 (서버 종료 시)
   */
  async shutdown(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    this.gameLoopManager.shutdown();
    logger.info('MatchScheduler 종료');
  }
}
