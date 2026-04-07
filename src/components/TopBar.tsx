import React, { useEffect, useState } from 'react';
import { AlertTriangleIcon, MenuIcon } from 'lucide-react';
type TopBarProps = {
  unresolvedCount: number;
  onDrawerToggle: () => void;
  drawerOpen: boolean;
};
export function TopBar({
  unresolvedCount,
  onDrawerToggle,
  drawerOpen
}: TopBarProps) {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  const formattedTime = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const formattedDate = time.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#E2E8F0]"
      style={{
        height: '52px'
      }}
      role="banner">

      <div className="flex items-center justify-between h-full px-5">
        {/* Left: drawer toggle + logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={onDrawerToggle}
            aria-label={
            drawerOpen ? 'Close system drawer' : 'Open system drawer'
            }
            aria-expanded={drawerOpen}
            className="w-8 h-8 flex items-center justify-center rounded text-[#4A5568] hover:bg-[#F7FAFC] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0B4F6C] focus:ring-offset-1">

            <MenuIcon size={18} />
          </button>

          <div className="flex items-center gap-2.5">
            {/* Logo mark */}
            <img
              src="/background_removalTUFIQ21QM3BWdUUjMSM2Y2FmMjhhNTNhMzRiYzBiNTFlMTQ3ZGQxNmEyZTRmMCMyODE2IyNUUkFOU0ZPUk1BVElPTl9SRVFVRVNU.png"
              alt="Railly"
              className="w-7 h-7 rounded-md object-cover flex-shrink-0"
              aria-hidden="true" />

            <span className="text-sm font-semibold text-gray-900 tracking-tight">
              Railly
            </span>
            <span className="hidden sm:inline text-xs text-[#4A5568] font-normal">
              Operator Console
            </span>
          </div>
        </div>

        {/* Right: clock + alert count */}
        <div className="flex items-center gap-5">
          {/* Live clock */}
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-gray-900 tabular-nums leading-none">
              {formattedTime}
            </div>
            <div className="text-[11px] text-[#4A5568] leading-none mt-0.5">
              {formattedDate}
            </div>
          </div>

          {/* Unresolved alert count */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: unresolvedCount > 0 ? '#FEF2F2' : '#F0FDF4'
            }}
            role="status"
            aria-live="polite"
            aria-label={`${unresolvedCount} unresolved alert${unresolvedCount !== 1 ? 's' : ''}`}>

            <AlertTriangleIcon
              size={13}
              style={{
                color: unresolvedCount > 0 ? '#D34026' : '#2D7A5D'
              }} />

            <span
              className="text-xs font-semibold tabular-nums"
              style={{
                color: unresolvedCount > 0 ? '#D34026' : '#2D7A5D'
              }}>

              {unresolvedCount}
            </span>
            <span className="text-xs text-[#4A5568] hidden md:inline">
              unresolved
            </span>
          </div>
        </div>
      </div>
    </header>);

}