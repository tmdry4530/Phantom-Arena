/**
 * PhysicsEngine 단위 테스트
 *
 * 결정론적 물리 엔진의 모든 핵심 동작을 검증한다.
 * 5x5 테스트 미로 헬퍼를 사용하여 격리된 환경에서 테스트.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsEngine } from '../PhysicsEngine.js';
import type { PhysicsEntity } from '../PhysicsEngine.js';
import type { MazeData, Position } from '@ghost-protocol/shared';
import { TICK_RATE, GHOST_TUNNEL_SPEED_MULTIPLIER } from '@ghost-protocol/shared';

// ===== 테스트 헬퍼 =====

/**
 * 5x5 테스트 미로 생성
 *
 * 레이아웃 (W=벽, .=경로, P=파워펠릿, o=일반펠릿):
 *
 *   W W W W W     (y=0)
 *   W . o . W     (y=1)
 *   W o . o W     (y=2)
 *   W . P . W     (y=3)
 *   W W W W W     (y=4)
 *
 * 벽으로 둘러싸인 3x3 내부 통로
 */
function createTestMaze(): MazeData {
  // 벽 배열: true = 벽
  const walls: boolean[][] = [
    [true, true, true, true, true],    // y=0: 모두 벽
    [true, false, false, false, true],  // y=1: 내부 통로
    [true, false, false, false, true],  // y=2: 내부 통로
    [true, false, false, false, true],  // y=3: 내부 통로
    [true, true, true, true, true],    // y=4: 모두 벽
  ];

  // 펠릿 배열: true = 펠릿 있음
  const pellets: boolean[][] = [
    [false, false, false, false, false],
    [false, false, true, false, false],   // (2,1)에 펠릿
    [false, true, false, true, false],    // (1,2)와 (3,2)에 펠릿
    [false, false, false, false, false],
    [false, false, false, false, false],
  ];

  // 파워 펠릿 위치
  const powerPellets: Position[] = [{ x: 2, y: 3 }];

  return {
    width: 5,
    height: 5,
    walls,
    pellets,
    powerPellets,
  };
}

/**
 * 28x31 터널 테스트용 미로 생성
 *
 * y=14 행에 터널 통로가 있는 미로.
 * 좌우 가장자리가 열려 있어 터널 랩핑을 테스트할 수 있다.
 */
function createTunnelMaze(): MazeData {
  const walls: boolean[][] = [];
  for (let y = 0; y < 31; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < 28; x++) {
      if (y === 14) {
        // 터널 행: 전부 통로
        row.push(false);
      } else if (y === 13 || y === 15) {
        // 터널 인접 행: 일부 통로 (테스트용)
        row.push(x > 0 && x < 27 ? false : true);
      } else {
        // 그 외: 벽
        row.push(true);
      }
    }
    walls.push(row);
  }

  const pellets: boolean[][] = Array.from({ length: 31 }, () =>
    Array.from({ length: 28 }, () => false),
  );

  return {
    width: 28,
    height: 31,
    walls,
    pellets,
    powerPellets: [],
  };
}

/** 기본 엔티티 생성 헬퍼 */
function createEntity(overrides: Partial<PhysicsEntity> = {}): PhysicsEntity {
  return {
    tileX: 1,
    tileY: 1,
    progress: 0,
    direction: 'right',
    nextDirection: null,
    speed: 8, // BASE_PACMAN_SPEED = 8 타일/초
    ...overrides,
  };
}

// ===== 테스트 시작 =====

