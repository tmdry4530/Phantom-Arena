/**
 * A* 경로 탐색 알고리즘
 * 28x31 팩맨 미로에서 최적 경로 계산
 */

import type { Direction, Position, MazeData } from '@ghost-protocol/shared';
import { MAZE_WIDTH, MAZE_HEIGHT } from '@ghost-protocol/shared';

// ===== 인터페이스 및 타입 =====

/** 경로 탐색 옵션 */
export interface PathfindingOptions {
  readonly canEnterGhostHouse?: boolean;
}

/** A* 노드 (내부 사용) */
interface AStarNode {
  readonly x: number;
  readonly y: number;
  readonly g: number; // 시작점으로부터의 실제 비용
  readonly h: number; // 목표까지의 추정 비용 (휴리스틱)
  readonly f: number; // g + h
  readonly parent: AStarNode | null;
}

// ===== 상수 =====

/** 방향별 좌표 델타 (우선순위: up, left, down, right) */
const DIRECTION_DELTAS: ReadonlyMap<Direction, Readonly<{ dx: number; dy: number }>> = new Map([
  ['up', { dx: 0, dy: -1 }],
  ['left', { dx: -1, dy: 0 }],
  ['down', { dx: 0, dy: 1 }],
  ['right', { dx: 1, dy: 0 }],
]);

/** 타이브레이킹용 방향 우선순위 */
const DIRECTION_PRIORITY: readonly Direction[] = ['up', 'left', 'down', 'right'];

/** 고스트 하우스 영역 경계 */
const GHOST_HOUSE_BOUNDS = {
  minX: 10,
  maxX: 17,
  minY: 12,
  maxY: 15,
} as const;

// ===== 유틸리티 함수 =====

/**
 * 맨해튼 거리 계산
 */
export function manhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * 터널 래핑 처리 (14번 행에서 좌우 경계 넘을 때)
 */
function wrapX(x: number, y: number): number {
  if (y !== 14) return x;
  if (x < 0) return MAZE_WIDTH - 1;
  if (x >= MAZE_WIDTH) return 0;
  return x;
}

/**
 * 좌표가 미로 내부인지 확인
 */
function isInBounds(x: number, y: number): boolean {
  return x >= 0 && x < MAZE_WIDTH && y >= 0 && y < MAZE_HEIGHT;
}

/**
 * 좌표가 고스트 하우스 내부인지 확인
 */
function isInGhostHouse(x: number, y: number): boolean {
  return (
    x >= GHOST_HOUSE_BOUNDS.minX &&
    x <= GHOST_HOUSE_BOUNDS.maxX &&
    y >= GHOST_HOUSE_BOUNDS.minY &&
    y <= GHOST_HOUSE_BOUNDS.maxY
  );
}

/**
 * 타일이 이동 가능한지 확인
 */
function isWalkable(
  x: number,
  y: number,
  maze: MazeData,
  canEnterGhostHouse: boolean,
): boolean {
  const wrappedX = wrapX(x, y);
  if (!isInBounds(wrappedX, y)) return false;

  // 벽 체크
  if (maze.walls[y]?.[wrappedX] === true) return false;

  // 고스트 하우스 진입 제한 체크
  if (!canEnterGhostHouse && isInGhostHouse(wrappedX, y)) return false;

  return true;
}

/**
 * 노드 키 생성 (해시맵용)
 */
function nodeKey(x: number, y: number): string {
  return `${String(x)},${String(y)}`;
}

/**
 * 두 좌표가 같은지 비교
 */
function isSamePosition(x1: number, y1: number, x2: number, y2: number): boolean {
  return x1 === x2 && y1 === y2;
}

// ===== 우선순위 큐 (최소 힙) =====

class PriorityQueue {
  private readonly heap: AStarNode[] = [];

  /**
   * 노드 삽입
   */
  push(node: AStarNode): void {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  /**
   * 최소 f값 노드 추출
   */
  pop(): AStarNode | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();

    const min = this.heap[0];
    const lastNode = this.heap.pop();
    if (lastNode !== undefined) {
      this.heap[0] = lastNode;
      this.bubbleDown(0);
    }
    return min;
  }

  /**
   * 큐가 비어있는지 확인
   */
  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * 위로 버블업 (힙 속성 유지)
   */
  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const currentNode = this.heap[index];
      const parentNode = this.heap[parentIndex];
      if (currentNode === undefined || parentNode === undefined) break;
      if (this.compare(currentNode, parentNode) >= 0) break;

