/**
 * 난이도 기반 배경 텐션 미터
 * 게임 캔버스 뒤에서 전체 화면 그라디언트로 긴장감 표현
 */
import type { DifficultyTier } from '@ghost-protocol/shared';

interface TensionMeterProps {
  /** 현재 난이도 등급 (1~5) */
  difficulty: DifficultyTier;
}

/** 난이도별 그라디언트 색상 설정 */
const TENSION_GRADIENTS: Record<DifficultyTier, { from: string; to: string }> = {
  1: { from: '#1a1a3e', to: '#0a1628' }, // 차분한 블루
  2: { from: '#1a1a3e', to: '#1a0a28' }, // 블루-퍼플
  3: { from: '#2a0a28', to: '#1a0a1a' }, // 퍼플 (중간 긴장)
  4: { from: '#3a0a1a', to: '#2a0510' }, // 퍼플-레드 (높은 긴장)
  5: { from: '#4a0510', to: '#3a0205' }, // 깊은 레드 (최대 위험)
};

/** 난이도별 펄스 애니메이션 강도 */
const PULSE_INTENSITY: Record<DifficultyTier, string> = {
  1: 'none',
  2: 'none',
  3: 'animate-pulse-slow',
  4: 'animate-pulse-medium',
  5: 'animate-pulse-fast',
};

/**
 * 전체 화면 배경 텐션 미터 컴포넌트
 * 난이도가 올라갈수록 색상이 레드로 변하며 위험도 증가 표현
 */
export function TensionMeter({ difficulty }: TensionMeterProps) {
  const gradient = TENSION_GRADIENTS[difficulty];
  const pulseClass = PULSE_INTENSITY[difficulty];

  return (
    <div
      className={`fixed inset-0 -z-10 transition-all duration-1000 ${pulseClass}`}
      style={{
        background: `radial-gradient(ellipse at center, ${gradient.from} 0%, ${gradient.to} 100%)`,
      }}
    >
      {/* 고난이도에서 추가 오버레이 효과 */}
      {difficulty >= 4 && (
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, #ef4444 2px, #ef4444 4px)',
            animation: 'scan 4s linear infinite',
          }}
        />
      )}
    </div>
  );
}
