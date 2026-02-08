import { PayoutClaim } from '@/components/betting/PayoutClaim';

/**
 * 내 배팅 페이지
 *
 * 사용자의 배팅 내역과 수령 가능한 상금을 확인하고
 * 상금을 청구할 수 있는 페이지입니다.
 */
export function MyBets() {
  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-white">내 배팅</h1>
      <PayoutClaim />
    </div>
  );
}
