import { useState } from 'react';
import { formatEther } from 'viem';
import type { BetSide, MatchId } from '@ghost-protocol/shared';
import { useWagerPool } from '../../hooks/useWagerPool.js';
import { useSurvivalBet } from '../../hooks/useSurvivalBet.js';
import { useWallet } from '../../hooks/useWallet.js';
import { useBettingStore } from '../../stores/bettingStore.js';
import type { BettingHistoryItem } from '../../stores/bettingStore.js';

type TabType = 'arena' | 'survival' | 'claimable';

/**
 * 배팅 내역 및 상금 수령 컴포넌트
 *
 * 아레나 배팅, 서바이벌 예측, 수령 가능한 상금을 탭으로 구분하여 표시하고
 * 각 항목에서 직접 상금을 청구할 수 있습니다.
 */
export function PayoutClaim() {
  const [activeTab, setActiveTab] = useState<TabType>('arena');
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const { isConnected } = useWallet();
  const wagerPool = useWagerPool();
  const survivalBet = useSurvivalBet();
  const { bettingHistory, claimablePayouts, markClaimed } = useBettingStore();

  // 모의 서바이벌 예측 데이터 (향후 survivalStore에서 가져올 예정)
  const survivalPredictions: Array<{
    sessionId: string;
    predictedRound: number;
    amount: number;
    actualRound: number | null;
    accuracy: number | null;
    payout: number | null;
    result: 'won' | 'lost' | 'pending';
    claimedAt: number | null;
  }> = [
    {
      sessionId: '1',
      predictedRound: 15,
      amount: 0.3,
      actualRound: 15,
      accuracy: 100,
      payout: 0.6,
      result: 'won' as const,
      claimedAt: null,
    },
    {
      sessionId: '2',
      predictedRound: 20,
      amount: 0.5,
      actualRound: 18,
      accuracy: 90,
      payout: 0.4,
      result: 'lost' as const,
      claimedAt: null,
    },
    {
      sessionId: '3',
      predictedRound: 10,
      amount: 0.2,
      actualRound: null,
      accuracy: null,
      payout: null,
      result: 'pending' as const,
      claimedAt: null,
    },
  ];

  // 모의 배팅 이력 데이터 (bettingHistory가 비어있을 때 사용)
  const mockBettingHistory: BettingHistoryItem[] =
    bettingHistory.length > 0
      ? bettingHistory
      : [
          {
            matchId: '001' as MatchId,
            side: 'agentA' as BetSide,
            amount: 500000000000000000n, // 0.5 MON
            result: 'won',
            payout: 850000000000000000n, // 0.85 MON
            claimedAt: null,
            timestamp: Date.now() - 3600000,
          },
          {
            matchId: '002' as MatchId,
            side: 'agentB' as BetSide,
            amount: 300000000000000000n, // 0.3 MON
            result: 'lost',
            payout: null,
            claimedAt: null,
            timestamp: Date.now() - 7200000,
          },
          {
            matchId: '003' as MatchId,
            side: 'agentA' as BetSide,
            amount: 1000000000000000000n, // 1.0 MON
            result: 'pending',
            payout: null,
            claimedAt: null,
            timestamp: Date.now() - 1800000,
          },
        ];

  /**
   * 아레나 배팅 상금 청구
   */
  const handleClaimArena = (matchId: string) => {
    setClaimingId(matchId);
    try {
      wagerPool.claimWinnings(BigInt(matchId));
      // 트랜잭션이 확인되면 markClaimed 호출 (useEffect로 처리 권장)
      if (wagerPool.isConfirmed) {
        markClaimed(matchId as MatchId);
      }
    } catch (error) {
      console.error('아레나 상금 청구 실패:', error);
    } finally {
      setClaimingId(null);
    }
  };

  /**
   * 서바이벌 예측 상금 청구
   */
  const handleClaimSurvival = (sessionId: string) => {
    setClaimingId(sessionId);
    try {
      survivalBet.claimPayout(BigInt(sessionId));
      // 트랜잭션이 확인되면 survivalStore에 반영 (향후 구현)
    } catch (error) {
      console.error('서바이벌 상금 청구 실패:', error);
    } finally {
      setClaimingId(null);
    }
  };

  /**
   * 전체 상금 일괄 청구
   */
  const handleClaimAll = async () => {
    const claimableItems = Array.from(claimablePayouts.entries());
    for (const [matchId] of claimableItems) {
      handleClaimArena(matchId);
      // 각 트랜잭션 사이에 약간의 지연 추가
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  };

  /**
   * 총 수령 가능 금액 계산
   */
  const totalClaimable = Array.from(claimablePayouts.values()).reduce(
    (sum, amount) => sum + amount,
    0n,
  );

  /**
   * 지갑 미연결 상태 화면
   */
  if (!isConnected) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg bg-arena-card p-8">
        <div className="text-center">
          <p className="text-lg text-gray-400">지갑을 연결하면 배팅 내역을 볼 수 있습니다.</p>
          <p className="mt-2 text-sm text-gray-500">우측 상단의 지갑 연결 버튼을 클릭하세요.</p>
        </div>
      </div>
    );
  }

  /**
   * 탭 버튼 렌더링
   */
  const TabButton = ({ tab, label }: { tab: TabType; label: string }) => (
    <button
      onClick={() => { setActiveTab(tab); }}
      className={`rounded-lg px-6 py-3 text-sm font-semibold transition-all ${
        activeTab === tab
          ? 'bg-gradient-to-r from-ghost-violet to-ghost-pink text-white shadow-lg shadow-ghost-violet/30'
          : 'bg-arena-surface text-gray-400 hover:bg-arena-surface/80 hover:text-ghost-violet'
      }`}
    >
      {label}
    </button>
  );

  /**
   * 결과 배지 렌더링
   */
  const ResultBadge = ({ result }: { result: 'won' | 'lost' | 'pending' | 'refunded' }) => {
    const styles = {
      won: 'bg-ghost-neon/20 text-ghost-neon border-ghost-neon',
      lost: 'bg-red-500/20 text-red-400 border-red-500',
      pending: 'bg-ghost-violet/20 text-ghost-violet border-ghost-violet animate-pulse',
      refunded: 'bg-gray-500/20 text-gray-400 border-gray-500',
    };

    const labels = {
      won: '승리 ✓',
      lost: '패배 ✗',
      pending: '대기 중...',
      refunded: '환불됨',
    };

    return (
      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles[result]}`}>
        {labels[result]}
      </span>
    );
  };

  /**
   * 아레나 배팅 탭 콘텐츠
   */
  const ArenaTab = () => {
    if (mockBettingHistory.length === 0) {
      return (
        <div className="py-12 text-center">
          <p className="text-gray-400">아직 배팅 내역이 없습니다.</p>
          <p className="mt-2 text-sm text-gray-500">아레나에서 배팅해보세요!</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {mockBettingHistory.map((bet, index) => (
          <div
            key={`${bet.matchId}-${String(index)}`}
            className={`rounded-lg border p-4 transition-all ${
              bet.result === 'won'
                ? 'border-ghost-neon bg-ghost-neon/5 shadow-sm shadow-ghost-neon/20'
                : bet.result === 'lost'
                  ? 'border-gray-700 bg-gray-800/30'
                  : 'border-ghost-violet bg-ghost-violet/5'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-gray-400">매치 #{bet.matchId}</span>
                  <span className="text-sm text-gray-300">
                    {bet.side === 'agentA' ? 'Agent A' : 'Agent B'} 선택
                  </span>
                  <span className="text-sm font-semibold text-ghost-neon">
                    {formatEther(bet.amount)} MON
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <ResultBadge result={bet.result} />
                  {bet.payout && (
                    <span className="text-sm text-gray-300">
                      배당금:{' '}
                      <span className="font-semibold text-ghost-neon">
                        {formatEther(bet.payout)} MON
                      </span>
                    </span>
                  )}
                  {bet.claimedAt && (
                    <span className="text-xs text-gray-500">
                      수령 완료 ({new Date(bet.claimedAt).toLocaleDateString()})
                    </span>
                  )}
                </div>
              </div>
              {bet.result === 'won' && bet.claimedAt === null && (
                <button
                  onClick={() => { handleClaimArena(bet.matchId as string); }}
                  disabled={
                    claimingId === bet.matchId || wagerPool.isPending || wagerPool.isConfirming
                  }
                  className="rounded-lg bg-gradient-to-r from-ghost-violet to-ghost-pink px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-ghost-violet/30 disabled:opacity-50"
                >
                  {claimingId === bet.matchId || wagerPool.isPending || wagerPool.isConfirming
                    ? '수령 중...'
                    : '수령하기'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  /**
   * 서바이벌 예측 탭 콘텐츠
   */
  const SurvivalTab = () => {
    if (survivalPredictions.length === 0) {
      return (
        <div className="py-12 text-center">
          <p className="text-gray-400">아직 예측 내역이 없습니다.</p>
          <p className="mt-2 text-sm text-gray-500">서바이벌 모드에서 예측해보세요!</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {survivalPredictions.map((prediction) => (
          <div
            key={prediction.sessionId}
            className={`rounded-lg border p-4 transition-all ${
              prediction.result === 'won'
                ? 'border-ghost-neon bg-ghost-neon/5 shadow-sm shadow-ghost-neon/20'
                : prediction.result === 'lost'
                  ? 'border-gray-700 bg-gray-800/30'
                  : 'border-ghost-violet bg-ghost-violet/5'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-gray-400">
                    세션 #{prediction.sessionId}
                  </span>
                  <span className="text-sm text-gray-300">
                    라운드 {prediction.predictedRound} 예측
                  </span>
                  <span className="text-sm font-semibold text-ghost-neon">
                    {prediction.amount} MON
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <ResultBadge result={prediction.result} />
                  {prediction.actualRound !== null && (
                    <span className="text-sm text-gray-300">
                      실제: 라운드 {prediction.actualRound}
                    </span>
                  )}
                  {prediction.accuracy !== null && (
                    <span className="text-sm text-gray-400">정확도: {prediction.accuracy}%</span>
                  )}
                  {prediction.payout !== null && (
                    <span className="text-sm text-gray-300">
                      배당금:{' '}
                      <span className="font-semibold text-ghost-neon">{prediction.payout} MON</span>
                    </span>
                  )}
                  {prediction.claimedAt !== null && (
                    <span className="text-xs text-gray-500">
                      수령 완료 ({new Date(prediction.claimedAt).toLocaleDateString()})
                    </span>
                  )}
                </div>
              </div>
              {prediction.result === 'won' && prediction.claimedAt === null && (
                <button
                  onClick={() => { handleClaimSurvival(prediction.sessionId); }}
                  disabled={
                    claimingId === prediction.sessionId ||
                    survivalBet.isPending ||
                    survivalBet.isConfirming
                  }
                  className="rounded-lg bg-gradient-to-r from-ghost-violet to-ghost-pink px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-ghost-violet/30 disabled:opacity-50"
                >
                  {claimingId === prediction.sessionId ||
                  survivalBet.isPending ||
                  survivalBet.isConfirming
                    ? '수령 중...'
                    : '수령하기'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  /**
   * 수령 가능 탭 콘텐츠
   */
  const ClaimableTab = () => {
    const claimableItems = Array.from(claimablePayouts.entries());

    if (claimableItems.length === 0) {
      return (
        <div className="py-12 text-center">
          <p className="text-gray-400">수령할 상금이 없습니다.</p>
          <p className="mt-2 text-sm text-gray-500">배팅에서 승리하면 여기에 표시됩니다.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* 총 수령 가능 금액 */}
        <div className="rounded-lg border border-ghost-neon bg-ghost-neon/10 p-6 shadow-lg shadow-ghost-neon/20">
          <div className="text-center">
            <p className="text-sm text-gray-400">총 수령 가능</p>
            <p className="mt-2 text-4xl font-bold text-ghost-neon neon-text">
              {formatEther(totalClaimable)} MON
            </p>
          </div>
        </div>

        {/* 수령 가능 항목 목록 */}
        <div className="space-y-3">
          {claimableItems.map(([matchId, amount]) => (
            <div
              key={matchId}
              className="flex items-center justify-between rounded-lg border border-ghost-violet bg-arena-surface p-4"
            >
              <div className="flex items-center gap-4">
                <span className="text-sm font-mono text-gray-400">매치 #{matchId}</span>
                <span className="text-lg font-semibold text-ghost-neon">
                  {formatEther(amount)} MON
                </span>
              </div>
              <button
                onClick={() => { handleClaimArena(matchId); }}
                disabled={claimingId === matchId || wagerPool.isPending || wagerPool.isConfirming}
                className="rounded-lg bg-gradient-to-r from-ghost-violet to-ghost-pink px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-ghost-violet/30 disabled:opacity-50"
              >
                {claimingId === matchId || wagerPool.isPending || wagerPool.isConfirming
                  ? '수령 중...'
                  : '수령'}
              </button>
            </div>
          ))}
        </div>

        {/* 전체 수령 버튼 */}
        {claimableItems.length > 1 && (
          <button
            onClick={() => { void handleClaimAll(); }}
            disabled={wagerPool.isPending || wagerPool.isConfirming}
            className="w-full rounded-lg bg-gradient-to-r from-ghost-violet to-ghost-pink py-3 text-sm font-bold text-white transition-all hover:shadow-xl hover:shadow-ghost-violet/40 disabled:opacity-50"
          >
            {wagerPool.isPending || wagerPool.isConfirming ? '수령 중...' : '전체 수령하기'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">💰</span>
        <h2 className="text-2xl font-bold text-white neon-text">내 배팅 & 상금 수령</h2>
      </div>

      {/* 탭 버튼 */}
      <div className="flex gap-3">
        <TabButton tab="arena" label="아레나 배팅" />
        <TabButton tab="survival" label="서바이벌 예측" />
        <TabButton tab="claimable" label="수령 가능" />
      </div>

      {/* 탭 콘텐츠 */}
      <div className="rounded-lg bg-arena-card p-6">
        {activeTab === 'arena' && <ArenaTab />}
        {activeTab === 'survival' && <SurvivalTab />}
        {activeTab === 'claimable' && <ClaimableTab />}
      </div>

      {/* 트랜잭션 상태 알림 */}
      {(wagerPool.isPending || survivalBet.isPending) && (
        <div className="rounded-lg border border-ghost-violet bg-ghost-violet/10 p-4 text-center">
          <p className="text-sm text-gray-300">트랜잭션을 처리하고 있습니다...</p>
        </div>
      )}
      {(wagerPool.isConfirmed || survivalBet.isConfirmed) && (
        <div className="rounded-lg border border-ghost-neon bg-ghost-neon/10 p-4 text-center">
          <p className="text-sm text-ghost-neon">상금 수령이 완료되었습니다! ✓</p>
        </div>
      )}
      {(wagerPool.error !== null || survivalBet.error !== null) && (
        <div className="rounded-lg border border-red-500 bg-red-500/10 p-4 text-center">
          <p className="text-sm text-red-400">
            오류가 발생했습니다: {wagerPool.error?.message ?? survivalBet.error?.message ?? '알 수 없는 오류'}
          </p>
        </div>
      )}
    </div>
  );
}
