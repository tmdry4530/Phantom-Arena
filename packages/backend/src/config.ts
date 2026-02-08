import { z } from 'zod';

/**
 * 환경 변수 스키마 정의
 * 모든 환경 변수를 zod로 검증하여 타입 안전성 보장
 */
const envSchema = z.object({
  /** 서버 포트 */
  PORT: z.coerce.number().default(3001),

  /** Redis 접속 URL */
  REDIS_URL: z.string().default('redis://localhost:6379'),

  /** CORS 허용 출처 */
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  /** Monad RPC URL */
  MONAD_RPC_URL: z.string().default('https://testnet.monad.xyz/v1'),

  /** Monad 체인 ID */
  MONAD_CHAIN_ID: z.coerce.number().default(10143),

  /** 아레나 매니저 개인키 (서버 전용) */
  ARENA_MANAGER_PRIVATE_KEY: z.string().optional(),

  /** 스마트 컨트랙트 주소 */
  GHOST_ARENA_ADDRESS: z.string().optional(),
  WAGER_POOL_ADDRESS: z.string().optional(),
  SURVIVAL_BET_ADDRESS: z.string().optional(),

  /** Claude API 키 (Ghost AI Tier 4+ 전략용) */
  CLAUDE_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().default('claude-sonnet-4-20250514'),

  /** IPFS 설정 */
  PINATA_API_KEY: z.string().optional(),
  PINATA_SECRET_KEY: z.string().optional(),

  /** 실행 환경 */
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/** 환경 변수 타입 */
export type Env = z.infer<typeof envSchema>;

/**
 * 검증된 환경 변수 로드
 * 유효하지 않은 환경 변수가 있으면 에러를 throw
 */
export function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.format();
    console.error('❌ 환경 변수 검증 실패:', formatted);
    throw new Error('환경 변수 검증에 실패했습니다. .env 파일을 확인하세요.');
  }

  return result.data;
}
