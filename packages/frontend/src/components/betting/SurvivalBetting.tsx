import { useState, useEffect, useMemo } from 'react';
import { parseEther, formatEther } from 'viem';
import type { SessionId } from '@ghost-protocol/shared';
import { useSurvivalBet } from '../../hooks/useSurvivalBet.js';
import { useWallet } from '../../hooks/useWallet.js';
import { useSurvivalBettingStore } from '../../stores/survivalBettingStore.js';
import { SessionStatus } from '../../lib/contracts.js';
import type { SessionInfo, PredictionInfo } from '../../hooks/useSurvivalBet.js';

/**
 * SurvivalBetting 컴포넌트 Props
 */
interface SurvivalBettingProps {
  /** 세션 ID */
  sessionId: SessionId;
  /** 플레이어 이름 (optional) */
  playerName?: string;
  /** 현재 진행 중인 라운드 (live 관전 시, optional) */
  currentRound?: number;
}

/**
 * 모의 예측 분포 데이터 (초기 렌더링용)
 */
const mockDistribution = new Map<number, bigint>([
  [1, parseEther('0.5')],
  [2, parseEther('1.2')],
  [3, parseEther('2.0')],
  [4, parseEther('0.8')],
  [5, parseEther('0.3')],
  [6, parseEther('0.1')],
]);

/**
 * 서바이벌 예측 배팅 컴포넌트
 *
 * Survival Mode에서 플레이어의 생존 라운드를 예측하고 베팅하는 인터페이스를 제공합니다.
 * - 라운드 선택 그리드 (1-9, 9+)
 * - 라운드별 예측 분포 시각화
 * - 배당률 계산 및 미리보기
 * - 내 예측 현황 표시
 * - 정산 후 상금 청구
 *
 * @example
 * ```tsx
 * <SurvivalBetting
 *   sessionId="survival:123"
 *   playerName="PacManAI"
 *   currentRound={3}
 * />
 * ```
 */
