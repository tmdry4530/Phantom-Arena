/**
 * Ghost Protocol 커스텀 에러 클래스
 * 모든 에러는 Error를 확장하며, 원시 문자열을 throw하지 않음
 */

/** 기본 Ghost Protocol 에러 */
export class GhostProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GhostProtocolError';
  }
}

/** 게임 엔진 에러 */
export class GameEngineError extends GhostProtocolError {
  constructor(message: string) {
    super(message);
    this.name = 'GameEngineError';
  }
}

/** 에이전트 실행 에러 */
export class AgentExecutionError extends GhostProtocolError {
  /** 에이전트 주소 */
  readonly agentAddress: string;

  constructor(message: string, agentAddress: string) {
    super(message);
    this.name = 'AgentExecutionError';
    this.agentAddress = agentAddress;
  }
}

/** 에이전트 타임아웃 에러 (100ms 초과) */
export class AgentTimeoutError extends AgentExecutionError {
  constructor(agentAddress: string) {
    super('에이전트 행동 타임아웃 (100ms 초과)', agentAddress);
    this.name = 'AgentTimeoutError';
  }
}

/** 배팅 관련 에러 */
export class BettingError extends GhostProtocolError {
  constructor(message: string) {
    super(message);
    this.name = 'BettingError';
  }
}

/** 배팅 창 닫힘 에러 */
export class BettingWindowClosedError extends BettingError {
  constructor() {
    super('배팅 창이 이미 닫혔습니다');
    this.name = 'BettingWindowClosedError';
  }
}

/** 금액 범위 에러 */
export class BetAmountError extends BettingError {
  constructor(amount: bigint, min: bigint, max: bigint) {
    super(`배팅 금액이 범위를 벗어났습니다: ${amount.toString()} (최소: ${min.toString()}, 최대: ${max.toString()})`);
    this.name = 'BetAmountError';
  }
}

/** 인증 에러 */
export class AuthenticationError extends GhostProtocolError {
  constructor(message: string = '유효하지 않은 지갑 서명입니다') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/** 리소스 미발견 에러 */
export class NotFoundError extends GhostProtocolError {
  /** 리소스 타입 */
  readonly resourceType: string;
  /** 리소스 식별자 */
  readonly resourceId: string;

  constructor(resourceType: string, resourceId: string) {
    super(`${resourceType}을(를) 찾을 수 없습니다: ${resourceId}`);
    this.name = 'NotFoundError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/** 레이트 리밋 에러 */
export class RateLimitError extends GhostProtocolError {
  /** 재시도까지 남은 시간 (초) */
  readonly retryAfter: number;

  constructor(retryAfter: number) {
    super(`요청 한도를 초과했습니다. ${String(retryAfter)}초 후 재시도하세요.`);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/** 스마트 컨트랙트 에러 */
export class ContractError extends GhostProtocolError {
  /** 컨트랙트 이름 */
  readonly contractName: string;

  constructor(contractName: string, message: string) {
    super(`[${contractName}] ${message}`);
    this.name = 'ContractError';
    this.contractName = contractName;
  }
}

/** WebSocket 연결 에러 */
export class WebSocketError extends GhostProtocolError {
  constructor(message: string) {
    super(message);
    this.name = 'WebSocketError';
  }
}
