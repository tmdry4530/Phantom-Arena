/**
 * Ghost Protocol 게임 엔진 배럴 익스포트
 * 모든 엔진 모듈을 단일 진입점으로 제공한다.
 */

export { MazeManager } from './MazeManager.js';
export { PhysicsEngine } from './PhysicsEngine.js';
export type { PhysicsEntity } from './PhysicsEngine.js';
export { GameStateManager } from './GameStateManager.js';
export type { GameStateManagerConfig } from './GameStateManager.js';
export { RenderBridge } from './RenderBridge.js';
export { ReplayRecorder } from './ReplayRecorder.js';
export type { ReplayMetadata, TickRecord } from './ReplayRecorder.js';
