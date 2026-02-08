import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { WalletButton } from '@/components/common/WalletButton';
import { AudioToggle } from '@/components/common/AudioToggle';

/** 메인 레이아웃 컴포넌트 — 헤더, 콘텐츠, 푸터 */
export function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Dashboard' },
    { to: '/tournament', label: '토너먼트' },
    { to: '/leaderboard', label: '리더보드' },
    { to: '/survival', label: '서바이벌' },
    { to: '/my-bets', label: '내 배팅' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-arena-bg">
      <header className="border-b border-ghost-violet/20 bg-arena-surface px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* 로고 */}
          <div className="flex items-center gap-3">
            <span className="text-2xl">👻</span>
            <h1
              className="neon-text text-lg font-bold text-ghost-violet"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Ghost Protocol
            </h1>
          </div>

          {/* 데스크톱 네비게이션 */}
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `text-sm font-medium transition-all ${
                    isActive
                      ? 'text-ghost-neon underline decoration-ghost-neon decoration-2 underline-offset-4'
                      : 'text-gray-400 hover:text-ghost-violet'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* 오디오 토글 + 지갑 연결 버튼 (데스크톱) */}
          <div className="hidden items-center gap-3 md:flex">
            <AudioToggle />
            <WalletButton />
          </div>

          {/* 모바일 햄버거 메뉴 */}
          <button
            onClick={() => { setMobileMenuOpen(!mobileMenuOpen); }}
            className="flex flex-col gap-1 md:hidden"
            aria-label="메뉴 토글"
          >
            <div className="h-0.5 w-6 bg-ghost-violet"></div>
            <div className="h-0.5 w-6 bg-ghost-violet"></div>
            <div className="h-0.5 w-6 bg-ghost-violet"></div>
          </button>
        </div>

        {/* 모바일 메뉴 오버레이 */}
        {mobileMenuOpen && (
          <div className="mt-4 flex flex-col gap-4 border-t border-ghost-violet/20 pt-4 md:hidden">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => { setMobileMenuOpen(false); }}
                className={({ isActive }) =>
                  `text-sm font-medium transition-all ${
                    isActive ? 'text-ghost-neon' : 'text-gray-400 hover:text-ghost-violet'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <AudioToggle />
              <WalletButton />
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-ghost-violet/10 bg-arena-surface px-6 py-4 text-center text-sm text-gray-500">
        <p className="neon-text text-xs" style={{ fontFamily: 'var(--font-display)' }}>
          Ghost Protocol
        </p>
        <p className="mt-1 text-xs">Monad 블록체인 기반 AI 팩맨 아레나</p>
      </footer>
    </div>
  );
}
