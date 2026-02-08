import type { AgentAddress } from '@ghost-protocol/shared';
import { useGameStore } from '../../stores/gameStore.js';

interface MatchStatsOverlayProps {
  /** Agent A 정보 */
  agentA: { address: AgentAddress; name: string; score: number };
  /** Agent B 정보 */
  agentB: { address: AgentAddress; name: string; score: number };
}

/**
 * 매치 통계 오버레이
 * 게임 캔버스 위에 반투명 바로 표시되는 실시간 매치 정보
 */
export function MatchStatsOverlay({ agentA, agentB }: MatchStatsOverlayProps) {
  const gameState = useGameStore((s) => s.gameState);

  if (!gameState) return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
      {/* 반투명 다크 배경 바 */}
      <div
        className="flex items-center justify-between px-6 py-3"
        style={{
          background: 'linear-gradient(180deg, rgba(10,10,26,0.95) 0%, rgba(10,10,26,0.7) 100%)',
          fontFamily: "'Courier New', monospace",
        }}
      >
        {/* Agent A 정보 */}
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-ghost-blue animate-pulse" />
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">{agentA.name}</div>
            <div className="text-lg font-bold text-white">{agentA.score.toLocaleString()}</div>
          </div>
        </div>

        {/* 중앙: VS + 라운드 + 틱 */}
        <div className="text-center">
          <div className="text-sm font-bold text-ghost-violet mb-1">VS</div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>라운드 {gameState.round}</span>
            <span>틱 {gameState.tick}</span>
          </div>
        </div>

        {/* Agent B 정보 */}
        <div className="flex items-center gap-3">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wider text-right">
              {agentB.name}
            </div>
            <div className="text-lg font-bold text-white text-right">
              {agentB.score.toLocaleString()}
            </div>
          </div>
          <div className="w-3 h-3 rounded-full bg-ghost-pink animate-pulse" />
        </div>
      </div>

      {/* 파워업 인디케이터 */}
      {gameState.powerActive && (
        <div className="absolute top-full left-0 right-0 flex items-center justify-center py-2">
          <div
            className="px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
            style={{
              background: 'rgba(34, 211, 238, 0.2)',
              border: '1px solid #22d3ee',
              color: '#22d3ee',
              boxShadow: '0 0 10px rgba(34, 211, 238, 0.5)',
            }}
          >
            파워업 활성 ({Math.ceil(gameState.powerTimeRemaining / 60)}초)
          </div>
        </div>
      )}
    </div>
  );
}
