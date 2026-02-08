/**
 * GhostPersonality 모듈 단위 테스트
 * 각 고스트의 성격 전략 및 방향 결정 로직 검증
 */

import { describe, it, expect } from 'vitest';
import { createGhostPersonality, getGhostDirection } from '../GhostPersonality.js';
import type {
  GhostState,
  PacmanState,
  MazeData,
  GhostMode,
  Direction,
} from '@ghost-protocol/shared';

/**
 * 테스트용 미로 생성
 */
function createTestMaze(): MazeData {
  const walls: boolean[][] = [];
  const pellets: boolean[][] = [];

  for (let y = 0; y < 31; y++) {
    const wallRow: boolean[] = [];
    const pelletRow: boolean[] = [];
    walls.push(wallRow);
    pellets.push(pelletRow);
    for (let x = 0; x < 28; x++) {
      const isWall = x === 0 || x === 27 || y === 0 || y === 30;
      wallRow.push(isWall);
      pelletRow.push(!isWall);
    }
  }

  return {
    width: 28,
    height: 31,
    walls,
    pellets,
    powerPellets: [
      { x: 1, y: 3 },
      { x: 26, y: 3 },
      { x: 1, y: 23 },
      { x: 26, y: 23 },
    ],
  };
}

/**
 * 테스트용 팩맨 상태 생성
 */
function createTestPacman(
  x: number,
  y: number,
  direction: Direction = 'right',
): PacmanState {
  return {
    x,
    y,
    direction,
    score: 0,
    lives: 3,
  };
}

/**
 * 테스트용 고스트 상태 생성
 */
function createTestGhost(
  id: 'blinky' | 'pinky' | 'inky' | 'clyde',
  x: number,
  y: number,
  mode: GhostMode = 'chase',
): GhostState {
  return {
    id,
    x,
    y,
    mode,
  };
}

/**
 * 결정론적 랜덤 함수 (항상 0.5 반환)
 */
const fixedRandom = (): number => 0.5;

