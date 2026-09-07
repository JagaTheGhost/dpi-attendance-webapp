import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { 
  Search, 
  Clock, 
  AlertCircle,
  BarChart3,
  Users,
  FileText,
  ShieldCheck,
  Settings
} from 'lucide-react';
// Extracted Utilities & Constants
import { LOGS_PER_PAGE } from '@/utils/constants';
import { parseDBDate, getDateRangeBounds } from '@/utils/dateUtils';
import { injectVirtualLogs } from '@/utils/attendanceMath';
import { exportAnalyticsToExcel, generateCustomPDFReport, generateIndividualEmployeePDF } from '@/services/exportServices';

// Extracted Components
// Custom Hooks
import { useAttendanceData } from '@/hooks/useAttendanceData';
import { useAdminOperations } from '@/hooks/useAdminOperations';
import { usePresenceDirectory } from '@/hooks/usePresenceDirectory';
import { useExportHub } from '@/hooks/useExportHub';
import { useTranslation } from '@/hooks/useTranslation';

import LoginView from '@/components/auth/LoginView';
import SplashLoader from '@/components/auth/SplashLoader';
import Header from '@/components/layout/Header';
import DesktopSidebar from '@/components/layout/DesktopSidebar';
import AttendanceLogsTable from '@/components/attendance/AttendanceLogsTable';
import Toast from '@/components/common/Toast';

// Lazy Loaded Component Modules for Code-Splitting
const AdminOperationsDashboard = lazy(() => import('@/components/admin/AdminOperationsDashboard'));
const PresenceDirectory = lazy(() => import('@/components/employees/PresenceDirectory'));
const ProfileModal = lazy(() => import('@/components/employees/ProfileModal'));
const AnalyticsDashboard = lazy(() => import('@/components/analytics/AnalyticsDashboard'));
const ExportHubModal = lazy(() => import('@/components/export/ExportHubModal'));
const SettingsDashboard = lazy(() => import('@/components/settings/SettingsDashboard'));

const ModuleLoader = () => (
  <div className="flex items-center justify-center p-12 min-h-[350px]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-sm font-medium text-slate-500">Loading module...</span>
    </div>
  </div>
);

