import type {
  Direction,
  Position,
  GhostId,
  GhostMode,
  GhostState,
  PacmanState,
  MazeData,
} from '@ghost-protocol/shared';
import {
  CLYDE_RETREAT_DISTANCE,
  PINKY_TARGET_OFFSET,
  MAZE_WIDTH,
  MAZE_HEIGHT,
} from '@ghost-protocol/shared';
import { getDirectionToTarget, manhattanDistance } from './Pathfinding.js';

/** 고스트 성격 인터페이스 */
export interface GhostPersonalityStrategy {
  /** 고스트 ID */
  readonly ghostId: GhostId;

  /** 추적 모드 목표 타일 계산 */
  getChaseTarget(
    ghost: GhostState,
    pacman: PacmanState,
    allGhosts: readonly GhostState[],
    maze: MazeData,
    remainingPellets: number,
  ): Position;

  /** 산개 모드 목표 타일 (고정 코너) */
  getScatterTarget(): Position;

  /** Cruise Elroy 속도 배율 (Blinky만 해당) */
  getCruiseElroyMultiplier(remainingPellets: number): number;
}

/**
 * 방향에 따른 오프셋 벡터 계산
 * @param direction - 이동 방향
 * @param offset - 오프셋 거리
 * @returns x, y 오프셋
 */
function getDirectionOffset(direction: Direction, offset: number): { dx: number; dy: number } {
  switch (direction) {
    case 'up':
      return { dx: -offset, dy: -offset }; // 클래식 버그 재현: 위쪽은 좌측도 포함
    case 'down':
      return { dx: 0, dy: offset };
    case 'left':
      return { dx: -offset, dy: 0 };
    case 'right':
      return { dx: offset, dy: 0 };
  }
}

/**
 * 타일 좌표를 미로 경계 내로 클램프
 * @param x - X 좌표
 * @param y - Y 좌표
 * @returns 클램프된 좌표
 */
function clampToMaze(x: number, y: number): Position {
  return {
    x: Math.max(0, Math.min(MAZE_WIDTH - 1, Math.floor(x))),
    y: Math.max(0, Math.min(MAZE_HEIGHT - 1, Math.floor(y))),
  };
}

/**
 * Blinky (빨강) - "Shadow" / 직접 추적자
 * - 추적 모드: 팩맨의 현재 위치를 직접 추적
 * - Cruise Elroy: 남은 펠렛이 적을수록 속도 증가
 */
class BlinkyPersonality implements GhostPersonalityStrategy {
  readonly ghostId: GhostId = 'blinky';

  getChaseTarget(
    _ghost: GhostState,
    pacman: PacmanState,
    _allGhosts: readonly GhostState[],
    _maze: MazeData,
    _remainingPellets: number,
  ): Position {
    // 팩맨의 현재 타일을 직접 목표로 설정
    return clampToMaze(pacman.x, pacman.y);
  }

  getScatterTarget(): Position {
    // 우상단 코너
    return { x: 25, y: 0 };
  }

  getCruiseElroyMultiplier(remainingPellets: number): number {
    if (remainingPellets < 10) {
      return 1.1; // Elroy 2
    }
    if (remainingPellets < 20) {
      return 1.05; // Elroy 1
    }
    return 1.0; // 일반 속도
  }
}

/**
 * Pinky (분홍) - "Speedy" / 매복자
 * - 추적 모드: 팩맨이 향하는 방향 4칸 앞을 목표로 설정
 * - 위쪽 방향일 경우 좌측으로도 4칸 오프셋 (클래식 버그 재현)
 */
class PinkyPersonality implements GhostPersonalityStrategy {
  readonly ghostId: GhostId = 'pinky';

  getChaseTarget(
    _ghost: GhostState,
    pacman: PacmanState,
    _allGhosts: readonly GhostState[],
    _maze: MazeData,
    _remainingPellets: number,
  ): Position {
    const { dx, dy } = getDirectionOffset(pacman.direction, PINKY_TARGET_OFFSET);
    return clampToMaze(pacman.x + dx, pacman.y + dy);
  }

  getScatterTarget(): Position {
    // 좌상단 코너
    return { x: 2, y: 0 };
  }

  getCruiseElroyMultiplier(_remainingPellets: number): number {
    return 1.0; // Pinky는 Cruise Elroy 없음
  }
}

/**
 * Inky (파랑) - "Bashful" / 측면 협공자
 * - 추적 모드: 팩맨 전방 2칸과 Blinky 위치를 기준으로 벡터를 2배 연장
 * - Blinky와 협력하여 측면 협공 패턴 생성
 */
class InkyPersonality implements GhostPersonalityStrategy {
  readonly ghostId: GhostId = 'inky';

