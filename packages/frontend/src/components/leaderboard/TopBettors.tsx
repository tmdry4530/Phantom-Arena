import { useState } from 'react';

/** 베터 정보 인터페이스 */
interface BettorInfo {
  readonly address: string;
  readonly totalWagered: number;
  readonly winRate: number;
  readonly biggestWin: number;
  readonly netProfit: number;
}

/** 순위 뱃지 컴포넌트 */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-[#ffd700] to-[#ffb800] px-3 py-1 text-sm font-bold text-gray-900">
        👑 {rank}
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-[#c0c0c0] to-[#a0a0a0] px-3 py-1 text-sm font-bold text-gray-900">
        🥈 {rank}
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-[#cd7f32] to-[#b87333] px-3 py-1 text-sm font-bold text-gray-900">
        🥉 {rank}
      </span>
    );
  }
  return <span className="px-3 py-1 text-sm font-semibold text-gray-400">{rank}</span>;
}

/** 승률 색상 계산 */
function getWinRateColor(winRate: number): string {
  if (winRate >= 60) return 'text-green-400';
  if (winRate >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

/** 수익 색상 계산 */
function getProfitColor(profit: number): string {
  return profit >= 0 ? 'text-green-400' : 'text-red-400';
}

/** MON 포맷팅 */
function formatMON(value: number): string {
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MON`;
}

/** 모의 베터 데이터 생성 */
function generateMockBettors(): BettorInfo[] {
  const bettors: BettorInfo[] = [
    {
      address: '0x1a2b...3c4d',
      totalWagered: 125.5,
      winRate: 68,
      biggestWin: 15.2,
      netProfit: 45.3,
    },
    {
      address: '0x5e6f...7a8b',
      totalWagered: 98.2,
      winRate: 62,
      biggestWin: 12.1,
      netProfit: 28.7,
    },
    {
      address: '0x9c0d...1e2f',
      totalWagered: 87.6,
      winRate: 59,
      biggestWin: 10.8,
      netProfit: 18.4,
    },
    { address: '0x3g4h...5i6j', totalWagered: 76.3, winRate: 55, biggestWin: 9.5, netProfit: 12.1 },
    { address: '0x7k8l...9m0n', totalWagered: 68.9, winRate: 52, biggestWin: 8.3, netProfit: 5.6 },
    { address: '0xop1q...2r3s', totalWagered: 62.4, winRate: 48, biggestWin: 7.7, netProfit: -2.3 },
    { address: '0x4t5u...6v7w', totalWagered: 58.7, winRate: 45, biggestWin: 6.9, netProfit: -5.8 },
    { address: '0x8x9y...0z1a', totalWagered: 54.3, winRate: 42, biggestWin: 6.2, netProfit: -8.9 },
    {
      address: '0xb2c3...d4e5',
      totalWagered: 51.2,
      winRate: 39,
      biggestWin: 5.8,
      netProfit: -12.4,
    },
    {
      address: '0xf6g7...h8i9',
      totalWagered: 48.6,
      winRate: 36,
      biggestWin: 5.3,
      netProfit: -15.7,
    },
    { address: '0xj0k1...l2m3', totalWagered: 45.8, winRate: 58, biggestWin: 8.9, netProfit: 14.2 },
    { address: '0xn4o5...p6q7', totalWagered: 42.1, winRate: 51, biggestWin: 7.4, netProfit: 3.8 },
    { address: '0xr8s9...t0u1', totalWagered: 38.9, winRate: 47, biggestWin: 6.1, netProfit: -4.2 },
    { address: '0xv2w3...x4y5', totalWagered: 35.7, winRate: 43, biggestWin: 5.5, netProfit: -7.9 },
    {
      address: '0xz6a7...b8c9',
      totalWagered: 32.4,
      winRate: 40,
      biggestWin: 4.9,
      netProfit: -10.3,
    },
  ];

  return bettors;
}

/** 톱 베터 컴포넌트 */
export function TopBettors() {
  const [bettors] = useState<BettorInfo[]>(generateMockBettors());

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg bg-arena-card border border-arena-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-arena-border bg-arena-surface/50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">순위</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">플레이어</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">총 배팅액</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">승률</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">최대 수익</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">순수익</th>
            </tr>
          </thead>
          <tbody>
            {bettors.map((bettor, idx) => {
              const rank = idx + 1;

              return (
                <tr
                  key={bettor.address}
                  className="border-b border-arena-border/50 transition-colors hover:bg-ghost-violet/10 odd:bg-arena-surface/20"
                >
                  <td className="px-4 py-3">
                    <RankBadge rank={rank} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-gray-400">{bettor.address}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">
                    {formatMON(bettor.totalWagered)}
                  </td>
                  <td className={`px-4 py-3 font-semibold ${getWinRateColor(bettor.winRate)}`}>
                    {bettor.winRate}%
                  </td>
                  <td className="px-4 py-3 font-semibold text-ghost-neon">
                    {formatMON(bettor.biggestWin)}
                  </td>
                  <td className={`px-4 py-3 font-bold ${getProfitColor(bettor.netProfit)}`}>
                    {bettor.netProfit >= 0 ? '+' : ''}
                    {formatMON(bettor.netProfit)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg bg-arena-surface/30 border border-arena-border/50 p-4">
        <p className="text-sm text-gray-400">
          💡 <span className="font-semibold text-white">팁:</span> 높은 총 배팅액이 항상 높은 수익을
          의미하지는 않습니다. 승률과 베팅 전략이 중요합니다!
        </p>
      </div>
    </div>
  );
}