export default function App() {
  const { t } = useTranslation();
  // Attendance Data Custom Hook
  const {
    employees,
    setEmployees,
    logs,
    setLogs,
    analyticsLogs,
    isAnalyticsLoading,
    hasHitQueryLimit,
    queryLimitMessage,
    isSupabaseMode,
    isLoadingData,
    dbError,
    isInitializing,
    isLoaderFading,
    lastRefreshedTime,
    highlightedLogId,
    loadDatabaseData,
    fetchEmployeeHistory,
    fetchAnalyticsLogs
  } = useAttendanceData();

  // Admin Operations Custom Hook
  const {
    adminLeaves, setAdminLeaves,
    adminODs, setAdminODs,
    adminHolidays, setAdminHolidays,
    manualPunches, setManualPunches,
    shiftSchedules, setShiftSchedules
  } = useAdminOperations();

  // Export Hub Custom Hook
  const {
    exportReportType, setExportReportType,
    exportDateRange, setExportDateRange,
    exportStartDate, setExportStartDate,
    exportEndDate, setExportEndDate,
    exportEmployeeFilter, setExportEmployeeFilter,
    exportSelectedEmployee, setExportSelectedEmployee,
    exportSelectedEmployeesGroup, setExportSelectedEmployeesGroup,
    exportGroupSearch, setExportGroupSearch,
    exportSingleSearch, setExportSingleSearch,
    hasInitializedGroup, setHasInitializedGroup,
    pdfThemeColor, setPdfThemeColor,
    pdfCompanyName, setPdfCompanyName,
    pdfComments, setPdfComments,
    pdfLogColumns, setPdfLogColumns,
    pdfTimesheetColumns, setPdfTimesheetColumns,
    isSingleDropdownOpen, setIsSingleDropdownOpen,
    isGroupDropdownOpen, setIsGroupDropdownOpen,
    isExportDateDropdownOpen, setIsExportDateDropdownOpen,
    copySuccess, setCopySuccess,
    exportSuccess, setExportSuccess
  } = useExportHub();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((msg, type = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts(prev => [...prev.slice(-4), { id, msg, type }]);
  }, []);

  const handleDismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Authentication & Splash states
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('dpi_authenticated') === 'true');
  const [isLoginFading, setIsLoginFading] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  
  // Navigation & Pagination state with reload persistence
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('dpi_active_tab') || 'analytics';
  });

  useEffect(() => {
    localStorage.setItem('dpi_active_tab', activeTab);
  }, [activeTab]);
  const [logsPage, setLogsPage] = useState(1);
  const [presencePage, setPresencePage] = useState(1);
  const [selectedProfileEmpId, setSelectedProfileEmpId] = useState(null);
  const [profileHistoryLogs, setProfileHistoryLogs] = useState(null);
  const [profileSort, setProfileSort] = useState('name');
  const [profileSortDir, setProfileSortDir] = useState('desc');
  const [profileFilter, setProfileFilter] = useState('All');
  const [profileViewMode, setProfileViewMode] = useState('grid');
  const [profileItemsPerPage, setProfileItemsPerPage] = useState(8);

  // Department, Leaves, and Analytics Filter States
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [analyticsDateScope, setAnalyticsDateScope] = useState('week');
  const [analyticsStartDate, setAnalyticsStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [analyticsEndDate, setAnalyticsEndDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Automatically sync custom date input fields when preset scope (week, 14days, 30days) changes
  useEffect(() => {
    if (analyticsDateScope === 'custom') return;
    const { startISO, endISO } = getDateRangeBounds(analyticsDateScope);
    setAnalyticsStartDate(startISO.slice(0, 10));
    setAnalyticsEndDate(endISO.slice(0, 10));
  }, [analyticsDateScope]);
  
  // Dropdowns UI state
  const [isProfileDeptDropdownOpen, setIsProfileDeptDropdownOpen] = useState(false);
  const [isProfileSortDropdownOpen, setIsProfileSortDropdownOpen] = useState(false);
  const [isProfileDensityDropdownOpen, setIsProfileDensityDropdownOpen] = useState(false);

  // Handle closing custom dropdowns on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.single-dropdown-container')) setIsSingleDropdownOpen(false);
      if (!e.target.closest('.group-dropdown-container')) setIsGroupDropdownOpen(false);
      if (!e.target.closest('.export-date-dropdown-container')) setIsExportDateDropdownOpen(false);
      if (!e.target.closest('.profile-dept-dropdown-container')) setIsProfileDeptDropdownOpen(false);
      if (!e.target.closest('.profile-sort-dropdown-container')) setIsProfileSortDropdownOpen(false);
      if (!e.target.closest('.profile-density-dropdown-container')) setIsProfileDensityDropdownOpen(false);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const [isPreviewLoading] = useState(false);
  const [isFetchingExportData] = useState(false);

  useEffect(() => {
    const keys = Object.keys(employees);
    if (keys.length > 0) {
      if (!exportSelectedEmployee) setExportSelectedEmployee(keys[0]);
      if (!hasInitializedGroup) {
        setExportSelectedEmployeesGroup(keys);
        setHasInitializedGroup(true);
      }
    }
  }, [employees, exportSelectedEmployee, hasInitializedGroup]);

  // Global attendance calculation clock ticker (1 minute interval)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setLogsPage(1);
    setPresencePage(1);
  }, [searchQuery, statusFilter]);

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    if (loginUsername === 'ADMIN_DPI' && loginPassword === 'fortress') {
      setLoginError(null);
      setIsAuthenticated(true);
      setIsLoginFading(true);
      localStorage.setItem('dpi_authenticated', 'true');
      setTimeout(() => setIsLoginFading(false), 300);
    } else {
      setLoginError('Invalid admin credentials. Please try again.');
    }
  };

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setLoginUsername('');
    setLoginPassword('');
    localStorage.removeItem('dpi_authenticated');
  }, []);

  const triggerManualRefresh = useCallback(() => {
    loadDatabaseData(true);
    showToast('Database synced successfully!', 'info');
  }, [loadDatabaseData, showToast]);

  // Dynamic Processed Logs with Virtual System Outs & Manual Admin Punches
  const processedLogs = useMemo(() => {
    const combinedLogs = [
      ...manualPunches.map(mp => ({
        log_id: mp.id,
        employee_id: mp.empId,
        timestamp: mp.timestamp,
        direction: mp.direction,
        isManual: true
      })),
      ...logs
    ];
    return injectVirtualLogs(combinedLogs, currentTime);
  }, [logs, manualPunches, currentTime]);

  // Workforce Presence Directory Custom Hook
  const {
    totalWorkforce,
    activeInOfficeCount,
    employeePresenceMap,
    filteredEmployeesList,
    sortedAndFilteredProfiles,
    profileSummaryStats
  } = usePresenceDirectory({
    employees,
    processedLogs,
    currentTime,
    searchQuery,
    statusFilter,
    departmentFilter,
    profileFilter,
    profileSort,
    profileSortDir,
    adminLeaves,
    adminODs
  });

  // Fetch date-scoped analytics logs from Supabase when scope or custom date bounds change
  useEffect(() => {
    fetchAnalyticsLogs(analyticsDateScope, analyticsStartDate, analyticsEndDate);
  }, [analyticsDateScope, analyticsStartDate, analyticsEndDate, fetchAnalyticsLogs]);

  // On-demand employee history query when opening profile modal
  useEffect(() => {
    if (!selectedProfileEmpId) {
      setProfileHistoryLogs(null);
      return;
    }
    let isSubscribed = true;
    fetchEmployeeHistory(selectedProfileEmpId).then(historyLogs => {
      if (isSubscribed && historyLogs && historyLogs.length > 0) {
        setProfileHistoryLogs(historyLogs);
      }
    });
    return () => { isSubscribed = false; };
  }, [selectedProfileEmpId, fetchEmployeeHistory]);

  // Analytics Computation Engine
  const analyticsData = useMemo(() => {
    const { startISO, endISO } = getDateRangeBounds(analyticsDateScope, analyticsStartDate, analyticsEndDate);
    const startDateObj = new Date(startISO);
    const endDateObj = new Date(endISO);
    
    // Filter target employees by department
    const targetEmployees = {};
    Object.entries(employees).forEach(([empId, emp]) => {
      if (departmentFilter === 'All' || emp.department === departmentFilter) {
        targetEmployees[empId] = emp;
      }
    });

    const totalDeptEmployees = Object.keys(targetEmployees).length || 1;

    // Use date-scoped analytics logs from Supabase if available
    const baseLogs = analyticsLogs.length > 0 ? analyticsLogs : processedLogs;
    const rangeLogs = baseLogs.filter(log => {
      const logDate = parseDBDate(log.timestamp);
      return logDate >= startDateObj && logDate <= endDateObj && !!targetEmployees[log.employee_id];
    });

    // Build day-by-day trend map
    const trendMap = {};
    const trendArray = [];
    const empPunctualStats = {};

    Object.keys(targetEmployees).forEach(id => {
      empPunctualStats[id] = { 
        empId: id, 
        name: targetEmployees[id].name, 
        department: targetEmployees[id].department,
        designation: targetEmployees[id].designation || 'Staff',
        arrivalMinutesSum: 0, 
        arrivalCount: 0, 
        lateCount: 0 
      };
    });

    const curr = new Date(startDateObj);
    while (curr <= endDateObj) {
      const dateStr = curr.toDateString();
      trendMap[dateStr] = { dateObj: new Date(curr), dateStr, presentSet: new Set(), logs: [] };
      curr.setDate(curr.getDate() + 1);
    }

    rangeLogs.forEach(log => {
      const d = parseDBDate(log.timestamp);
      const dateStr = d.toDateString();
      if (trendMap[dateStr]) {
        trendMap[dateStr].logs.push(log);
        if (log.direction === 'IN') {
          trendMap[dateStr].presentSet.add(log.employee_id);
        }
      }
    });

    // Initialize 7x5 Heatmap Matrix (Sun-Sat x 8AM, 9AM, 10AM, 11AM, 12PM+)
    const heatmapMatrix = Array.from({ length: 7 }, () => 
      Array.from({ length: 5 }, () => ({
        totalCount: 0,
        lateCount915: 0,
        lateCount900: 0,
        lateCount930: 0,
        records: []
      }))
    );

    // Track working hours across all days for real computation
    let totalWorkingMinutes = 0;
    let totalWorkingSessions = 0;
    let totalOvertimeMinutes = 0;

    // Compute first clock-in, arrival stats, working hours, and heatmap matrix for each day and employee
    Object.keys(trendMap).forEach(dateStr => {
      const dayData = trendMap[dateStr];
      const dayOfWeek = dayData.dateObj.getDay(); // 0 (Sun) to 6 (Sat)
      const logsByEmp = {};
      dayData.logs.forEach(l => {
        if (!logsByEmp[l.employee_id]) logsByEmp[l.employee_id] = [];
        logsByEmp[l.employee_id].push(l);
      });

      let dayWorkMinutesTotal = 0;
      let dayWorkSessions = 0;

      Object.keys(logsByEmp).forEach(empId => {
        const empLogs = logsByEmp[empId].sort((a, b) => parseDBDate(a.timestamp) - parseDBDate(b.timestamp));
        const firstIn = empLogs.find(l => l.direction === 'IN');
        if (firstIn && targetEmployees[empId]) {
          const inTime = parseDBDate(firstIn.timestamp);
          const hrs = inTime.getHours();
          const mins = inTime.getMinutes();
          const totalMins = hrs * 60 + mins;

          // Determine hour slot index: 0: 8AM, 1: 9AM, 2: 10AM, 3: 11AM, 4: 12PM+
          let slotIndex = 0;
          if (hrs === 9) slotIndex = 1;
          else if (hrs === 10) slotIndex = 2;
          else if (hrs === 11) slotIndex = 3;
          else if (hrs >= 12) slotIndex = 4;

          const timeStr = inTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
          const isLate915 = totalMins > (9 * 60 + 15);
          const isLate900 = totalMins > (9 * 60);
          const isLate930 = totalMins > (9 * 60 + 30);

          const record = {
            empId,
            name: targetEmployees[empId].name,
            department: targetEmployees[empId].department,
            designation: targetEmployees[empId].designation || 'Staff',
            dateStr: dayData.dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            timeStr,
            isLate915,
            isLate900,
            isLate930
          };

          const slot = heatmapMatrix[dayOfWeek][slotIndex];
          slot.totalCount++;
          if (isLate915) slot.lateCount915++;
          if (isLate900) slot.lateCount900++;
          if (isLate930) slot.lateCount930++;
          slot.records.push(record);

          if (empPunctualStats[empId]) {
            empPunctualStats[empId].arrivalMinutesSum += totalMins;
            empPunctualStats[empId].arrivalCount++;
            if (isLate915) {
              empPunctualStats[empId].lateCount++;
            }
          }
        }

        // Compute working hours from IN/OUT pairs
        const inLogs = empLogs.filter(l => l.direction === 'IN');
        const outLogs = empLogs.filter(l => l.direction === 'OUT');
        if (inLogs.length > 0 && outLogs.length > 0) {
          const firstInTime = parseDBDate(inLogs[0].timestamp);
          const lastOutTime = parseDBDate(outLogs[outLogs.length - 1].timestamp);
          const sessionMins = (lastOutTime - firstInTime) / (1000 * 60);
          if (sessionMins > 0 && sessionMins < 24 * 60) { // sanity: < 24h
            dayWorkMinutesTotal += sessionMins;
            dayWorkSessions++;
            totalWorkingMinutes += sessionMins;
            totalWorkingSessions++;
            if (sessionMins > 9 * 60) { // > 9 hours = overtime
              totalOvertimeMinutes += (sessionMins - 9 * 60);
            }
          }
        }
      });

      const presentCount = dayData.presentSet.size;
      const rate = Math.min(100, Math.round((presentCount / totalDeptEmployees) * 100));
      const dayAvgHours = dayWorkSessions > 0 ? dayWorkMinutesTotal / dayWorkSessions / 60 : 0;
      trendArray.push({
        dateStr: dayData.dateObj.toISOString(),
        dateLabel: dayData.dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        rate: rate > 0 ? rate : 0,
        presentCount,
        avgHours: Math.round(dayAvgHours * 10) / 10
      });
    });

    // Biometric Log Exception Detection
    const exceptions = {
      missingOut: [],
      missingIn: [],
      duplicateLogs: [],
      noAttendance: []
    };

    const attendedEmpIds = new Set();

    Object.keys(trendMap).forEach(dateStr => {
      const dayData = trendMap[dateStr];
      const logsByEmp = {};
      dayData.logs.forEach(l => {
        if (!logsByEmp[l.employee_id]) logsByEmp[l.employee_id] = [];
        logsByEmp[l.employee_id].push(l);
        attendedEmpIds.add(l.employee_id);
      });

      Object.keys(logsByEmp).forEach(empId => {
        const empLogs = logsByEmp[empId].sort((a, b) => parseDBDate(a.timestamp) - parseDBDate(b.timestamp));
        const empInfo = targetEmployees[empId];
        if (!empInfo) return;

        const hasIn = empLogs.some(l => l.direction === 'IN');
        const hasOut = empLogs.some(l => l.direction === 'OUT');
        const firstLog = empLogs[0];

        // 1. Missing OUT (Has IN but no OUT)
        if (hasIn && !hasOut) {
          const inTime = parseDBDate(firstLog.timestamp);
          exceptions.missingOut.push({
            empId,
            name: empInfo.name,
            department: empInfo.department,
            designation: empInfo.designation || 'Staff',
            dateStr: dayData.dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            inTimeStr: inTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
            type: 'Missing OUT'
          });
        }

        // 2. Missing IN (First log is OUT without prior IN)
        if (hasOut && (!hasIn || firstLog.direction === 'OUT')) {
          const outTime = parseDBDate(firstLog.timestamp);
          exceptions.missingIn.push({
            empId,
            name: empInfo.name,
            department: empInfo.department,
            designation: empInfo.designation || 'Staff',
            dateStr: dayData.dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            outTimeStr: outTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
            type: 'Missing IN'
          });
        }

        // 3. Duplicate / Rapid Logs (< 2 mins gap)
        for (let i = 1; i < empLogs.length; i++) {
          const prevTime = parseDBDate(empLogs[i-1].timestamp);
          const currTime = parseDBDate(empLogs[i].timestamp);
          const diffMs = currTime - prevTime;
          if (diffMs > 0 && diffMs <= 2 * 60 * 1000) {
            exceptions.duplicateLogs.push({
              empId,
              name: empInfo.name,
              department: empInfo.department,
              designation: empInfo.designation || 'Staff',
              dateStr: dayData.dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
              timeStr: currTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
              direction: empLogs[i].direction,
              gapSecs: Math.round(diffMs / 1000),
              type: 'Rapid Swipe'
            });
          }
        }
      });
    });

    // 4. No Attendance Record
    Object.keys(targetEmployees).forEach(empId => {
      if (!attendedEmpIds.has(empId)) {
        const empInfo = targetEmployees[empId];
        exceptions.noAttendance.push({
          empId,
          name: empInfo.name,
          department: empInfo.department,
          designation: empInfo.designation || 'Staff',
          status: empInfo.status || 'Active',
          type: 'No Attendance Record'
        });
      }
    });

    // Punctuality & Late Leaderboards
    const punctualList = [];
    const lateList = [];

    Object.values(empPunctualStats).forEach(st => {
      if (st.arrivalCount > 0) {
        const avgMins = Math.round(st.arrivalMinutesSum / st.arrivalCount);
        const hrs = Math.floor(avgMins / 60);
        const mins = avgMins % 60;
        const period = hrs >= 12 ? 'PM' : 'AM';
        const displayHrs = hrs % 12 || 12;
        const valStr = `${String(displayHrs).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}`;
        
        punctualList.push({ empId: st.empId, name: st.name, department: st.department, designation: st.designation, avgMins, valStr, lateCount: st.lateCount });
        if (st.lateCount > 0) {
          lateList.push({ empId: st.empId, name: st.name, department: st.department, designation: st.designation, lateCount: st.lateCount, valStr });
        }
      }
    });

    punctualList.sort((a, b) => a.avgMins - b.avgMins);
    lateList.sort((a, b) => b.lateCount - a.lateCount);

    const totalPresentToday = activeInOfficeCount;
    const avgAttendanceRate = trendArray.length > 0 
      ? Math.round(trendArray.reduce((acc, t) => acc + t.rate, 0) / trendArray.length) 
      : 0;

    const totalLates = lateList.reduce((acc, l) => acc + l.lateCount, 0);

    // Compute real averages
    const realAvgWorkingHours = totalWorkingSessions > 0 ? totalWorkingMinutes / totalWorkingSessions / 60 : 0;
    const realOvertimeHours = totalOvertimeMinutes / 60;
    // Compute department-level comparative telemetry
    const deptStats = {};
    ['PF', 'NON PF', 'NI Group1', 'NI Group2'].forEach(dName => {
      deptStats[dName] = {
        name: dName,
        totalWorkers: 0,
        presentSet: new Set(),
        lateCount: 0
      };
    });

    Object.values(employees).forEach(emp => {
      if (deptStats[emp.department]) {
        deptStats[emp.department].totalWorkers++;
      }
    });

    rangeLogs.forEach(log => {
      const emp = employees[log.employee_id];
      if (emp && deptStats[emp.department]) {
        if (log.direction === 'IN') {
          deptStats[emp.department].presentSet.add(log.employee_id);
          const inTime = parseDBDate(log.timestamp);
          const totalMins = inTime.getHours() * 60 + inTime.getMinutes();
          if (totalMins > (9 * 60 + 15)) {
            deptStats[emp.department].lateCount++;
          }
        }
      }
    });

    const departmentComparison = Object.keys(deptStats).map(dName => {
      const d = deptStats[dName];
      const rate = d.totalWorkers > 0 ? Math.round((d.presentSet.size / d.totalWorkers) * 100) : 0;
      return {
        department: dName,
        totalWorkers: d.totalWorkers,
        presentCount: d.presentSet.size,
        attendanceRate: rate,
        lateCount: d.lateCount
      };
    });

    return {
      summary: {
        totalEmployees: totalDeptEmployees,
        attendanceRate: avgAttendanceRate,
        presentToday: totalPresentToday,
        leaveCount: Math.max(0, totalDeptEmployees - totalPresentToday),
        averageWorkingHours: Math.round(realAvgWorkingHours * 10) / 10,
        averageArrivalStr: punctualList.length > 0 ? punctualList[0].valStr : '09:00 AM',
        lateArrivals: totalLates,
        totalOvertimeHours: Math.round(realOvertimeHours * 10) / 10
      },
      attendanceTrend: trendArray.length > 0 ? trendArray : [{ dateStr: new Date().toISOString(), dateLabel: 'Today', rate: 0, presentCount: 0, avgHours: 0 }],
      heatmapMatrix,
      departmentComparison,
      leaderboard: {
        mostPunctual: punctualList.slice(0, 5),
        frequentlyLate: lateList.slice(0, 5)
      },
      exceptions
    };
  }, [analyticsDateScope, analyticsStartDate, analyticsEndDate, employees, departmentFilter, processedLogs, analyticsLogs, activeInOfficeCount]);

  // Logs Filtering & Pagination (Strict Current-Day Filtering for Live Punch Logs View)
  const logsFilteredBySearch = useMemo(() => {
    const todayStr = currentTime.toDateString();
    return processedLogs.filter(log => {
      if (!log || !log.timestamp || !log.employee_id) return false;
      const emp = employees[log.employee_id];
      if (!emp) return false;

      // Security & Isolation: Enforce current-day filtering for the punch logs table
      const logDate = parseDBDate(log.timestamp);
      if (isNaN(logDate.getTime()) || logDate.toDateString() !== todayStr) {
        return false;
      }

      const matchesDept = departmentFilter === 'All' || emp.department === departmentFilter;
      const matchesSearch = searchQuery.trim() === '' || 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.employee_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || log.direction === statusFilter;
      return matchesDept && matchesSearch && matchesStatus;
    });
  }, [processedLogs, employees, searchQuery, statusFilter, departmentFilter, currentTime]);

  const totalLogsPages = Math.ceil(logsFilteredBySearch.length / LOGS_PER_PAGE) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (logsPage - 1) * LOGS_PER_PAGE;
    return logsFilteredBySearch.slice(start, start + LOGS_PER_PAGE);
  }, [logsFilteredBySearch, logsPage]);

  const totalPresencePages = profileItemsPerPage === 'All' ? 1 : Math.ceil(sortedAndFilteredProfiles.length / profileItemsPerPage) || 1;
  const paginatedEmployees = useMemo(() => {
    if (profileItemsPerPage === 'All') return sortedAndFilteredProfiles;
    const start = (presencePage - 1) * profileItemsPerPage;
    return sortedAndFilteredProfiles.slice(start, start + profileItemsPerPage);
  }, [sortedAndFilteredProfiles, presencePage, profileItemsPerPage]);

  // Selected Employee Detailed Analytics for Modal Drawer (Uses On-Demand Fetched History)
  const selectedEmployeeAnalytics = useMemo(() => {
    if (!selectedProfileEmpId) return null;
    const sourceLogs = profileHistoryLogs || processedLogs;
    const empLogs = sourceLogs.filter(log => log.employee_id === selectedProfileEmpId);
    const sorted = [...empLogs].sort((a, b) => parseDBDate(a.timestamp) - parseDBDate(b.timestamp));

    const logsByDay = {};
    sorted.forEach(log => {
      const dateStr = parseDBDate(log.timestamp).toDateString();
      if (!logsByDay[dateStr]) logsByDay[dateStr] = [];
      logsByDay[dateStr].push(log);
    });

    const daySummaries = [];
    let totalWorkMs = 0;
    let totalBreakMs = 0;
    let daysPresentCount = Object.keys(logsByDay).length;
    let onTimeDaysCount = 0;
    let goalMetDaysCount = 0;

    Object.keys(logsByDay).forEach(dateStr => {
      const dayLogs = logsByDay[dateStr];
      let dayWorkMs = 0;
      let dayBreakMs = 0;
      let firstInTime = null;
      let lastPunchTime = null;
      let lastInTime = null;

      dayLogs.forEach(log => {
        const time = parseDBDate(log.timestamp);
        if (log.direction === 'IN') {
          lastInTime = time;
          if (!firstInTime) firstInTime = time;
        } else if ((log.direction === 'OUT' || log.direction === 'SYS_OUT') && lastInTime) {
          dayWorkMs += (time - lastInTime);
          lastInTime = null;
        }
        lastPunchTime = time;
      });

      if (lastInTime) {
        const isTodayStr = dateStr === new Date().toDateString();
        const endTime = isTodayStr ? new Date() : new Date(new Date(dateStr).setHours(23, 59, 59, 999));
        dayWorkMs += (endTime - lastInTime);
        lastPunchTime = endTime;
      }

      if (firstInTime && lastPunchTime) {
        const totalSpan = lastPunchTime - firstInTime;
        dayBreakMs = Math.max(0, totalSpan - dayWorkMs);
      }

      let isOnTime = false;
      if (firstInTime) {
        const arrivalMinutes = firstInTime.getHours() * 60 + firstInTime.getMinutes();
        if (arrivalMinutes <= 9 * 60 + 15) {
          isOnTime = true;
          onTimeDaysCount++;
        }
      }

      const hoursWorked = dayWorkMs / 1000 / 60 / 60;
      const isGoalMet = hoursWorked >= 7;
      if (isGoalMet) goalMetDaysCount++;

      totalWorkMs += dayWorkMs;
      totalBreakMs += dayBreakMs;

      daySummaries.push({
        dateStr,
        firstIn: firstInTime ? firstInTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—',
        lastOut: lastInTime && dateStr === new Date().toDateString() ? 'Active IN' : (lastPunchTime ? lastPunchTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'),
        hoursWorked,
        breakHours: dayBreakMs / 1000 / 60 / 60,
        isOnTime,
        isGoalMet,
        punchesCount: dayLogs.length
      });
    });

    daySummaries.sort((a, b) => new Date(b.dateStr) - new Date(a.dateStr));

    return {
      daysPresentCount,
      avgWorkHours: daysPresentCount > 0 ? (totalWorkMs / 1000 / 60 / 60) / daysPresentCount : 0,
      avgBreakHours: daysPresentCount > 0 ? (totalBreakMs / 1000 / 60 / 60) / daysPresentCount : 0,
      goalComplianceRate: daysPresentCount > 0 ? (goalMetDaysCount / daysPresentCount) * 100 : 0,
      punctualityRate: daysPresentCount > 0 ? (onTimeDaysCount / daysPresentCount) * 100 : 0,
      daySummaries
    };
  }, [selectedProfileEmpId, processedLogs, profileHistoryLogs]);

  const heatmapDays = useMemo(() => {
    if (!selectedEmployeeAnalytics) return [];
    const days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const targetDateStr = d.toDateString();
      const summary = selectedEmployeeAnalytics.daySummaries.find(day => day.dateStr === targetDateStr);
      days.push({ date: d, summary });
    }
    return days;
  }, [selectedEmployeeAnalytics]);

  const getTimelineSegments = (punchesToday, currentTime) => {
    if (!punchesToday || punchesToday.length === 0) return [];
    const sortedPunches = [...punchesToday].sort((a, b) => parseDBDate(a.timestamp) - parseDBDate(b.timestamp));
    const firstPunchTime = parseDBDate(sortedPunches[0].timestamp);
    const lastPunch = sortedPunches[sortedPunches.length - 1];
    const lastPunchTime = lastPunch.direction === 'IN' ? currentTime : parseDBDate(lastPunch.timestamp);

    const defaultStart = new Date(currentTime); defaultStart.setHours(8, 0, 0, 0);
    const defaultEnd = new Date(currentTime); defaultEnd.setHours(20, 0, 0, 0);

    const start = firstPunchTime < defaultStart ? firstPunchTime : defaultStart;
    const end = lastPunchTime > defaultEnd ? lastPunchTime : defaultEnd;
    const totalDuration = end - start;

    if (totalDuration <= 0) return [];
    const segments = [];
    
    const addSegment = (segStart, segEnd, type) => {
      const duration = segEnd - segStart;
      if (duration <= 0) return;
      segments.push({
        type,
        width: (duration / totalDuration) * 100,
        start: segStart,
        end: segEnd
      });
    };

    let cursor = start;
    let activeInTime = null;

    sortedPunches.forEach((punch) => {
      const punchTime = parseDBDate(punch.timestamp);
      if (punchTime < cursor) return;

      if (punch.direction === 'IN') {
        if (activeInTime === null) {
          addSegment(cursor, punchTime, cursor <= firstPunchTime ? 'away' : 'break');
          activeInTime = punchTime;
        }
        cursor = punchTime;
      } else {
        if (activeInTime !== null) {
          addSegment(activeInTime, punchTime, 'active');
          activeInTime = null;
        } else {
          addSegment(cursor, punchTime, 'away');
        }
        cursor = punchTime;
      }
    });

    if (activeInTime !== null) {
      addSegment(activeInTime, currentTime, 'active');
      if (currentTime < end) addSegment(currentTime, end, 'away');
    } else {
      if (cursor < end) addSegment(cursor, end, 'away');
    }

    return segments;
  };

  // Export handlers using dynamic import services
  const handleExportXLSX = async (passedReportData) => {
    try {
      const headers = passedReportData?.headers || ['LOG ID', 'EMPLOYEE ID', 'EMPLOYEE NAME', 'DIRECTION', 'DATE', 'TIME'];
      const rows = passedReportData?.rows || [];

      const summaryData = [
        ['Report Type', passedReportData?.title || exportReportType],
        ['Generated Date', new Date().toLocaleString('en-IN')],
        ['Department Scope', departmentFilter],
        ['Total Employees', totalWorkforce],
        ['Active In Office', activeInOfficeCount]
      ];
      const metricsData = [headers, ...rows];
      const logsData = [
        ['Log ID', 'Employee ID', 'Name', 'Direction', 'Timestamp'],
        ...processedLogs.map(l => [l.log_id, l.employee_id, employees[l.employee_id]?.name || 'N/A', l.direction, l.timestamp])
      ];

      await exportAnalyticsToExcel({ summaryData, metricsData, logsData, filename: `${exportReportType}_export.xlsx` });
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    } catch (e) {
      console.error("Excel export error:", e);
    }
  };

  const handleDownloadPDFReport = async (passedReportData) => {
    setIsGeneratingPDF(true);
    try {
      const headers = passedReportData?.headers || ['LOG ID', 'EMPLOYEE ID', 'EMPLOYEE NAME', 'DIRECTION', 'DATE', 'TIME'];
      const rows = passedReportData?.rows || [];
      const title = passedReportData?.title || 'DETAILED BIOMETRIC PUNCH LOGS';

      let rangeStr = '22 Jul 2026 - 22 Jul 2026';
      if (exportDateRange === 'today') rangeStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      else if (exportDateRange === 'yesterday') rangeStr = 'Yesterday';
      else if (exportDateRange === 'week') rangeStr = 'Last 7 Days';
      else if (exportDateRange === 'custom') rangeStr = `${exportStartDate || 'Start'} to ${exportEndDate || 'End'}`;

      await generateCustomPDFReport({
        reportTitle: title,
        companyName: pdfCompanyName || 'DPI Attendance Systems',
        dateRangeStr: rangeStr,
        generatedOnStr: new Date().toLocaleString('en-IN'),
        footerComments: pdfComments || 'Confidential. Generated from system logs.',
        themeColor: pdfThemeColor || 'blue',
        headers,
        rows,
        filename: `${(pdfCompanyName || 'DPI_Attendance').replace(/\s+/g, '_')}_${exportReportType}_report.pdf`
      });

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadIndividualPDF = async () => {
    if (!selectedProfileEmpId || !selectedEmployeeAnalytics) return;
    const emp = employees[selectedProfileEmpId] || { name: 'Employee', id: selectedProfileEmpId, department: 'N/A' };
    
    try {
      await generateIndividualEmployeePDF({
        employee: { ...emp, id: selectedProfileEmpId },
        analytics: selectedEmployeeAnalytics,
        companyName: pdfCompanyName || 'DPI Attendance Systems',
        generatedOnStr: new Date().toLocaleString('en-IN'),
        filename: `${emp.name.replace(/\s+/g, '_')}_dossier.pdf`
      });
    } catch (err) {
      console.error("Individual PDF export error:", err);
    }
  };

  const handleClipboardExport = (passedReportData) => {
    const headers = passedReportData?.headers || ['LOG ID', 'EMPLOYEE ID', 'EMPLOYEE NAME', 'DIRECTION', 'DATE', 'TIME'];
    const rows = passedReportData?.rows || [];
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    navigator.clipboard.writeText(csvContent);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDownloadExport = (passedReportData) => {
    const headers = passedReportData?.headers || ['LOG ID', 'EMPLOYEE ID', 'EMPLOYEE NAME', 'DIRECTION', 'DATE', 'TIME'];
    const rows = passedReportData?.rows || [];
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${exportReportType}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2000);
  };

  const showLoader = isInitializing || isLoaderFading;
  const showLogin = !isAuthenticated || isLoginFading;

  return (
    <div className="relative min-h-screen bg-slate-50 font-sans antialiased text-slate-800 flex flex-col overflow-x-hidden pb-[72px] sm:pb-0">
      {/* Main Dashboard UI */}
      {isAuthenticated && (
        <div className={`flex-1 flex flex-col animate-fadeIn transition-all duration-300 ${isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'}`}>
          {/* Desktop Left Sidebar Navigation */}
          <DesktopSidebar
            isSupabaseMode={isSupabaseMode}
            currentTime={currentTime}
            triggerManualRefresh={triggerManualRefresh}
            isLoadingData={isLoadingData}
            handleLogout={handleLogout}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
          />

          {/* Mobile/Tablet Top Header */}
          <Header
            isSupabaseMode={isSupabaseMode}
            currentTime={currentTime}
            triggerManualRefresh={triggerManualRefresh}
            isLoadingData={isLoadingData}
            handleLogout={handleLogout}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          {/* Main Content Area */}
          <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 pb-24 lg:pb-6 flex flex-col gap-6">
            {dbError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between text-rose-800 shadow-sm animate-flashRow">
                <div className="flex items-center space-x-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                  <span className="text-xs font-medium">Supabase Sync Error: {dbError}. Using fallback data.</span>
                </div>
                <button onClick={() => setDbError(null)} className="text-rose-500 hover:text-rose-700 text-xs font-bold px-2 cursor-pointer">
                  Dismiss
                </button>
              </div>
            )}

            {/* Mobile Page Title + Search (shown instead of tabs, since nav is at bottom) */}
            <div className="sm:hidden">
              {/* Mobile Title Bar */}
              <div className="flex items-center justify-between mb-0">
                <div className="flex items-center gap-2">
                  {(() => {
                    const tabs = [
                      { id: 'logs', label: 'Live Punch Logs', icon: Clock },
                      { id: 'presence', label: 'Employee Directory', icon: Users },
                      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                      { id: 'admin', label: 'Admin Operations', icon: ShieldCheck },
                      { id: 'export', label: 'Reports & Export', icon: FileText }
                    ];
                    const current = tabs.find(t => t.id === activeTab);
                    const Icon = current?.icon;
                    return (
                      <>
                        {Icon && <Icon className="h-4.5 w-4.5 text-blue-600" />}
                        <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">{current?.label}</h2>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Mobile Search */}
              {activeTab !== 'export' && activeTab !== 'analytics' && activeTab !== 'admin' && (
                <div className="mt-3 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search employee or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-2xl text-sm bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium shadow-2xs"
                  />
                </div>
              )}
            </div>

            {/* Active Workspace Rendering */}
            <Suspense fallback={<ModuleLoader />}>
              {activeTab === 'analytics' ? (
                <AnalyticsDashboard
                  analyticsData={analyticsData}
                  departmentFilter={departmentFilter}
                  setDepartmentFilter={setDepartmentFilter}
                  analyticsDateScope={analyticsDateScope}
                  setAnalyticsDateScope={setAnalyticsDateScope}
                  analyticsStartDate={analyticsStartDate}
                  setAnalyticsStartDate={setAnalyticsStartDate}
                  analyticsEndDate={analyticsEndDate}
                  setAnalyticsEndDate={setAnalyticsEndDate}
                  onSelectEmployee={(empId) => setSelectedProfileEmpId(empId)}
                  hasHitQueryLimit={hasHitQueryLimit}
                  queryLimitMessage={queryLimitMessage}
                  employees={employees}
                  processedLogs={processedLogs}
                />
              ) : activeTab === 'admin' ? (
                <AdminOperationsDashboard
                  employees={employees}
                  processedLogs={processedLogs}
                  adminLeaves={adminLeaves}
                  setAdminLeaves={setAdminLeaves}
                  adminODs={adminODs}
                  setAdminODs={setAdminODs}
                  adminHolidays={adminHolidays}
                  setAdminHolidays={setAdminHolidays}
                  manualPunches={manualPunches}
                  setManualPunches={setManualPunches}
                  shiftSchedules={shiftSchedules}
                  setShiftSchedules={setShiftSchedules}
                  onSelectEmployee={(empId) => setSelectedProfileEmpId(empId)}
                />
              ) : activeTab === 'export' ? (
                <ExportHubModal
                  exportReportType={exportReportType}
                  setExportReportType={setExportReportType}
                  exportDateRange={exportDateRange}
                  setExportDateRange={setExportDateRange}
                  isExportDateDropdownOpen={isExportDateDropdownOpen}
                  setIsExportDateDropdownOpen={setIsExportDateDropdownOpen}
                  exportStartDate={exportStartDate}
                  setExportStartDate={setExportStartDate}
                  exportEndDate={exportEndDate}
                  setExportEndDate={setExportEndDate}
                  exportEmployeeFilter={exportEmployeeFilter}
                  setExportEmployeeFilter={setExportEmployeeFilter}
                  totalWorkforce={totalWorkforce}
                  exportSelectedEmployee={exportSelectedEmployee}
                  setExportSelectedEmployee={setExportSelectedEmployee}
                  isSingleDropdownOpen={isSingleDropdownOpen}
                  setIsSingleDropdownOpen={setIsSingleDropdownOpen}
                  exportSingleSearch={exportSingleSearch}
                  setExportSingleSearch={setExportSingleSearch}
                  exportSelectedEmployeesGroup={exportSelectedEmployeesGroup}
                  setExportSelectedEmployeesGroup={setExportSelectedEmployeesGroup}
                  isGroupDropdownOpen={isGroupDropdownOpen}
                  setIsGroupDropdownOpen={setIsGroupDropdownOpen}
                  exportGroupSearch={exportGroupSearch}
                  setExportGroupSearch={setExportGroupSearch}
                  employees={employees}
                  pdfThemeColor={pdfThemeColor}
                  setPdfThemeColor={setPdfThemeColor}
                  pdfCompanyName={pdfCompanyName}
                  setPdfCompanyName={setPdfCompanyName}
                  pdfComments={pdfComments}
                  setPdfComments={setPdfComments}
                  pdfLogColumns={pdfLogColumns}
                  setPdfLogColumns={setPdfLogColumns}
                  pdfTimesheetColumns={pdfTimesheetColumns}
                  setPdfTimesheetColumns={setPdfTimesheetColumns}
                  copySuccess={copySuccess}
                  exportSuccess={exportSuccess}
                  isFetchingExportData={isFetchingExportData}
                  isPreviewLoading={isPreviewLoading}
                  handleClipboardExport={handleClipboardExport}
                  handleDownloadExport={handleDownloadExport}
                  handleExportXLSX={handleExportXLSX}
                  handleDownloadPDFReport={handleDownloadPDFReport}
                  processedLogs={processedLogs}
                  departmentFilter={departmentFilter}
                  setDepartmentFilter={setDepartmentFilter}
                />
              ) : activeTab === 'presence' ? (
                <PresenceDirectory
                  profileSummaryStats={profileSummaryStats}
                  sortedAndFilteredProfiles={sortedAndFilteredProfiles}
                  filteredEmployeesList={filteredEmployeesList}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  departmentFilter={departmentFilter}
                  setDepartmentFilter={setDepartmentFilter}
                  isProfileDeptDropdownOpen={isProfileDeptDropdownOpen}
                  setIsProfileDeptDropdownOpen={setIsProfileDeptDropdownOpen}
                  profileFilter={profileFilter}
                  setProfileFilter={setProfileFilter}
                  profileSort={profileSort}
                  setProfileSort={setProfileSort}
                  profileSortDir={profileSortDir}
                  setProfileSortDir={setProfileSortDir}
                  isProfileSortDropdownOpen={isProfileSortDropdownOpen}
                  setIsProfileSortDropdownOpen={setIsProfileSortDropdownOpen}
                  profileItemsPerPage={profileItemsPerPage}
                  setProfileItemsPerPage={setProfileItemsPerPage}
                  isProfileDensityDropdownOpen={isProfileDensityDropdownOpen}
                  setIsProfileDensityDropdownOpen={setIsProfileDensityDropdownOpen}
                  profileViewMode={profileViewMode}
                  setProfileViewMode={setProfileViewMode}
                  presencePage={presencePage}
                  setPresencePage={setPresencePage}
                  totalPresencePages={totalPresencePages}
                  paginatedEmployees={paginatedEmployees}
                  employeePresenceMap={employeePresenceMap}
                  currentTime={currentTime}
                  setSelectedProfileEmpId={setSelectedProfileEmpId}
                  handleDownloadIndividualPDF={handleDownloadIndividualPDF}
                  getTimelineSegments={getTimelineSegments}
                />
              ) : activeTab === 'settings' ? (
                <SettingsDashboard
                  isSupabaseMode={isSupabaseMode}
                  triggerManualRefresh={triggerManualRefresh}
                  isLoadingData={isLoadingData}
                  dbError={dbError}
                  lastRefreshedTime={lastRefreshedTime}
                  processedLogsCount={processedLogs.length}
                  employeesCount={totalWorkforce}
                  pdfCompanyName={pdfCompanyName}
                  setPdfCompanyName={setPdfCompanyName}
                  pdfThemeColor={pdfThemeColor}
                  setPdfThemeColor={setPdfThemeColor}
                  handleLogout={handleLogout}
                  showToast={showToast}
                />
              ) : (
                /* Full Width Live Punch Logs Layout */
                <div className="w-full">
                  <AttendanceLogsTable
                    paginatedLogs={paginatedLogs}
                    employees={employees}
                    highlightedLogId={highlightedLogId}
                    logsPage={logsPage}
                    totalLogsPages={totalLogsPages}
                    setLogsPage={setLogsPage}
                    logsFilteredBySearch={logsFilteredBySearch}
                    setSelectedProfileEmpId={setSelectedProfileEmpId}
                    handleDownloadIndividualPDF={handleDownloadIndividualPDF}
                    handleDownloadExport={handleDownloadExport}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    departmentFilter={departmentFilter}
                    setDepartmentFilter={setDepartmentFilter}
                    activeInOfficeCount={activeInOfficeCount}
                    totalWorkforce={totalWorkforce}
                    currentTime={currentTime}
                  />
                </div>
              )}
            </Suspense>
          </main>

          {/* Mobile & Tablet Sticky Bottom Navigation Bar (< 1024px) */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
            <div className="flex items-stretch h-[72px] px-2">
              {[
                { id: 'logs', label: t('logs'), icon: Clock },
                { id: 'presence', label: t('directory'), icon: Users },
                { id: 'analytics', label: t('analytics'), icon: BarChart3 },
                { id: 'admin', label: t('admin'), icon: ShieldCheck },
                { id: 'export', label: t('reports'), icon: FileText },
                { id: 'settings', label: t('settings'), icon: Settings }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl mx-0.5 my-2 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`h-5 w-5 shrink-0 transition-all ${isActive ? 'scale-110' : ''}`} />
                    <span className={`text-[10px] font-bold tracking-tight leading-none ${isActive ? 'text-white' : 'text-slate-500'}`}>
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <footer className="bg-white border-t border-slate-200 py-5 text-center text-xs text-slate-400 mt-12">
            <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p>© {new Date().getFullYear()} DPI Biometric Attendance Radar. Realtime database integration.</p>
              <div className="flex items-center space-x-2 text-slate-500 font-medium">
                <span className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-ping"></span>
                <span>Realtime Listener Active</span>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* Extracted Modal & Authentication Overlays */}
      <Suspense fallback={null}>
        <ProfileModal
          selectedProfileEmpId={selectedProfileEmpId}
          setSelectedProfileEmpId={setSelectedProfileEmpId}
          selectedEmployeeAnalytics={selectedEmployeeAnalytics}
          employees={employees}
          employeePresenceMap={employeePresenceMap}
          handleDownloadIndividualPDF={handleDownloadIndividualPDF}
          heatmapDays={heatmapDays}
          adminLeaves={adminLeaves}
          adminODs={adminODs}
        />
      </Suspense>

      <LoginView
        showLogin={showLogin}
        isLoginFading={isLoginFading}
        loginUsername={loginUsername}
        setLoginUsername={setLoginUsername}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        loginError={loginError}
        handleLogin={handleLogin}
      />

      <SplashLoader
        showLoader={showLoader}
        isLoaderFading={isLoaderFading}
      />

      {/* Global Toast Stacking Queue Notification System */}
      <Toast toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
