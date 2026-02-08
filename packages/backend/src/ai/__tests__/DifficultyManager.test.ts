/**
 * DifficultyManager 모듈 단위 테스트
 * 난이도 티어 관리, 추격/산개 타이머, 패턴 인식, LLM 호출 검증
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DifficultyManager, createCoordinationStrategy } from '../DifficultyManager.js';
import type { DifficultyTier, Direction } from '@ghost-protocol/shared';
import { TICK_RATE } from '@ghost-protocol/shared';

describe('DifficultyManager', () => {
  describe('getTierForRound', () => {
    let manager: DifficultyManager;

    beforeEach(() => {
      manager = new DifficultyManager(1);
    });

    it('라운드 1-2: Tier 1', () => {
      expect(manager.getTierForRound(1)).toBe(1);
      expect(manager.getTierForRound(2)).toBe(1);
    });

    it('라운드 3-4: Tier 2', () => {
      expect(manager.getTierForRound(3)).toBe(2);
      expect(manager.getTierForRound(4)).toBe(2);
    });

    it('라운드 5-6: Tier 3', () => {
      expect(manager.getTierForRound(5)).toBe(3);
      expect(manager.getTierForRound(6)).toBe(3);
    });

    it('라운드 7-8: Tier 4', () => {
      expect(manager.getTierForRound(7)).toBe(4);
      expect(manager.getTierForRound(8)).toBe(4);
    });

    it('라운드 9+: Tier 5', () => {
      expect(manager.getTierForRound(9)).toBe(5);
      expect(manager.getTierForRound(10)).toBe(5);
      expect(manager.getTierForRound(100)).toBe(5);
    });
  });

  describe('Tier 1 (Casual)', () => {
    let manager: DifficultyManager;

    beforeEach(() => {
      manager = new DifficultyManager(1);
    });

    it('티어 1 설정 로드', () => {
      const config = manager.getTierConfig();
      expect(config.tier).toBe(1);
      expect(config.speedMultiplier).toBe(0.75);
      expect(config.scatterDuration).toBe(7);
      expect(config.chaseDuration).toBe(5);
      expect(config.powerPelletDuration).toBe(8);
    });

    it('조정 기능 비활성화', () => {
      expect(manager.isCoordinationEnabled()).toBe(false);
    });

    it('패턴 인식 비활성화', () => {
      const config = manager.getTierConfig();
      expect(config.patternRecognition).toBe(false);
    });

    it('LLM 비활성화', () => {
      expect(manager.isLLMEnabled()).toBe(false);
    });

    it('Cruise Elroy 비활성화 (Tier 2 미만)', () => {
      expect(manager.getCruiseElroyEnabled()).toBe(false);
    });

    it('파워업 거부 비활성화', () => {
      expect(manager.getPowerUpDenialEnabled()).toBe(false);
    });

    it('예측 함정 비활성화', () => {
      expect(manager.getPredictiveTrappingEnabled()).toBe(false);
    });

    it('포메이션 비활성화', () => {
      expect(manager.getFormationsEnabled()).toBe(false);
    });

    it('실시간 적응 비활성화', () => {
      expect(manager.getRealTimeAdaptationEnabled()).toBe(false);
    });
  });

  describe('Tier 2 (Moderate)', () => {
    let manager: DifficultyManager;

    beforeEach(() => {
      manager = new DifficultyManager(2);
    });

    it('티어 2 설정 로드', () => {
      const config = manager.getTierConfig();
      expect(config.tier).toBe(2);
      expect(config.speedMultiplier).toBe(0.85);
      expect(config.chaseDuration).toBe(7);
      expect(config.scatterDuration).toBe(5);
      expect(config.powerPelletDuration).toBe(6);
    });

    it('Cruise Elroy 활성화', () => {
      expect(manager.getCruiseElroyEnabled()).toBe(true);
    });

    it('패턴 인식 여전히 비활성화', () => {
      const config = manager.getTierConfig();
      expect(config.patternRecognition).toBe(false);
    });

    it('LLM 비활성화', () => {
      expect(manager.isLLMEnabled()).toBe(false);
    });
  });

  describe('Tier 3 (Hard)', () => {
    let manager: DifficultyManager;

    beforeEach(() => {
      manager = new DifficultyManager(3);
    });

    it('티어 3 설정 로드', () => {
      const config = manager.getTierConfig();
      expect(config.tier).toBe(3);
      expect(config.speedMultiplier).toBe(0.95);
      expect(config.chaseDuration).toBe(8);
      expect(config.scatterDuration).toBe(3);
      expect(config.powerPelletDuration).toBe(4);
    });

    it('조정 기능 활성화', () => {
      expect(manager.isCoordinationEnabled()).toBe(true);
    });

    it('패턴 인식 활성화', () => {
      const config = manager.getTierConfig();
      expect(config.patternRecognition).toBe(true);
    });

    it('파워업 거부 활성화', () => {
      expect(manager.getPowerUpDenialEnabled()).toBe(true);
    });

    it('LLM 비활성화 (Tier 4부터)', () => {
      expect(manager.isLLMEnabled()).toBe(false);
    });

    it('포메이션 비활성화 (Tier 4부터)', () => {
      expect(manager.getFormationsEnabled()).toBe(false);
    });
  });

  describe('Tier 4 (Extreme)', () => {
    let manager: DifficultyManager;

    beforeEach(() => {
      manager = new DifficultyManager(4);
    });

    it('티어 4 설정 로드', () => {
      const config = manager.getTierConfig();
      expect(config.tier).toBe(4);
      expect(config.speedMultiplier).toBe(1.0);
      expect(config.chaseDuration).toBe(9);
      expect(config.scatterDuration).toBe(1);
      expect(config.powerPelletDuration).toBe(2);
    });

    it('LLM 활성화', () => {
      expect(manager.isLLMEnabled()).toBe(true);
    });

    it('LLM 호출 간격: 120틱 (2초)', () => {
      expect(manager.getLLMCallInterval()).toBe(120);
    });

    it('포메이션 활성화', () => {
      expect(manager.getFormationsEnabled()).toBe(true);
    });

    it('예측 함정 활성화', () => {
      expect(manager.getPredictiveTrappingEnabled()).toBe(true);
    });

    it('실시간 적응 비활성화 (Tier 5만)', () => {
      expect(manager.getRealTimeAdaptationEnabled()).toBe(false);
    });
  });

  describe('Tier 5 (Impossible)', () => {
    let manager: DifficultyManager;

    beforeEach(() => {
      manager = new DifficultyManager(5);
    });

    it('티어 5 설정 로드', () => {
      const config = manager.getTierConfig();
      expect(config.tier).toBe(5);
      expect(config.speedMultiplier).toBe(1.05);
      expect(config.chaseDuration).toBe(Infinity);
      expect(config.scatterDuration).toBe(0);
      expect(config.powerPelletDuration).toBe(1);
    });

    it('영구 추격 모드 (Infinity)', () => {
      const config = manager.getTierConfig();
      expect(config.chaseDuration).toBe(Infinity);
    });

    it('LLM 활성화', () => {
      expect(manager.isLLMEnabled()).toBe(true);
    });

    it('LLM 호출 간격: 1틱 (매 틱)', () => {
      expect(manager.getLLMCallInterval()).toBe(1);
    });

    it('실시간 적응 활성화', () => {
      expect(manager.getRealTimeAdaptationEnabled()).toBe(true);
    });

    it('모든 고급 기능 활성화', () => {
      expect(manager.getCruiseElroyEnabled()).toBe(true);
      expect(manager.getPowerUpDenialEnabled()).toBe(true);
      expect(manager.getPredictiveTrappingEnabled()).toBe(true);
      expect(manager.getFormationsEnabled()).toBe(true);
      expect(manager.isCoordinationEnabled()).toBe(true);
    });
  });

  describe('추격/산개 타이머', () => {
    it('초기 모드는 scatter', () => {
      const manager = new DifficultyManager(1);
      expect(manager.getCurrentMode()).toBe('scatter');
    });

    it('scatter 지속 시간 후 chase로 전환 (Tier 1)', () => {
      const manager = new DifficultyManager(1);
      const config = manager.getTierConfig();
      const scatterTicks = config.scatterDuration * TICK_RATE; // 7초 * 60 = 420틱

      // scatter 지속 시간만큼 틱
      for (let i = 0; i < scatterTicks; i++) {
        manager.tick();
      }

      // 이제 chase 모드로 전환되어야 함
      expect(manager.getCurrentMode()).toBe('chase');
    });

    it('chase 지속 시간 후 scatter로 재전환', () => {
      const manager = new DifficultyManager(1);
      const config = manager.getTierConfig();
      const scatterTicks = config.scatterDuration * TICK_RATE;
      const chaseTicks = config.chaseDuration * TICK_RATE;

      // scatter 기간 완료
      for (let i = 0; i < scatterTicks; i++) {
        manager.tick();
      }
      expect(manager.getCurrentMode()).toBe('chase');

      // chase 기간 완료
      for (let i = 0; i < chaseTicks; i++) {
        manager.tick();
      }
      expect(manager.getCurrentMode()).toBe('scatter');
    });

    it('Tier 5는 영구 chase 모드', () => {
      const manager = new DifficultyManager(5);

      // 많은 틱이 지나도 항상 chase
      for (let i = 0; i < 10000; i++) {
        manager.tick();
      }

      expect(manager.getCurrentMode()).toBe('chase');
    });

    it('티어 변경 시 모드 타이머 초기화', () => {
      const manager = new DifficultyManager(2);

      // 일부 틱 진행
      for (let i = 0; i < 100; i++) {
        manager.tick();
      }

      // 티어 변경
      manager.setTier(3);

      // 모드가 scatter로 초기화되어야 함
      expect(manager.getCurrentMode()).toBe('scatter');
    });

    it('모드 전환 경계값 테스트', () => {
      const manager = new DifficultyManager(2);
      const config = manager.getTierConfig();
      const scatterTicks = config.scatterDuration * TICK_RATE;

      // scatter 지속 시간 - 1틱까지는 여전히 scatter
      for (let i = 0; i < scatterTicks - 1; i++) {
        manager.tick();
      }
      expect(manager.getCurrentMode()).toBe('scatter');

      // 마지막 1틱 후 chase로 전환
      manager.tick();
      expect(manager.getCurrentMode()).toBe('chase');
    });
  });

  describe('패턴 인식', () => {
    it('방향 기록 (Tier 3)', () => {
      const manager = new DifficultyManager(3);

      manager.recordPacmanDirection('right');
      manager.recordPacmanDirection('right');
      manager.recordPacmanDirection('up');

      const recent = manager.getRecentDirections();
      expect(recent.length).toBe(3);
      expect(recent[0]).toBe('right');
      expect(recent[2]).toBe('up');
    });

    it('방향 예측: 가장 빈번한 방향 반환', () => {
      const manager = new DifficultyManager(3);

      manager.recordPacmanDirection('right');
      manager.recordPacmanDirection('right');
      manager.recordPacmanDirection('right');
      manager.recordPacmanDirection('up');
      manager.recordPacmanDirection('down');

      const predicted = manager.predictNextDirection();
      expect(predicted).toBe('right');
    });

    it('버퍼 최대 10개로 제한', () => {
      const manager = new DifficultyManager(3);

      const directions: Direction[] = ['up', 'down', 'left', 'right'];
      for (let i = 0; i < 15; i++) {
        const direction = directions[i % 4];
        if (direction !== undefined) {
          manager.recordPacmanDirection(direction);
        }
      }

      const recent = manager.getRecentDirections();
      expect(recent.length).toBe(10);
    });

    it('Tier 1-2에서는 패턴 인식 비활성화', () => {
      const manager = new DifficultyManager(2);

      manager.recordPacmanDirection('right');
      manager.recordPacmanDirection('right');

      // 기록되지 않아야 함
      const recent = manager.getRecentDirections();
      expect(recent.length).toBe(0);

      const predicted = manager.predictNextDirection();
      expect(predicted).toBe(null);
    });

    it('버퍼가 비어있으면 null 반환', () => {
      const manager = new DifficultyManager(3);
      const predicted = manager.predictNextDirection();
      expect(predicted).toBe(null);
    });

    it('동점일 때 첫 번째 최대값 반환', () => {
      const manager = new DifficultyManager(3);

      manager.recordPacmanDirection('up');
      manager.recordPacmanDirection('down');
      manager.recordPacmanDirection('up');
      manager.recordPacmanDirection('down');

      // up과 down이 각각 2번 (동점)
      const predicted = manager.predictNextDirection();
      expect(['up', 'down']).toContain(predicted);
    });
  });

  describe('LLM 호출 타이밍', () => {
    it('LLM 비활성화 시 shouldCallLLM은 항상 false', () => {
      const manager = new DifficultyManager(1);

      expect(manager.shouldCallLLM(0)).toBe(false);
      expect(manager.shouldCallLLM(1000)).toBe(false);
    });

    it('Tier 4: 120틱마다 LLM 호출', () => {
      const manager = new DifficultyManager(4);

      expect(manager.shouldCallLLM(0)).toBe(true); // 첫 호출
      expect(manager.shouldCallLLM(119)).toBe(false); // 간격 미달
      expect(manager.shouldCallLLM(120)).toBe(true); // 120틱 경과
      expect(manager.shouldCallLLM(121)).toBe(false); // 간격 미달
      expect(manager.shouldCallLLM(240)).toBe(true); // 240틱 경과
    });

    it('Tier 5: 매 틱마다 LLM 호출', () => {
      const manager = new DifficultyManager(5);

      expect(manager.shouldCallLLM(0)).toBe(true);
      expect(manager.shouldCallLLM(1)).toBe(true);
      expect(manager.shouldCallLLM(2)).toBe(true);
      expect(manager.shouldCallLLM(100)).toBe(true);
    });

    it('shouldCallLLM 호출 시 내부 타이머 업데이트', () => {
      const manager = new DifficultyManager(4);

      manager.shouldCallLLM(0); // 첫 호출
      expect(manager.shouldCallLLM(50)).toBe(false); // 간격 미달

      manager.shouldCallLLM(120); // 두 번째 호출
      expect(manager.shouldCallLLM(150)).toBe(false); // 간격 미달 (120 기준)
    });

    it('LLM 호출 간격 반환', () => {
      const manager4 = new DifficultyManager(4);
      expect(manager4.getLLMCallInterval()).toBe(120);

      const manager5 = new DifficultyManager(5);
      expect(manager5.getLLMCallInterval()).toBe(1);

      const manager1 = new DifficultyManager(1);
      expect(manager1.getLLMCallInterval()).toBe(Infinity);
    });
  });

  describe('티어별 기능 플래그', () => {
    it('Cruise Elroy: Tier 2+', () => {
      expect(new DifficultyManager(1).getCruiseElroyEnabled()).toBe(false);
      expect(new DifficultyManager(2).getCruiseElroyEnabled()).toBe(true);
      expect(new DifficultyManager(3).getCruiseElroyEnabled()).toBe(true);
      expect(new DifficultyManager(4).getCruiseElroyEnabled()).toBe(true);
      expect(new DifficultyManager(5).getCruiseElroyEnabled()).toBe(true);
    });

    it('파워업 거부: Tier 3+', () => {
      expect(new DifficultyManager(1).getPowerUpDenialEnabled()).toBe(false);
      expect(new DifficultyManager(2).getPowerUpDenialEnabled()).toBe(false);
      expect(new DifficultyManager(3).getPowerUpDenialEnabled()).toBe(true);
      expect(new DifficultyManager(4).getPowerUpDenialEnabled()).toBe(true);
      expect(new DifficultyManager(5).getPowerUpDenialEnabled()).toBe(true);
    });

    it('예측 함정: Tier 4+', () => {
      expect(new DifficultyManager(1).getPredictiveTrappingEnabled()).toBe(false);
      expect(new DifficultyManager(2).getPredictiveTrappingEnabled()).toBe(false);
      expect(new DifficultyManager(3).getPredictiveTrappingEnabled()).toBe(false);
      expect(new DifficultyManager(4).getPredictiveTrappingEnabled()).toBe(true);
      expect(new DifficultyManager(5).getPredictiveTrappingEnabled()).toBe(true);
    });

    it('포메이션: Tier 4+', () => {
      expect(new DifficultyManager(1).getFormationsEnabled()).toBe(false);
      expect(new DifficultyManager(2).getFormationsEnabled()).toBe(false);
      expect(new DifficultyManager(3).getFormationsEnabled()).toBe(false);
      expect(new DifficultyManager(4).getFormationsEnabled()).toBe(true);
      expect(new DifficultyManager(5).getFormationsEnabled()).toBe(true);
    });

    it('실시간 적응: Tier 5만', () => {
      expect(new DifficultyManager(1).getRealTimeAdaptationEnabled()).toBe(false);
      expect(new DifficultyManager(2).getRealTimeAdaptationEnabled()).toBe(false);
      expect(new DifficultyManager(3).getRealTimeAdaptationEnabled()).toBe(false);
      expect(new DifficultyManager(4).getRealTimeAdaptationEnabled()).toBe(false);
      expect(new DifficultyManager(5).getRealTimeAdaptationEnabled()).toBe(true);
    });

    it('조정: Tier 3+', () => {
      expect(new DifficultyManager(1).isCoordinationEnabled()).toBe(false);
      expect(new DifficultyManager(2).isCoordinationEnabled()).toBe(false);
      expect(new DifficultyManager(3).isCoordinationEnabled()).toBe(true);
      expect(new DifficultyManager(4).isCoordinationEnabled()).toBe(true);
      expect(new DifficultyManager(5).isCoordinationEnabled()).toBe(true);
    });

    it('패턴 인식: Tier 3+', () => {
      expect(new DifficultyManager(1).getTierConfig().patternRecognition).toBe(false);
      expect(new DifficultyManager(2).getTierConfig().patternRecognition).toBe(false);
      expect(new DifficultyManager(3).getTierConfig().patternRecognition).toBe(true);
      expect(new DifficultyManager(4).getTierConfig().patternRecognition).toBe(true);
      expect(new DifficultyManager(5).getTierConfig().patternRecognition).toBe(true);
    });

    it('LLM: Tier 4+', () => {
      expect(new DifficultyManager(1).isLLMEnabled()).toBe(false);
      expect(new DifficultyManager(2).isLLMEnabled()).toBe(false);
      expect(new DifficultyManager(3).isLLMEnabled()).toBe(false);
      expect(new DifficultyManager(4).isLLMEnabled()).toBe(true);
      expect(new DifficultyManager(5).isLLMEnabled()).toBe(true);
    });
  });

  describe('티어 변경', () => {
    it('setTier로 티어 변경', () => {
      const manager = new DifficultyManager(1);
      expect(manager.getCurrentTier()).toBe(1);

      manager.setTier(3);
      expect(manager.getCurrentTier()).toBe(3);
    });

    it('티어 변경 시 설정도 업데이트', () => {
      const manager = new DifficultyManager(1);
      let config = manager.getTierConfig();
      expect(config.speedMultiplier).toBe(0.75);

      manager.setTier(5);
      config = manager.getTierConfig();
      expect(config.speedMultiplier).toBe(1.05);
    });

    it('모든 티어 값 유효', () => {
      const tiers: DifficultyTier[] = [1, 2, 3, 4, 5];
      tiers.forEach((tier) => {
        const manager = new DifficultyManager(tier);
        expect(manager.getCurrentTier()).toBe(tier);
        expect(() => manager.getTierConfig()).not.toThrow();
      });
    });
  });

  describe('createCoordinationStrategy', () => {
    it('조정 전략 인스턴스 생성', () => {
      const strategy = createCoordinationStrategy();
      expect(strategy).toBeDefined();
      expect(typeof strategy.getPincerTargets).toBe('function');
      expect(typeof strategy.getFormationTargets).toBe('function');
      expect(typeof strategy.getPowerUpDenialTargets).toBe('function');
    });
  });
});
