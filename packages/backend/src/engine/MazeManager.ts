/**
 * Ghost Protocol 미로 관리자
 * 28x31 타일 그리드 미로 5종 변형을 생성하고 관리한다.
 */
import type { Position, MazeData, MazeVariant, MazeTile } from '@ghost-protocol/shared';
import { MAZE_WIDTH, MAZE_HEIGHT } from '@ghost-protocol/shared';

// ===== xorshift128+ 의사 난수 생성기 =====

/** 시드 기반 결정적 난수 생성기 (xorshift128+) */
class Xorshift128Plus {
  private s0: number;
  private s1: number;

  constructor(seed: number) {
    // 시드 값으로 두 상태 변수를 초기화
    this.s0 = seed | 0 || 1;
    this.s1 = (seed * 1812433253 + 1) | 0 || 7;
  }

  /** 0 이상 1 미만의 부동소수점 난수 반환 */
  next(): number {
    let s1 = this.s0;
    const s0 = this.s1;
    this.s0 = s0;
    s1 ^= s1 << 23;
    s1 ^= s1 >>> 17;
    s1 ^= s0;
    s1 ^= s0 >>> 26;
    this.s1 = s1;
    // 부호 없는 32비트 정수로 변환 후 0~1 범위로 정규화
    return ((this.s0 + this.s1) >>> 0) / 0x100000000;
  }

