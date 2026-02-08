/**
 * Phaser 게임 캔버스를 감싸는 React 래퍼 컴포넌트
 * Phaser 인스턴스의 생명주기를 React 마운트/언마운트에 맞춰 관리
 *
 * 이 컴포넌트는 상태를 관리하지 않음.
 * GameContainer가 게임 루프를 담당:
 * 1. LocalGameEngine 인스턴스 생성
 * 2. 60fps setInterval로 engine.tick(input) 호출
 * 3. Phaser GameScene에서 scene.updateGameState(state) 호출
 * 4. scene.getCurrentInput()으로 입력 읽기
 */
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { MAZE_WIDTH, MAZE_HEIGHT } from '@ghost-protocol/shared';

/** 각 타일의 픽셀 크기 (GameScene과 동일) */
const TILE_SIZE = 20;

/** 모듈 레벨 Phaser 게임 인스턴스 참조 (GameContainer에서 씬 접근용) */
let activeGameInstance: Phaser.Game | null = null;

/** 현재 활성 Phaser 게임 인스턴스 반환 */
export function getActiveGame(): Phaser.Game | null {
  return activeGameInstance;
}

/** Phaser 게임 캔버스 React 래퍼 */
export function PhaserGame() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 이미 생성되었거나 컨테이너가 없으면 생략
    if (!containerRef.current || gameRef.current) return;

    /** Phaser 게임 설정 */
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO, // WebGL 우선, Canvas 폴백
      width: MAZE_WIDTH * TILE_SIZE,
      height: MAZE_HEIGHT * TILE_SIZE,
      parent: containerRef.current,
      backgroundColor: '#0a0a1a',
      scene: [GameScene],
      physics: {
        default: 'arcade',
        arcade: { debug: false },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      // 안티앨리어싱 비활성화 (레트로 픽셀 느낌)
      render: {
        antialias: false,
        pixelArt: true,
      },
    };

    gameRef.current = new Phaser.Game(config);
    activeGameInstance = gameRef.current;

    // 언마운트 시 Phaser 인스턴스 정리
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      activeGameInstance = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: MAZE_WIDTH * TILE_SIZE,
        height: MAZE_HEIGHT * TILE_SIZE,
      }}
    />
  );
}
