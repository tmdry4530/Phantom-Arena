/**
 * 에이전트 샌드박스 모듈
 *
 * isolated-vm을 사용하여 외부 에이전트 코드를 안전하게 격리된 환경에서 실행한다.
 * 파일시스템, 네트워크 접근이 차단되며, 메모리와 실행 시간이 제한된다.
 */

import ivm from 'isolated-vm';
import pino from 'pino';
import type { GameState, AgentAction, Direction } from '@ghost-protocol/shared';
import { AGENT_ACTION_TIMEOUT_MS } from '@ghost-protocol/shared';

/** 로거 인스턴스 */
const logger = pino({ name: 'agent-sandbox' });

/** 유효한 이동 방향 집합 */
const VALID_DIRECTIONS: ReadonlySet<string> = new Set<Direction>([
  'up',
  'down',
  'left',
  'right',
]);

/**
 * 샌드박스 설정 인터페이스
 */
export interface SandboxConfig {
  /** 메모리 제한 (MB 단위, 기본값: 128) */
  readonly memoryLimitMB?: number;
  /** 에이전트 행동 타임아웃 (밀리초, 기본값: AGENT_ACTION_TIMEOUT_MS = 100) */
  readonly timeoutMs?: number;
}

/**
 * 에이전트 코드의 반환값 타입 가드
 * unknown 값이 유효한 AgentAction인지 검증한다.
 */
function isValidAgentAction(value: unknown): value is AgentAction {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  if (typeof obj['direction'] !== 'string') {
    return false;
  }

  return VALID_DIRECTIONS.has(obj['direction']);
}

/**
 * 에이전트 샌드박스
 *
 * isolated-vm 기반의 격리된 실행 환경을 제공한다.
 * 에이전트 코드는 파일시스템/네트워크에 접근할 수 없으며,
 * 메모리와 실행 시간이 엄격하게 제한된다.
 *
 * @example
 * ```typescript
 * const sandbox = new AgentSandbox({ memoryLimitMB: 128 });
 * await sandbox.loadAgent(agentCode, 'my-agent');
 * const action = await sandbox.executeAction(gameState);
 * sandbox.dispose();
 * ```
 */
export class AgentSandbox {
  /** isolated-vm Isolate 인스턴스 */
  private isolate: ivm.Isolate | null = null;

  /** 격리된 실행 컨텍스트 */
  private context: ivm.Context | null = null;

  /** 에이전트의 onGameState 함수 참조 */
  private onGameStateRef: ivm.Reference | null = null;

  /** 현재 로드된 에이전트 이름 */
  private _agentName: string | null = null;

  /** 메모리 제한 (MB) */
  private readonly memoryLimitMB: number;

  /** 실행 타임아웃 (밀리초) */
  private readonly timeoutMs: number;

  /** 리소스가 해제되었는지 여부 */
  private disposed = false;

  /**
   * 에이전트 샌드박스 생성
   * @param config - 샌드박스 설정 (선택 사항)
   */
  constructor(config?: SandboxConfig) {
    this.memoryLimitMB = config?.memoryLimitMB ?? 128;
    this.timeoutMs = config?.timeoutMs ?? AGENT_ACTION_TIMEOUT_MS;
  }

  /**
   * 현재 로드된 에이전트 이름 반환
   * @returns 에이전트 이름 또는 null (로드 전)
   */
  get agentName(): string | null {
    return this._agentName;
  }

  /**
   * 에이전트 코드를 샌드박스에 로드
   *
   * JavaScript 문자열을 컴파일하여 격리된 환경에서 실행한다.
   * 에이전트 코드는 전역 함수 `onGameState(state)`를 정의해야 한다.
   *
   * @param agentCode - 에이전트 JavaScript 코드 문자열
   * @param agentName - 에이전트 식별 이름
   * @throws 구문 오류 또는 컴파일 실패 시 에러
   */
  async loadAgent(agentCode: string, agentName: string): Promise<void> {
    if (this.disposed) {
      throw new Error('샌드박스가 이미 해제되었습니다. 새 인스턴스를 생성하세요.');
    }

    // 기존 리소스가 있으면 정리
    this.releaseInternalResources();

    logger.info({ agentName }, '에이전트 코드 로드 시작');

    // Isolate 생성 (메모리 제한 적용)
    this.isolate = new ivm.Isolate({ memoryLimit: this.memoryLimitMB });

    // 격리된 컨텍스트 생성
    this.context = await this.isolate.createContext();

    // 에이전트 코드를 컴파일하고 실행하여 전역 함수를 등록
    const script = await this.isolate.compileScript(agentCode, {
      filename: `file:///${agentName}.js`,
    });

    await script.run(this.context, { timeout: this.timeoutMs });
    script.release();

    // onGameState 함수 참조 획득
    const globalRef = this.context.global;
    this.onGameStateRef = await globalRef.get('onGameState', { reference: true });

    // onGameState가 함수인지 검증
    if (this.onGameStateRef.typeof !== 'function') {
      this.onGameStateRef.release();
      this.onGameStateRef = null;
      throw new Error(
        `에이전트 '${agentName}'에 전역 함수 onGameState가 정의되어 있지 않습니다.`,
      );
    }

    this._agentName = agentName;
    logger.info({ agentName }, '에이전트 코드 로드 완료');
  }

