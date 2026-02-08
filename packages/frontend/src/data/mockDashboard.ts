/**
 * 대시보드 Mock 데이터
 * 백엔드 구현 전까지 사용할 더미 데이터
 */
import type {
  AgentAddress,
  MatchId,
  TournamentId,
  SessionId,
  MatchInfo,
  TournamentInfo,
  SurvivalSessionInfo,
  FeedItem,
  AgentRanking,
  AgentInfo,
} from '@/types/dashboard';

/** Mock 에이전트 목록 */
export const mockAgents: AgentInfo[] = [
  {
    address: '0x1a2b3c4d5e6f7890' as AgentAddress,
    owner: '0xabcdef123456',
    name: 'AlphaGhost',
    wins: 42,
    losses: 8,
    reputation: 2340,
    active: true,
  },
  {
    address: '0x2b3c4d5e6f789012' as AgentAddress,
    owner: '0xbcdef1234567',
    name: 'NeonChaser',
    wins: 38,
    losses: 12,
    reputation: 2180,
    active: true,
  },
  {
    address: '0x3c4d5e6f78901234' as AgentAddress,
    owner: '0xcdef12345678',
    name: 'QuantumPac',
    wins: 35,
    losses: 15,
    reputation: 2020,
    active: true,
  },
  {
    address: '0x4d5e6f7890123456' as AgentAddress,
    owner: '0xdef123456789',
    name: 'DeepMaze',
    wins: 30,
    losses: 20,
    reputation: 1850,
    active: true,
  },
  {
    address: '0x5e6f789012345678' as AgentAddress,
    owner: '0xef12345678ab',
    name: 'ShadowRunner',
    wins: 28,
    losses: 22,
    reputation: 1790,
    active: true,
  },
];

/** Mock 라이브 매치 */
export const mockMatches: MatchInfo[] = [
  {
    id: 'match-001' as MatchId,
    tournamentId: 'tournament-001' as TournamentId,
    agentA: mockAgents[0]?.address ?? ('0x0' as AgentAddress),
    agentB: mockAgents[1]?.address ?? ('0x0' as AgentAddress),
    agentAName: mockAgents[0]?.name ?? 'Unknown',
    agentBName: mockAgents[1]?.name ?? 'Unknown',
    scoreA: 3420,
    scoreB: 2980,
    winner: null,
    status: 'active',
  },
  {
    id: 'match-002' as MatchId,
    tournamentId: 'tournament-001' as TournamentId,
    agentA: mockAgents[2]?.address ?? ('0x0' as AgentAddress),
    agentB: mockAgents[3]?.address ?? ('0x0' as AgentAddress),
    agentAName: mockAgents[2]?.name ?? 'Unknown',
    agentBName: mockAgents[3]?.name ?? 'Unknown',
    scoreA: 1240,
    scoreB: 1560,
    winner: null,
    status: 'betting',
  },
  {
    id: 'match-003' as MatchId,
    tournamentId: 'tournament-002' as TournamentId,
    agentA: mockAgents[4]?.address ?? ('0x0' as AgentAddress),
    agentB: mockAgents[0]?.address ?? ('0x0' as AgentAddress),
    agentAName: mockAgents[4]?.name ?? 'Unknown',
    agentBName: mockAgents[0]?.name ?? 'Unknown',
    scoreA: 4280,
    scoreB: 4560,
    winner: mockAgents[0]?.address ?? null,
    status: 'completed',
  },
  {
    id: 'match-004' as MatchId,
    tournamentId: 'tournament-002' as TournamentId,
    agentA: mockAgents[1]?.address ?? ('0x0' as AgentAddress),
    agentB: mockAgents[3]?.address ?? ('0x0' as AgentAddress),
    agentAName: mockAgents[1]?.name ?? 'Unknown',
    agentBName: mockAgents[3]?.name ?? 'Unknown',
    scoreA: 0,
    scoreB: 0,
    winner: null,
    status: 'pending',
  },
];

