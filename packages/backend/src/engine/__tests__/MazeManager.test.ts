/**
 * MazeManager 단위 테스트
 * 5종 미로 변형의 생성, 조회, 유효성을 검증한다.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MazeManager } from '../MazeManager.js';
import type { MazeData, MazeVariant } from '@ghost-protocol/shared';
import {
  MAZE_WIDTH,
  MAZE_HEIGHT,
  PELLETS_PER_MAZE,
  POWER_PELLETS_PER_MAZE,
} from '@ghost-protocol/shared';

describe('MazeManager', () => {
  let manager: MazeManager;

  beforeEach(() => {
    manager = new MazeManager();
  });

  // ===== 클래식 미로 기본 검증 =====

  describe('클래식 미로', () => {
    let maze: MazeData;

    beforeEach(() => {
      maze = manager.createMaze('classic');
    });

    it('올바른 크기를 가져야 한다 (28x31)', () => {
      expect(maze.width).toBe(MAZE_WIDTH);
      expect(maze.height).toBe(MAZE_HEIGHT);
      expect(maze.walls.length).toBe(MAZE_HEIGHT);
      for (const row of maze.walls) {
        expect(row.length).toBe(MAZE_WIDTH);
      }
    });

    it('정확히 240개의 일반 펠릿을 가져야 한다', () => {
      let pelletCount = 0;
      for (let y = 0; y < MAZE_HEIGHT; y++) {
        const pelletRow = maze.pellets[y];
        if (pelletRow !== undefined) {
          for (let x = 0; x < MAZE_WIDTH; x++) {
            if (pelletRow[x] === true) {
              pelletCount++;
            }
          }
        }
      }
      expect(pelletCount).toBe(PELLETS_PER_MAZE);
    });

    it('정확히 4개의 파워 펠릿을 가져야 한다', () => {
      expect(maze.powerPellets.length).toBe(POWER_PELLETS_PER_MAZE);
    });

    it('올바른 위치에 고스트 하우스가 있어야 한다', () => {
      // 고스트 하우스: 행 12~15, 열 10~17
      for (let y = 12; y <= 15; y++) {
        for (let x = 10; x <= 17; x++) {
          expect(manager.isGhostHouse(maze, x, y)).toBe(true);
        }
      }
      // 고스트 하우스 외부는 false
      expect(manager.isGhostHouse(maze, 9, 14)).toBe(false);
      expect(manager.isGhostHouse(maze, 18, 14)).toBe(false);
    });

    it('2개의 터널을 가져야 한다', () => {
      // 행 14, 열 0과 27
      expect(manager.isTunnel(maze, 0, 14)).toBe(true);
      expect(manager.isTunnel(maze, 27, 14)).toBe(true);
      // 터널이 아닌 위치
      expect(manager.isTunnel(maze, 1, 14)).toBe(false);
      expect(manager.isTunnel(maze, 14, 14)).toBe(false);
    });

    it('팩맨 시작 위치가 (14, 23)이어야 한다', () => {
      const spawn = manager.getPacmanSpawn(maze);
      expect(spawn.x).toBe(14);
      expect(spawn.y).toBe(23);
    });

    it('고스트 시작 위치가 고스트 하우스 영역 내에 있어야 한다', () => {
      const spawns = manager.getGhostSpawns(maze);
      expect(spawns.length).toBe(4);
      // 블링키는 고스트 하우스 바로 위 (행 11)
      const blinkySpawn = spawns[0];
      if (blinkySpawn !== undefined) {
        expect(blinkySpawn.y).toBe(11);
      }
      // 나머지 3마리는 고스트 하우스 내부
      for (let i = 1; i < spawns.length; i++) {
        const spawn = spawns[i];
        if (spawn !== undefined) {
          expect(manager.isGhostHouse(maze, spawn.x, spawn.y)).toBe(true);
        }
      }
    });
  });

  // ===== 모든 변형 유효성 검증 =====

  describe('모든 미로 변형', () => {
    const variants: MazeVariant[] = ['classic', 'labyrinth', 'speedway', 'fortress', 'random'];

    for (const variant of variants) {
      describe(`${variant} 변형`, () => {
        it('유효한 미로를 생성해야 한다', () => {
          const maze = manager.createMaze(variant, variant === 'random' ? 12345 : undefined);

          // 크기 검증
          expect(maze.width).toBe(MAZE_WIDTH);
          expect(maze.height).toBe(MAZE_HEIGHT);
          expect(maze.walls.length).toBe(MAZE_HEIGHT);
          expect(maze.pellets.length).toBe(MAZE_HEIGHT);

          // 파워 펠릿 수 검증
          expect(maze.powerPellets.length).toBe(POWER_PELLETS_PER_MAZE);

          // 파워 펠릿이 범위 내에 있는지 검증
          for (const pp of maze.powerPellets) {
            expect(pp.x).toBeGreaterThanOrEqual(0);
            expect(pp.x).toBeLessThan(MAZE_WIDTH);
            expect(pp.y).toBeGreaterThanOrEqual(0);
            expect(pp.y).toBeLessThan(MAZE_HEIGHT);
          }

          // 펠릿이 벽 위에 있지 않은지 검증
          for (let y = 0; y < MAZE_HEIGHT; y++) {
            const pelletRow = maze.pellets[y];
            const wallRow = maze.walls[y];
            if (pelletRow !== undefined && wallRow !== undefined) {
              for (let x = 0; x < MAZE_WIDTH; x++) {
                if (pelletRow[x] === true) {
                  expect(wallRow[x]).toBe(false);
                }
              }
            }
          }
        });
      });
    }
  });

  // ===== 랜덤 미로 결정성 검증 =====

  describe('랜덤 미로', () => {
    it('같은 시드로 동일한 미로를 생성해야 한다 (결정적)', () => {
      const managerA = new MazeManager();
      const managerB = new MazeManager();

      const mazeA = managerA.createMaze('random', 99999);
      const mazeB = managerB.createMaze('random', 99999);

      // 벽 배열 완전 비교
      for (let y = 0; y < MAZE_HEIGHT; y++) {
        const wallRowA = mazeA.walls[y];
        const wallRowB = mazeB.walls[y];
        const pelletRowA = mazeA.pellets[y];
        const pelletRowB = mazeB.pellets[y];
        if (wallRowA !== undefined && wallRowB !== undefined && pelletRowA !== undefined && pelletRowB !== undefined) {
          for (let x = 0; x < MAZE_WIDTH; x++) {
            expect(wallRowA[x]).toBe(wallRowB[x]);
            expect(pelletRowA[x]).toBe(pelletRowB[x]);
          }
        }
      }

      // 파워 펠릿 위치 비교
      expect(mazeA.powerPellets).toEqual(mazeB.powerPellets);
    });

    it('다른 시드로 다른 미로를 생성해야 한다', () => {
      const mazeA = manager.createMaze('random', 11111);
      // 새 인스턴스 사용 (캐시 회피)
      const managerB = new MazeManager();
      const mazeB = managerB.createMaze('random', 22222);

      // 최소 하나의 차이가 있는지 확인
      let hasDifference = false;
      for (let y = 0; y < MAZE_HEIGHT && !hasDifference; y++) {
        const wallRowA = mazeA.walls[y];
        const wallRowB = mazeB.walls[y];
        if (wallRowA !== undefined && wallRowB !== undefined) {
          for (let x = 0; x < MAZE_WIDTH && !hasDifference; x++) {
            if (wallRowA[x] !== wallRowB[x]) {
              hasDifference = true;
            }
          }
        }
      }
      expect(hasDifference).toBe(true);
    });

    it('완전 연결성을 가져야 한다 (BFS로 모든 펠릿 도달 가능)', () => {
      const maze = manager.createMaze('random', 42);

      // 모든 펠릿 위치 수집
      const pelletPositions: [number, number][] = [];
      for (let y = 0; y < MAZE_HEIGHT; y++) {
        const pelletRow = maze.pellets[y];
        if (pelletRow !== undefined) {
          for (let x = 0; x < MAZE_WIDTH; x++) {
            if (pelletRow[x] === true) {
              pelletPositions.push([x, y]);
            }
          }
        }
      }

      if (pelletPositions.length === 0) return;

      // 첫 번째 펠릿에서 BFS 시작
      const visited = new Set<string>();
      const firstPellet = pelletPositions[0];
      if (firstPellet === undefined) return;
      const queue: [number, number][] = [firstPellet];
      visited.add(`${String(firstPellet[0])},${String(firstPellet[1])}`);

      while (queue.length > 0) {
        const current = queue.shift();
        if (current === undefined) break;
        const [cx, cy] = current;
        const neighbors: [number, number][] = [
          [cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1],
        ];

        for (const [nx, ny] of neighbors) {
          // 터널 래핑 처리
          let wrappedX = nx;
          if (ny === 14) {
            if (nx < 0) wrappedX = MAZE_WIDTH - 1;
            if (nx >= MAZE_WIDTH) wrappedX = 0;
          }

          const wallRow = maze.walls[ny];
          if (
            wrappedX >= 0 && wrappedX < MAZE_WIDTH &&
            ny >= 0 && ny < MAZE_HEIGHT &&
            wallRow !== undefined &&
            wallRow[wrappedX] !== true &&
            !visited.has(`${String(wrappedX)},${String(ny)}`)
          ) {
            visited.add(`${String(wrappedX)},${String(ny)}`);
            queue.push([wrappedX, ny]);
          }
        }
      }

      // 모든 펠릿이 도달 가능해야 함
      for (const pelletPos of pelletPositions) {
        const [px, py] = pelletPos;
        expect(visited.has(`${String(px)},${String(py)}`)).toBe(true);
      }
    });

    it('최소 200개의 펠릿을 가져야 한다', () => {
      const maze = manager.createMaze('random', 42);
      const totalPellets = manager.getRemainingPellets(maze);
      expect(totalPellets).toBeGreaterThanOrEqual(200);
    });
  });

  // ===== 타일 판별 메서드 검증 =====

  describe('isWall', () => {
    it('벽 타일을 올바르게 식별해야 한다', () => {
      const maze = manager.createMaze('classic');

      // 테두리는 벽
      expect(manager.isWall(maze, 0, 0)).toBe(true);
      expect(manager.isWall(maze, 27, 0)).toBe(true);
      expect(manager.isWall(maze, 0, 30)).toBe(true);

      // 범위 밖은 벽으로 취급
      expect(manager.isWall(maze, -1, 0)).toBe(true);
      expect(manager.isWall(maze, 28, 0)).toBe(true);
      expect(manager.isWall(maze, 0, -1)).toBe(true);
      expect(manager.isWall(maze, 0, 31)).toBe(true);
    });

    it('경로 타일을 벽이 아닌 것으로 식별해야 한다', () => {
      const maze = manager.createMaze('classic');

      // 펠릿이 있는 위치는 벽이 아님
      expect(manager.isWall(maze, 1, 1)).toBe(false);
    });
  });

  describe('isTunnel', () => {
    it('터널 타일을 올바르게 식별해야 한다', () => {
      const maze = manager.createMaze('classic');

      expect(manager.isTunnel(maze, 0, 14)).toBe(true);
      expect(manager.isTunnel(maze, 27, 14)).toBe(true);
    });

    it('터널이 아닌 타일을 올바르게 식별해야 한다', () => {
      const maze = manager.createMaze('classic');

      expect(manager.isTunnel(maze, 14, 14)).toBe(false);
      expect(manager.isTunnel(maze, 0, 0)).toBe(false);
      expect(manager.isTunnel(maze, 0, 15)).toBe(false);
    });
  });

  describe('isGhostHouse', () => {
    it('고스트 하우스 영역을 올바르게 식별해야 한다', () => {
      const maze = manager.createMaze('classic');

      // 고스트 하우스 내부
      expect(manager.isGhostHouse(maze, 13, 13)).toBe(true);
      expect(manager.isGhostHouse(maze, 14, 14)).toBe(true);
      expect(manager.isGhostHouse(maze, 10, 12)).toBe(true);
      expect(manager.isGhostHouse(maze, 17, 15)).toBe(true);
    });

    it('고스트 하우스 외부를 올바르게 식별해야 한다', () => {
      const maze = manager.createMaze('classic');

      expect(manager.isGhostHouse(maze, 9, 14)).toBe(false);
      expect(manager.isGhostHouse(maze, 18, 14)).toBe(false);
      expect(manager.isGhostHouse(maze, 14, 11)).toBe(false);
      expect(manager.isGhostHouse(maze, 14, 16)).toBe(false);
    });
  });

  // ===== getRemainingPellets 검증 =====

  describe('getRemainingPellets', () => {
    it('클래식 미로에서 올바른 펠릿 수를 반환해야 한다', () => {
      const maze = manager.createMaze('classic');
      const total = manager.getRemainingPellets(maze);
      // 일반 펠릿 240 + 파워 펠릿 4 = 244
      expect(total).toBe(PELLETS_PER_MAZE + POWER_PELLETS_PER_MAZE);
    });

    it('펠릿을 제거하면 카운트가 감소해야 한다', () => {
      const maze = manager.createMaze('classic');
      const originalCount = manager.getRemainingPellets(maze);

      // 펠릿 하나 제거 (mutable 캐스팅)
      const mutablePellets = maze.pellets as boolean[][];
      // 펠릿이 있는 첫 번째 위치 찾기
      let removed = false;
      for (let y = 0; y < MAZE_HEIGHT && !removed; y++) {
        const pelletRow = mutablePellets[y];
        if (pelletRow !== undefined) {
          for (let x = 0; x < MAZE_WIDTH && !removed; x++) {
            if (pelletRow[x] === true) {
              pelletRow[x] = false;
              removed = true;
            }
          }
        }
      }

      expect(manager.getRemainingPellets(maze)).toBe(originalCount - 1);
    });
  });

  // ===== 미로 구조적 무결성 =====

  describe('구조적 무결성', () => {
    it('팩맨 스폰 위치가 벽이 아니어야 한다', () => {
      const variants: MazeVariant[] = ['classic', 'labyrinth', 'speedway', 'fortress', 'random'];
      for (const variant of variants) {
        const maze = manager.createMaze(variant, 42);
        const spawn = manager.getPacmanSpawn(maze);
        expect(manager.isWall(maze, spawn.x, spawn.y)).toBe(false);
      }
    });

    it('파워 펠릿 위치가 벽이 아니어야 한다', () => {
      const variants: MazeVariant[] = ['classic', 'labyrinth', 'speedway', 'fortress', 'random'];
      for (const variant of variants) {
        const maze = manager.createMaze(variant, 42);
        for (const pp of maze.powerPellets) {
          expect(manager.isWall(maze, pp.x, pp.y)).toBe(false);
        }
      }
    });

    it('고스트 하우스 타일은 벽이 아니어야 한다', () => {
      const maze = manager.createMaze('classic');
      for (let y = 13; y <= 15; y++) {
        for (let x = 11; x <= 16; x++) {
          // 고스트 하우스 내부는 벽이 아님
          expect(manager.isWall(maze, x, y)).toBe(false);
        }
      }
    });
  });
});
