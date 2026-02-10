/** API base URL */
export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001/api/v1';

/** Default headers for all API requests (includes ngrok browser warning bypass) */
const defaultHeaders: HeadersInit = {
  'ngrok-skip-browser-warning': 'true',
};

/**
 * Fetch wrapper that adds default headers for ngrok compatibility
 *
 * ngrok 무료 티어는 브라우저 경고 페이지를 HTML로 반환하는데,
 * 이 헤더를 추가하면 JSON 응답을 직접 받을 수 있습니다.
 *
 * @param url - 요청 URL
 * @param init - fetch 옵션
 * @returns fetch Promise
 */
export function fetchApi(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      ...defaultHeaders,
      ...init?.headers,
    },
  });
}