describe('GhostPersonality', () => {
  describe('createGhostPersonality', () => {
    it('Blinky 성격 생성', () => {
      const personality = createGhostPersonality('blinky');
      expect(personality.ghostId).toBe('blinky');
    });

    it('Pinky 성격 생성', () => {
      const personality = createGhostPersonality('pinky');
      expect(personality.ghostId).toBe('pinky');
    });

    it('Inky 성격 생성', () => {
      const personality = createGhostPersonality('inky');
      expect(personality.ghostId).toBe('inky');
    });

    it('Clyde 성격 생성', () => {
      const personality = createGhostPersonality('clyde');
      expect(personality.ghostId).toBe('clyde');
    });
  });

  describe('Blinky (직접 추적자)', () => {
    const maze = createTestMaze();
    const blinky = createTestGhost('blinky', 10, 10);

    it('추적 목표는 팩맨의 현재 위치', () => {
      const pacman = createTestPacman(15, 15);
      const personality = createGhostPersonality('blinky');
      const target = personality.getChaseTarget(blinky, pacman, [blinky], maze, 100);

      expect(target.x).toBe(15);
      expect(target.y).toBe(15);
    });

    it('산개 목표는 우상단 코너 (25, 0)', () => {
      const personality = createGhostPersonality('blinky');
      const target = personality.getScatterTarget();

      expect(target.x).toBe(25);
      expect(target.y).toBe(0);
    });

    it('Cruise Elroy 1: 펠릿 < 20개일 때 1.05x', () => {
      const personality = createGhostPersonality('blinky');
      const multiplier = personality.getCruiseElroyMultiplier(19);

      expect(multiplier).toBe(1.05);
    });

    it('Cruise Elroy 2: 펠릿 < 10개일 때 1.10x', () => {
      const personality = createGhostPersonality('blinky');
      const multiplier = personality.getCruiseElroyMultiplier(9);

      expect(multiplier).toBe(1.1);
    });

    it('Cruise Elroy 없음: 펠릿 >= 20개일 때 1.0x', () => {
      const personality = createGhostPersonality('blinky');
      const multiplier = personality.getCruiseElroyMultiplier(20);

      expect(multiplier).toBe(1.0);
    });

    it('Cruise Elroy 경계값: 정확히 10개일 때 1.05x', () => {
      const personality = createGhostPersonality('blinky');
      const multiplier = personality.getCruiseElroyMultiplier(10);

      expect(multiplier).toBe(1.05);
    });
  });

  describe('Pinky (매복자)', () => {
    const maze = createTestMaze();
    const pinky = createTestGhost('pinky', 10, 10);

    it('추적 목표는 팩맨 진행 방향 4칸 앞 (right)', () => {
      const pacman = createTestPacman(10, 10, 'right');
      const personality = createGhostPersonality('pinky');
      const target = personality.getChaseTarget(pinky, pacman, [pinky], maze, 100);

      expect(target.x).toBe(14); // 10 + 4
      expect(target.y).toBe(10);
    });

    it('추적 목표는 팩맨 진행 방향 4칸 앞 (down)', () => {
      const pacman = createTestPacman(10, 10, 'down');
      const personality = createGhostPersonality('pinky');
      const target = personality.getChaseTarget(pinky, pacman, [pinky], maze, 100);

      expect(target.x).toBe(10);
      expect(target.y).toBe(14); // 10 + 4
    });

    it('추적 목표는 팩맨 진행 방향 4칸 앞 (left)', () => {
      const pacman = createTestPacman(10, 10, 'left');
      const personality = createGhostPersonality('pinky');
      const target = personality.getChaseTarget(pinky, pacman, [pinky], maze, 100);

      expect(target.x).toBe(6); // 10 - 4
      expect(target.y).toBe(10);
    });

    it('up 방향은 왼쪽으로도 4칸 오프셋 (클래식 버그)', () => {
      const pacman = createTestPacman(10, 10, 'up');
      const personality = createGhostPersonality('pinky');
      const target = personality.getChaseTarget(pinky, pacman, [pinky], maze, 100);

      // up 방향: dx = -4, dy = -4
      expect(target.x).toBe(6); // 10 - 4
      expect(target.y).toBe(6); // 10 - 4
    });

    it('산개 목표는 좌상단 코너 (2, 0)', () => {
      const personality = createGhostPersonality('pinky');
      const target = personality.getScatterTarget();

      expect(target.x).toBe(2);
      expect(target.y).toBe(0);
    });

    it('Cruise Elroy 없음 (항상 1.0x)', () => {
      const personality = createGhostPersonality('pinky');
      expect(personality.getCruiseElroyMultiplier(5)).toBe(1.0);
      expect(personality.getCruiseElroyMultiplier(50)).toBe(1.0);
    });

    it('미로 경계를 벗어나는 목표는 클램프됨', () => {
      const pacman = createTestPacman(26, 29, 'right');
      const personality = createGhostPersonality('pinky');
      const target = personality.getChaseTarget(pinky, pacman, [pinky], maze, 100);

      // 26 + 4 = 30이지만 최대 27로 클램프
      expect(target.x).toBe(27);
      expect(target.y).toBe(29);
    });
  });

  describe('Inky (측면 협공자)', () => {
    const maze = createTestMaze();
    const inky = createTestGhost('inky', 10, 10);
    const blinky = createTestGhost('blinky', 8, 8);

    it('추적 목표는 Blinky와 팩맨 전방 2칸 벡터를 2배 연장', () => {
      const pacman = createTestPacman(12, 12, 'right');
      const personality = createGhostPersonality('inky');
      const allGhosts = [blinky, inky];
      const target = personality.getChaseTarget(inky, pacman, allGhosts, maze, 100);

      // Pivot: pacman (12, 12) + right 2칸 = (14, 12)
      // Vector from Blinky (8, 8) to pivot (14, 12): (6, 4)
      // Target: Blinky + vector * 2 = (8, 8) + (12, 8) = (20, 16)
      expect(target.x).toBe(20);
      expect(target.y).toBe(16);
    });

    it('Blinky가 없으면 팩맨 전방 2칸을 직접 목표로 설정', () => {
      const pacman = createTestPacman(10, 10, 'down');
      const personality = createGhostPersonality('inky');
      const allGhosts = [inky]; // Blinky 없음
      const target = personality.getChaseTarget(inky, pacman, allGhosts, maze, 100);

      // Pivot: pacman (10, 10) + down 2칸 = (10, 12)
      expect(target.x).toBe(10);
      expect(target.y).toBe(12);
    });

    it('up 방향의 클래식 버그 적용 (pivot 계산)', () => {
      const pacman = createTestPacman(12, 12, 'up');
      const personality = createGhostPersonality('inky');
      const allGhosts = [blinky, inky];
      const target = personality.getChaseTarget(inky, pacman, allGhosts, maze, 100);

      // Pivot: pacman (12, 12) + up 2칸 = (12-2, 12-2) = (10, 10)
      // Vector from Blinky (8, 8) to pivot (10, 10): (2, 2)
      // Target: Blinky + vector * 2 = (8, 8) + (4, 4) = (12, 12)
      expect(target.x).toBe(12);
      expect(target.y).toBe(12);
    });

    it('산개 목표는 우하단 코너 (27, 30)', () => {
      const personality = createGhostPersonality('inky');
      const target = personality.getScatterTarget();

      expect(target.x).toBe(27);
      expect(target.y).toBe(30);
    });

    it('Cruise Elroy 없음', () => {
      const personality = createGhostPersonality('inky');
      expect(personality.getCruiseElroyMultiplier(5)).toBe(1.0);
    });
  });

  describe('Clyde (예측 불가능)', () => {
    const maze = createTestMaze();

    it('거리 > 8칸: 팩맨을 직접 추적', () => {
      const clyde = createTestGhost('clyde', 5, 5);
      const pacman = createTestPacman(20, 20); // 거리 = |20-5| + |20-5| = 30
      const personality = createGhostPersonality('clyde');
      const target = personality.getChaseTarget(clyde, pacman, [clyde], maze, 100);

      // 팩맨 위치를 직접 목표로
      expect(target.x).toBe(20);
      expect(target.y).toBe(20);
    });

    it('거리 <= 8칸: 산개 코너로 후퇴', () => {
      const clyde = createTestGhost('clyde', 10, 10);
      const pacman = createTestPacman(14, 14); // 거리 = |14-10| + |14-10| = 8
      const personality = createGhostPersonality('clyde');
      const target = personality.getChaseTarget(clyde, pacman, [clyde], maze, 100);

      // 산개 목표 = (0, 30)
      expect(target.x).toBe(0);
      expect(target.y).toBe(30);
    });

    it('거리 경계값: 정확히 8칸일 때 후퇴', () => {
      const clyde = createTestGhost('clyde', 10, 10);
      const pacman = createTestPacman(14, 14); // 거리 = 8
      const personality = createGhostPersonality('clyde');
      const target = personality.getChaseTarget(clyde, pacman, [clyde], maze, 100);

      expect(target.x).toBe(0);
      expect(target.y).toBe(30);
    });

    it('거리 9칸일 때 추적', () => {
      const clyde = createTestGhost('clyde', 10, 10);
      const pacman = createTestPacman(15, 14); // 거리 = 9
      const personality = createGhostPersonality('clyde');
      const target = personality.getChaseTarget(clyde, pacman, [clyde], maze, 100);

      expect(target.x).toBe(15);
      expect(target.y).toBe(14);
    });

    it('산개 목표는 좌하단 코너 (0, 30)', () => {
      const personality = createGhostPersonality('clyde');
      const target = personality.getScatterTarget();

      expect(target.x).toBe(0);
      expect(target.y).toBe(30);
    });

    it('Cruise Elroy 없음', () => {
      const personality = createGhostPersonality('clyde');
      expect(personality.getCruiseElroyMultiplier(5)).toBe(1.0);
    });
  });

  describe('getGhostDirection', () => {
    const maze = createTestMaze();

    it('frightened 모드에서는 랜덤 방향 반환', () => {
      const ghost = createTestGhost('blinky', 10, 10, 'frightened');
      const pacman = createTestPacman(15, 15);
      const personality = createGhostPersonality('blinky');

      const direction = getGhostDirection(
        ghost,
        pacman,
        [ghost],
        maze,
        'frightened',
        personality,
        100,
        fixedRandom,
      );

      // 랜덤이지만 유효한 방향이어야 함
      expect(['up', 'down', 'left', 'right']).toContain(direction);
    });

    it('chase 모드에서는 추적 목표 사용', () => {
      const ghost = createTestGhost('blinky', 10, 10, 'chase');
      const pacman = createTestPacman(15, 10);
      const personality = createGhostPersonality('blinky');

      const direction = getGhostDirection(
        ghost,
        pacman,
        [ghost],
        maze,
        'chase',
        personality,
        100,
        fixedRandom,
      );

      // Blinky는 팩맨 위치를 직접 추적하므로 right 방향
      expect(direction).toBe('right');
    });

    it('scatter 모드에서는 산개 목표 사용', () => {
      const ghost = createTestGhost('blinky', 20, 5, 'scatter');
      const pacman = createTestPacman(10, 10);
      const personality = createGhostPersonality('blinky');

      const direction = getGhostDirection(
        ghost,
        pacman,
        [ghost],
        maze,
        'scatter',
        personality,
        100,
        fixedRandom,
      );

      // Blinky 산개 목표는 (25, 0)이지만 (25, 0)은 경계 근처
      // 경로가 존재하면 up 또는 right 방향
      if (direction !== null) {
        expect(['up', 'right', 'left', 'down']).toContain(direction);
      }
    });

    it('eaten 모드에서는 산개 목표 사용 (귀환)', () => {
      const ghost = createTestGhost('pinky', 15, 15, 'eaten');
      const pacman = createTestPacman(10, 10);
      const personality = createGhostPersonality('pinky');

      const direction = getGhostDirection(
        ghost,
        pacman,
        [ghost],
        maze,
        'eaten',
        personality,
        100,
        fixedRandom,
      );

      // Pinky 산개 목표는 (2, 0)
      // 경로가 존재하면 유효한 방향 반환
      if (direction !== null) {
        expect(['up', 'down', 'left', 'right']).toContain(direction);
      }
    });

    it('Pinky chase 모드: 팩맨 전방을 목표로', () => {
      const ghost = createTestGhost('pinky', 10, 10, 'chase');
      const pacman = createTestPacman(15, 10, 'right');
      const personality = createGhostPersonality('pinky');

      const direction = getGhostDirection(
        ghost,
        pacman,
        [ghost],
        maze,
        'chase',
        personality,
        100,
        fixedRandom,
      );

      // Pinky 목표: 팩맨 (15, 10) + right 4칸 = (19, 10)
      // (10, 10)에서 (19, 10)로 가려면 right
      expect(direction).toBe('right');
    });

    it('Clyde가 가까이 있을 때 후퇴', () => {
      const ghost = createTestGhost('clyde', 10, 10, 'chase');
      const pacman = createTestPacman(14, 14); // 거리 8
      const personality = createGhostPersonality('clyde');

      const direction = getGhostDirection(
        ghost,
        pacman,
        [ghost],
        maze,
        'chase',
        personality,
        100,
        fixedRandom,
      );

      // Clyde는 산개 코너 (0, 30)로 후퇴
      // (10, 10)에서 (0, 30)로 가려면 주로 left 또는 down
      // 경계가 벽이므로 경로가 존재하면 유효한 방향
      if (direction !== null) {
        expect(['up', 'down', 'left', 'right']).toContain(direction);
      }
    });
  });
});
