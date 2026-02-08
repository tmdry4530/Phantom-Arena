import { create } from 'zustand';
import type { GameState, DifficultyTier } from '@ghost-protocol/shared';

/** 게임 상태 저장소 인터페이스 */
interface GameStore {
  /** 현재 게임 상태 스냅샷 */
  gameState: GameState | null;
  /** 게임 진행 중 여부 */
  isPlaying: boolean;
  /** 현재 난이도 티어 */
  difficulty: DifficultyTier;
  /** 서버 세션 ID (서바이벌 모드) */
  sessionId: string | null;
  /** 게임 시작 */
  startGame: () => void;
  /** 게임 정지 */
  stopGame: () => void;
  /** 게임 상태 업데이트 (매 틱마다 호출) */
  setGameState: (state: GameState) => void;
  /** 난이도 변경 */
  setDifficulty: (tier: DifficultyTier) => void;
  /** 세션 ID 설정 */
  setSessionId: (id: string | null) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  isPlaying: false,
  difficulty: 1 as DifficultyTier,
  sessionId: null,
  startGame: () => { set({ isPlaying: true }); },
  stopGame: () => { set({ isPlaying: false, gameState: null, sessionId: null }); },
  setGameState: (state) => { set({ gameState: state }); },
  setDifficulty: (tier) => { set({ difficulty: tier }); },
  setSessionId: (id) => { set({ sessionId: id }); },
}));
