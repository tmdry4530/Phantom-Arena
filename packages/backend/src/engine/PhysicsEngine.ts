/**
 * Ghost Protocol 물리 엔진
 * 팩맨 그리드 기반 이동을 위한 결정론적 물리 엔진
 *
 * 핵심 원칙:
 * - 동일 입력은 항상 동일 출력 생성 (결정론적)
 * - 부동소수점 드리프트 최소화를 위해 정수 연산 우선 사용
 * - 타일 기반 이동 + 서브픽셀 진행도 추적
 */
import type { Direction, MazeData, Position } from '@ghost-protocol/shared';
import {
  MAZE_WIDTH,
  GHOST_TUNNEL_SPEED_MULTIPLIER,
  TICK_RATE,
} from '@ghost-protocol/shared';

// ===== 방향 벡터 매핑 =====

/** 각 방향에 대한 타일 오프셋 (dx, dy) */
const DIRECTION_VECTORS: Readonly<Record<Direction, Readonly<Position>>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
} as const;

/** 반대 방향 매핑 */
const OPPOSITE_DIRECTION: Readonly<Record<Direction, Direction>> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
} as const;

// ===== 터널 설정 =====

/** 터널이 위치하는 Y 좌표 (클래식 팩맨 기준: 14행) */
const TUNNEL_Y = 14;

// ===== 물리 엔티티 인터페이스 =====

/** 물리 엔진이 추적하는 엔티티 상태 */
export interface PhysicsEntity {
  /** 현재 타일 X 좌표 (정수) */
  tileX: number;
  /** 현재 타일 Y 좌표 (정수) */
  tileY: number;
  /** 현재 타일 내 이동 진행도 (0.0 ~ 1.0) */
  progress: number;
  /** 현재 이동 방향 */
  direction: Direction;
  /** 다음 타일 경계에서 전환할 방향 (큐잉됨) */
  nextDirection: Direction | null;
  /** 이동 속도 (타일/초) */
  speed: number;
}

// ===== 물리 엔진 =====

/**
 * 결정론적 물리 엔진
 *
 * 28x31 그리드 위에서 엔티티를 이동시키며,
 * 벽 충돌, 터널 랩핑, 코너링, 엔티티 간 충돌을 처리한다.
 */
export class PhysicsEngine {
  /**
   * 엔티티를 한 틱만큼 이동
   *
   * 이동 순서:
   * 1. 코너링 확인 — 타일 경계 근처에서 방향 전환 허용
   * 2. 진행도 증가 (speed / TICK_RATE)
   * 3. 진행도 >= 1.0 이면 다음 타일로 이동
   * 4. 터널 랩핑 처리
   */
  moveEntity(entity: PhysicsEntity, maze: MazeData): void {
    // 코너링: 진행도가 0.5 이상이고 다음 방향이 설정된 경우, 조기 방향 전환 시도
    if (entity.nextDirection !== null && entity.progress >= 0.5) {
      this._tryApplyNextDirection(entity, maze);
    }

    // 현재 방향이 벽으로 막혀있으면 이동하지 않음
    if (!this.canMove(entity.tileX, entity.tileY, entity.direction, maze)) {
      entity.progress = 0;
      return;
    }

    // 틱당 이동량 계산
    const delta = entity.speed / TICK_RATE;
    entity.progress += delta;

    // 타일 경계 도달 시 처리
    if (entity.progress >= 1.0) {
      this._advanceToNextTile(entity, maze);
    }

    // 터널 랩핑 처리
    this.handleTunnel(entity, maze);
  }

  /**
   * 방향 전환 요청 (다음 타일 경계에서 실행)
   *
   * 반대 방향은 즉시 적용되고, 그 외에는 큐에 저장된다.
   */
  queueDirection(entity: PhysicsEntity, direction: Direction): void {
    // 반대 방향 전환은 즉시 허용 (팩맨 규칙)
    if (direction === OPPOSITE_DIRECTION[entity.direction]) {
      entity.direction = direction;
      entity.nextDirection = null;
      // 진행도 반전: 현재 타일 내에서 반대 방향으로 전환
      entity.progress = Math.max(0, 1.0 - entity.progress);
      return;
    }

    entity.nextDirection = direction;
  }

