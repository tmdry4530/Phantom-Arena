/**
 * 토너먼트 카드 컴포넌트
 * 토너먼트 정보 및 상태 표시
 */
import { Link } from 'react-router-dom';
import type { TournamentInfo, TournamentStatus } from '@/types/dashboard';
import { formatMON } from '@/data/mockDashboard';

/** 토너먼트 상태 뱃지 스타일 매핑 */
const statusStyles: Record<TournamentStatus, string> = {
  upcoming: 'bg-ghost-blue text-white',
  active: 'bg-ghost-neon text-arena-bg font-bold animate-pulse',
  completed: 'bg-gray-600 text-gray-300',
};

/** 토너먼트 상태 텍스트 매핑 */
const statusText: Record<TournamentStatus, string> = {
  upcoming: '예정',
  active: '진행 중',
  completed: '완료',
};

interface TournamentCardProps {
  /** 토너먼트 정보 */
  tournament: TournamentInfo;
}

/**
 * 토너먼트 카드 컴포넌트
 * 브래킷 크기, 참가자, 상금 풀, 상태 표시
 */
export function TournamentCard({ tournament }: TournamentCardProps) {
  const isActive = tournament.status === 'active';
  const bracketText = tournament.bracketSize === 8 ? '8강' : '16강';

  return (
    <div className="group relative overflow-hidden rounded-lg border border-arena-border bg-arena-card p-6 transition-all hover:border-ghost-violet hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]">
      {/* 상태 뱃지 */}
      <div className="absolute right-4 top-4">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[tournament.status]}`}
        >
          {statusText[tournament.status]}
        </span>
      </div>

      {/* 토너먼트 아이콘 */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-ghost-violet via-ghost-pink to-ghost-orange">
        <span className="text-2xl">🏆</span>
      </div>

      {/* 토너먼트 정보 */}
      <div className="mb-4 space-y-2">
        <h3 className="text-xl font-bold text-white">토너먼트 #{tournament.id.slice(-3)}</h3>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-1">
            <span className="text-ghost-neon">●</span>
            <span>{bracketText} 토너먼트</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-ghost-pink">●</span>
            <span>{tournament.participants.length}명 참가</span>
          </div>
        </div>
      </div>

      {/* 상금 풀 */}
      <div className="mb-4 rounded-lg border border-arena-border bg-arena-surface p-3">
        <p className="text-xs text-gray-400">상금 풀</p>
        <p className="text-2xl font-bold text-ghost-orange">
          {formatMON(tournament.prizePool)} MON
        </p>
      </div>

      {/* 액션 버튼 */}
      <Link
        to={`/tournament/${tournament.id}`}
        className={`block w-full rounded-lg py-2 text-center font-semibold transition-all ${
          isActive
            ? 'bg-gradient-to-r from-ghost-violet to-ghost-pink text-white hover:shadow-[0_0_20px_rgba(139,92,246,0.5)]'
            : 'border border-arena-border bg-arena-surface text-gray-300 hover:bg-arena-border'
        }`}
      >
        자세히 보기
      </Link>

      {/* 활성 토너먼트 글로우 효과 */}
      {isActive && (
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-ghost-violet/10 to-ghost-pink/10" />
      )}
    </div>
  );
}
