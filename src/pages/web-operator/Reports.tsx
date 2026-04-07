import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from
  'recharts';
import {
  CalendarIcon,
  DownloadIcon,
  FileTextIcon,
  TableIcon,
  TrendingUpIcon
} from
  'lucide-react';
type ReportTab = 'overview' | 'incidents' | 'performance' | 'export';
const DAILY_DATA = [
  {
    day: 'Mon',
    LRT: 4,
    KTM: 2,
    MRT: 3
  },
  {
    day: 'Tue',
    LRT: 6,
    KTM: 3,
    MRT: 5
  },
  {
    day: 'Wed',
    LRT: 3,
    KTM: 1,
    MRT: 2
  },
  {
    day: 'Thu',
    LRT: 8,
    KTM: 4,
    MRT: 6
  },
  {
    day: 'Fri',
    LRT: 11,
    KTM: 6,
    MRT: 8
  },
  {
    day: 'Sat',
    LRT: 5,
    KTM: 2,
    MRT: 4
  },
  {
    day: 'Sun',
    LRT: 3,
    KTM: 1,
    MRT: 2
  }];

const PIE_DATA = [
  {
    name: 'Verified & Resolved',
    value: 58,
    color: '#2D7A5D'
  },
  {
    name: 'False Alarms',
    value: 22,
    color: '#4A5568'
  },
  {
    name: 'Pending',
    value: 12,
    color: '#F6AD55'
  },
  {
    name: 'Escalated to Police',
    value: 8,
    color: '#D34026'
  }];

const INCIDENTS = [
  {
    id: 'INC-001',
    coach: 'KJ-07 Coach 3',
    line: 'LRT Kelana Jaya',
    datetime: '28 Feb 2025, 14:32',
    type: 'Male Detected',
    status: 'Resolved',
    operator: 'Ahmad'
  },
  {
    id: 'INC-002',
    coach: 'KTM-12 Coach 1',
    line: 'KTM Komuter',
    datetime: '28 Feb 2025, 14:26',
    type: 'Male Detected',
    status: 'Escalated',
    operator: 'Ahmad'
  },
  {
    id: 'INC-003',
    coach: 'MRT-05 Coach 2',
    line: 'MRT Putrajaya',
    datetime: '28 Feb 2025, 14:19',
    type: 'Male Detected',
    status: 'Pending',
    operator: 'Siti'
  },
  {
    id: 'INC-004',
    coach: 'KJ-03 Coach 3',
    line: 'LRT Kelana Jaya',
    datetime: '28 Feb 2025, 14:12',
    type: 'Possible Male',
    status: 'False Alarm',
    operator: 'Ahmad'
  },
  {
    id: 'INC-005',
    coach: 'MRT-08 Coach 2',
    line: 'MRT Putrajaya',
    datetime: '28 Feb 2025, 14:05',
    type: 'Male Detected',
    status: 'Resolved',
    operator: 'Razif'
  },
  {
    id: 'INC-006',
    coach: 'KTM-07 Coach 1',
    line: 'KTM Komuter',
    datetime: '28 Feb 2025, 13:58',
    type: 'Male Detected',
    status: 'Resolved',
    operator: 'Siti'
  }];

const OPERATORS = [
  {
    name: 'Ahmad Fadzil',
    alerts: 34,
    resolved: 28,
    falseAlarms: 6,
    avgTime: '2.1m',
    score: 94
  },
  {
    name: 'Siti Nurhaliza',
    alerts: 29,
    resolved: 25,
    falseAlarms: 4,
    avgTime: '2.4m',
    score: 91
  },
  {
    name: 'Razif Hamdan',
    alerts: 22,
    resolved: 18,
    falseAlarms: 4,
    avgTime: '2.8m',
    score: 87
  }];

