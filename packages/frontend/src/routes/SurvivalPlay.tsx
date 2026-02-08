/**
 * 서바이벌 모드 플레이 페이지
 * 전체 화면 게임플레이 + HUD 오버레이
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhaserGame } from '../game/PhaserGame';
import { HUD } from '../components/game/HUD';
import {
  TensionMeter,
  TouchControls,
  DifficultyBadge,
  GameOverScreen,
  RoundIndicator,
} from '../components/survival';
import { useGameSocket } from '../hooks/useGameSocket';
import { useGameStore } from '../stores/gameStore';
import type { Direction } from '@ghost-protocol/shared';

type GamePhase = 'lobby' | 'playing' | 'gameover';

/**
 * 서바이벌 모드 메인 플레이 페이지
 * 로비 → 게임 플레이 → 게임 오버 흐름 관리
 */
export function SurvivalPlay() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [playTime, setPlayTime] = useState(0);
  const [personalBest, setPersonalBest] = useState({ round: 0, score: 0 });
  const playTimeRef = useRef<number | null>(null);

  const { gameState, difficulty, sessionId, startGame, stopGame, setSessionId, setDifficulty } =
    useGameStore();

  const { connected, sendInput } = useGameSocket({ sessionId: sessionId ?? undefined });

  // 게임 시작
  const handleStartGame = useCallback(() => {
    // 임시 세션 ID 생성 (실제로는 서버에서 받아야 함)
    const newSessionId = `survival-${String(Date.now())}-${Math.random().toString(36).substring(7)}`;
    setSessionId(newSessionId);
    setDifficulty(1);
    startGame();
    setPhase('playing');
    setPlayTime(0);

    // 플레이 타이머 시작
    playTimeRef.current = window.setInterval(() => {
      setPlayTime((prev) => prev + 1);
    }, 1000) as unknown as number;
  }, [startGame, setSessionId, setDifficulty]);

  // 게임 재시작
  const handleRestart = useCallback(() => {
    stopGame();
    if (playTimeRef.current !== null) {
      clearInterval(playTimeRef.current);
      playTimeRef.current = null;
    }
    setPhase('lobby');
    setPlayTime(0);
  }, [stopGame]);

  // 대시보드로 이동
  const handleDashboard = useCallback(() => {
    stopGame();
    if (playTimeRef.current !== null) {
      clearInterval(playTimeRef.current);
      playTimeRef.current = null;
    }
    void navigate('/');
  }, [stopGame, navigate]);

  // 키보드 입력 처리
  useEffect(() => {
    if (phase !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      let direction: Direction | null = null;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          direction = 'up';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          direction = 'down';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          direction = 'left';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          direction = 'right';
          break;
      }

      if (direction !== null) {
        e.preventDefault();
        sendInput(direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); };
  }, [phase, sendInput]);

  // 게임 오버 감지
  useEffect(() => {
    if (!gameState || phase !== 'playing') return;

    if (gameState.lives <= 0) {
      // 플레이 타이머 정지
      if (playTimeRef.current !== null) {
        clearInterval(playTimeRef.current);
        playTimeRef.current = null;
      }

      // 신기록 체크
      const isNewRecord =
        gameState.round > personalBest.round ||
        (gameState.round === personalBest.round && gameState.score > personalBest.score);

      if (isNewRecord) {
        setPersonalBest({ round: gameState.round, score: gameState.score });
      }

      // 게임 오버 화면 표시 (약간의 지연)
      setTimeout(() => {
        setPhase('gameover');
      }, 1500);
    }
  }, [gameState, phase, personalBest]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (playTimeRef.current !== null) {
        clearInterval(playTimeRef.current);
      }
      stopGame();
    };
  }, [stopGame]);

  // 난이도 업데이트 (라운드 기반)
  useEffect(() => {
    if (!gameState) return;

    // 라운드 1-3: 난이도 1
    // 라운드 4-6: 난이도 2
    // 라운드 7-10: 난이도 3
    // 라운드 11-15: 난이도 4
    // 라운드 16+: 난이도 5
    let newDifficulty: typeof difficulty = 1;
    if (gameState.round >= 16) newDifficulty = 5;
    else if (gameState.round >= 11) newDifficulty = 4;
    else if (gameState.round >= 7) newDifficulty = 3;
    else if (gameState.round >= 4) newDifficulty = 2;

    if (newDifficulty !== difficulty) {
      setDifficulty(newDifficulty);
    }
  }, [gameState, difficulty, setDifficulty]);

  const currentRound = gameState?.round ?? 1;
  const currentScore = gameState?.score ?? 0;
  const isRecord =
    currentRound > personalBest.round ||
    (currentRound === personalBest.round && currentScore > personalBest.score);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 배경 텐션 미터 */}
      <TensionMeter difficulty={difficulty} />

      {/* 로비 화면 */}
      {phase === 'lobby' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="bg-arena-card border-2 border-arena-border rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
            <h1
              className="text-5xl font-bold text-center mb-8"
              style={{
                color: '#8b5cf6',
                textShadow: '0 0 20px #8b5cf680',
              }}
            >
              서바이벌 모드
            </h1>

            <div className="space-y-4 mb-8">
              <div className="p-4 bg-arena-surface rounded-lg">
                <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-2">게임 방식</h3>
                <p className="text-white text-sm leading-relaxed">
                  라운드가 진행될수록 고스트가 점점 똑똑해집니다.
                  <br />몇 라운드까지 살아남을 수 있을까요?
                </p>
              </div>

              {personalBest.round > 0 && (
                <div className="p-4 bg-arena-surface rounded-lg">
                  <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-2">
                    개인 최고 기록
                  </h3>
                  <div className="flex justify-between items-center text-white">
                    <span>라운드: {personalBest.round}</span>
                    <span style={{ color: '#8b5cf6' }}>{personalBest.score.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="p-4 bg-arena-surface rounded-lg">
                <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-2">조작법</h3>
                <p className="text-white text-sm">
                  키보드: 방향키 또는 WASD
                  <br />
                  모바일: 화면 하단 터치 컨트롤
                </p>
              </div>
            </div>

            <button
              onClick={handleStartGame}
              disabled={!connected}
              className="w-full py-4 px-6 rounded-lg font-bold text-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#8b5cf6',
                boxShadow: '0 0 20px #8b5cf680',
              }}
            >
              {connected ? '게임 시작' : '서버 연결 중...'}
            </button>
          </div>
        </div>
      )}

      {/* 게임 플레이 화면 */}
      {phase === 'playing' && (
        <>
          {/* Phaser 게임 캔버스 (중앙) */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <PhaserGame />
          </div>

          {/* HUD 오버레이 */}
          <HUD />

          {/* 라운드 표시 (상단 중앙) */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
            <RoundIndicator round={currentRound} difficulty={difficulty} />
          </div>

          {/* 난이도 배지 (우측 상단) */}
          <div className="absolute top-4 right-4 z-20">
            <DifficultyBadge tier={difficulty} />
          </div>

          {/* 플레이 타임 (좌측 하단) */}
          <div className="absolute bottom-4 left-4 z-20 text-gray-400 text-sm font-mono">
            플레이 시간: {Math.floor(playTime / 60)}:{String(playTime % 60).padStart(2, '0')}
          </div>

          {/* 터치 컨트롤 (모바일) */}
          <TouchControls
            onDirectionChange={(dir) => {
              if (dir) sendInput(dir);
            }}
          />
        </>
      )}

      {/* 게임 오버 화면 */}
      {phase === 'gameover' && (
        <GameOverScreen
          finalRound={currentRound}
          finalScore={currentScore}
          isRecord={isRecord}
          onRestart={handleRestart}
          onDashboard={handleDashboard}
        />
      )}
    </div>
  );
}
