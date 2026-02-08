/**
 * RenderBridge - 게임 엔진 상태를 WebSocket 전송 형식으로 변환
 *
 * 역할:
 * - GameState를 렌더링용 프레임으로 직렬화
 * - 델타 압축 (변경된 필드만 전송)
 * - 새 클라이언트를 위한 전체 동기화
 */

import type { GameState, GameStateFrame, PacmanState, GhostState, Position } from '@ghost-protocol/shared';

/** 델타 프레임 - 변경된 필드만 포함 */
interface DeltaFrame {
  readonly tick: number;
  readonly pacman?: PacmanState;
  readonly ghosts?: readonly GhostState[];
  readonly pelletsEaten?: readonly Position[];
  readonly powerActive?: boolean;
  readonly powerTimeRemaining?: number;
  readonly score?: number;
  readonly lives?: number;
}

export class RenderBridge {
  /** 이전 프레임 참조 (델타 계산용) */
  private previousFrame: GameStateFrame | null = null;

  /**
   * 전체 게임 상태를 프레임으로 변환
   *
   * @param state - 게임 엔진의 내부 상태
   * @returns 렌더링에 필요한 최소 데이터만 포함하는 프레임
   */
  toFrame(state: GameState): GameStateFrame {
    const frame: GameStateFrame = {
      tick: state.tick,
      pacman: state.pacman,
      ghosts: state.ghosts,
      pellets: state.maze.pellets,
      powerActive: state.powerActive,
      powerTimeRemaining: state.powerTimeRemaining,
    };

    // 다음 델타 계산을 위해 저장
    this.previousFrame = frame;

    return frame;
  }

  /**
   * 이전 프레임과의 차이만 포함하는 델타 프레임 생성
   *
   * 대역폭 최적화:
   * - 항상 포함: tick
   * - 조건부 포함: 변경된 필드만
   * - pellets는 먹힌 위치 리스트로 전송 (전체 그리드 X)
   *
   * @param currentState - 현재 게임 상태
   * @returns 변경 사항만 포함한 델타 객체, 또는 이전 프레임이 없으면 null
   */
  toDelta(currentState: GameState): DeltaFrame | null {
    if (!this.previousFrame) {
      // 첫 프레임은 전체 전송
      return null;
    }

    const prev = this.previousFrame;

    const delta: Record<string, unknown> = {
      tick: currentState.tick,
    };

    // 팩맨 위치 또는 방향 변경 체크
    const prevPacman = prev.pacman;
    const currPacman = currentState.pacman;
    if (
      prevPacman.x !== currPacman.x ||
      prevPacman.y !== currPacman.y ||
      prevPacman.direction !== currPacman.direction
    ) {
      delta.pacman = currPacman;
    }

    // 점수 변경 체크
    if (prevPacman.score !== currPacman.score) {
      delta.score = currPacman.score;
    }

    // 생명 변경 체크
    if (prevPacman.lives !== currPacman.lives) {
      delta.lives = currPacman.lives;
    }

    // 고스트 변경 체크 (위치 또는 모드)
    const changedGhosts = currentState.ghosts.filter((currGhost, idx) => {
      const prevGhost = prev.ghosts[idx];
      if (!prevGhost) return true;
      return (
        currGhost.x !== prevGhost.x ||
        currGhost.y !== prevGhost.y ||
        currGhost.mode !== prevGhost.mode
      );
    });

    if (changedGhosts.length > 0) {
      delta.ghosts = changedGhosts;
    }

    // 먹힌 펠릿 위치 추출
    const pelletsEaten: Position[] = [];
    const prevPellets = prev.pellets;
    const currPellets = currentState.maze.pellets;

    for (let y = 0; y < prevPellets.length; y++) {
      const prevRow = prevPellets[y];
      const currRow = currPellets[y];
      if (prevRow === undefined || currRow === undefined) continue;
      for (let x = 0; x < prevRow.length; x++) {
        if (prevRow[x] === true && currRow[x] !== true) {
          pelletsEaten.push({ x, y });
        }
      }
    }

    if (pelletsEaten.length > 0) {
      delta.pelletsEaten = pelletsEaten;
    }

    // 파워 상태 변경 체크
    if (prev.powerActive !== currentState.powerActive) {
      delta.powerActive = currentState.powerActive;
    }

    if (prev.powerTimeRemaining !== currentState.powerTimeRemaining) {
      delta.powerTimeRemaining = currentState.powerTimeRemaining;
    }

    // 현재 프레임 저장
    this.previousFrame = {
      tick: currentState.tick,
      pacman: currentState.pacman,
      ghosts: currentState.ghosts,
      pellets: currentState.maze.pellets,
      powerActive: currentState.powerActive,
      powerTimeRemaining: currentState.powerTimeRemaining,
    };

    // 변경 사항이 없어도 tick은 항상 포함하여 반환
    return delta as unknown as DeltaFrame;
  }

  /**
   * 전체 동기화용 데이터 (새 클라이언트 접속 시)
   *
   * @param state - 게임 상태
   * @returns 전체 GameState 그대로 반환
   */
  toFullSync(state: GameState): GameState {
    return state;
  }

  /**
   * 프레임 초기화 (새 매치 시작 시)
   *
   * 델타 계산을 위한 이전 프레임 참조 제거
   */
  reset(): void {
    this.previousFrame = null;
  }

  /**
   * 상태를 JSON 직렬화 가능한 형태로 변환
   *
   * @param state - 게임 상태
   * @returns JSON 문자열 (압축, 공백 최소화)
   */
  serialize(state: GameState): string {
    return JSON.stringify(state);
  }

  /**
   * JSON 문자열에서 GameStateFrame 복원
   *
   * @param data - JSON 문자열
   * @returns 파싱된 GameStateFrame
   */
  deserialize(data: string): GameStateFrame {
    return JSON.parse(data) as GameStateFrame;
  }
}