  getChaseTarget(
    _ghost: GhostState,
    pacman: PacmanState,
    allGhosts: readonly GhostState[],
    _maze: MazeData,
    _remainingPellets: number,
  ): Position {
    // 1. 팩맨 방향 2칸 앞 타일 계산
    const { dx, dy } = getDirectionOffset(pacman.direction, 2);
    const pivotX = pacman.x + dx;
    const pivotY = pacman.y + dy;

    // 2. Blinky 위치 찾기
    const blinky = allGhosts.find((g) => g.id === 'blinky');
    if (!blinky) {
      // Blinky가 없으면 pivot 타일을 직접 목표로 설정
      return clampToMaze(pivotX, pivotY);
    }

    // 3. Blinky에서 pivot까지의 벡터를 2배로 연장
    const vectorX = pivotX - blinky.x;
    const vectorY = pivotY - blinky.y;
    const targetX = blinky.x + vectorX * 2;
    const targetY = blinky.y + vectorY * 2;

    return clampToMaze(targetX, targetY);
  }

  getScatterTarget(): Position {
    // 우하단 코너
    return { x: 27, y: 30 };
  }

  getCruiseElroyMultiplier(_remainingPellets: number): number {
    return 1.0; // Inky는 Cruise Elroy 없음
  }
}

/**
 * Clyde (주황) - "Pokey" / 예측 불가능한 추적자
 * - 추적 모드: 팩맨과의 거리에 따라 행동 변경
 *   - 거리 > 8칸: 팩맨을 직접 추적 (Blinky처럼)
 *   - 거리 <= 8칸: 산개 코너로 후퇴
 */
class ClydePersonality implements GhostPersonalityStrategy {
  readonly ghostId: GhostId = 'clyde';

  getChaseTarget(
    ghost: GhostState,
    pacman: PacmanState,
    _allGhosts: readonly GhostState[],
    _maze: MazeData,
    _remainingPellets: number,
  ): Position {
    const distance = manhattanDistance(ghost.x, ghost.y, pacman.x, pacman.y);

    if (distance > CLYDE_RETREAT_DISTANCE) {
      // 멀리 있으면 팩맨을 직접 추적
      return clampToMaze(pacman.x, pacman.y);
    } else {
      // 가까우면 산개 코너로 후퇴
      return this.getScatterTarget();
    }
  }

  getScatterTarget(): Position {
    // 좌하단 코너
    return { x: 0, y: 30 };
  }

  getCruiseElroyMultiplier(_remainingPellets: number): number {
    return 1.0; // Clyde는 Cruise Elroy 없음
  }
}

/**
 * 고스트 ID로 성격 전략 생성
 * @param ghostId - 고스트 ID
 * @returns 해당 고스트의 성격 전략
 */
export function createGhostPersonality(ghostId: GhostId): GhostPersonalityStrategy {
  switch (ghostId) {
    case 'blinky':
      return new BlinkyPersonality();
    case 'pinky':
      return new PinkyPersonality();
    case 'inky':
      return new InkyPersonality();
    case 'clyde':
      return new ClydePersonality();
  }
}

/**
 * 유효한 방향 목록 (터널 제외)
 */
const ALL_DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'] as const;


/**
 * Frightened 모드에서 랜덤 방향 선택
 * @param randomFn - 결정론적 RNG 함수 (0~1 범위)
 * @returns 선택된 방향 또는 null
 */
function getFrightenedDirection(
  randomFn: () => number,
): Direction | null {
  // 유효한 방향이 없으면 null 반환
  if (ALL_DIRECTIONS.length === 0) {
    return null;
  }

  // 랜덤 선택 (GhostState에 direction이 없으므로 모든 방향 중 랜덤)
  const randomIndex = Math.floor(randomFn() * ALL_DIRECTIONS.length);
  return ALL_DIRECTIONS[randomIndex] ?? null;
}

/**
 * 고스트의 현재 모드에 따라 최적 이동 방향 결정
 * @param ghost - 고스트 상태
 * @param pacman - 팩맨 상태
 * @param allGhosts - 모든 고스트 상태 배열
 * @param maze - 미로 데이터
 * @param mode - 현재 고스트 모드
 * @param personality - 고스트 성격 전략
 * @param remainingPellets - 남은 펠렛 개수
 * @param randomFn - 결정론적 RNG 함수 (0~1 범위)
 * @returns 선택된 이동 방향 또는 null
 */
export function getGhostDirection(
  ghost: GhostState,
  pacman: PacmanState,
  allGhosts: readonly GhostState[],
  maze: MazeData,
  mode: GhostMode,
  personality: GhostPersonalityStrategy,
  remainingPellets: number,
  randomFn: () => number,
): Direction | null {
  // Frightened 모드: 랜덤 방향 선택
  if (mode === 'frightened') {
    return getFrightenedDirection(randomFn);
  }

  // 목표 타일 계산
  let target: Position;
  if (mode === 'chase') {
    target = personality.getChaseTarget(ghost, pacman, allGhosts, maze, remainingPellets);
  } else if (mode === 'scatter') {
    target = personality.getScatterTarget();
  } else {
    // eaten 모드: ghost house로 귀환 (여기서는 scatter 사용)
    target = personality.getScatterTarget();
  }

  // A* 경로 찾기로 최적 방향 계산
  return getDirectionToTarget(ghost.x, ghost.y, target.x, target.y, maze, {
    canEnterGhostHouse: false,
  });
}
