import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XIcon,
  ActivityIcon,
  TrainIcon,
  WifiIcon,
  AlertTriangleIcon } from
'lucide-react';
type LineHealth = {
  line: string;
  color: string;
  status: 'nominal' | 'degraded' | 'critical';
  activeCoaches: number;
  alerts: number;
};
type SystemStats = {
  totalCoaches: number;
  activeLines: number;
  resolvedToday: number;
  avgResponseTime: string;
  systemUptime: string;
};
type SystemDrawerProps = {
  open: boolean;
  onClose: () => void;
};
const lineHealth: LineHealth[] = [
{
  line: 'Red',
  color: '#DC2626',
  status: 'nominal',
  activeCoaches: 24,
  alerts: 0
},
{
  line: 'Blue',
  color: '#2563EB',
  status: 'degraded',
  activeCoaches: 18,
  alerts: 3
},
{
  line: 'Green',
  color: '#16A34A',
  status: 'nominal',
  activeCoaches: 21,
  alerts: 0
},
{
  line: 'Orange',
  color: '#EA580C',
  status: 'critical',
  activeCoaches: 15,
  alerts: 7
},
{
  line: 'Purple',
  color: '#7C3AED',
  status: 'nominal',
  activeCoaches: 12,
  alerts: 1
},
{
  line: 'Yellow',
  color: '#CA8A04',
  status: 'nominal',
  activeCoaches: 9,
  alerts: 0
}];

