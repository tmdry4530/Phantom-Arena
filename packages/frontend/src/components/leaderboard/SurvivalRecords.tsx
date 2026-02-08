/** 서바이벌 기록 인터페이스 */
interface SurvivalRecord {
  readonly rank: number;
  readonly player: string;
  readonly value: string;
  readonly round?: number;
  readonly date: string;
}

/** 모의 최고 라운드 데이터 */
const mockHighestRounds: SurvivalRecord[] = [
  { rank: 1, player: '0x1a2b...3c4d', value: '42', date: '2026-02-05' },
  { rank: 2, player: '0x5e6f...7a8b', value: '38', date: '2026-02-04' },
  { rank: 3, player: '0x9c0d...1e2f', value: '35', date: '2026-02-03' },
  { rank: 4, player: '0x3g4h...5i6j', value: '33', date: '2026-02-02' },
  { rank: 5, player: '0x7k8l...9m0n', value: '31', date: '2026-02-01' },
  { rank: 6, player: '0xop1q...2r3s', value: '29', date: '2026-01-31' },
  { rank: 7, player: '0x4t5u...6v7w', value: '28', date: '2026-01-30' },
  { rank: 8, player: '0x8x9y...0z1a', value: '27', date: '2026-01-29' },
  { rank: 9, player: '0xb2c3...d4e5', value: '26', date: '2026-01-28' },
  { rank: 10, player: '0xf6g7...h8i9', value: '25', date: '2026-01-27' },
];

/** 모의 최고 점수 데이터 */
const mockHighScores: SurvivalRecord[] = [
  { rank: 1, player: '0x1a2b...3c4d', value: '125,000', round: 42, date: '2026-02-05' },
  { rank: 2, player: '0x5e6f...7a8b', value: '98,500', round: 38, date: '2026-02-04' },
  { rank: 3, player: '0x9c0d...1e2f', value: '87,200', round: 35, date: '2026-02-03' },
  { rank: 4, player: '0x3g4h...5i6j', value: '76,800', round: 33, date: '2026-02-02' },
  { rank: 5, player: '0x7k8l...9m0n', value: '68,900', round: 31, date: '2026-02-01' },
  { rank: 6, player: '0xop1q...2r3s', value: '62,400', round: 29, date: '2026-01-31' },
  { rank: 7, player: '0x4t5u...6v7w', value: '58,700', round: 28, date: '2026-01-30' },
  { rank: 8, player: '0x8x9y...0z1a', value: '54,300', round: 27, date: '2026-01-29' },
  { rank: 9, player: '0xb2c3...d4e5', value: '51,200', round: 26, date: '2026-01-28' },
  { rank: 10, player: '0xf6g7...h8i9', value: '48,600', round: 25, date: '2026-01-27' },
];

/** 모의 최장 단일 라이프 데이터 */
const mockLongestLives: SurvivalRecord[] = [
  { rank: 1, player: '0x1a2b...3c4d', value: '8분 32초', round: 25, date: '2026-02-05' },
  { rank: 2, player: '0x5e6f...7a8b', value: '7분 15초', round: 22, date: '2026-02-04' },
  { rank: 3, player: '0x9c0d...1e2f', value: '6분 48초', round: 20, date: '2026-02-03' },
  { rank: 4, player: '0x3g4h...5i6j', value: '6분 12초', round: 19, date: '2026-02-02' },
  { rank: 5, player: '0x7k8l...9m0n', value: '5분 55초', round: 18, date: '2026-02-01' },
  { rank: 6, player: '0xop1q...2r3s', value: '5분 38초', round: 17, date: '2026-01-31' },
  { rank: 7, player: '0x4t5u...6v7w', value: '5분 22초', round: 16, date: '2026-01-30' },
  { rank: 8, player: '0x8x9y...0z1a', value: '5분 08초', round: 15, date: '2026-01-29' },
  { rank: 9, player: '0xb2c3...d4e5', value: '4분 51초', round: 14, date: '2026-01-28' },
  { rank: 10, player: '0xf6g7...h8i9', value: '4분 39초', round: 13, date: '2026-01-27' },
];

/** 순위 뱃지 컴포넌트 */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-[#ffd700] to-[#ffb800] px-2 py-1 text-xs font-bold text-gray-900">
        👑
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-[#c0c0c0] to-[#a0a0a0] px-2 py-1 text-xs font-bold text-gray-900">
        🥈
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-[#cd7f32] to-[#b87333] px-2 py-1 text-xs font-bold text-gray-900">
        🥉
      </span>
    );
  }
  return <span className="text-xs font-semibold text-gray-500">{rank}</span>;
}

/** 기록 카드 컴포넌트 */
function RecordCard({
  title,
  icon,
  records,
  columns,
}: {
  title: string;
  icon: string;
  records: SurvivalRecord[];
  columns: Array<{ label: string; key: keyof SurvivalRecord }>;
}) {
  return (
    <div className="rounded-lg bg-arena-card border border-arena-border p-6">
      <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
        <span>{icon}</span>
        {title}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-arena-border">
              <th className="px-3 py-2 text-left text-sm font-semibold text-gray-300">순위</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-left text-sm font-semibold text-gray-300"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr
                key={`${String(record.rank)}-${record.player}`}
                className="border-b border-arena-border/30 transition-colors hover:bg-ghost-violet/10 odd:bg-arena-surface/20"
              >
                <td className="px-3 py-2">
                  <RankBadge rank={record.rank} />
                </td>
                {columns.map((col) => {
                  const value = record[col.key];
                  return (
                    <td
                      key={col.key}
                      className={`px-3 py-2 text-sm ${
                        col.key === 'player'
                          ? 'font-mono text-gray-400'
                          : col.key === 'value'
                            ? 'font-bold text-ghost-neon'
                            : 'text-gray-300'
                      }`}
                    >
                      {value !== undefined ? String(value) : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** 서바이벌 기록 컴포넌트 */
export function SurvivalRecords() {
  return (
    <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-3">
      <RecordCard
        title="최고 라운드"
        icon="🎯"
        records={mockHighestRounds}
        columns={[
          { label: '플레이어', key: 'player' },
          { label: '라운드', key: 'value' },
          { label: '날짜', key: 'date' },
        ]}
      />

      <RecordCard
        title="최고 점수"
        icon="⭐"
        records={mockHighScores}
        columns={[
          { label: '플레이어', key: 'player' },
          { label: '점수', key: 'value' },
          { label: '라운드', key: 'round' },
          { label: '날짜', key: 'date' },
        ]}
      />

      <RecordCard
        title="최장 단일 라이프"
        icon="⏱️"
        records={mockLongestLives}
        columns={[
          { label: '플레이어', key: 'player' },
          { label: '시간', key: 'value' },
          { label: '라운드', key: 'round' },
          { label: '날짜', key: 'date' },
        ]}
      />
    </div>
  );
}
