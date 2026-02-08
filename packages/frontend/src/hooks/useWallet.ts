/**
 * 지갑 연결 및 상호작용을 위한 커스텀 훅
 *
 * wagmi 훅들을 래핑하여 지갑 연결, 서명, 잔액 조회 등의 기능을 제공합니다.
 */

import { useAccount, useConnect, useDisconnect, useSignTypedData, useBalance } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { WAGER_POOL_ADDRESS } from '../lib/contracts.js';
import { monadTestnet } from '../lib/wagmiConfig.js';
import type { Address } from 'viem';

/**
 * 베팅 메시지 서명을 위한 타입 정의
 */
interface BetMessage {
  /** 매치 ID */
  matchId: bigint;
  /** 베팅 측면 (0: AgentA, 1: AgentB) */
  side: number;
  /** 베팅 금액 (wei) */
  amount: bigint;
}

/**
 * useWallet 훅 반환 타입
 */
interface UseWalletReturn {
  /** 연결된 지갑 주소 */
  address: Address | undefined;
  /** 지갑 연결 여부 */
  isConnected: boolean;
  /** 지갑 연결 함수 */
  connect: () => void;
  /** 지갑 연결 해제 함수 */
  disconnect: () => void;
  /** 베팅 메시지 서명 함수 */
  signBetMessage: (
    matchId: bigint,
    side: number,
    amount: bigint,
  ) => Promise<`0x${string}` | undefined>;
  /** 현재 체인에서의 지갑 잔액 (MON) */
  balance: bigint | undefined;
  /** 연결된 체인 ID */
  chainId: number | undefined;
  /** 잔액 로딩 상태 */
  isLoadingBalance: boolean;
  /** 서명 진행 중 여부 */
  isSigningMessage: boolean;
  /** 서명 에러 */
  signError: Error | null;
}

/**
 * 지갑 연결 및 상호작용을 위한 커스텀 훅
 *
 * @returns 지갑 상태 및 제어 함수들
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { address, isConnected, connect, signBetMessage } = useWallet();
 *
 *   const handleBet = async () => {
 *     const signature = await signBetMessage(1n, 0, parseEther('0.1'));
 *     // 서명을 백엔드로 전송하여 베팅 검증
 *   };
 *
 *   return (
 *     <div>
 *       {isConnected ? (
 *         <p>{address}</p>
 *       ) : (
 *         <button onClick={connect}>지갑 연결</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useWallet(): UseWalletReturn {
  const { address, isConnected, chainId } = useAccount();
  const { connect: wagmiConnect } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { signTypedData, isPending: isSigningMessage, error: signError } = useSignTypedData();

  // 현재 체인에서의 잔액 조회
  const { data: balanceData, isLoading: isLoadingBalance } = useBalance({
    address,
    chainId: monadTestnet.id,
  });

  /**
   * 지갑 연결 (injected connector 사용)
   */
  const connect = (): void => {
    wagmiConnect({ connector: injected() });
  };

  /**
   * 지갑 연결 해제
   */
  const disconnect = (): void => {
    wagmiDisconnect();
  };

  /**
   * EIP-712 타입 데이터를 사용한 베팅 메시지 서명
   *
   * 베팅 작업의 진위를 검증하기 위해 사용됩니다.
   * 서명된 메시지는 백엔드로 전송되어 검증 후 베팅이 처리됩니다.
   *
   * @param matchId - 매치 ID
   * @param side - 베팅 측면 (0: AgentA, 1: AgentB)
   * @param amount - 베팅 금액 (wei)
   * @returns 서명된 메시지 (0x로 시작하는 16진수 문자열)
   *
   * @example
   * ```tsx
   * const signature = await signBetMessage(1n, 0, parseEther('0.1'));
   * if (signature) {
   *   await fetch('/api/bet', {
   *     method: 'POST',
   *     body: JSON.stringify({ matchId: 1, side: 0, amount: '100000000000000000', signature })
   *   });
   * }
   * ```
   */
  const signBetMessage = async (
    matchId: bigint,
    side: number,
    amount: bigint,
  ): Promise<`0x${string}` | undefined> => {
    if (!WAGER_POOL_ADDRESS) {
      throw new Error('WagerPool 컨트랙트 주소가 설정되지 않았습니다');
    }

    return new Promise((resolve, reject) => {
      signTypedData(
        {
          domain: {
            name: 'Ghost Protocol',
            version: '1',
            chainId: monadTestnet.id,
            verifyingContract: WAGER_POOL_ADDRESS,
          },
          types: {
            Bet: [
              { name: 'matchId', type: 'uint256' },
              { name: 'side', type: 'uint8' },
              { name: 'amount', type: 'uint256' },
            ],
          },
          primaryType: 'Bet',
          message: {
            matchId,
            side,
            amount,
          } as BetMessage,
        },
        {
          onSuccess: (signature) => {
            resolve(signature);
          },
          onError: (error) => {
            reject(error);
          },
        },
      );
    });
  };

  return {
    address,
    isConnected,
    connect,
    disconnect,
    signBetMessage,
    balance: balanceData?.value,
    chainId,
    isLoadingBalance,
    isSigningMessage,
    signError,
  };
}
