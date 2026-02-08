import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import type { BetSide, MatchId } from '@ghost-protocol/shared';
import { useBettingStore } from '../../stores/bettingStore.js';
import { useWagerPool } from '../../hooks/useWagerPool.js';
import { useWallet } from '../../hooks/useWallet.js';
import { useAudio } from '../../hooks/useAudio.js';

interface BettingPanelProps {
  /** 매치 ID */
  matchId: MatchId;
  /** Agent A 이름 */
  agentAName: string;
  /** Agent B 이름 */
  agentBName: string;
  /** 배팅 마감 시각 (Unix timestamp ms, optional) */
  bettingDeadline?: number;
}

/**
 * 배팅 패널 컴포넌트
 * 매치 관전 페이지 우측에 표시되는 배팅 인터페이스
 */
export function BettingPanel({
  matchId,
  agentAName,
  agentBName,
  bettingDeadline,
}: BettingPanelProps) {
  const { isConnected } = useAccount();
  const {
    pool,
    myBet,
    isLocked,
    settlement,
    notification,
    addBetToHistory,
    setMyBet,
    clearNotification,
    clearSettlement,
  } = useBettingStore();
  const { balance } = useWallet();
  const { placeBet, claimWinnings, txHash, isPending, isConfirming, isConfirmed, error } =
    useWagerPool();
  const { sfx } = useAudio();

  const [betAmount, setBetAmount] = useState('');
  const [selectedSide, setSelectedSide] = useState<BetSide | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // 배팅 마감 카운트다운 타이머
  useEffect(() => {
    if (!bettingDeadline) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = (): void => {
      const now = Date.now();
      const remaining = Math.max(0, bettingDeadline - now);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [bettingDeadline]);

  // 트랜잭션 확인 완료 시 상태 업데이트
  useEffect(() => {
    if (isConfirmed && selectedSide !== null && betAmount !== '') {
      const amountWei = parseEther(betAmount);
      setMyBet(selectedSide, amountWei);
      addBetToHistory(matchId, selectedSide, amountWei);
      setBetAmount('');
      setSelectedSide(null);
      // 배팅 확인 사운드는 이미 handlePlaceBet에서 재생
    }
  }, [isConfirmed, selectedSide, betAmount, matchId, setMyBet, addBetToHistory]);

  // 정산 결과 사운드
  useEffect(() => {
    if (!settlement) return;

    if (settlement.isWin) {
      sfx.playBetResultWin();
    } else {
      sfx.playBetResultLoss();
    }
  }, [settlement, sfx]);

  // MON 단위로 포맷 (wei -> MON)
  const formatMon = (wei: bigint): string => {
    return parseFloat(formatEther(wei)).toFixed(3);
  };

  // 배팅 상태 텍스트
  const getStatusText = (): string => {
    if (timeRemaining !== null && timeRemaining === 0) return '배팅 마감';
    if (isLocked) return '배팅 잠금';
    if (pool === null) return '로딩 중...';
    return '배팅 접수 중';
  };

  // 배팅 상태 색상
  const getStatusColor = (): string => {
    if (timeRemaining !== null && timeRemaining === 0) return '#ef4444';
    if (isLocked) return '#ef4444';
    if (pool === null) return '#6b7280';
    return '#22d3ee';
  };

  // 시간 포맷 (밀리초 -> MM:SS)
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // 배팅 제출 핸들러
  const handlePlaceBet = (): void => {
    if (!isConnected || selectedSide === null || betAmount === '') return;

    try {
      const amountWei = parseEther(betAmount);
      const side = selectedSide === 'agentA' ? 0 : 1;
      const numericMatchId = Number(matchId.split(':')[1] ?? (matchId.replace(/\D/g, '') || '0'));
      placeBet(BigInt(numericMatchId), side, amountWei);
      sfx.playBetPlaced();
    } catch (err) {
      console.error('배팅 실패:', err);
    }
  };

  // 상금 청구 핸들러
  const handleClaimWinnings = (): void => {
    if (settlement === null) return;

    try {
      const numericMatchId = Number(matchId.split(':')[1] ?? (matchId.replace(/\D/g, '') || '0'));
      claimWinnings(BigInt(numericMatchId));
      sfx.playPayoutClaimed();
    } catch (err) {
      console.error('상금 청구 실패:', err);
    }
  };

  // 배팅 가능 여부
  const isBettingDisabled = isLocked || (timeRemaining !== null && timeRemaining === 0);

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
        <h2 className="text-xl font-bold text-white mb-2">배팅</h2>
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: getStatusColor() }}
          />
          <span className="text-sm" style={{ color: getStatusColor() }}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* 스크롤 가능한 컨텐츠 영역 */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* 알림 토스트 */}
        {notification && (
          <div
            className={`p-4 rounded-lg border-l-4 flex items-center gap-3 animate-slide-in ${
              notification.type === 'locked'
                ? 'bg-yellow-900/20 border-yellow-500'
                : notification.type === 'claimed'
                  ? 'bg-green-900/20 border-green-500'
                  : 'bg-blue-900/20 border-blue-500'
            }`}
          >
            <div className="flex-shrink-0">
              {notification.type === 'locked' && <span className="text-xl">🔒</span>}
              {notification.type === 'claimed' && <span className="text-xl">✅</span>}
              {notification.type === 'settled' && <span className="text-xl">🎯</span>}
            </div>
            <p className="text-sm text-white flex-1">{notification.message}</p>
            <button
              onClick={clearNotification}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* 배팅 마감 카운트다운 */}
        {timeRemaining !== null && timeRemaining > 0 && (
          <div
            className={`p-4 rounded-lg text-center ${
              timeRemaining < 30000 ? 'neon-glow animate-pulse' : ''
            }`}
            style={{
              backgroundColor: timeRemaining < 30000 ? '#1a0a2e' : '#111128',
              border: timeRemaining < 30000 ? '1px solid #8b5cf6' : 'none',
            }}
          >
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">남은 시간</div>
            <div
              className="text-3xl font-display font-bold"
              style={{
                color: timeRemaining < 30000 ? '#8b5cf6' : '#22d3ee',
              }}
            >
              {formatTime(timeRemaining)}
            </div>
          </div>
        )}
        {/* 배당률 표시 */}
        {pool && (
          <div className="space-y-3">
            <div className="text-xs text-gray-400 uppercase tracking-wider">현재 배당률</div>

            {/* Agent A 배당률 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-white">{agentAName}</span>
                <span className="text-lg font-bold text-ghost-blue">{pool.oddsA.toFixed(2)}x</span>
              </div>
              <div className="h-2 bg-arena-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-ghost-blue transition-all duration-300"
                  style={{
                    width: `${String((Number(pool.sideA) / Number(pool.totalPool)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Agent B 배당률 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-white">{agentBName}</span>
                <span className="text-lg font-bold text-ghost-pink">{pool.oddsB.toFixed(2)}x</span>
              </div>
              <div className="h-2 bg-arena-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-ghost-pink transition-all duration-300"
                  style={{
                    width: `${String((Number(pool.sideB) / Number(pool.totalPool)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 총 배팅 풀 */}
        {pool && (
          <div className="p-4 rounded-lg" style={{ backgroundColor: '#111128' }}>
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">총 배팅 풀</div>
            <div className="text-2xl font-bold text-white">{formatMon(pool.totalPool)} MON</div>
            <div className="text-xs text-gray-400 mt-1">{pool.betCount}개 배팅</div>
          </div>
        )}

        {/* 정산 결과 오버레이 */}
        {settlement && (
          <div
            className={`p-6 rounded-lg border-2 ${
              settlement.isWin
                ? 'bg-green-900/20 border-green-500 neon-glow'
                : 'bg-gray-900/20 border-gray-600'
            }`}
          >
            <div className="text-center space-y-4">
              <div className="text-4xl">{settlement.isWin ? '🎉' : '😢'}</div>
              <div>
                <div className="text-xl font-bold text-white mb-2">
                  {settlement.isWin ? '축하합니다!' : '아쉽습니다'}
                </div>
                {settlement.isWin && settlement.myPayout !== null && (
                  <div className="text-2xl font-bold text-green-400">
                    {formatMon(settlement.myPayout)} MON 획득!
                  </div>
                )}
                {!settlement.isWin && (
                  <div className="text-sm text-gray-400">다음 기회를 노려보세요</div>
                )}
              </div>
              {settlement.isWin && settlement.myPayout !== null && (
                <button
                  onClick={() => { handleClaimWinnings(); }}
                  disabled={isPending || isConfirming}
                  className="w-full px-6 py-3 rounded-lg font-bold text-white transition-all disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)',
                  }}
                >
                  {isPending || isConfirming ? '처리 중...' : '상금 수령'}
                </button>
              )}
              <button
                onClick={clearSettlement}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {/* 배팅 입력 폼 */}
        {!isConnected ? (
          <div className="p-4 rounded-lg text-center" style={{ backgroundColor: '#111128' }}>
            <p className="text-sm text-gray-400">배팅하려면 지갑을 연결하세요</p>
          </div>
        ) : myBet ? (
          <div className="p-4 rounded-lg" style={{ backgroundColor: '#111128' }}>
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">내 배팅</div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-white">
                {myBet.side === 'agentA' ? agentAName : agentBName}
              </span>
              <span className="text-lg font-bold text-ghost-neon">
                {formatMon(myBet.amount)} MON
              </span>
            </div>
          </div>
        ) : (
          !isBettingDisabled && (
            <div className="space-y-4">
              {/* 지갑 잔액 표시 */}
              {balance !== undefined && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">잔액:</span>
                  <span className="text-white font-semibold">{formatMon(balance)} MON</span>
                </div>
              )}

              {/* 트랜잭션 상태 표시 */}
              {(isPending || isConfirming || isConfirmed || error) && (
                <div
                  className={`p-4 rounded-lg border ${
                    error
                      ? 'bg-red-900/20 border-red-500'
                      : isConfirmed
                        ? 'bg-green-900/20 border-green-500'
                        : 'bg-blue-900/20 border-blue-500'
                  }`}
                >
                  {isPending && (
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span className="text-sm text-white">지갑에서 서명 중...</span>
                    </div>
                  )}
                  {isConfirming && !isPending && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span className="text-sm text-white">트랜잭션 전송 중...</span>
                      </div>
                      {txHash && (
                        <a
                          href={`https://explorer.testnet.monad.xyz/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 underline break-all"
                        >
                          {txHash}
                        </a>
                      )}
                    </div>
                  )}
                  {isConfirmed && !isPending && !isConfirming && (
                    <div className="flex items-center gap-3">
                      <span className="text-xl">✅</span>
                      <span className="text-sm text-white font-semibold">배팅 완료!</span>
                    </div>
                  )}
                  {error && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">❌</span>
                        <span className="text-sm text-white">트랜잭션 실패</span>
                      </div>
                      <p className="text-xs text-red-300">{error.message}</p>
                      <button
                        onClick={() => { handlePlaceBet(); }}
                        className="text-xs text-blue-400 hover:text-blue-300 underline"
                      >
                        재시도
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
                  배팅 금액 (MON)
                </label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => { setBetAmount(e.target.value); }}
                  placeholder="0.001"
                  step="0.001"
                  min="0.001"
                  max="10"
                  disabled={isPending || isConfirming}
                  className="w-full px-4 py-3 rounded-lg bg-arena-bg border border-arena-border text-white focus:outline-none focus:border-ghost-violet transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
                  배팅 대상 선택
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setSelectedSide('agentA'); }}
                    disabled={isPending || isConfirming}
                    className={`px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedSide === 'agentA'
                        ? 'bg-ghost-blue text-white neon-glow'
                        : 'bg-arena-bg text-gray-400 hover:text-white hover:border-ghost-blue'
                    }`}
                    style={{
                      border: selectedSide === 'agentA' ? 'none' : '1px solid #2d2b6b',
                    }}
                  >
                    {agentAName}
                  </button>
                  <button
                    onClick={() => { setSelectedSide('agentB'); }}
                    disabled={isPending || isConfirming}
                    className={`px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedSide === 'agentB'
                        ? 'bg-ghost-pink text-white neon-glow'
                        : 'bg-arena-bg text-gray-400 hover:text-white hover:border-ghost-pink'
                    }`}
                    style={{
                      border: selectedSide === 'agentB' ? 'none' : '1px solid #2d2b6b',
                    }}
                  >
                    {agentBName}
                  </button>
                </div>
              </div>

              <button
                onClick={() => { handlePlaceBet(); }}
                disabled={betAmount === '' || selectedSide === null || isPending || isConfirming}
                className="w-full px-6 py-4 rounded-lg font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background:
                    betAmount !== '' && selectedSide !== null && !isPending && !isConfirming
                      ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
                      : '#2d2b6b',
                  boxShadow:
                    betAmount !== '' && selectedSide !== null && !isPending && !isConfirming
                      ? '0 0 20px rgba(139, 92, 246, 0.5)'
                      : 'none',
                }}
              >
                {isPending || isConfirming ? '처리 중...' : '배팅하기'}
              </button>
            </div>
          )
        )}

        {/* 배팅 마감 안내 */}
        {isBettingDisabled && !myBet && isConnected && (
          <div className="p-4 rounded-lg text-center" style={{ backgroundColor: '#111128' }}>
            <p className="text-sm text-gray-400">배팅이 마감되었습니다</p>
          </div>
        )}

        {/* 배팅 규칙 안내 */}
        <div
          className="p-4 rounded-lg text-xs text-gray-400 space-y-2"
          style={{ backgroundColor: '#111128' }}
        >
          <div className="font-semibold text-gray-300 mb-2">배팅 규칙</div>
          <ul className="space-y-1 list-disc list-inside">
            <li>최소 배팅: 0.001 MON</li>
            <li>최대 배팅: 10 MON</li>
            <li>매치당 1회만 배팅 가능</li>
            <li>배팅 잠금 후 취소 불가</li>
            <li>플랫폼 수수료: 5%</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
