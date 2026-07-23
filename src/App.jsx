import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  AlertCircle,
  UserX,
  Fingerprint,
  Download,
  Check,
  ChevronDown,
  AlertTriangle,
  BarChart3,
  Users,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { supabase } from './supabaseClient';

// Extracted Utilities & Constants
import { STATIC_EMPLOYEES, INITIAL_LOGS, LOGS_PER_PAGE, EMPLOYEES_PER_PAGE } from '@/utils/constants';
import { parseDBDate, getDateRangeBounds } from '@/utils/dateUtils';
import { chunkArray, injectVirtualLogs } from '@/utils/attendanceMath';
import { exportAnalyticsToExcel, renderElementToPDF, generateCustomPDFReport, generateIndividualEmployeePDF } from '@/services/exportServices';

// Extracted Components
import LoginView from '@/components/auth/LoginView';
import SplashLoader from '@/components/auth/SplashLoader';
import Header from '@/components/layout/Header';
import AdminOperationsDashboard from '@/components/admin/AdminOperationsDashboard';
import LiveRadarFeed from '@/components/attendance/LiveRadarFeed';
import AttendanceLogsTable from '@/components/attendance/AttendanceLogsTable';
import PresenceDirectory from '@/components/employees/PresenceDirectory';
import ProfileModal from '@/components/employees/ProfileModal';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import ExportHubModal from '@/components/export/ExportHubModal';

