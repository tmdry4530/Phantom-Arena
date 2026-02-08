import type {
  Direction,
  DifficultyTier,
  TierConfig,
  Position,
  GhostId,
  GhostState,
  PacmanState,
  MazeData,
} from '@ghost-protocol/shared';
import { TIER_CONFIGS, TICK_RATE } from '@ghost-protocol/shared';

/** 고스트 AI 난이도 관리자 */
export class DifficultyManager {
  private currentTier: DifficultyTier;
  private currentMode: 'chase' | 'scatter' = 'scatter';
  private modeTickCounter = 0;
  private patternBuffer: Direction[] = [];
  private readonly PATTERN_BUFFER_SIZE = 10;
  private lastLLMCallTick = -Infinity;

  constructor(initialTier: DifficultyTier) {
    this.currentTier = initialTier;
  }

  /** 현재 난이도 티어 반환 */
  getCurrentTier(): DifficultyTier {
    return this.currentTier;
  }

  /** 현재 티어의 설정 반환 */
  getTierConfig(): TierConfig {
    const config = TIER_CONFIGS.get(this.currentTier);
    if (!config) {
      throw new Error(`티어 설정을 찾을 수 없습니다: ${String(this.currentTier)}`);
    }
    return config;
  }

  /** 현재 AI 모드 반환 (추격/분산) */
  getCurrentMode(): 'chase' | 'scatter' {
    return this.currentMode;
  }

  /** 난이도 티어 변경 */
  setTier(tier: DifficultyTier): void {
    this.currentTier = tier;
    this.resetModeTimer();
  }

  /** 라운드 번호에 따른 티어 결정 */
  getTierForRound(round: number): DifficultyTier {
    if (round <= 2) return 1;
    if (round <= 4) return 2;
    if (round <= 6) return 3;
    if (round <= 8) return 4;
    return 5;
  }

  /** 게임 틱마다 호출 — 추격/분산 모드 타이머 관리 */
  tick(): void {
    const config = this.getTierConfig();

    // Tier 5의 경우 영구 추격 모드
    if (config.chaseDuration === Infinity) {
      this.currentMode = 'chase';
      return;
    }

    const currentDuration =
      this.currentMode === 'chase' ? config.chaseDuration : config.scatterDuration;
    const durationInTicks = currentDuration * TICK_RATE;

    this.modeTickCounter++;

    if (this.modeTickCounter >= durationInTicks) {
      // 모드 전환
      this.currentMode = this.currentMode === 'chase' ? 'scatter' : 'chase';
      this.modeTickCounter = 0;
    }
  }

  /** 모드 타이머 초기화 */
  resetModeTimer(): void {
    this.currentMode = 'scatter';
    this.modeTickCounter = 0;
  }

  /** 팩맨의 이동 방향 기록 (패턴 인식용) */
  recordPacmanDirection(direction: Direction): void {
    const config = this.getTierConfig();
    if (!config.patternRecognition) {
      return; // Tier 3 미만에서는 no-op
    }

    this.patternBuffer.push(direction);

    // 순환 버퍼: 최대 10개 유지
    if (this.patternBuffer.length > this.PATTERN_BUFFER_SIZE) {
      this.patternBuffer.shift();
    }
  }

  /** 팩맨의 다음 방향 예측 (가장 빈번한 방향 반환) */
  predictNextDirection(): Direction | null {
    const config = this.getTierConfig();
    if (!config.patternRecognition || this.patternBuffer.length === 0) {
      return null;
    }

    // 방향별 빈도 계산
    const frequencyMap = new Map<Direction, number>();
    for (const dir of this.patternBuffer) {
      frequencyMap.set(dir, (frequencyMap.get(dir) ?? 0) + 1);
    }

    // 가장 빈번한 방향 찾기
    let maxCount = 0;
    let predictedDirection: Direction | null = null;

    for (const [dir, count] of frequencyMap.entries()) {
      if (count > maxCount) {
        maxCount = count;
        predictedDirection = dir;
      }
    }

    return predictedDirection;
  }