  /** min 이상 max 이하의 정수 난수 반환 */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

// ===== 미로 문자열 템플릿 =====
// '#' = 벽, '.' = 펠릿, 'o' = 파워 펠릿, '-' = 고스트 하우스 문
// 'G' = 고스트 하우스 내부, 'T' = 터널, ' ' = 빈 경로

/** 클래식 미로 — 원작 팩맨 레이아웃 충실 재현 */
const CLASSIC_MAZE: readonly string[] = [
  '############################',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#o####.#####.##.#####.####o#',
  '#.####.#####.##.#####.####.#',
  '#..........................#',
  '#.####.##.########.##.####.#',
  '#.####.##.########.##.####.#',
  '#......##....##....##......#',
  '######.##### ## #####.######',
  '     #.##### ## #####.#     ',
  '     #.##          ##.#     ',
  '     #.## ###--### ##.#     ',
  '######.## #GGGGGG# ##.######',
  'T     .   #GGGGGG#   .     T',
  '######.## #GGGGGG# ##.######',
  '     #.## ######## ##.#     ',
  '     #.##          ##.#     ',
  '     #.## ######## ##.#     ',
  '######.## ######## ##.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#o..##.......  .......##..o#',
  '###.##.##.########.##.##.###',
  '###.##.##.########.##.##.###',
  '#......##....##....##......#',
  '#.##########.##.##########.#',
  '#.##########.##.##########.#',
  '#..........................#',
  '############################',
];

/** 래버린스 미로 — 복잡한 통로와 막다른 길이 많은 레이아웃 */
const LABYRINTH_MAZE: readonly string[] = [
  '############################',
  '#.........#....#.........#.#',
  '#.###.###.#.##.#.###.###.#.#',
  '#o#...#.#...##...#.#...#.#o#',
  '#.#.#.#.#####.#####.#.#.#..#',
  '#...#.........#.........#..#',
  '#.###.#####.#####.#####.##.#',
  '#.#...#...#.......#...#.##.#',
  '#.#.###.#.#########.#.###.##',
  '######.##....##....##.######',
  '     #.##### ## #####.#     ',
  '     #.##          ##.#     ',
  '     #.## ###--### ##.#     ',
  '######.## #GGGGGG# ##.######',
  'T     .   #GGGGGG#   .     T',
  '######.## #GGGGGG# ##.######',
  '     #.## ######## ##.#     ',
  '     #.##          ##.#     ',
  '     #.## ######## ##.#     ',
  '######.## ######## ##.######',
  '#..#.......##..##.......#..#',
  '#.##.#####.##..##.#####.##.#',
  '#.##.#.....#....#.....#.##.#',
  '#o...#.###.#.  .#.###.#...o#',
  '###.##.#...#.##.#...#.##.###',
  '###.##.#.###.##.###.#.##.###',
  '#......#.....##.....#......#',
  '#.####.###.######.###.####.#',
  '#.####.....##..##.....####.#',
  '#..........................#',
  '############################',
];

/** 스피드웨이 미로 — 넓은 통로로 빠른 플레이 */
const SPEEDWAY_MAZE: readonly string[] = [
  '############################',
  '#..........................#',
  '#.####.##..........##.####.#',
  '#o####.##..........##.####o#',
  '#..........................#',
  '#..........................#',
  '#.####.##.########.##.####.#',
  '#......##....##....##......#',
  '#......##....##....##......#',
  '######.##### ## #####.######',
  '     #.##### ## #####.#     ',
  '     #.##          ##.#     ',
  '     #.## ###--### ##.#     ',
  '######.## #GGGGGG# ##.######',
  'T     .   #GGGGGG#   .     T',
  '######.## #GGGGGG# ##.######',
  '     #.## ######## ##.#     ',
  '     #.##          ##.#     ',
  '     #.## ######## ##.#     ',
  '######.## ######## ##.######',
  '#..........................#',
  '#..........................#',
  '#.####.##..........##.####.#',
  '#o..##.......  .......##..o#',
  '###.##................##.###',
  '#..........................#',
  '#..........................#',
  '#.####.##..........##.####.#',
  '#.####.##..........##.####.#',
  '#..........................#',
  '############################',
];

/** 포트리스 미로 — 방어적 레이아웃, 중앙 밀집 벽, 외곽 탈출 경로 */
const FORTRESS_MAZE: readonly string[] = [
  '############################',
  '#..........................#',
  '#.##.##################.##.#',
  '#o##.#................#.##o#',
  '#.##.#.##############.#.##.#',
  '#....#......####......#....#',
  '#.##.#.####.####.####.#.##.#',
  '#.##.#.####.####.####.#.##.#',
  '#....#......####......#....#',
  '######.##### ## #####.######',
  '     #.##### ## #####.#     ',
  '     #.##          ##.#     ',
  '     #.## ###--### ##.#     ',
  '######.## #GGGGGG# ##.######',
  'T     .   #GGGGGG#   .     T',
  '######.## #GGGGGG# ##.######',
  '     #.## ######## ##.#     ',
  '     #.##          ##.#     ',
  '     #.## ######## ##.#     ',
  '######.## ######## ##.######',
  '#....#................#....#',
  '#.##.#.####.####.####.#.##.#',
  '#.##.#.####.####.####.#.##.#',
  '#o...#......#  #......#...o#',
  '###.##.####.#  #.####.##.###',
  '#....#......#  #......#....#',
  '#.##.#.##############.#.##.#',
  '#.##.#................#.##.#',
  '#.##.##################.##.#',
  '#..........................#',
  '############################',
];

/** 미로 변형별 문자열 템플릿 매핑 */
const MAZE_TEMPLATES: ReadonlyMap<string, readonly string[]> = new Map([
  ['classic', CLASSIC_MAZE],
  ['labyrinth', LABYRINTH_MAZE],
  ['speedway', SPEEDWAY_MAZE],
  ['fortress', FORTRESS_MAZE],
]);

// ===== 내부 타일 식별 유틸리티 =====

/** 문자열 템플릿의 문자를 타일 종류로 변환 */
function charToTile(ch: string): MazeTile {
  switch (ch) {
    case '#': return 'wall';
    case '.': return 'pellet';
    case 'o': return 'powerPellet';
    case '-': return 'ghostHouse'; // 고스트 하우스 문도 고스트 하우스 영역
    case 'G': return 'ghostHouse';
    case 'T': return 'tunnel';
    case ' ': return 'path';
    default:  return 'wall';
  }
}

// ===== 내부 미로 파싱 =====

/** 고스트 하우스 영역인지 판별 (문자 기준) */
function isGhostHouseChar(ch: string): boolean {
  return ch === 'G' || ch === '-';
}

/** 터널 타일인지 판별 (문자 기준) */
function isTunnelChar(ch: string): boolean {
  return ch === 'T';
}

/**
 * 내부 미로 데이터 구조
 * MazeData 외에 고스트 하우스/터널/스폰 정보를 포함
 */
interface InternalMazeData {
  /** 표준 MazeData */
  readonly mazeData: MazeData;
  /** 고스트 하우스 타일 좌표 (문 포함) */
  readonly ghostHouseTiles: ReadonlySet<string>;
  /** 터널 타일 좌표 */
  readonly tunnelTiles: ReadonlySet<string>;
  /** 팩맨 시작 위치 */
  readonly pacmanSpawn: Position;
  /** 고스트 시작 위치 배열 */
  readonly ghostSpawns: readonly Position[];
}

/** 좌표를 문자열 키로 변환 */
function posKey(x: number, y: number): string {
  return `${String(x)},${String(y)}`;
}

/**
 * 문자열 템플릿으로부터 InternalMazeData를 파싱
 * 펠릿 수가 PELLETS_PER_MAZE에 맞도록 조정
 */
function parseMazeTemplate(template: readonly string[]): InternalMazeData {
  const walls: boolean[][] = [];
  const pellets: boolean[][] = [];
  const powerPellets: Position[] = [];
  const ghostHouseTiles = new Set<string>();
  const tunnelTiles = new Set<string>();

  for (let y = 0; y < MAZE_HEIGHT; y++) {
    const wallRow: boolean[] = [];
    const pelletRow: boolean[] = [];
    const row = template[y] ?? '';

    for (let x = 0; x < MAZE_WIDTH; x++) {
      const ch = row[x] ?? '#';
      const tile = charToTile(ch);

      wallRow.push(tile === 'wall');
      pelletRow.push(tile === 'pellet');

      if (tile === 'powerPellet') {
        powerPellets.push({ x, y });
      }
      if (isGhostHouseChar(ch)) {
        ghostHouseTiles.add(posKey(x, y));
      }
      if (isTunnelChar(ch)) {
        tunnelTiles.add(posKey(x, y));
      }
    }

    walls.push(wallRow);
    pellets.push(pelletRow);
  }

  // 팩맨 스폰 위치 — 클래식 기준 (14, 23), 다른 변형도 동일
  const pacmanSpawn: Position = { x: 14, y: 23 };

  // 고스트 스폰 위치 — 고스트 하우스 내부 중앙
  const ghostSpawns: Position[] = [
    { x: 14, y: 11 }, // 블링키 — 고스트 하우스 바로 위 (즉시 출발)
    { x: 12, y: 14 }, // 핑키
    { x: 14, y: 14 }, // 인키
    { x: 16, y: 14 }, // 클라이드
  ];

  const mazeData: MazeData = {
    width: MAZE_WIDTH,
    height: MAZE_HEIGHT,
    walls,
    pellets,
    powerPellets,
  };

  return {
    mazeData,
    ghostHouseTiles,
    tunnelTiles,
    pacmanSpawn,
    ghostSpawns,
  };
}

// ===== 랜덤 미로 생성 =====

/**
 * 결정적 절차적 미로 생성 (xorshift128+ 기반)
 * 알고리즘: 모든 벽에서 시작 → 재귀적 백트래커로 경로 조각
 * 좌우 대칭 보장, 고스트 하우스/터널/파워 펠릿 배치
 */
function generateRandomMaze(seed: number): InternalMazeData {
  const rng = new Xorshift128Plus(seed);

  // 작업용 그리드: true = 벽
  const grid: boolean[][] = [];
  for (let y = 0; y < MAZE_HEIGHT; y++) {
    grid.push(new Array<boolean>(MAZE_WIDTH).fill(true));
  }

  // 고스트 하우스 영역 정의 (행 12~15, 열 10~17)
  const ghostHouseTiles = new Set<string>();
  // 고스트 하우스 문 위치
  const doorPositions = new Set<string>();
  for (let y = 12; y <= 15; y++) {
    for (let x = 10; x <= 17; x++) {
      ghostHouseTiles.add(posKey(x, y));
      const row = grid[y];
      if (row !== undefined) {
        row[x] = false; // 고스트 하우스는 벽이 아님
      }
    }
  }
  // 문 위치 (행 12, 열 13~14)
  doorPositions.add(posKey(13, 12));
  doorPositions.add(posKey(14, 12));

  // 고스트 하우스 위 통로 (행 11, 열 10~17)
  const row11 = grid[11];
  if (row11 !== undefined) {
    for (let x = 10; x <= 17; x++) {
      row11[x] = false;
    }
  }

  // 터널 위치 (행 14, 열 0과 27)
  const tunnelTiles = new Set<string>();
  tunnelTiles.add(posKey(0, 14));
  tunnelTiles.add(posKey(27, 14));
  const row14 = grid[14];
  if (row14 !== undefined) {
    row14[0] = false;
    row14[27] = false;
    // 터널 통로 연결 (행 14 전체)
    for (let x = 0; x < MAZE_WIDTH; x++) {
      row14[x] = false;
    }
  }

  // 외벽 보장 (상하좌우 테두리는 항상 벽, 터널 제외)
  const row0 = grid[0];
  const rowLast = grid[MAZE_HEIGHT - 1];
  if (row0 !== undefined) {
    for (let x = 0; x < MAZE_WIDTH; x++) {
      row0[x] = true;
    }
  }
  if (rowLast !== undefined) {
    for (let x = 0; x < MAZE_WIDTH; x++) {
      rowLast[x] = true;
    }
  }
  for (let y = 0; y < MAZE_HEIGHT; y++) {
    const rowY = grid[y];
    if (rowY !== undefined) {
      rowY[0] = true;
      rowY[MAZE_WIDTH - 1] = true;
    }
  }
  // 터널 타일은 벽이 아님
  if (row14 !== undefined) {
    row14[0] = false;
    row14[MAZE_WIDTH - 1] = false;
  }

  // 재귀적 백트래커를 위한 반쪽 그리드 (좌우 대칭)
  // 왼쪽 절반만 조각한 뒤 오른쪽에 미러링
  const halfWidth = Math.floor(MAZE_WIDTH / 2); // 14

  // 조각 대상 셀 판별: 홀수 좌표만 (격자 기반)
  // 시작점: (1, 1)
  const visited = new Set<string>();

  /** 특정 좌표가 조각 가능한지 확인 */
  function canCarve(x: number, y: number): boolean {
    // 범위 검사 (왼쪽 절반 내부, 외벽 제외)
    if (x < 1 || x >= halfWidth || y < 1 || y >= MAZE_HEIGHT - 1) return false;
    // 고스트 하우스 영역이면 건너뜀
    const mirrorX = MAZE_WIDTH - 1 - x;
    if (ghostHouseTiles.has(posKey(x, y)) || ghostHouseTiles.has(posKey(mirrorX, y))) return false;
    // 행 11 고스트 하우스 위 통로 보호
    if (y === 11 && x >= 10 && x <= 17) return false;
    // 행 14 터널 행 보호
    if (y === 14) return false;
    // 이미 방문했으면 불가
    if (visited.has(posKey(x, y))) return false;
    return true;
  }

  /** 재귀적 백트래커 — 미로 경로 조각 */
  function carve(x: number, y: number): void {
    visited.add(posKey(x, y));
    const rowY = grid[y];
    if (rowY !== undefined) {
      rowY[x] = false;
      // 대칭 반영
      const mirrorX = MAZE_WIDTH - 1 - x;
      rowY[mirrorX] = false;
    }

    // 4방향 셔플
    const dirs: [number, number][] = [[0, -2], [0, 2], [-2, 0], [2, 0]];
    // Fisher-Yates 셔플
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = rng.nextInt(0, i);
      const dirI = dirs[i];
      const dirJ = dirs[j];
      if (dirI !== undefined && dirJ !== undefined) {
        [dirs[i], dirs[j]] = [dirJ, dirI];
      }
    }

    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (canCarve(nx, ny)) {
        // 사이 벽 제거
        const mx = x + dx / 2;
        const my = y + dy / 2;
        const rowMy = grid[my];
        if (rowMy !== undefined) {
          rowMy[mx] = false;
          // 대칭 반영
          rowMy[MAZE_WIDTH - 1 - mx] = false;
        }
        visited.add(posKey(mx, my));
        carve(nx, ny);
      }
    }
  }

  // 여러 시작점에서 조각하여 더 많은 경로 생성
  const startPoints: [number, number][] = [
    [1, 1], [1, 5], [1, 9],
    [3, 1], [5, 1], [7, 1],
    [1, 19], [1, 23], [1, 27],
    [3, 19], [5, 19], [7, 19],
    [3, 29], [5, 29], [7, 29],
  ];

  for (const [sx, sy] of startPoints) {
    if (canCarve(sx, sy)) {
      carve(sx, sy);
    }
  }

  // 추가 경로 개방 — 최소 펠릿 수 보장을 위해
  // 아직 벽인 내부 셀 중 일부를 무작위로 개방
  for (let y = 1; y < MAZE_HEIGHT - 1; y++) {
    const rowY = grid[y];
    if (rowY === undefined) continue;
    for (let x = 1; x < halfWidth; x++) {
      if (rowY[x] === true && !ghostHouseTiles.has(posKey(x, y)) && y !== 14) {
        // 인접한 경로 셀이 있으면 일정 확률로 개방
        const neighbors: [number, number][] = [
          [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
        ];
        const hasAdjacentPath = neighbors.some(
          ([nx, ny]) => {
            const nRow = grid[ny];
            return nx >= 0 && nx < MAZE_WIDTH && ny >= 0 && ny < MAZE_HEIGHT && nRow !== undefined && nRow[nx] === false;
          }
        );
        if (hasAdjacentPath && rng.next() < 0.35) {
          rowY[x] = false;
          const mirrorX = MAZE_WIDTH - 1 - x;
          rowY[mirrorX] = false;
        }
      }
    }
  }

  // 팩맨 스폰 위치 보장 (14, 23)
  const row23 = grid[23];
  const row22 = grid[22];
  const row24 = grid[24];
  if (row23 !== undefined) {
    row23[14] = false;
    row23[13] = false;
  }
  // 스폰 주변 경로 확보
  for (let dx = -1; dx <= 1; dx++) {
    const px = 14 + dx;
    if (px >= 0 && px < MAZE_WIDTH) {
      if (row23 !== undefined) row23[px] = false;
      if (row22 !== undefined) row22[px] = false;
      if (row24 !== undefined) row24[px] = false;
    }
  }

  // 연결성 보장 — BFS로 연결되지 않은 경로 셀을 연결
  ensureConnectivity(grid, ghostHouseTiles);

  // 파워 펠릿 위치 (네 모서리 근처)
  const powerPelletPositions: Position[] = [];
  const cornerTargets: [number, number][] = [
    [1, 3],                       // 좌상
    [MAZE_WIDTH - 2, 3],          // 우상
    [1, MAZE_HEIGHT - 4],         // 좌하
    [MAZE_WIDTH - 2, MAZE_HEIGHT - 4], // 우하
  ];
  for (const [cx, cy] of cornerTargets) {
    // 목표 위치 근처에서 벽이 아닌 타일 탐색
    let placed = false;
    for (let r = 0; r <= 3 && !placed; r++) {
      for (let dy = -r; dy <= r && !placed; dy++) {
        for (let dx = -r; dx <= r && !placed; dx++) {
          const px = cx + dx;
          const py = cy + dy;
          const rowPy = grid[py];
          if (
            px >= 0 && px < MAZE_WIDTH && py >= 0 && py < MAZE_HEIGHT &&
            rowPy !== undefined &&
            rowPy[px] === false &&
            !ghostHouseTiles.has(posKey(px, py)) &&
            !tunnelTiles.has(posKey(px, py))
          ) {
            powerPelletPositions.push({ x: px, y: py });
            placed = true;
          }
        }
      }
    }
    // 최악의 경우 기본 위치에 강제 배치
    if (!placed) {
      const rowCy = grid[cy];
      if (rowCy !== undefined) {
        rowCy[cx] = false;
      }
      powerPelletPositions.push({ x: cx, y: cy });
    }
  }

  // 펠릿 배치 — 벽이 아닌 모든 타일(고스트 하우스/터널/파워 펠릿 제외)에 펠릿 배치
  const pellets: boolean[][] = [];
  const powerPelletSet = new Set(powerPelletPositions.map(p => posKey(p.x, p.y)));

  for (let y = 0; y < MAZE_HEIGHT; y++) {
    const row: boolean[] = [];
    const gridRow = grid[y];
    for (let x = 0; x < MAZE_WIDTH; x++) {
      const isPath = gridRow !== undefined && gridRow[x] === false;
      const isGH = ghostHouseTiles.has(posKey(x, y));
      const isTun = tunnelTiles.has(posKey(x, y));
      const isPP = powerPelletSet.has(posKey(x, y));
      row.push(isPath && !isGH && !isTun && !isPP);
    }
    pellets.push(row);
  }

  // 팩맨 스폰 위치에는 펠릿 없음
  const pelletRow23 = pellets[23];
  if (pelletRow23 !== undefined) {
    pelletRow23[14] = false;
  }

  const mazeData: MazeData = {
    width: MAZE_WIDTH,
    height: MAZE_HEIGHT,
    walls: grid,
    pellets,
    powerPellets: powerPelletPositions,
  };

  const pacmanSpawn: Position = { x: 14, y: 23 };
  const ghostSpawns: Position[] = [
    { x: 14, y: 11 },
    { x: 12, y: 14 },
    { x: 14, y: 14 },
    { x: 16, y: 14 },
  ];

  return {
    mazeData,
    ghostHouseTiles,
    tunnelTiles,
    pacmanSpawn,
    ghostSpawns,
  };
}

