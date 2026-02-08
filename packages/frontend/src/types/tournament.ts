/** 토너먼트 브래킷 타입 정의 */

export type TournamentId = string & { readonly __brand: 'TournamentId' };
export type MatchId = string & { readonly __brand: 'MatchId' };
export type AgentAddress = string & { readonly __brand: 'AgentAddress' };
export type TournamentStatus = 'upcoming' | 'active' | 'completed';
export type MatchStatus = 'pending' | 'betting' | 'active' | 'completed' | 'cancelled';

/** 토너먼트 정보 */
export interface TournamentInfo {
  readonly id: TournamentId;
  readonly participants: readonly AgentAddress[];
  readonly bracketSize: 8 | 16;
  readonly prizePool: bigint;
  readonly status: TournamentStatus;
  readonly createdAt: number;
}

/** 매치 정보 */
export interface MatchInfo {
  readonly id: MatchId;
  readonly tournamentId: TournamentId;
  readonly agentA: AgentAddress;
  readonly agentB: AgentAddress;
  readonly scoreA: number;
  readonly scoreB: number;
  readonly winner: AgentAddress | null;
  readonly status: MatchStatus;
}

/** 브래킷 매치 (UI용) */
export interface BracketMatch {
  readonly id: MatchId;
  readonly agentA: {
    readonly name: string;
    readonly address: string;
    readonly score: number | null;
  };
  readonly agentB: {
    readonly name: string;
    readonly address: string;
    readonly score: number | null;
  };
  readonly winner: string | null;
  readonly status: MatchStatus;
}

/** 브래킷 라운드 */
export interface BracketRound {
  readonly name: string;
  readonly matches: readonly BracketMatch[];
}
