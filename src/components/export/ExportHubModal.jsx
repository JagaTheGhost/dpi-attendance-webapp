import React, { useState, useMemo } from 'react';
import { 
  Download, 
  ChevronDown, 
  Check, 
  Search, 
  RefreshCw, 
  UserX,
  FileText,
  Calendar,
  Building2,
  Filter,
  Printer,
  Copy,
  FileSpreadsheet,
  ShieldAlert,
  Clock,
  Layers,
  Sparkles,
  Zap,
  BookOpen
} from 'lucide-react';
import { parseDBDate } from '@/utils/dateUtils';
import CustomDropdown from '@/components/common/CustomDropdown';
import { generateUserManualPDF } from '@/services/exportServices';

export default function ExportHubModal({
  exportReportType,
  setExportReportType,
  exportDateRange,
  setExportDateRange,
  isExportDateDropdownOpen,
  setIsExportDateDropdownOpen,
  exportStartDate,
  setExportStartDate,
  exportEndDate,
  setExportEndDate,
  exportEmployeeFilter,
  setExportEmployeeFilter,
  totalWorkforce,
  exportSelectedEmployee,
  setExportSelectedEmployee,
  isSingleDropdownOpen,
  setIsSingleDropdownOpen,
  exportSingleSearch,
  setExportSingleSearch,
  exportSelectedEmployeesGroup,
  setExportSelectedEmployeesGroup,
  isGroupDropdownOpen,
  setIsGroupDropdownOpen,
  exportGroupSearch,
  setExportGroupSearch,
  employees,
  pdfThemeColor,
  setPdfThemeColor,
  pdfCompanyName,
  setPdfCompanyName,
  pdfComments,
  setPdfComments,
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
  // Column Visibility States
  const [includeDesignation, setIncludeDesignation] = useState(true);
  const [includeDepartment, setIncludeDepartment] = useState(true);
  const [includeVerification, setIncludeVerification] = useState(true);
  const [includeBreakTime, setIncludeBreakTime] = useState(false);
  const [isManualGenerating, setIsManualGenerating] = useState(false);

  const departmentsList = ['All', 'PF', 'NON PF', 'NI Group1', 'NI Group2'];

  // Master Data Engine for All 5 Report Types
  const reportData = useMemo(() => {
    if (!processedLogs || !employees) {
      return { title: 'REPORT', headers: [], rows: [] };
    }

    // Filter logs based on Department & Employee Scope
    const targetLogs = processedLogs.filter(log => {
      const emp = employees[log.employee_id];
      if (!emp) return false;
      if (departmentFilter !== 'All' && emp.department !== departmentFilter) return false;
      if (exportEmployeeFilter === 'single' && exportSelectedEmployee && log.employee_id !== exportSelectedEmployee) return false;
      if (exportEmployeeFilter === 'group' && exportSelectedEmployeesGroup.length > 0 && !exportSelectedEmployeesGroup.includes(log.employee_id)) return false;
      return true;
    });

    const targetEmpMap = {};
    Object.entries(employees).forEach(([id, emp]) => {
      if (departmentFilter !== 'All' && emp.department !== departmentFilter) return;
      if (exportEmployeeFilter === 'single' && exportSelectedEmployee && id !== exportSelectedEmployee) return;
      if (exportEmployeeFilter === 'group' && exportSelectedEmployeesGroup.length > 0 && !exportSelectedEmployeesGroup.includes(id)) return;
      targetEmpMap[id] = emp;
    });

    if (exportReportType === 'timesheet') {
      // REPORT TYPE 2: TIMESHEET SUMMARY REPORT
      const headers = ['EMPLOYEE ID', 'EMPLOYEE NAME', 'DEPARTMENT', 'PUNCHES', 'WORK HOURS', 'OVERTIME', 'STATUS'];
      const logsByEmp = {};
      targetLogs.forEach(l => {
        if (!logsByEmp[l.employee_id]) logsByEmp[l.employee_id] = [];
        logsByEmp[l.employee_id].push(l);
      });

      const rows = Object.keys(targetEmpMap).map(id => {
        const emp = targetEmpMap[id];
        const empLogs = (logsByEmp[id] || []).sort((a, b) => parseDBDate(a.timestamp) - parseDBDate(b.timestamp));
        
        let workMs = 0;
        let lastIn = null;
        let firstInTime = null;

        empLogs.forEach(l => {
          const t = parseDBDate(l.timestamp);
          if (l.direction === 'IN') {
            lastIn = t;
            if (!firstInTime) firstInTime = t;
          } else if (l.direction === 'OUT' && lastIn) {
            workMs += (t - lastIn);
            lastIn = null;
          }
        });

        const hrs = Math.round((workMs / (1000 * 60 * 60)) * 10) / 10;
        const ot = Math.max(0, Math.round((hrs - 9) * 10) / 10);
        
        let status = 'Away / Absent';
        if (empLogs.length > 0) {
          if (firstInTime && (firstInTime.getHours() * 60 + firstInTime.getMinutes() > 9 * 60 + 15)) {
            status = 'Late Arrival';
          } else {
            status = 'Present (Compliant)';
          }
        }

        return [id, emp.name, emp.department, empLogs.length, `${hrs}h`, `${ot}h`, status];
      });

      return {
        title: 'TIMESHEET SUMMARY REPORT',
        headers,
        rows
      };
    } else if (exportReportType === 'department') {
      // REPORT TYPE 3: DEPARTMENT PAYROLL & SHIFT HOURS
      const headers = ['DEPARTMENT', 'TOTAL WORKERS', 'TOTAL PUNCHES', 'TOTAL WORK HOURS', 'TOTAL OVERTIME', 'ATTENDANCE RATE'];
      const depts = departmentFilter === 'All' ? ['PF', 'NON PF', 'NI Group1', 'NI Group2'] : [departmentFilter];
      
      const rows = depts.map(deptName => {
        const deptEmps = Object.values(employees).filter(e => e.department === deptName);
        const deptEmpIds = new Set(deptEmps.map(e => e.id || e.empId));
        
        const deptLogs = processedLogs.filter(l => deptEmpIds.has(l.employee_id));
        const presentSet = new Set(deptLogs.filter(l => l.direction === 'IN').map(l => l.employee_id));

        let totalWorkMs = 0;
        let totalOvertimeMs = 0;

        const logsByEmp = {};
        deptLogs.forEach(l => {
          if (!logsByEmp[l.employee_id]) logsByEmp[l.employee_id] = [];
          logsByEmp[l.employee_id].push(l);
        });

        Object.keys(logsByEmp).forEach(id => {
          const empLogs = logsByEmp[id].sort((a, b) => parseDBDate(a.timestamp) - parseDBDate(b.timestamp));
          let lastIn = null;
          empLogs.forEach(l => {
            const t = parseDBDate(l.timestamp);
            if (l.direction === 'IN') lastIn = t;
            else if (l.direction === 'OUT' && lastIn) {
              const span = t - lastIn;
              totalWorkMs += span;
              const hrs = span / (1000 * 60 * 60);
              if (hrs > 9) totalOvertimeMs += (hrs - 9) * 1000 * 60 * 60;
              lastIn = null;
            }
          });
        });

        const totalHrs = Math.round((totalWorkMs / (1000 * 60 * 60)) * 10) / 10;
        const totalOt = Math.round((totalOvertimeMs / (1000 * 60 * 60)) * 10) / 10;
        const rate = deptEmps.length > 0 ? Math.min(100, Math.round((presentSet.size / deptEmps.length) * 100)) : 0;

        return [deptName, `${deptEmps.length} Workers`, deptLogs.length, `${totalHrs}h`, `${totalOt}h`, `${rate}%`];
      });

      return {
        title: 'DEPARTMENT PAYROLL & SHIFT HOURS',
        headers,
        rows
      };
    } else if (exportReportType === 'exceptions') {
      // REPORT TYPE 4: BIOMETRIC EXCEPTION AUDIT REPORT
      const headers = ['EMPLOYEE ID', 'EMPLOYEE NAME', 'DEPARTMENT', 'EXCEPTION TYPE', 'DATE', 'TIME / DETAILS'];
      const rows = [];
      const logsByEmp = {};
      targetLogs.forEach(l => {
        if (!logsByEmp[l.employee_id]) logsByEmp[l.employee_id] = [];
        logsByEmp[l.employee_id].push(l);
      });

      Object.keys(logsByEmp).forEach(empId => {
        const emp = targetEmpMap[empId];
        if (!emp) return;
        const empLogs = logsByEmp[empId].sort((a, b) => parseDBDate(a.timestamp) - parseDBDate(b.timestamp));
        
        const hasIn = empLogs.some(l => l.direction === 'IN');
        const hasOut = empLogs.some(l => l.direction === 'OUT');
        const firstLog = empLogs[0];

        // 1. Missing OUT
        if (hasIn && !hasOut) {
          const t = parseDBDate(firstLog.timestamp);
          rows.push([
            empId,
            emp.name,
            emp.department,
            'Missing OUT (Auto-Out)',
            t.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            `IN Punch at ${t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} (No OUT)`
          ]);
        }

        // 2. Missing IN
        if (hasOut && (!hasIn || firstLog.direction === 'OUT')) {
          const t = parseDBDate(firstLog.timestamp);
          rows.push([
            empId,
            emp.name,
            emp.department,
            'Missing IN (Orphan OUT)',
            t.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            `OUT Punch at ${t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} (No IN)`
          ]);
        }

        // 3. Rapid Swipes (< 2 mins gap)
        for (let i = 1; i < empLogs.length; i++) {
          const prevTime = parseDBDate(empLogs[i-1].timestamp);
          const currTime = parseDBDate(empLogs[i].timestamp);
          const diffMs = currTime - prevTime;
          if (diffMs > 0 && diffMs <= 2 * 60 * 1000) {
            rows.push([
              empId,
              emp.name,
              emp.department,
              'Rapid Double Swipe',
              currTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
              `${empLogs[i].direction} Swipe at ${currTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} (${Math.round(diffMs/1000)}s gap)`
            ]);
          }
        }
      });

      // 4. Zero Attendance Record
      Object.keys(targetEmpMap).forEach(empId => {
        if (!logsByEmp[empId] || logsByEmp[empId].length === 0) {
          const emp = targetEmpMap[empId];
          rows.push([
            empId,
            emp.name,
            emp.department,
            'Zero Attendance Record',
            'Selected Scope',
            'No biometric punches recorded'
          ]);
        }
      });

      return {
        title: 'BIOMETRIC EXCEPTION AUDIT REPORT',
        headers,
        rows
      };
    } else if (exportReportType === 'punctuality') {
      // REPORT TYPE 5: PUNCTUALITY & LATE ARRIVAL DIGEST
      const headers = ['EMPLOYEE ID', 'EMPLOYEE NAME', 'DEPARTMENT', 'DESIGNATION', 'FIRST CLOCK-IN', 'LATE DELAY', 'DATE'];
      const rows = [];
      const logsByEmp = {};
      targetLogs.forEach(l => {
        if (!logsByEmp[l.employee_id]) logsByEmp[l.employee_id] = [];
        logsByEmp[l.employee_id].push(l);
      });

      Object.keys(logsByEmp).forEach(empId => {
        const emp = targetEmpMap[empId];
        if (!emp) return;
        const empLogs = logsByEmp[empId].sort((a, b) => parseDBDate(a.timestamp) - parseDBDate(b.timestamp));
        const firstIn = empLogs.find(l => l.direction === 'IN');

        if (firstIn) {
          const t = parseDBDate(firstIn.timestamp);
          const totalMins = t.getHours() * 60 + t.getMinutes();
          const targetMins = 9 * 60 + 15; // 9:15 AM
          
          if (totalMins > targetMins) {
            const delayMins = totalMins - (9 * 60);
            rows.push([
              empId,
              emp.name,
              emp.department,
              emp.designation || 'Staff',
              t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
              `+${delayMins} mins late`,
              t.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            ]);
          }
        }
      });

      rows.sort((a, b) => parseInt(b[5].replace(/\D/g, '')) - parseInt(a[5].replace(/\D/g, '')));

      return {
        title: 'PUNCTUALITY & LATE ARRIVAL DIGEST',
        headers,
        rows
      };
    } else {
      // REPORT TYPE 1: RAW PUNCH LOGS
      const headers = ['LOG ID', 'EMPLOYEE ID', 'EMPLOYEE NAME', 'DIRECTION', 'DATE', 'TIME'];
      const rows = targetLogs.map((l, idx) => {
        const emp = targetEmpMap[l.employee_id] || { name: 'Unknown' };
        const t = parseDBDate(l.timestamp);
        return [
          l.log_id || `LOG-${idx+1}`,
          l.employee_id,
          emp.name,
          l.direction,
          t.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
        ];
      });

      return {
        title: 'DETAILED BIOMETRIC PUNCH LOGS',
        headers,
        rows
      };
    }
  }, [exportReportType, processedLogs, employees, departmentFilter, exportEmployeeFilter, exportSelectedEmployee, exportSelectedEmployeesGroup]);

  // Preview Metrics Summary
  const previewMetrics = useMemo(() => {
    const totalRecords = reportData.rows.length;
    let totalWorkHours = 0;
    let totalOvertimeHours = 0;
    let anomalyCount = 0;

    if (exportReportType === 'timesheet') {
      reportData.rows.forEach(r => {
        totalWorkHours += parseFloat(r[4]) || 0;
        totalOvertimeHours += parseFloat(r[5]) || 0;
        if (r[6] === 'Late Arrival' || r[6] === 'Away / Absent') anomalyCount++;
      });
    } else if (exportReportType === 'department') {
      reportData.rows.forEach(r => {
        totalWorkHours += parseFloat(r[3]) || 0;
        totalOvertimeHours += parseFloat(r[4]) || 0;
      });
    } else if (exportReportType === 'exceptions') {
      anomalyCount = totalRecords;
    } else if (exportReportType === 'punctuality') {
      anomalyCount = totalRecords;
    } else {
      // Raw Logs
      reportData.rows.forEach(r => {
        if (r[3] === 'IN') {
          const timeParts = r[5].match(/(\d+):(\d+):(\d+)\s*(AM|PM)/i);
          if (timeParts) {
            let hrs = parseInt(timeParts[1]);
            const mins = parseInt(timeParts[2]);
            const pm = timeParts[4].toUpperCase() === 'PM';
            if (pm && hrs < 12) hrs += 12;
            if (!pm && hrs === 12) hrs = 0;
            if (hrs * 60 + mins > 9 * 60 + 15) anomalyCount++;
          }
        }
      });
    }

    return {
      totalRecords,
      totalWorkHours: Math.round(totalWorkHours * 10) / 10,
      totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
      anomalyCount
    };
  }, [reportData, exportReportType]);

  // Export Trigger Wrappers passing dynamic reportData
  const onTriggerPDF = () => {
    handleDownloadPDFReport(reportData);
  };

  const onTriggerXLSX = () => {
    handleExportXLSX(reportData);
  };

  const onTriggerCSV = () => {
    handleDownloadExport(reportData);
  };

  const onTriggerCopy = () => {
    handleClipboardExport(reportData);
  };

  const handlePrint = () => {
    window.print();
  };

  const onTriggerUserManual = async () => {
    try {
      setIsManualGenerating(true);
      await generateUserManualPDF({
        companyName: pdfCompanyName || 'DPI Attendance Systems',
        filename: `DPI_System_User_Manual_${new Date().getFullYear()}.pdf`
      });
    } catch (err) {
      console.error("Failed to generate User Manual PDF:", err);
    } finally {
      setIsManualGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch animate-fadeIn">
      {/* CONFIGURATION COLUMN (1/3) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-6 flex flex-col justify-between">
        <div className="space-y-5">
          {/* Section 1: Report Type Selector */}
          <div>
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-blue-600" /> 1. Select Report Type
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'logs', name: 'Raw Punch Logs', desc: 'Individual clock-in / out timestamps' },
                { id: 'timesheet', name: 'Timesheet Summary', desc: 'Daily total hours & compliance rates' },
                { id: 'department', name: 'Department Hours & Payroll', desc: 'Aggregated totals grouped by dept' },
                { id: 'exceptions', name: 'Biometric Exception Audit', desc: 'Missing OUTs, missing INs, rapid swipes' },
                { id: 'punctuality', name: 'Punctuality & Late Digest', desc: 'Morning late arrival logs (>9:15 AM)' }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setExportReportType(type.id)}
                  className={`p-3 border rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                    exportReportType === type.id
                      ? 'border-blue-600 bg-blue-50/60 text-slate-900 font-extrabold shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/40'
                  }`}
                >
                  <div>
                    <span className="text-xs font-extrabold block">{type.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{type.desc}</span>
                  </div>
                  {exportReportType === type.id && (
                    <Check className="h-4 w-4 text-blue-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Department & Scope Selection */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-blue-600" /> 2. Department & Date Scope
            </h3>
            
            {/* Department Dropdown */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2 rounded-2xl">
              <span className="text-xs font-bold text-slate-600">Department Scope:</span>
              <CustomDropdown
                options={departmentsList.map(dept => ({
                  value: dept,
                  label: dept === 'All' ? 'All Departments' : `Dept: ${dept}`
                }))}
                value={departmentFilter}
                onChange={(val) => setDepartmentFilter(val)}
              />
            </div>

            {/* Date Range Dropdown */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2 rounded-2xl">
              <span className="text-xs font-bold text-slate-600">Date Range Scope:</span>
              <CustomDropdown
                options={[
                  { value: 'today', label: 'Today' },
                  { value: 'yesterday', label: 'Yesterday' },
                  { value: 'week', label: 'Last 7 Days' },
                  { value: 'custom', label: 'Custom Date Range...' }
                ]}
                value={exportDateRange}
                onChange={(val) => setExportDateRange(val)}
              />
            </div>

            {exportDateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-2 animate-fadeIn pt-1">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 block mb-1">Start Date</label>
                  <input 
                    type="date" 
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none" 
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 block mb-1">End Date</label>
                  <input 
                    type="date" 
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none" 
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Included Data Field Toggles */}
          <div>
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-blue-600" /> 3. Included Data Fields
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={includeDesignation}
                  onChange={(e) => setIncludeDesignation(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                <span className="font-bold text-slate-700 text-[11px]">Designation</span>
              </label>
              <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={includeDepartment}
                  onChange={(e) => setIncludeDepartment(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                <span className="font-bold text-slate-700 text-[11px]">Department</span>
              </label>
            </div>
          </div>

          {/* Section 4: PDF Theme & Header Customization */}
          <div className="space-y-3 pt-3 border-t border-slate-150">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" /> 4. PDF Branding & Colors
            </h3>
            
            {/* Color Theme Selector */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'slate', name: 'Slate', color: 'bg-slate-700' },
                { id: 'blue', name: 'Blue', color: 'bg-blue-600' },
                { id: 'emerald', name: 'Emerald', color: 'bg-emerald-600' },
                { id: 'indigo', name: 'Indigo', color: 'bg-indigo-600' }
              ].map(theme => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setPdfThemeColor(theme.id)}
                  className={`flex flex-col items-center justify-center py-2 px-1 border rounded-xl transition-all cursor-pointer ${
                    pdfThemeColor === theme.id 
                      ? 'border-slate-800 bg-slate-50 font-extrabold text-slate-900 shadow-2xs' 
                      : 'border-slate-200 hover:border-slate-300 text-slate-600 text-[10px]'
                  }`}
                >
                  <span className={`h-3 w-3 rounded-full ${theme.color} mb-1 shadow-2xs`}></span>
                  <span className="text-[9px] font-bold">{theme.name}</span>
                </button>
              ))}
            </div>

            <input
              type="text"
              value={pdfCompanyName}
              onChange={(e) => setPdfCompanyName(e.target.value)}
              placeholder="Company Header Name..."
              className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
            />
          </div>
        </div>

        {/* Section 5: Export Action Buttons */}
        <div className="pt-4 border-t border-slate-150 space-y-2.5">
          <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">5. Export Actions & System Manual</h3>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onTriggerCopy}
              disabled={copySuccess || exportSuccess || isFetchingExportData || isPreviewLoading}
              className="py-2 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-2xs"
            >
              <Copy className="h-3.5 w-3.5 text-slate-500" />
              {copySuccess ? 'Copied! ✓' : 'Copy CSV'}
            </button>

            <button
              onClick={onTriggerCSV}
              disabled={copySuccess || exportSuccess || isFetchingExportData || isPreviewLoading}
              className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-2xs"
            >
              <Download className="h-3.5 w-3.5" />
              {exportSuccess ? 'Downloaded! ✓' : 'Download CSV'}
            </button>
          </div>

          <button
            onClick={onTriggerXLSX}
            disabled={copySuccess || exportSuccess || isFetchingExportData || isPreviewLoading}
            className="w-full py-2.5 px-3 border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-800 text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-2xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
            {exportSuccess ? 'Exported! ✓' : 'Export Multi-Sheet Excel (.XLSX)'}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onTriggerPDF}
              disabled={copySuccess || exportSuccess || isFetchingExportData || isPreviewLoading}
              className="py-2.5 px-3 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-2xs"
            >
              <Download className="h-4 w-4 text-emerald-600" />
              PDF Report
            </button>

            <button
              onClick={handlePrint}
              className="py-2.5 px-3 border border-slate-200 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs"
            >
              <Printer className="h-4 w-4 text-slate-300" />
              Print Report
            </button>
          </div>

          {/* System User Manual PDF Download */}
          <button
            onClick={onTriggerUserManual}
            disabled={isManualGenerating}
            className="w-full py-2.5 px-3 border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-2xs mt-1"
          >
            <BookOpen className="h-4 w-4 text-purple-600" />
            {isManualGenerating ? 'Generating Manual PDF...' : '📄 Download System User Manual (PDF)'}
          </button>
        </div>
      </div>

      {/* PREVIEW COLUMN (2/3) */}
      <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden flex flex-col min-h-[550px] justify-between">
        {/* Header & KPI Summary Bar */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Live Report Preview Panel
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                Real-time sample matching active filters and scope
              </p>
            </div>

            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl uppercase tracking-wider font-mono">
              {exportReportType.toUpperCase()} MODE
            </span>
          </div>

          {/* KPI Summary Pill Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-2xs">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Records</span>
              <span className="text-lg font-extrabold text-slate-900 font-mono block mt-0.5">{previewMetrics.totalRecords}</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-2xs">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Work Hours</span>
              <span className="text-lg font-extrabold text-blue-600 font-mono block mt-0.5">{previewMetrics.totalWorkHours}h</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-2xs">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Overtime</span>
              <span className="text-lg font-extrabold text-rose-600 font-mono block mt-0.5">{previewMetrics.totalOvertimeHours}h</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-2xs">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Anomalies / Lates</span>
              <span className="text-lg font-extrabold text-amber-600 font-mono block mt-0.5">{previewMetrics.anomalyCount}</span>
            </div>
          </div>
        </div>

        {/* Live Preview Table Container */}
        <div id="pdf-report-render-target" className="p-5 flex-1 overflow-y-auto max-h-[500px] scrollbar-thin space-y-4">
          {/* Header (Exact Match to User Reference Image 1 & 4) */}
          <div className="pb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              {/* DPI Logo Mark */}
              <img src="/dpi.png" alt="DPI Logo" className="h-9 w-auto object-contain shrink-0" />
              <div>
                <h2 className="text-sm font-extrabold text-blue-700 tracking-tight leading-none">
                  {pdfCompanyName || 'DPI Attendance Systems'}
                </h2>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mt-1">
                  {reportData.title}
                </p>
              </div>
            </div>

            {/* Right Header Metadata */}
            <div className="text-[9.5px] text-right font-medium text-slate-500 space-y-0.5">
              <p>
                <span className="font-extrabold text-slate-700">Report Range:</span>{' '}
                {exportDateRange === 'today' ? new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) :
                 exportDateRange === 'yesterday' ? 'Yesterday' :
                 exportDateRange === 'week' ? 'Last 7 Days' :
                 exportDateRange === 'custom' ? `${exportStartDate || 'Start'} - ${exportEndDate || 'End'}` :
                 '22 Jul 2026 - 22 Jul 2026'}
              </p>
              <p>
                <span className="font-extrabold text-slate-700">Generated On:</span>{' '}
                {new Date().toLocaleString('en-IN')}
              </p>
              <p>
                <span className="font-extrabold text-slate-700">Page:</span> 1 of {Math.ceil(reportData.rows.length / 22) || 1}
              </p>
            </div>
          </div>

          {/* Dynamic Table for All 5 Report Types (Exact Match to Image 3) */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-blue-50/70 text-[10px] font-extrabold uppercase text-blue-750 tracking-wider border-b border-slate-200">
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
                  reportData.rows.slice(0, 15).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                      {row.map((cellVal, cIdx) => {
                        const cellStr = String(cellVal || '');
                        const isLast = cIdx === row.length - 1;

                        if (reportData.headers[cIdx] === 'DIRECTION') {
                          return (
                            <td key={cIdx} className="px-4 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase ${
                                cellStr === 'IN' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {cellStr}
                              </span>
                            </td>
                          );
                        }

                        if (reportData.headers[cIdx] === 'STATUS' || reportData.headers[cIdx] === 'EXCEPTION TYPE') {
                          return (
                            <td key={cIdx} className="px-4 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase border ${
                                cellStr.includes('Late') || cellStr.includes('Missing') || cellStr.includes('Rapid')
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : cellStr.includes('Present')
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                {cellStr}
                              </span>
                            </td>
                          );
                        }

                        if (reportData.headers[cIdx] === 'EMPLOYEE NAME' || reportData.headers[cIdx] === 'NAME' || reportData.headers[cIdx] === 'DEPARTMENT') {
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
                      No records found for the selected report type and scope.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer (Exact Match to User Reference Image 2) */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-[10px] text-slate-400 font-medium">
              {pdfComments || 'Confidential. Generated from system logs.'}
            </span>

            <div className="text-center space-y-1">
              <div className="w-40 border-b border-slate-500"></div>
              <span className="text-[11px] font-extrabold text-slate-700 block">
                Authorized Signature
              </span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[10px] font-medium text-slate-400">
          <span>{pdfComments || 'Confidential. Generated from system logs.'}</span>
          <span className="font-mono">Showing top 15 sample rows for preview</span>
        </div>
      </div>
    </div>
  );
}