export default function App() {
  // State & Settings
  const [employees, setEmployees] = useState(STATIC_EMPLOYEES);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateScope, setDateScope] = useState('today');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Connection & loading states
  const [isSupabaseMode, setIsSupabaseMode] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dbError, setDbError] = useState(null);

  // Authentication & Splash states
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('dpi_authenticated') === 'true');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoaderFading, setIsLoaderFading] = useState(false);
  const [isLoginFading, setIsLoginFading] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  
  // Navigation & Pagination state
  const [activeTab, setActiveTab] = useState('logs');
  const [activeChartTab, setActiveChartTab] = useState('hourly');
  const [logsPage, setLogsPage] = useState(1);
  const [presencePage, setPresencePage] = useState(1);
  const [selectedProfileEmpId, setSelectedProfileEmpId] = useState(null);
  const [profileSort, setProfileSort] = useState('name');
  const [profileFilter, setProfileFilter] = useState('All');
  const [profileViewMode, setProfileViewMode] = useState('grid');
  const [profileItemsPerPage, setProfileItemsPerPage] = useState(8);

  // Advanced Export Hub State
  const [exportReportType, setExportReportType] = useState('logs');
  const [exportDateRange, setExportDateRange] = useState('today');
  const [exportStartDate, setExportStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().slice(0, 10));
  
  const [exportEmployeeFilter, setExportEmployeeFilter] = useState('all');
  const [exportSelectedEmployee, setExportSelectedEmployee] = useState('');
  const [exportSelectedEmployeesGroup, setExportSelectedEmployeesGroup] = useState([]);
  const [exportGroupSearch, setExportGroupSearch] = useState('');
  const [hasInitializedGroup, setHasInitializedGroup] = useState(false);

  // Custom PDF Builder states
  const [pdfThemeColor, setPdfThemeColor] = useState('blue');
  const [pdfCompanyName, setPdfCompanyName] = useState('DPI Attendance Systems');
  const [pdfComments, setPdfComments] = useState('Confidential. Generated from system logs.');
  const [pdfLogColumns, setPdfLogColumns] = useState({
    logId: true,
    empId: true,
    empName: true,
    direction: true,
    date: true,
    time: true
  });
  const [pdfTimesheetColumns, setPdfTimesheetColumns] = useState({
    empId: true,
    empName: true,
    daysPresent: true,
    punchesCount: true,
    totalHours: true,
    totalBreakHours: true,
    avgDailyHours: true,
    goalStatus: true
  });
  const [pdfReportHtml, setPdfReportHtml] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const [isSingleDropdownOpen, setIsSingleDropdownOpen] = useState(false);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isExportDateDropdownOpen, setIsExportDateDropdownOpen] = useState(false);
  const [exportSingleSearch, setExportSingleSearch] = useState('');

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
  
  // Dropdowns UI state
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [isAnalyticsDateDropdownOpen, setIsAnalyticsDateDropdownOpen] = useState(false);
  const [isProfileDeptDropdownOpen, setIsProfileDeptDropdownOpen] = useState(false);
  const [isProfileSortDropdownOpen, setIsProfileSortDropdownOpen] = useState(false);
  const [isProfileDensityDropdownOpen, setIsProfileDensityDropdownOpen] = useState(false);

  // Handle closing custom dropdowns on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.single-dropdown-container')) setIsSingleDropdownOpen(false);
      if (!e.target.closest('.group-dropdown-container')) setIsGroupDropdownOpen(false);
      if (!e.target.closest('.status-dropdown-container')) setIsStatusDropdownOpen(false);
      if (!e.target.closest('.export-date-dropdown-container')) setIsExportDateDropdownOpen(false);
      if (!e.target.closest('.dept-dropdown-container')) setIsDeptDropdownOpen(false);
      if (!e.target.closest('.analytics-date-dropdown-container')) setIsAnalyticsDateDropdownOpen(false);
      if (!e.target.closest('.profile-dept-dropdown-container')) setIsProfileDeptDropdownOpen(false);
      if (!e.target.closest('.profile-sort-dropdown-container')) setIsProfileSortDropdownOpen(false);
      if (!e.target.closest('.profile-density-dropdown-container')) setIsProfileDensityDropdownOpen(false);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const [previewLogs] = useState([]);
  const [previewTimesheet] = useState([]);
  const [isPreviewLoading] = useState(false);

  const [isFetchingExportData] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

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

  const [, setLastRefreshedTime] = useState(new Date());
  const [highlightedLogId, setHighlightedLogId] = useState(null);


  // Live clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setLogsPage(1);
    setPresencePage(1);
  }, [searchQuery, statusFilter, dateScope]);

  // Supabase Initial Fetching
  const loadDatabaseData = async (showLoadingIndicator = true) => {
    if (!supabase) {
      setTimeout(() => {
        setIsLoaderFading(true);
        setTimeout(() => {
          setIsInitializing(false);
          setIsLoaderFading(false);
        }, 300);
      }, 400);
      return;
    }

    if (showLoadingIndicator) setIsLoadingData(true);
    setDbError(null);
    try {
      const { data: deviceData } = await supabase.from('employee_devices').select('*');
      const { data: empData } = await supabase.from('employees').select('*');

      const employeeMap = {};

      // 1. Process primary employee_devices table first
      if (deviceData && deviceData.length > 0) {
        deviceData.forEach(emp => {
          if (emp.Company === 'X' || (emp.EmployeeName && emp.EmployeeName.startsWith('del_'))) return;

          const empId = String(emp.EmployeeCode || emp.id).padStart(4, '0');
          const rawCode = String(emp.EmployeeCode || emp.id);

          const cleanSubDept = (!emp.SubDepartment || emp.SubDepartment === 'null') ? 'N/A' : emp.SubDepartment;
          const cleanDOJ = (!emp.DOJ || emp.DOJ.startsWith('1900')) ? 'N/A' : emp.DOJ.slice(0, 10);
          const cleanDOC = (!emp.DOC || emp.DOC.startsWith('1900')) ? 'N/A' : emp.DOC.slice(0, 10);

          const record = {
            id: empId,
            name: emp.EmployeeName || `Employee ${empId}`,
            department: emp.Department || 'General',
            subDepartment: cleanSubDept,
            designation: emp.Designation || 'Staff',
            role: emp.Designation || 'Staff Member',
            company: emp.Company || 'DPI',
            employmentType: emp.EmploymentType || 'Permanent',
            gender: (!emp.Gender || emp.Gender === 'null') ? 'N/A' : emp.Gender,
            status: emp.Status || 'Working',
            doj: cleanDOJ,
            doc: cleanDOC,
            verificationType: emp.VerificationType || 'Biometric',
            avatar: `https://i.pravatar.cc/150?u=${empId}`
          };

          employeeMap[empId] = record;
          if (rawCode !== empId) {
            employeeMap[rawCode] = record;
          }
        });
      }

      // 2. Fallback to base employees table for any employee not in employee_devices
      if (empData && empData.length > 0) {
        empData.forEach(emp => {
          if (emp.company_name === 'X' || (emp.name && emp.name.startsWith('del_'))) return;
          const empId = String(emp.id).padStart(4, '0');
          const rawId = String(emp.id);

          if (!employeeMap[empId] && !employeeMap[rawId]) {
            const fallbackRecord = {
              id: empId,
              name: emp.name,
              department: emp.department || 'General',
              subDepartment: 'N/A',
              designation: 'Staff',
              role: emp.role || 'Staff Member',
              company: 'DPI',
              employmentType: 'Permanent',
              gender: 'N/A',
              status: 'Working',
              doj: 'N/A',
              doc: 'N/A',
              verificationType: 'Biometric',
              avatar: emp.avatar || `https://i.pravatar.cc/150?u=${empId}`
            };
            employeeMap[empId] = fallbackRecord;
            if (rawId !== empId) {
              employeeMap[rawId] = fallbackRecord;
            }
          }
        });
      }

      if (Object.keys(employeeMap).length > 0) {
        setEmployees(employeeMap);
      }



      const { data: logsData, error: logsError } = await supabase
        .from('biometric_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(2000);

      if (logsError) throw logsError;

      if (logsData) {
        const formattedLogs = logsData
          .filter(log => !employeeMap || employeeMap[log.employee_id])
          .map(log => ({
            log_id: `LOG-${log.id}`,
            employee_id: log.employee_id,
            timestamp: log.timestamp,
            direction: log.direction
          }));
        setLogs(formattedLogs);
      }

      setIsSupabaseMode(true);
      setLastRefreshedTime(new Date());
    } catch (error) {
      console.error("Failed to load data from Supabase:", error);
      setDbError(error.message || "Database request failed.");
      setIsSupabaseMode(false);
    } finally {
      if (showLoadingIndicator) setIsLoadingData(false);
      setTimeout(() => {
        setIsLoaderFading(true);
        setTimeout(() => {
          setIsInitializing(false);
          setIsLoaderFading(false);
        }, 300);
      }, 600);
    }
  };

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

  const handleLogout = () => {
    setIsAuthenticated(false);
    setLoginUsername('');
    setLoginPassword('');
    localStorage.removeItem('dpi_authenticated');
  };

  useEffect(() => {
    loadDatabaseData(true);
    const safetyTimer = setTimeout(() => {
      setIsLoaderFading(true);
      setTimeout(() => {
        setIsInitializing(false);
        setIsLoaderFading(false);
      }, 300);
    }, 2000);
    return () => clearTimeout(safetyTimer);
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!isSupabaseMode || !supabase) return;

    const channel = supabase
      .channel('realtime_biometric_logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'biometric_logs' },
        (payload) => {
          if (!employees[payload.new.employee_id]) return;

          const newLog = {
            log_id: `LOG-${payload.new.id}`,
            employee_id: payload.new.employee_id,
            timestamp: payload.new.timestamp,
            direction: payload.new.direction
          };
          
          setLogs((prevLogs) => {
            if (prevLogs.some(l => l.log_id === newLog.log_id)) return prevLogs;
            setTimeout(() => {
              setHighlightedLogId(newLog.log_id);
              setLastRefreshedTime(new Date());
            }, 0);
            return [newLog, ...prevLogs];
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [isSupabaseMode, employees]);

  // 15 Mins Background Refresh
  useEffect(() => {
    if (!isSupabaseMode || !supabase) return;
    const pollingInterval = setInterval(() => loadDatabaseData(false), 15 * 60 * 1000);
    return () => clearInterval(pollingInterval);
  }, [isSupabaseMode]);

  const triggerManualRefresh = () => loadDatabaseData(true);

  // Admin Operations State (Leaves, On Duty, Holidays, Manual Punches)
  const [adminLeaves, setAdminLeaves] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dpi_admin_leaves')) || []; } catch { return []; }
  });
  const [adminODs, setAdminODs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dpi_admin_ods')) || []; } catch { return []; }
  });
  const [adminHolidays, setAdminHolidays] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dpi_admin_holidays')) || []; } catch { return []; }
  });
  const [manualPunches, setManualPunches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dpi_manual_punches')) || []; } catch { return []; }
  });

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
  }, [logs, manualPunches, currentTime.toDateString()]);

  const totalWorkforce = Object.keys(employees).length;

  const activeInOfficeCount = useMemo(() => {
    let activeCount = 0;
    Object.keys(employees).forEach(empId => {
      const lastLog = processedLogs.find(log => log.employee_id === empId);
      if (lastLog && lastLog.direction === 'IN') activeCount++;
    });
    return activeCount;
  }, [processedLogs, employees]);

  const absentRemoteCount = totalWorkforce - activeInOfficeCount;

  // Presence Map Engine
  const employeePresenceMap = useMemo(() => {
    const map = {};
    Object.keys(employees).forEach(empId => {
      map[empId] = {
        status: 'OUT',
        lastPunchTime: null,
        punchesToday: [],
        hoursWorkedToday: 0,
        formattedTime: '0h 0m'
      };
    });

    const sortedLogs = [...processedLogs].reverse();
    sortedLogs.forEach(log => {
      const empId = log.employee_id;
      if (!map[empId]) return;
      const logDate = parseDBDate(log.timestamp);
      const isToday = logDate.toDateString() === currentTime.toDateString();

      map[empId].status = log.direction;
      map[empId].lastPunchTime = log.timestamp;
      if (isToday) map[empId].punchesToday.push(log);
    });

    Object.keys(map).forEach(empId => {
      const data = map[empId];
      const todayPunches = data.punchesToday;
      let totalMs = 0;
      let lastInTime = null;

      todayPunches.forEach(punch => {
        const time = parseDBDate(punch.timestamp);
        if (punch.direction === 'IN') {
          lastInTime = time;
        } else if ((punch.direction === 'OUT' || punch.direction === 'SYS_OUT') && lastInTime) {
          totalMs += (time - lastInTime);
          lastInTime = null;
        }
      });

      if (lastInTime) totalMs += (currentTime - lastInTime);

      let breakMs = 0;
      const firstInPunch = todayPunches.find(p => p.direction === 'IN');
      if (firstInPunch) {
        const firstInTime = parseDBDate(firstInPunch.timestamp);
        const lastPunch = todayPunches[todayPunches.length - 1];
        const endReferenceTime = lastPunch.direction === 'IN' ? currentTime : parseDBDate(lastPunch.timestamp);
        const totalSpanMs = endReferenceTime - firstInTime;
        breakMs = Math.max(0, totalSpanMs - totalMs);
      }

      const totalMinutes = Math.floor(totalMs / 1000 / 60);
      const hrs = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;

      const totalBreakMinutes = Math.floor(breakMs / 1000 / 60);
      const breakHrs = Math.floor(totalBreakMinutes / 60);
      const breakMins = totalBreakMinutes % 60;

      data.hoursWorkedToday = totalMs / 1000 / 60 / 60;
      data.formattedTime = `${hrs}h ${mins}m`;
      data.formattedBreakTime = `${breakHrs}h ${breakMins}m`;
    });

    return map;
  }, [processedLogs, employees, currentTime]);

  // Filtered employees list
  const filteredEmployeesList = useMemo(() => {
    return Object.entries(employees).filter(([empId, emp]) => {
      const matchesDept = departmentFilter === 'All' || emp.department === departmentFilter;
      const matchesSearch = searchQuery.trim() === '' || 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        empId.toLowerCase().includes(searchQuery.toLowerCase());
      const statusData = employeePresenceMap[empId] || { status: 'OUT' };
      const matchesStatus = statusFilter === 'All' || statusData.status === statusFilter;
      return matchesDept && matchesSearch && matchesStatus;
    });
  }, [employees, searchQuery, statusFilter, employeePresenceMap, departmentFilter]);

  const sortedAndFilteredProfiles = useMemo(() => {
    let list = [...filteredEmployeesList];
    if (profileFilter !== 'All') {
      list = list.filter(([empId]) => {
        const statusData = employeePresenceMap[empId] || { status: 'OUT', hoursWorkedToday: 0 };
        const isInside = statusData.status === 'IN';
        if (profileFilter === 'IN') return isInside;
        if (profileFilter === 'OUT') return !isInside;
        if (profileFilter === 'goalMet') return statusData.hoursWorkedToday >= 7;
        if (profileFilter === 'overtime') return statusData.hoursWorkedToday > 9;
        return true;
      });
    }

    list.sort(([idA, empA], [idB, empB]) => {
      const statusA = employeePresenceMap[idA] || { status: 'OUT', hoursWorkedToday: 0 };
      const statusB = employeePresenceMap[idB] || { status: 'OUT', hoursWorkedToday: 0 };
      if (profileSort === 'name') return empA.name.localeCompare(empB.name);
      if (profileSort === 'hours') return statusB.hoursWorkedToday - statusA.hoursWorkedToday;
      if (profileSort === 'status') return (statusB.status === 'IN' ? 1 : 0) - (statusA.status === 'IN' ? 1 : 0);
      return 0;
    });

    return list;
  }, [filteredEmployeesList, profileFilter, profileSort, employeePresenceMap]);

  const profileSummaryStats = useMemo(() => {
    let present = 0, away = 0, late = 0, overtime = 0;
    filteredEmployeesList.forEach(([empId]) => {
      const statusData = employeePresenceMap[empId] || { status: 'OUT', hoursWorkedToday: 0 };
      if (statusData.status === 'IN') present++; else away++;
      if (statusData.hoursWorkedToday > 9) overtime++;
    });

    return { total: filteredEmployeesList.length, present, away, late, overtime };
  }, [filteredEmployeesList, employeePresenceMap]);

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

    // Filter logs within range & matching department
    const rangeLogs = processedLogs.filter(log => {
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
      leaderboard: {
        mostPunctual: punctualList.slice(0, 5),
        frequentlyLate: lateList.slice(0, 5)
      },
      exceptions
    };
  }, [analyticsDateScope, analyticsStartDate, analyticsEndDate, employees, departmentFilter, processedLogs, activeInOfficeCount]);

  // Logs Filtering & Pagination
  const logsFilteredBySearch = useMemo(() => {
    return processedLogs.filter(log => {
      const emp = employees[log.employee_id];
      if (!emp) return false;
      const matchesDept = departmentFilter === 'All' || emp.department === departmentFilter;
      const matchesSearch = searchQuery.trim() === '' || 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.employee_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || log.direction === statusFilter;
      return matchesDept && matchesSearch && matchesStatus;
    });
  }, [processedLogs, employees, searchQuery, statusFilter, departmentFilter]);

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

  // Selected Employee Detailed Analytics for Modal Drawer
  const selectedEmployeeAnalytics = useMemo(() => {
    if (!selectedProfileEmpId) return null;
    const empLogs = processedLogs.filter(log => log.employee_id === selectedProfileEmpId);
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
  }, [selectedProfileEmpId, processedLogs, currentTime]);

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
        <div className="flex-1 flex flex-col animate-fadeIn">
          {/* Extracted Navigation Header */}
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
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
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
          </main>

          {/* Mobile Sticky Bottom Navigation Bar */}
          <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
            <div className="flex items-stretch h-[72px] px-2">
              {[
                { id: 'logs', label: 'Logs', icon: Clock },
                { id: 'presence', label: 'Directory', icon: Users },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                { id: 'admin', label: 'Admin', icon: ShieldCheck },
                { id: 'export', label: 'Reports', icon: FileText }
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
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
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
      <ProfileModal
        selectedProfileEmpId={selectedProfileEmpId}
        setSelectedProfileEmpId={setSelectedProfileEmpId}
        selectedEmployeeAnalytics={selectedEmployeeAnalytics}
        employees={employees}
        employeePresenceMap={employeePresenceMap}
        handleDownloadIndividualPDF={handleDownloadIndividualPDF}
        heatmapDays={heatmapDays}
      />

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
    </div>
  );
}