export function SurvivalBetting({
  sessionId,
  playerName = 'Player',
  currentRound,
}: SurvivalBettingProps) {
  const { isConnected, balance } = useWallet();
  const {
    placePrediction,
    claimPayout,
    getSessionInfo,
    getPredictionDistribution,
    getMyPrediction,
    calculatePayout,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  } = useSurvivalBet();

  const {
    status: storeStatus,
    setStatus,
    setMyPrediction: setStoreMyPrediction,
  } = useSurvivalBettingStore();

  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [isClaimingPayout, setIsClaimingPayout] = useState(false);

  // sessionId를 bigint로 변환
  const numericSessionId = useMemo(() => {
    const parts = sessionId.split(':');
    return BigInt(parts[1] ?? (sessionId.replace(/\D/g, '') || '0'));
  }, [sessionId]);

  // 세션 정보 상태
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [predictionDistribution, setPredictionDistribution] = useState<bigint[] | null>(null);
  const [myPrediction, setMyPrediction] = useState<PredictionInfo | null>(null);
  const [myPayout, setMyPayout] = useState<bigint | null>(null);

  // 세션 정보 조회
  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      const [session, distribution, prediction, payout] = await Promise.all([
        getSessionInfo(numericSessionId),
        getPredictionDistribution(numericSessionId),
        getMyPrediction(numericSessionId),
        calculatePayout(numericSessionId),
      ]);

      if (mounted) {
        setSessionInfo(session);
        setPredictionDistribution(distribution);
        setMyPrediction(prediction);
        setMyPayout(payout);
      }
    };

    void fetchData();

    return () => {
      mounted = false;
    };
  }, [
    numericSessionId,
    getSessionInfo,
    getPredictionDistribution,
    getMyPrediction,
    calculatePayout,
  ]);

  // 세션 상태 동기화
  useEffect(() => {
    if (sessionInfo) {
      if (sessionInfo.status === SessionStatus.Betting) {
        setStatus('betting');
      } else if (sessionInfo.status === SessionStatus.Active) {
        setStatus('active');
      } else {
        setStatus('settled');
      }
    }
  }, [sessionInfo, setStatus]);

  // 트랜잭션 확인 완료 시 내 예측 업데이트
  useEffect(() => {
    if (isConfirmed && selectedRound !== null && betAmount !== '') {
      const amountWei = parseEther(betAmount);
      setStoreMyPrediction(selectedRound, amountWei);
      setBetAmount('');
      setSelectedRound(null);
    }
  }, [isConfirmed, selectedRound, betAmount, setStoreMyPrediction]);

  // MON 단위로 포맷 (wei -> MON)
  const formatMon = (wei: bigint): string => {
    return parseFloat(formatEther(wei)).toFixed(3);
  };

  // 총 풀 계산 (실제 분포 또는 모의 데이터 사용)
  const totalPool = useMemo(() => {
    const distribution = predictionDistribution ?? Array.from(mockDistribution.values());
    return distribution.reduce((sum: bigint, amount: bigint) => sum + amount, 0n);
  }, [predictionDistribution]);

  // 라운드별 배팅 금액 및 비율 계산
  const distributionData = useMemo(() => {
    const data: Array<{ round: number; amount: bigint; percentage: number }> = [];

    if (predictionDistribution) {
      // getPredictionDistribution은 배열 반환 (인덱스 0부터 시작)
      predictionDistribution.forEach((amount, index) => {
        if (amount > 0n) {
          const round = index;
          const percentage = totalPool > 0n ? (Number(amount) / Number(totalPool)) * 100 : 0;
          data.push({ round, amount, percentage });
        }
      });
    } else {
      // Mock 데이터는 Map 형태
      mockDistribution.forEach((amount, round) => {
        const percentage = totalPool > 0n ? (Number(amount) / Number(totalPool)) * 100 : 0;
        data.push({ round, amount, percentage });
      });
    }

    return data.sort((a, b) => a.round - b.round);
  }, [predictionDistribution, totalPool]);

  // 배당률 계산 (간소화된 pari-mutuel 방식)
  const calculateOdds = (round: number): number => {
    const roundData = distributionData.find((d) => d.round === round);
    if (!roundData || roundData.amount === 0n || totalPool === 0n) {
      return 1.0;
    }
    return Number(totalPool) / Number(roundData.amount);
  };

  // 예상 수익 계산
  const estimatedPayout = useMemo(() => {
    if (selectedRound === null || betAmount === '' || parseFloat(betAmount) <= 0) {
      return 0n;
    }
    const odds = calculateOdds(selectedRound);
    const amountWei = parseEther(betAmount);
    return BigInt(Math.floor(Number(amountWei) * odds));
  }, [selectedRound, betAmount, distributionData]);

  // 라운드 선택 핸들러
  const handleRoundSelect = (round: number): void => {
    if (storeStatus === 'betting' && !myPrediction) {
      setSelectedRound(round);
    }
  };

  // 배팅 제출 핸들러
  const handlePlaceBet = (): void => {
    if (!isConnected || selectedRound === null || betAmount === '') return;

    try {
      const amountWei = parseEther(betAmount);
      placePrediction(numericSessionId, selectedRound, amountWei);
    } catch (err) {
      console.error('예측 배팅 실패:', err);
    }
  };

  // 상금 청구 핸들러
  const handleClaimPayout = (): void => {
    if (myPayout === null || myPayout === 0n) return;

    try {
      setIsClaimingPayout(true);
      claimPayout(numericSessionId);
    } catch (err) {
      console.error('상금 청구 실패:', err);
    } finally {
      setIsClaimingPayout(false);
    }
  };

  // 그라디언트 색상 계산 (라운드에 따라 blue → pink)
  const getRoundGradientColor = (round: number): string => {
    const maxRound = 10;
    const ratio = Math.min(round / maxRound, 1);
    // ghost-blue (#3b82f6) → ghost-pink (#ec4899)
    const r = Math.floor(59 + (236 - 59) * ratio);
    const g = Math.floor(130 - (130 - 72) * ratio);
    const b = Math.floor(246 - (246 - 153) * ratio);
    return `rgb(${String(r)}, ${String(g)}, ${String(b)})`;
  };

  // 라운드가 이미 지나갔는지 확인
  const isRoundPassed = (round: number): boolean => {
    return currentRound !== undefined && round < currentRound;
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{
        backgroundColor: '#1a1a3e',
        borderLeft: '1px solid #2d2b6b',
      }}
    >
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-arena-border">
        <h2 className="text-xl font-bold text-white mb-1">🎯 서바이벌 예측 배팅</h2>
        <div className="text-sm text-gray-400">플레이어: {playerName}</div>
        <div className="text-xs text-gray-500">세션: {sessionId}</div>
      </div>

      {/* 스크롤 가능한 컨텐츠 영역 */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* 라운드 선택 그리드 */}
        {storeStatus === 'betting' && !myPrediction && (
          <div className="space-y-3">
            <div className="text-xs text-gray-400 uppercase tracking-wider">탈락 라운드 선택</div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((round) => (
                <button
                  key={round}
                  onClick={() => { handleRoundSelect(round); }}
                  disabled={isRoundPassed(round)}
                  className={`
                    px-3 py-2 rounded-lg font-semibold text-sm transition-all
                    ${
                      selectedRound === round
                        ? 'text-white neon-glow'
                        : 'text-gray-400 hover:text-white'
                    }
                    ${isRoundPassed(round) ? 'opacity-30 cursor-not-allowed' : ''}
                  `}
                  style={{
                    backgroundColor:
                      selectedRound === round ? getRoundGradientColor(round) : '#111128',
                    border: selectedRound === round ? 'none' : '1px solid #2d2b6b',
                  }}
                >
                  {round === 10 ? '9+' : `R${String(round)}`}
                </button>
              ))}
            </div>
            {currentRound !== undefined && (
              <div className="text-xs text-ghost-neon">현재 라운드: {currentRound}</div>
            )}
          </div>
        )}

        {/* 예측 분포 시각화 */}
        <div className="space-y-3">
          <div className="text-xs text-gray-400 uppercase tracking-wider">예측 분포</div>
          <div className="space-y-2">
            {distributionData.map(({ round, amount, percentage }) => (
              <div key={round} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-300">라운드 {round === 0 ? '9+' : String(round)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{formatMon(amount)} MON</span>
                    <span className="text-gray-500">{percentage.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-2 bg-arena-bg rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${String(percentage)}%`,
                      background: `linear-gradient(90deg, ${getRoundGradientColor(round)}, ${getRoundGradientColor(round + 1)})`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-lg mt-2" style={{ backgroundColor: '#111128' }}>
            <div className="text-xs text-gray-400">총 배팅 풀</div>
            <div className="text-lg font-bold text-white">{formatMon(totalPool)} MON</div>
          </div>
        </div>

        {/* 배팅 입력 폼 */}
        {!isConnected ? (
          <div className="p-4 rounded-lg text-center" style={{ backgroundColor: '#111128' }}>
            <p className="text-sm text-gray-400">배팅하려면 지갑을 연결하세요</p>
          </div>
        ) : myPrediction && myPrediction.amount > 0n ? (
          // 내 예측 표시
          <div className="space-y-3">
            <div className="text-xs text-gray-400 uppercase tracking-wider">내 예측</div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#111128' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">예측 라운드</span>
                <span className="text-lg font-bold text-ghost-neon">
                  라운드 {myPrediction.predictedRound === 0 ? '9+' : myPrediction.predictedRound}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">배팅 금액</span>
                <span className="text-lg font-bold text-white">
                  {formatMon(myPrediction.amount)} MON
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">상태</span>
                <span className="text-sm text-ghost-blue">
                  {storeStatus === 'betting'
                    ? '대기 중'
                    : storeStatus === 'active'
                      ? '게임 진행 중'
                      : '정산 완료'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          storeStatus === 'betting' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
                  배팅 금액 (MON)
                </label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => { setBetAmount(e.target.value); }}
                  placeholder="0.01"
                  step="0.01"
                  min="0.01"
                  max="10"
                  className="w-full px-4 py-3 rounded-lg bg-arena-bg border border-arena-border text-white focus:outline-none focus:border-ghost-violet transition-colors"
                />
                {balance !== undefined && (
                  <div className="text-xs text-gray-400 mt-1">잔액: {formatMon(balance)} MON</div>
                )}
              </div>

              {selectedRound !== null && betAmount !== '' && parseFloat(betAmount) > 0 && (
                <div className="p-3 rounded-lg space-y-2" style={{ backgroundColor: '#111128' }}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">예상 배당률</span>
                    <span className="text-sm font-bold text-ghost-neon">
                      {calculateOdds(selectedRound).toFixed(2)}x
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">예상 수익</span>
                    <span className="text-sm font-bold text-ghost-pink">
                      {formatMon(estimatedPayout)} MON
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={() => { handlePlaceBet(); }}
                disabled={betAmount === '' || selectedRound === null || isPending || isConfirming}
                className="w-full px-6 py-4 rounded-lg font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background:
                    betAmount !== '' && selectedRound !== null && !isPending && !isConfirming
                      ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
                      : '#2d2b6b',
                  boxShadow:
                    betAmount !== '' && selectedRound !== null && !isPending && !isConfirming
                      ? '0 0 20px rgba(139, 92, 246, 0.5)'
                      : 'none',
                }}
              >
                {isPending
                  ? '서명 대기 중...'
                  : isConfirming
                    ? '트랜잭션 확인 중...'
                    : '예측 배팅하기'}
              </button>

              {error && (
                <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/30">
                  <p className="text-xs text-red-400">{error.message}</p>
                </div>
              )}
            </div>
          )
        )}

        {/* 정산 결과 및 상금 청구 */}
        {storeStatus === 'settled' && sessionInfo && myPrediction && (
          <div className="space-y-3">
            <div className="text-xs text-gray-400 uppercase tracking-wider">정산 결과</div>
            <div className="p-4 rounded-lg space-y-3" style={{ backgroundColor: '#111128' }}>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">실제 탈락 라운드</span>
                <span className="text-lg font-bold text-ghost-neon">
                  라운드 {sessionInfo.eliminationRound}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">내 예측</span>
                <span className="text-lg font-bold text-white">
                  라운드 {myPrediction.predictedRound === 0 ? '9+' : myPrediction.predictedRound}
                </span>
              </div>
              {myPrediction.predictedRound === sessionInfo.eliminationRound ? (
                <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/30">
                  <p className="text-sm text-green-400 font-semibold">✅ 정확히 맞춤!</p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-500/30">
                  <p className="text-sm text-yellow-400">
                    차이: {Math.abs(myPrediction.predictedRound - sessionInfo.eliminationRound)}{' '}
                    라운드
                  </p>
                </div>
              )}

              {myPayout !== null && myPayout > 0n && !myPrediction.claimed && (
                <>
                  <div className="flex justify-between items-center pt-2 border-t border-arena-border">
                    <span className="text-sm text-gray-400">보상</span>
                    <span className="text-xl font-bold text-ghost-pink">
                      {formatMon(myPayout)} MON
                    </span>
                  </div>
                  <button
                    onClick={() => { handleClaimPayout(); }}
                    disabled={isClaimingPayout || isPending || isConfirming}
                    className="w-full px-6 py-3 rounded-lg font-bold text-white transition-all disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                      boxShadow: '0 0 20px rgba(236, 72, 153, 0.5)',
                    }}
                  >
                    {isClaimingPayout || isPending || isConfirming ? '처리 중...' : '상금 수령하기'}
                  </button>
                </>
              )}

              {myPrediction.claimed && (
                <div className="p-3 rounded-lg bg-gray-900/50 border border-gray-700">
                  <p className="text-sm text-gray-400 text-center">이미 상금을 수령했습니다</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 배팅 규칙 안내 */}
        <div
          className="p-4 rounded-lg text-xs text-gray-400 space-y-2"
          style={{ backgroundColor: '#111128' }}
        >
          <div className="font-semibold text-gray-300 mb-2">배팅 규칙</div>
          <ul className="space-y-1 list-disc list-inside">
            <li>플레이어가 탈락할 라운드를 예측합니다</li>
            <li>정확히 맞추면 배당금을 받습니다</li>
            <li>최소 배팅: 0.01 MON</li>
            <li>세션당 1회만 예측 가능</li>
            <li>배당률은 pari-mutuel 방식으로 계산됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
