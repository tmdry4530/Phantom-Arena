import { create } from 'zustand';
import type { SessionId } from '@ghost-protocol/shared';

/**
 * 서바이벌 배팅 상태 저장소 인터페이스
 */
interface SurvivalBettingStore {
  /** 현재 세션 ID */
  sessionId: SessionId | null;
  /** 라운드별 예측 배팅 총액 (round → amount) */
  predictions: Map<number, bigint>;
  /** 내 예측 배팅 */
  myPrediction: { round: number; amount: bigint } | null;
  /** 전체 배팅 풀 */
  totalPool: bigint;
  /** 배팅 상태 */
  status: 'betting' | 'active' | 'settled';
  /** 실제 탈락 라운드 */
  eliminationRound: number | null;
  /** 내 배당금 */
  myPayout: bigint | null;

  /** 세션 ID 설정 */
  setSessionId: (id: SessionId) => void;
  /** 라운드별 예측 배팅 설정 */
  setPredictions: (predictions: Map<number, bigint>) => void;
  /** 내 예측 배팅 설정 */
  setMyPrediction: (round: number, amount: bigint) => void;
  /** 전체 배팅 풀 설정 */
  setTotalPool: (pool: bigint) => void;
  /** 배팅 상태 설정 */
  setStatus: (status: 'betting' | 'active' | 'settled') => void;
  /** 실제 탈락 라운드 설정 */
  setEliminationRound: (round: number) => void;
  /** 내 배당금 설정 */
  setMyPayout: (payout: bigint) => void;
  /** 상태 초기화 */
  reset: () => void;
}

/**
 * 서바이벌 배팅 상태 저장소
 * 서바이벌 모드의 라운드 예측 배팅 관리
 */
export const useSurvivalBettingStore = create<SurvivalBettingStore>((set) => ({
  sessionId: null,
  predictions: new Map(),
  myPrediction: null,
  totalPool: 0n,
  status: 'betting',
  eliminationRound: null,
  myPayout: null,

  setSessionId: (id) => { set({ sessionId: id }); },

  setPredictions: (predictions) => { set({ predictions }); },

  setMyPrediction: (round, amount) => { set({ myPrediction: { round, amount } }); },

  setTotalPool: (pool) => { set({ totalPool: pool }); },

  setStatus: (status) => { set({ status }); },

  setEliminationRound: (round) => { set({ eliminationRound: round }); },

  setMyPayout: (payout) => { set({ myPayout: payout }); },

  reset: () =>
    { set({
      sessionId: null,
      predictions: new Map(),
      myPrediction: null,
      totalPool: 0n,
      status: 'betting',
      eliminationRound: null,
      myPayout: null,
    }); },
}));
