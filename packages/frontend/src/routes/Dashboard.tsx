/**
 * 대시보드 페이지
 * Ghost Protocol Arena 메인 허브 — 라이브 매치, 토너먼트, 서바이벌, 랭킹, 피드
 */
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDashboardStore, type TournamentFilter } from '@/stores/dashboardStore';
import { useLobbySocket } from '@/hooks/useLobbySocket';
import { MatchCard } from '@/components/dashboard/MatchCard';
import { TournamentCard } from '@/components/dashboard/TournamentCard';
import { FeedItem } from '@/components/dashboard/FeedItem';

/**
 * 대시보드 페이지 컴포넌트
 * 전체 아레나 상태 및 활동 개요
 */
export function Dashboard() {
  const {
    matches,
    agentRankings,
    feedItems,
    tournamentFilter,
    setTournamentFilter,
    getFilteredTournaments,
    loadMockData,
  } = useDashboardStore();

  // 로비 WebSocket 연결
  useLobbySocket();

  // Mock 데이터 로드 (최초 렌더링 시)
  useEffect(() => {
    loadMockData();
  }, [loadMockData]);

  const tournaments = getFilteredTournaments();
  const liveMatches = matches.filter((m) => m.status === 'active' || m.status === 'betting');
  const firstActiveMatch = liveMatches[0];

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl border border-arena-border bg-gradient-to-br from-arena-card via-arena-surface to-arena-bg p-12 text-center">
        {/* 배경 그리드 효과 */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />

        {/* 글로우 효과 */}
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ghost-violet/20 blur-3xl" />

        <div className="relative z-10 space-y-6">
          <h1 className="text-6xl font-black text-white drop-shadow-[0_0_30px_rgba(139,92,246,0.8)]">
            Ghost Protocol Arena
          </h1>
          <p className="text-xl text-gray-300">AI 에이전트 팩맨 배틀 아레나 · Monad 블록체인</p>

          {/* CTA 버튼 */}
          <div className="flex items-center justify-center gap-4">
            {firstActiveMatch ? (
              <Link
                to={`/match/${firstActiveMatch.id}`}
                className="rounded-xl bg-gradient-to-r from-ghost-violet to-ghost-pink px-8 py-3 font-bold text-white transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(236,72,153,0.6)]"
              >
                아레나 관전
              </Link>
            ) : (
              <button
                disabled
                className="cursor-not-allowed rounded-xl border border-arena-border bg-arena-surface px-8 py-3 font-bold text-gray-500"
              >
                아레나 관전
              </button>
            )}
            <Link
              to="/survival"
              className="rounded-xl border-2 border-ghost-neon bg-arena-bg px-8 py-3 font-bold text-ghost-neon transition-all hover:bg-ghost-neon hover:text-arena-bg hover:shadow-[0_0_30px_rgba(34,211,238,0.6)]"
            >
              서바이벌 도전
            </Link>
          </div>
        </div>
      </section>

      {/* Live Matches Section */}
      <section>
        <div className="mb-6 flex items-center gap-3">
          <h2 className="text-3xl font-bold text-white">라이브 매치</h2>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ghost-red opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-ghost-red" />
            </span>
            <span className="text-sm text-gray-400">{liveMatches.length}개 진행 중</span>
          </div>
        </div>

        {liveMatches.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {liveMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-arena-border bg-arena-card p-12 text-center">
            <p className="text-gray-400">현재 진행 중인 매치가 없습니다. 곧 시작됩니다!</p>
          </div>
        )}
      </section>

      {/* Active Tournaments Section */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-3xl font-bold text-white">토너먼트</h2>

          {/* 필터 탭 */}
          <div className="flex gap-2 rounded-lg border border-arena-border bg-arena-surface p-1">
            {(['all', 'active', 'upcoming', 'completed'] as TournamentFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => { setTournamentFilter(filter); }}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition-all ${
                  tournamentFilter === filter
                    ? 'bg-ghost-violet text-white shadow-[0_0_10px_rgba(139,92,246,0.5)]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {filter === 'all' && '전체'}
                {filter === 'active' && '진행중'}
                {filter === 'upcoming' && '예정'}
                {filter === 'completed' && '완료'}
              </button>
            ))}
          </div>
        </div>

        {tournaments.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-arena-border bg-arena-card p-12 text-center">
            <p className="text-gray-400">
              {tournamentFilter === 'all'
                ? '예정된 토너먼트가 없습니다.'
                : `${tournamentFilter === 'active' ? '진행 중인' : tournamentFilter === 'upcoming' ? '예정된' : '완료된'} 토너먼트가 없습니다.`}
            </p>
          </div>
        )}
      </section>

      {/* Survival Sessions Section */}
      <section>
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-white">서바이벌 모드</h2>
        </div>

        <div className="rounded-xl border border-ghost-neon bg-gradient-to-r from-arena-card to-arena-surface p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-ghost-neon">AI 고스트를 상대로 생존하세요!</h3>
              <p className="text-gray-400">
                점점 더 강력해지는 AI를 상대로 최대한 오래 살아남으세요. 다른 플레이어는 당신의
                생존을 예측하여 베팅할 수 있습니다.
              </p>
            </div>
            <Link
              to="/survival"
              className="rounded-xl bg-gradient-to-r from-ghost-neon to-ghost-blue px-8 py-3 font-bold text-arena-bg transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(34,211,238,0.6)]"
            >
              도전하기
            </Link>
          </div>
        </div>
      </section>

      {/* Two Column Layout: Rankings + Feed */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Agent Rankings Preview */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-3xl font-bold text-white">에이전트 순위</h2>
            <Link
              to="/leaderboard"
              className="text-sm font-semibold text-ghost-violet transition-colors hover:text-ghost-pink"
            >
              전체보기 →
            </Link>
          </div>

          <div className="space-y-3 rounded-lg border border-arena-border bg-arena-card p-6">
            {agentRankings.slice(0, 5).map((ranking) => (
              <div
                key={ranking.agent.address}
                className="flex items-center justify-between rounded-lg border border-transparent p-3 transition-all hover:border-arena-border hover:bg-arena-surface"
              >
                <div className="flex items-center gap-3">
                  {/* 순위 */}
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                      ranking.rank === 1
                        ? 'bg-ghost-orange text-white'
                        : ranking.rank === 2
                          ? 'bg-gray-400 text-arena-bg'
                          : ranking.rank === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-arena-surface text-gray-400'
                    }`}
                  >
                    {ranking.rank}
                  </div>

                  {/* 에이전트 정보 */}
                  <div>
                    <p className="font-bold text-white">{ranking.agent.name}</p>
                    <p className="text-xs text-gray-400">
                      {ranking.agent.wins}승 {ranking.agent.losses}패
                    </p>
                  </div>
                </div>

                {/* 통계 */}
                <div className="text-right">
                  <p className="font-bold text-ghost-neon">{ranking.elo}</p>
                  <p className="text-xs text-gray-400">{ranking.winRate.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Global Feed */}
        <section>
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-white">최근 소식</h2>
          </div>

          <div className="max-h-[500px] space-y-2 overflow-y-auto rounded-lg border border-arena-border bg-arena-card p-4">
            {feedItems.map((item) => (
              <FeedItem key={item.id} item={item} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
