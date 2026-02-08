import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { MatchId, MatchInfo, AgentAddress, TournamentId } from '@ghost-protocol/shared';
import { PhaserGame } from '../game/PhaserGame.js';
import { MatchStatsOverlay } from '../components/game/MatchStatsOverlay.js';
import { BettingPanel } from '../components/game/BettingPanel.js';
import { useMatchSocket } from '../hooks/useMatchSocket.js';
import { useBettingStore } from '../stores/bettingStore.js';

/**
 * 게임 관전 페이지
 * 아레나 매치 실시간 관전 + 배팅 인터페이스
 */
export function GameViewer() {
  const { id } = useParams<{ id: string }>();
  const matchId = id as MatchId;

  // Mock 매치 데이터 (실제로는 API에서 가져올 것)
  const [matchInfo] = useState<MatchInfo>({
    id: matchId,
    tournamentId: 'tournament-1' as TournamentId,
    agentA: '0x1a2b3c4d' as AgentAddress,
    agentB: '0x5e6f7a8b' as AgentAddress,
    scoreA: 0,
    scoreB: 0,
    winner: null,
    gameLogHash: '',
    replayURI: '',
    status: 'active',
  });

  const [agentAInfo] = useState({
    address: matchInfo.agentA,
    name: 'AlphaGhost',
    score: matchInfo.scoreA,
  });

  const [agentBInfo] = useState({
    address: matchInfo.agentB,
    name: 'NeonChaser',
    score: matchInfo.scoreB,
  });

  // WebSocket 연결 및 이벤트 리스닝
  useMatchSocket(matchId);

  // Mock 배팅 풀 데이터 초기화
  const setPool = useBettingStore((s) => s.setPool);

  useEffect(() => {
    // Mock 배팅 풀 데이터
    setPool({
      matchId,
      totalPool: BigInt(5e18), // 5 MON
      sideA: BigInt(3e18), // 3 MON on Agent A
      sideB: BigInt(2e18), // 2 MON on Agent B
      oddsA: 1.67,
      oddsB: 2.5,
      betCount: 12,
      locked: false,
    });
  }, [matchId, setPool]);

  // 매치 상태에 따른 배지 색상
  const getStatusBadge = () => {
    const colors = {
      pending: 'bg-gray-500',
      betting: 'bg-ghost-neon',
      active: 'bg-ghost-violet',
      completed: 'bg-green-500',
      cancelled: 'bg-red-500',
    };

    const labels = {
      pending: '대기 중',
      betting: '배팅 중',
      active: '진행 중',
      completed: '완료',
      cancelled: '취소됨',
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
          colors[matchInfo.status]
        } text-white`}
      >
        {labels[matchInfo.status]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-arena-bg">
      {/* 헤더 */}
      <header className="border-b border-arena-border px-6 py-4">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <span>←</span>
              <span>대시보드</span>
            </Link>
            <div className="h-6 w-px bg-arena-border" />
            <div>
              <h1 className="text-xl font-bold text-white mb-1">
                {agentAInfo.name} vs {agentBInfo.name}
              </h1>
              <div className="text-xs text-gray-400">매치 ID: {matchId}</div>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </header>

      {/* 메인 컨텐츠: 게임 뷰 + 배팅 패널 */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)]">
        {/* 게임 영역 (좌측 ~65%) */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-8">
          <div className="relative">
            {/* 매치 통계 오버레이 */}
            <MatchStatsOverlay agentA={agentAInfo} agentB={agentBInfo} />

            {/* Phaser 게임 캔버스 */}
            <div
              className="rounded-lg overflow-hidden"
              style={{ boxShadow: '0 0 40px rgba(139, 92, 246, 0.3)' }}
            >
              <PhaserGame />
            </div>

            {/* 게임 하단 정보 */}
            <div className="mt-4 flex justify-between items-center text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>실시간 중계</span>
              </div>
              <div className="flex items-center gap-4">
                <span>60 FPS</span>
                <span>•</span>
                <span>지연시간: ~50ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* 배팅 패널 (우측 ~35%) */}
        <div className="lg:w-[400px] xl:w-[480px]">
          <BettingPanel
            matchId={matchId}
            agentAName={agentAInfo.name}
            agentBName={agentBInfo.name}
          />
        </div>
      </div>
    </div>
  );
}
