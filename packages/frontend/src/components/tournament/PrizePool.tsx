/** 상금 풀 디스플레이 컴포넌트 */

interface PrizePoolProps {
  /** 총 상금 풀 (wei) */
  readonly totalPool: bigint;
  /** 브래킷 사이즈 (8 또는 16) */
  readonly bracketSize: 8 | 16;
}

/** 상금 분배 비율 (8강 기준) */
const PRIZE_DISTRIBUTION_8 = {
  first: 50, // 50%
  second: 30, // 30%
  third: 20, // 20% (준결승 탈락 2팀 분배)
} as const;

/** 상금 분배 비율 (16강 기준) */
const PRIZE_DISTRIBUTION_16 = {
  first: 40, // 40%
  second: 25, // 25%
  third: 15, // 15% (준결승 탈락 2팀)
  fourth: 20, // 20% (8강 탈락 4팀 분배)
} as const;

/**
 * 상금 풀 표시 컴포넌트
 * - 총 상금과 순위별 분배 비율 표시
 * - 네온 글로우 효과
 */
export function PrizePool({ totalPool, bracketSize }: PrizePoolProps) {
  const totalMon = Number(totalPool) / 1e18;
  const distribution = bracketSize === 8 ? PRIZE_DISTRIBUTION_8 : PRIZE_DISTRIBUTION_16;

  const calculatePrize = (percentage: number): string => {
    return ((totalMon * percentage) / 100).toFixed(2);
  };

  return (
    <div className="rounded-lg border border-ghost-violet/30 bg-arena-card p-6">
      {/* 트로피 아이콘과 타이틀 */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-3xl">🏆</span>
        <h3 className="text-lg font-bold text-white">상금 풀</h3>
      </div>

      {/* 총 상금 */}
      <div className="mb-6 rounded-lg bg-gradient-to-r from-ghost-violet/20 to-ghost-neon/20 p-4">
        <p className="mb-1 text-xs text-gray-400">총 상금</p>
        <p
          className="neon-text text-2xl font-bold text-ghost-neon"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {totalMon.toFixed(2)} MON
        </p>
      </div>

      {/* 순위별 분배 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-md bg-ghost-violet/10 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🥇</span>
            <span className="text-sm text-gray-300">1위</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-ghost-neon">
              {calculatePrize(distribution.first)} MON
            </p>
            <p className="text-xs text-gray-500">{distribution.first}%</p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md bg-ghost-blue/10 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🥈</span>
            <span className="text-sm text-gray-300">2위</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-ghost-blue">
              {calculatePrize(distribution.second)} MON
            </p>
            <p className="text-xs text-gray-500">{distribution.second}%</p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md bg-ghost-pink/10 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🥉</span>
            <span className="text-sm text-gray-300">3위</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-ghost-pink">
              {calculatePrize(distribution.third)} MON
            </p>
            <p className="text-xs text-gray-500">{distribution.third}%</p>
          </div>
        </div>

        {'fourth' in distribution && (
          <div className="flex items-center justify-between rounded-md bg-gray-500/10 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎖️</span>
              <span className="text-sm text-gray-300">4위</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-400">
                {calculatePrize(distribution.fourth)} MON
              </p>
              <p className="text-xs text-gray-500">{distribution.fourth}%</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