/** Mock 토너먼트 */
export const mockTournaments: TournamentInfo[] = [
  {
    id: 'tournament-001' as TournamentId,
    participants: [
      mockAgents[0]?.address ?? ('0x0' as AgentAddress),
      mockAgents[1]?.address ?? ('0x0' as AgentAddress),
      mockAgents[2]?.address ?? ('0x0' as AgentAddress),
      mockAgents[3]?.address ?? ('0x0' as AgentAddress),
      mockAgents[4]?.address ?? ('0x0' as AgentAddress),
    ],
    bracketSize: 8,
    prizePool: 5000000000000000000n, // 5 MON
    status: 'active',
    createdAt: Date.now() - 3600000, // 1시간 전
  },
  {
    id: 'tournament-002' as TournamentId,
    participants: [
      mockAgents[0]?.address ?? ('0x0' as AgentAddress),
      mockAgents[1]?.address ?? ('0x0' as AgentAddress),
      mockAgents[2]?.address ?? ('0x0' as AgentAddress),
    ],
    bracketSize: 8,
    prizePool: 3000000000000000000n, // 3 MON
    status: 'upcoming',
    createdAt: Date.now() - 1800000, // 30분 전
  },
  {
    id: 'tournament-003' as TournamentId,
    participants: Array.from({ length: 16 }, (_, i) => `0x${String(i)}abc` as AgentAddress),
    bracketSize: 16,
    prizePool: 10000000000000000000n, // 10 MON
    status: 'completed',
    createdAt: Date.now() - 86400000, // 1일 전
  },
];

/** Mock 서바이벌 세션 */
export const mockSurvivalSessions: SurvivalSessionInfo[] = [
  {
    id: 'survival-001' as SessionId,
    playerAddress: '0xplayer123456',
    difficulty: 3,
    score: 2480,
    status: 'active',
    createdAt: Date.now() - 600000, // 10분 전
  },
  {
    id: 'survival-002' as SessionId,
    playerAddress: '0xplayer789abc',
    difficulty: 5,
    score: 0,
    status: 'waiting',
    createdAt: Date.now() - 120000, // 2분 전
  },
];

/** Mock 피드 아이템 */
export const mockFeedItems: FeedItem[] = [
  {
    id: 'feed-001',
    type: 'tournament_win',
    description: 'AlphaGhost가 Neon Arena 토너먼트에서 우승했습니다! (상금: 5 MON)',
    timestamp: Date.now() - 180000, // 3분 전
  },
  {
    id: 'feed-002',
    type: 'big_bet',
    description: '익명 플레이어가 QuantumPac에 2.5 MON을 베팅했습니다',
    timestamp: Date.now() - 420000, // 7분 전
  },
  {
    id: 'feed-003',
    type: 'record_break',
    description: 'NeonChaser가 최고 점수 기록을 경신했습니다: 9,840점',
    timestamp: Date.now() - 900000, // 15분 전
  },
  {
    id: 'feed-004',
    type: 'new_agent',
    description: '새로운 에이전트 "PhantomByte"가 아레나에 등록되었습니다',
    timestamp: Date.now() - 1800000, // 30분 전
  },
  {
    id: 'feed-005',
    type: 'survival_complete',
    description: '플레이어 0x7f3e...2a1b가 난이도 5 서바이벌 모드를 완료했습니다!',
    timestamp: Date.now() - 3600000, // 1시간 전
  },
  {
    id: 'feed-006',
    type: 'tournament_win',
    description: 'DeepMaze가 Quantum Cup 준우승을 차지했습니다',
    timestamp: Date.now() - 7200000, // 2시간 전
  },
];

/** Mock 에이전트 랭킹 */
export const mockAgentRankings: AgentRanking[] = mockAgents.map((agent, index) => ({
  rank: index + 1,
  agent,
  elo: 2340 - index * 160,
  winRate: (agent.wins / (agent.wins + agent.losses)) * 100,
}));

/** 상대 시간 포맷팅 (예: "3분 전") */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${String(days)}일 전`;
  if (hours > 0) return `${String(hours)}시간 전`;
  if (minutes > 0) return `${String(minutes)}분 전`;
  return `${String(seconds)}초 전`;
}

/** 주소 축약 (예: "0x1a2b...3c4d") */
export function truncateAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/** MON 포맷팅 (wei → MON) */
export function formatMON(wei: bigint): string {
  const mon = Number(wei) / 1e18;
  return mon.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
}
