import { Contract, Wallet, JsonRpcProvider, keccak256, ContractTransactionReceipt } from 'ethers';
import pino from 'pino';

const logger = pino({ name: 'result-verifier' });

/** 매치 결과 데이터 */
export interface MatchResultData {
  readonly matchId: number;
  readonly scoreA: number;
  readonly scoreB: number;
  readonly winner: string; // AgentAddress
  readonly replayData: Buffer; // gzip 압축된 리플레이
  readonly replayURI: string; // IPFS URI
}

/** ResultVerifier 설정 */
export interface ResultVerifierConfig {
  readonly rpcUrl: string;
  readonly privateKey: string;
  readonly ghostArenaAddress: string;
}

/** GhostArena ABI (submitResult 함수만) */
const GHOST_ARENA_ABI = [
  'function submitResult(uint256 matchId, uint256 scoreA, uint256 scoreB, address winner, bytes32 gameLogHash, string replayURI) external',
] as const;

/**
 * 결과 검증기
 * 게임 로그 해시를 검증하고 온체인 결과를 제출합니다.
 */
export class ResultVerifier {
  private readonly provider: JsonRpcProvider;
  private readonly wallet: Wallet;
  private readonly arenaContract: Contract;

  constructor(config: ResultVerifierConfig) {
    this.provider = new JsonRpcProvider(config.rpcUrl);
    this.wallet = new Wallet(config.privateKey, this.provider);
    this.arenaContract = new Contract(
      config.ghostArenaAddress,
      GHOST_ARENA_ABI,
      this.wallet,
    );
  }

  /**
   * 게임 로그 해시 생성
   * @param replayData gzip 압축된 리플레이 데이터
   * @returns keccak256 해시 (bytes32)
   */
  computeGameLogHash(replayData: Buffer): string {
    return keccak256(replayData);
  }

  /**
   * 매치 결과를 온체인에 제출
   * @param result 매치 결과 데이터
   * @returns 트랜잭션 해시
   */
  async submitResult(result: MatchResultData): Promise<string> {
    // 1. 게임 로그 해시 계산
    const gameLogHash = this.computeGameLogHash(result.replayData);

    logger.info({
      matchId: result.matchId,
      gameLogHash,
      winner: result.winner,
    }, '매치 결과 온체인 제출 시작');

    // 2. 온체인 트랜잭션 전송
    try {
      const submitResultFn = this.arenaContract.getFunction('submitResult');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const tx = await submitResultFn(
        result.matchId,
        result.scoreA,
        result.scoreB,
        result.winner,
        gameLogHash,
        result.replayURI,
      );

      // 3. 트랜잭션 확인 대기
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const receipt = (await tx.wait()) as ContractTransactionReceipt;

      logger.info({
        matchId: result.matchId,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      }, '매치 결과 온체인 제출 완료');

      return receipt.hash;
    } catch (error) {
      logger.error({
        matchId: result.matchId,
        error: error instanceof Error ? error.message : String(error),
      }, '매치 결과 온체인 제출 실패');
      throw error;
    }
  }

  /**
   * 리플레이 데이터 무결성 검증
   * @param replayData 원본 리플레이 데이터
   * @param expectedHash 예상되는 해시
   * @returns 무결성 일치 여부
   */
  verifyIntegrity(replayData: Buffer, expectedHash: string): boolean {
    const computedHash = this.computeGameLogHash(replayData);
    return computedHash === expectedHash;
  }
}
