/** 토너먼트 페이지 */

import { useParams, Link } from 'react-router-dom';
import { BracketView } from '@/components/tournament/BracketView';
import { PrizePool } from '@/components/tournament/PrizePool';
import { mockTournament, mockBracketRounds, agentNames } from '@/data/mockTournament';

/**
 * 토너먼트 상세 페이지
 * - 브래킷 시각화
 * - 참가자 리스트
 * - 상금 풀 정보
 */
export function Tournament() {
  const { id } = useParams<{ id: string }>();

  // 실제로는 id로 데이터 fetch, 여기서는 목업 사용
  const tournament = mockTournament;
  const rounds = mockBracketRounds;

  // 상태 배지 스타일
  const getStatusBadge = () => {
    switch (tournament.status) {
      case 'active':
        return (
          <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold text-green-400">
            🔴 진행중
          </span>
        );
      case 'upcoming':
        return (
          <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-400">
            ⏰ 예정
          </span>
        );
      case 'completed':
        return (
          <span className="rounded-full bg-gray-500/20 px-3 py-1 text-xs font-bold text-gray-400">
            ✓ 완료
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/"
            className="mb-2 inline-flex items-center gap-2 text-sm text-ghost-violet hover:text-ghost-neon"
          >
            ← 대시보드로 돌아가기
          </Link>
          <div className="flex items-center gap-3">
            <h1
              className="neon-text text-2xl font-bold text-white"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              토너먼트 #{id || tournament.id}
            </h1>
            {getStatusBadge()}
          </div>
          <p className="mt-2 text-sm text-gray-400">
            {new Date(tournament.createdAt).toLocaleString('ko-KR')} 시작
          </p>
        </div>
      </div>

      {/* 그리드 레이아웃: 브래킷 + 사이드바 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* 메인: 브래킷 (3칸) */}
        <div className="lg:col-span-3">
          <div className="rounded-lg border border-ghost-violet/30 bg-arena-surface p-6">
            <h2 className="mb-4 text-lg font-bold text-white">브래킷</h2>
            <BracketView bracketSize={tournament.bracketSize} rounds={rounds} />
          </div>
        </div>

        {/* 사이드바: 상금 풀 + 참가자 (1칸) */}
        <div className="space-y-6">
          {/* 상금 풀 */}
          <PrizePool totalPool={tournament.prizePool} bracketSize={tournament.bracketSize} />

          {/* 참가자 목록 */}
          <div className="rounded-lg border border-ghost-violet/30 bg-arena-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
              <span>👾</span>
              참가 에이전트
            </h3>
            <div className="space-y-2">
              {tournament.participants.map((address) => (
                <div
                  key={address}
                  className="flex items-center justify-between rounded-md bg-ghost-violet/10 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-gray-300">
                    {agentNames[address] || '알 수 없음'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 토너먼트 통계 */}
          <div className="rounded-lg border border-ghost-violet/30 bg-arena-card p-6">
            <h3 className="mb-4 text-lg font-bold text-white">통계</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">참가자 수</span>
                <span className="font-bold text-white">{tournament.participants.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">브래킷 형식</span>
                <span className="font-bold text-white">{tournament.bracketSize}강 토너먼트</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">총 매치 수</span>
                <span className="font-bold text-white">
                  {tournament.bracketSize === 8 ? '7' : '15'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
