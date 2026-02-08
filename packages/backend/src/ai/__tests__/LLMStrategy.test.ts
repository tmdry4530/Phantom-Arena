/**
 * LLMStrategy 모듈 단위 테스트
 * ClaudeLLMStrategy, TokenBucketRateLimiter, LLMResponseCache, PatternAnalyzer,
 * isValidPosition, isValidRawResponse 검증
 *
 * 내부 클래스/함수는 export 되지 않으므로 ClaudeLLMStrategy.requestStrategy()를
 * 통해 간접적으로 테스트한다.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Position, Direction, GhostId } from '@ghost-protocol/shared';
import { MAZE_WIDTH, MAZE_HEIGHT } from '@ghost-protocol/shared';
import { ClaudeLLMStrategy } from '../LLMStrategy.js';
import type { LLMStrategyConfig } from '../LLMStrategy.js';
import type { LLMStrategyRequest } from '../DifficultyManager.js';

// ===== Anthropic SDK 모킹 =====

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'APIError';
    }
  }

  // default export는 클래스(생성자)이며 Anthropic.APIError로 접근됨
  const AnthropicConstructor = vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }));
  // Anthropic.APIError 정적 프로퍼티 설정
  (AnthropicConstructor as unknown as Record<string, unknown>)['APIError'] = APIError;

  return {
    default: AnthropicConstructor,
  };
});

// ===== 헬퍼 함수 =====

/** 유효한 LLMStrategyRequest 생성 헬퍼 */
function createMockRequest(overrides?: Partial<LLMStrategyRequest>): LLMStrategyRequest {
  const ghostPositions = new Map<GhostId, Position>([
    ['blinky', { x: 14, y: 11 }],
    ['pinky', { x: 12, y: 14 }],
    ['inky', { x: 16, y: 14 }],
    ['clyde', { x: 14, y: 14 }],
  ]);
  return {
    pacmanPosition: { x: 14, y: 23 },
    pacmanDirection: 'right' as Direction,
    ghostPositions,
    recentPacmanMoves: ['right', 'right', 'up'] as Direction[],
    remainingPellets: 100,
    currentTick: 600,
    ...overrides,
  };
}

/** 유효한 API 응답 생성 헬퍼 */
function createValidApiResponse() {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          targets: {
            blinky: { x: 13, y: 22 },
            pinky: { x: 15, y: 22 },
            inky: { x: 13, y: 24 },
            clyde: { x: 15, y: 24 },
          },
          strategy: '팩맨을 4방향에서 포위하는 전략',
          confidence: 0.85,
        }),
      },
    ],
  };
}

/** 기본 LLMStrategyConfig 생성 */
function createDefaultConfig(overrides?: Partial<LLMStrategyConfig>): LLMStrategyConfig {
  return {
    apiKey: 'test-api-key',
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 512,
    maxRequestsPerMinute: 30,
    cacheTTLMs: 2000,
    enableHistoricalAnalysis: false,
    ...overrides,
  };
}

// ===== 테스트 =====

