/**
 * 매치 카드 컴포넌트
 * 라이브 매치 정보 표시 및 관전 링크
 */
import { Link } from 'react-router-dom';
import type { MatchInfo, MatchStatus } from '@/types/dashboard';

/** 매치 상태 뱃지 스타일 매핑 */
const statusStyles: Record<MatchStatus, string> = {
  pending: 'bg-gray-700 text-gray-300',
  betting: 'bg-ghost-orange text-white animate-pulse',
  active: 'bg-ghost-neon text-arena-bg font-bold',
  completed: 'bg-ghost-violet text-white',
  cancelled: 'bg-gray-600 text-gray-400',
};

/** 매치 상태 텍스트 매핑 */
const statusText: Record<MatchStatus, string> = {
  pending: '대기 중',
  betting: '베팅 진행중',
  active: '진행 중',
  completed: '완료',
  cancelled: '취소됨',
};

interface MatchCardProps {
  /** 매치 정보 */
  match: MatchInfo;
}

/**
 * 매치 카드 컴포넌트
 * 에이전트 대결 정보, 점수, 상태 표시
 */
export function MatchCard({ match }: MatchCardProps) {
  const isLive = match.status === 'active';
  const isBetting = match.status === 'betting';

  return (
    <div className="group relative overflow-hidden rounded-lg border border-arena-border bg-arena-card p-6 transition-all hover:border-ghost-neon hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]">
      {/* 상태 뱃지 */}
      <div className="absolute right-4 top-4">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[match.status]}`}
        >
          {statusText[match.status]}
        </span>
      </div>

      {/* 에이전트 대결 정보 */}
      <div className="mb-4 space-y-3">
        {/* 에이전트 A */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-ghost-violet to-ghost-pink" />
            <div>
              <p className="font-bold text-white">{match.agentAName}</p>
              <p className="text-xs text-gray-400">에이전트 A</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-ghost-neon">{match.scoreA.toLocaleString()}</p>
          </div>
        </div>

        {/* VS 구분선 */}
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-arena-border to-transparent" />
          <span className="text-sm font-bold text-gray-500">VS</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-arena-border to-transparent" />
        </div>

        {/* 에이전트 B */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-ghost-blue to-ghost-neon" />
            <div>
              <p className="font-bold text-white">{match.agentBName}</p>
              <p className="text-xs text-gray-400">에이전트 B</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-ghost-pink">{match.scoreB.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="mt-6">
        {match.status === 'completed' ? (
          <Link
            to={`/match/${match.id}`}
            className="block w-full rounded-lg border border-arena-border bg-arena-surface py-2 text-center font-semibold text-gray-400 transition-colors hover:bg-arena-border"
          >
            결과 보기
          </Link>
        ) : (
          <Link
            to={`/match/${match.id}`}
            className={`block w-full rounded-lg py-2 text-center font-semibold transition-all ${
              isLive || isBetting
                ? 'bg-gradient-to-r from-ghost-violet to-ghost-pink text-white hover:shadow-[0_0_20px_rgba(236,72,153,0.5)]'
                : 'border border-arena-border bg-arena-surface text-gray-300 hover:bg-arena-border'
            }`}
          >
            {isLive && '관전하기'}
            {isBetting && '베팅 & 관전'}
            {match.status === 'pending' && '대기 중'}
          </Link>
        )}
      </div>

      {/* 라이브 매치 펄스 효과 */}
      {isLive && (
        <div className="absolute -right-2 -top-2 h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ghost-neon opacity-75" />
          <span className="relative inline-flex h-4 w-4 rounded-full bg-ghost-neon" />
        </div>
      )}
    </div>
  );
}