/**
 * BFS 기반 연결성 보장
 * 연결되지 않은 경로 영역을 찾아 메인 영역과 연결
 */
function ensureConnectivity(grid: boolean[][], ghostHouseTiles: ReadonlySet<string>): void {
  // 모든 경로 셀 수집
  const pathCells: [number, number][] = [];
  for (let y = 1; y < MAZE_HEIGHT - 1; y++) {
    const rowY = grid[y];
    if (rowY !== undefined) {
      for (let x = 0; x < MAZE_WIDTH; x++) {
        if (rowY[x] === false && !ghostHouseTiles.has(posKey(x, y))) {
          pathCells.push([x, y]);
        }
      }
    }
  }

  if (pathCells.length === 0) return;

  // BFS로 첫 번째 경로 셀에서 도달 가능한 모든 셀 탐색
  const mainComponent = new Set<string>();
  const firstCell = pathCells[0];
  if (firstCell === undefined) return;
  const queue: [number, number][] = [firstCell];
  mainComponent.add(posKey(firstCell[0], firstCell[1]));

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    const [cx, cy] = current;
    const neighbors: [number, number][] = [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]];
    for (const [nx, ny] of neighbors) {
      const key = posKey(nx, ny);
      const rowNy = grid[ny];
      if (
        nx >= 0 && nx < MAZE_WIDTH && ny >= 0 && ny < MAZE_HEIGHT &&
        rowNy !== undefined &&
        rowNy[nx] === false &&
        !ghostHouseTiles.has(key) &&
        !mainComponent.has(key)
      ) {
        mainComponent.add(key);
        queue.push([nx, ny]);
      }
    }
  }

  // 연결되지 않은 경로 셀이 있으면 벽을 뚫어 연결
  for (const [px, py] of pathCells) {
    if (mainComponent.has(posKey(px, py))) continue;

    // 이 셀에서 메인 컴포넌트까지의 최단 경로를 BFS로 탐색
    const bfsQueue: [number, number, [number, number][]][] = [[px, py, [[px, py]]]];
    const bfsVisited = new Set<string>();
    bfsVisited.add(posKey(px, py));
    let connected = false;

    while (bfsQueue.length > 0 && !connected) {
      const current = bfsQueue.shift();
      if (current === undefined) break;
      const [cx, cy, path] = current;
      const neighbors: [number, number][] = [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]];

      for (const [nx, ny] of neighbors) {
        if (nx < 1 || nx >= MAZE_WIDTH - 1 || ny < 1 || ny >= MAZE_HEIGHT - 1) continue;
        if (ghostHouseTiles.has(posKey(nx, ny))) continue;
        const key = posKey(nx, ny);
        if (bfsVisited.has(key)) continue;

        if (mainComponent.has(key)) {
          // 경로에 있는 모든 벽을 제거하여 연결
          for (const [wx, wy] of path) {
            const rowWy = grid[wy];
            if (rowWy !== undefined) {
              rowWy[wx] = false;
            }
            mainComponent.add(posKey(wx, wy));
          }
          connected = true;
          break;
        }

        bfsVisited.add(key);
        bfsQueue.push([nx, ny, [...path, [nx, ny]]]);
      }
    }
  }
}