  /**
   * 두 엔티티의 충돌 여부 확인
   *
   * 충돌 조건:
   * 1. 같은 타일에 있는 경우
   * 2. 인접 타일에서 서로를 향해 이동 중인 경우 (교차 충돌)
   */
  checkCollision(a: PhysicsEntity, b: PhysicsEntity): boolean {
    // 조건 1: 같은 타일
    if (a.tileX === b.tileX && a.tileY === b.tileY) {
      return true;
    }

    // 조건 2: 교차 충돌 — 서로를 향해 이동 중인 인접 타일
    const vecA = DIRECTION_VECTORS[a.direction];
    const vecB = DIRECTION_VECTORS[b.direction];

    // a의 다음 타일이 b의 현재 타일인지 확인
    const aNextX = a.tileX + vecA.x;
    const aNextY = a.tileY + vecA.y;

    // b의 다음 타일이 a의 현재 타일인지 확인
    const bNextX = b.tileX + vecB.x;
    const bNextY = b.tileY + vecB.y;

    // 두 엔티티가 서로를 향해 이동 중이고, 양쪽 다 진행도가 0.5 이상인 경우
    if (
      aNextX === b.tileX && aNextY === b.tileY &&
      bNextX === a.tileX && bNextY === a.tileY &&
      a.progress >= 0.5 && b.progress >= 0.5
    ) {
      return true;
    }

    return false;
  }

  /**
   * 펠릿 먹기 확인
   *
   * 팩맨이 펠릿이 있는 타일 중앙에 도착했을 때 수집 처리.
   * 진행도가 0에 가까울 때 (타일에 막 진입했을 때) 확인한다.
   */
  checkPelletCollection(
    entity: PhysicsEntity,
    maze: MazeData,
  ): { collected: boolean; isPower: boolean } {
    const { tileX, tileY } = entity;

    // 미로 범위 밖이면 수집 불가
    if (tileX < 0 || tileX >= maze.width || tileY < 0 || tileY >= maze.height) {
      return { collected: false, isPower: false };
    }

    // 파워 펠릿 확인
    const isPowerPellet = maze.powerPellets.some(
      (p: Position) => p.x === tileX && p.y === tileY,
    );

    if (isPowerPellet) {
      return { collected: true, isPower: true };
    }

    // 일반 펠릿 확인
    if (maze.pellets[tileY]?.[tileX] === true) {
      return { collected: true, isPower: false };
    }

    return { collected: false, isPower: false };
  }

  /**
   * 터널 통과 처리
   *
   * X 좌표가 미로 범위를 벗어나면 반대편으로 텔레포트한다.
   * - x < 0 → x = MAZE_WIDTH - 1 (27)
   * - x >= MAZE_WIDTH → x = 0
   */
  handleTunnel(entity: PhysicsEntity, _maze: MazeData): void {
    if (!this.isInTunnel(entity.tileX, entity.tileY)) {
      // 터널 Y축이 아니면 일반 범위 클램핑만 수행
      return;
    }

    if (entity.tileX < 0) {
      entity.tileX = MAZE_WIDTH - 1;
      entity.progress = 0;
    } else if (entity.tileX >= MAZE_WIDTH) {
      entity.tileX = 0;
      entity.progress = 0;
    }
  }

  /**
   * 특정 방향으로 이동 가능한지 확인
   *
   * 목표 타일이 미로 범위 내에 있고 벽이 아닌 경우 이동 가능.
   * 터널 행에서는 범위 밖도 이동 가능 (랩핑 처리됨).
   */
  canMove(
    tileX: number,
    tileY: number,
    direction: Direction,
    maze: MazeData,
  ): boolean {
    const vec = DIRECTION_VECTORS[direction];
    const nextX = tileX + vec.x;
    const nextY = tileY + vec.y;

    // 터널 행에서는 X 범위 밖 이동 허용
    if (this.isInTunnel(tileX, tileY)) {
      if (nextX < 0 || nextX >= MAZE_WIDTH) {
        return true;
      }
    }

    // Y 범위 확인
    if (nextY < 0 || nextY >= maze.height) {
      return false;
    }

    // X 범위 확인
    if (nextX < 0 || nextX >= maze.width) {
      return false;
    }

    // 벽 확인 — walls[y][x]가 true이면 벽
    const row = maze.walls[nextY];
    if (row === undefined) return false;
    return row[nextX] !== true;
  }

  /**
   * 터널 타일 여부 확인
   *
   * 터널은 특정 Y 좌표에서 미로의 좌우 가장자리에 위치한다.
   */
  isInTunnel(tileX: number, tileY: number): boolean {
    if (tileY !== TUNNEL_Y) {
      return false;
    }
    // 터널 영역: 미로 좌측 가장자리(0~5) 또는 우측 가장자리(22~27) 또는 범위 밖
    return tileX < 6 || tileX >= MAZE_WIDTH - 6 || tileX < 0 || tileX >= MAZE_WIDTH;
  }

