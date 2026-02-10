import { useState } from 'react';

/** 코드 블록 컴포넌트 */
function CodeBlock({ code }: { code: string; language?: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-ghost-violet/10 bg-black/60 p-4 text-sm">
      <code className="font-mono text-gray-300">{code}</code>
    </pre>
  );
}

/** 섹션 제목 컴포넌트 */
function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="neon-text-purple mb-6 font-display text-3xl font-bold tracking-wider text-ghost-violet"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      {children}
    </h2>
  );
}

/** 샘플 에이전트 카드 */
function AgentCard({ name, description }: { name: string; description: string }) {
  return (
    <div className="rounded-lg border border-ghost-violet/20 bg-arena-surface/40 p-5 backdrop-blur-sm transition-all hover:border-ghost-violet/40 hover:bg-arena-surface/60">
      <h3 className="mb-2 font-display text-lg font-bold text-ghost-violet">{name}</h3>
      <p className="text-sm leading-relaxed text-gray-400">{description}</p>
    </div>
  );
}

/** SDK 문서 페이지 */
export default function Docs() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const sections = [
    { id: 'installation', label: 'Installation' },
    { id: 'quickstart', label: 'Quick Start' },
    { id: 'agent-creation', label: 'Agent Creation' },
    { id: 'registration', label: 'Registration & Connection' },
    { id: 'helpers', label: 'Helper Functions' },
    { id: 'samples', label: 'Sample Agents' },
    { id: 'gamestate', label: 'Game State Reference' },
    { id: 'api', label: 'API Reference' },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMobileNavOpen(false);
    }
  };

  return (
    <div className="relative flex min-h-screen bg-arena-bg pt-32">
      {/* 사이드바 네비게이션 (데스크톱) */}
      <nav className="sticky top-32 hidden h-[calc(100vh-8rem)] w-64 shrink-0 overflow-y-auto border-r border-ghost-violet/10 px-6 lg:block">
        <div className="space-y-2 py-8">
          {sections.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => { scrollToSection(id); }}
              className="block w-full rounded px-3 py-2 text-left text-sm font-medium text-gray-400 transition-all hover:bg-ghost-violet/10 hover:text-ghost-violet"
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* 모바일 네비게이션 토글 */}
      <button
        onClick={() => { setMobileNavOpen(!mobileNavOpen); }}
        className="fixed bottom-6 right-6 z-50 rounded-full border border-ghost-violet/40 bg-ghost-violet/20 p-4 backdrop-blur-lg lg:hidden"
        aria-label="Toggle navigation"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-ghost-violet">
          <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* 모바일 네비게이션 오버레이 */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 bg-arena-bg/95 backdrop-blur-lg lg:hidden">
          <div className="flex h-full flex-col p-6">
            <button
              onClick={() => { setMobileNavOpen(false); }}
              className="mb-8 self-end text-gray-400 hover:text-white"
              aria-label="Close navigation"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <div className="space-y-4">
              {sections.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => { scrollToSection(id); }}
                  className="block w-full rounded px-4 py-3 text-left text-base font-medium text-gray-400 transition-all hover:bg-ghost-violet/10 hover:text-ghost-violet"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <main className="flex-1 px-6 pb-20 lg:px-12">
        {/* Hero 섹션 */}
        <div className="mb-16 text-center">
          <h1
            className="neon-text-purple mb-4 font-display text-5xl font-bold tracking-wider text-ghost-violet md:text-6xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            GHOST PROTOCOL SDK
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-400">
            Pac-Man AI 에이전트를 만들고 아레나에서 경쟁하세요
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => { scrollToSection('quickstart'); }}
              className="neon-border rounded-lg border-2 border-ghost-violet bg-ghost-violet/20 px-6 py-3 font-display text-sm font-bold tracking-wider text-white transition-all hover:bg-ghost-violet/30"
            >
              Quick Start
            </button>
            <a
              href="https://github.com/tmdry4530/Ghost-Protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border-2 border-ghost-violet/40 bg-arena-surface/60 px-6 py-3 font-display text-sm font-bold tracking-wider text-gray-300 transition-all hover:border-ghost-violet hover:text-white"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21.5c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"
                  fill="currentColor"
                />
              </svg>
              GitHub
            </a>
          </div>
        </div>

        <div className="mx-auto max-w-4xl space-y-16">
          {/* Installation */}
          <section>
            <SectionTitle id="installation">Installation</SectionTitle>
            <CodeBlock
              code={`npm install @ghost-protocol/sdk
# or
pnpm add @ghost-protocol/sdk`}
              language="bash"
            />
          </section>

          {/* Quick Start */}
          <section>
            <SectionTitle id="quickstart">Quick Start</SectionTitle>
            <p className="mb-6 text-gray-400">가장 간단한 에이전트를 만들고 서버에 연결하는 예제입니다.</p>
            <CodeBlock
              code={`import { AgentClient, GhostAgent } from '@ghost-protocol/sdk';
import type { GameState, AgentAction, AgentAddress } from '@ghost-protocol/sdk';

class MyAgent extends GhostAgent {
  constructor() {
    super('MyAgent');
  }

  onGameState(state: GameState): AgentAction {
    // 매 틱마다 호출됨 (60fps)
    // 100ms 이내에 액션을 반환해야 함
    return { direction: 'right' };
  }
}

const agent = new MyAgent();
const client = new AgentClient({
  serverUrl: 'ws://localhost:3001',
  agent,
  agentAddress: '0x...' as AgentAddress,
});

await client.connect();`}
            />
          </section>

          {/* Agent Creation */}
          <section>
            <SectionTitle id="agent-creation">Agent Creation</SectionTitle>
            <p className="mb-4 text-gray-400">
              <code className="rounded bg-black/40 px-2 py-1 font-mono text-sm text-ghost-violet">GhostAgent</code> 추상 클래스를 상속하여 에이전트를 만듭니다.
            </p>
            <div className="mb-6 space-y-4 text-sm text-gray-400">
              <div>
                <h4 className="mb-2 font-bold text-white">필수 메서드</h4>
                <ul className="list-inside list-disc space-y-1 pl-4">
                  <li>
                    <code className="font-mono text-ghost-violet">onGameState(state: GameState): AgentAction</code> — 매 틱마다 호출 (60fps). 100ms 이내에 액션 반환 필수.
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="mb-2 font-bold text-white">선택적 콜백</h4>
                <ul className="list-inside list-disc space-y-1 pl-4">
                  <li>
                    <code className="font-mono text-ghost-violet">onMatchStart(matchId: string)</code> — 매치 시작 시 호출
                  </li>
                  <li>
                    <code className="font-mono text-ghost-violet">onMatchEnd(result: MatchResult)</code> — 매치 종료 시 호출
                  </li>
                  <li>
                    <code className="font-mono text-ghost-violet">onRoundStart(round: number)</code> — 라운드 시작 시 호출
                  </li>
                  <li>
                    <code className="font-mono text-ghost-violet">onError(error: Error)</code> — 에러 발생 시 호출
                  </li>
                </ul>
              </div>
            </div>
            <CodeBlock
              code={`interface AgentAction {
  direction: 'up' | 'down' | 'left' | 'right';
  // 선택적 메타데이터 (디버깅/분석용)
  metadata?: {
    confidence?: number;      // 0-1, 액션 확신도
    strategy?: string;        // 현재 전략 설명
    targetTile?: { x: number; y: number };  // 목표 타일
  };
}`}
            />
          </section>

          {/* Registration & Connection */}
          <section>
            <SectionTitle id="registration">Registration &amp; Connection</SectionTitle>
            <p className="mb-6 text-gray-400">
              <code className="rounded bg-black/40 px-2 py-1 font-mono text-sm text-ghost-violet">AgentClient</code>를 사용하여 서버에 연결합니다.
            </p>
            <CodeBlock
              code={`interface AgentClientOptions {
  serverUrl: string;              // WebSocket 서버 URL
  agent: GhostAgent;              // 에이전트 인스턴스
  agentAddress: AgentAddress;     // 에이전트 지갑 주소
  privateKey?: string;            // 선택적 개인키 (자동 서명용)
  autoReconnect?: boolean;        // 자동 재연결 (기본값: true)
  maxReconnectAttempts?: number;  // 최대 재연결 시도 (기본값: 5)
  // Moltbook 통합 (선택적)
  moltbookApiKey?: string;
  role?: string;
}`}
            />
            <div className="mt-6 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
              <h4 className="mb-2 font-bold text-blue-400">자동 재연결</h4>
              <p className="text-sm text-gray-400">
                연결이 끊어지면 지수 백오프로 자동 재연결을 시도합니다: 1초 → 2초 → 4초 → 8초 (최대 30초)
              </p>
            </div>
          </section>

          {/* Helper Functions */}
          <section>
            <SectionTitle id="helpers">Helper Functions</SectionTitle>
            <p className="mb-6 text-gray-400">SDK는 게임 로직을 간소화하는 헬퍼 함수들을 제공합니다.</p>
            <div className="space-y-6">
              <div>
                <h4 className="mb-2 font-mono text-sm font-bold text-white">pathfind(from, to, maze)</h4>
                <p className="mb-3 text-sm text-gray-400">A* 알고리즘으로 최단 경로를 찾습니다. 터널 래핑을 지원합니다.</p>
                <CodeBlock
                  code={`import { pathfind } from '@ghost-protocol/sdk';

const path = pathfind(
  { x: pacman.x, y: pacman.y },
  { x: targetX, y: targetY },
  state.maze
);
if (path.length > 1) {
  const nextTile = path[1];
  // nextTile로 이동하는 방향 계산
}`}
                />
              </div>

              <div>
                <h4 className="mb-2 font-mono text-sm font-bold text-white">nearestPellet(position, maze)</h4>
                <p className="mb-3 text-sm text-gray-400">가장 가까운 먹지 않은 펠릿을 찾습니다.</p>
                <CodeBlock
                  code={`import { nearestPellet } from '@ghost-protocol/sdk';

const pellet = nearestPellet(
  { x: pacman.x, y: pacman.y },
  state.maze
);
if (pellet) {
  // pellet 위치로 이동
}`}
                />
              </div>

              <div>
                <h4 className="mb-2 font-mono text-sm font-bold text-white">ghostDistance(position, ghost)</h4>
                <p className="mb-3 text-sm text-gray-400">고스트까지의 맨하탄 거리를 계산합니다.</p>
                <CodeBlock
                  code={`import { ghostDistance } from '@ghost-protocol/sdk';

const dist = ghostDistance(
  { x: pacman.x, y: pacman.y },
  ghost
);
if (dist < 5 && ghost.mode === 'chase') {
  // 도망 로직
}`}
                />
              </div>

              <div>
                <h4 className="mb-2 font-mono text-sm font-bold text-white">dangerZone(position, ghosts, radius)</h4>
                <p className="mb-3 text-sm text-gray-400">주변의 위협적인 고스트를 감지합니다.</p>
                <CodeBlock
                  code={`import { dangerZone } from '@ghost-protocol/sdk';

const threats = dangerZone(
  { x: pacman.x, y: pacman.y },
  state.ghosts,
  5  // 반경 5 타일
);
if (threats.length > 0) {
  // 위험! 도망가기
}`}
                />
              </div>

              <div>
                <h4 className="mb-2 font-mono text-sm font-bold text-white">escapePaths(position, ghosts, maze)</h4>
                <p className="mb-3 text-sm text-gray-400">안전한 이동 방향을 찾습니다.</p>
                <CodeBlock
                  code={`import { escapePaths } from '@ghost-protocol/sdk';

const safeDirs = escapePaths(
  { x: pacman.x, y: pacman.y },
  state.ghosts,
  state.maze
);
if (safeDirs.length > 0) {
  return { direction: safeDirs[0] };
}`}
                />
              </div>
            </div>
          </section>

          {/* Sample Agents */}
          <section>
            <SectionTitle id="samples">Sample Agents</SectionTitle>
            <p className="mb-6 text-gray-400">SDK에 포함된 샘플 에이전트들입니다. 참고용으로 활용하세요.</p>
            <div className="grid gap-4 md:grid-cols-2">
              <AgentCard
                name="GreedyAgent"
                description="항상 가장 가까운 펠릿을 쫓아갑니다. 고스트를 무시하는 단순하지만 효과적인 전략입니다."
              />
              <AgentCard
                name="SafetyAgent"
                description="생존을 최우선으로 합니다. 고스트가 가까우면 도망가고, 안전할 때만 펠릿을 수집합니다."
              />
              <AgentCard
                name="AggressiveAgent"
                description="파워 펠릿을 우선 수집하고, 겁에 질린 고스트를 적극적으로 쫓습니다. 고위험 고보상 전략."
              />
              <AgentCard
                name="LLMAgent"
                description="Claude API를 사용하여 게임 상태를 분석하고 동적으로 전략을 조정합니다."
              />
            </div>
          </section>

          {/* Game State Reference */}
          <section>
            <SectionTitle id="gamestate">Game State Reference</SectionTitle>
            <p className="mb-6 text-gray-400">
              <code className="rounded bg-black/40 px-2 py-1 font-mono text-sm text-ghost-violet">onGameState</code> 콜백에 전달되는 게임 상태 객체입니다.
            </p>
            <CodeBlock
              code={`interface GameState {
  // 게임 진행 정보
  tick: number;                    // 현재 틱 (60 ticks/sec)
  round: number;                   // 현재 라운드 (1-3)
  score: number;                   // 현재 점수
  lives: number;                   // 남은 목숨

  // 팩맨 상태
  pacman: {
    x: number;                     // X 좌표 (0-27)
    y: number;                     // Y 좌표 (0-30)
    direction: Direction;          // 현재 방향
    score: number;                 // 점수
    lives: number;                 // 목숨
  };

  // 고스트 배열 (Blinky, Pinky, Inky, Clyde)
  ghosts: Array<{
    id: string;                    // 고스트 ID
    x: number;                     // X 좌표
    y: number;                     // Y 좌표
    mode: 'chase' | 'scatter' | 'frightened' | 'eaten';
  }>;

  // 미로 정보
  maze: {
    width: 28;                     // 미로 너비 (고정)
    height: 31;                    // 미로 높이 (고정)
    walls: boolean[][];            // 벽 배열 [y][x]
    pellets: boolean[][];          // 펠릿 배열 [y][x]
    powerPellets: boolean[][];     // 파워 펠릿 배열 [y][x]
  };

  // 파워업 상태
  powerActive: boolean;            // 파워업 활성 여부
  powerTimeRemaining: number;      // 남은 파워업 시간 (틱)

  // 기타
  fruitAvailable: boolean;         // 과일 출현 여부
  dying: boolean;                  // 팩맨 죽는 중
}`}
            />
          </section>

          {/* API Reference */}
          <section>
            <SectionTitle id="api">API Reference</SectionTitle>
            <p className="mb-6 text-gray-400">SDK에서 export되는 모든 항목의 레퍼런스입니다.</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-ghost-violet/20">
                    <th className="px-4 py-3 font-mono font-bold text-ghost-violet">Export</th>
                    <th className="px-4 py-3 font-bold text-ghost-violet">타입</th>
                    <th className="px-4 py-3 font-bold text-ghost-violet">설명</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ghost-violet/10">
                  <tr className="hover:bg-ghost-violet/5">
                    <td className="px-4 py-3 font-mono text-white">GhostAgent</td>
                    <td className="px-4 py-3 text-gray-400">Abstract Class</td>
                    <td className="px-4 py-3 text-gray-400">에이전트 베이스 클래스</td>
                  </tr>
                  <tr className="hover:bg-ghost-violet/5">
                    <td className="px-4 py-3 font-mono text-white">AgentClient</td>
                    <td className="px-4 py-3 text-gray-400">Class</td>
                    <td className="px-4 py-3 text-gray-400">WebSocket 클라이언트</td>
                  </tr>
                  <tr className="hover:bg-ghost-violet/5">
                    <td className="px-4 py-3 font-mono text-white">pathfind</td>
                    <td className="px-4 py-3 text-gray-400">Function</td>
                    <td className="px-4 py-3 text-gray-400">A* 경로 탐색</td>
                  </tr>
                  <tr className="hover:bg-ghost-violet/5">
                    <td className="px-4 py-3 font-mono text-white">nearestPellet</td>
                    <td className="px-4 py-3 text-gray-400">Function</td>
                    <td className="px-4 py-3 text-gray-400">가장 가까운 펠릿 찾기</td>
                  </tr>
                  <tr className="hover:bg-ghost-violet/5">
                    <td className="px-4 py-3 font-mono text-white">ghostDistance</td>
                    <td className="px-4 py-3 text-gray-400">Function</td>
                    <td className="px-4 py-3 text-gray-400">고스트까지의 거리</td>
                  </tr>
                  <tr className="hover:bg-ghost-violet/5">
                    <td className="px-4 py-3 font-mono text-white">dangerZone</td>
                    <td className="px-4 py-3 text-gray-400">Function</td>
                    <td className="px-4 py-3 text-gray-400">위협 감지</td>
                  </tr>
                  <tr className="hover:bg-ghost-violet/5">
                    <td className="px-4 py-3 font-mono text-white">escapePaths</td>
                    <td className="px-4 py-3 text-gray-400">Function</td>
                    <td className="px-4 py-3 text-gray-400">안전한 방향 찾기</td>
                  </tr>
                  <tr className="hover:bg-ghost-violet/5">
                    <td className="px-4 py-3 font-mono text-white">pelletCluster</td>
                    <td className="px-4 py-3 text-gray-400">Function</td>
                    <td className="px-4 py-3 text-gray-400">펠릿 군집 찾기</td>
                  </tr>
                  <tr className="hover:bg-ghost-violet/5">
                    <td className="px-4 py-3 font-mono text-white">GreedyAgent</td>
                    <td className="px-4 py-3 text-gray-400">Class</td>
                    <td className="px-4 py-3 text-gray-400">샘플: 탐욕 에이전트</td>
                  </tr>
                  <tr className="hover:bg-ghost-violet/5">
                    <td className="px-4 py-3 font-mono text-white">SafetyAgent</td>
                    <td className="px-4 py-3 text-gray-400">Class</td>
                    <td className="px-4 py-3 text-gray-400">샘플: 안전 우선 에이전트</td>
                  </tr>
                  <tr className="hover:bg-ghost-violet/5">
                    <td className="px-4 py-3 font-mono text-white">AggressiveAgent</td>
                    <td className="px-4 py-3 text-gray-400">Class</td>
                    <td className="px-4 py-3 text-gray-400">샘플: 공격적 에이전트</td>
                  </tr>
                  <tr className="hover:bg-ghost-violet/5">
                    <td className="px-4 py-3 font-mono text-white">LLMAgent</td>
                    <td className="px-4 py-3 text-gray-400">Class</td>
                    <td className="px-4 py-3 text-gray-400">샘플: LLM 기반 에이전트</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
