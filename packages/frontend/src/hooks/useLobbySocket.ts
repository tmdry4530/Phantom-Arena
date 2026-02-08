/**
 * 로비 WebSocket 연결 훅
 * 대시보드 실시간 업데이트를 위한 이벤트 리스너
 */
import { useEffect } from 'react';
import { useSocket } from './useSocket';
import { useDashboardStore } from '@/stores/dashboardStore';
import type { MatchInfo, TournamentInfo, SurvivalSessionInfo, FeedItem } from '@/types/dashboard';

/**
 * 로비 소켓 이벤트 리스너 훅
 * 토너먼트, 매치, 서바이벌 세션, 피드 업데이트 수신
 */
export function useLobbySocket(): void {
  const { socket, connected } = useSocket();
  const { updateMatch, updateTournament, updateSurvivalSession, addFeedItem } = useDashboardStore();

  useEffect(() => {
    if (!socket || !connected) return;

    /**
     * 매치 업데이트 이벤트
     * 매치 상태, 점수 변경 시 수신
     */
    const handleMatchUpdate = (match: MatchInfo) => {
      updateMatch(match);
    };

    /**
     * 토너먼트 업데이트 이벤트
     * 토너먼트 상태, 참가자 변경 시 수신
     */
    const handleTournamentUpdate = (tournament: TournamentInfo) => {
      updateTournament(tournament);
    };

    /**
     * 서바이벌 세션 업데이트 이벤트
     * 세션 상태, 점수 변경 시 수신
     */
    const handleSurvivalUpdate = (session: SurvivalSessionInfo) => {
      updateSurvivalSession(session);
    };

    /**
     * 피드 아이템 이벤트
     * 새로운 이벤트 발생 시 수신
     */
    const handleFeedItem = (item: FeedItem) => {
      addFeedItem(item);
    };

    // 이벤트 리스너 등록
    socket.on('match_update', handleMatchUpdate);
    socket.on('tournament_update', handleTournamentUpdate);
    socket.on('survival_update', handleSurvivalUpdate);
    socket.on('feed_item', handleFeedItem);

    // 로비 룸 참가 (서버 구현 시 활성화)
    // socket.emit('join_lobby');

    // 클린업: 이벤트 리스너 제거
    return () => {
      socket.off('match_update', handleMatchUpdate);
      socket.off('tournament_update', handleTournamentUpdate);
      socket.off('survival_update', handleSurvivalUpdate);
      socket.off('feed_item', handleFeedItem);
      // socket.emit('leave_lobby');
    };
  }, [socket, connected, updateMatch, updateTournament, updateSurvivalSession, addFeedItem]);
}
