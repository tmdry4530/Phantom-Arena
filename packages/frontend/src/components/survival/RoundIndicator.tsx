/**
 * 라운드 표시 컴포넌트
 * 현재 라운드와 난이도를 고스트 이모지로 시각화
 */
import { useEffect, useState } from 'react';
import type { DifficultyTier } from '@ghost-protocol/shared';

interface RoundIndicatorProps {
  /** 현재 라운드 */
  round: number;
  /** 현재 난이도 */
  difficulty: DifficultyTier;
}

/**
 * 라운드 표시 컴포넌트
 * 라운드 변경 시 슬라이드 애니메이션
 */
export function RoundIndicator({ round, difficulty }: RoundIndicatorProps) {
  const [animate, setAnimate] = useState(false);

  // 라운드 변경 시 애니메이션 트리거
  useEffect(() => {
    setAnimate(true);
    const timer = setTimeout(() => { setAnimate(false); }, 1000);
    return () => { clearTimeout(timer); };
  }, [round]);

  return (
    <div className={`transition-all duration-500 ${animate ? 'animate-slide-down' : ''}`}>
      {/* 라운드 번호 */}
      <div className="text-center mb-2">
        <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">ROUND</div>
        <div
          className="text-6xl font-bold"
          style={{
            color: '#8b5cf6',
            textShadow: '0 0 20px #8b5cf680',
          }}
        >
          {round}
        </div>
      </div>

      {/* 고스트 이모지 표시 (난이도 시각화) */}
      <div className="flex justify-center gap-1 text-2xl">
        {Array.from({ length: difficulty }, (_, i) => (
          <span
            key={i}
            className="animate-float"
            style={{
              animationDelay: `${String(i * 0.2)}s`,
            }}
          >
            👻
          </span>
        ))}
      </div>
    </div>
  );
}
