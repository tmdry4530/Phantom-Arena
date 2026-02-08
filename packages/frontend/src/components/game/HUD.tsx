import { useGameStore } from '../../stores/gameStore';

/** 게임 HUD 오버레이 컴포넌트 */
export function HUD() {
  const gameState = useGameStore((s) => s.gameState);
  const difficulty = useGameStore((s) => s.difficulty);

  if (!gameState) return null;

  return (
    <>
      <div
        className="absolute top-0 left-0 right-0 flex justify-between items-center px-4 py-2 pointer-events-none z-10"
        style={{ fontFamily: "'Courier New', monospace" }}
      >
        {/* 좌측: 점수 + 생명 */}
        <div className="flex items-center gap-4">
          <div className="text-white">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Score</span>
            <div className="text-xl font-bold" style={{ color: '#8B5CF6' }}>
              {gameState.score.toLocaleString()}
            </div>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: gameState.lives }, (_, i) => (
              <span key={i} className="text-yellow-400 text-lg">
                ●
              </span>
            ))}
          </div>
        </div>

        {/* 중앙: 라운드 */}
        <div className="text-center">
          <span className="text-xs text-gray-400 uppercase tracking-wider">Round</span>
          <div className="text-lg font-bold text-white">{gameState.round}</div>
        </div>

        {/* 우측: 난이도 티어 */}
        <div className="text-right">
          <span className="text-xs text-gray-400 uppercase tracking-wider">Tier</span>
          <div className="text-lg font-bold" style={{ color: '#8B5CF6' }}>
            {'★'.repeat(difficulty)}
            {'☆'.repeat(5 - difficulty)}
          </div>
        </div>
      </div>

      {/* 파워업 타이머 바 */}
      {gameState.powerActive && (
        <div className="absolute bottom-0 left-0 right-0 h-1 z-10">
          <div
            className="h-full transition-all duration-100"
            style={{
              width: `${String((gameState.powerTimeRemaining / 600) * 100)}%`,
              backgroundColor: '#3b82f6',
            }}
          />
        </div>
      )}

      {/* 게임 오버 오버레이 */}
      {gameState.lives <= 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/70">
          <div className="text-center">
            <div className="text-4xl font-bold text-red-500 mb-2">GAME OVER</div>
            <div className="text-xl text-gray-300">
              Final Score:{' '}
              <span style={{ color: '#8B5CF6' }}>{gameState.score.toLocaleString()}</span>
            </div>
            <div className="text-sm text-gray-500 mt-4">Press SPACE to restart</div>
          </div>
        </div>
      )}
    </>
  );
}