  /** 최근 기록된 방향 목록 반환 */
  getRecentDirections(): readonly Direction[] {
    return this.patternBuffer;
  }

  /** LLM 전략이 활성화되어 있는지 확인 */
  isLLMEnabled(): boolean {
    return this.getTierConfig().llmEnabled;
  }

  /** LLM 호출 간격 (틱 단위) */
  getLLMCallInterval(): number {
    const config = this.getTierConfig();
    if (!config.llmEnabled) {
      return Infinity;
    }

    // Tier 4: 2초 (120틱), Tier 5: 매 틱 (1틱)
    return this.currentTier === 5 ? 1 : 120;
  }

  /** 현재 틱에서 LLM을 호출해야 하는지 확인 */
  shouldCallLLM(currentTick: number): boolean {
    if (!this.isLLMEnabled()) {
      return false;
    }

    const interval = this.getLLMCallInterval();
    const shouldCall = currentTick - this.lastLLMCallTick >= interval;

    if (shouldCall) {
      this.lastLLMCallTick = currentTick;
    }

    return shouldCall;
  }

  /** 고스트 조정 기능 활성화 여부 */
  isCoordinationEnabled(): boolean {
    return this.getTierConfig().coordinationEnabled;
  }

  /** Cruise Elroy 기능 활성화 여부 (Tier 2+) */
  getCruiseElroyEnabled(): boolean {
    return this.currentTier >= 2;
  }

  /** 파워업 거부 전략 활성화 여부 (Tier 3+) */
  getPowerUpDenialEnabled(): boolean {
    return this.currentTier >= 3;
  }

  /** 예측 함정 전략 활성화 여부 (Tier 4+) */
  getPredictiveTrappingEnabled(): boolean {
    return this.currentTier >= 4;
  }

  /** 포메이션 전략 활성화 여부 (Tier 4+) */
  getFormationsEnabled(): boolean {
    return this.currentTier >= 4;
  }

  /** 실시간 적응 전략 활성화 여부 (Tier 5) */
  getRealTimeAdaptationEnabled(): boolean {
    return this.currentTier === 5;
  }
}


/** 고스트 조정 전략 인터페이스 */
export interface CoordinationStrategy {
  /** 핀서 공격: 두 고스트가 팩맨을 양쪽에서 포위 */
  getPincerTargets(
    pacman: PacmanState,
    ghosts: readonly GhostState[],
    maze: MazeData,
  ): ReadonlyMap<GhostId, Position>;

  /** 포메이션: 고스트들이 팩맨 주변에 균등 배치 */
  getFormationTargets(
    pacman: PacmanState,
    ghosts: readonly GhostState[],
    maze: MazeData,
  ): ReadonlyMap<GhostId, Position>;

  /** 파워업 거부: 파워 펠릿 주변을 고스트가 순찰 */
  getPowerUpDenialTargets(
    powerPelletPositions: readonly Position[],
    ghosts: readonly GhostState[],
    maze: MazeData,
  ): ReadonlyMap<GhostId, Position>;
}

/** LLM 전략 요청 데이터 */
export interface LLMStrategyRequest {
  readonly pacmanPosition: Position;
  readonly pacmanDirection: Direction;
  readonly ghostPositions: ReadonlyMap<GhostId, Position>;
  readonly recentPacmanMoves: readonly Direction[];
  readonly remainingPellets: number;
  readonly currentTick: number;
}

/** LLM 전략 응답 데이터 */
export interface LLMStrategyResponse {
  readonly ghostTargets: ReadonlyMap<GhostId, Position>;
  readonly strategy: string;
  readonly confidence: number;
}

