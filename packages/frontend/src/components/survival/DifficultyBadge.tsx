/**
 * 난이도 티어 배지 컴포넌트
 * 현재 난이도를 시각적으로 표시
 */
import { useEffect, useState } from 'react';
import type { DifficultyTier } from '@ghost-protocol/shared';

interface DifficultyBadgeProps {
  /** 난이도 등급 (1~5) */
  tier: DifficultyTier;
}

/** 난이도별 색상 */
const TIER_COLORS: Record<DifficultyTier, string> = {
  1: '#3b82f6', // 블루 - 쉬움
  2: '#10b981', // 그린 - 보통
  3: '#f59e0b', // 옐로우 - 어려움
  4: '#f97316', // 오렌지 - 극한
  5: '#ef4444', // 레드 - 지옥
};

/** 난이도별 라벨 */
const TIER_LABELS: Record<DifficultyTier, string> = {
  1: '쉬움',
  2: '보통',
  3: '어려움',
  4: '극한',
  5: '지옥',
};

/**
 * 난이도 티어 배지
 * 티어 변경 시 바운스 애니메이션 적용
 */
export function DifficultyBadge({ tier }: DifficultyBadgeProps) {
  const [animate, setAnimate] = useState(false);

  // 티어 변경 시 애니메이션 트리거
  useEffect(() => {
    setAnimate(true);
    const timer = setTimeout(() => { setAnimate(false); }, 600);
    return () => { clearTimeout(timer); };
  }, [tier]);

  const color = TIER_COLORS[tier];
  const label = TIER_LABELS[tier];

  return (
    <div
      className={`flex flex-col items-center gap-2 transition-all duration-300 ${
        animate ? 'animate-bounce' : ''
      }`}
    >
      {/* 티어 번호 배지 */}
      <div
        className="relative w-20 h-20 rounded-full flex items-center justify-center font-bold text-4xl shadow-lg"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 20px ${color}80`,
        }}
      >
        {tier}
        {/* 별 아이콘 오버레이 */}
        <div className="absolute -top-1 -right-1 text-yellow-300 text-xl">★</div>
      </div>

      {/* 난이도 라벨 */}
      <div className="text-sm font-semibold uppercase tracking-wide" style={{ color }}>
        {label}
      </div>

      {/* 별 표시 */}
      <div className="flex gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className={`text-lg transition-all duration-300 ${
              i < tier ? 'text-yellow-400 scale-110' : 'text-gray-600'
            }`}
          >
            {i < tier ? '★' : '☆'}
          </span>
        ))}
      </div>
    </div>
  );
}
