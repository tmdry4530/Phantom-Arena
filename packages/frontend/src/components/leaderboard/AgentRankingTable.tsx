import { useState } from 'react';

/** 에이전트 주소 타입 */
type AgentAddress = string & { readonly __brand: 'AgentAddress' };

/** 에이전트 정보 인터페이스 */
interface AgentInfo {
  readonly address: AgentAddress;
  readonly owner: string;
  readonly name: string;
  readonly wins: number;
  readonly losses: number;
  readonly reputation: number;
  readonly active: boolean;
  readonly elo: number;
}

/** 정렬 키 타입 */
type SortKey = 'reputation' | 'elo' | 'winRate' | 'wins';

/** 정렬 방향 타입 */
type SortDirection = 'asc' | 'desc';

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

/** 모의 에이전트 데이터 생성 */
function generateMockAgents(): AgentInfo[] {
  const names = [
    'AlphaGhost',
    'NeonChaser',
    'QuantumPac',
    'ShadowRunner',
    'CyberSpectre',
    'VoidHunter',
    'PhantomByte',
    'GhostWhisperer',
    'ArcaneSeeker',
    'NexusWraith',
    'EchoPhantom',
    'BlitzGhost',
    'VortexStalker',
    'MysticPacman',
    'ThunderGhost',
    'FrostSpirit',
    'BlazeSpectre',
    'StormChaser',
    'LunarGhost',
    'SolarPhantom',
  ];

  return names.map((name, idx) => {
    const elo = 2450 - idx * 50;
    const wins = 156 - idx * 7;
    const losses = 44 + idx * 3;
    const reputation = 9800 - idx * 400;

    return {
      address:
        `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}` as AgentAddress,
      owner: `0x${Math.random().toString(16).slice(2, 42)}`,
      name,
      wins,
      losses,
      reputation,
      active: Math.random() > 0.3,
      elo,
    };
  });
}

/** 에이전트 순위 테이블 컴포넌트 */
export function AgentRankingTable() {
  const [agents] = useState<AgentInfo[]>(generateMockAgents());
  const [sortKey, setSortKey] = useState<SortKey>('reputation');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [visibleCount, setVisibleCount] = useState(20);

  /** 정렬 핸들러 */
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  /** 승률 계산 */
  const getWinRate = (agent: AgentInfo) => {
    const total = agent.wins + agent.losses;
    return total > 0 ? (agent.wins / total) * 100 : 0;
  };

  /** 정렬된 에이전트 목록 */
  const sortedAgents = [...agents].sort((a, b) => {
    let comparison = 0;

    switch (sortKey) {
      case 'reputation':
        comparison = a.reputation - b.reputation;
        break;
      case 'elo':
        comparison = a.elo - b.elo;
        break;
      case 'winRate':
        comparison = getWinRate(a) - getWinRate(b);
        break;
      case 'wins':
        comparison = a.wins - b.wins;
        break;
    }

    return sortDirection === 'desc' ? -comparison : comparison;
  });

  const visibleAgents = sortedAgents.slice(0, visibleCount);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg bg-arena-card border border-arena-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-arena-border bg-arena-surface/50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">순위</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">이름</th>
              <th
                className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-gray-300 hover:text-ghost-neon"
                onClick={() => { handleSort('elo'); }}
              >
                ELO {sortKey === 'elo' && (sortDirection === 'desc' ? '↓' : '↑')}
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-gray-300 hover:text-ghost-neon"
                onClick={() => { handleSort('winRate'); }}
              >
                승률 {sortKey === 'winRate' && (sortDirection === 'desc' ? '↓' : '↑')}
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-gray-300 hover:text-ghost-neon"
                onClick={() => { handleSort('wins'); }}
              >
                승/패 {sortKey === 'wins' && (sortDirection === 'desc' ? '↓' : '↑')}
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-gray-300 hover:text-ghost-neon"
                onClick={() => { handleSort('reputation'); }}
              >
                평판 {sortKey === 'reputation' && (sortDirection === 'desc' ? '↓' : '↑')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">상태</th>
            </tr>
          </thead>
          <tbody>
            {visibleAgents.map((agent, idx) => {
              const rank = idx + 1;
              const winRate = getWinRate(agent);

              return (
                <tr
                  key={agent.address}
                  className="border-b border-arena-border/50 transition-colors hover:bg-ghost-violet/10 odd:bg-arena-surface/20"
                >
                  <td className="px-4 py-3">
                    <RankBadge rank={rank} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="font-medium text-white hover:text-ghost-neon transition-colors"
                      type="button"
                    >
                      {agent.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-300">
                    {agent.elo.toLocaleString()}
                  </td>
                  <td className={`px-4 py-3 font-semibold ${getWinRateColor(winRate)}`}>
                    {winRate.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-300">
                    {agent.wins.toLocaleString()}W / {agent.losses.toLocaleString()}L
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-ghost-neon">
                    {agent.reputation.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          agent.active ? 'bg-green-400' : 'bg-gray-500'
                        }`}
                      />
                      <span className="text-sm text-gray-400">
                        {agent.active ? '활성' : '비활성'}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {visibleCount < sortedAgents.length && (
        <div className="text-center">
          <button
            onClick={() => { setVisibleCount((prev) => prev + 20); }}
            className="rounded-lg bg-ghost-violet px-6 py-2 font-semibold text-white transition-colors hover:bg-ghost-violet/80"
            type="button"
          >
            더 보기 ({sortedAgents.length - visibleCount}개 남음)
          </button>
        </div>
      )}
    </div>
  );
}
