/**
 * 챌린지 매치 목록 페이지
 * 활성 챌린지를 카드로 표시하고, 클릭 시 관전 페이지로 이동
 */
import { useNavigate } from 'react-router-dom';
import { useChallengeList } from '@/hooks/useChallengeList';
import type { ChallengeStatus } from '@ghost-protocol/shared';

/** 상태별 뱃지 색상 매핑 */
const STATUS_STYLES: Record<ChallengeStatus, { bg: string; text: string; label: string }> = {
  created: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: '생성됨' },
  waiting_agent: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '에이전트 대기' },
  betting: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: '배팅 중' },
  countdown: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: '카운트다운' },
  active: { bg: 'bg-green-500/20', text: 'text-green-400', label: '진행 중' },
  completed: { bg: 'bg-ghost-violet/20', text: 'text-ghost-violet', label: '완료' },
  expired: { bg: 'bg-red-500/20', text: 'text-red-400', label: '만료' },
  settling: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: '정산 중' },
  settled: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: '정산 완료' },
};

/** 난이도 라벨 */
const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'T1 Rookie',
  2: 'T2 Hunter',
  3: 'T3 Predator',
  4: 'T4 Nightmare',
  5: 'T5 Impossible',
};

export function Challenge() {
  const { challenges, loading, error } = useChallengeList();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-7xl px-4 pb-12 pt-28 lg:px-8">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h2
          className="neon-text-purple font-display text-2xl font-bold tracking-wider text-ghost-violet lg:text-3xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          CHALLENGE ARENA
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          AI 에이전트 vs 서버 고스트 — 실시간 챌린지 매치
        </p>
      </div>

      {/* 로딩/에러 상태 */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ghost-violet border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && !error && challenges.length === 0 && (
        <div className="rounded-xl border border-ghost-violet/10 bg-arena-surface/40 py-16 text-center">
          <p className="text-lg text-gray-500">활성 챌린지가 없습니다</p>
          <p className="mt-2 text-sm text-gray-600">
            SDK를 통해 에이전트를 등록하고 챌린지를 시작하세요
          </p>
        </div>
      )}

      {/* 챌린지 카드 그리드 */}
      {!loading && challenges.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {challenges.map((c) => {
            const statusStyle = STATUS_STYLES[c.status];
            const diffLabel = DIFFICULTY_LABELS[c.difficulty] ?? `T${String(c.difficulty)}`;

            return (
              <button
                key={c.id}
                onClick={() => {
                  void navigate(`/match/${c.sessionId}`);
                }}
                className="group rounded-xl border border-ghost-violet/10 bg-arena-surface/60 p-5 text-left transition-all hover:border-ghost-violet/30 hover:bg-arena-surface/80"
              >
                {/* 상단: ID + 상태 뱃지 */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-gray-500">{c.id.slice(0, 16)}...</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyle.bg} ${statusStyle.text}`}
                  >
                    {statusStyle.label}
                  </span>
                </div>

                {/* 중앙: 에이전트 vs 고스트 */}
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Pacman</p>
                    <p
                      className="font-display text-sm font-bold text-white"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {c.agentId.slice(0, 12)}...
                    </p>
                  </div>
                  <span
                    className="font-display text-lg font-bold text-ghost-violet"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    VS
                  </span>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Ghost AI</p>
                    <p
                      className="font-display text-sm font-bold text-white"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {diffLabel}
                    </p>
                  </div>
                </div>

                {/* 하단: 점수 + 시간 */}
                <div className="mt-4 flex items-center justify-between border-t border-ghost-violet/10 pt-3">
                  <span className="font-mono text-xs text-gray-500">
                    Score: <span className="text-white">{String(c.score)}</span>
                  </span>
                  <span className="text-[10px] text-gray-600">
                    {new Date(c.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
