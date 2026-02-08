/**
 * AI 모듈 통합 배럴 익스포트
 * 모든 AI 관련 기능과 타입을 중앙에서 관리
 */

export { findPath, getDirectionToTarget, manhattanDistance } from './Pathfinding.js';
export type { PathfindingOptions } from './Pathfinding.js';

export {
  createGhostPersonality,
  getGhostDirection,
} from './GhostPersonality.js';
export type { GhostPersonalityStrategy } from './GhostPersonality.js';

export {
  DifficultyManager,
  createCoordinationStrategy,
} from './DifficultyManager.js';
export type {
  CoordinationStrategy,
  LLMStrategyProvider,
  LLMStrategyRequest,
  LLMStrategyResponse,
} from './DifficultyManager.js';

export { GhostAIController } from './GhostAIController.js';

export { ClaudeLLMStrategy } from './LLMStrategy.js';
export type { LLMStrategyConfig } from './LLMStrategy.js';