describe('ClaudeLLMStrategy', () => {
  let strategy: ClaudeLLMStrategy;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    strategy = new ClaudeLLMStrategy(createDefaultConfig());
  });

  // --------------------------------------------------
  // 1. 기본 생성 및 유효한 API 응답 처리
  // --------------------------------------------------

  describe('유효한 API 응답 처리', () => {
    it('유효한 응답 시 ghostTargets Map을 올바르게 생성한다', async () => {
      mockCreate.mockResolvedValueOnce(createValidApiResponse());

      const request = createMockRequest();
      const result = await strategy.requestStrategy(request);

      expect(result.ghostTargets.size).toBe(4);
      expect(result.ghostTargets.get('blinky')).toEqual({ x: 13, y: 22 });
      expect(result.ghostTargets.get('pinky')).toEqual({ x: 15, y: 22 });
      expect(result.ghostTargets.get('inky')).toEqual({ x: 13, y: 24 });
      expect(result.ghostTargets.get('clyde')).toEqual({ x: 15, y: 24 });
    });

    it('전략 설명과 신뢰도를 올바르게 반환한다', async () => {
      mockCreate.mockResolvedValueOnce(createValidApiResponse());

      const result = await strategy.requestStrategy(createMockRequest());

      expect(result.strategy).toBe('팩맨을 4방향에서 포위하는 전략');
      expect(result.confidence).toBe(0.85);
    });

    it('API를 올바른 파라미터로 호출한다', async () => {
      mockCreate.mockResolvedValueOnce(createValidApiResponse());

      await strategy.requestStrategy(createMockRequest());

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(callArgs['model']).toBe('claude-haiku-4-5-20251001');
      expect(callArgs['max_tokens']).toBe(512);
      expect(typeof callArgs['system']).toBe('string');
      expect(Array.isArray(callArgs['messages'])).toBe(true);
      expect(callArgs['messages']).toEqual(
        expect.arrayContaining([expect.objectContaining({ role: 'user' })]),
      );
    });
  });

  // --------------------------------------------------
  // 2. isValidPosition (간접 테스트: API 응답 내 좌표 검증)
  // --------------------------------------------------

  describe('isValidPosition (간접 검증)', () => {
    it('타겟 좌표에 NaN이 포함되면 해당 고스트를 무시한다', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              targets: {
                blinky: { x: NaN, y: 22 },
                pinky: { x: 15, y: 22 },
                inky: { x: 13, y: NaN },
                clyde: { x: 15, y: 24 },
              },
              strategy: '부분 좌표 오류 전략',
              confidence: 0.5,
            }),
          },
        ],
      });

      const result = await strategy.requestStrategy(createMockRequest());

      // NaN 좌표를 가진 blinky, inky는 제외
      expect(result.ghostTargets.has('blinky')).toBe(false);
      expect(result.ghostTargets.has('inky')).toBe(false);
      expect(result.ghostTargets.get('pinky')).toEqual({ x: 15, y: 22 });
      expect(result.ghostTargets.get('clyde')).toEqual({ x: 15, y: 24 });
    });

    it('타겟 좌표에 Infinity가 포함되면 해당 고스트를 무시한다', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              targets: {
                blinky: { x: Infinity, y: 22 },
                pinky: { x: 15, y: -Infinity },
                inky: { x: 13, y: 24 },
                clyde: { x: 15, y: 24 },
              },
              strategy: 'Infinity 좌표 전략',
              confidence: 0.5,
            }),
          },
        ],
      });

      const result = await strategy.requestStrategy(createMockRequest());

      expect(result.ghostTargets.has('blinky')).toBe(false);
      expect(result.ghostTargets.has('pinky')).toBe(false);
      expect(result.ghostTargets.get('inky')).toEqual({ x: 13, y: 24 });
      expect(result.ghostTargets.get('clyde')).toEqual({ x: 15, y: 24 });
    });

    it('타겟이 문자열이면 해당 고스트를 무시한다', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              targets: {
                blinky: 'invalid',
                pinky: { x: 15, y: 22 },
                inky: null,
                clyde: { x: 15, y: 24 },
              },
              strategy: '부분 유효 전략',
              confidence: 0.5,
            }),
          },
        ],
      });

      const result = await strategy.requestStrategy(createMockRequest());

      expect(result.ghostTargets.has('blinky')).toBe(false);
      expect(result.ghostTargets.has('inky')).toBe(false);
      expect(result.ghostTargets.size).toBe(2);
    });

    it('x/y가 숫자가 아닌 경우 해당 고스트를 무시한다', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              targets: {
                blinky: { x: '13', y: 22 },
                pinky: { x: 15, y: '22' },
                inky: { x: 13, y: 24 },
                clyde: { x: 15, y: 24 },
              },
              strategy: '문자열 좌표 전략',
              confidence: 0.7,
            }),
          },
        ],
      });

      const result = await strategy.requestStrategy(createMockRequest());

      // 문자열 x/y를 가진 blinky, pinky는 isValidPosition에서 거부됨
      expect(result.ghostTargets.has('blinky')).toBe(false);
      expect(result.ghostTargets.has('pinky')).toBe(false);
      expect(result.ghostTargets.get('inky')).toEqual({ x: 13, y: 24 });
    });
  });

  // --------------------------------------------------
  // 3. isValidRawResponse (간접 테스트: 응답 구조 검증)
  // --------------------------------------------------

  describe('isValidRawResponse (간접 검증)', () => {
    it('targets 필드가 없으면 폴백 응답을 반환한다', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              strategy: '타겟 없는 전략',
              confidence: 0.5,
            }),
          },
        ],
      });

      const result = await strategy.requestStrategy(createMockRequest());

      expect(result.ghostTargets.size).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it('strategy가 문자열이 아니면 폴백 응답을 반환한다', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              targets: { blinky: { x: 13, y: 22 } },
              strategy: 123,
              confidence: 0.5,
            }),
          },
        ],
      });

      const result = await strategy.requestStrategy(createMockRequest());

      expect(result.ghostTargets.size).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it('confidence가 숫자가 아니면 폴백 응답을 반환한다', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              targets: { blinky: { x: 13, y: 22 } },
              strategy: '전략',
              confidence: 'high',
            }),
          },
        ],
      });

      const result = await strategy.requestStrategy(createMockRequest());

      expect(result.ghostTargets.size).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it('confidence가 NaN이면 폴백 응답을 반환한다', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              targets: { blinky: { x: 13, y: 22 } },
              strategy: '전략',
              confidence: null,
            }),
          },
        ],
      });

      const result = await strategy.requestStrategy(createMockRequest());

      // null은 typeof === 'object'이므로 숫자가 아님 -> 폴백
      expect(result.ghostTargets.size).toBe(0);
    });
  });

  // --------------------------------------------------
  // 4. TokenBucketRateLimiter (간접 테스트: 연속 요청으로 레이트 리밋 트리거)
  // --------------------------------------------------

  describe('TokenBucketRateLimiter (간접 검증)', () => {
    it('분당 최대 요청 수 초과 시 폴백 응답을 반환한다', async () => {
      const limitedStrategy = new ClaudeLLMStrategy(
        createDefaultConfig({ maxRequestsPerMinute: 2 }),
      );

      // 각 요청은 서로 다른 캐시 키를 생성해야 하므로 remainingPellets를 변경
      // (currentTick은 캐시 키에 포함되지 않음)
      mockCreate.mockResolvedValue(createValidApiResponse());

      const result1 = await limitedStrategy.requestStrategy(
        createMockRequest({ remainingPellets: 100 }),
      );
      expect(result1.ghostTargets.size).toBe(4); // 성공

      const result2 = await limitedStrategy.requestStrategy(
        createMockRequest({ remainingPellets: 99 }),
      );
      expect(result2.ghostTargets.size).toBe(4); // 성공

      // 3번째 요청: 토큰 소진 -> 폴백 (마지막 성공 응답 반환)
      const result3 = await limitedStrategy.requestStrategy(
        createMockRequest({ remainingPellets: 98 }),
      );
      // 폴백이므로 API 호출은 2번만
      expect(mockCreate).toHaveBeenCalledTimes(2);
      // 마지막 성공 응답이 캐시되어 반환됨
      expect(result3.ghostTargets.size).toBe(4);
      expect(result3.strategy).toBe('팩맨을 4방향에서 포위하는 전략');
    });

    it('이전 성공 응답이 없을 때 레이트 리밋 초과 시 빈 폴백 반환', async () => {
      const limitedStrategy = new ClaudeLLMStrategy(
        createDefaultConfig({ maxRequestsPerMinute: 0 }),
      );

      // maxRequestsPerMinute=0이면 처음부터 토큰이 0
      const result = await limitedStrategy.requestStrategy(createMockRequest());

      expect(result.ghostTargets.size).toBe(0);
      expect(result.strategy).toBe('폴백: LLM 응답 불가, 기본 AI 사용');
      expect(result.confidence).toBe(0);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('시간 경과 후 토큰이 보충되어 다시 요청 가능하다', async () => {
      vi.useFakeTimers();

      const limitedStrategy = new ClaudeLLMStrategy(
        createDefaultConfig({ maxRequestsPerMinute: 1, cacheTTLMs: 100 }),
      );

      mockCreate.mockResolvedValue(createValidApiResponse());

      // 첫 번째 요청: 성공
      const result1 = await limitedStrategy.requestStrategy(
        createMockRequest({ remainingPellets: 100 }),
      );
      expect(result1.ghostTargets.size).toBe(4);

      // 즉시 두 번째 요청: 토큰 소진 -> 폴백
      await limitedStrategy.requestStrategy(
        createMockRequest({ remainingPellets: 99 }),
      );
      // 폴백이지만 마지막 성공 응답이 있으므로 ghostTargets.size === 4
      expect(mockCreate).toHaveBeenCalledTimes(1);

      // 1분(60초) 경과 -> 토큰 보충 + 캐시 만료
      vi.advanceTimersByTime(60_000);

      // 세 번째 요청: 토큰 보충으로 성공
      const result3 = await limitedStrategy.requestStrategy(
        createMockRequest({ remainingPellets: 98 }),
      );
      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(result3.ghostTargets.size).toBe(4);

      vi.useRealTimers();
    });
  });

  // --------------------------------------------------
  // 5. LLMResponseCache (간접 테스트: 동일 요청 캐시 히트)
  // --------------------------------------------------

  describe('LLMResponseCache (간접 검증)', () => {
    it('동일한 요청을 두 번 보내면 캐시 히트로 API를 한 번만 호출한다', async () => {
      mockCreate.mockResolvedValue(createValidApiResponse());

      const request = createMockRequest();
      const result1 = await strategy.requestStrategy(request);
      const result2 = await strategy.requestStrategy(request);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(result1.strategy).toBe(result2.strategy);
      expect(result1.confidence).toBe(result2.confidence);
    });

    it('ghostPositions 순서가 달라도 동일한 캐시 키를 생성한다', async () => {
      mockCreate.mockResolvedValue(createValidApiResponse());

      // 순서가 다른 두 Map
      const ghostPositionsA = new Map<GhostId, Position>([
        ['blinky', { x: 14, y: 11 }],
        ['pinky', { x: 12, y: 14 }],
        ['inky', { x: 16, y: 14 }],
        ['clyde', { x: 14, y: 14 }],
      ]);
      const ghostPositionsB = new Map<GhostId, Position>([
        ['clyde', { x: 14, y: 14 }],
        ['inky', { x: 16, y: 14 }],
        ['blinky', { x: 14, y: 11 }],
        ['pinky', { x: 12, y: 14 }],
      ]);

      await strategy.requestStrategy(createMockRequest({ ghostPositions: ghostPositionsA }));
      await strategy.requestStrategy(createMockRequest({ ghostPositions: ghostPositionsB }));

      // 캐시 히트로 1번만 호출
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('캐시 TTL 만료 후 다시 API를 호출한다', async () => {
      vi.useFakeTimers();

      const shortCacheStrategy = new ClaudeLLMStrategy(
        createDefaultConfig({ cacheTTLMs: 500 }),
      );

      mockCreate.mockResolvedValue(createValidApiResponse());

      const request = createMockRequest();
      await shortCacheStrategy.requestStrategy(request);
      expect(mockCreate).toHaveBeenCalledTimes(1);

      // TTL 만료 전 -> 캐시 히트
      vi.advanceTimersByTime(400);
      await shortCacheStrategy.requestStrategy(request);
      expect(mockCreate).toHaveBeenCalledTimes(1);

      // TTL 만료 후 -> 새 API 호출
      vi.advanceTimersByTime(200); // 총 600ms > 500ms
      await shortCacheStrategy.requestStrategy(request);
      expect(mockCreate).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('다른 요청 데이터는 서로 다른 캐시 키를 생성한다', async () => {
      mockCreate.mockResolvedValue(createValidApiResponse());

      await strategy.requestStrategy(createMockRequest({ remainingPellets: 100 }));
      await strategy.requestStrategy(createMockRequest({ remainingPellets: 50 }));

      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
  });

  // --------------------------------------------------
  // 6. 좌표 범위 클램핑
  // --------------------------------------------------

  describe('좌표 범위 클램핑', () => {
    it('미로 경계를 초과하는 좌표를 클램프한다', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              targets: {
                blinky: { x: 50, y: 60 },
                pinky: { x: -5, y: -10 },
                inky: { x: 13, y: 24 },
                clyde: { x: 15, y: 24 },
              },
              strategy: '경계 초과 좌표 테스트',
              confidence: 0.8,
            }),
          },
        ],
      });

      const result = await strategy.requestStrategy(createMockRequest());

      // x: max=MAZE_WIDTH-1=27, y: max=MAZE_HEIGHT-1=30
      expect(result.ghostTargets.get('blinky')).toEqual({
        x: MAZE_WIDTH - 1,
        y: MAZE_HEIGHT - 1,
      });
      expect(result.ghostTargets.get('pinky')).toEqual({ x: 0, y: 0 });
      expect(result.ghostTargets.get('inky')).toEqual({ x: 13, y: 24 });
    });

    it('소수점 좌표를 반올림한다', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              targets: {
                blinky: { x: 13.7, y: 22.3 },
                pinky: { x: 15.5, y: 22.5 },
                inky: { x: 13, y: 24 },
                clyde: { x: 15, y: 24 },
              },
              strategy: '소수점 좌표 반올림',
              confidence: 0.8,
            }),
          },
        ],
      });

      const result = await strategy.requestStrategy(createMockRequest());

      expect(result.ghostTargets.get('blinky')).toEqual({ x: 14, y: 22 });
      expect(result.ghostTargets.get('pinky')).toEqual({ x: 16, y: 23 });
    });

    it('신뢰도를 0~1 범위로 클램프한다', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              targets: {
                blinky: { x: 13, y: 22 },
              },
              strategy: '신뢰도 초과',
              confidence: 1.5,
            }),
          },
        ],
      });

      const result = await strategy.requestStrategy(createMockRequest());
      expect(result.confidence).toBe(1);
    });

    it('음수 신뢰도를 0으로 클램프한다', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              targets: {
                blinky: { x: 13, y: 22 },
              },
              strategy: '음수 신뢰도',
              confidence: -0.5,
            }),
          },
        ],
      });

      const result = await strategy.requestStrategy(createMockRequest());
      expect(result.confidence).toBe(0);
    });
  });

  // --------------------------------------------------
  // 7. JSON 파싱 오류 처리
  // --------------------------------------------------

  describe('JSON 파싱 오류 처리', () => {
    it('잘못된 JSON 응답 시 폴백 응답을 반환한다', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: '이것은 JSON이 아닙니다 {invalid json',
          },
        ],
      });

      const result = await strategy.requestStrategy(createMockRequest());

      expect(result.ghostTargets.size).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it('코드 블록으로 감싸진 JSON도 올바르게 파싱한다', async () => {
      const jsonContent = JSON.stringify({
        targets: {
          blinky: { x: 13, y: 22 },
          pinky: { x: 15, y: 22 },
          inky: { x: 13, y: 24 },
          clyde: { x: 15, y: 24 },
        },
        strategy: '코드 블록 응답 전략',
        confidence: 0.9,
      });

      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: `\`\`\`json\n${jsonContent}\n\`\`\``,
          },
        ],
      });

      const result = await strategy.requestStrategy(createMockRequest());

      expect(result.ghostTargets.size).toBe(4);
      expect(result.strategy).toBe('코드 블록 응답 전략');
    });

    it('응답에 텍스트 블록이 없으면 폴백 응답을 반환한다', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'tool_use' as const,
            id: 'tool1',
            name: 'test',
            input: {},
          },
        ],
      });

      const result = await strategy.requestStrategy(createMockRequest());

      expect(result.ghostTargets.size).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it('모든 고스트 좌표가 유효하지 않으면 폴백 응답을 반환한다', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              targets: {
                blinky: { x: NaN, y: NaN },
                pinky: null,
                inky: 'invalid',
                clyde: { x: Infinity, y: 22 },
              },
              strategy: '모두 무효',
              confidence: 0.5,
            }),
          },
        ],
      });

      const result = await strategy.requestStrategy(createMockRequest());

      // 유효한 타겟이 0개이므로 parseAndValidateResponse가 null을 반환 -> 폴백
      expect(result.ghostTargets.size).toBe(0);
      expect(result.confidence).toBe(0);
    });
  });

  // --------------------------------------------------
  // 8. API 에러 처리
  // --------------------------------------------------

  describe('API 에러 처리', () => {
    it('API 에러 발생 시 예외를 던지지 않고 폴백 응답을 반환한다', async () => {
      mockCreate.mockRejectedValueOnce(new Error('네트워크 오류'));

      const result = await strategy.requestStrategy(createMockRequest());

      expect(result.ghostTargets.size).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it('API 에러 후 이전 성공 응답이 있으면 그것을 폴백으로 사용한다', async () => {
      // 첫 번째 요청: 성공
      mockCreate.mockResolvedValueOnce(createValidApiResponse());
      await strategy.requestStrategy(createMockRequest({ currentTick: 100 }));

      // 두 번째 요청: 실패
      mockCreate.mockRejectedValueOnce(new Error('서버 오류'));
      const result = await strategy.requestStrategy(createMockRequest({ currentTick: 200 }));

      // 이전 성공 응답이 폴백으로 사용됨
      expect(result.ghostTargets.size).toBe(4);
      expect(result.strategy).toBe('팩맨을 4방향에서 포위하는 전략');
    });

    it('알 수 없는 타입의 에러도 안전하게 처리한다', async () => {
      mockCreate.mockRejectedValueOnce('문자열 에러');

      const result = await strategy.requestStrategy(createMockRequest());

      expect(result.ghostTargets.size).toBe(0);
      expect(result.confidence).toBe(0);
    });
  });

  // --------------------------------------------------
  // 9. PatternAnalyzer (간접 테스트: enableHistoricalAnalysis 활성화)
  // --------------------------------------------------

  describe('PatternAnalyzer (간접 검증 — enableHistoricalAnalysis)', () => {
    let tier5Strategy: ClaudeLLMStrategy;

    beforeEach(() => {
      tier5Strategy = new ClaudeLLMStrategy(
        createDefaultConfig({ enableHistoricalAnalysis: true }),
      );
    });

    it('enableHistoricalAnalysis 활성화 시 Tier 5 프롬프트(고급 분석 데이터)를 사용한다', async () => {
      mockCreate.mockResolvedValueOnce(createValidApiResponse());

      await tier5Strategy.requestStrategy(createMockRequest());

      const callArgs = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
      const messages = callArgs['messages'] as Array<{ role: string; content: string }>;
      const userMessage = messages[0]?.content ?? '';

      // Tier 5 프롬프트에만 존재하는 키워드 확인
      expect(userMessage).toContain('고급 분석 데이터 (Tier 5)');
      expect(userMessage).toContain('이동 패턴 분석');
      expect(userMessage).toContain('예측 팩맨 위치 (3틱 후)');
    });

    it('enableHistoricalAnalysis 비활성화 시 Tier 4 프롬프트(기본)를 사용한다', async () => {
      mockCreate.mockResolvedValueOnce(createValidApiResponse());

      await strategy.requestStrategy(createMockRequest());

      const callArgs = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
      const messages = callArgs['messages'] as Array<{ role: string; content: string }>;
      const userMessage = messages[0]?.content ?? '';

      // Tier 5 키워드가 없어야 함
      expect(userMessage).not.toContain('고급 분석 데이터 (Tier 5)');
      // 기본 프롬프트 키워드 확인
      expect(userMessage).toContain('현재 게임 상태');
      expect(userMessage).toContain('팩맨');
    });

    it('연속 호출 시 패턴 분석기에 데이터가 축적되어 요약에 반영된다', async () => {
      mockCreate.mockResolvedValue(createValidApiResponse());

      // 여러 요청을 보내서 패턴 분석기에 데이터 축적
      for (let tick = 0; tick < 5; tick++) {
        await tier5Strategy.requestStrategy(
          createMockRequest({
            currentTick: tick * 100,
            pacmanDirection: 'right',
            pacmanPosition: { x: 14 + tick, y: 23 },
            remainingPellets: 100 - tick, // 캐시 키를 다르게 하기 위함
          }),
        );
      }

      // 마지막 호출의 프롬프트 내용 확인
      const lastCallArgs = mockCreate.mock.lastCall?.[0] as Record<string, unknown>;
      const messages = lastCallArgs['messages'] as Array<{ role: string; content: string }>;
      const userMessage = messages[0]?.content ?? '';

      expect(userMessage).toContain('분석 데이터:');
      expect(userMessage).toContain('최다 빈도 방향: right');
    });

    it('PatternAnalyzer의 predictPosition이 미로 경계 내로 클램프된 값을 프롬프트에 포함한다', async () => {
      mockCreate.mockResolvedValue(createValidApiResponse());

      // 오른쪽 끝에서 오른쪽으로 이동 -> 3틱 후 예측 위치는 경계 클램프됨
      await tier5Strategy.requestStrategy(
        createMockRequest({
          pacmanPosition: { x: MAZE_WIDTH - 1, y: 15 },
          pacmanDirection: 'right',
        }),
      );

      const callArgs = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
      const messages = callArgs['messages'] as Array<{ role: string; content: string }>;
      const userMessage = messages[0]?.content ?? '';

      // 예측 위치 x는 최대 MAZE_WIDTH-1=27로 클램프됨
      expect(userMessage).toContain(`예측 팩맨 위치 (3틱 후): (${String(MAZE_WIDTH - 1)}, 15)`);
    });
  });

  // --------------------------------------------------
  // 10. 폴백 응답 동작
  // --------------------------------------------------

  describe('폴백 응답', () => {
    it('마지막 성공 응답이 없을 때 기본 빈 폴백을 반환한다', async () => {
      mockCreate.mockRejectedValueOnce(new Error('실패'));

      const result = await strategy.requestStrategy(createMockRequest());

      expect(result.ghostTargets.size).toBe(0);
      expect(result.strategy).toBe('폴백: LLM 응답 불가, 기본 AI 사용');
      expect(result.confidence).toBe(0);
    });

    it('부분적으로 유효한 타겟만 포함된 응답도 처리한다', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              targets: {
                blinky: { x: 13, y: 22 },
                // pinky, inky, clyde 누락
              },
              strategy: '부분 타겟 전략',
              confidence: 0.6,
            }),
          },
        ],
      });

      const result = await strategy.requestStrategy(createMockRequest());

      // 최소 1개의 유효한 타겟이 있으므로 성공
      expect(result.ghostTargets.size).toBe(1);
      expect(result.ghostTargets.get('blinky')).toEqual({ x: 13, y: 22 });
      expect(result.strategy).toBe('부분 타겟 전략');
    });
  });

  // --------------------------------------------------
  // 11. 음수 좌표 처리
  // --------------------------------------------------

  describe('음수 좌표 처리', () => {
    it('음수 좌표는 0으로 클램프된다', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              targets: {
                blinky: { x: -3, y: -5 },
                pinky: { x: 15, y: 22 },
                inky: { x: 13, y: 24 },
                clyde: { x: 15, y: 24 },
              },
              strategy: '음수 좌표 전략',
              confidence: 0.7,
            }),
          },
        ],
      });

      const result = await strategy.requestStrategy(createMockRequest());

      // 음수는 isValidPosition 통과(유한한 숫자) 후 클램프에서 0으로
      expect(result.ghostTargets.get('blinky')).toEqual({ x: 0, y: 0 });
    });
  });

  // --------------------------------------------------
  // 12. 커스텀 설정
  // --------------------------------------------------

  describe('커스텀 설정', () => {
    it('기본 모델과 토큰 설정이 올바르게 적용된다', async () => {
      const customStrategy = new ClaudeLLMStrategy({
        apiKey: 'test-key',
        // model, maxTokens 기본값 사용
      });

      mockCreate.mockResolvedValueOnce(createValidApiResponse());
      await customStrategy.requestStrategy(createMockRequest());

      const callArgs = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(callArgs['model']).toBe('claude-haiku-4-5-20251001');
      expect(callArgs['max_tokens']).toBe(512);
    });

    it('커스텀 모델 이름이 API 호출에 반영된다', async () => {
      const customStrategy = new ClaudeLLMStrategy(
        createDefaultConfig({ model: 'claude-opus-4-20250514' }),
      );

      mockCreate.mockResolvedValueOnce(createValidApiResponse());
      await customStrategy.requestStrategy(createMockRequest());

      const callArgs = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(callArgs['model']).toBe('claude-opus-4-20250514');
    });
  });
});
