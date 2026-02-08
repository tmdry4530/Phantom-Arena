/** 토너먼트 목업 데이터 */

import type {
  TournamentInfo,
  TournamentId,
  AgentAddress,
  BracketRound,
  MatchId,
} from '@/types/tournament';

/** 8강 토너먼트 목업 데이터 */
export const mockTournament: TournamentInfo = {
  id: 'tournament-001' as TournamentId,
  participants: [
    '0x1111111111111111111111111111111111111111',
    '0x2222222222222222222222222222222222222222',
    '0x3333333333333333333333333333333333333333',
    '0x4444444444444444444444444444444444444444',
    '0x5555555555555555555555555555555555555555',
    '0x6666666666666666666666666666666666666666',
    '0x7777777777777777777777777777777777777777',
    '0x8888888888888888888888888888888888888888',
  ] as unknown as readonly AgentAddress[],
  bracketSize: 8,
  prizePool: 10000000000000000000n, // 10 MON
  status: 'active',
  createdAt: Date.now() - 3600000, // 1시간 전
};

/** 8강 브래킷 라운드 데이터 */
export const mockBracketRounds: readonly BracketRound[] = [
  {
    name: '8강',
    matches: [
      {
        id: 'match-qf-1' as MatchId,
        agentA: {
          name: 'AlphaGhost',
          address: '0x1111111111111111111111111111111111111111',
          score: 2850,
        },
        agentB: {
          name: 'NeonChaser',
          address: '0x2222222222222222222222222222222222222222',
          score: 2340,
        },
        winner: '0x1111111111111111111111111111111111111111',
        status: 'completed',
      },
      {
        id: 'match-qf-2' as MatchId,
        agentA: {
          name: 'QuantumPac',
          address: '0x3333333333333333333333333333333333333333',
          score: 3120,
        },
        agentB: {
          name: 'DeepMaze',
          address: '0x4444444444444444444444444444444444444444',
          score: 2890,
        },
        winner: '0x3333333333333333333333333333333333333333',
        status: 'completed',
      },
      {
        id: 'match-qf-3' as MatchId,
        agentA: {
          name: 'ByteHunter',
          address: '0x5555555555555555555555555555555555555555',
          score: 1820,
        },
        agentB: {
          name: 'CryptoPhantom',
          address: '0x6666666666666666666666666666666666666666',
          score: 2150,
        },
        winner: null,
        status: 'active',
      },
      {
        id: 'match-qf-4' as MatchId,
        agentA: {
          name: 'MazeRunner',
          address: '0x7777777777777777777777777777777777777777',
          score: null,
        },
        agentB: {
          name: 'GhostKing',
          address: '0x8888888888888888888888888888888888888888',
          score: null,
        },
        winner: null,
        status: 'betting',
      },
    ],
  },
  {
    name: '준결승',
    matches: [
      {
        id: 'match-sf-1' as MatchId,
        agentA: {
          name: 'AlphaGhost',
          address: '0x1111111111111111111111111111111111111111',
          score: null,
        },
        agentB: {
          name: 'QuantumPac',
          address: '0x3333333333333333333333333333333333333333',
          score: null,
        },
        winner: null,
        status: 'pending',
      },
      {
        id: 'match-sf-2' as MatchId,
        agentA: {
          name: 'TBD',
          address: '',
          score: null,
        },
        agentB: {
          name: 'TBD',
          address: '',
          score: null,
        },
        winner: null,
        status: 'pending',
      },
    ],
  },
  {
    name: '결승',
    matches: [
      {
        id: 'match-final' as MatchId,
        agentA: {
          name: 'TBD',
          address: '',
          score: null,
        },
        agentB: {
          name: 'TBD',
          address: '',
          score: null,
        },
        winner: null,
        status: 'pending',
      },
    ],
  },
  {
    name: '우승',
    matches: [
      {
        id: 'match-champion' as MatchId,
        agentA: {
          name: 'TBD',
          address: '',
          score: null,
        },
        agentB: {
          name: '',
          address: '',
          score: null,
        },
        winner: null,
        status: 'pending',
      },
    ],
  },
];

/** 에이전트 이름 매핑 */
export const agentNames: Record<string, string> = {
  '0x1111111111111111111111111111111111111111': 'AlphaGhost',
  '0x2222222222222222222222222222222222222222': 'NeonChaser',
  '0x3333333333333333333333333333333333333333': 'QuantumPac',
  '0x4444444444444444444444444444444444444444': 'DeepMaze',
  '0x5555555555555555555555555555555555555555': 'ByteHunter',
  '0x6666666666666666666666666666666666666666': 'CryptoPhantom',
  '0x7777777777777777777777777777777777777777': 'MazeRunner',
  '0x8888888888888888888888888888888888888888': 'GhostKing',
};
