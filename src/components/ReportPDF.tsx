import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { ReportStats, StatusSlice, statusColor } from '../utils/reportUtils';

const NAVY  = '#0B4F6C';
const RED   = '#D34026';
const GRAY1 = '#1A202C';
const GRAY2 = '#4A5568';
const GRAY3 = '#718096';
const GRAY4 = '#E2E8F0';
const BG    = '#F7FAFC';

const s = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', fontSize: 9, padding: 32, backgroundColor: '#FFFFFF', color: GRAY1 },
  // header
  headerRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 18, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: NAVY },
  logoBox:     { width: 32, height: 32, backgroundColor: NAVY, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  logoText:    { color: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 13 },
  titleGroup:  { flex: 1 },
  title:       { fontFamily: 'Helvetica-Bold', fontSize: 16, color: NAVY },
  subtitle:    { fontSize: 9, color: GRAY3, marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  monthBadge:  { backgroundColor: NAVY, color: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  genDate:     { fontSize: 7.5, color: GRAY3, marginTop: 3 },
  // section
  sectionTitle:{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: GRAY2, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  section:     { marginBottom: 14 },
  // KPI grid
  kpiGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  kpiCard:     { width: '31.5%', backgroundColor: BG, borderRadius: 6, padding: 10, borderWidth: 1, borderColor: GRAY4 },
  kpiValue:    { fontFamily: 'Helvetica-Bold', fontSize: 18, color: NAVY },
  kpiLabel:    { fontSize: 7.5, color: GRAY2, marginTop: 2 },
  kpiDelta:    { fontSize: 7, marginTop: 2 },
  // insights
  insightRow:  { flexDirection: 'row', gap: 5 },
  insightCard: { flex: 1, backgroundColor: BG, borderRadius: 5, padding: 7, borderWidth: 1, borderColor: GRAY4 },
  insightLabel:{ fontSize: 7, color: GRAY3, textTransform: 'uppercase', letterSpacing: 0.5 },
  insightVal:  { fontFamily: 'Helvetica-Bold', fontSize: 9, color: GRAY1, marginTop: 1 },
  insightSub:  { fontSize: 7, color: GRAY3, marginTop: 1 },
  // AI summary
  aiBox:       { backgroundColor: '#EFF6FF', borderRadius: 6, padding: 10, borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 14 },
  aiLabel:     { fontFamily: 'Helvetica-Bold', fontSize: 7, color: NAVY, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  aiText:      { fontSize: 8.5, color: '#1E3A5F', lineHeight: 1.5 },
  // status pills row
  pillRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  pill:        { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' },
  pillVal:     { fontFamily: 'Helvetica-Bold', fontSize: 12 },
  pillLbl:     { fontSize: 7, marginTop: 1 },
  // chart row
  chartRow:    { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chartImg:    { borderRadius: 4, borderWidth: 1, borderColor: GRAY4 },
});

function fmtStatus(s: string) {
  return s?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? '';
}

function delta(v: number, invert = false) {
  if (v === 0) return null;
  const good = invert ? v < 0 : v > 0;
  return { label: `${v > 0 ? '▲' : '▼'} ${Math.abs(v)}%`, color: good ? '#2D7A5D' : RED };
}

interface ChartImages {
  daily:  string | null;
  status: string | null;
  train:  string | null;
  source: string | null;
}

interface Props {
  month: string;
  stats: ReportStats;
  topInsights: { label: string; value: string; sub: string; color: string }[];
  statusBreakdown: StatusSlice[];
  aiSummary: string | null;
  resolutionRate: number;
  chartImages?: ChartImages;
}

export function ReportPDF({ month, stats, topInsights, statusBreakdown, aiSummary, resolutionRate, chartImages }: Props) {
  const kpis = [
    { label: 'Total Incidents',       value: String(stats.total),                         d: delta(stats.totalDelta, true) },
    { label: 'Resolution Rate',       value: `${resolutionRate}%`,                        d: delta(stats.resolutionDelta) },
    { label: 'False Alarm Rate',      value: `${stats.falseAlarmRate}%`,                  d: delta(stats.falseAlarmDelta, true) },
    { label: 'Avg Response Time',     value: `${stats.avgResponseMinutes.toFixed(1)} min`, d: delta(stats.avgResponseDelta, true) },
    { label: 'Compliance Score',      value: `${stats.complianceScore}%`,                 d: delta(stats.complianceDelta) },
    { label: 'Unresolved',            value: String(stats.unresolvedCount),               d: null },
  ];

  const hasCharts = chartImages && (chartImages.daily || chartImages.status || chartImages.train || chartImages.source);

  return (
    <Document title={`Railly Report – ${month}`} author="Railly">

      {/* ── Page 1: Summary ──────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.headerRow}>
          <View style={s.logoBox}><Text style={s.logoText}>R</Text></View>
          <View style={s.titleGroup}>
            <Text style={s.title}>Railly Safety Analytics</Text>
            <Text style={s.subtitle}>Monthly Incident Report</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.monthBadge}>{month}</Text>
            <Text style={s.genDate}>Generated {new Date().toLocaleDateString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short', year: 'numeric' })}</Text>
          </View>
        </View>

        {/* AI Summary */}
        {aiSummary && (
          <View style={s.aiBox}>
            <Text style={s.aiLabel}>AI Report Summary</Text>
            <Text style={s.aiText}>{aiSummary}</Text>
          </View>
        )}

        {/* KPI Cards */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Key Metrics</Text>
          <View style={s.kpiGrid}>
            {kpis.map(k => (
              <View key={k.label} style={s.kpiCard}>
                <Text style={s.kpiValue}>{k.value}</Text>
                <Text style={s.kpiLabel}>{k.label}</Text>
                {k.d && <Text style={[s.kpiDelta, { color: k.d.color }]}>{k.d.label}</Text>}
              </View>
            ))}
          </View>
        </View>

        {/* Status Breakdown */}
        {statusBreakdown.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Status Breakdown</Text>
            <View style={s.pillRow}>
              {statusBreakdown.map(sb => {
                const c = statusColor(sb.name.toLowerCase());
                return (
                  <View key={sb.name} style={[s.pill, { backgroundColor: c.bg }]}>
                    <Text style={[s.pillVal, { color: c.text }]}>{sb.value}</Text>
                    <Text style={[s.pillLbl, { color: c.text }]}>{fmtStatus(sb.name)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Key Insights */}
        {topInsights.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Key Insights</Text>
            <View style={s.insightRow}>
              {topInsights.map(ins => (
                <View key={ins.label} style={s.insightCard}>
                  <Text style={s.insightLabel}>{ins.label}</Text>
                  <Text style={s.insightVal}>{ins.value}</Text>
                  <Text style={s.insightSub}>{ins.sub}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Page>

      {/* ── Page 2: Charts ───────────────────────────────────────────── */}
      {hasCharts && (
        <Page size="A4" style={s.page}>
          {/* Header */}
          <View style={s.headerRow}>
            <View style={s.logoBox}><Text style={s.logoText}>R</Text></View>
            <View style={s.titleGroup}>
              <Text style={s.title}>Railly Safety Analytics</Text>
              <Text style={s.subtitle}>Monthly Incident Report — Charts</Text>
            </View>
            <View style={s.headerRight}>
              <Text style={s.monthBadge}>{month}</Text>
            </View>
          </View>

          {/* Row 1: Daily Incidents + Status Breakdown */}
          {(chartImages!.daily || chartImages!.status) && (
            <View style={[s.section, s.chartRow]}>
              {chartImages!.daily && (
                <View style={{ flex: 1 }}>
                  <Text style={s.sectionTitle}>Daily Incidents by Line</Text>
                  <Image src={chartImages!.daily} style={s.chartImg} />
                </View>
              )}
              {chartImages!.status && (
                <View style={{ flex: 1 }}>
                  <Text style={s.sectionTitle}>Resolution Status Breakdown</Text>
                  <Image src={chartImages!.status} style={s.chartImg} />
                </View>
              )}
            </View>
          )}

          {/* Row 2: Incidents by Train + Incident Source */}
          {(chartImages!.train || chartImages!.source) && (
            <View style={s.chartRow}>
              {chartImages!.train && (
                <View style={{ flex: 2 }}>
                  <Text style={s.sectionTitle}>Incidents by Train</Text>
                  <Image src={chartImages!.train} style={s.chartImg} />
                </View>
              )}
              {chartImages!.source && (
                <View style={{ flex: 1 }}>
                  <Text style={s.sectionTitle}>Incident Source</Text>
                  <Image src={chartImages!.source} style={s.chartImg} />
                </View>
              )}
            </View>
          )}
        </Page>
      )}

    </Document>
  );
}