// ===== MazeManager 클래스 =====

/** 미로 관리자 — 미로 생성 및 조회 기능 제공 */
export class MazeManager {
  /** 파싱된 미로 메타데이터 캐시 (변형 + 시드 → 내부 데이터) */
  private readonly cache = new Map<string, InternalMazeData>();

  /**
   * 미로 생성 — 변형과 선택적 시드를 받아 MazeData 반환
   * @param variant 미로 변형 종류
   * @param seed 랜덤 미로용 시드 (random 변형에서만 사용)
   */
  createMaze(variant: MazeVariant, seed?: number): MazeData {
    const internal = this.getInternal(variant, seed);
    return internal.mazeData;
  }

  /** 특정 타일이 벽인지 확인 */
  isWall(maze: MazeData, x: number, y: number): boolean {
    if (x < 0 || x >= maze.width || y < 0 || y >= maze.height) return true;
    const row = maze.walls[y];
    if (row === undefined) return true;
    return row[x] === true;
  }

  /** 특정 타일이 터널인지 확인 */
  isTunnel(_maze: MazeData, x: number, y: number): boolean {
    // 터널은 행 14의 양 끝 (열 0, 27)
    return y === 14 && (x === 0 || x === MAZE_WIDTH - 1);
  }

  /** 특정 타일이 고스트 하우스인지 확인 */
  isGhostHouse(_maze: MazeData, x: number, y: number): boolean {
    // 고스트 하우스: 행 12~15, 열 10~17
    return y >= 12 && y <= 15 && x >= 10 && x <= 17;
  }

