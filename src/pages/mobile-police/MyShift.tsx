import {
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  TrendingUpIcon } from
'lucide-react';
export function PoliceMyShift() {
  const shiftTimeline = [
  {
    time: '14:00',
    event: 'Shift started',
    type: 'start',
    done: true
  },
  {
    time: '14:15',
    event: 'Patrol — KL Sentral',
    type: 'patrol',
    done: true
  },
  {
    time: '14:32',
    event: 'Alert responded — Masjid Jamek',
    type: 'alert',
    done: true
  },
  {
    time: '14:44',
    event: 'Case GC-2025-0142 resolved',
    type: 'resolved',
    done: true
  },
  {
    time: '15:00',
    event: 'Patrol — Masjid Jamek',
    type: 'patrol',
    done: true
  },
  {
    time: '15:30',
    event: 'Break',
    type: 'break',
    done: false
  },
  {
    time: '22:00',
    event: 'Shift ends',
    type: 'end',
    done: false
  }];

  const typeColors: Record<string, string> = {
    start: '#0B4F6C',
    patrol: '#4A5568',
    alert: '#D34026',
    resolved: '#2D7A5D',
    break: '#F6AD55',
    end: '#0B4F6C'
  };
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 pt-4 pb-2">
        <h2
          className="text-lg font-bold"
          style={{
            color: '#1A202C'
          }}>

          My Shift
        </h2>
      </div>

      {/* Current Shift Card */}
      <div
        className="mx-4 mb-3 rounded-2xl p-4 text-white"
        style={{
          background: 'linear-gradient(135deg, #0B4F6C, #0d6b8f)'
        }}>

        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-semibold">ON DUTY</span>
        </div>
        <div className="text-lg font-bold">Shift 2</div>
        <div className="text-white/70 text-sm">14:00 – 22:00</div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white/10 rounded-lg px-3 py-2">
            <div className="text-white/60 mb-0.5">Zone</div>
            <div className="font-semibold">KL Sentral & Masjid Jamek</div>
          </div>
          <div className="bg-white/10 rounded-lg px-3 py-2">
            <div className="text-white/60 mb-0.5">Supervisor</div>
            <div className="font-semibold">DSP Hafizuddin</div>
          </div>
        </div>
      </div>

      {/* Performance */}
      <div className="mx-4 mb-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUpIcon
            className="w-4 h-4"
            style={{
              color: '#0B4F6C'
            }} />

          <span
            className="text-sm font-semibold"
            style={{
              color: '#1A202C'
            }}>

            Shift Performance
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
          {
            label: 'Alerts Responded',
            value: '3',
            color: '#0B4F6C'
          },
          {
            label: 'Avg Response Time',
            value: '4.2m',
            color: '#2D7A5D'
          },
          {
            label: 'Cases Closed',
            value: '2',
            color: '#2D7A5D'
          },
          {
            label: 'Compliance Score',
            value: '96%',
            color: '#2D7A5D'
          }].
          map((stat) =>
          <div key={stat.label} className="bg-gray-50 rounded-xl p-3">
              <div
              className="text-xl font-bold"
              style={{
                color: stat.color
              }}>

                {stat.value}
              </div>
              <div
              className="text-xs"
              style={{
                color: '#4A5568'
              }}>

                {stat.label}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mx-4 mb-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex justify-between text-xs mb-2">
          <span
            style={{
              color: '#4A5568'
            }}>

            Shift Progress
          </span>
          <span
            style={{
              color: '#0B4F6C'
            }}
            className="font-semibold">

            19% complete
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: '19%',
              backgroundColor: '#0B4F6C'
            }} />

        </div>
        <div
          className="flex justify-between text-xs mt-1"
          style={{
            color: '#4A5568'
          }}>

          <span>14:00</span>
          <span>Now: 15:32</span>
          <span>22:00</span>
        </div>
      </div>

      {/* Shift Timeline */}
      <div className="mx-4 mb-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <ClockIcon
            className="w-4 h-4"
            style={{
              color: '#0B4F6C'
            }} />

          <span
            className="text-sm font-semibold"
            style={{
              color: '#1A202C'
            }}>

            Today's Timeline
          </span>
        </div>
        <div className="space-y-3">
          {shiftTimeline.map((item, i) =>
          <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: item.done ?
                  typeColors[item.type] :
                  '#E2E8F0'
                }}>

                  {item.done ?
                <CheckCircleIcon className="w-3 h-3 text-white" /> :

                <div className="w-2 h-2 rounded-full bg-gray-300" />
                }
                </div>
                {i < shiftTimeline.length - 1 &&
              <div
                className="w-0.5 h-5 mt-1"
                style={{
                  backgroundColor: item.done ?
                  typeColors[item.type] + '40' :
                  '#E2E8F0'
                }} />

              }
              </div>
              <div className="pb-1 flex-1">
                <div className="flex items-center gap-2">
                  <span
                  className="text-xs font-bold"
                  style={{
                    color: item.done ? typeColors[item.type] : '#A0AEC0'
                  }}>

                    {item.time}
                  </span>
                  <span
                  className="text-sm"
                  style={{
                    color: item.done ? '#1A202C' : '#A0AEC0'
                  }}>

                    {item.event}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assignment Details */}
      <div className="mx-4 mb-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div
          className="text-sm font-semibold mb-3"
          style={{
            color: '#1A202C'
          }}>

          Assignment Details
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-sm">
            <MapPinIcon
              className="w-4 h-4"
              style={{
                color: '#4A5568'
              }} />

            <span
              style={{
                color: '#4A5568'
              }}>

              Primary Zone:
            </span>
            <span
              className="font-medium"
              style={{
                color: '#1A202C'
              }}>

              KL Sentral
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPinIcon
              className="w-4 h-4"
              style={{
                color: '#4A5568'
              }} />

            <span
              style={{
                color: '#4A5568'
              }}>

              Secondary Zone:
            </span>
            <span
              className="font-medium"
              style={{
                color: '#1A202C'
              }}>

              Masjid Jamek
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <UserIcon
              className="w-4 h-4"
              style={{
                color: '#4A5568'
              }} />

            <span
              style={{
                color: '#4A5568'
              }}>

              Partner:
            </span>
            <span
              className="font-medium"
              style={{
                color: '#1A202C'
              }}>

              Cpl. Faizal
            </span>
          </div>
        </div>
      </div>
    </div>);

}