      this.heap[index] = parentNode;
      this.heap[parentIndex] = currentNode;
      index = parentIndex;
    }
  }

  /**
   * 아래로 버블다운 (힙 속성 유지)
   */
  private bubbleDown(index: number): void {
    const heapLength = this.heap.length;

    while (index < heapLength) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      const leftNode = this.heap[leftChild];
      const rightNode = this.heap[rightChild];
      const smallestNode = this.heap[smallest];

      if (leftNode !== undefined && smallestNode !== undefined && this.compare(leftNode, smallestNode) < 0) {
        smallest = leftChild;
      }
      const updatedSmallestNode = this.heap[smallest];
      if (rightNode !== undefined && updatedSmallestNode !== undefined && this.compare(rightNode, updatedSmallestNode) < 0) {
        smallest = rightChild;
      }
      if (smallest === index) break;

      const indexNode = this.heap[index];
      const finalSmallestNode = this.heap[smallest];
      if (indexNode !== undefined && finalSmallestNode !== undefined) {
        this.heap[index] = finalSmallestNode;
        this.heap[smallest] = indexNode;
        index = smallest;
      } else {
        break;
      }
    }
  }

  /**
   * 노드 비교 (f값 기준, 동일하면 h값 기준)
   */
  private compare(a: AStarNode, b: AStarNode): number {
    if (a.f !== b.f) return a.f - b.f;
    return a.h - b.h; // f가 같으면 h가 작은 것 우선 (목표에 가까운 것)
  }
}

// ===== A* 알고리즘 =====

/**
 * A* 경로 탐색으로 전체 경로 반환
 */
export function findPath(
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  maze: MazeData,
  options?: PathfindingOptions,
): Position[] {
  const canEnterGhostHouse = options?.canEnterGhostHouse ?? false;

  // 시작점과 목표점이 같으면 빈 경로
  if (isSamePosition(startX, startY, targetX, targetY)) {
    return [];
  }

  // 목표가 이동 불가능한 타일이면 빈 경로
  if (!isWalkable(targetX, targetY, maze, canEnterGhostHouse)) {
    return [];
  }

  const openSet = new PriorityQueue();
  const closedSet = new Set<string>();
  const gScores = new Map<string, number>();

  const startNode: AStarNode = {
    x: startX,
    y: startY,
    g: 0,
    h: manhattanDistance(startX, startY, targetX, targetY),
    f: manhattanDistance(startX, startY, targetX, targetY),
    parent: null,
  };

  openSet.push(startNode);
  gScores.set(nodeKey(startX, startY), 0);

  while (!openSet.isEmpty()) {
    const currentNode = openSet.pop();
    if (currentNode === undefined) break;

    const current: AStarNode = currentNode;
    const currentKey = nodeKey(current.x, current.y);

    // 이미 처리한 노드면 스킵
    if (closedSet.has(currentKey)) continue;

    // 목표 도달
    if (isSamePosition(current.x, current.y, targetX, targetY)) {
      return reconstructPath(current);
    }

    closedSet.add(currentKey);

    // 이웃 노드 탐색 (우선순위 순서대로)
    for (const direction of DIRECTION_PRIORITY) {
      const delta = DIRECTION_DELTAS.get(direction);
      if (delta === undefined) continue;
      const nextX = wrapX(current.x + delta.dx, current.y + delta.dy);
      const nextY = current.y + delta.dy;

      if (!isWalkable(nextX, nextY, maze, canEnterGhostHouse)) continue;

      const neighborKey = nodeKey(nextX, nextY);
      if (closedSet.has(neighborKey)) continue;

      const tentativeG = current.g + 1;
      const existingG = gScores.get(neighborKey);

      // 더 나은 경로를 찾았거나 처음 방문하는 노드
      if (existingG === undefined || tentativeG < existingG) {
        const h = manhattanDistance(nextX, nextY, targetX, targetY);
        const neighbor: AStarNode = {
          x: nextX,
          y: nextY,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parent: current,
        };

        gScores.set(neighborKey, tentativeG);
        openSet.push(neighbor);
      }
    }
  }

  // 경로를 찾지 못함
  return [];
}

/**
 * A* 경로 탐색으로 목표까지의 최적 첫 번째 방향 반환
 */
export function getDirectionToTarget(
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  maze: MazeData,
  options?: PathfindingOptions,
): Direction | null {
  const path = findPath(startX, startY, targetX, targetY, maze, options);

  if (path.length === 0) return null;

  // 경로의 첫 번째 단계가 어느 방향인지 확인
  const firstStep = path[0];
  if (!firstStep) return null;

  const dx = firstStep.x - startX;
  const dy = firstStep.y - startY;

  // 터널 래핑 고려
  let normalizedDx = dx;
  if (startY === 14) {
    if (dx > MAZE_WIDTH / 2) normalizedDx = dx - MAZE_WIDTH;
    if (dx < -MAZE_WIDTH / 2) normalizedDx = dx + MAZE_WIDTH;
  }

  // 델타를 방향으로 변환
  if (normalizedDx === 0 && dy === -1) return 'up';
  if (normalizedDx === 0 && dy === 1) return 'down';
  if (normalizedDx === -1 && dy === 0) return 'left';
  if (normalizedDx === 1 && dy === 0) return 'right';

  // 터널에서 래핑되는 경우
  if (startY === 14) {
    if (normalizedDx < 0) return 'left';
    if (normalizedDx > 0) return 'right';
  }

  return null;
}

/**
 * 노드에서 경로 재구성 (역추적)
 */
function reconstructPath(endNode: AStarNode): Position[] {
  const path: Position[] = [];
  let current: AStarNode | null = endNode;

  while (current !== null) {
    path.unshift({ x: current.x, y: current.y });
    current = current.parent;
  }

  // 시작 노드 제거 (첫 번째 이동만 필요)
  if (path.length > 0) {
    path.shift();
  }

  return path;
}
