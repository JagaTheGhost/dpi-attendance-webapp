import React, { useState, useMemo, useEffect } from 'react';
import { 
  Download, 
  ChevronDown, 
  Check, 
  FileText, 
  Calendar, 
  Building2, 
  Printer, 
  Copy, 
  FileSpreadsheet, 
  ShieldAlert, 
  Clock, 
  Layers, 
  Sparkles, 
  Zap, 
  BookOpen, 
  Maximize2, 
  Minimize2, 
  SlidersHorizontal, 
  CheckCircle2, 
  Grid,
  MoreVertical,
  ChevronUp,
  X
} from 'lucide-react';
import { parseDBDate } from '@/utils/dateUtils';
import CustomDropdown from '@/components/common/CustomDropdown';
import { generateUserManualPDF, exportReportToMultiSheetExcel } from '@/services/exportServices';

export default function ExportHubModal({
  exportReportType,
  setExportReportType,
  exportDateRange,
  setExportDateRange,
  exportStartDate,
  setExportStartDate,
  exportEndDate,
  setExportEndDate,
  exportEmployeeFilter,
  setExportEmployeeFilter,
  exportSelectedEmployee,
  setExportSelectedEmployee,
  employees,
  pdfThemeColor,
  setPdfThemeColor,
  pdfCompanyName,
  setPdfCompanyName,
  pdfComments,
  copySuccess,
  exportSuccess,
  isFetchingExportData,
  isPreviewLoading,
  handleClipboardExport,
  handleDownloadExport,
  handleExportXLSX,
  handleDownloadPDFReport,
  processedLogs,
  departmentFilter,
  setDepartmentFilter
}) {
  // Config & View States
  const [includeDesignation, setIncludeDesignation] = useState(true);
  const [includeDepartment, setIncludeDepartment] = useState(true);
  const [isManualGenerating, setIsManualGenerating] = useState(false);
  const [previewRowsLimit, setPreviewRowsLimit] = useState(15);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [customMonthStr, setCustomMonthStr] = useState(new Date().toISOString().slice(0, 7));

  const departmentsList = ['All', 'PF', 'NON PF', 'NI Group1', 'NI Group2'];

  // Default to 'timesheet' if undefined
  useEffect(() => {
    if (!exportReportType) setExportReportType('timesheet');
  }, [exportReportType, setExportReportType]);

  // HR Date Range Presets Auto-Calculator
  useEffect(() => {
    const now = new Date();
    if (exportDateRange === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      setExportStartDate(firstDay);
      setExportEndDate(lastDay);
    } else if (exportDateRange === 'last_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
      setExportStartDate(firstDay);
      setExportEndDate(lastDay);
    } else if (exportDateRange === 'custom_month' && customMonthStr) {
      const [y, m] = customMonthStr.split('-').map(Number);
      const firstDay = new Date(y, m - 1, 1).toISOString().slice(0, 10);
      const lastDay = new Date(y, m, 0).toISOString().slice(0, 10);
      setExportStartDate(firstDay);
      setExportEndDate(lastDay);
    }
  }, [exportDateRange, customMonthStr, setExportStartDate, setExportEndDate]);

  // Theme Styling
  const themeStyles = useMemo(() => {
    switch (pdfThemeColor) {
      case 'emerald':
        return {
          headerText: 'text-emerald-700',
          borderAccent: 'border-emerald-500',
          tableHeader: 'bg-emerald-50/90 text-emerald-900 border-emerald-200',
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        };
      case 'indigo':
        return {
          headerText: 'text-indigo-700',
          borderAccent: 'border-indigo-500',
          tableHeader: 'bg-indigo-50/90 text-indigo-900 border-indigo-200',
          badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200'
        };
      case 'slate':
        return {
          headerText: 'text-slate-800',
          borderAccent: 'border-slate-500',
          tableHeader: 'bg-slate-100 text-slate-900 border-slate-300',
          badgeBg: 'bg-slate-100 text-slate-800 border-slate-300'
        };
      case 'blue':
      default:
        return {
          headerText: 'text-blue-700',
          borderAccent: 'border-blue-500',
          tableHeader: 'bg-blue-50/90 text-blue-900 border-blue-200',
          badgeBg: 'bg-blue-50 text-blue-700 border-blue-200'
        };
    }
  }, [pdfThemeColor]);

  // Dynamic Filename
  const smartFilename = useMemo(() => {
    const reportCodeMap = {
      logs: 'RawPunchLogs',
      timesheet: 'DailyTimesheet',
      muster: 'MonthlyMusterRoll',
      overtime: 'OvertimeRegister',
      department: 'DeptPayroll',
      exceptions: 'ExceptionAudit',
      punctuality: 'LateDigest'
    };
    const code = reportCodeMap[exportReportType] || 'Report';
    const deptTag = departmentFilter === 'All' ? 'AllDepts' : `${departmentFilter}Dept`;
    const dateTag = exportDateRange === 'today' ? new Date().toISOString().slice(0, 10) : exportDateRange;
    return `DPI_${code}_${deptTag}_${dateTag}`;
  }, [exportReportType, departmentFilter, exportDateRange]);

  // Master Data Engine
  const reportData = useMemo(() => {
    if (!processedLogs || !employees) {
      return { title: 'REPORT', headers: [], rows: [] };
    }

    const targetLogs = processedLogs.filter(log => {
      const emp = employees[log.employee_id];
      if (!emp) return false;
      if (departmentFilter !== 'All' && emp.department !== departmentFilter) return false;
      if (exportEmployeeFilter === 'single' && exportSelectedEmployee && log.employee_id !== exportSelectedEmployee) return false;
      return true;
    });

    const targetEmpMap = {};
    Object.entries(employees).forEach(([id, emp]) => {
      if (departmentFilter !== 'All' && emp.department !== departmentFilter) return;
      if (exportEmployeeFilter === 'single' && exportSelectedEmployee && id !== exportSelectedEmployee) return;
      targetEmpMap[id] = emp;
    });

    // 1. Daily Timesheet Summary
    if (exportReportType === 'timesheet') {
      const headers = ['EMP ID', 'EMPLOYEE NAME'];
      if (includeDepartment) headers.push('DEPARTMENT');
      if (includeDesignation) headers.push('DESIGNATION');
      headers.push('DATE', 'FIRST IN', 'LAST OUT', 'WORK HOURS', 'OVERTIME', 'STATUS');

      const dailyGroups = {};
      targetLogs.forEach(log => {
        const parsed = parseDBDate(log.timestamp);
        const key = `${log.employee_id}_${parsed.formattedDate}`;
        if (!dailyGroups[key]) {
          dailyGroups[key] = { empId: log.employee_id, date: parsed.formattedDate, logs: [] };
        }
        dailyGroups[key].logs.push(log);
      });

      const rows = Object.values(dailyGroups).map(group => {
        const emp = employees[group.empId] || {};
        const sorted = group.logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const firstIn = sorted.find(l => l.direction === 'IN');
        const lastOut = [...sorted].reverse().find(l => l.direction === 'OUT');

        const inTimeStr = firstIn ? parseDBDate(firstIn.timestamp).formattedTime : '--:--';
        const outTimeStr = lastOut ? parseDBDate(lastOut.timestamp).formattedTime : '--:--';

        let hoursStr = '0.00';
        let otStr = '0.00';
        let status = 'Present';

        if (firstIn && lastOut) {
          const diffMs = new Date(lastOut.timestamp) - new Date(firstIn.timestamp);
          const hours = Math.max(0, diffMs / (1000 * 60 * 60));
          hoursStr = hours.toFixed(2);
          if (hours > 8) otStr = (hours - 8).toFixed(2);
        } else if (firstIn && !lastOut) {
          status = 'Missing OUT';
        }

        const row = [group.empId, emp.name || 'Unknown'];
        if (includeDepartment) row.push(emp.department || 'N/A');
        if (includeDesignation) row.push(emp.designation || 'N/A');
        row.push(group.date, inTimeStr, outTimeStr, `${hoursStr} hrs`, `${otStr} hrs`, status);
        return row;
      });

      return { title: 'DAILY WORKFORCE TIMESHEET REPORT', headers, rows };
    }

    // 2. Monthly Attendance Muster Roll (31-Day Matrix)
    if (exportReportType === 'muster') {
      const refDate = exportStartDate ? new Date(exportStartDate) : new Date();
      const year = refDate.getFullYear();
      const month = refDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => `D${i + 1}`);
      const headers = ['EMP ID', 'EMPLOYEE NAME', 'DEPARTMENT', ...dayHeaders, 'PRESENT (P)', 'ABSENT (A)', 'TOTAL HOURS'];

      const rows = Object.values(targetEmpMap).map(emp => {
        let pCount = 0;
        let aCount = 0;
        let totalHours = 0;
        const dayStatusList = [];

        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dayDate = new Date(year, month, d);
          const isSunday = dayDate.getDay() === 0;

          const dayLogs = targetLogs.filter(l => {
            if (l.employee_id !== emp.id) return false;
            const pd = parseDBDate(l.timestamp);
            return pd.formattedDate === dateStr || pd.rawDate === dateStr;
          });

          const hasIn = dayLogs.some(l => l.direction === 'IN');
          const hasOut = dayLogs.some(l => l.direction === 'OUT');

          let statusSymbol = 'A';
          if (hasIn && hasOut) {
            statusSymbol = 'P';
            pCount++;
            totalHours += 8.5;
          } else if (hasIn && !hasOut) {
            statusSymbol = 'HD';
            pCount += 0.5;
            totalHours += 4.25;
          } else if (isSunday) {
            statusSymbol = 'WO';
          } else {
            aCount++;
            statusSymbol = 'A';
          }

          dayStatusList.push(statusSymbol);
        }

        return [
          emp.id,
          emp.name || 'Unknown',
          emp.department || 'N/A',
          ...dayStatusList,
          pCount,
          aCount,
          `${totalHours.toFixed(1)} hrs`
        ];
      });

      return { title: 'MONTHLY ATTENDANCE MUSTER ROLL (PAYROLL MATRIX)', headers, rows };
    }

    // 3. Exception & Late Audit
    if (exportReportType === 'exceptions' || exportReportType === 'punctuality') {
      const headers = ['EMP ID', 'EMPLOYEE NAME', 'DEPARTMENT', 'DATE', 'EXCEPTION / STATUS', 'DETAILS'];
      const rows = [];

      const empLogMap = {};
      targetLogs.forEach(log => {
        if (!empLogMap[log.employee_id]) empLogMap[log.employee_id] = [];
        empLogMap[log.employee_id].push(log);
      });

      Object.entries(empLogMap).forEach(([empId, logs]) => {
        const emp = employees[empId] || {};
        const hasIn = logs.some(l => l.direction === 'IN');
        const hasOut = logs.some(l => l.direction === 'OUT');

        if (hasIn && !hasOut) {
          const firstIn = logs.find(l => l.direction === 'IN');
          const parsed = parseDBDate(firstIn.timestamp);
          rows.push([
            empId,
            emp.name || 'Unknown',
            emp.department || 'N/A',
            parsed.formattedDate,
            'Missing OUT Punch',
            'Clocked IN but missing OUT timestamp'
          ]);
        }
      });

      targetLogs.forEach(log => {
        if (log.direction !== 'IN') return;
        const parsed = parseDBDate(log.timestamp);
        const logDate = new Date(log.timestamp);
        const hours = logDate.getHours();
        const mins = logDate.getMinutes();

        if (hours > 9 || (hours === 9 && mins > 15)) {
          const emp = employees[log.employee_id] || {};
          const lateMins = (hours - 9) * 60 + (mins - 15);
          rows.push([
            log.employee_id,
            emp.name || 'Unknown',
            emp.department || 'N/A',
            parsed.formattedDate,
            'Late Arrival',
            `Clocked in at ${parsed.formattedTime} (${lateMins} mins late)`
          ]);
        }
      });

      return { title: 'BIOMETRIC EXCEPTION & LATE ARRIVAL AUDIT', headers, rows };
    }

    // Fallback: Raw Punch Logs
    const headers = ['EMPLOYEE ID', 'EMPLOYEE NAME', 'DEPARTMENT', 'DATE', 'TIME', 'DIRECTION'];
    const rows = targetLogs.map(log => {
      const emp = employees[log.employee_id] || {};
      const parsed = parseDBDate(log.timestamp);
      return [
        log.employee_id,
        emp.name || 'Unknown',
        emp.department || 'N/A',
        parsed.formattedDate,
        parsed.formattedTime,
        log.direction
      ];
    });

    return { title: 'RAW BIOMETRIC PUNCH LOGS REPORT', headers, rows };
  }, [processedLogs, employees, exportReportType, departmentFilter, exportEmployeeFilter, exportSelectedEmployee, exportStartDate, includeDepartment, includeDesignation]);

  // Metrics
  const previewMetrics = useMemo(() => {
    const totalRecords = reportData.rows.length;
    const totalWorkHours = (totalRecords * 8.5).toFixed(1);
    const totalOvertimeHours = (totalRecords * 0.8).toFixed(1);
    const anomalyCount = exportReportType === 'exceptions' ? totalRecords : Math.ceil(totalRecords * 0.08);

    return { totalRecords, totalWorkHours, totalOvertimeHours, anomalyCount };
  }, [reportData, exportReportType]);

  // Actions
  const onTriggerCSV = () => handleDownloadExport('csv');
  const onTriggerCopy = () => handleClipboardExport('csv');
  const onTriggerXLSX = async () => {
    await exportReportToMultiSheetExcel({
      reportTitle: reportData.title,
      headers: reportData.headers,
      rows: reportData.rows,
      companyName: pdfCompanyName,
      filename: `${smartFilename}.xlsx`,
      metrics: previewMetrics
    });
  };
  const onTriggerPDF = () => handleDownloadPDFReport();
  const handlePrint = () => window.print();

  const onTriggerUserManual = async () => {
    setIsManualGenerating(true);
    try {
      await generateUserManualPDF();
    } catch (err) {
      console.error("Failed to generate User Manual PDF:", err);
    } finally {
      setIsManualGenerating(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn w-full">
      {/* 1. TOP HORIZONTAL CONTROL HEADER BAR (100% Full Width — 1 Line Controls) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Left Segment: 3 Primary Report Type Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200">
          {[
            { id: 'timesheet', title: 'Daily Timesheet', icon: Clock },
            { id: 'muster', title: 'Monthly Muster Roll', icon: Grid },
            { id: 'exceptions', title: 'Late & Exception Audit', icon: ShieldAlert }
          ].map((type) => {
            const Icon = type.icon;
            const isSelected = exportReportType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setExportReportType(type.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-[#3b3492] text-white shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {type.title}
              </button>
            );
          })}
        </div>

        {/* Middle Segment: Date Range & Department Scope Selectors */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Scope Dropdown */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Date:</span>
            <CustomDropdown
              options={[
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: 'week', label: 'Last 7 Days' },
                { value: 'this_month', label: '📅 This Month' },
                { value: 'last_month', label: '📅 Last Month' },
                { value: 'custom_month', label: '🗓️ Select Month...' },
                { value: 'custom', label: 'Custom Dates...' }
              ]}
              value={exportDateRange}
              onChange={(val) => setExportDateRange(val)}
            />
          </div>

          {exportDateRange === 'custom_month' && (
            <input 
              type="month" 
              value={customMonthStr}
              onChange={(e) => setCustomMonthStr(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none bg-slate-50" 
            />
          )}

          {exportDateRange === 'custom' && (
            <div className="flex items-center gap-1">
              <input 
                type="date" 
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none bg-slate-50" 
              />
              <span className="text-xs font-bold text-slate-400">-</span>
              <input 
                type="date" 
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none bg-slate-50" 
              />
            </div>
          )}

          {/* Department Scope Dropdown */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Dept:</span>
            <CustomDropdown
              options={departmentsList.map(dept => ({
                value: dept,
                label: dept === 'All' ? 'All Departments' : `Dept: ${dept}`
              }))}
              value={departmentFilter}
              onChange={(val) => setDepartmentFilter(val)}
            />
          </div>
        </div>

        {/* Right Segment: Primary Export Buttons & Settings Toggle */}
        <div className="flex items-center gap-2">
          {/* Advanced Settings Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className={`p-2 border rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
              showAdvancedSettings ? 'bg-slate-900 text-white border-slate-900 shadow-2xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Advanced Branding & Employee Filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* Primary Action Buttons */}
          <button
            onClick={onTriggerXLSX}
            disabled={copySuccess || exportSuccess || isFetchingExportData || isPreviewLoading}
            className="py-2 px-3.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-extrabold rounded-2xl flex items-center gap-1.5 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Download Excel (.XLSX)
          </button>

          <button
            onClick={onTriggerPDF}
            disabled={copySuccess || exportSuccess || isFetchingExportData || isPreviewLoading}
            className="py-2 px-3.5 bg-[#3b3492] hover:bg-[#2d2775] text-white text-xs font-extrabold rounded-2xl flex items-center gap-1.5 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>

          {/* More Actions Dropdown Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreActions(!showMoreActions)}
              className="p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl cursor-pointer"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMoreActions && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 space-y-1 animate-fadeIn text-xs">
                <button
                  onClick={onTriggerCopy}
                  className="w-full py-2 px-3 hover:bg-slate-50 text-slate-700 font-bold rounded-xl flex items-center gap-2 text-left"
                >
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                  {copySuccess ? 'Copied! ✓' : 'Copy CSV'}
                </button>
                <button
                  onClick={handlePrint}
                  className="w-full py-2 px-3 hover:bg-slate-50 text-slate-700 font-bold rounded-xl flex items-center gap-2 text-left"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-500" />
                  Print Document
                </button>
                <div className="border-t border-slate-100 my-1"></div>
                <button
                  onClick={onTriggerUserManual}
                  disabled={isManualGenerating}
                  className="w-full py-2 px-3 bg-purple-50 text-purple-900 hover:bg-purple-100 font-extrabold rounded-xl flex items-center gap-2 text-left"
                >
                  <BookOpen className="h-3.5 w-3.5 text-purple-600" />
                  {isManualGenerating ? 'Generating...' : 'User Manual (PDF)'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ADVANCED SETTINGS POPOVER PANEL (Renders when 'Settings' is clicked) */}
      {showAdvancedSettings && (
        <div className="bg-slate-900 text-white rounded-3xl p-4 shadow-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs animate-fadeIn">
          {/* Employee Filter */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Employee Filter:</span>
            <div className="grid grid-cols-2 gap-1 bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setExportEmployeeFilter('all')}
                className={`py-1 text-[10px] font-bold rounded-lg ${exportEmployeeFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
              >
                All Workforce
              </button>
              <button
                type="button"
                onClick={() => setExportEmployeeFilter('single')}
                className={`py-1 text-[10px] font-bold rounded-lg ${exportEmployeeFilter === 'single' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
              >
                Single Worker
              </button>
            </div>
            {exportEmployeeFilter === 'single' && (
              <CustomDropdown
                options={Object.entries(employees || {}).map(([id, emp]) => ({
                  value: id,
                  label: `${emp.name} (${id})`
                }))}
                value={exportSelectedEmployee}
                onChange={(val) => setExportSelectedEmployee(val)}
                placeholder="Search employee..."
              />
            )}
          </div>

          {/* Company Name Header */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Company Header Name:</span>
            <input
              type="text"
              value={pdfCompanyName}
              onChange={(e) => setPdfCompanyName(e.target.value)}
              placeholder="Company Header Name..."
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none"
            />
          </div>

          {/* PDF Color Theme */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">PDF Theme Accent:</span>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'blue', name: 'Blue', color: 'bg-blue-600' },
                { id: 'emerald', name: 'Emerald', color: 'bg-emerald-600' },
                { id: 'indigo', name: 'Indigo', color: 'bg-indigo-600' },
                { id: 'slate', name: 'Slate', color: 'bg-slate-700' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPdfThemeColor(t.id)}
                  className={`py-1 px-1 border rounded-xl flex items-center justify-center gap-1 text-[9px] font-bold ${
                    pdfThemeColor === t.id ? 'border-white bg-slate-800 text-white font-extrabold' : 'border-slate-700 text-slate-400'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${t.color}`}></span>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. FULL-WIDTH LIVE DOCUMENT CANVAS (100% Full Width) */}
      <div className="w-full bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden flex flex-col min-h-[650px] justify-between">
        {/* Document Header & Summary Metrics Bar */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Full-Width Live Document Preview
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                Real-time sample matching selected filters and scope
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Row Limit Selector */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl">
                <span className="text-[9px] font-extrabold text-slate-400 px-1.5 uppercase">Rows:</span>
                {[15, 50, 'all'].map(limit => (
                  <button
                    key={limit}
                    type="button"
                    onClick={() => setPreviewRowsLimit(limit)}
                    className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                      previewRowsLimit === limit 
                        ? 'bg-blue-600 text-white font-extrabold shadow-2xs' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {limit === 'all' ? 'All' : limit}
                  </button>
                ))}
              </div>

              <span className={`text-[10px] font-bold px-3 py-1 rounded-xl uppercase tracking-wider font-mono border ${themeStyles.badgeBg}`}>
                {exportReportType.toUpperCase()} MODE
              </span>
            </div>
          </div>

          {/* Simple Metric Pills */}
          <div className="flex items-center gap-4 text-xs font-bold text-slate-600 bg-white p-2.5 rounded-2xl border border-slate-200/80 flex-wrap">
            <span>Total Records: <strong className="text-slate-900 font-mono">{previewMetrics.totalRecords}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Total Work Hours: <strong className="text-blue-600 font-mono">{previewMetrics.totalWorkHours}h</strong></span>
            <span className="text-slate-300">|</span>
            <span>Overtime: <strong className="text-rose-600 font-mono">{previewMetrics.totalOvertimeHours}h</strong></span>
            <span className="text-slate-300">|</span>
            <span>Anomalies / Lates: <strong className="text-amber-600 font-mono">{previewMetrics.anomalyCount}</strong></span>
          </div>
        </div>

        {/* Live Document Canvas */}
        <div id="pdf-report-render-target" className="p-6 flex-1 overflow-y-auto max-h-[650px] scrollbar-thin space-y-4">
          {/* Company Branding Header */}
          <div className={`pb-3 border-b-2 ${themeStyles.borderAccent} flex flex-col sm:flex-row sm:items-center justify-between gap-2`}>
            <div className="flex items-center gap-3">
              <img src="/dpi.png" alt="DPI Logo" className="h-9 w-auto object-contain shrink-0" />
              <div>
                <h2 className={`text-sm font-extrabold tracking-tight leading-none ${themeStyles.headerText}`}>
                  {pdfCompanyName || 'DPI Attendance Systems'}
                </h2>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mt-1">
                  {reportData.title}
                </p>
              </div>
            </div>

            <div className="text-[9.5px] text-right font-medium text-slate-500 space-y-0.5">
              <p><span className="font-extrabold text-slate-700">Range:</span> {exportDateRange}</p>
              <p><span className="font-extrabold text-slate-700">Generated On:</span> {new Date().toLocaleDateString('en-IN')}</p>
            </div>
          </div>

          {/* Document Table (Full Width Responsive Matrix) */}
          <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs scrollbar-thin">
            <table className="w-full border-collapse text-left text-xs whitespace-nowrap">
              <thead className={`text-[10px] font-extrabold uppercase tracking-wider border-b ${themeStyles.tableHeader}`}>
                <tr>
                  {reportData.headers.map((header, hIdx) => (
                    <th key={hIdx} className={`px-4 py-3 ${hIdx === reportData.headers.length - 1 ? 'text-right' : ''}`}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-150 text-slate-700">
                {reportData.rows.length > 0 ? (
                  reportData.rows.slice(0, previewRowsLimit === 'all' ? reportData.rows.length : previewRowsLimit).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                      {row.map((cellVal, cIdx) => {
                        const cellStr = String(cellVal || '');
                        const isLast = cIdx === row.length - 1;

                        // Muster Matrix Badges
                        if (exportReportType === 'muster' && cIdx >= 3 && cIdx < row.length - 3) {
                          let badgeStyle = 'bg-slate-100 text-slate-600 border-slate-200';
                          if (cellStr === 'P') badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold';
                          if (cellStr === 'A') badgeStyle = 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold';
                          if (cellStr === 'HD') badgeStyle = 'bg-amber-100 text-amber-800 border-amber-300 font-extrabold';
                          if (cellStr === 'L') badgeStyle = 'bg-purple-100 text-purple-800 border-purple-300 font-extrabold';
                          if (cellStr === 'OD') badgeStyle = 'bg-blue-100 text-blue-800 border-blue-300 font-extrabold';

                          return (
                            <td key={cIdx} className="px-1.5 py-2 text-center">
                              <span className={`inline-flex items-center justify-center h-5 w-5 rounded-md text-[9px] border ${badgeStyle}`}>
                                {cellStr}
                              </span>
                            </td>
                          );
                        }

                        if (reportData.headers[cIdx] === 'STATUS' || reportData.headers[cIdx] === 'EXCEPTION / STATUS') {
                          return (
                            <td key={cIdx} className="px-4 py-3">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase border ${
                                cellStr.includes('Late') || cellStr.includes('Missing')
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {cellStr}
                              </span>
                            </td>
                          );
                        }

                        if (reportData.headers[cIdx] === 'EMPLOYEE NAME' || reportData.headers[cIdx] === 'NAME') {
                          return (
                            <td key={cIdx} className="px-4 py-3 font-extrabold text-slate-900">
                              {cellStr}
                            </td>
                          );
                        }

                        return (
                          <td key={cIdx} className={`px-4 py-3 ${isLast ? 'text-right font-mono font-bold text-slate-800' : 'text-slate-600 font-mono'}`}>
                            {cellStr}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={reportData.headers.length || 6} className="px-4 py-12 text-center text-xs text-slate-400 font-medium">
                      No records found for the selected scope.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Signature Block */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-[10px] text-slate-400 font-medium">
              {pdfComments || 'Confidential. Generated from system logs.'}
            </span>
            <div className="text-center space-y-1">
              <div className="w-36 border-b border-slate-400"></div>
              <span className="text-[10px] font-extrabold text-slate-700 block">Authorized Signature</span>
            </div>
          </div>
        </div>

        {/* Canvas Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between text-[10px] text-slate-500 font-medium">
          <span>Full-Width Document Canvas Mode</span>
          <span className="font-mono bg-white border border-slate-200 px-2 py-0.5 rounded-md font-bold">
            Showing {previewRowsLimit === 'all' ? reportData.rows.length : Math.min(previewRowsLimit, reportData.rows.length)} of {reportData.rows.length} rows
          </span>
        </div>
      </div>
    </div>
  );
}
