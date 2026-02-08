/** 브래킷 매치 노드 컴포넌트 */

import { Link } from 'react-router-dom';
import type { BracketMatch } from '@/types/tournament';

interface MatchNodeProps {
  readonly match: BracketMatch;
}

/**
 * 매치 노드 컴포넌트
 * - 브래킷 내 단일 매치 표시
 * - 상태별 스타일링 (pending/betting/active/completed)
 * - 클릭 시 매치 상세 페이지로 이동
 */
export function MatchNode({ match }: MatchNodeProps) {
  const { agentA, agentB, winner, status } = match;

  // TBD 매치인지 확인
  const isTBD = agentA.name === 'TBD' || agentB.name === 'TBD';

  // 상태별 스타일
  const getStatusStyle = () => {
    switch (status) {
      case 'active':
        return 'border-ghost-neon shadow-[0_0_10px_rgba(34,211,238,0.5)] animate-pulse';
      case 'betting':
        return 'border-ghost-orange shadow-[0_0_8px_rgba(249,115,22,0.3)]';
      case 'completed':
        return 'border-ghost-violet/50';
      case 'pending':
      default:
        return 'border-ghost-violet/20';
    }
  };

  // 상태 인디케이터
  const StatusIndicator = () => {
    switch (status) {
      case 'active':
        return (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 animate-pulse rounded-full bg-ghost-neon"></div>
            <span className="text-xs text-ghost-neon">진행중</span>
          </div>
        );
      case 'betting':
        return (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-ghost-orange"></div>
            <span className="text-xs text-ghost-orange">베팅중</span>
          </div>
        );
      case 'completed':
        return <span className="text-xs text-green-400">✓ 완료</span>;
      default:
        return <span className="text-xs text-gray-500">대기중</span>;
    }
  };

  // TBD 매치는 클릭 불가
  const content = (
    <div
      className={`
        relative rounded-lg border bg-arena-card px-3 py-2
        transition-all duration-300
        ${getStatusStyle()}
        ${!isTBD && status !== 'pending' ? 'card-hover cursor-pointer' : 'opacity-60'}
      `}
    >
      {/* 상태 인디케이터 */}
      <div className="mb-2 flex justify-center">
        <StatusIndicator />
      </div>

      {/* Agent A */}
      <div
        className={`
          flex items-center justify-between border-b border-ghost-violet/20 pb-1
          ${winner && winner === agentA.address ? 'text-ghost-neon font-bold' : 'text-gray-300'}
        `}
      >
        <span className="truncate text-xs" title={agentA.name}>
          {agentA.name}
        </span>
        {agentA.score !== null && <span className="ml-2 text-xs font-bold">{agentA.score}</span>}
      </div>

      {/* Agent B */}
      <div
        className={`
          flex items-center justify-between pt-1
          ${winner && winner === agentB.address ? 'text-ghost-neon font-bold' : 'text-gray-300'}
        `}
      >
        <span className="truncate text-xs" title={agentB.name}>
          {agentB.name}
        </span>
        {agentB.score !== null && <span className="ml-2 text-xs font-bold">{agentB.score}</span>}
      </div>

      {/* 승자 표시 */}
      {winner && (
        <div className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ghost-neon text-xs">
          👑
        </div>
      )}
    </div>
  );

  // TBD나 pending이 아닌 경우만 링크로 감싸기
  if (!isTBD && status !== 'pending') {
    return <Link to={`/match/${match.id}`}>{content}</Link>;
  }

  return content;
}