const systemStats: SystemStats = {
  totalCoaches: 99,
  activeLines: 6,
  resolvedToday: 14,
  avgResponseTime: '1m 42s',
  systemUptime: '99.8%'
};
function StatusPill({ status }: {status: LineHealth['status'];}) {
  const config = {
    nominal: {
      label: 'Nominal',
      bg: '#F0FDF4',
      color: '#2D7A5D'
    },
    degraded: {
      label: 'Degraded',
      bg: '#FFFBEB',
      color: '#D97706'
    },
    critical: {
      label: 'Critical',
      bg: '#FEF2F2',
      color: '#D34026'
    }
  }[status];
  return (
    <span
      className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{
        backgroundColor: config.bg,
        color: config.color
      }}>

      {config.label}
    </span>);

}
export function SystemDrawer({ open, onClose }: SystemDrawerProps) {
  return (
    <AnimatePresence>
      {open &&
      <>
          {/* Backdrop */}
          <motion.div
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: 1
          }}
          exit={{
            opacity: 0
          }}
          transition={{
            duration: 0.2
          }}
          className="fixed inset-0 z-40"
          style={{
            backgroundColor: 'rgba(0,0,0,0.12)'
          }}
          onClick={onClose}
          aria-hidden="true" />


          {/* Drawer panel */}
          <motion.aside
          initial={{
            x: '-100%'
          }}
          animate={{
            x: 0
          }}
          exit={{
            x: '-100%'
          }}
          transition={{
            type: 'spring',
            stiffness: 320,
            damping: 32
          }}
          className="fixed left-0 top-0 bottom-0 z-50 bg-white border-r border-[#E2E8F0] overflow-y-auto"
          style={{
            width: '320px',
            paddingTop: '52px'
          }}
          role="complementary"
          aria-label="System statistics and line health">

            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <ActivityIcon
                size={15}
                style={{
                  color: '#2D7A5D'
                }} />

                <span className="text-sm font-semibold text-gray-900">
                  System Overview
                </span>
              </div>
              <button
              onClick={onClose}
              aria-label="Close system drawer"
              className="w-7 h-7 flex items-center justify-center rounded text-[#4A5568] hover:bg-[#F7FAFC] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]">

                <XIcon size={15} />
              </button>
            </div>

            <div className="px-5 py-5 space-y-6">
              {/* System stats grid */}
              <section aria-labelledby="stats-heading">
                <h3
                id="stats-heading"
                className="text-[11px] font-semibold uppercase tracking-widest text-[#A0AEC0] mb-3">

                  System Stats
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <div
                  className="rounded-xl p-3.5"
                  style={{
                    backgroundColor: '#F7FAFC'
                  }}>

                    <div className="text-xl font-semibold text-gray-900 tabular-nums">
                      {systemStats.totalCoaches}
                    </div>
                    <div className="text-xs text-[#4A5568] mt-0.5">
                      Total coaches
                    </div>
                  </div>
                  <div
                  className="rounded-xl p-3.5"
                  style={{
                    backgroundColor: '#F7FAFC'
                  }}>

                    <div className="text-xl font-semibold text-gray-900 tabular-nums">
                      {systemStats.activeLines}
                    </div>
                    <div className="text-xs text-[#4A5568] mt-0.5">
                      Active lines
                    </div>
                  </div>
                  <div
                  className="rounded-xl p-3.5"
                  style={{
                    backgroundColor: '#F0FDF4'
                  }}>

                    <div
                    className="text-xl font-semibold tabular-nums"
                    style={{
                      color: '#2D7A5D'
                    }}>

                      {systemStats.resolvedToday}
                    </div>
                    <div className="text-xs text-[#4A5568] mt-0.5">
                      Resolved today
                    </div>
                  </div>
                  <div
                  className="rounded-xl p-3.5"
                  style={{
                    backgroundColor: '#F7FAFC'
                  }}>

                    <div className="text-xl font-semibold text-gray-900 tabular-nums">
                      {systemStats.avgResponseTime}
                    </div>
                    <div className="text-xs text-[#4A5568] mt-0.5">
                      Avg response
                    </div>
                  </div>
                </div>

                {/* Uptime bar */}
                <div
                className="mt-2.5 rounded-xl p-3.5 flex items-center justify-between"
                style={{
                  backgroundColor: '#F0FDF4'
                }}>

                  <div className="flex items-center gap-2">
                    <WifiIcon
                    size={14}
                    style={{
                      color: '#2D7A5D'
                    }} />

                    <span className="text-xs text-[#4A5568]">
                      System uptime
                    </span>
                  </div>
                  <span
                  className="text-sm font-semibold tabular-nums"
                  style={{
                    color: '#2D7A5D'
                  }}>

                    {systemStats.systemUptime}
                  </span>
                </div>
              </section>

              {/* Divider */}
              <div className="border-t border-[#E2E8F0]" />

              {/* Coach line health */}
              <section aria-labelledby="line-health-heading">
                <h3
                id="line-health-heading"
                className="text-[11px] font-semibold uppercase tracking-widest text-[#A0AEC0] mb-3">

                  Coach Line Health
                </h3>
                <div className="space-y-2">
                  {lineHealth.map((line) =>
                <div
                  key={line.line}
                  className="flex items-center gap-3 py-2.5 px-3.5 rounded-xl"
                  style={{
                    backgroundColor: '#F7FAFC'
                  }}>

                      {/* Line color dot */}
                      <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: line.color
                    }}
                    aria-hidden="true" />


                      {/* Line name */}
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <TrainIcon size={12} className="text-[#A0AEC0]" />
                        <span className="text-sm font-medium text-gray-800">
                          {line.line}
                        </span>
                      </div>

                      {/* Coach count */}
                      <span className="text-xs text-[#4A5568] tabular-nums">
                        {line.activeCoaches}
                      </span>

                      {/* Alert count */}
                      {line.alerts > 0 &&
                  <div className="flex items-center gap-1">
                          <AlertTriangleIcon
                      size={11}
                      style={{
                        color:
                        line.status === 'critical' ?
                        '#D34026' :
                        '#D97706'
                      }} />

                          <span
                      className="text-xs font-semibold tabular-nums"
                      style={{
                        color:
                        line.status === 'critical' ?
                        '#D34026' :
                        '#D97706'
                      }}>

                            {line.alerts}
                          </span>
                        </div>
                  }

                      {/* Status pill */}
                      <StatusPill status={line.status} />
                    </div>
                )}
                </div>
              </section>
            </div>
          </motion.aside>
        </>
      }
    </AnimatePresence>);

}