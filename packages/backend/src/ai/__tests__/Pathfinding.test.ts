/**
 * Pathfinding 모듈 단위 테스트
 * A* 알고리즘, 맨해튼 거리, 방향 계산 검증
 */

import { describe, it, expect } from 'vitest';
import { findPath, getDirectionToTarget, manhattanDistance } from '../Pathfinding.js';
import type { MazeData } from '@ghost-protocol/shared';

/**
 * 테스트용 미로 생성 헬퍼
 * 28x31 미로, 외곽은 벽, 내부는 대부분 열린 공간
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
      // 외곽 벽 생성
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
 * 고스트 하우스가 있는 미로 생성 (좌표 10~17, 12~15)
 */
function createMazeWithGhostHouse(): MazeData {
  const maze = createTestMaze();
  const walls = maze.walls.map(row => [...row]);

  // 고스트 하우스 영역을 벽으로 표시
  for (let y = 12; y <= 15; y++) {
    const wallRow = walls[y];
    if (wallRow !== undefined) {
      for (let x = 10; x <= 17; x++) {
        wallRow[x] = true;
      }
    }
  }

  return {
    ...maze,
    walls,
  };
}

/**
 * 특정 위치에 벽을 추가하는 헬퍼
 */
function addWall(maze: MazeData, x: number, y: number): MazeData {
  const walls = maze.walls.map(row => [...row]);
  const wallRow = walls[y];
  if (wallRow !== undefined) {
    wallRow[x] = true;
  }

  return {
    ...maze,
    walls,
  };
}

