import { create } from 'zustand';
import type { BettingPool, BetSide, MatchId } from '@ghost-protocol/shared';

/**
 * 배팅 이력 항목
 */
export interface BettingHistoryItem {
  /** 매치 ID */
  matchId: MatchId;
  /** 배팅한 진영 */
  side: BetSide;
  /** 배팅 금액 */
  amount: bigint;
  /** 결과 상태 */
  result: 'pending' | 'won' | 'lost' | 'refunded';
  /** 배당금 (승리 시) */
  payout: bigint | null;
  /** 청구 완료 시각 */
  claimedAt: number | null;
  /** 배팅 시각 */
  timestamp: number;
}

/**
 * 정산 결과 정보
 */
export interface SettlementResult {
  /** 매치 ID */
  matchId: MatchId;
  /** 승리 진영 */
  winner: BetSide;
  /** 내 배당금 */
  myPayout: bigint | null;
  /** 승리 여부 */
  isWin: boolean;
}

/**
 * 알림 정보
 */
export interface BettingNotification {
  /** 알림 타입 */
  type: 'locked' | 'settled' | 'claimed';
  /** 알림 메시지 */
  message: string;
}

/**
 * 배팅 상태 저장소 인터페이스
 */
interface BettingStore {
  /** 현재 배팅 풀 상태 */
  pool: BettingPool | null;
  /** 내 배팅 정보 */
  myBet: { side: BetSide; amount: bigint } | null;
  /** 배팅 잠금 여부 */
  isLocked: boolean;
  /** 배팅 이력 목록 */
  bettingHistory: BettingHistoryItem[];
  /** 정산 결과 */
  settlement: SettlementResult | null;
  /** 알림 */
  notification: BettingNotification | null;
  /** 청구 가능한 배당금 맵 (matchId → amount) */
  claimablePayouts: Map<string, bigint>;

  /** 배팅 풀 상태 업데이트 */
  setPool: (pool: BettingPool) => void;
  /** 내 배팅 설정 */
  setMyBet: (side: BetSide, amount: bigint) => void;
  /** 배팅 잠금 상태 설정 */
  setLocked: (locked: boolean) => void;
  /** 배팅을 이력에 추가 */
  addBetToHistory: (matchId: MatchId, side: BetSide, amount: bigint) => void;
  /** 정산 결과 설정 */
  setSettlement: (result: SettlementResult) => void;
  /** 청구 가능한 배당금 추가 */
  addClaimable: (matchId: MatchId, amount: bigint) => void;
  /** 배당금 청구 완료 표시 */
  markClaimed: (matchId: MatchId) => void;
  /** 알림 설정 (5초 후 자동 제거) */
  setNotification: (notification: BettingNotification) => void;
  /** 알림 제거 */
  clearNotification: () => void;
  /** 정산 결과 제거 */
  clearSettlement: () => void;
  /** 상태 초기화 */
  reset: () => void;
}

/**
 * 배팅 상태 저장소
 * 매치별 배팅 풀, 사용자 배팅, 잠금 상태, 이력 및 정산 관리
 */
export const useBettingStore = create<BettingStore>((set, get) => ({
  pool: null,
  myBet: null,
  isLocked: false,
  bettingHistory: [],
  settlement: null,
  notification: null,
  claimablePayouts: new Map(),

  setPool: (pool) => { set({ pool }); },

  setMyBet: (side, amount) => { set({ myBet: { side, amount } }); },

  setLocked: (locked) => { set({ isLocked: locked }); },

  addBetToHistory: (matchId, side, amount) =>
    { set((state) => ({
      bettingHistory: [
        ...state.bettingHistory,
        {
          matchId,
          side,
          amount,
          result: 'pending',
          payout: null,
          claimedAt: null,
          timestamp: Date.now(),
        },
      ],
    })); },

  setSettlement: (result) =>
    { set((state) => {
      // 이력에서 해당 매치의 배팅 항목 찾아서 업데이트
      const updatedHistory = state.bettingHistory.map((item) => {
        if (item.matchId === result.matchId && item.result === 'pending') {
          return {
            ...item,
            result: result.isWin ? ('won' as const) : ('lost' as const),
            payout: result.myPayout,
          };
        }
        return item;
      });

      return {
        settlement: result,
        bettingHistory: updatedHistory,
      };
    }); },

  addClaimable: (matchId, amount) =>
    { set((state) => {
      const newClaimable = new Map(state.claimablePayouts);
      newClaimable.set(matchId as string, amount);
      return { claimablePayouts: newClaimable };
    }); },

  markClaimed: (matchId) =>
    { set((state) => {
      const newClaimable = new Map(state.claimablePayouts);
      newClaimable.delete(matchId as string);

      // 이력 업데이트
      const updatedHistory = state.bettingHistory.map((item) => {
        if (item.matchId === matchId && item.result === 'won' && !item.claimedAt) {
          return {
            ...item,
            claimedAt: Date.now(),
          };
        }
        return item;
      });

      return {
        claimablePayouts: newClaimable,
        bettingHistory: updatedHistory,
      };
    }); },

  setNotification: (notification) => {
    set({ notification });
    // 5초 후 자동 제거
    setTimeout(() => {
      if (get().notification === notification) {
        set({ notification: null });
      }
    }, 5000);
  },

  clearNotification: () => { set({ notification: null }); },

  clearSettlement: () => { set({ settlement: null }); },

  reset: () =>
    { set({
      pool: null,
      myBet: null,
      isLocked: false,
      settlement: null,
      notification: null,
      // bettingHistory와 claimablePayouts는 유지 (영구 이력)
    }); },
}));
