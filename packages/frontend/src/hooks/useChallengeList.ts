/**
 * 챌린지 매치 목록 조회 훅
 * REST API 폴링 + WebSocket 실시간 구독
 */
import { useState, useEffect, useCallback } from 'react';
import type { ChallengeMatchInfo } from '@ghost-protocol/shared';
import { API_URL, fetchApi } from '@/lib/api';

/** 폴링 간격 (밀리초) */
const POLL_INTERVAL = 5000;

/** 챌린지 목록 훅 반환 타입 */
interface UseChallengeListReturn {
  readonly challenges: ChallengeMatchInfo[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly refetch: () => void;
}

export function useChallengeList(): UseChallengeListReturn {
  const [challenges, setChallenges] = useState<ChallengeMatchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChallenges = useCallback(async (): Promise<void> => {
    try {
      const res = await fetchApi(`${API_URL}/challenge`);
      if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
      const data = (await res.json()) as { challenges: ChallengeMatchInfo[] };
      setChallenges(data.challenges);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '챌린지 목록 조회 실패';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchChallenges();
    const interval = setInterval(() => {
      void fetchChallenges();
    }, POLL_INTERVAL);
    return () => {
      clearInterval(interval);
    };
  }, [fetchChallenges]);

  return { challenges, loading, error, refetch: () => { void fetchChallenges(); } };
}