export function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const tabs: {
    id: ReportTab;
    label: string;
    icon: React.ReactNode;
  }[] = [
      {
        id: 'overview',
        label: 'Overview',
        icon: <TrendingUpIcon className="w-4 h-4" />
      },
      {
        id: 'incidents',
        label: 'Incident Reports',
        icon: <FileTextIcon className="w-4 h-4" />
      },

      {
        id: 'export',
        label: 'Export',
        icon: <DownloadIcon className="w-4 h-4" />
      }];

  const statusColor = (status: string) => {
    if (status === 'Resolved')
      return {
        bg: '#F0FBF6',
        text: '#2D7A5D'
      };
    if (status === 'Escalated')
      return {
        bg: '#FEF2F0',
        text: '#D34026'
      };
    if (status === 'Pending')
      return {
        bg: '#FFF7ED',
        text: '#C05621'
      };
    return {
      bg: '#F7FAFC',
      text: '#718096'
    };
  };
  return (
    <div
      className="p-6 min-h-full"
      style={{
        backgroundColor: '#FAF9F5'
      }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{
              color: '#1A202C'
            }}>

            Reports & Analytics
          </h1>
          <p
            className="text-sm mt-0.5"
            style={{
              color: '#4A5568'
            }}>

            Compliance monitoring insights
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          style={{
            color: '#1A202C'
          }}>

          <CalendarIcon
            className="w-4 h-4"
            style={{
              color: '#4A5568'
            }} />

          Feb 2025
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
        {tabs.map((tab) =>
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${activeTab === tab.id ? 'text-white shadow-sm' : 'hover:bg-gray-50'}`}
            style={{
              backgroundColor: activeTab === tab.id ? '#0B4F6C' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#4A5568'
            }}>

            {tab.icon}
            {tab.label}
          </button>
        )}
      </div>

      {/* Overview */}
      {activeTab === 'overview' &&
        <div className="space-y-5">
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                label: 'Total Incidents',
                value: '142',
                sub: 'This month',
                color: '#1A202C'
              },
              {
                label: 'False Alarm Rate',
                value: '22%',
                sub: '↓ 3% from last month',
                color: '#2D7A5D'
              },
              {
                label: 'Avg Response Time',
                value: '2.4m',
                sub: '↓ 0.3m improvement',
                color: '#0B4F6C'
              },
              {
                label: 'Compliance Score',
                value: '94.2%',
                sub: '↑ 1.8% this month',
                color: '#2D7A5D'
              }].
              map((stat) =>
                <div
                  key={stat.label}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">

                  <div
                    className="text-xs font-medium mb-2"
                    style={{
                      color: '#4A5568'
                    }}>

                    {stat.label}
                  </div>
                  <div
                    className="text-3xl font-bold"
                    style={{
                      color: stat.color
                    }}>

                    {stat.value}
                  </div>
                  <div
                    className="text-xs mt-1"
                    style={{
                      color: '#4A5568'
                    }}>

                    {stat.sub}
                  </div>
                </div>
              )}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3
                className="font-semibold text-sm mb-4"
                style={{
                  color: '#1A202C'
                }}>

                Daily Incidents by Line
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={DAILY_DATA} barSize={8} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis
                    dataKey="day"
                    tick={{
                      fontSize: 11,
                      fill: '#4A5568'
                    }}
                    axisLine={false}
                    tickLine={false} />

                  <YAxis
                    tick={{
                      fontSize: 11,
                      fill: '#4A5568'
                    }}
                    axisLine={false}
                    tickLine={false} />

                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: '1px solid #E2E8F0'
                    }} />

                  <Legend
                    wrapperStyle={{
                      fontSize: 11
                    }} />

                  <Bar dataKey="LRT" fill="#D34026" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="KTM" fill="#0B4F6C" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="MRT" fill="#2D7A5D" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3
                className="font-semibold text-sm mb-4"
                style={{
                  color: '#1A202C'
                }}>

                Alert Resolution Status
              </h3>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={220}>
                  <PieChart>
                    <Pie
                      data={PIE_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value">

                      {PIE_DATA.map((entry, index) =>
                        <Cell key={index} fill={entry.color} />
                      )}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8
                      }} />

                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {PIE_DATA.map((item) =>
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: item.color
                        }} />

                      <div className="flex-1">
                        <div
                          className="text-xs"
                          style={{
                            color: '#1A202C'
                          }}>

                          {item.name}
                        </div>
                        <div
                          className="text-sm font-bold"
                          style={{
                            color: item.color
                          }}>

                          {item.value}%
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Incidents Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3
                className="font-semibold text-sm"
                style={{
                  color: '#1A202C'
                }}>

                Recent Incidents
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {[
                      'Case ID',
                      'Coach',
                      'Line',
                      'Date/Time',
                      'Type',
                      'Status',
                      'Operator',
                      'Action'].
                      map((h) =>
                        <th
                          key={h}
                          className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                          style={{
                            color: '#4A5568'
                          }}>

                          {h}
                        </th>
                      )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {INCIDENTS.map((inc) => {
                    const sc = statusColor(inc.status);
                    return (
                      <tr
                        key={inc.id}
                        className="hover:bg-gray-50 transition-colors">

                        <td
                          className="px-4 py-3 font-mono text-xs"
                          style={{
                            color: '#0B4F6C'
                          }}>

                          {inc.id}
                        </td>
                        <td
                          className="px-4 py-3 font-medium text-xs"
                          style={{
                            color: '#1A202C'
                          }}>

                          {inc.coach}
                        </td>
                        <td
                          className="px-4 py-3 text-xs"
                          style={{
                            color: '#4A5568'
                          }}>

                          {inc.line}
                        </td>
                        <td
                          className="px-4 py-3 text-xs"
                          style={{
                            color: '#4A5568'
                          }}>

                          {inc.datetime}
                        </td>
                        <td
                          className="px-4 py-3 text-xs"
                          style={{
                            color: '#1A202C'
                          }}>

                          {inc.type}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: sc.bg,
                              color: sc.text
                            }}>

                            {inc.status}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3 text-xs"
                          style={{
                            color: '#4A5568'
                          }}>

                          {inc.operator}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className="text-xs font-medium hover:underline"
                            style={{
                              color: '#0B4F6C'
                            }}>

                            View
                          </button>
                        </td>
                      </tr>);

                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      {/* Incidents Tab */}
      {activeTab === 'incidents' &&
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3
              className="font-semibold text-sm"
              style={{
                color: '#1A202C'
              }}>

              All Incident Reports
            </h3>
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
              style={{
                backgroundColor: '#0B4F6C'
              }}>

              <DownloadIcon className="w-4 h-4" /> Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {[
                    'Case ID',
                    'Coach',
                    'Line',
                    'Date/Time',
                    'Type',
                    'Status',
                    'Operator',
                    'Action'].
                    map((h) =>
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                        style={{
                          color: '#4A5568'
                        }}>

                        {h}
                      </th>
                    )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  ...INCIDENTS,
                  ...INCIDENTS.map((i) => ({
                    ...i,
                    id: i.id + 'B'
                  }))].
                  map((inc) => {
                    const sc = statusColor(inc.status);
                    return (
                      <tr
                        key={inc.id}
                        className="hover:bg-gray-50 transition-colors">

                        <td
                          className="px-4 py-3 font-mono text-xs"
                          style={{
                            color: '#0B4F6C'
                          }}>

                          {inc.id}
                        </td>
                        <td
                          className="px-4 py-3 font-medium text-xs"
                          style={{
                            color: '#1A202C'
                          }}>

                          {inc.coach}
                        </td>
                        <td
                          className="px-4 py-3 text-xs"
                          style={{
                            color: '#4A5568'
                          }}>

                          {inc.line}
                        </td>
                        <td
                          className="px-4 py-3 text-xs"
                          style={{
                            color: '#4A5568'
                          }}>

                          {inc.datetime}
                        </td>
                        <td
                          className="px-4 py-3 text-xs"
                          style={{
                            color: '#1A202C'
                          }}>

                          {inc.type}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: sc.bg,
                              color: sc.text
                            }}>

                            {inc.status}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3 text-xs"
                          style={{
                            color: '#4A5568'
                          }}>

                          {inc.operator}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className="text-xs font-medium hover:underline"
                            style={{
                              color: '#0B4F6C'
                            }}>

                            View
                          </button>
                        </td>
                      </tr>);

                  })}
              </tbody>
            </table>
          </div>
        </div>
      }


      {/* Export Tab */}
      {activeTab === 'export' &&
        <div className="max-w-lg">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3
              className="font-semibold"
              style={{
                color: '#1A202C'
              }}>

              Export Reports
            </h3>
            <div className="space-y-3">
              {[
                {
                  format: 'PDF Report',
                  desc: 'Full incident report with charts',
                  icon: '📄'
                },
                {
                  format: 'CSV Data',
                  desc: 'Raw incident data for analysis',
                  icon: '📊'
                },
                {
                  format: 'Excel Workbook',
                  desc: 'Formatted spreadsheet with multiple sheets',
                  icon: '📋'
                }].
                map((item) =>
                  <div
                    key={item.format}
                    className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">

                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <div
                          className="font-medium text-sm"
                          style={{
                            color: '#1A202C'
                          }}>

                          {item.format}
                        </div>
                        <div
                          className="text-xs"
                          style={{
                            color: '#4A5568'
                          }}>

                          {item.desc}
                        </div>
                      </div>
                    </div>
                    <button
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                      style={{
                        backgroundColor: '#0B4F6C'
                      }}>

                      <DownloadIcon className="w-4 h-4" /> Export
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      }
    </div>);

}