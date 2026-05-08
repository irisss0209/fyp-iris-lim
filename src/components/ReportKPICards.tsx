import { ReportStats, fmtDelta, fmtTimeDiff, getCountDiffText } from '../utils/reportUtils';

interface Props {
  stats: ReportStats | undefined;
  resolutionRate: number;
  resolvedCount: number;
}

export function ReportKPICards({ stats, resolutionRate, resolvedCount }: Props) {
  const cards = [
    {
      label: 'Total Incidents',
      value: stats?.total ?? 0,
      fmt: (v: number) => String(v),
      delta: stats ? fmtDelta(stats.totalDelta, true, stats.totalDifference) : null,
      sub: stats?.hasPreviousData ? getCountDiffText(stats?.totalDifference) : '',
    },
    {
      label: 'Unresolved Incidents',
      value: stats?.unresolvedCount ?? 0,
      fmt: (v: number) => String(v),
      delta: stats ? fmtDelta(stats.unresolvedDelta, true, stats.unresolvedDifference) : null,
      sub: stats?.hasPreviousData ? getCountDiffText(stats?.unresolvedDifference) : 'not resolved or dismissed',
    },
    {
      label: 'Resolution Rate',
      value: stats?.resolutionRate ?? resolutionRate,
      fmt: (v: number) => `${v}%`,
      delta: stats ? fmtDelta(stats.resolutionDelta, false) : null,
      sub: stats?.hasPreviousData
        ? getCountDiffText(stats?.resolvedDifference)
        : `${resolvedCount} of ${stats?.total ?? 0} resolved`,
    },
    {
      label: 'Avg Response Time',
      value: stats?.avgResponseMinutes ?? 0,
      fmt: (v: number) => {
        if (v === 0)     return 'N/A';
        if (v < 60)      return `${v} min`;
        if (v < 1440)    return `${(v / 60).toFixed(1)} hr`;
        return `${(v / 1440).toFixed(1)} day`;
      },
      delta: stats ? fmtDelta(stats.avgResponseDelta, true) : null,
      sub: stats?.avgResponseDifference
        ? `${fmtTimeDiff(stats.avgResponseDifference)} than last month`
        : (stats?.avgResponseMinutes === 0 ? 'No verified incidents' : ''),
    },
    {
      label: 'False Alarm Rate',
      value: stats?.falseAlarmRate ?? 0,
      fmt: (v: number) => `${v}%`,
      delta: stats ? fmtDelta(stats.falseAlarmDelta, true) : null,
      sub: stats?.hasPreviousData ? getCountDiffText(stats?.dismissedDifference) : 'No previous data',
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Key performance metrics</h2>
      </div>
      <div className="grid grid-cols-5 gap-4">
        {cards.map(card => (
          <div key={card.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-400">{card.label}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{card.fmt(card.value)}</div>
            <div className="flex flex-col mt-1.5">
              {!stats?.hasPreviousData ? (
                <span className="text-xs text-gray-400">No previous data</span>
              ) : card.delta ? (
                <span className="text-xs font-semibold" style={{ color: card.delta.good ? '#2D7A5D' : '#D34026' }}>
                  {card.delta.label} from last month
                </span>
              ) : (
                <span className="text-xs text-gray-400">No change</span>
              )}
              {card.sub && <span className="text-xs text-gray-400">{card.sub}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
