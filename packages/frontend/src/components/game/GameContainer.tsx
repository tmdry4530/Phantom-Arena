import { useEffect, useRef, useCallback } from 'react';
import { PhaserGame, getActiveGame } from '../../game/PhaserGame';
import { HUD } from './HUD';
import { useGameStore } from '../../stores/gameStore';
import { GameScene } from '../../game/scenes/GameScene';
import { useGameSocket } from '../../hooks/useGameSocket';
import { useGameAudio } from '../../hooks/useGameAudio.js';
import { useAudio } from '../../hooks/useAudio.js';
import type { Direction } from '@ghost-protocol/shared';

/** 게임 컨테이너 - WebSocket 기반 서버 상태 렌더링 */
export function GameContainer() {
  const { isPlaying, difficulty, sessionId, startGame, stopGame, setSessionId, gameState } =
    useGameStore();
  const lastInputRef = useRef<Direction | null>(null);

  // 게임 이벤트 → 오디오 트리거 연결
  useGameAudio();
  const { music, initialized: audioReady } = useAudio();

  // WebSocket 연결 (sessionId가 있을 때만)
  const { connected, sendInput } = useGameSocket({ sessionId: sessionId ?? undefined });

  // 서버 세션 생성 및 게임 시작
  const handleStartGame = useCallback(async () => {
    try {
      const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001/api/v1';
      const response = await fetch(`${apiUrl}/survival`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty }),
      });

      if (!response.ok) {
        throw new Error(`서버 세션 생성 실패: ${String(response.status)}`);
      }

      const data = (await response.json()) as { sessionId: string };
      setSessionId(data.sessionId);
      startGame();
    } catch (error) {
      console.error('게임 시작 실패:', error);
    }
  }, [difficulty, setSessionId, startGame]);

  // 키보드 입력을 서버로 전송
  useEffect(() => {
    if (!isPlaying || !connected) return;

    const scene = getGameScene();
    if (!scene) return;

    const sendInputToServer = () => {
      const input = scene.getCurrentInput();
      if (input && input !== lastInputRef.current) {
        sendInput(input);
        lastInputRef.current = input;
      }
    };

    // 입력 폴링 (60fps)
    const intervalId = window.setInterval(sendInputToServer, 16);

    return () => {
      clearInterval(intervalId);
    };
  }, [isPlaying, connected, sendInput]);

  // 게임 상태 변경 시 Phaser 씬 업데이트
  useEffect(() => {
    if (!gameState) return;

    const scene = getGameScene();
    if (scene) {
      scene.updateGameState(gameState);
    }
  }, [gameState]);

  // BGM 시작/정지 (게임 진행 상태에 연동)
  useEffect(() => {
    if (!audioReady) return;

    if (isPlaying) {
      music.start();
    } else {
      music.stop();
    }
  }, [isPlaying, music, audioReady]);

  // SPACE 키로 게임 시작/재시작
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        const isGameOver = gameState ? gameState.lives <= 0 : false;
        if (!isPlaying || isGameOver) {
          stopGame();
          setTimeout(() => {
            void handleStartGame();
          }, 50);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); };
  }, [isPlaying, gameState, stopGame, handleStartGame]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen"
      style={{ backgroundColor: '#0a0a1a' }}
    >
      <h1
        className="text-2xl font-bold mb-4"
        style={{ color: '#8B5CF6', fontFamily: "'Courier New', monospace" }}
      >
        GHOST PROTOCOL
      </h1>

      <div className="relative">
        <PhaserGame />
        <HUD />
      </div>

      {!isPlaying && (
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm mb-2">Arrow Keys or WASD to move</p>
          <button
            onClick={() => {
              void handleStartGame();
            }}
            className="px-6 py-3 text-white font-bold rounded-lg transition-all hover:scale-105"
            style={{ backgroundColor: '#8B5CF6' }}
          >
            START GAME
          </button>
        </div>
      )}
    </div>
  );
}

/** Phaser 게임 인스턴스에서 GameScene 가져오기 */
function getGameScene(): GameScene | null {
  const game = getActiveGame();
  if (!game) return null;
  return game.scene.getScene('GameScene') as GameScene | null;
}
