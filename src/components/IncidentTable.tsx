import React, { useState } from 'react';
import { ChevronRightIcon, CameraIcon } from 'lucide-react';
import { StatusTimeline, buildTimelineSteps } from './StatusTimeline';
import { useTime } from '../context/TimeContext';
import { formatDateTimeLabel } from '../utils/Time';
import { statusColor, ACCENT, IncidentRow } from '../utils/reportUtils';

export interface IncidentTableProps {
  incidents: IncidentRow[];
  title: string;
  showPagination: boolean;
  page?: number;
  totalPages?: number;
  totalCount?: number;
  onPageChange?: (p: number) => void;
  onViewAll?: () => void;
}

export function IncidentTable({
  incidents, title, showPagination,
  page = 1, totalPages = 1, totalCount,
  onPageChange, onViewAll,
}: IncidentTableProps) {
  const { format } = useTime();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-900">{title}</h3>
        {onViewAll && (
          <button onClick={onViewAll} className="text-xs font-semibold text-[#0B4F6C] hover:underline">
            View all →
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="w-8 px-2" />
              {['Incident ID', 'Train ID (Coach ID)', 'Line', 'DateTime', 'Source', 'Status', 'Evidence'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {incidents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">No incidents found</td>
              </tr>
            ) : incidents.map(inc => {
              const sc = statusColor(inc.status);
              const isAI = inc.type === 'AI Detection';
              const open = expandedId === inc.id;

              const steps = buildTimelineSteps({
                source: inc.type,
                datetime: inc.datetime,
                reportedBy: inc.reportedBy,
                passengerComment: inc.passengerComment,
                confidence: inc.confidence,
                verifiedBy: inc.verifiedBy, verifiedAt: inc.verifiedAt, verifiedComment: inc.verifiedComment,
                enrouteBy: inc.enrouteBy, enrouteAt: inc.enrouteAt, enrouteComment: inc.enrouteComment,
                resolvedBy: inc.resolvedBy, resolvedAt: inc.resolvedAt, resolvedComment: inc.resolvedComment,
                escalatedBy: inc.escalatedBy, escalatedAt: inc.escalatedAt, escalatedComment: inc.escalatedComment,
                dismissedBy: inc.dismissedBy, dismissedAt: inc.dismissedAt, dismissedComment: inc.dismissedComment,
              });

              return (
                <React.Fragment key={inc.id}>
                  <tr
                    className="hover:bg-gray-50 transition-colors cursor-pointer border-t border-gray-50"
                    onClick={() => setExpandedId(open ? null : inc.id)}
                  >
                    <td className="pl-3 pr-1 py-3 text-gray-300">
                      <ChevronRightIcon
                        size={14}
                        className="transition-transform duration-200"
                        style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: ACCENT }}>{inc.id}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold text-gray-800">{inc.trainId} ({inc.coachId})</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{inc.line}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {formatDateTimeLabel(inc.datetime, format)}
                    </td>
                    <td className="px-4 py-3">
                      {isAI ? (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: inc.confidence != null
                              ? inc.confidence >= 0.8 ? 'rgba(239,255,251,1)' : inc.confidence >= 0.5 ? '#fff6efff' : '#ffefefff'
                              : '#EFF6FF',
                            color: inc.confidence != null
                              ? inc.confidence >= 0.8 ? '#2D7A5D' : inc.confidence >= 0.5 ? '#B45309' : '#D34026'
                              : '#0B4F6C',
                          }}
                        >
                          System{inc.confidence != null && ` (${Math.round(inc.confidence * 100)}%)`}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: '#FEF2F0', color: '#D34026' }}>
                          Passenger
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: sc.bg, color: sc.text }}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {inc.imageUrl ? (
                        <a
                          href={`${import.meta.env.VITE_API_BASE}/api/data/incident/${inc.id.replace('ALT-', '').replace('RPT-', '')}/image-redirect`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#0B4F6C] hover:underline font-semibold text-xs flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <CameraIcon size={12} />
                          View
                        </a>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>

                  {open && (
                    <tr className="bg-gray-50/80">
                      <td colSpan={8} className="px-6 pb-6 pt-2">
                        <div className="flex flex-col gap-6">
                          <div className="flex-1">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Audit Timeline</div>
                            <StatusTimeline steps={steps} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            Page {page} of {totalPages}{totalCount !== undefined ? ` · ${totalCount} incidents` : ''}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((item, i) =>
                item === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => onPageChange?.(item as number)}
                    className={`w-8 h-8 text-xs font-medium rounded-lg border transition-colors ${page === item ? 'bg-[#0B4F6C] text-white border-[#0B4F6C]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {item}
                  </button>
                )
              )}
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