  /**
   * 고스트의 유효 속도 계산
   *
   * 터널 내에 있으면 기본 속도에 터널 감속 배율(0.5)을 적용한다.
   */
  getEffectiveSpeed(entity: PhysicsEntity, baseSpeed: number): number {
    if (this.isInTunnel(entity.tileX, entity.tileY)) {
      return baseSpeed * GHOST_TUNNEL_SPEED_MULTIPLIER;
    }
    return baseSpeed;
  }

  // ===== 내부 헬퍼 메서드 =====

  /**
   * 큐에 저장된 다음 방향을 적용 시도
   *
   * 해당 방향으로 이동 가능하면 즉시 방향 전환하고 큐를 비운다.
   */
  private _tryApplyNextDirection(entity: PhysicsEntity, maze: MazeData): void {
    if (entity.nextDirection === null) {
      return;
    }

    // 현재 진행 방향의 다음 타일에서 nextDirection이 유효한지 확인
    // 코너링: 현재 타일이 아닌, 곧 도달할 타일에서 방향 전환 가능 여부 확인
    const vec = DIRECTION_VECTORS[entity.direction];
    const nextTileX = entity.tileX + vec.x;
    const nextTileY = entity.tileY + vec.y;

    // 다음 타일이 유효하고, 그 타일에서 nextDirection으로 이동 가능한 경우
    if (this._isTilePassable(nextTileX, nextTileY, maze)) {
      if (this.canMove(nextTileX, nextTileY, entity.nextDirection, maze)) {
        // 코너링은 여기서 플래그만 세팅 — 실제 전환은 타일 경계 도달 시
        return;
      }
    }

    // 현재 타일에서 바로 nextDirection으로 이동 가능한 경우 (즉시 전환)
    if (this.canMove(entity.tileX, entity.tileY, entity.nextDirection, maze)) {
      entity.direction = entity.nextDirection;
      entity.nextDirection = null;
    }
  }

  /**
   * 다음 타일로 진행
   *
   * 진행도가 1.0 이상일 때 호출된다.
   * 다음 타일로 이동하고, 큐잉된 방향 전환을 처리하며,
   * 벽에 부딪히면 정지한다.
   */
  private _advanceToNextTile(entity: PhysicsEntity, maze: MazeData): void {
    const vec = DIRECTION_VECTORS[entity.direction];
    const nextX = entity.tileX + vec.x;
    const nextY = entity.tileY + vec.y;

    // 결정론적 잔여 진행도 계산
    const remainder = entity.progress - 1.0;

    // 터널 행에서는 범위 밖 이동 허용 (handleTunnel에서 랩핑)
    const isTunnelWrap =
      this.isInTunnel(entity.tileX, entity.tileY) &&
      (nextX < 0 || nextX >= MAZE_WIDTH);

    if (isTunnelWrap) {
      // 터널 랩핑: 다음 타일로 이동 (handleTunnel에서 좌표 보정)
      entity.tileX = nextX;
      entity.tileY = nextY;
      entity.progress = remainder;
      return;
    }

    // 벽 충돌 확인
    if (!this._isTilePassable(nextX, nextY, maze)) {
      // 벽에 부딪힘 — 현재 타일에 정지
      entity.progress = 0;
      return;
    }

    // 다음 타일로 이동
    entity.tileX = nextX;
    entity.tileY = nextY;
    entity.progress = remainder;

    // 타일 경계에서 큐잉된 방향 전환 적용
    if (entity.nextDirection !== null) {
      if (this.canMove(entity.tileX, entity.tileY, entity.nextDirection, maze)) {
        entity.direction = entity.nextDirection;
        entity.nextDirection = null;
      }
    }

    // 현재 방향이 막힌 경우 정지
    if (!this.canMove(entity.tileX, entity.tileY, entity.direction, maze)) {
      entity.progress = 0;
    }
  }

  /**
   * 타일이 이동 가능한지 확인 (벽이 아닌지)
   *
   * 미로 범위 밖은 이동 불가 (터널은 별도 처리)
   */
  private _isTilePassable(tileX: number, tileY: number, maze: MazeData): boolean {
    if (tileY < 0 || tileY >= maze.height) {
      return false;
    }
    if (tileX < 0 || tileX >= maze.width) {
      return false;
    }
    const row = maze.walls[tileY];
    if (row === undefined) return false;
    return row[tileX] !== true;
  }
}