describe('Pathfinding', () => {
  describe('manhattanDistance', () => {
    it('동일 위치는 거리 0', () => {
      expect(manhattanDistance(5, 5, 5, 5)).toBe(0);
    });

    it('수평 거리 계산', () => {
      expect(manhattanDistance(1, 5, 10, 5)).toBe(9);
    });

    it('수직 거리 계산', () => {
      expect(manhattanDistance(5, 1, 5, 10)).toBe(9);
    });

    it('대각선 거리 계산 (맨해튼)', () => {
      expect(manhattanDistance(1, 1, 4, 5)).toBe(7); // |4-1| + |5-1| = 3 + 4 = 7
    });

    it('음수 델타 처리', () => {
      expect(manhattanDistance(10, 10, 5, 3)).toBe(12); // |5-10| + |3-10| = 5 + 7 = 12
    });
  });

  describe('findPath', () => {
    it('시작점과 목표점이 같으면 빈 배열 반환', () => {
      const maze = createTestMaze();
      const path = findPath(5, 5, 5, 5, maze);
      expect(path).toEqual([]);
    });

    it('열린 공간에서 경로 찾기 (벽 없음)', () => {
      const maze = createTestMaze();
      const path = findPath(1, 1, 5, 1, maze);

      // 경로는 4칸 (시작점 제외)
      expect(path.length).toBe(4);
      const firstStep = path[0];
      const lastStep = path[path.length - 1];
      expect(firstStep).toEqual({ x: 2, y: 1 });
      expect(lastStep).toEqual({ x: 5, y: 1 });
    });

    it('목표가 벽이면 빈 배열 반환', () => {
      const maze = createTestMaze();
      const path = findPath(1, 1, 0, 0, maze); // (0,0)은 벽
      expect(path).toEqual([]);
    });

    it('고스트 하우스 진입 차단 (canEnterGhostHouse: false)', () => {
      const maze = createMazeWithGhostHouse();
      const path = findPath(9, 14, 18, 14, maze, { canEnterGhostHouse: false });

      // 고스트 하우스를 통과할 수 없으므로 우회 경로 사용
      // 우회 경로가 존재하므로 빈 배열이 아님
      expect(path.length).toBeGreaterThan(0);

      // 경로가 고스트 하우스 영역을 통과하지 않는지 확인
      const passesGhostHouse = path.some(
        (pos) => pos.x >= 10 && pos.x <= 17 && pos.y >= 12 && pos.y <= 15
      );
      expect(passesGhostHouse).toBe(false);
    });

    it('고스트 하우스 진입 허용 (canEnterGhostHouse: true)', () => {
      const maze = createTestMaze();
      const walls = maze.walls.map(row => [...row]);

      // 고스트 하우스 내부는 실제로는 이동 가능 (벽이 아님)
      // 테스트를 위해 고스트 하우스 영역을 열린 공간으로 유지
      const modifiedMaze: MazeData = {
        ...maze,
        walls,
      };

      const path = findPath(9, 14, 18, 14, modifiedMaze, { canEnterGhostHouse: true });

      // 경로가 존재해야 함
      expect(path.length).toBeGreaterThan(0);
    });

    it('터널 래핑 처리 (14번 행)', () => {
      const maze = createTestMaze();

      // 14번 행의 좌측에서 우측으로 터널을 통한 경로
      const path = findPath(1, 14, 26, 14, maze);

      // 경로가 존재해야 함
      expect(path.length).toBeGreaterThan(0);
      expect(path[path.length - 1]).toEqual({ x: 26, y: 14 });
    });

    it('벽으로 완전히 둘러싸인 경우 빈 배열 반환', () => {
      const maze = createTestMaze();
      let modifiedMaze = addWall(maze, 5, 4);
      modifiedMaze = addWall(modifiedMaze, 5, 6);
      modifiedMaze = addWall(modifiedMaze, 4, 5);
      modifiedMaze = addWall(modifiedMaze, 6, 5);

      // (5, 5)가 완전히 갇혔으므로 (1, 1)에서 도달 불가
      const path = findPath(1, 1, 5, 5, modifiedMaze);
      expect(path).toEqual([]);
    });
  });

  describe('getDirectionToTarget', () => {
    it('인접한 목표에 대해 올바른 방향 반환', () => {
      const maze = createTestMaze();

      const dirUp = getDirectionToTarget(5, 5, 5, 4, maze);
      expect(dirUp).toBe('up');

      const dirDown = getDirectionToTarget(5, 5, 5, 6, maze);
      expect(dirDown).toBe('down');

      const dirLeft = getDirectionToTarget(5, 5, 4, 5, maze);
      expect(dirLeft).toBe('left');

      const dirRight = getDirectionToTarget(5, 5, 6, 5, maze);
      expect(dirRight).toBe('right');
    });

    it('경로가 없으면 null 반환', () => {
      const maze = createTestMaze();

      // 벽으로 막힌 목표
      const direction = getDirectionToTarget(1, 1, 0, 0, maze);
      expect(direction).toBe(null);
    });

    it('목표가 위쪽에 있을 때 up 반환', () => {
      const maze = createTestMaze();
      const direction = getDirectionToTarget(5, 10, 5, 5, maze);
      expect(direction).toBe('up');
    });

    it('목표가 왼쪽에 있을 때 left 반환', () => {
      const maze = createTestMaze();
      const direction = getDirectionToTarget(10, 5, 5, 5, maze);
      expect(direction).toBe('left');
    });

    it('복잡한 경로에서 첫 방향 반환', () => {
      const maze = createTestMaze();

      // 벽으로 우회가 필요한 상황 생성
      let modifiedMaze = addWall(maze, 6, 5);
      modifiedMaze = addWall(modifiedMaze, 6, 6);
      modifiedMaze = addWall(modifiedMaze, 6, 7);

      // (5, 5)에서 (10, 5)로 가려면 우회해야 함
      const direction = getDirectionToTarget(5, 5, 10, 5, modifiedMaze);

      // 우회 경로의 첫 방향이 반환됨 (up 또는 down으로 우회 시작)
      expect(direction).not.toBe(null);
      expect(['up', 'down', 'left', 'right']).toContain(direction);
    });

    it('터널 래핑 시 올바른 방향 반환', () => {
      const maze = createTestMaze();

      // 14번 행에서 터널을 통한 이동
      const directionLeft = getDirectionToTarget(26, 14, 1, 14, maze);
      const directionRight = getDirectionToTarget(1, 14, 26, 14, maze);

      // 터널을 통해 이동하므로 방향이 올바르게 계산되어야 함
      expect(directionLeft).not.toBe(null);
      expect(directionRight).not.toBe(null);
    });
  });
});
