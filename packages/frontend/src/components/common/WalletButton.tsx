import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

/** 지갑 연결 버튼 컴포넌트 */
export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = () => {
    connect({ connector: injected() });
  };

  const handleDisconnect = () => {
    disconnect();
  };

  if (isConnected && address) {
    return (
      <button
        onClick={handleDisconnect}
        className="flex items-center gap-2 rounded-lg bg-arena-card px-4 py-2 text-sm font-medium text-white transition-all hover:bg-arena-surface hover:neon-glow"
      >
        <span className="h-2 w-2 rounded-full bg-green-500"></span>
        <span>{`${address.slice(0, 6)}...${address.slice(-4)}`}</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="rounded-lg bg-ghost-violet px-4 py-2 text-sm font-medium text-white transition-all hover:bg-ghost-violet-dark hover:neon-glow"
    >
      지갑 연결
    </button>
  );
}