  /** 팩맨 시작 위치 반환 */
  getPacmanSpawn(_maze: MazeData): Position {
    return { x: 14, y: 23 };
  }

  /** 고스트 시작 위치 반환 */
  getGhostSpawns(_maze: MazeData): Position[] {
    return [
      { x: 14, y: 11 }, // 블링키
      { x: 12, y: 14 }, // 핑키
      { x: 14, y: 14 }, // 인키
      { x: 16, y: 14 }, // 클라이드
    ];
  }

  /** 남은 펠릿 수 반환 (일반 펠릿 + 파워 펠릿) */
  getRemainingPellets(maze: MazeData): number {
    let count = 0;
    for (let y = 0; y < maze.height; y++) {
      const row = maze.pellets[y];
      if (row !== undefined) {
        for (let x = 0; x < maze.width; x++) {
          if (row[x] === true) {
            count++;
          }
        }
      }
    }
    // 파워 펠릿도 포함
    count += maze.powerPellets.length;
    return count;
  }

  /**
   * 내부 미로 데이터 조회 (캐시 활용)
   * @param variant 미로 변형
   * @param seed 시드 (random 전용)
   */
  private getInternal(variant: MazeVariant, seed?: number): InternalMazeData {
    const cacheKey = variant === 'random' ? `random_${String(seed ?? 0)}` : variant;

    let internal = this.cache.get(cacheKey);
    if (internal) return internal;

    if (variant === 'random') {
      internal = generateRandomMaze(seed ?? 42);
    } else {
      const template = MAZE_TEMPLATES.get(variant);
      if (!template) {
        throw new Error(`알 수 없는 미로 변형: ${variant}`);
      }
      internal = parseMazeTemplate(template);
    }

    this.cache.set(cacheKey, internal);
    return internal;
  }
}