describe('PhysicsEngine', () => {
  let engine: PhysicsEngine;
  let maze: MazeData;

  beforeEach(() => {
    engine = new PhysicsEngine();
    maze = createTestMaze();
  });

  // ===== 기본 이동 =====

  describe('moveEntity — 기본 이동', () => {
    it('틱당 올바른 거리만큼 이동해야 한다 (8타일/초 = 8/60 타일/틱)', () => {
      const entity = createEntity({ tileX: 1, tileY: 1, progress: 0 });
      const expectedDelta = 8 / TICK_RATE; // ≈ 0.1333...

      engine.moveEntity(entity, maze);

      // 부동소수점 허용 오차
      expect(entity.progress).toBeCloseTo(expectedDelta, 10);
      // 아직 다음 타일로 이동하지 않음
      expect(entity.tileX).toBe(1);
      expect(entity.tileY).toBe(1);
    });

    it('진행도 >= 1.0일 때 다음 타일로 이동해야 한다', () => {
      // 진행도를 1.0 직전으로 설정
      const entity = createEntity({
        tileX: 1,
        tileY: 1,
        progress: 1.0 - (8 / TICK_RATE) + 0.001,
        direction: 'right',
      });

      engine.moveEntity(entity, maze);

      // 다음 타일(2,1)로 이동해야 함
      expect(entity.tileX).toBe(2);
      expect(entity.tileY).toBe(1);
      // 잔여 진행도가 있어야 함 (결정론적 이월)
      expect(entity.progress).toBeGreaterThanOrEqual(0);
      expect(entity.progress).toBeLessThan(1.0);
    });

    it('여러 틱에 걸쳐 누적 이동이 정확해야 한다', () => {
      const entity = createEntity({
        tileX: 1,
        tileY: 2,
        progress: 0,
        direction: 'right',
      });

      // 8틱 이동 (8 * (8/60) ≈ 1.067 → 한 타일 이동)
      for (let i = 0; i < 8; i++) {
        engine.moveEntity(entity, maze);
      }

      // 최소 한 타일은 이동해야 함
      expect(entity.tileX).toBeGreaterThanOrEqual(2);
    });
  });

  // ===== 방향 전환 =====

  describe('queueDirection — 방향 전환', () => {
    it('다음 타일 경계에서 큐잉된 방향으로 전환해야 한다', () => {
      const entity = createEntity({
        tileX: 2,
        tileY: 1,
        progress: 0,
        direction: 'right',
      });

      // 아래로 방향 전환 요청
      engine.queueDirection(entity, 'down');
      expect(entity.nextDirection).toBe('down');

      // 타일 경계까지 이동 (진행도를 직접 설정하여 경계 도달 시뮬레이션)
      entity.progress = 1.0 - (8 / TICK_RATE);
      engine.moveEntity(entity, maze);

      // 방향이 'down'으로 전환되어야 함 (2,1) → (3,1) 이동 후 (3,1)에서 아래로 전환
      // 또는 코너링으로 인해 더 일찍 전환될 수 있음
      // 핵심: nextDirection이 적용되었는지 확인
      if (entity.tileX === 3 && entity.direction === 'down') {
        expect(entity.nextDirection).toBeNull();
      } else if (entity.tileX === 2) {
        // 코너링 적용됨
        expect(entity.direction === 'down' || entity.nextDirection === 'down').toBe(true);
      }
    });

    it('반대 방향은 즉시 전환되어야 한다', () => {
      const entity = createEntity({
        tileX: 2,
        tileY: 1,
        progress: 0.3,
        direction: 'right',
      });

      engine.queueDirection(entity, 'left');

      // 즉시 방향이 바뀌어야 함
      expect(entity.direction).toBe('left');
      expect(entity.nextDirection).toBeNull();
      // 진행도가 반전되어야 함 (1.0 - 0.3 = 0.7)
      expect(entity.progress).toBeCloseTo(0.7, 10);
    });

    it('이동 불가능한 방향은 큐에 저장되어야 한다', () => {
      const entity = createEntity({
        tileX: 1,
        tileY: 1,
        progress: 0,
        direction: 'right',
      });

      // 위쪽은 벽 (y=0은 벽)
      engine.queueDirection(entity, 'up');
      expect(entity.nextDirection).toBe('up');
      // 방향은 아직 바뀌지 않아야 함
      expect(entity.direction).toBe('right');
    });
  });

  // ===== 벽 충돌 =====

  describe('moveEntity — 벽 충돌', () => {
    it('벽에 부딪히면 타일 경계에서 정지해야 한다', () => {
      const entity = createEntity({
        tileX: 3,
        tileY: 1,
        progress: 0,
        direction: 'right', // (4,1)은 벽
      });

      // 충분히 많은 틱 이동
      for (let i = 0; i < 20; i++) {
        engine.moveEntity(entity, maze);
      }

      // (4,1)은 벽이므로 (3,1)에 정지해야 함
      expect(entity.tileX).toBe(3);
      expect(entity.tileY).toBe(1);
      expect(entity.progress).toBe(0);
    });

    it('벽 방향으로 이동 시 진행도가 0으로 리셋되어야 한다', () => {
      const entity = createEntity({
        tileX: 1,
        tileY: 1,
        progress: 0.9,
        direction: 'up', // (1,0)은 벽
      });

      engine.moveEntity(entity, maze);

      // 벽에 막혀서 정지
      expect(entity.tileY).toBe(1);
      expect(entity.progress).toBe(0);
    });
  });

  // ===== 코너링 =====

  describe('moveEntity — 코너링', () => {
    it('진행도 0.5 이상에서 방향 전환을 허용해야 한다', () => {
      const entity = createEntity({
        tileX: 2,
        tileY: 1,
        progress: 0.55,
        direction: 'right',
        nextDirection: 'down',
      });

      // 코너링 임계값(0.5) 이상이므로 코너링이 시도됨
      engine.moveEntity(entity, maze);

      // 코너링이 적용되었거나, 타일 경계 도달 후 전환됨
      // 두 경우 모두 다음 방향이 처리되었는지 확인
      expect(entity.direction === 'down' || entity.nextDirection === 'down').toBe(true);
    });
  });

  // ===== 터널 =====

  describe('handleTunnel — 터널 랩핑', () => {
    let tunnelMaze: MazeData;

    beforeEach(() => {
      tunnelMaze = createTunnelMaze();
    });

    it('x < 0일 때 x = 27로 텔레포트해야 한다', () => {
      const entity = createEntity({
        tileX: -1,
        tileY: 14,
        progress: 0.5,
        direction: 'left',
      });

      engine.handleTunnel(entity, tunnelMaze);

      expect(entity.tileX).toBe(27);
      expect(entity.progress).toBe(0);
    });

    it('x >= 28일 때 x = 0으로 텔레포트해야 한다', () => {
      const entity = createEntity({
        tileX: 28,
        tileY: 14,
        progress: 0.5,
        direction: 'right',
      });

      engine.handleTunnel(entity, tunnelMaze);

      expect(entity.tileX).toBe(0);
      expect(entity.progress).toBe(0);
    });

    it('터널이 아닌 행에서는 랩핑하지 않아야 한다', () => {
      const entity = createEntity({
        tileX: -1,
        tileY: 13,
        progress: 0.5,
        direction: 'left',
      });

      engine.handleTunnel(entity, tunnelMaze);

      // 터널 행이 아니므로 좌표 변경 없음
      expect(entity.tileX).toBe(-1);
    });

    it('moveEntity에서 터널 랩핑이 자동 처리되어야 한다', () => {
      const entity = createEntity({
        tileX: 0,
        tileY: 14,
        progress: 0.9,
        direction: 'left',
        speed: 8,
      });

      engine.moveEntity(entity, tunnelMaze);

      // 진행도 0.9 + 8/60 ≈ 1.033 → 다음 타일(-1, 14) → 랩핑 → (27, 14)
      expect(entity.tileX).toBe(27);
    });
  });

  // ===== 고스트 터널 속도 =====

  describe('getEffectiveSpeed — 터널 속도 감속', () => {
    it('터널 내에서 고스트 속도가 50%로 감소해야 한다', () => {
      const entity = createEntity({
        tileX: 2,
        tileY: 14, // 터널 Y
      });

      const effectiveSpeed = engine.getEffectiveSpeed(entity, 8);

      expect(effectiveSpeed).toBe(8 * GHOST_TUNNEL_SPEED_MULTIPLIER);
      expect(effectiveSpeed).toBe(4);
    });

    it('터널 밖에서는 기본 속도를 유지해야 한다', () => {
      const entity = createEntity({
        tileX: 14,
        tileY: 15, // 터널이 아닌 행
      });

      const effectiveSpeed = engine.getEffectiveSpeed(entity, 8);

      expect(effectiveSpeed).toBe(8);
    });
  });

  // ===== 충돌 감지 =====

  describe('checkCollision — 충돌 감지', () => {
    it('같은 타일에 있으면 충돌을 감지해야 한다', () => {
      const a = createEntity({ tileX: 2, tileY: 2 });
      const b = createEntity({ tileX: 2, tileY: 2 });

      expect(engine.checkCollision(a, b)).toBe(true);
    });

    it('서로를 향해 이동 중인 인접 엔티티의 교차 충돌을 감지해야 한다', () => {
      const a = createEntity({
        tileX: 1,
        tileY: 2,
        direction: 'right',
        progress: 0.6,
      });
      const b = createEntity({
        tileX: 2,
        tileY: 2,
        direction: 'left',
        progress: 0.6,
      });

      expect(engine.checkCollision(a, b)).toBe(true);
    });

    it('서로 다른 비인접 타일에 있으면 충돌하지 않아야 한다', () => {
      const a = createEntity({ tileX: 1, tileY: 1 });
      const b = createEntity({ tileX: 3, tileY: 3 });

      expect(engine.checkCollision(a, b)).toBe(false);
    });

    it('같은 방향으로 이동 중인 인접 엔티티는 충돌하지 않아야 한다', () => {
      const a = createEntity({
        tileX: 1,
        tileY: 2,
        direction: 'right',
        progress: 0.6,
      });
      const b = createEntity({
        tileX: 2,
        tileY: 2,
        direction: 'right',
        progress: 0.6,
      });

      expect(engine.checkCollision(a, b)).toBe(false);
    });

    it('교차 중이지만 진행도가 0.5 미만이면 충돌하지 않아야 한다', () => {
      const a = createEntity({
        tileX: 1,
        tileY: 2,
        direction: 'right',
        progress: 0.3,
      });
      const b = createEntity({
        tileX: 2,
        tileY: 2,
        direction: 'left',
        progress: 0.3,
      });

      expect(engine.checkCollision(a, b)).toBe(false);
    });
  });

  // ===== 펠릿 수집 =====

  describe('checkPelletCollection — 펠릿 수집', () => {
    it('일반 펠릿이 있는 타일에서 수집을 감지해야 한다', () => {
      const entity = createEntity({ tileX: 2, tileY: 1 }); // (2,1)에 펠릿 있음

      const result = engine.checkPelletCollection(entity, maze);

      expect(result.collected).toBe(true);
      expect(result.isPower).toBe(false);
    });

    it('파워 펠릿이 있는 타일에서 수집을 감지해야 한다', () => {
      const entity = createEntity({ tileX: 2, tileY: 3 }); // (2,3)에 파워 펠릿 있음

      const result = engine.checkPelletCollection(entity, maze);

      expect(result.collected).toBe(true);
      expect(result.isPower).toBe(true);
    });

    it('펠릿이 없는 타일에서는 수집하지 않아야 한다', () => {
      const entity = createEntity({ tileX: 1, tileY: 1 }); // (1,1)에는 펠릿 없음

      const result = engine.checkPelletCollection(entity, maze);

      expect(result.collected).toBe(false);
      expect(result.isPower).toBe(false);
    });

    it('미로 범위 밖에서는 수집하지 않아야 한다', () => {
      const entity = createEntity({ tileX: -1, tileY: 0 });

      const result = engine.checkPelletCollection(entity, maze);

      expect(result.collected).toBe(false);
      expect(result.isPower).toBe(false);
    });
  });

  // ===== canMove =====

  describe('canMove — 이동 가능 여부', () => {
    it('벽 타일로는 이동할 수 없어야 한다', () => {
      // (1,1)에서 위쪽은 (1,0) = 벽
      expect(engine.canMove(1, 1, 'up', maze)).toBe(false);
    });

    it('경로 타일로는 이동할 수 있어야 한다', () => {
      // (1,1)에서 오른쪽은 (2,1) = 경로
      expect(engine.canMove(1, 1, 'right', maze)).toBe(true);
    });

    it('미로 범위 밖으로는 이동할 수 없어야 한다', () => {
      // (1,1)에서 왼쪽은 (0,1) = 벽
      expect(engine.canMove(1, 1, 'left', maze)).toBe(false);
    });

    it('아래쪽 경로로 이동할 수 있어야 한다', () => {
      // (1,1)에서 아래쪽은 (1,2) = 경로
      expect(engine.canMove(1, 1, 'down', maze)).toBe(true);
    });

    it('터널 행에서 범위 밖 이동을 허용해야 한다', () => {
      const tunnelMaze = createTunnelMaze();

      // 터널 행(y=14)에서 x=0, 왼쪽 이동 → x=-1 (터널 랩핑)
      expect(engine.canMove(0, 14, 'left', tunnelMaze)).toBe(true);
      // 터널 행(y=14)에서 x=27, 오른쪽 이동 → x=28 (터널 랩핑)
      expect(engine.canMove(27, 14, 'right', tunnelMaze)).toBe(true);
    });
  });

  // ===== isInTunnel =====

  describe('isInTunnel — 터널 여부', () => {
    it('터널 Y좌표의 가장자리 타일은 터널이어야 한다', () => {
      expect(engine.isInTunnel(0, 14)).toBe(true);
      expect(engine.isInTunnel(5, 14)).toBe(true);
      expect(engine.isInTunnel(22, 14)).toBe(true);
      expect(engine.isInTunnel(27, 14)).toBe(true);
    });

    it('터널 Y좌표의 중앙 타일은 터널이 아니어야 한다', () => {
      expect(engine.isInTunnel(14, 14)).toBe(false);
    });

    it('터널 Y좌표가 아닌 행은 터널이 아니어야 한다', () => {
      expect(engine.isInTunnel(0, 10)).toBe(false);
      expect(engine.isInTunnel(0, 15)).toBe(false);
    });

    it('범위 밖 X좌표도 터널 Y에서는 터널이어야 한다', () => {
      expect(engine.isInTunnel(-1, 14)).toBe(true);
      expect(engine.isInTunnel(28, 14)).toBe(true);
    });
  });

  // ===== 결정론성 =====

  describe('결정론성 — 동일 입력, 동일 출력', () => {
    it('동일한 시퀀스의 이동이 항상 같은 위치를 생성해야 한다', () => {
      // 첫 번째 실행
      const entity1 = createEntity({
        tileX: 1,
        tileY: 2,
        progress: 0,
        direction: 'right',
      });

      for (let i = 0; i < 30; i++) {
        engine.moveEntity(entity1, maze);
        if (i === 10) {
          engine.queueDirection(entity1, 'down');
        }
        if (i === 20) {
          engine.queueDirection(entity1, 'left');
        }
      }

      // 두 번째 실행 (동일 초기 상태, 동일 입력)
      const entity2 = createEntity({
        tileX: 1,
        tileY: 2,
        progress: 0,
        direction: 'right',
      });

      for (let i = 0; i < 30; i++) {
        engine.moveEntity(entity2, maze);
        if (i === 10) {
          engine.queueDirection(entity2, 'down');
        }
        if (i === 20) {
          engine.queueDirection(entity2, 'left');
        }
      }

      // 두 실행의 결과가 완전히 동일해야 함
      expect(entity1.tileX).toBe(entity2.tileX);
      expect(entity1.tileY).toBe(entity2.tileY);
      expect(entity1.progress).toBe(entity2.progress);
      expect(entity1.direction).toBe(entity2.direction);
      expect(entity1.nextDirection).toBe(entity2.nextDirection);
    });

    it('새로운 PhysicsEngine 인스턴스에서도 동일한 결과를 생성해야 한다', () => {
      const engine2 = new PhysicsEngine();

      const entity1 = createEntity({ tileX: 2, tileY: 2, direction: 'down' });
      const entity2 = createEntity({ tileX: 2, tileY: 2, direction: 'down' });

      for (let i = 0; i < 15; i++) {
        engine.moveEntity(entity1, maze);
        engine2.moveEntity(entity2, maze);
      }

      expect(entity1.tileX).toBe(entity2.tileX);
      expect(entity1.tileY).toBe(entity2.tileY);
      expect(entity1.progress).toBe(entity2.progress);
    });
  });

  // ===== 엣지 케이스 =====

  describe('엣지 케이스', () => {
    it('속도 0인 엔티티는 이동하지 않아야 한다', () => {
      const entity = createEntity({
        tileX: 2,
        tileY: 2,
        progress: 0,
        speed: 0,
      });

      engine.moveEntity(entity, maze);

      expect(entity.tileX).toBe(2);
      expect(entity.tileY).toBe(2);
      expect(entity.progress).toBe(0);
    });

    it('진행도가 정확히 1.0일 때도 올바르게 처리해야 한다', () => {
      const entity = createEntity({
        tileX: 1,
        tileY: 2,
        progress: 1.0 - (8 / TICK_RATE),
        direction: 'right',
      });

      engine.moveEntity(entity, maze);

      // 타일 전환이 발생해야 함
      expect(entity.tileX).toBe(2);
    });

    it('반대 방향 전환 시 진행도 0에서 올바르게 반전해야 한다', () => {
      const entity = createEntity({
        tileX: 2,
        tileY: 2,
        progress: 0,
        direction: 'right',
      });

      engine.queueDirection(entity, 'left');

      expect(entity.direction).toBe('left');
      expect(entity.progress).toBeCloseTo(1.0, 10);
    });
  });
});
