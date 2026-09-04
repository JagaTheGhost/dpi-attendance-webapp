import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Clock,
  Calendar,
  Award,
  Sparkles,
  Zap,
  X,
  Layers,
  ArrowUpRight,
  Building2,
  ShieldAlert,
  AlertTriangle,
  Target,
  Activity,
  BarChart3
} from 'lucide-react';
import { parseDBDate } from '@/utils/dateUtils';
import CustomDropdown from '@/components/common/CustomDropdown';

export default function AnalyticsDashboard({
  analyticsData,
  departmentFilter,
  setDepartmentFilter,
  analyticsDateScope,
  setAnalyticsDateScope,
  analyticsStartDate,
  setAnalyticsStartDate,
  analyticsEndDate,
  setAnalyticsEndDate,
  onSelectEmployee,
  hasHitQueryLimit,
  queryLimitMessage,
  employees = {},
  processedLogs = []
}) {
  const [subSegmentView, setSubSegmentView] = useState('overview'); // 'overview' | 'depts' | 'exceptions' | 'leaderboard'
  const [heatmapMode, setHeatmapMode] = useState('late'); // 'late' | 'rush'
  const [heatmapThreshold, setHeatmapThreshold] = useState('915'); // '915' | '900' | '930'
  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState(null);
  const [exceptionTab, setExceptionTab] = useState('missingOut'); // 'missingOut' | 'missingIn' | 'duplicates' | 'noAttendance'
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const departmentsList = ['All', 'PF', 'NON PF', 'NI Group1', 'NI Group2'];

  const summary = analyticsData?.summary || {
    totalEmployees: 0,
    attendanceRate: 0,
    presentToday: 0,
    leaveCount: 0,
    averageWorkingHours: 0,
    averageArrivalStr: '09:00 AM',
    lateArrivals: 0,
    totalOvertimeHours: 0
  };

  // 1. Department Breakdown Computation Engine
  const departmentMetrics = useMemo(() => {
    const depts = ['PF', 'NON PF', 'NI Group1', 'NI Group2'];
    const empList = Object.values(employees);

    return depts.map(dept => {
      const deptEmps = empList.filter(e => e.department === dept);
      const totalCount = deptEmps.length || 0;
      const deptEmpIds = new Set(deptEmps.map(e => e.id));

      let presentCount = 0;
      let lateCount = 0;

      const logsForDept = processedLogs.filter(l => deptEmpIds.has(l.employee_id));
      const empPunches = {};
      logsForDept.forEach(l => {
        if (!empPunches[l.employee_id]) empPunches[l.employee_id] = [];
        empPunches[l.employee_id].push(l);
      });

      Object.keys(empPunches).forEach(empId => {
        const pList = empPunches[empId];
        const hasIn = pList.some(l => l.direction === 'IN');
        if (hasIn) presentCount++;

        const firstIn = pList.find(l => l.direction === 'IN');
        if (firstIn) {
          const d = parseDBDate(firstIn.timestamp);
          if (d.getHours() > 9 || (d.getHours() === 9 && d.getMinutes() > 15)) {
            lateCount++;
          }
        }
      });

      const presenceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
      const punctualityRate = presentCount > 0 ? Math.round(((presentCount - lateCount) / presentCount) * 100) : 100;

      return {
        department: dept,
        totalCount,
        presentCount,
        presenceRate,
        lateCount,
        punctualityRate,
        status: presenceRate >= 80 ? 'Optimal' : presenceRate >= 50 ? 'Standard' : 'Needs Attention'
      };
    });
  }, [employees, processedLogs]);

  // 2. Hourly Biometric Punch Density Map
  const hourlyPunchDensity = useMemo(() => {
    const hoursMap = Array.from({ length: 13 }, (_, i) => ({
      hour: i + 7,
      label: i + 7 < 12 ? `${i + 7} AM` : i + 7 === 12 ? `12 PM` : `${i + 7 - 12} PM`,
      inCount: 0,
      outCount: 0
    }));

    processedLogs.forEach(l => {
      const d = parseDBDate(l.timestamp);
      const h = d.getHours();
      if (h >= 7 && h <= 19) {
        const slot = hoursMap[h - 7];
        if (l.direction === 'IN') slot.inCount++;
        else slot.outCount++;
      }
    });

    const maxPunches = Math.max(1, ...hoursMap.map(h => h.inCount + h.outCount));

    return { hoursMap, maxPunches };
  }, [processedLogs]);

  const attendanceTrend = analyticsData?.attendanceTrend || [];
  const heatmapMatrix = analyticsData?.heatmapMatrix || Array.from({ length: 7 }, () => Array.from({ length: 5 }, () => ({ totalCount: 0, lateCount915: 0, lateCount900: 0, lateCount930: 0, records: [] })));
  const mostPunctual = analyticsData?.leaderboard?.mostPunctual || [];
  const frequentlyLate = analyticsData?.leaderboard?.frequentlyLate || [];

  const exceptions = analyticsData?.exceptions || {
    missingOut: [],
    missingIn: [],
    duplicateLogs: [],
    noAttendance: []
  };

  const getActiveExceptionList = () => {
    if (exceptionTab === 'missingIn') return exceptions.missingIn;
    if (exceptionTab === 'duplicates') return exceptions.duplicateLogs;
    if (exceptionTab === 'noAttendance') return exceptions.noAttendance;
    return exceptions.missingOut;
  };

  const activeExceptionList = getActiveExceptionList();

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* 1. Control Toolbar */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Executive Attendance & Performance Analytics</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Scoping <span className="font-bold text-slate-800">{summary.totalEmployees} Workers</span> in <span className="font-bold text-blue-600">{departmentFilter === 'All' ? 'All Departments' : `Dept: ${departmentFilter}`}</span>
            </p>
          </div>

          {/* Controls: Department & Date Scope */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Department Selector */}
            <CustomDropdown
              options={departmentsList.map(dept => ({
                value: dept,
                label: dept === 'All' ? 'All Departments' : `Dept: ${dept}`
              }))}
              value={departmentFilter}
              onChange={(val) => setDepartmentFilter(val)}
            />

            {/* Date Scope Pills */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              {[
                { value: 'week', label: 'Last 7 Days' },
                { value: '14days', label: 'Last 14 Days' },
                { value: '30days', label: 'Last 30 Days' },
                { value: 'custom', label: 'Custom Scope' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAnalyticsDateScope(opt.value)}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${analyticsDateScope === opt.value
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60 font-extrabold'
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Range Sub-bar */}
        {analyticsDateScope === 'custom' && (
          <div className="pt-3 border-t border-slate-150 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-fadeIn">
            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-blue-600" /> Select Custom Date Range Window:
            </span>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-2xl">
              <input
                type="date"
                value={analyticsStartDate}
                onChange={(e) => setAnalyticsStartDate(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-bold text-slate-800 outline-none px-2.5 py-1 rounded-xl cursor-pointer shadow-2xs"
              />
              <span className="text-xs text-slate-400 font-bold px-1">to</span>
              <input
                type="date"
                value={analyticsEndDate}
                onChange={(e) => setAnalyticsEndDate(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-bold text-slate-800 outline-none px-2.5 py-1 rounded-xl cursor-pointer shadow-2xs"
              />
            </div>
          </div>
        )}

        {hasHitQueryLimit && (
          <div className="pt-3 border-t border-slate-150 flex items-center gap-2.5 text-xs text-amber-800 font-semibold bg-amber-50/80 border border-amber-200/80 p-3 rounded-2xl animate-fadeIn">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{queryLimitMessage || 'Database query reached 1,000 logs limit for this window. Displaying top 1,000 entries.'}</span>
          </div>
        )}
      </div>

      {/* 1.5 Progressive Disclosure Focus Segment Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none" role="tablist" aria-label="Analytics Focus Segment Views">
          <button
            onClick={() => setSubSegmentView('overview')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              subSegmentView === 'overview'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-sky-400" />
            Overview Snapshot
          </button>

          <button
            onClick={() => setSubSegmentView('depts')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              subSegmentView === 'depts'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200'
            }`}
          >
            <Building2 className="h-3.5 w-3.5 text-blue-400" />
            Department Breakdown
          </button>

          <button
            onClick={() => setSubSegmentView('exceptions')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              subSegmentView === 'exceptions'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Exception Radar
            {analyticsData?.exceptions && (
              <span className="bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[9px] font-mono font-extrabold rounded-md">
                {(analyticsData.exceptions.missingOut?.length || 0) + (analyticsData.exceptions.missingIn?.length || 0)}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubSegmentView('leaderboard')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              subSegmentView === 'leaderboard'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200'
            }`}
          >
            <Award className="h-3.5 w-3.5 text-indigo-400" />
            Leaderboard
          </button>
        </div>
        <span className="hidden md:inline-flex text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Focus View Active
        </span>
      </div>

      {/* 2. OVERVIEW SNAPSHOT SUB-VIEW */}
      {subSegmentView === 'overview' && (
        <div className="space-y-6">
          {/* Executive Intelligence Callout Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="group bg-[#eaf7ed]/70 border border-[#bbf7d0] rounded-2xl p-3.5 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#eaf7ed] text-[#15803d] border border-[#bbf7d0] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Target className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-[10px] font-black text-[#15803d] uppercase tracking-widest block">Workforce Presence</span>
                <span className="text-sm font-black text-slate-900 block mt-0.5">{summary.attendanceRate}% Optimal</span>
                <span className="text-[10px] font-semibold text-[#15803d]">{summary.presentToday} Active Workers</span>
              </div>
            </div>

            <div className="group bg-[#f0f9ff]/70 border border-[#bae6fd] rounded-2xl p-3.5 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#f0f9ff] text-[#0369a1] border border-[#bae6fd] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Clock className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-[10px] font-black text-[#0369a1] uppercase tracking-widest block">Punctuality Benchmark</span>
                <span className="text-sm font-black text-slate-900 block mt-0.5">{Math.max(0, 100 - (summary.lateArrivals * 3))}% On-Time</span>
                <span className="text-[10px] font-semibold text-[#0369a1]">{summary.lateArrivals} Late Clock-Ins (&gt;9:15)</span>
              </div>
            </div>

            <div className="group bg-[#eeedfa]/70 border border-[#c7c4f0] rounded-2xl p-3.5 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#eeedfa] text-[#3b3492] border border-[#c7c4f0] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Zap className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-[10px] font-black text-[#3b3492] uppercase tracking-widest block">Peak Scanner Traffic</span>
                <span className="text-sm font-black text-slate-900 block mt-0.5">08:45 AM - 09:15 AM</span>
                <span className="text-[10px] font-semibold text-[#3b3492]">High Shift Density</span>
              </div>
            </div>

            <div className="group bg-[#fcf0f0]/70 border border-[#fecaca] rounded-2xl p-3.5 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#fcf0f0] text-[#b91c1c] border border-[#fecaca] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <ShieldAlert className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-[10px] font-black text-[#b91c1c] uppercase tracking-widest block">Overtime Exposure</span>
                <span className="text-sm font-black text-slate-900 block mt-0.5">{Math.floor(summary.totalOvertimeHours)}h {Math.round((summary.totalOvertimeHours % 1) * 60)}m</span>
                <span className="text-[10px] font-semibold text-[#b91c1c]">Accumulated Hours</span>
              </div>
            </div>
          </div>
          {/* Concept 2 Hero Panel + Stacked Side Telemetry */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* HERO FOCUS PANEL (Left - 7 cols) */}
            <div className="lg:col-span-7 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex items-center justify-between z-10">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Primary Performance Telemetry</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live Telemetry
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-5 my-4 z-10">
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-slate-800" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-blue-500" strokeDasharray={`${summary.attendanceRate}, 100`} strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <span className="absolute text-xl font-extrabold font-mono text-white">{summary.attendanceRate}%</span>
                </div>

                <div>
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Attendance Rate</h3>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white">{summary.attendanceRate}%</span>
                    <span className={`text-xs font-bold ${summary.attendanceRate >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {summary.attendanceRate >= 80 ? 'Optimal' : 'Standard'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-medium">Workforce presence across selected scope window</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold z-10">
                <span className="text-emerald-400 flex items-center gap-1.5 text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {summary.presentToday} Active Present
                </span>
                <span className="text-slate-400 text-[11px]">{summary.leaveCount} Away</span>
                <span className="text-blue-400 font-mono text-[11px]">4 Dept Units</span>
              </div>
            </div>

            {/* STACKED SIDE TELEMETRY (Right - 5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-3">
              <div className="group bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out flex items-center justify-between flex-1">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Avg Shift Duration</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-black text-slate-900 font-mono tracking-tight">
                      {Math.floor(summary.averageWorkingHours)}h {Math.round((summary.averageWorkingHours % 1) * 60)}m
                    </span>
                    <span className="text-[10px] font-extrabold text-sky-600">Target: 8.0h</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0 shadow-2xs group-hover:scale-110 group-hover:rotate-3 transition-transform duration-200">
                  <Clock className="h-5 w-5" />
                </div>
              </div>

              <div className="group bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out flex items-center justify-between flex-1">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Avg First Clock-In</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-black text-slate-900 font-mono tracking-tight">{summary.averageArrivalStr}</span>
                    <span className="text-[10px] font-black text-[#b91c1c] bg-[#fcf0f0] border border-[#fecaca] px-1.5 py-0.5 rounded-full">{summary.lateArrivals} Lates (&gt;9:15)</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-[#fcf0f0] border border-[#fecaca] flex items-center justify-center text-[#b91c1c] shrink-0 shadow-2xs group-hover:scale-110 group-hover:rotate-3 transition-transform duration-200">
                  <Award className="h-5 w-5" />
                </div>
              </div>

              <div className="group bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out flex items-center justify-between flex-1">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Accumulated Overtime</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-black text-[#b91c1c] font-mono tracking-tight">
                      {Math.floor(summary.totalOvertimeHours)}h {Math.round((summary.totalOvertimeHours % 1) * 60)}m
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Threshold &gt;9.0h</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-[#fcf0f0] border border-[#fecaca] flex items-center justify-center text-[#b91c1c] shrink-0 shadow-2xs group-hover:scale-110 group-hover:rotate-3 transition-transform duration-200">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Executive Analytics Grid */}
      {subSegmentView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Attendance Trend Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
          {/* Chart Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600 shrink-0" />
                Attendance Rate Trend
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200/70 px-2.5 py-1 rounded-xl">
                <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                <span className="text-[10px] font-extrabold text-blue-700">
                  Avg: {attendanceTrend.length > 0 ? Math.round(attendanceTrend.reduce((a, d) => a + d.rate, 0) / attendanceTrend.length) : 0}%
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 font-mono bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl">
                {attendanceTrend.length}D Scope
              </span>
            </div>
          </div>

          {/* Crisp SVG Line Chart with Monotone Cubic Spline (No Overshoot) */}
          <div className="bg-slate-50/60 border border-slate-200/70 rounded-2xl p-3 sm:p-4 overflow-hidden relative">
            {attendanceTrend.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-slate-400 text-xs font-bold">No data for selected range</div>
            ) : (() => {
              const n = attendanceTrend.length;
              const W = Math.max(540, n * 45);
              const H = 220;
              const PAD = { top: 24, right: 30, bottom: 36, left: 36 };
              const chartW = W - PAD.left - PAD.right;
              const chartH = H - PAD.top - PAD.bottom;

              const yMax = 100;
              const xOf = (i) => PAD.left + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW);
              const yOf = (v) => PAD.top + chartH - (v / yMax) * chartH;

              const ratePts = attendanceTrend.map((d, i) => ({ x: xOf(i), y: yOf(d.rate), d, idx: i }));

              // Fritsch-Carlson Monotone Cubic Spline Path Generator
              const monotoneCubicPath = (pts) => {
                if (pts.length < 2) return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                const numPts = pts.length;
                const dxs = [];
                const dys = [];
                const ms = [];

                for (let i = 0; i < numPts - 1; i++) {
                  const dx = pts[i + 1].x - pts[i].x;
                  const dy = pts[i + 1].y - pts[i].y;
                  dxs.push(dx);
                  dys.push(dy);
                  ms.push(dy / (dx || 1));
                }

                const c1s = [ms[0]];
                for (let i = 0; i < numPts - 2; i++) {
                  const m = ms[i];
                  const nextM = ms[i + 1];
                  if (m * nextM <= 0) {
                    c1s.push(0);
                  } else {
                    const common = dxs[i] + dxs[i + 1];
                    c1s.push((3 * common) / ((common + dxs[i + 1]) / m + (common + dxs[i]) / nextM));
                  }
                }
                c1s.push(ms[ms.length - 1]);

                let path = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
                for (let i = 0; i < numPts - 1; i++) {
                  const p1 = pts[i];
                  const p2 = pts[i + 1];
                  const dx = dxs[i];
                  const cp1x = p1.x + dx / 3;
                  const cp1y = p1.y + (c1s[i] * dx) / 3;
                  const cp2x = p2.x - dx / 3;
                  const cp2y = p2.y - (c1s[i + 1] * dx) / 3;
                  path += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
                }
                return path;
              };

              const rateLine = monotoneCubicPath(ratePts);
              const rateAreaPath = rateLine + ` L${ratePts[ratePts.length - 1].x.toFixed(1)},${(PAD.top + chartH).toFixed(1)} L${ratePts[0].x.toFixed(1)},${(PAD.top + chartH).toFixed(1)} Z`;

              // Average reference line
              const avgRate = Math.round(attendanceTrend.reduce((a, d) => a + d.rate, 0) / n);
              const avgY = yOf(avgRate);

              const yTicks = [0, 25, 50, 75, 100];
              const step = Math.max(1, Math.floor(n / 8));
              const xLabelIndices = [...Array(n).keys()].filter(i => i % step === 0 || i === n - 1);

              const activePt = hoveredIndex !== null ? ratePts[hoveredIndex] : null;

              return (
                <div className="overflow-x-auto scrollbar-thin">
                  <div style={{ minWidth: n > 12 ? `${n * 40}px` : '100%' }}>
                    <svg
                      viewBox={`0 0 ${W} ${H}`}
                      className="w-full h-[220px]"
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      <defs>
                        <linearGradient id="areaGradMonotone" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
                        </linearGradient>
                        <filter id="dotShadow" x="-50%" y="-50%" width="200%" height="200%">
                          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#1e3a8a" floodOpacity="0.25" />
                        </filter>
                      </defs>

                      {/* Horizontal Grid lines */}
                      {yTicks.map(v => (
                        <g key={`y-${v}`}>
                          <line
                            x1={PAD.left} y1={yOf(v)}
                            x2={PAD.left + chartW} y2={yOf(v)}
                            stroke="#e2e8f0" strokeWidth="1" strokeDasharray={v === 0 ? 'none' : '4 4'}
                          />
                          <text
                            x={PAD.left - 8} y={yOf(v)}
                            textAnchor="end" dominantBaseline="middle"
                            fontSize="9" fill="#94a3b8" fontWeight="700" fontFamily="monospace"
                          >
                            {v}%
                          </text>
                        </g>
                      ))}

                      {/* Period Average Reference Line */}
                      <line
                        x1={PAD.left} y1={avgY}
                        x2={PAD.left + chartW} y2={avgY}
                        stroke="#3b82f6" strokeWidth="1.25" strokeDasharray="5 4" opacity="0.45"
                      />
                      <text
                        x={PAD.left + chartW - 4} y={avgY - 6}
                        textAnchor="end" fontSize="8" fill="#3b82f6" fontWeight="800" fontFamily="monospace" opacity="0.8"
                      >
                        AVG ({avgRate}%)
                      </text>

                      {/* Area Fill */}
                      <path d={rateAreaPath} fill="url(#areaGradMonotone)" />

                      {/* Monotone Line (Strictly passes through dots with no overshoot) */}
                      <path
                        d={rateLine}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Active Vertical Crosshair */}
                      {activePt && (
                        <line
                          x1={activePt.x} y1={PAD.top}
                          x2={activePt.x} y2={PAD.top + chartH}
                          stroke="#2563eb" strokeWidth="1.25" strokeDasharray="3 3" opacity="0.6"
                        />
                      )}

                      {/* Data Point Dots */}
                      {ratePts.map((p, i) => {
                        const isHigh = p.d.rate >= 80;
                        const isMid = p.d.rate >= 50;
                        const dotColor = isHigh ? '#10b981' : isMid ? '#2563eb' : '#f59e0b';
                        const isHovered = hoveredIndex === i;

                        return (
                          <g
                            key={`rd-${i}`}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredIndex(i)}
                          >
                            {/* Hit Area */}
                            <circle cx={p.x} cy={p.y} r="14" fill="transparent" />

                            {/* Active Ring */}
                            {isHovered && (
                              <circle
                                cx={p.x} cy={p.y} r="9"
                                fill={dotColor} fillOpacity="0.25"
                                className="animate-ping"
                              />
                            )}

                            {/* Solid Dot */}
                            <circle
                              cx={p.x} cy={p.y}
                              r={isHovered ? 6 : 4.5}
                              fill={dotColor}
                              stroke="#ffffff" strokeWidth="2"
                              filter="url(#dotShadow)"
                              className="transition-all duration-150"
                            />
                          </g>
                        );
                      })}

                      {/* Floating Active Hover Card */}
                      {activePt && (() => {
                        const boxW = 114;
                        const boxH = 34;
                        const cardX = Math.max(10, Math.min(activePt.x - boxW / 2, W - boxW - 10));
                        // Place box cleanly above dot if there's space, else below
                        const cardY = activePt.y - boxH - 12 < PAD.top ? activePt.y + 12 : activePt.y - boxH - 10;
                        const isHigh = activePt.d.rate >= 80;
                        const isMid = activePt.d.rate >= 50;
                        const badgeColor = isHigh ? '#10b981' : isMid ? '#60a5fa' : '#fbbf24';

                        return (
                          <g className="pointer-events-none transition-all duration-150">
                            <rect
                              x={cardX}
                              y={cardY}
                              width={boxW}
                              height={boxH}
                              rx="8" ry="8"
                              fill="#0f172a" fillOpacity="0.95"
                              stroke="#334155" strokeWidth="1"
                            />
                            <text
                              x={cardX + boxW / 2}
                              y={cardY + 13}
                              textAnchor="middle"
                              fontSize="8.5" fill="#94a3b8" fontWeight="700" fontFamily="sans-serif"
                            >
                              {activePt.d.dateLabel}
                            </text>
                            <text
                              x={cardX + boxW / 2}
                              y={cardY + 26}
                              textAnchor="middle"
                              fontSize="10" fill={badgeColor} fontWeight="800" fontFamily="monospace"
                            >
                              {activePt.d.rate}% · {activePt.d.presentCount} Present
                            </text>
                          </g>
                        );
                      })()}

                      {/* X-axis Date Labels */}
                      {xLabelIndices.map(i => (
                        <text
                          key={`xl-${i}`}
                          x={xOf(i)} y={PAD.top + chartH + 18}
                          textAnchor="middle"
                          fontSize="9" fill="#64748b" fontWeight="700" fontFamily="monospace"
                        >
                          {attendanceTrend[i].dateLabel}
                        </text>
                      ))}

                      {/* Baseline */}
                      <line
                        x1={PAD.left} y1={PAD.top + chartH}
                        x2={PAD.left + chartW} y2={PAD.top + chartH}
                        stroke="#cbd5e1" strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Footer Legend */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-1">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-bold">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> ≥80% High
              </span>
              <span className="flex items-center gap-1.5 font-bold">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span> 50-79% Mid
              </span>
              <span className="flex items-center gap-1.5 font-bold">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span> &lt;50% Low
              </span>
            </div>
            <span className="font-mono text-slate-400 text-[9px] hidden sm:inline">Hover dots for date telemetry</span>
          </div>
        </div>

        {/* Right: Late Arrivals Heat Map Matrix (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
          {/* Heatmap Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
                Late Arrivals Heat Map
              </h3>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Mode Toggle */}
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  onClick={() => setHeatmapMode('late')}
                  className={`text-[9px] font-bold px-2 py-1 rounded-lg transition-all cursor-pointer ${heatmapMode === 'late' ? 'bg-white text-rose-700 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  Lates
                </button>
                <button
                  onClick={() => setHeatmapMode('rush')}
                  className={`text-[9px] font-bold px-2 py-1 rounded-lg transition-all cursor-pointer ${heatmapMode === 'rush' ? 'bg-white text-blue-700 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  Rush
                </button>
              </div>
              {heatmapMode === 'late' && (
                <CustomDropdown
                  options={[
                    { value: '915', label: '>9:15 AM' },
                    { value: '900', label: '>9:00 AM' },
                    { value: '930', label: '>9:30 AM' }
                  ]}
                  value={heatmapThreshold}
                  onChange={(val) => setHeatmapThreshold(val)}
                />
              )}
            </div>
          </div>

          {/* Heatmap Compact Aspect-Square Tile Grid */}
          <div className="overflow-x-auto scrollbar-thin">
            <div className="min-w-[300px] space-y-1.5">
              {/* Day Header Row */}
              <div className="grid grid-cols-9 gap-1 text-center items-center">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider col-span-1">Hr</span>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <span key={day} className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider col-span-1">{day.slice(0, 2)}</span>
                ))}
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider col-span-1">Σ</span>
              </div>

              {/* Hour Rows with Aspect-Square Tiles */}
              {['8AM', '9AM', '10AM', '11AM', '12PM+'].map((slotLabel, sIdx) => {
                let rowTotal = 0;
                const rowCells = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, dIdx) => {
                  const cellData = heatmapMatrix[dIdx]?.[sIdx] || { totalCount: 0, lateCount915: 0, lateCount900: 0, lateCount930: 0, records: [] };
                  let count = cellData.totalCount;
                  if (heatmapMode === 'late') {
                    if (heatmapThreshold === '900') count = cellData.lateCount900;
                    else if (heatmapThreshold === '930') count = cellData.lateCount930;
                    else count = cellData.lateCount915;
                  }
                  rowTotal += count;
                  return { dayName, dIdx, count, cellData };
                });

                const globalMax = Math.max(1, ...['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].flatMap((_, dIdx) =>
                  ['8AM', '9AM', '10AM', '11AM', '12PM+'].map((_, sI) => {
                    const cd = heatmapMatrix[dIdx]?.[sI] || {};
                    if (heatmapMode === 'late') {
                      if (heatmapThreshold === '900') return cd.lateCount900 || 0;
                      if (heatmapThreshold === '930') return cd.lateCount930 || 0;
                      return cd.lateCount915 || 0;
                    }
                    return cd.totalCount || 0;
                  })
                ));

                return (
                  <div key={sIdx} className="grid grid-cols-9 gap-1 items-center">
                    {/* Hour Pill */}
                    <div className="col-span-1 text-[9px] font-extrabold text-slate-500 font-mono bg-slate-100 border border-slate-200/80 rounded-lg py-1.5 flex items-center justify-center">
                      {slotLabel}
                    </div>

                    {/* Day Cells */}
                    {rowCells.map(({ dayName, dIdx, count, cellData }) => {
                      const intensity = count / globalMax;
                      let bgStyle, textStyle;
                      if (count === 0) {
                        bgStyle = 'bg-slate-50 border-slate-100 text-slate-300 hover:bg-slate-100';
                        textStyle = '';
                      } else if (intensity >= 0.8) {
                        bgStyle = 'bg-rose-500 text-white font-extrabold shadow-2xs border-rose-600 hover:bg-rose-600 animate-pulse';
                        textStyle = '';
                      } else if (intensity >= 0.5) {
                        bgStyle = 'bg-rose-400 text-white font-extrabold border-rose-500 hover:bg-rose-500';
                        textStyle = '';
                      } else if (intensity >= 0.25) {
                        bgStyle = 'bg-rose-200 text-rose-950 font-bold border-rose-300 hover:bg-rose-300';
                        textStyle = '';
                      } else {
                        bgStyle = 'bg-rose-100 text-rose-900 font-bold border-rose-200 hover:bg-rose-200';
                        textStyle = '';
                      }

                      return (
                        <button
                          key={dIdx}
                          onClick={() => {
                            if (count > 0) {
                              setSelectedHeatmapCell({
                                dayName,
                                slotLabel,
                                count,
                                records: cellData.records.filter(r => {
                                  if (heatmapMode === 'rush') return true;
                                  if (heatmapThreshold === '900') return r.isLate900;
                                  if (heatmapThreshold === '930') return r.isLate930;
                                  return r.isLate915;
                                })
                              });
                            }
                          }}
                          className={`col-span-1 aspect-square rounded-lg flex items-center justify-center text-[11px] border transition-all duration-150 cursor-pointer ${bgStyle} ${textStyle}`}
                          title={`${dayName} at ${slotLabel}: ${count} ${heatmapMode === 'late' ? 'Late Arrivals' : 'Clock-In Punches'}`}
                        >
                          {count > 0 ? count : '–'}
                        </button>
                      );
                    })}

                    {/* Row Summary */}
                    <div className={`col-span-1 aspect-square rounded-lg flex items-center justify-center text-[10px] font-mono border ${rowTotal > 0 ? 'bg-slate-100 border-slate-200 text-slate-700 font-extrabold' : 'bg-slate-50/50 border-slate-100 text-slate-300'}`}>
                      {rowTotal > 0 ? rowTotal : '–'}
                    </div>
                  </div>
                );
              })}
            </div>
          {/* Compact Legend */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Intensity:</span>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-400">0</span>
              <span className="px-1.5 py-0.5 rounded bg-rose-100 border border-rose-200 text-rose-800">Low</span>
              <span className="px-1.5 py-0.5 rounded bg-rose-300 border border-rose-400 text-rose-900">Mid</span>
              <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white font-extrabold">High</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Biometric Punch Density Distribution Chart */}
      <div className="lg:col-span-12 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#3b3492]" />
              Biometric Terminal Punch Density (Hourly Peak Traffic)
            </h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              Distribution of IN and OUT punch swipes recorded per hour across the day
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-[#15803d]">
              <span className="h-2.5 w-2.5 rounded bg-[#16a34a]"></span> IN Swipes
            </span>
            <span className="flex items-center gap-1.5 text-[#0369a1]">
              <span className="h-2.5 w-2.5 rounded bg-[#0284c7]"></span> OUT Swipes
            </span>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1.5 sm:gap-2 items-end h-44 pt-6 border-b border-slate-150 pb-2 w-full">
          {hourlyPunchDensity.hoursMap.map(slot => {
            const total = slot.inCount + slot.outCount;
            const inHeightPct = Math.round((slot.inCount / hourlyPunchDensity.maxPunches) * 100);
            const outHeightPct = Math.round((slot.outCount / hourlyPunchDensity.maxPunches) * 100);

            return (
              <div key={slot.hour} className="flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer w-full" title={`${slot.label}: ${slot.inCount} IN, ${slot.outCount} OUT`}>
                <div className="text-[9px] font-mono font-black text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  {total > 0 ? total : ''}
                </div>

                <div className="w-full max-w-[28px] flex flex-col items-center gap-0.5 justify-end h-full">
                  {slot.inCount > 0 && (
                    <div 
                      className="w-full bg-[#16a34a] rounded-t-xs group-hover:bg-[#15803d] transition-all duration-200 shadow-2xs"
                      style={{ height: `${Math.max(10, inHeightPct)}%` }}
                    ></div>
                  )}

                  {slot.outCount > 0 && (
                    <div 
                      className="w-full bg-[#0284c7] rounded-t-xs group-hover:bg-[#0369a1] transition-all duration-200 shadow-2xs"
                      style={{ height: `${Math.max(10, outHeightPct)}%` }}
                    ></div>
                  )}

                  {total === 0 && (
                    <div className="w-full h-1 bg-slate-100 rounded-full"></div>
                  )}
                </div>

                <span className="text-[9px] font-mono font-bold text-slate-500 whitespace-nowrap">{slot.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      </div>
      )}

      {/* DEPARTMENT BREAKDOWN & COMPARATIVE ANALYTICS SUB-VIEW */}
      {subSegmentView === 'depts' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Banner */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#3b3492]" />
                Inter-Departmental Performance & Attendance Matrix
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Comparative analysis across PF, NON PF, NI Group1, and NI Group2 operational units
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#eeedfa] text-[#3b3492] border border-[#c7c4f0] text-[10px] font-black uppercase tracking-wider">
                4 Operational Units
              </span>
            </div>
          </div>

          {/* Department Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {departmentMetrics.map(dept => (
              <div 
                key={dept.department}
                className="group bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-slate-500 group-hover:text-[#3b3492] transition-colors" />
                      Dept: {dept.department}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      dept.status === 'Optimal' ? 'bg-[#eaf7ed] text-[#15803d] border border-[#bbf7d0]' :
                      dept.status === 'Standard' ? 'bg-[#f0f9ff] text-[#0369a1] border border-[#bae6fd]' :
                      'bg-[#fcf0f0] text-[#b91c1c] border border-[#fecaca]'
                    }`}>
                      {dept.status}
                    </span>
                  </div>

                  <div className="space-y-2 mt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Headcount</span>
                      <span className="font-mono font-black text-slate-900">{dept.totalCount} Staff</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Presence Rate</span>
                      <span className="font-mono font-black text-[#15803d]">{dept.presenceRate}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          dept.presenceRate >= 80 ? 'bg-[#16a34a]' : dept.presenceRate >= 50 ? 'bg-[#0284c7]' : 'bg-[#dc2626]'
                        }`}
                        style={{ width: `${dept.presenceRate}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Punctuality Score</span>
                      <span className="font-mono font-black text-slate-800">{dept.punctualityRate}%</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-medium">{dept.presentCount} Present Today</span>
                  <span className="text-[#b91c1c] font-black">{dept.lateCount} Late Clock-Ins</span>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Department Comparative Table */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-sky-600" />
                Department Comparative Telemetry Summary
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <th className="px-4 py-3">Department Name</th>
                    <th className="px-4 py-3">Total Workforce</th>
                    <th className="px-4 py-3">Active Present</th>
                    <th className="px-4 py-3">Attendance Rate</th>
                    <th className="px-4 py-3">Punctuality Score</th>
                    <th className="px-4 py-3">Late Clock-Ins</th>
                    <th className="px-4 py-3 text-right">Operational Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-slate-700">
                  {departmentMetrics.map((dept, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-black text-slate-900">Dept: {dept.department}</td>
                      <td className="px-4 py-3 font-mono font-bold">{dept.totalCount} Employees</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-700">{dept.presentCount}</td>
                      <td className="px-4 py-3 font-mono font-extrabold text-slate-900">{dept.presenceRate}%</td>
                      <td className="px-4 py-3 font-mono font-bold text-sky-700">{dept.punctualityRate}%</td>
                      <td className="px-4 py-3 font-mono font-bold text-[#b91c1c]">{dept.lateCount}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          dept.status === 'Optimal' ? 'bg-[#eaf7ed] text-[#15803d] border border-[#bbf7d0]' :
                          dept.status === 'Standard' ? 'bg-[#f0f9ff] text-[#0369a1] border border-[#bae6fd]' :
                          'bg-[#fcf0f0] text-[#b91c1c] border border-[#fecaca]'
                        }`}>
                          {dept.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. Biometric Logs Exception Telemetry Module */}
      {subSegmentView === 'exceptions' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                Biometric Logs Exception Reports
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Automated detection for missing punches, double-swipes, and unrecorded attendance</p>
            </div>

            {/* Exception Category Filter Pills */}
            <div className="flex flex-wrap bg-slate-100 p-0.5 rounded-2xl border border-slate-200">
              {[
                { id: 'missingOut', label: 'Missing OUT (Auto-Out)', count: exceptions.missingOut.length },
                { id: 'missingIn', label: 'Missing IN (Orphan OUT)', count: exceptions.missingIn.length },
                { id: 'duplicates', label: 'Rapid Double Swipes', count: exceptions.duplicateLogs.length },
                { id: 'noAttendance', label: 'Zero Attendance Record', count: exceptions.noAttendance.length }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setExceptionTab(tab.id)}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${exceptionTab === tab.id
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60 font-extrabold'
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  {tab.label}
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-extrabold ${exceptionTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Exception List Table */}
          <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-slate-50/80 text-[10px] font-bold uppercase text-slate-400 tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Designation & Dept</th>
                    <th className="px-4 py-3">Exception Date / Details</th>
                    <th className="px-4 py-3 text-right">Anomaly Severity</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-150 text-slate-700">
                  {activeExceptionList.length > 0 ? (
                    activeExceptionList.slice(0, 10).map((item, idx) => (
                      <tr
                        key={idx}
                        onClick={() => onSelectEmployee && onSelectEmployee(item.empId)}
                        className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3">
                          <span className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors block">{item.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.empId}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-800 block">{item.designation}</span>
                          <span className="text-[10px] text-slate-500">{item.department}</span>
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {item.dateStr ? (
                            <span className="text-slate-800 font-bold block">{item.dateStr}</span>
                          ) : null}
                          <span className="text-[10px] text-slate-500">
                            {item.inTimeStr ? `IN Punch at ${item.inTimeStr}` : item.outTimeStr ? `OUT Punch at ${item.outTimeStr}` : item.timeStr ? `${item.direction} Swipe (${item.gapSecs}s gap)` : item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase border ${exceptionTab === 'missingOut' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              exceptionTab === 'missingIn' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                exceptionTab === 'duplicates' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                  'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                            ⚠️ {item.type}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400 font-medium">
                        No exception anomalies found for the selected category in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modern Workforce Leaderboards Grid */}
      {subSegmentView === 'leaderboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Leaderboard 1: Most Punctual */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                  Top 5 Punctual Workforce
                </h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Ranked by average first clock-in time</p>
              </div>
              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl font-mono">
                Punctuality Highs
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {mostPunctual.length > 0 ? (
                mostPunctual.map((item, idx) => (
                  <div
                    key={item.empId}
                    onClick={() => onSelectEmployee && onSelectEmployee(item.empId)}
                    className="group bg-slate-50/70 hover:bg-emerald-50/40 border border-slate-200/70 hover:border-emerald-300/80 rounded-2xl p-3 flex items-center justify-between transition-all duration-150 cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`h-7 w-7 rounded-xl font-mono font-extrabold text-xs flex items-center justify-center shrink-0 ${idx === 0 ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700'
                        }`}>
                        #{idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <p className="font-extrabold text-slate-900 text-xs truncate group-hover:text-emerald-700 transition-colors">{item.name}</p>
                          <span className="text-[9px] font-mono text-slate-400 font-semibold">{item.empId}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                          {item.designation} • <span className="font-semibold text-slate-600">{item.department}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <div className="text-right">
                        <span className="bg-emerald-100/80 text-emerald-800 font-extrabold px-2.5 py-1 rounded-xl border border-emerald-200 font-mono text-[11px] block">
                          Avg: {item.valStr}
                        </span>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No punch records available for target date range.
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 text-right border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400">Click employee to inspect detailed profile &amp; logs →</span>
          </div>
        </div>

        {/* Leaderboard 2: Frequently Late */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
                  Top 5 Late Risk Exposure
                </h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Ranked by late clock-in frequency (&gt;09:15 AM)</p>
              </div>
              <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200/80 px-2.5 py-1 rounded-xl font-mono">
                Threshold Alert
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {frequentlyLate.length > 0 ? (
                frequentlyLate.map((item, idx) => (
                  <div
                    key={item.empId}
                    onClick={() => onSelectEmployee && onSelectEmployee(item.empId)}
                    className="group bg-slate-50/70 hover:bg-rose-50/40 border border-slate-200/70 hover:border-rose-300/80 rounded-2xl p-3 flex items-center justify-between transition-all duration-150 cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`h-7 w-7 rounded-xl font-mono font-extrabold text-xs flex items-center justify-center shrink-0 ${idx === 0 ? 'bg-rose-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700'
                        }`}>
                        #{idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <p className="font-extrabold text-slate-900 text-xs truncate group-hover:text-rose-700 transition-colors">{item.name}</p>
                          <span className="text-[9px] font-mono text-slate-400 font-semibold">{item.empId}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                          {item.designation} • <span className="font-semibold text-slate-600">{item.department}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <div className="text-right">
                        <span className="bg-rose-100/80 text-rose-800 font-extrabold px-2.5 py-1 rounded-xl border border-rose-200 font-mono text-[11px] block">
                          {item.lateCount} Lates
                        </span>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-rose-600 transition-colors" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No late clock-ins recorded in selected range.
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 text-right border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400">Click employee to inspect detailed profile &amp; logs →</span>
          </div>
        </div>

      </div>
      )}

      {/* Heatmap Cell Breakdown Modal Drawer */}
      {selectedHeatmapCell && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4.5 flex items-center justify-between border-b border-slate-800">
              <div>
                <h4 className="font-extrabold text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-rose-400" />
                  {selectedHeatmapCell.dayName} at {selectedHeatmapCell.slotLabel} Clock-In Breakdown
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Showing {selectedHeatmapCell.records.length} employee clock-ins
                </p>
              </div>
              <button
                onClick={() => setSelectedHeatmapCell(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2 divide-y divide-slate-150 scrollbar-thin">
              {selectedHeatmapCell.records.map((r, rIdx) => (
                <div
                  key={rIdx}
                  onClick={() => {
                    setSelectedHeatmapCell(null);
                    if (onSelectEmployee) onSelectEmployee(r.empId);
                  }}
                  className="pt-2 flex items-center justify-between text-xs hover:bg-slate-50 p-2 rounded-xl cursor-pointer transition-colors group"
                >
                  <div>
                    <p className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">{r.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {r.empId} • {r.designation} ({r.department})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-800 block text-xs">{r.timeStr}</span>
                    <span className="text-[9px] text-slate-400 font-medium">{r.dateStr}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 border-t border-slate-200 p-3 text-right">
              <button
                onClick={() => setSelectedHeatmapCell(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