/** LLM 전략 제공자 인터페이스 */
export interface LLMStrategyProvider {
  /** 전략 요청 (비동기) */
  requestStrategy(request: LLMStrategyRequest): Promise<LLMStrategyResponse>;
}

/** 조정 전략 구현 (기본) */
class DefaultCoordinationStrategy implements CoordinationStrategy {
  getPincerTargets(
    pacman: PacmanState,
    ghosts: readonly GhostState[],
    maze: MazeData,
  ): ReadonlyMap<GhostId, Position> {
    const targets = new Map<GhostId, Position>();

    // 첫 두 고스트를 사용하여 핀서 공격
    if (ghosts.length >= 2) {
      const ghost1 = ghosts[0];
      const ghost2 = ghosts[1];

      if (!ghost1 || !ghost2) {
        return targets;
      }

      // Ghost 1: 팩맨 앞쪽 목표
      const frontTarget: Position = {
        x: pacman.x + this.getDirectionOffset(pacman.direction).x * 4,
        y: pacman.y + this.getDirectionOffset(pacman.direction).y * 4,
      };
      targets.set(ghost1.id, this.clampPosition(frontTarget, maze));

      // Ghost 2: 팩맨 뒤쪽 목표
      const backTarget: Position = {
        x: pacman.x - this.getDirectionOffset(pacman.direction).x * 4,
        y: pacman.y - this.getDirectionOffset(pacman.direction).y * 4,
      };
      targets.set(ghost2.id, this.clampPosition(backTarget, maze));
    }

    return targets;
  }

  getFormationTargets(
    pacman: PacmanState,
    ghosts: readonly GhostState[],
    _maze: MazeData,
  ): ReadonlyMap<GhostId, Position> {
    const targets = new Map<GhostId, Position>();
    const angleStep = (Math.PI * 2) / ghosts.length;
    const radius = 8;

    ghosts.forEach((ghost, index) => {
      const angle = angleStep * index;
      const target: Position = {
        x: Math.round(pacman.x + Math.cos(angle) * radius),
        y: Math.round(pacman.y + Math.sin(angle) * radius),
      };
      targets.set(ghost.id, target);
    });

    return targets;
  }

  getPowerUpDenialTargets(
    powerPelletPositions: readonly Position[],
    ghosts: readonly GhostState[],
    _maze: MazeData,
  ): ReadonlyMap<GhostId, Position> {
    const targets = new Map<GhostId, Position>();

    // 각 고스트를 가장 가까운 파워 펠릿에 할당
    ghosts.forEach((ghost) => {
      if (powerPelletPositions.length === 0) {
        return;
      }

      const firstPellet = powerPelletPositions[0];
      if (!firstPellet) {
        return;
      }

      let closestPellet = firstPellet;
      const ghostPos: Position = { x: ghost.x, y: ghost.y };
      let minDistance = this.manhattanDistance(ghostPos, closestPellet);

      for (const pellet of powerPelletPositions) {
        const distance = this.manhattanDistance(ghostPos, pellet);
        if (distance < minDistance) {
          minDistance = distance;
          closestPellet = pellet;
        }
      }

      targets.set(ghost.id, closestPellet);
    });

    return targets;
  }

  private getDirectionOffset(direction: Direction): { x: number; y: number } {
    switch (direction) {
      case 'up':
        return { x: 0, y: -1 };
      case 'down':
        return { x: 0, y: 1 };
      case 'left':
        return { x: -1, y: 0 };
      case 'right':
        return { x: 1, y: 0 };
    }
  }

  private clampPosition(pos: Position, maze: MazeData): Position {
    return {
      x: Math.max(0, Math.min(maze.width - 1, pos.x)),
      y: Math.max(0, Math.min(maze.height - 1, pos.y)),
    };
  }

  private manhattanDistance(a: Position, b: Position): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }
}

/** 조정 전략 인스턴스 생성 */
export function createCoordinationStrategy(): CoordinationStrategy {
  return new DefaultCoordinationStrategy();
}
