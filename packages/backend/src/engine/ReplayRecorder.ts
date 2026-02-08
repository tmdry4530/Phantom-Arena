/**
 * Ghost Protocol 리플레이 녹화 시스템
 * 게임 로그를 압축하여 저장하고 재생 가능한 형태로 관리
 */
import { gzipSync, gunzipSync } from 'node:zlib';
import { keccak256 } from 'ethers';
import type { Direction, MazeVariant } from '@ghost-protocol/shared';

/** 리플레이 메타데이터 */
export interface ReplayMetadata {
  readonly matchId: string;
  readonly agents: readonly string[];
  readonly mazeVariant: MazeVariant;
  readonly mazeSeed?: number;
  readonly startTime: number;
  readonly endTime: number;
  readonly totalTicks: number;
  readonly finalScores: readonly number[];
}

/** 틱별 기록 데이터 */
export interface TickRecord {
  readonly tick: number;
  readonly inputs: readonly { readonly agentIndex: number; readonly direction: Direction }[];
  readonly stateHash: string;
}

/**
 * 게임 리플레이 녹화기
 * 매치의 모든 입력과 상태를 기록하여 재생 가능한 리플레이 생성
 */
export class ReplayRecorder {
  private recording: boolean = false;
  private metadata: ReplayMetadata | null = null;
  private ticks: TickRecord[] = [];

  /**
   * 녹화 시작
   * @param matchId 매치 고유 ID
   * @param agents 참가 에이전트 주소 목록
   * @param mazeVariant 미로 변형 타입
   * @param mazeSeed 미로 생성 시드 (선택)
   */
  startRecording(
    matchId: string,
    agents: string[],
    mazeVariant: MazeVariant,
    mazeSeed?: number
  ): void {
    if (this.recording) {
      throw new Error('이미 녹화 중입니다. 먼저 stopRecording()을 호출하세요.');
    }

    this.metadata = {
      matchId,
      agents,
      mazeVariant,
      mazeSeed,
      startTime: Date.now(),
      endTime: 0,
      totalTicks: 0,
      finalScores: [],
    };

    this.ticks = [];
    this.recording = true;
  }

  /**
   * 틱 기록
   * @param tick 현재 틱 번호
   * @param inputs 각 에이전트의 입력 정보
   * @param stateHash 현재 상태의 해시값 (검증용)
   */
  recordTick(
    tick: number,
    inputs: { agentIndex: number; direction: Direction }[],
    stateHash: string
  ): void {
    if (!this.recording) {
      throw new Error('녹화 중이 아닙니다. 먼저 startRecording()을 호출하세요.');
    }

    this.ticks.push({
      tick,
      inputs,
      stateHash,
    });
  }

  /**
   * 녹화 종료
   * @param finalScores 각 에이전트의 최종 점수
   */
  stopRecording(finalScores: number[]): void {
    if (!this.recording) {
      throw new Error('녹화 중이 아닙니다.');
    }

    if (!this.metadata) {
      throw new Error('메타데이터가 초기화되지 않았습니다.');
    }

    // 메타데이터를 불변 객체로 재생성하여 finalScores 추가
    this.metadata = {
      ...this.metadata,
      endTime: Date.now(),
      totalTicks: this.ticks.length,
      finalScores,
    };

    this.recording = false;
  }

  /**
   * 압축된 리플레이 데이터 반환
   * @returns gzip 압축된 리플레이 데이터 (Buffer)
   */
  getCompressedData(): Buffer {
    if (this.recording) {
      throw new Error('녹화가 아직 종료되지 않았습니다. 먼저 stopRecording()을 호출하세요.');
    }

    if (!this.metadata) {
      throw new Error('녹화된 데이터가 없습니다.');
    }

    const replayData = {
      metadata: this.metadata,
      ticks: this.ticks,
    };

    const jsonString = JSON.stringify(replayData);
    const compressed = gzipSync(Buffer.from(jsonString, 'utf-8'));

    return compressed;
  }

  /**
   * 리플레이 데이터 해시 반환 (keccak256)
   * @returns 압축된 리플레이 데이터의 keccak256 해시
   */
  getReplayHash(): string {
    const compressedData = this.getCompressedData();
    return keccak256(compressedData);
  }

  /**
   * 압축 데이터에서 리플레이 복원
   * @param data gzip 압축된 리플레이 데이터
   * @returns 메타데이터와 틱 기록
   */
  static decompress(data: Buffer): { metadata: ReplayMetadata; ticks: TickRecord[] } {
    try {
      const decompressed = gunzipSync(data);
      const jsonString = decompressed.toString('utf-8');
      const parsed: unknown = JSON.parse(jsonString);

      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('유효하지 않은 리플레이 데이터 형식입니다.');
      }

      const obj = parsed as Record<string, unknown>;
      if (obj.metadata === undefined || obj.metadata === null || obj.ticks === undefined || obj.ticks === null) {
        throw new Error('유효하지 않은 리플레이 데이터 형식입니다.');
      }

      return {
        metadata: obj.metadata as ReplayMetadata,
        ticks: obj.ticks as TickRecord[],
      };
    } catch (error) {
      throw new Error(`리플레이 압축 해제 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 녹화 중 여부
   * @returns 현재 녹화 상태
   */
  isRecording(): boolean {
    return this.recording;
  }

  /**
   * 현재 기록된 틱 수
   * @returns 틱 배열의 길이
   */
  getTickCount(): number {
    return this.ticks.length;
  }
}
