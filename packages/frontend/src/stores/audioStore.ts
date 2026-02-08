import { create } from 'zustand';

/**
 * 오디오 상태 관리 저장소 인터페이스.
 *
 * 전체 음소거, 마스터 볼륨, BGM/SFX 토글, 초기화 상태를 관리한다.
 */
interface AudioStore {
  /** 전체 음소거 (기본: true, 사용자 제스처 전까지 음소거 유지) */
  muted: boolean;
  /** 마스터 볼륨 (0-1, 기본: 0.7) */
  volume: number;
  /** BGM 활성화 여부 */
  bgmEnabled: boolean;
  /** 효과음 활성화 여부 */
  sfxEnabled: boolean;
  /** 오디오 엔진 초기화 완료 여부 */
  initialized: boolean;

  /** 음소거 토글 */
  toggleMute: () => void;
  /** 마스터 볼륨 설정 (0-1) */
  setVolume: (volume: number) => void;
  /** BGM 토글 */
  toggleBgm: () => void;
  /** SFX 토글 */
  toggleSfx: () => void;
  /** 초기화 상태 설정 */
  setInitialized: (value: boolean) => void;
}

/**
 * 오디오 상태 저장소.
 *
 * 기본 상태: 음소거(true), 볼륨(0.7), BGM/SFX 활성화(true).
 * 사용자 제스처 후 {@link toggleMute}로 음소거 해제 및 초기화를 수행한다.
 */
export const useAudioStore = create<AudioStore>((set) => ({
  muted: true,
  volume: 0.7,
  bgmEnabled: true,
  sfxEnabled: true,
  initialized: false,

  toggleMute: () => { set((state) => ({ muted: !state.muted })); },
  setVolume: (volume) => { set({ volume: Math.max(0, Math.min(1, volume)) }); },
  toggleBgm: () => { set((state) => ({ bgmEnabled: !state.bgmEnabled })); },
  toggleSfx: () => { set((state) => ({ sfxEnabled: !state.sfxEnabled })); },
  setInitialized: (value) => { set({ initialized: value }); },
}));
