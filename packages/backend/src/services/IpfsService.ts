import crypto from 'node:crypto';
import pino from 'pino';
import { z } from 'zod';
import { loadEnv } from '../config.js';

const logger = pino({ name: 'ipfs-service' });

/**
 * Pinata API 응답 스키마
 */
const pinataResponseSchema = z.object({
  IpfsHash: z.string(),
  PinSize: z.number(),
  Timestamp: z.string(),
});

/**
 * IPFS 업로드 에러
 */
export class IpfsUploadError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'IpfsUploadError';
  }
}

/**
 * IPFS 서비스 설정
 */
export interface IpfsServiceConfig {
  readonly apiKey: string;
  readonly secretKey: string;
}

/**
 * Pinata를 통한 IPFS 업로드 서비스
 *
 * API 키가 설정되지 않은 경우 mock 모드로 동작하여 개발 환경에서 사용 가능
 */
export class IpfsService {
  private readonly apiKey?: string;
  private readonly secretKey?: string;
  private readonly fallbackMode: boolean;

  private static readonly PINATA_API_BASE = 'https://api.pinata.cloud';
  private static readonly PIN_JSON_ENDPOINT = '/pinning/pinJSONToIPFS';
  private static readonly PIN_FILE_ENDPOINT = '/pinning/pinFileToIPFS';
  private static readonly UNPIN_ENDPOINT = '/pinning/unpin';

  constructor(serviceConfig?: IpfsServiceConfig) {
    // 생성자 파라미터 우선, 없으면 환경변수 사용
    const env = loadEnv();
    this.apiKey = serviceConfig?.apiKey ?? env.PINATA_API_KEY;
    this.secretKey = serviceConfig?.secretKey ?? env.PINATA_SECRET_KEY;

    // API 키 둘 다 있어야 정상 모드
    this.fallbackMode = (this.apiKey === undefined || this.apiKey.length === 0) ||
                        (this.secretKey === undefined || this.secretKey.length === 0);

    if (this.fallbackMode) {
      logger.warn(
        'IPFS API 키가 설정되지 않았습니다. Mock 모드로 동작합니다.',
      );
    } else {
      logger.info('IPFS 서비스 초기화 완료 (Pinata API 연결)');
    }
  }

  /**
   * JSON 데이터를 IPFS에 업로드
   *
   * @param data - 업로드할 JSON 데이터
   * @param name - 파일 메타데이터 이름
   * @returns IPFS URI (ipfs://CID)
   */
  async pinJSON(data: unknown, name: string): Promise<string> {
    if (this.fallbackMode) {
      return this.generateMockCid();
    }

    try {
      const response = await fetch(
        `${IpfsService.PINATA_API_BASE}${IpfsService.PIN_JSON_ENDPOINT}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            pinata_api_key: this.apiKey ?? '',
            pinata_secret_api_key: this.secretKey ?? '',
          },
          body: JSON.stringify({
            pinataContent: data,
            pinataMetadata: {
              name,
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new IpfsUploadError(
          `JSON 업로드 실패: ${response.statusText}`,
          response.status,
          errorText,
        );
      }

      const responseData: unknown = await response.json();
      const parsed = pinataResponseSchema.safeParse(responseData);

      if (!parsed.success) {
        throw new IpfsUploadError(
          'Pinata 응답 스키마 검증 실패',
          undefined,
          parsed.error,
        );
      }

      const cid = parsed.data.IpfsHash;
      logger.info({ cid, name }, 'JSON IPFS 업로드 성공');

      return `ipfs://${cid}`;
    } catch (error) {
      if (error instanceof IpfsUploadError) {
        throw error;
      }
      throw new IpfsUploadError(
        'JSON 업로드 중 예상치 못한 오류 발생',
        undefined,
        error,
      );
    }
  }

  /**
   * 파일을 IPFS에 업로드
   *
   * @param buffer - 파일 바이너리 버퍼
   * @param fileName - 파일 이름
   * @returns IPFS URI (ipfs://CID)
   */
  async pinFile(buffer: Buffer, fileName: string): Promise<string> {
    if (this.fallbackMode) {
      return this.generateMockCid();
    }

    try {
      // FormData 생성 (Node.js 18+에서 기본 제공)
      const formData = new FormData();
      const blob = new Blob([buffer]);
      formData.append('file', blob, fileName);
      formData.append(
        'pinataMetadata',
        JSON.stringify({
          name: fileName,
        }),
      );

      const response = await fetch(
        `${IpfsService.PINATA_API_BASE}${IpfsService.PIN_FILE_ENDPOINT}`,
        {
          method: 'POST',
          headers: {
            pinata_api_key: this.apiKey ?? '',
            pinata_secret_api_key: this.secretKey ?? '',
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new IpfsUploadError(
          `파일 업로드 실패: ${response.statusText}`,
          response.status,
          errorText,
        );
      }

      const responseData: unknown = await response.json();
      const parsed = pinataResponseSchema.safeParse(responseData);

      if (!parsed.success) {
        throw new IpfsUploadError(
          'Pinata 응답 스키마 검증 실패',
          undefined,
          parsed.error,
        );
      }

      const cid = parsed.data.IpfsHash;
      logger.info({ cid, fileName }, '파일 IPFS 업로드 성공');

      return `ipfs://${cid}`;
    } catch (error) {
      if (error instanceof IpfsUploadError) {
        throw error;
      }
      throw new IpfsUploadError(
        '파일 업로드 중 예상치 못한 오류 발생',
        undefined,
        error,
      );
    }
  }

  /**
   * IPFS에서 파일 언핀 (삭제)
   *
   * @param cid - IPFS CID (ipfs:// 프리픽스 포함 또는 제외)
   */
  async unpin(cid: string): Promise<void> {
    if (this.fallbackMode) {
      logger.debug({ cid }, 'Mock 모드: unpin 무시');
      return;
    }

    // ipfs:// 프리픽스 제거
    const cleanCid = cid.replace(/^ipfs:\/\//, '');

    try {
      const response = await fetch(
        `${IpfsService.PINATA_API_BASE}${IpfsService.UNPIN_ENDPOINT}/${cleanCid}`,
        {
          method: 'DELETE',
          headers: {
            pinata_api_key: this.apiKey ?? '',
            pinata_secret_api_key: this.secretKey ?? '',
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new IpfsUploadError(
          `언핀 실패: ${response.statusText}`,
          response.status,
          errorText,
        );
      }

      logger.info({ cid: cleanCid }, 'IPFS 언핀 성공');
    } catch (error) {
      if (error instanceof IpfsUploadError) {
        throw error;
      }
      throw new IpfsUploadError(
        '언핀 중 예상치 못한 오류 발생',
        undefined,
        error,
      );
    }
  }

  /**
   * Fallback 모드에서 사용할 mock CID 생성
   */
  private generateMockCid(): string {
    const mockCid = `mock-${crypto.randomUUID()}`;
    logger.debug({ mockCid }, 'Mock CID 생성');
    return `ipfs://${mockCid}`;
  }
}
