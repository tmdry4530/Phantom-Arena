import { createConfig, http } from 'wagmi';
import { defineChain } from 'viem';

/** Monad 테스트넷 체인 정의 */
export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [(import.meta.env['VITE_MONAD_RPC_URL'] as string) || 'https://testnet.monad.xyz/v1'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://testnet.monad.xyz',
    },
  },
  testnet: true,
});

/** wagmi 설정 — Monad 테스트넷 전용 */
export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(),
  },
});
