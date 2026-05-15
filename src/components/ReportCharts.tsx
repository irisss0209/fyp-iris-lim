import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { StatusSlice, LineInfo, ByTrainItem, getLineColor } from '../utils/reportUtils';

interface Props {
  dailyData: Record<string, number | string>[];
  lines: LineInfo[];
  statusBreakdown: StatusSlice[];
  byTrain: ByTrainItem[];
  sourceSplit: StatusSlice[];
  selectedMonthLabel: string;
  isCapturing?: boolean;
}

export function ReportCharts({ dailyData, lines, statusBreakdown, byTrain, sourceSplit, selectedMonthLabel, isCapturing = false }: Props) {
  return (
    <>
      {/* Row 1: Daily by Line + Status Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <div id="pdf-chart-daily" className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-sm text-gray-900 mb-1">Daily Incidents by Line</h3>
          <p className="text-xs text-gray-400 mb-4">Grouped by day of week for {selectedMonthLabel}</p>
          {dailyData.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-sm text-gray-400">No incidents this month</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyData} barSize={8} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#4A5568' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#4A5568' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {lines.map(l => (
                  <Bar key={l.lineId} dataKey={l.lineName} fill={getLineColor(l.lineId)} radius={[3, 3, 0, 0]} isAnimationActive={!isCapturing} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div id="pdf-chart-status" className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-sm text-gray-900 mb-1">Resolution Status Breakdown</h3>
          <p className="text-xs text-gray-400 mb-4">Distribution of final incident outcomes</p>
          {statusBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-sm text-gray-400">No incidents this month</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={3} dataKey="value" isAnimationActive={!isCapturing}>
                    {statusBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {(() => {
                  const total = statusBreakdown.reduce((s, x) => s + x.value, 0);
                  return statusBreakdown.map(item => {
                    const pct = total > 0 ? Math.round(item.value * 100 / total) : 0;
                    return (
                      <div key={item.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-xs text-gray-600">{item.name}</span>
                          </div>
                          <span className="text-xs font-bold" style={{ color: item.color }}>{item.value}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Incidents by Train + Source Split */}
      <div className="grid grid-cols-3 gap-4">
        <div id="pdf-chart-train" className="col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-sm text-gray-900 mb-1">Incidents by Train</h3>
          <div className="flex items-center gap-4 mb-4">
            <p className="text-xs text-gray-400 flex-1">Top {byTrain.length} trains by incident volume</p>
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: '#2D7A5D' }} /> ≥70% closed</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: '#B45309' }} /> 40–70%</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: '#D34026' }} /> &lt;40%</span>
            </div>
          </div>
          {byTrain.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-sm text-gray-400">No incidents this month</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, byTrain.length * 36)}>
              <BarChart data={byTrain} layout="vertical" barSize={14} margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#4A5568' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="train" width={190} tick={{ fontSize: 11, fill: '#4A5568' }} axisLine={false} tickLine={false}
                  tickFormatter={(value) => {
                    const item = byTrain.find(t => t.train === value);
                    return item?.line ? `${value} (${item.line})` : value;
                  }}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
                  formatter={(value: number, _name, props) => [
                    `${value} incidents · ${props.payload.closed} resolved/dismissed`, 'Count',
                  ]}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} isAnimationActive={!isCapturing}>
                  {byTrain.map((entry, i) => {
                    const rate = entry.count > 0 ? entry.closed / entry.count : 0;
                    const fill = rate >= 0.7 ? '#2D7A5D' : rate >= 0.4 ? '#B45309' : '#D34026';
                    return <Cell key={i} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div id="pdf-chart-source" className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-sm text-gray-900 mb-1">Incident Source</h3>
          <p className="text-xs text-gray-400 mb-4">AI Detection vs Passenger Report</p>
          {sourceSplit.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-sm text-gray-400">No data</div>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={sourceSplit} cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={4} dataKey="value" isAnimationActive={!isCapturing}>
                    {sourceSplit.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-3">
                {(() => {
                  const total = sourceSplit.reduce((s, x) => s + x.value, 0);
                  return sourceSplit.map(s => {
                    const pct = total > 0 ? Math.round(s.value * 100 / total) : 0;
                    return (
                      <div key={s.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                            <span className="text-xs text-gray-600">{s.name}</span>
                          </div>
                          <span className="text-xs font-bold" style={{ color: s.color }}>{pct}% ({s.value})</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
