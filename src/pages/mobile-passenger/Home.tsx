import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart2Icon,
  TrendingUpIcon,
  ShieldCheckIcon,
  ClockIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const ACCENT = '#0B4F6C';
const RED = '#D34026';

const LINES = ['All Lines', 'LRT Kelana Jaya', 'KTM Komuter', 'MRT Putrajaya', 'MRT Kajang'];

export function Home() {
  const [lineFilter, setLineFilter] = useState('All Lines');
  const [trendDataMap, setTrendDataMap] = useState<Record<string, { day: string; count: number }[]>>({});
  const [lineSummary, setLineSummary] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:5293/api/data/home-stats')
      .then(res => res.json())
      .then(data => {
        setTrendDataMap(data.trendData || {});
        setLineSummary(data.lineSummary || []);
        setRecentReports(data.recentReports || []);
      })
      .catch(err => {
        console.error('Failed to fetch home stats', err);
      });
  }, []);



function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 flex-1 shadow-sm border border-gray-100">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

  const data = trendDataMap[lineFilter] || [];
  const total = data.reduce((s: any, d: any) => s + d.count, 0);
  const peak = Math.max(...data.map(d => d.count));
  const peakDay = data.find(d => d.count === peak)?.day ?? '-';

  return (
    <motion.div
      key="trends"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="px-4 pt-5 pb-6 space-y-4"
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Violation Trends</h2>
          <p className="text-xs text-gray-400 mt-0.5">Last 7 days</p>
        </div>
        <select
          value={lineFilter}
          onChange={e => setLineFilter(e.target.value)}
          className="text-xs bg-gray-50 border border-gray-200 text-gray-700 py-1.5 px-2.5 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/30"
        >
          {LINES.map(l => <option key={l}>{l}</option>)}
        </select>
      </div>

      {/* Stat cards */}
      <div className="flex gap-3">
        <StatCard label="This Week" value={total} sub="incidents" color={ACCENT} />
        <StatCard label="Peak Day" value={peakDay} sub={`${peak} incidents`} color={RED} />
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#EBF4F8' }}>
            <BarChart2Icon size={14} style={{ color: ACCENT }} />
          </div>
          <span className="text-sm font-semibold text-gray-800">Daily Breakdown</span>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} dy={6} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <Tooltip
                cursor={{ fill: '#F3F4F6', radius: 6 } as React.SVGProps<SVGRectElement> & { radius?: number }}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)', fontSize: 12 }}
              />
              <Bar dataKey="count" name="Incidents" radius={[5, 5, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.day === 'Sat' || entry.day === 'Sun' ? RED : ACCENT} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-2 mt-3 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
          <TrendingUpIcon size={13} className="text-orange-500 flex-shrink-0" />
          <p className="text-xs text-orange-700 font-medium">Violations peak on weekends — extra patrols are deployed.</p>
        </div>
      </div>

      {/* Per-line summary */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#EBF4F8' }}>
            <ShieldCheckIcon size={14} style={{ color: ACCENT }} />
          </div>
          <span className="text-sm font-semibold text-gray-800">By Line (weekly total)</span>
        </div>
        <div className="space-y-2.5">
          {lineSummary.map((line: any) => (
            <div key={line.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">{line.name}</span>
                <span className="text-xs font-semibold" style={{ color: line.color }}>
                  {line.value} <span className="text-gray-400 font-normal">({line.pct})</span>
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${line.value}%`, backgroundColor: line.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent reports */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#EBF4F8' }}>
            <ClockIcon size={14} style={{ color: ACCENT }} />
          </div>
          <span className="text-sm font-semibold text-gray-800">Recent Reports</span>
        </div>
        {recentReports.map((r: any) => (
          <div key={r.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-xs font-semibold text-gray-800">{r.type}</p>
              <p className="text-xs text-gray-400">{r.line} · {r.time}</p>
            </div>
            <div className="flex items-center">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                r.status === 'Verified' ? 'bg-green-50 text-green-600' :
                r.status === 'Pending' ? 'bg-yellow-50 text-yellow-600' :
                'bg-gray-50 text-gray-400'
              }`}>{r.status}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
