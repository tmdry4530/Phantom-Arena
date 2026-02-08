/**
 * 피드 아이템 컴포넌트
 * 최근 이벤트 표시
 */
import type { FeedItem as FeedItemType, FeedItemType as EventType } from '@/types/dashboard';
import { formatRelativeTime } from '@/data/mockDashboard';

/** 피드 아이템 타입별 아이콘 매핑 */
const iconMap: Record<EventType, string> = {
  tournament_win: '🏆',
  record_break: '⚡',
  big_bet: '💰',
  new_agent: '🤖',
  survival_complete: '👾',
};

/** 피드 아이템 타입별 색상 매핑 */
const colorMap: Record<EventType, string> = {
  tournament_win: 'text-ghost-orange',
  record_break: 'text-ghost-neon',
  big_bet: 'text-ghost-pink',
  new_agent: 'text-ghost-violet',
  survival_complete: 'text-ghost-blue',
};

interface FeedItemProps {
  /** 피드 아이템 데이터 */
  item: FeedItemType;
}

/**
 * 피드 아이템 컴포넌트
 * 이벤트 아이콘, 설명, 타임스탬프 표시
 */
export function FeedItem({ item }: FeedItemProps) {
  const icon = iconMap[item.type];
  const colorClass = colorMap[item.type];
  const timeAgo = formatRelativeTime(item.timestamp);

  return (
    <div className="group flex items-start gap-3 rounded-lg border border-transparent p-3 transition-all hover:border-arena-border hover:bg-arena-surface">
      {/* 아이콘 */}
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-arena-card text-xl ${colorClass}`}
      >
        {icon}
      </div>

      {/* 내용 */}
      <div className="flex-1 space-y-1">
        <p className="text-sm text-gray-200">{item.description}</p>
        <p className="text-xs text-gray-500">{timeAgo}</p>
      </div>

      {/* 호버 인디케이터 */}
      <div className="h-2 w-2 flex-shrink-0 rounded-full bg-arena-border opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}
