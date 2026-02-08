/**
 * 게임 오버 화면 모달
 * 최종 점수, 라운드, 신기록 여부 표시
 */
interface GameOverScreenProps {
  /** 최종 라운드 */
  finalRound: number;
  /** 최종 점수 */
  finalScore: number;
  /** 신기록 달성 여부 */
  isRecord: boolean;
  /** 재시작 콜백 */
  onRestart: () => void;
  /** 대시보드로 이동 콜백 */
  onDashboard: () => void;
}

/**
 * 서바이벌 게임 오버 화면
 * 다크 오버레이 위에 결과 카드 표시
 */
export function GameOverScreen({
  finalRound,
  finalScore,
  isRecord,
  onRestart,
  onDashboard,
}: GameOverScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-arena-card border-2 border-arena-border rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* 타이틀 */}
        <div className="text-center mb-6">
          <h2
            className="text-5xl font-bold mb-2"
            style={{
              color: '#ef4444',
              textShadow: '0 0 20px #ef444480',
            }}
          >
            게임 오버
          </h2>
          {isRecord && (
            <div
              className="text-2xl font-bold animate-pulse"
              style={{
                color: '#fbbf24',
                textShadow: '0 0 15px #fbbf2480',
              }}
            >
              🎉 새 기록! 🎉
            </div>
          )}
        </div>

        {/* 통계 */}
        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center p-4 bg-arena-surface rounded-lg">
            <span className="text-gray-400 text-sm uppercase tracking-wider">최종 라운드</span>
            <span className="text-3xl font-bold text-white">{finalRound}</span>
          </div>

          <div className="flex justify-between items-center p-4 bg-arena-surface rounded-lg">
            <span className="text-gray-400 text-sm uppercase tracking-wider">최종 점수</span>
            <span className="text-3xl font-bold" style={{ color: '#8b5cf6' }}>
              {finalScore.toLocaleString()}
            </span>
          </div>

          {isRecord && (
            <div className="p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg text-center">
              <p className="text-yellow-400 text-sm">이전 기록을 갱신했습니다!</p>
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onRestart}
            className="flex-1 py-3 px-6 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
            style={{
              backgroundColor: '#8b5cf6',
              boxShadow: '0 0 15px #8b5cf680',
            }}
          >
            다시 도전
          </button>
          <button
            onClick={onDashboard}
            className="flex-1 py-3 px-6 bg-arena-surface border border-arena-border rounded-lg font-semibold text-gray-300 hover:bg-arena-border transition-all duration-200"
          >
            대시보드로
          </button>
        </div>
      </div>
    </div>
  );
}