  /**
   * 게임 상태를 전달하고 에이전트 행동을 수신
   *
   * GameState를 JSON 직렬화하여 격리된 환경에 전달하고,
   * 에이전트의 onGameState 함수를 호출하여 결과를 받는다.
   *
   * @param state - 현재 게임 상태
   * @returns 유효한 AgentAction 또는 null (타임아웃/에러 시 턴 몰수)
   */
  async executeAction(state: GameState): Promise<AgentAction | null> {
    if (this.disposed) {
      logger.warn('해제된 샌드박스에서 실행 시도');
      return null;
    }

    if (!this.isolate || !this.context || !this.onGameStateRef) {
      logger.warn('에이전트가 로드되지 않은 상태에서 실행 시도');
      return null;
    }

    // Isolate가 해제되었는지 확인
    if (this.isolate.isDisposed) {
      logger.warn({ agentName: this._agentName }, 'Isolate가 이미 해제된 상태');
      return null;
    }

    try {
      // GameState를 ExternalCopy로 변환하여 격리 경계를 넘긴다
      const stateCopy = new ivm.ExternalCopy(state);

      // onGameState 함수 호출 (타임아웃 적용, 결과를 copy로 받음)
      const result: unknown = await this.onGameStateRef.apply(
        undefined,
        [stateCopy.copyInto()],
        { result: { copy: true }, timeout: this.timeoutMs },
      );

      stateCopy.release();

      // 반환값 검증
      if (!isValidAgentAction(result)) {
        logger.warn(
          { agentName: this._agentName, result },
          '에이전트가 유효하지 않은 행동을 반환 — 턴 몰수',
        );
        return null;
      }

      return { direction: result.direction };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      // 타임아웃 에러 처리
      if (message.includes('Script execution timed out')) {
        logger.warn(
          { agentName: this._agentName, timeoutMs: this.timeoutMs },
          '에이전트 실행 타임아웃 — 턴 몰수',
        );
        return null;
      }

      // 메모리 초과 에러 처리
      if (
        message.includes('Isolate was disposed during execution') ||
        message.includes('out of memory')
      ) {
        logger.error(
          { agentName: this._agentName },
          '에이전트 메모리 한도 초과 — 턴 몰수',
        );
        return null;
      }

      // 기타 에러 처리
      logger.error(
        { agentName: this._agentName, error: message },
        '에이전트 실행 중 에러 발생 — 턴 몰수',
      );
      return null;
    }
  }

  /**
   * Isolate의 현재 힙 메모리 사용량 반환
   * @returns 사용 중인 힙 메모리 (바이트), Isolate가 없으면 0
   */
  getMemoryUsage(): number {
    if (!this.isolate || this.isolate.isDisposed) {
      return 0;
    }

    try {
      const stats = this.isolate.getHeapStatisticsSync();
      return stats.used_heap_size + stats.externally_allocated_size;
    } catch {
      return 0;
    }
  }

  /**
   * 모든 리소스 해제
   *
   * Isolate, Context, Reference를 명시적으로 해제한다.
   * 해제 후에는 executeAction 호출 시 null을 반환한다.
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }

    logger.info({ agentName: this._agentName }, '샌드박스 리소스 해제');
    this.releaseInternalResources();
    this.disposed = true;
  }

  /**
   * 내부 리소스 정리 (재로드 시에도 사용)
   */
  private releaseInternalResources(): void {
    if (this.onGameStateRef) {
      try {
        this.onGameStateRef.release();
      } catch {
        // 이미 해제된 경우 무시
      }
      this.onGameStateRef = null;
    }

    if (this.context) {
      try {
        this.context.release();
      } catch {
        // 이미 해제된 경우 무시
      }
      this.context = null;
    }

    if (this.isolate && !this.isolate.isDisposed) {
      try {
        this.isolate.dispose();
      } catch {
        // 이미 해제된 경우 무시
      }
    }
    this.isolate = null;

    this._agentName = null;
  }
}
