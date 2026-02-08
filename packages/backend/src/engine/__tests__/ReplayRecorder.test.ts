/**
 * ReplayRecorder 유닛 테스트
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ReplayRecorder } from '../ReplayRecorder.js';
import type { Direction } from '@ghost-protocol/shared';

describe('ReplayRecorder', () => {
  let recorder: ReplayRecorder;

  beforeEach(() => {
    recorder = new ReplayRecorder();
  });

  describe('startRecording', () => {
    it('녹화 상태를 설정해야 함', () => {
      recorder.startRecording('match-1', ['agent-a', 'agent-b'], 'classic');
      expect(recorder.isRecording()).toBe(true);
    });

    it('이미 녹화 중일 때 에러를 발생시켜야 함', () => {
      recorder.startRecording('match-1', ['agent-a', 'agent-b'], 'classic');
      expect(() => {
        recorder.startRecording('match-2', ['agent-c', 'agent-d'], 'labyrinth');
      }).toThrow('이미 녹화 중입니다');
    });
  });

  describe('recordTick', () => {
    it('녹화 중일 때 틱 기록을 추가해야 함', () => {
      recorder.startRecording('match-1', ['agent-a', 'agent-b'], 'classic');

      recorder.recordTick(1, [
        { agentIndex: 0, direction: 'up' },
        { agentIndex: 1, direction: 'left' },
      ], 'hash-1');

      expect(recorder.getTickCount()).toBe(1);
    });

    it('녹화 중이 아닐 때 에러를 발생시켜야 함', () => {
      expect(() => {
        recorder.recordTick(1, [], 'hash-1');
      }).toThrow('녹화 중이 아닙니다');
    });

    it('여러 틱을 순차적으로 기록해야 함', () => {
      recorder.startRecording('match-1', ['agent-a', 'agent-b'], 'classic');

      recorder.recordTick(1, [{ agentIndex: 0, direction: 'up' }], 'hash-1');
      recorder.recordTick(2, [{ agentIndex: 0, direction: 'right' }], 'hash-2');
      recorder.recordTick(3, [{ agentIndex: 1, direction: 'down' }], 'hash-3');

      expect(recorder.getTickCount()).toBe(3);
    });
  });

  describe('stopRecording', () => {
    it('메타데이터를 완성하고 녹화를 종료해야 함', () => {
      recorder.startRecording('match-1', ['agent-a', 'agent-b'], 'classic');
      recorder.recordTick(1, [], 'hash-1');

      recorder.stopRecording([1000, 1500]);

      expect(recorder.isRecording()).toBe(false);
    });

    it('녹화 중이 아닐 때 에러를 발생시켜야 함', () => {
      expect(() => {
        recorder.stopRecording([100, 200]);
      }).toThrow('녹화 중이 아닙니다');
    });
  });

  describe('getCompressedData', () => {
    it('유효한 gzip 압축 버퍼를 반환해야 함', () => {
      recorder.startRecording('match-1', ['agent-a', 'agent-b'], 'classic', 12345);
      recorder.recordTick(1, [{ agentIndex: 0, direction: 'up' }], 'hash-1');
      recorder.recordTick(2, [{ agentIndex: 1, direction: 'left' }], 'hash-2');
      recorder.stopRecording([500, 700]);

      const compressed = recorder.getCompressedData();

      expect(Buffer.isBuffer(compressed)).toBe(true);
      expect(compressed.length).toBeGreaterThan(0);
    });

    it('녹화가 종료되지 않았을 때 에러를 발생시켜야 함', () => {
      recorder.startRecording('match-1', ['agent-a'], 'classic');

      expect(() => {
        recorder.getCompressedData();
      }).toThrow('녹화가 아직 종료되지 않았습니다');
    });

    it('녹화된 데이터가 없을 때 에러를 발생시켜야 함', () => {
      expect(() => {
        recorder.getCompressedData();
      }).toThrow('녹화된 데이터가 없습니다');
    });
  });

  describe('decompress', () => {
    it('원본 데이터를 복원해야 함', () => {
      recorder.startRecording('match-1', ['agent-a', 'agent-b'], 'classic', 12345);
      recorder.recordTick(1, [{ agentIndex: 0, direction: 'up' }], 'hash-1');
      recorder.recordTick(2, [{ agentIndex: 1, direction: 'left' }], 'hash-2');
      recorder.stopRecording([500, 700]);

      const compressed = recorder.getCompressedData();
      const { metadata, ticks } = ReplayRecorder.decompress(compressed);

      expect(metadata.matchId).toBe('match-1');
      expect(metadata.agents).toEqual(['agent-a', 'agent-b']);
      expect(metadata.mazeVariant).toBe('classic');
      expect(metadata.mazeSeed).toBe(12345);
      expect(metadata.finalScores).toEqual([500, 700]);
      expect(metadata.totalTicks).toBe(2);
      expect(ticks.length).toBe(2);
      expect(ticks[0]?.tick).toBe(1);
      expect(ticks[1]?.tick).toBe(2);
    });

    it('유효하지 않은 데이터일 때 에러를 발생시켜야 함', () => {
      const invalidData = Buffer.from('invalid-data', 'utf-8');

      expect(() => {
        ReplayRecorder.decompress(invalidData);
      }).toThrow('리플레이 압축 해제 실패');
    });
  });

  describe('압축 효율성', () => {
    it('압축된 데이터가 비압축 JSON보다 작아야 함', () => {
      recorder.startRecording('match-1', ['agent-a', 'agent-b'], 'classic', 12345);

      // 많은 틱 데이터 생성
      for (let i = 1; i <= 100; i++) {
        recorder.recordTick(i, [
          { agentIndex: 0, direction: 'up' },
          { agentIndex: 1, direction: 'down' },
        ], `hash-${String(i)}`);
      }

      recorder.stopRecording([5000, 6000]);

      const compressed = recorder.getCompressedData();
      const decompressed = ReplayRecorder.decompress(compressed) as { metadata: unknown; ticks: unknown };
      const { metadata, ticks } = decompressed;

      const uncompressedSize = JSON.stringify({ metadata, ticks }).length;
      const compressedSize = compressed.length;

      expect(compressedSize).toBeLessThan(uncompressedSize);
    });
  });

  describe('getReplayHash', () => {
    it('일관된 해시를 반환해야 함', () => {
      recorder.startRecording('match-1', ['agent-a', 'agent-b'], 'classic', 12345);
      recorder.recordTick(1, [{ agentIndex: 0, direction: 'up' }], 'hash-1');
      recorder.stopRecording([500, 700]);

      const hash1 = recorder.getReplayHash();
      const hash2 = recorder.getReplayHash();

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^0x[0-9a-f]{64}$/i);
    });

    it('다른 데이터는 다른 해시를 생성해야 함', () => {
      const recorder1 = new ReplayRecorder();
      recorder1.startRecording('match-1', ['agent-a'], 'classic');
      recorder1.recordTick(1, [{ agentIndex: 0, direction: 'up' }], 'hash-1');
      recorder1.stopRecording([500]);

      const recorder2 = new ReplayRecorder();
      recorder2.startRecording('match-2', ['agent-b'], 'labyrinth');
      recorder2.recordTick(1, [{ agentIndex: 0, direction: 'down' }], 'hash-2');
      recorder2.stopRecording([600]);

      const hash1 = recorder1.getReplayHash();
      const hash2 = recorder2.getReplayHash();

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('getTickCount', () => {
    it('정확한 틱 수를 반환해야 함', () => {
      expect(recorder.getTickCount()).toBe(0);

      recorder.startRecording('match-1', ['agent-a'], 'classic');
      expect(recorder.getTickCount()).toBe(0);

      recorder.recordTick(1, [], 'hash-1');
      expect(recorder.getTickCount()).toBe(1);

      recorder.recordTick(2, [], 'hash-2');
      recorder.recordTick(3, [], 'hash-3');
      expect(recorder.getTickCount()).toBe(3);
    });
  });

  describe('isRecording', () => {
    it('올바른 녹화 상태를 반환해야 함', () => {
      expect(recorder.isRecording()).toBe(false);

      recorder.startRecording('match-1', ['agent-a'], 'classic');
      expect(recorder.isRecording()).toBe(true);

      recorder.stopRecording([100]);
      expect(recorder.isRecording()).toBe(false);
    });
  });

  describe('전체 라이프사이클', () => {
    it('시작 → 틱 기록 → 종료 → 압축 → 해제 → 검증', () => {
      // 시작
      recorder.startRecording('match-full-test', ['agent-alpha', 'agent-beta'], 'speedway', 99999);
      expect(recorder.isRecording()).toBe(true);

      // 틱 기록
      const tickData: Array<{ tick: number; inputs: Array<{ agentIndex: number; direction: Direction }>; hash: string }> = [
        { tick: 1, inputs: [{ agentIndex: 0, direction: 'up' }, { agentIndex: 1, direction: 'left' }], hash: 'abc123' },
        { tick: 2, inputs: [{ agentIndex: 0, direction: 'right' }, { agentIndex: 1, direction: 'down' }], hash: 'def456' },
        { tick: 3, inputs: [{ agentIndex: 0, direction: 'left' }, { agentIndex: 1, direction: 'up' }], hash: 'ghi789' },
      ];

      tickData.forEach(({ tick, inputs, hash }) => {
        recorder.recordTick(tick, inputs, hash);
      });

      expect(recorder.getTickCount()).toBe(3);

      // 종료
      const finalScores = [8500, 7200];
      recorder.stopRecording(finalScores);
      expect(recorder.isRecording()).toBe(false);

      // 압축
      const compressed = recorder.getCompressedData();
      expect(Buffer.isBuffer(compressed)).toBe(true);

      // 해시 생성
      const hash = recorder.getReplayHash();
      expect(hash).toMatch(/^0x[0-9a-f]{64}$/i);

      // 압축 해제
      const { metadata, ticks } = ReplayRecorder.decompress(compressed);

      // 검증
      expect(metadata.matchId).toBe('match-full-test');
      expect(metadata.agents).toEqual(['agent-alpha', 'agent-beta']);
      expect(metadata.mazeVariant).toBe('speedway');
      expect(metadata.mazeSeed).toBe(99999);
      expect(metadata.totalTicks).toBe(3);
      expect(metadata.finalScores).toEqual(finalScores);
      expect(metadata.endTime).toBeGreaterThanOrEqual(metadata.startTime);

      expect(ticks.length).toBe(3);
      ticks.forEach((tick, idx) => {
        const expectedData = tickData[idx];
        if (expectedData) {
          expect(tick.tick).toBe(expectedData.tick);
          expect(tick.inputs).toEqual(expectedData.inputs);
          expect(tick.stateHash).toBe(expectedData.hash);
        }
      });
    });
  });
});
