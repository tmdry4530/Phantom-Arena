import { useEffect, useRef } from 'react';
import { useAudio } from './useAudio.js';
import { useGameStore } from '../stores/gameStore.js';
import type { GameState, DifficultyTier } from '@ghost-protocol/shared';

/**
 * 게임 상태 변화를 감지하여 적절한 사운드를 재생하는 훅.
 *
 * 다음 이벤트를 감지하고 효과음을 재생한다:
 * - 펠릿 먹기: 점수 증가 + 펠릿 감소 → playWaka()
 * - 유령 먹기: 유령 모드가 'eaten'으로 변경 → playEatGhost()
 * - 죽음: 라이프 감소 → playDeath()
 * - 파워업: powerActive가 false → true → playPowerUp()
 * - 과일 먹기: fruitAvailable가 null이 아님 → null → playEatFruit()
 *
 * 또한 난이도 티어와 파워 모드에 따라 BGM을 조절한다.
 *
 * @example
 * ```tsx
 * function Game() {
 *   useGameAudio(); // 게임 상태 변화에 자동으로 반응
 *   return <GameCanvas />;
 * }
 * ```
 */
export function useGameAudio() {
  const { sfx, music, initialized } = useAudio();
  const gameState = useGameStore((s) => s.gameState);

  // 이전 상태 저장
  const prevStateRef = useRef<GameState | null>(null);

  // 와카 사운드 스로틀 (매 3틱마다 최대 1회 재생)
  const wakaTickCountRef = useRef(0);

  useEffect(() => {
    if (!gameState || !initialized) return;

    const prev = prevStateRef.current;

    // 첫 프레임인 경우 이벤트 감지 건너뛰기
    if (prev === null) {
      prevStateRef.current = gameState;
      return;
    }

    try {
      // 1. 펠릿 먹기 감지 (점수 증가 + 펠릿 수 감소)
      const pelletCountPrev = prev.maze.pellets.reduce(
        (sum, row) => sum + row.filter((p) => p).length,
        0,
      );
      const pelletCountCurrent = gameState.maze.pellets.reduce(
        (sum, row) => sum + row.filter((p) => p).length,
        0,
      );

      if (gameState.score > prev.score && pelletCountCurrent < pelletCountPrev) {
        // 와카 사운드 스로틀 (3틱마다 최대 1회)
        wakaTickCountRef.current += 1;
        if (wakaTickCountRef.current >= 3) {
          sfx.playWaka();
          wakaTickCountRef.current = 0;
        }
      }

      // 2. 유령 먹기 감지 (어떤 유령이든 모드가 'eaten'으로 변경)
      const hasNewEatenGhost = gameState.ghosts.some((ghost) => {
        const prevGhost = prev.ghosts.find((g) => g.id === ghost.id);
        return ghost.mode === 'eaten' && prevGhost?.mode !== 'eaten';
      });

      if (hasNewEatenGhost) {
        sfx.playEatGhost();
      }

      // 3. 죽음 감지 (라이프 감소)
      if (gameState.lives < prev.lives) {
        sfx.playDeath();
      }

      // 4. 파워업 감지 (powerActive false → true)
      if (gameState.powerActive && !prev.powerActive) {
        sfx.playPowerUp();
      }

      // 5. 과일 먹기 감지 (fruitAvailable truthy → null)
      if (prev.fruitAvailable !== null && gameState.fruitAvailable === null) {
        sfx.playEatFruit();
      }

      // 6. BGM 난이도 티어 동기화 (라운드 변경 시)
      if (gameState.round !== prev.round) {
        const tier = Math.min(5, Math.max(1, gameState.round)) as DifficultyTier;
        music.setTier(tier);
      }

      // 7. BGM 모드 동기화 (파워 모드 변경 시)
      if (gameState.powerActive !== prev.powerActive) {
        music.setMode(gameState.powerActive ? 'frightened' : 'normal');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[useGameAudio] 오디오 이벤트 처리 실패: ${msg}`);
    }

    // 현재 상태를 이전 상태로 저장
    prevStateRef.current = gameState;
  }, [gameState, sfx, music, initialized]);
}
