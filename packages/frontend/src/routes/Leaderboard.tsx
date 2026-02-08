import { useState } from 'react';
import { AgentRankingTable } from '@/components/leaderboard/AgentRankingTable';
import { SurvivalRecords } from '@/components/leaderboard/SurvivalRecords';
import { TopBettors } from '@/components/leaderboard/TopBettors';

/** 탭 타입 */
type TabType = 'agents' | 'survival' | 'bettors';

/** 탭 인터페이스 */
interface Tab {
  readonly id: TabType;
  readonly label: string;
  readonly icon: string;
}

/** 탭 목록 */
const tabs: Tab[] = [
  { id: 'agents', label: '에이전트 순위', icon: '🤖' },
  { id: 'survival', label: '서바이벌 기록', icon: '👾' },
  { id: 'bettors', label: '톱 베터', icon: '💰' },
];

/** 리더보드 페이지 컴포넌트 */
export function Leaderboard() {
  const [activeTab, setActiveTab] = useState<TabType>('agents');

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <header className="flex items-center gap-3">
        <span className="text-4xl">🏆</span>
        <h1 className="text-3xl font-bold text-white">리더보드</h1>
      </header>

      {/* 탭 네비게이션 */}
      <nav className="border-b border-arena-border">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); }}
              className={`relative pb-3 pt-2 text-base font-semibold transition-colors ${
                activeTab === tab.id ? 'text-ghost-neon' : 'text-gray-400 hover:text-gray-200'
              }`}
              type="button"
            >
              <span className="flex items-center gap-2">
                <span>{tab.icon}</span>
                {tab.label}
              </span>
              {/* 활성 탭 인디케이터 */}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ghost-neon shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* 탭 콘텐츠 */}
      <div className="animate-fadeIn">
        {activeTab === 'agents' && <AgentRankingTable />}
        {activeTab === 'survival' && <SurvivalRecords />}
        {activeTab === 'bettors' && <TopBettors />}
      </div>
    </div>
  );
}
