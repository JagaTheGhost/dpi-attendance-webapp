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
  Printer,
  Check,
  ChevronDown,
  AlertTriangle,
  Coffee,
  BarChart3,
  Users,
  User,
  Lock
} from 'lucide-react';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

// Parse DB timestamp strings as local times to avoid timezone mismatches
const parseDBDate = (timestampStr) => {
  if (!timestampStr) return new Date();
  if (timestampStr instanceof Date) return timestampStr;
  if (typeof timestampStr === 'string') {
    if (timestampStr.includes('T')) {
      return new Date(timestampStr.slice(0, 19));
    }
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(timestampStr)) {
      return new Date(timestampStr.slice(0, 19).replace(' ', 'T'));
    }
  }
  return new Date(timestampStr);
};

// Calculate boundary ISO strings for attendance date scope
const getDateRangeBounds = (range, startInput, endInput) => {
  const start = new Date();
  const end = new Date();

  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (range === 'yesterday') {
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
  } else if (range === 'week') {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (range === 'custom') {
    const s = new Date(startInput);
    s.setHours(0, 0, 0, 0);
    const e = new Date(endInput);
    e.setHours(23, 59, 59, 999);
    return { startISO: s.toISOString(), endISO: e.toISOString() };
  }

  return {
    startISO: start.toISOString(),
    endISO: end.toISOString()
  };
};

// ==========================================
// 1. Static Fallback Data
// ==========================================

const STATIC_EMPLOYEES = {
  "EMP-001": { 
    name: "Harsha Vardhan", 
    department: "Engineering", 
    role: "Principal Architect", 
    avatar: "https://i.pravatar.cc/150?img=33" 
  },
  "EMP-002": { 
    name: "Priya Sharma", 
    department: "Engineering", 
    role: "Senior Frontend Engineer", 
    avatar: "https://i.pravatar.cc/150?img=49" 
  },
  "EMP-003": { 
    name: "Arun Kumar", 
    department: "Operations", 
    role: "Operations Lead", 
    avatar: "https://i.pravatar.cc/150?img=12" 
  },
  "EMP-004": { 
    name: "Ananya Patel", 
    department: "HR", 
    role: "Talent Acquisition Lead", 
    avatar: "https://i.pravatar.cc/150?img=47" 
  },
  "EMP-005": { 
    name: "Rajesh Nair", 
    department: "Engineering", 
    role: "QA Lead", 
    avatar: "https://i.pravatar.cc/150?img=68" 
  },
  "EMP-006": { 
    name: "Deepika Rao", 
    department: "Operations", 
    role: "Logistics Coordinator", 
    avatar: "https://i.pravatar.cc/150?img=32" 
  },
  "EMP-007": { 
    name: "Karan Johar", 
    department: "HR", 
    role: "HR Generalist", 
    avatar: "https://i.pravatar.cc/150?img=11" 
  },
  "EMP-008": { 
    name: "Vikram Malhotra", 
    department: "Engineering", 
    role: "DevOps Architect", 
    avatar: "https://i.pravatar.cc/150?img=59" 
  }
};

const INITIAL_LOGS = [
  { log_id: "LOG-100", employee_id: "EMP-002", timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), direction: "OUT" },
  { log_id: "LOG-099", employee_id: "EMP-008", timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), direction: "IN" },
  { log_id: "LOG-098", employee_id: "EMP-007", timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(), direction: "IN" },
  { log_id: "LOG-097", employee_id: "EMP-006", timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(), direction: "IN" },
  { log_id: "LOG-096", employee_id: "EMP-001", timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), direction: "OUT" },
  { log_id: "LOG-095", employee_id: "EMP-005", timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(), direction: "IN" },
  { log_id: "LOG-094", employee_id: "EMP-004", timestamp: new Date(Date.now() - 70 * 60 * 1000).toISOString(), direction: "IN" },
  { log_id: "LOG-093", employee_id: "EMP-003", timestamp: new Date(Date.now() - 85 * 60 * 1000).toISOString(), direction: "IN" },
  { log_id: "LOG-092", employee_id: "EMP-002", timestamp: new Date(Date.now() - 100 * 60 * 1000).toISOString(), direction: "IN" },
  { log_id: "LOG-091", employee_id: "EMP-001", timestamp: new Date(Date.now() - 115 * 60 * 1000).toISOString(), direction: "IN" }
];

const chunkArray = (array, size) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

const toLocalISOString = (date) => {
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const injectVirtualLogs = (rawLogs, currentTime = new Date()) => {
  if (!rawLogs || rawLogs.length === 0) return [];
  
  const logsByEmpAndDate = {};
  rawLogs.forEach(log => {
    const empId = log.employee_id;
    const dateStr = parseDBDate(log.timestamp).toDateString();
    if (!logsByEmpAndDate[empId]) logsByEmpAndDate[empId] = {};
    if (!logsByEmpAndDate[empId][dateStr]) logsByEmpAndDate[empId][dateStr] = [];
    logsByEmpAndDate[empId][dateStr].push(log);
  });

  const virtualLogs = [];
  const todayStr = currentTime.toDateString();

  Object.keys(logsByEmpAndDate).forEach(empId => {
    Object.keys(logsByEmpAndDate[empId]).forEach(dateStr => {
      if (dateStr === todayStr) return;

      const dayLogs = [...logsByEmpAndDate[empId][dateStr]].sort((a, b) => parseDBDate(a.timestamp) - parseDBDate(b.timestamp));
      const lastLog = dayLogs[dayLogs.length - 1];

      if (lastLog.direction === 'IN') {
        const lastInTime = parseDBDate(lastLog.timestamp);
        let autoOutTime = new Date(lastInTime.getTime() + 8 * 60 * 60 * 1000);
        const endOfDay = new Date(lastInTime);
        endOfDay.setHours(23, 59, 59, 999);
        if (autoOutTime > endOfDay) {
          autoOutTime = endOfDay;
        }

        virtualLogs.push({
          log_id: `SYS-${empId}-${dateStr.replace(/ /g, '-')}`,
          employee_id: empId,
          timestamp: toLocalISOString(autoOutTime),
          direction: 'SYS_OUT',
          isSystemGenerated: true
        });
      }
    });
  });

  return [...rawLogs, ...virtualLogs].sort((a, b) => parseDBDate(b.timestamp) - parseDBDate(a.timestamp));
};

export default function App() {
  // ==========================================
  // 2. State & Settings
  // ==========================================
  const [employees, setEmployees] = useState(STATIC_EMPLOYEES);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'IN' | 'OUT'
  const [dateScope, setDateScope] = useState('today'); // 'today' | 'all'
  const [currentTime, setCurrentTime] = useState(new Date());

  // Connection & loading states
  const [isSupabaseMode, setIsSupabaseMode] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dbError, setDbError] = useState(null);

  // Authentication & Initial Splash states
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('dpi_authenticated') === 'true');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoaderFading, setIsLoaderFading] = useState(false);
  const [isLoginFading, setIsLoginFading] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  
  // Navigation & Pagination state
  const [activeTab, setActiveTab] = useState('logs'); // 'logs' or 'presence'
  const [activeChartTab, setActiveChartTab] = useState('hourly'); // 'hourly' or 'weekly'
  const [logsPage, setLogsPage] = useState(1);
  const [presencePage, setPresencePage] = useState(1);
  const [selectedProfileEmpId, setSelectedProfileEmpId] = useState(null);
  const [profileSort, setProfileSort] = useState('name'); // 'name' | 'hours' | 'status'
  const [profileFilter, setProfileFilter] = useState('All'); // 'All' | 'IN' | 'OUT' | 'goalMet' | 'late' | 'overtime'
  const [profileViewMode, setProfileViewMode] = useState('grid'); // 'grid' | 'table'
  const [profileItemsPerPage, setProfileItemsPerPage] = useState(8); // 8 | 16 | 32 | 64 | 100

  // Advanced Export Hub State
  const [exportReportType, setExportReportType] = useState('logs'); // 'logs' | 'timesheet'
  const [exportDateRange, setExportDateRange] = useState('today'); // 'today' | 'yesterday' | 'week' | 'custom'
  const [exportStartDate, setExportStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().slice(0, 10));
  
  const [exportEmployeeFilter, setExportEmployeeFilter] = useState('all'); // 'all' | 'single' | 'group'
  const [exportSelectedEmployee, setExportSelectedEmployee] = useState('');
  const [exportSelectedEmployeesGroup, setExportSelectedEmployeesGroup] = useState([]);
  const [exportGroupSearch, setExportGroupSearch] = useState('');
  const [hasInitializedGroup, setHasInitializedGroup] = useState(false);

  // Custom PDF Builder states
  const [pdfThemeColor, setPdfThemeColor] = useState('blue'); // 'slate' | 'blue' | 'emerald' | 'indigo'
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

  // Global Department, Leaves, and Analytics Filter States
  const [departmentFilter, setDepartmentFilter] = useState('All'); // 'All' | 'Engineering' | 'Operations' | 'Marketing' | 'HR' | 'Sales'
  const [employeeLeaves, setEmployeeLeaves] = useState({
    "EMP-003": true, // Arun Kumar is marked on Leave (Operations)
    "EMP-006": true  // Sneha Reddy is marked on Leave (HR)
  });
  
  const [analyticsDateScope, setAnalyticsDateScope] = useState('week'); // 'today' | 'yesterday' | 'week' | 'custom'
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
      if (!e.target.closest('.single-dropdown-container')) {
        setIsSingleDropdownOpen(false);
      }
      if (!e.target.closest('.group-dropdown-container')) {
        setIsGroupDropdownOpen(false);
      }
      if (!e.target.closest('.status-dropdown-container')) {
        setIsStatusDropdownOpen(false);
      }
      if (!e.target.closest('.export-date-dropdown-container')) {
        setIsExportDateDropdownOpen(false);
      }
      if (!e.target.closest('.dept-dropdown-container')) {
        setIsDeptDropdownOpen(false);
      }
      if (!e.target.closest('.analytics-date-dropdown-container')) {
        setIsAnalyticsDateDropdownOpen(false);
      }
      if (!e.target.closest('.profile-dept-dropdown-container')) {
        setIsProfileDeptDropdownOpen(false);
      }
      if (!e.target.closest('.profile-sort-dropdown-container')) {
        setIsProfileSortDropdownOpen(false);
      }
      if (!e.target.closest('.profile-density-dropdown-container')) {
        setIsProfileDensityDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const [previewLogs, setPreviewLogs] = useState([]);
  const [previewTimesheet, setPreviewTimesheet] = useState([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [isFetchingExportData, setIsFetchingExportData] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Auto-set initial values for single/group employee filters once employees map loads
  useEffect(() => {
    const keys = Object.keys(employees);
    if (keys.length > 0) {
      if (!exportSelectedEmployee) {
        setExportSelectedEmployee(keys[0]);
      }
      if (!hasInitializedGroup) {
        setExportSelectedEmployeesGroup(keys);
        setHasInitializedGroup(true);
      }
    }
  }, [employees, exportSelectedEmployee, hasInitializedGroup]);

  const [lastRefreshedTime, setLastRefreshedTime] = useState(new Date());
  const [highlightedLogId, setHighlightedLogId] = useState(null);

  // Tooltip Hover States
  const [hoveredHour, setHoveredHour] = useState(null);
  const [hoveredWeekIndex, setHoveredWeekIndex] = useState(null);
  const [selectedHourFilter, setSelectedHourFilter] = useState(null);

  // Constants
  const LOGS_PER_PAGE = 20;
  const EMPLOYEES_PER_PAGE = 10;

  // Live time ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Reset pagination pages on filter updates
  useEffect(() => {
    setLogsPage(1);
    setPresencePage(1);
  }, [searchQuery, statusFilter, dateScope]);

  // ==========================================
  // 3. Supabase Initial Data Fetching Effect
  // ==========================================
  const loadDatabaseData = async (showLoadingIndicator = true) => {
    if (!supabase) return;
    
    if (showLoadingIndicator) {
      setIsLoadingData(true);
    }
    setDbError(null);
    try {
      // Fetch employee roster
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*');
      
      if (empError) throw empError;

      const employeeMap = {};
      if (empData && empData.length > 0) {
        empData.forEach(emp => {
          if (emp.company_name === 'X') return; // Filter out company 'X'
          employeeMap[emp.id] = {
            name: emp.name,
            department: emp.department,
            role: emp.role,
            avatar: emp.avatar
          };
        });
        setEmployees(employeeMap);
      }

      // Fetch logs
      const { data: logsData, error: logsError } = await supabase
        .from('biometric_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(2000);

      if (logsError) throw logsError;

      if (logsData) {
        // Filter out logs for employees not in the active roster (excludes company X)
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
      setDbError(error.message || "Database request failed. Double-check your tables and schema.");
      setIsSupabaseMode(false);
    } finally {
      if (showLoadingIndicator) {
        setIsLoadingData(false);
      }
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
      setTimeout(() => {
        setIsLoginFading(false);
      }, 300);
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
  }, []);

  // ==========================================
  // 4. Supabase Realtime Subscription Effect
  // ==========================================
  useEffect(() => {
    if (!isSupabaseMode || !supabase) return;

    const channel = supabase
      .channel('realtime_biometric_logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'biometric_logs' },
        (payload) => {
          console.log("Realtime biometric log insert detected in Supabase:", payload);
          
          // Ignore logs for employees who are not in our filtered list (excludes company 'X')
          if (!employees[payload.new.employee_id]) {
            console.log("Realtime log ignored: employee is not in the active roster.");
            return;
          }

          const newLog = {
            log_id: `LOG-${payload.new.id}`,
            employee_id: payload.new.employee_id,
            timestamp: payload.new.timestamp,
            direction: payload.new.direction
          };
          
          setLogs((prevLogs) => {
            // Check if it already exists to avoid duplicate entries in edge cases
            if (prevLogs.some(l => l.log_id === newLog.log_id)) return prevLogs;

            // Highlight the new row & update last sync time
            setTimeout(() => {
              setHighlightedLogId(newLog.log_id);
              setLastRefreshedTime(new Date());
            }, 0);
            
            // Prepend new log
            return [newLog, ...prevLogs];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSupabaseMode, employees]);

  // ==========================================
  // 5. Automatic Fallback Polling (15 Mins)
  // ==========================================
  useEffect(() => {
    if (!isSupabaseMode || !supabase) return;

    const pollingInterval = setInterval(() => {
      console.log("Running scheduled 15-minute background database sync...");
      loadDatabaseData(false);
    }, 15 * 60 * 1000);

    return () => clearInterval(pollingInterval);
  }, [isSupabaseMode]);

  // Manual Trigger to refresh logs
  const triggerManualRefresh = () => {
    loadDatabaseData(true);
  };

  // ==========================================
  // 6. Dynamic Stat Calculations (useMemo)
  // ==========================================
  const processedLogs = useMemo(() => {
    return injectVirtualLogs(logs, currentTime);
  }, [logs, currentTime.toDateString()]);

  const totalWorkforce = Object.keys(employees).length;

  const activeInOfficeCount = useMemo(() => {
    let activeCount = 0;
    Object.keys(employees).forEach(empId => {
      const lastLog = processedLogs.find(log => log.employee_id === empId);
      if (lastLog && lastLog.direction === 'IN') {
        activeCount++;
      }
    });
    return activeCount;
  }, [processedLogs, employees]);

  const absentRemoteCount = totalWorkforce - activeInOfficeCount;

  // ==========================================
  // 7. Hours Worked & Live Presence Engine
  // ==========================================
  const employeePresenceMap = useMemo(() => {
    const map = {};
    
    // Initialize defaults
    Object.keys(employees).forEach(empId => {
      map[empId] = {
        status: 'OUT',
        lastPunchTime: null,
        punchesToday: [],
        hoursWorkedToday: 0,
        formattedTime: '0h 0m'
      };
    });

    // Chronological order (oldest first)
    const sortedLogs = [...processedLogs].reverse();

    sortedLogs.forEach(log => {
      const empId = log.employee_id;
      if (!map[empId]) return;

      const logDate = parseDBDate(log.timestamp);
      const isToday = logDate.toDateString() === currentTime.toDateString();

      // Track last state globally
      map[empId].status = log.direction;
      map[empId].lastPunchTime = log.timestamp;

      if (isToday) {
        map[empId].punchesToday.push(log);
      }
    });

    // Calculate elapsed time for today
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

      // Ongoing session incrementing live
      if (lastInTime) {
        totalMs += (currentTime - lastInTime);
      }

      // Calculate break time
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

  const smartInsights = useMemo(() => {
    const lateArrivals = [];
    let sysOutYesterday = 0;
    let sysOutToday = 0;
    const overtimeEmployees = [];
    const longBreaks = [];

    const todayStr = currentTime.toDateString();
    const yesterday = new Date(currentTime);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    Object.entries(employeePresenceMap).forEach(([empId, presence]) => {
      const emp = employees[empId];
      if (!emp) return;

      // Late arrival check (first IN of today after 09:15)
      const todayInPunches = presence.punchesToday.filter(p => p.direction === 'IN');
      if (todayInPunches.length > 0) {
        const firstIn = parseDBDate(todayInPunches[0].timestamp);
        const hours = firstIn.getHours();
        const minutes = firstIn.getMinutes();
        const arrivalMinutes = hours * 60 + minutes;
        const targetMinutes = 9 * 60 + 15; // 9:15 AM
        if (arrivalMinutes > targetMinutes) {
          lateArrivals.push({
            name: emp.name,
            empId,
            timeStr: firstIn.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
          });
        }
      }

      // Overtime check (> 9 hours worked today)
      if (presence.hoursWorkedToday > 9) {
        overtimeEmployees.push({
          name: emp.name,
          empId,
          hours: presence.hoursWorkedToday
        });
      }

      // Long Break check (> 1.5 hours today)
      const todayPunches = presence.punchesToday;
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
      if (lastInTime) {
        totalMs += (currentTime - lastInTime);
      }
      
      const firstInPunch = todayPunches.find(p => p.direction === 'IN');
      if (firstInPunch) {
        const firstInTime = parseDBDate(firstInPunch.timestamp);
        const lastPunch = todayPunches[todayPunches.length - 1];
        const endReferenceTime = lastPunch.direction === 'IN' ? currentTime : parseDBDate(lastPunch.timestamp);
        const totalSpanMs = endReferenceTime - firstInTime;
        const breakMs = Math.max(0, totalSpanMs - totalMs);
        const breakMinutes = breakMs / 1000 / 60;
        if (breakMinutes > 90) {
          longBreaks.push({
            name: emp.name,
            empId,
            minutes: breakMinutes
          });
        }
      }
    });

    // Count SYS_OUT logs
    processedLogs.forEach(log => {
      if (log.direction === 'SYS_OUT') {
        const logDate = parseDBDate(log.timestamp).toDateString();
        if (logDate === todayStr) {
          sysOutToday++;
        } else if (logDate === yesterdayStr) {
          sysOutYesterday++;
        }
      }
    });

    return {
      lateArrivals,
      sysOutToday,
      sysOutYesterday,
      overtimeEmployees,
      longBreaks
    };
  }, [employeePresenceMap, processedLogs, employees, currentTime]);

  // ==========================================
  // 8. Filtering Logic (useMemo)
  // ==========================================
  const logsFilteredBySearch = useMemo(() => {
    return processedLogs.filter(log => {
      const emp = employees[log.employee_id];
      if (!emp) return false;

      const matchesDept = departmentFilter === 'All' || emp.department === departmentFilter;

      return matchesDept && (searchQuery.trim() === '' || 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.employee_id.toLowerCase().includes(searchQuery.toLowerCase()));
    });
  }, [processedLogs, employees, searchQuery, departmentFilter]);

  const filteredLogs = useMemo(() => {
    return logsFilteredBySearch.filter(log => {
      // Filter by Punch Direction (handle SYS_OUT as OUT)
      const matchesStatus = statusFilter === 'All' || 
        log.direction === statusFilter || 
        (statusFilter === 'OUT' && log.direction === 'SYS_OUT');

      // Filter by Date (Today vs All)
      let matchesDate = true;
      if (dateScope === 'today') {
        const logDate = parseDBDate(log.timestamp);
        matchesDate = logDate.toDateString() === currentTime.toDateString();
      }

      // Filter by Hour
      let matchesHour = true;
      if (selectedHourFilter !== null) {
        const logDate = parseDBDate(log.timestamp);
        matchesHour = logDate.getHours() === selectedHourFilter;
      }

      return matchesStatus && matchesDate && matchesHour;
    });
  }, [logsFilteredBySearch, statusFilter, dateScope, currentTime, selectedHourFilter]);

  // Filtered employees for Presence Grid Board
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

  // Profiles specific filter & sorting memo
  const sortedAndFilteredProfiles = useMemo(() => {
    let list = [...filteredEmployeesList];

    if (profileFilter !== 'All') {
      list = list.filter(([empId, emp]) => {
        const statusData = employeePresenceMap[empId] || {
          status: 'OUT',
          lastPunchTime: null,
          hoursWorkedToday: 0,
          formattedTime: '0h 0m',
          punchesToday: []
        };
        const isInside = statusData.status === 'IN';

        if (profileFilter === 'IN') return isInside;
        if (profileFilter === 'OUT') return !isInside;
        if (profileFilter === 'goalMet') return statusData.hoursWorkedToday >= 7;
        if (profileFilter === 'late') {
          const punches = statusData.punchesToday || [];
          const firstIn = punches.find(p => p.type === 'IN');
          if (firstIn) {
            const time = new Date(firstIn.time);
            const hour = time.getHours();
            const minute = time.getMinutes();
            return (hour > 9) || (hour === 9 && minute > 15);
          }
          return false;
        }
        if (profileFilter === 'overtime') {
          return statusData.hoursWorkedToday > 9;
        }
        return true;
      });
    }

    list.sort(([idA, empA], [idB, empB]) => {
      const statusA = employeePresenceMap[idA] || { status: 'OUT', hoursWorkedToday: 0 };
      const statusB = employeePresenceMap[idB] || { status: 'OUT', hoursWorkedToday: 0 };

      if (profileSort === 'name') {
        return empA.name.localeCompare(empB.name);
      }
      if (profileSort === 'hours') {
        return statusB.hoursWorkedToday - statusA.hoursWorkedToday;
      }
      if (profileSort === 'status') {
        const valA = statusA.status === 'IN' ? 1 : 0;
        const valB = statusB.status === 'IN' ? 1 : 0;
        return valB - valA;
      }
      return 0;
    });

    return list;
  }, [filteredEmployeesList, profileFilter, profileSort, employeePresenceMap]);

  // Live Cockpit Stats for Employee Profiles Tab
  const profileSummaryStats = useMemo(() => {
    let present = 0;
    let away = 0;
    let late = 0;
    let overtime = 0;

    filteredEmployeesList.forEach(([empId, emp]) => {
      const statusData = employeePresenceMap[empId] || {
        status: 'OUT',
        hoursWorkedToday: 0,
        punchesToday: []
      };

      if (statusData.status === 'IN') {
        present++;
      } else {
        away++;
      }

      if (statusData.hoursWorkedToday > 9) {
        overtime++;
      }

      const firstIn = (statusData.punchesToday || []).find(p => p.type === 'IN');
      if (firstIn) {
        const time = new Date(firstIn.time);
        const hour = time.getHours();
        const minute = time.getMinutes();
        if ((hour > 9) || (hour === 9 && minute > 15)) {
          late++;
        }
      }
    });

    return {
      total: filteredEmployeesList.length,
      present,
      away,
      late,
      overtime
    };
  }, [filteredEmployeesList, employeePresenceMap]);

  // ==========================================
  // 9. Advanced Analytics Calculation (useMemo)
  // ==========================================
  const analyticsData = useMemo(() => {
    const { startISO, endISO } = getDateRangeBounds(analyticsDateScope, analyticsStartDate, analyticsEndDate);
    const startDateObj = new Date(startISO);
    const endDateObj = new Date(endISO);
    
    // Filter employees by department
    const targetEmployees = {};
    Object.entries(employees).forEach(([empId, emp]) => {
      if (departmentFilter === 'All' || emp.department === departmentFilter) {
        targetEmployees[empId] = emp;
      }
    });
    
    const totalDeptEmployees = Object.keys(targetEmployees).length;

    // Filter logs for this range and department
    const rangeLogs = logs.filter(log => {
      const logDate = parseDBDate(log.timestamp);
      const isWithinDate = logDate >= startDateObj && logDate <= endDateObj;
      const isTargetEmployee = !!targetEmployees[log.employee_id];
      return isWithinDate && isTargetEmployee;
    });

    // Group logs by employee and day
    const groupedLogs = {}; // { empId: { dateStr: [logs] } }
    const dailyPresence = {}; // { dateStr: Set(presentEmpIds) }
    
    // Fill in dates range to render trend lines
    const dailyWorkedHours = {}; // { dateStr: { totalHours: 0, count: 0 } }
    const dailyLateCounts = {}; // { dateStr: 0 }
    
    let loop = new Date(startDateObj);
    while (loop <= endDateObj) {
      const dateStr = loop.toDateString();
      dailyPresence[dateStr] = new Set();
      dailyWorkedHours[dateStr] = { totalHours: 0, count: 0 };
      dailyLateCounts[dateStr] = 0;
      loop.setDate(loop.getDate() + 1);
    }

    rangeLogs.forEach(log => {
      const empId = log.employee_id;
      const logDate = parseDBDate(log.timestamp);
      const dateStr = logDate.toDateString();

      if (!groupedLogs[empId]) groupedLogs[empId] = {};
      if (!groupedLogs[empId][dateStr]) groupedLogs[empId][dateStr] = [];
      groupedLogs[empId][dateStr].push(log);

      // Track presence
      if (dailyPresence[dateStr]) {
        dailyPresence[dateStr].add(empId);
      }
    });

    // Punctuality & hours aggregators
    let totalLateCount = 0;
    let totalEarlyDepartures = 0;
    let sumArrivalMinutes = 0;
    let countArrivals = 0;
    let sumDepartureMinutes = 0;
    let countDepartures = 0;

    let totalOvertimeHours = 0;
    let totalWorkedHoursSum = 0;
    let totalPresenceRecords = 0;

    const employeeStats = {}; // { empId: { totalHours: 0, daysPresent: 0, lateCount: 0, earlyCount: 0, firstInTimes: [] } }
    
    // Exception buckets
    const missingIn = [];
    const missingOut = [];
    const duplicates = [];
    
    // Duplicate detection threshold
    const DUPLICATE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

    Object.keys(targetEmployees).forEach(empId => {
      employeeStats[empId] = {
        empId,
        name: targetEmployees[empId].name,
        department: targetEmployees[empId].department,
        totalHours: 0,
        daysPresent: 0,
        lateCount: 0,
        earlyCount: 0,
        firstInTimes: []
      };

      const daysMap = groupedLogs[empId] || {};
      Object.keys(daysMap).forEach(dateStr => {
        const dayLogs = [...daysMap[dateStr]].sort((a, b) => parseDBDate(a.timestamp) - parseDBDate(b.timestamp));
        if (dayLogs.length === 0) return;

        employeeStats[empId].daysPresent++;
        totalPresenceRecords++;

        // Duplicate checks
        for (let i = 0; i < dayLogs.length - 1; i++) {
          const t1 = parseDBDate(dayLogs[i].timestamp);
          const t2 = parseDBDate(dayLogs[i + 1].timestamp);
          if (dayLogs[i].direction === dayLogs[i + 1].direction && (t2 - t1) < DUPLICATE_THRESHOLD_MS) {
            duplicates.push({
              empId,
              name: targetEmployees[empId].name,
              date: t1.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
              time: t1.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
              detail: `Double ${dayLogs[i].direction} punch within ${Math.round((t2-t1)/1000)}s`
            });
          }
        }

        // First IN / Last OUT logic
        let firstIn = null;
        let lastOut = null;
        let dayMs = 0;
        let lastInTime = null;

        dayLogs.forEach(log => {
          const t = parseDBDate(log.timestamp);
          if (log.direction === 'IN') {
            lastInTime = t;
            if (!firstIn) firstIn = t;
          } else if ((log.direction === 'OUT' || log.direction === 'SYS_OUT') && lastInTime) {
            dayMs += (t - lastInTime);
            lastInTime = null;
            lastOut = t;
          }
        });

        // Auto-OUT missing out detection
        const hasSysOut = dayLogs.some(log => log.direction === 'SYS_OUT');
        if (hasSysOut) {
          const sysOutLog = dayLogs.find(log => log.direction === 'SYS_OUT');
          const t = parseDBDate(sysOutLog.timestamp);
          missingOut.push({
            empId,
            name: targetEmployees[empId].name,
            date: t.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            time: t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
          });
        }

        // Missing IN detection
        if (dayLogs[0].direction === 'OUT' || dayLogs[0].direction === 'SYS_OUT') {
          const t = parseDBDate(dayLogs[0].timestamp);
          missingIn.push({
            empId,
            name: targetEmployees[empId].name,
            date: t.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            time: t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
          });
        }

        // Ongoing check-in
        if (lastInTime) {
          const isToday = dateStr === new Date().toDateString();
          const endTime = isToday ? new Date() : new Date(new Date(dateStr).setHours(23, 59, 59, 999));
          dayMs += (endTime - lastInTime);
          if (!lastOut) lastOut = endTime;
        }

        const workedHrs = dayMs / 1000 / 60 / 60;
        employeeStats[empId].totalHours += workedHrs;
        totalWorkedHoursSum += workedHrs;

        if (dailyWorkedHours[dateStr]) {
          dailyWorkedHours[dateStr].totalHours += workedHrs;
          dailyWorkedHours[dateStr].count++;
        }

        // Overtime check (> 8.0 hours)
        if (workedHrs > 8.0) {
          totalOvertimeHours += (workedHrs - 8.0);
        }

        // Punctuality averages
        if (firstIn) {
          const arrivalMinutes = firstIn.getHours() * 60 + firstIn.getMinutes();
          employeeStats[empId].firstInTimes.push(arrivalMinutes);
          sumArrivalMinutes += arrivalMinutes;
          countArrivals++;

          // Late first IN (> 9:15 AM)
          if (arrivalMinutes > 9 * 60 + 15) {
            employeeStats[empId].lateCount++;
            totalLateCount++;
            if (dailyLateCounts[dateStr] !== undefined) {
              dailyLateCounts[dateStr]++;
            }
          }
        }

        if (lastOut) {
          const departureMinutes = lastOut.getHours() * 60 + lastOut.getMinutes();
          sumDepartureMinutes += departureMinutes;
          countDepartures++;

          // Early departure (< 5:00 PM)
          if (departureMinutes < 17 * 60) {
            employeeStats[empId].earlyCount++;
            totalEarlyDepartures++;
          }
        }
      });
    });

    const avgArrivalMinutes = countArrivals > 0 ? (sumArrivalMinutes / countArrivals) : 0;
    const avgArrHrs = Math.floor(avgArrivalMinutes / 60);
    const avgArrMins = Math.floor(avgArrivalMinutes % 60);
    const averageArrivalStr = countArrivals > 0 
      ? `${avgArrHrs === 0 ? 12 : avgArrHrs > 12 ? avgArrHrs - 12 : avgArrHrs}:${avgArrMins.toString().padStart(2, '0')} ${avgArrHrs >= 12 ? 'PM' : 'AM'}`
      : 'N/A';

    const avgDepartureMinutes = countDepartures > 0 ? (sumDepartureMinutes / countDepartures) : 0;
    const avgDepHrs = Math.floor(avgDepartureMinutes / 60);
    const avgDepMins = Math.floor(avgDepartureMinutes % 60);
    const averageDepartureStr = countDepartures > 0 
      ? `${avgDepHrs === 0 ? 12 : avgDepHrs > 12 ? avgDepHrs - 12 : avgDepHrs}:${avgDepMins.toString().padStart(2, '0')} ${avgDepHrs >= 12 ? 'PM' : 'AM'}`
      : 'N/A';

    // Leaderboards
    const allEmpList = Object.values(employeeStats);
    
    // Top 10 Punctual (lowest average arrival time)
    const mostPunctual = allEmpList
      .filter(x => x.firstInTimes.length > 0)
      .map(x => {
        const avg = x.firstInTimes.reduce((a, b) => a + b, 0) / x.firstInTimes.length;
        const hrs = Math.floor(avg / 60);
        const mins = Math.floor(avg % 60);
        const valStr = `${hrs === 0 ? 12 : hrs > 12 ? hrs - 12 : hrs}:${mins.toString().padStart(2, '0')} ${hrs >= 12 ? 'PM' : 'AM'}`;
        return { empId: x.empId, name: x.name, score: avg, valStr };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, 10);

    // Frequently Late (highest late count)
    const frequentlyLate = allEmpList
      .filter(x => x.lateCount > 0)
      .map(x => ({ empId: x.empId, name: x.name, lateCount: x.lateCount }))
      .sort((a, b) => b.lateCount - a.lateCount)
      .slice(0, 10);

    // Employees with zero attendance in range
    const noAttendance = [];
    Object.keys(targetEmployees).forEach(empId => {
      const stats = employeeStats[empId];
      if (!stats || stats.daysPresent === 0) {
        noAttendance.push({
          empId,
          name: targetEmployees[empId].name,
          department: targetEmployees[empId].department
        });
      }
    });

    // Leave count (toggled from employeeLeaves)
    let leaveCount = 0;
    Object.keys(employeeLeaves).forEach(empId => {
      if (employeeLeaves[empId] && targetEmployees[empId]) {
        leaveCount++;
      }
    });

    // Present & Absent counts today (for summary cards)
    const todayStr = currentTime.toDateString();
    const presentTodayCount = dailyPresence[todayStr] ? dailyPresence[todayStr].size : 0;
    const absentTodayCount = Math.max(0, totalDeptEmployees - presentTodayCount - leaveCount);
    
    // Average attendance percentage
    const dates = Object.keys(dailyPresence);
    let totalPresentRateSum = 0;
    dates.forEach(d => {
      const presCount = dailyPresence[d].size;
      const rate = totalDeptEmployees > 0 ? (presCount / totalDeptEmployees) * 100 : 0;
      totalPresentRateSum += rate;
    });
    const avgAttendanceRate = dates.length > 0 ? (totalPresentRateSum / dates.length) : 0;

    // Late Arrivals Heatmap (Mon-Sun vs Hour Slots 8 AM - 12 PM+)
    const heatmapData = Array.from({ length: 7 }, (_, day) => 
      Array.from({ length: 5 }, (_, hourIdx) => ({
        dayOfWeek: day,
        hourSlot: 8 + hourIdx, // 8: 8AM-9AM, 9: 9AM-10AM, 10: 10AM-11AM, 11: 11AM-12PM, 12: 12PM+
        count: 0
      }))
    );

    rangeLogs.forEach(log => {
      if (log.direction !== 'IN') return;
      const t = parseDBDate(log.timestamp);
      const day = t.getDay();
      const hr = t.getHours();
      
      // Check if first-IN of that day for employee was late
      const dateStr = t.toDateString();
      const dayLogs = groupedLogs[log.employee_id] ? groupedLogs[log.employee_id][dateStr] : [];
      if (dayLogs.length > 0) {
        const sortedDay = [...dayLogs].sort((a,b) => parseDBDate(a.timestamp) - parseDBDate(b.timestamp));
        if (sortedDay[0].log_id === log.log_id) { // is first IN of the day
          const arrivalMinutes = t.getHours() * 60 + t.getMinutes();
          if (arrivalMinutes > 9 * 60 + 15) { // late
            let hrIdx = hr - 8;
            if (hrIdx < 0) hrIdx = 0;
            if (hrIdx > 4) hrIdx = 4;
            heatmapData[day][hrIdx].count++;
          }
        }
      }
    });

    return {
      summary: {
        totalEmployees: totalDeptEmployees,
        presentToday: presentTodayCount,
        absentToday: absentTodayCount,
        leaveCount,
        attendanceRate: avgAttendanceRate,
        lateArrivals: totalLateCount,
        earlyDepartures: totalEarlyDepartures,
        averageArrivalStr,
        averageDepartureStr,
        totalOvertimeHours,
        averageWorkingHours: totalPresenceRecords > 0 ? (totalWorkedHoursSum / totalPresenceRecords) : 0
      },
      leaderboard: {
        mostPunctual,
        frequentlyLate
      },
      workingHoursTrend: Object.entries(dailyWorkedHours).map(([dateStr, v]) => ({
        dateStr,
        avgHours: v.count > 0 ? (v.totalHours / v.count) : 0,
        presentCount: v.count
      })),
      attendanceTrend: Object.entries(dailyPresence).map(([dateStr, set]) => ({
        dateStr,
        rate: totalDeptEmployees > 0 ? (set.size / totalDeptEmployees) * 100 : 0,
        presentCount: set.size
      })),
      heatmap: heatmapData,
      exceptions: {
        missingIn,
        missingOut,
        duplicates,
        noAttendance
      },
      employeeStats: allEmpList
    };
  }, [logs, employees, departmentFilter, employeeLeaves, analyticsDateScope, analyticsStartDate, analyticsEndDate, currentTime]);

  // ==========================================
  // 10. Pagination Calculators (useMemo)
  // ==========================================
  const totalLogsPages = useMemo(() => {
    return Math.ceil(filteredLogs.length / LOGS_PER_PAGE) || 1;
  }, [filteredLogs]);

  const totalPresencePages = useMemo(() => {
    const limit = profileItemsPerPage === 'All' ? sortedAndFilteredProfiles.length : profileItemsPerPage;
    return Math.ceil(sortedAndFilteredProfiles.length / limit) || 1;
  }, [sortedAndFilteredProfiles, profileItemsPerPage]);

  // Paginated content slices
  const paginatedLogs = useMemo(() => {
    const start = (logsPage - 1) * LOGS_PER_PAGE;
    return filteredLogs.slice(start, start + LOGS_PER_PAGE);
  }, [filteredLogs, logsPage]);

  const paginatedEmployees = useMemo(() => {
    if (profileItemsPerPage === 'All') return sortedAndFilteredProfiles;
    const start = (presencePage - 1) * profileItemsPerPage;
    return sortedAndFilteredProfiles.slice(start, start + profileItemsPerPage);
  }, [sortedAndFilteredProfiles, presencePage, profileItemsPerPage]);

  // ==========================================
  // 10. Hourly Peaks & Weekly Trends Analytics
  // ==========================================
  const hourlyPunchPeaks = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const buckets = hours.map(h => ({
      hour: h,
      label: h === 0 ? '12 AM' : h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`,
      IN: 0,
      OUT: 0,
      total: 0
    }));

    logsFilteredBySearch.forEach(log => {
      const d = parseDBDate(log.timestamp);
      const h = d.getHours();
      const bucket = buckets.find(b => b.hour === h);
      if (bucket) {
        bucket[log.direction]++;
        bucket.total++;
      }
    });

    return buckets;
  }, [logsFilteredBySearch]);

  const weeklyPresenceTrends = useMemo(() => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push({
        dateStr: d.toDateString(),
        label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        count: 0
      });
    }

    list.forEach(day => {
      const targetDate = new Date(day.dateStr);
      const uniqueEmps = new Set();
      
      logsFilteredBySearch.forEach(log => {
        const logDate = parseDBDate(log.timestamp);
        if (logDate.toDateString() === targetDate.toDateString() && log.direction === 'IN') {
          uniqueEmps.add(log.employee_id);
        }
      });
      
      day.count = uniqueEmps.size;
    });

    return list;
  }, [logsFilteredBySearch]);

  // Calculate employee analytics for selectedProfileEmpId
  const selectedEmployeeAnalytics = useMemo(() => {
    if (!selectedProfileEmpId) return null;

    // Get logs for this specific employee
    const empLogs = processedLogs.filter(log => log.employee_id === selectedProfileEmpId);
    
    // Sort chronologically ascending
    const sorted = [...empLogs].sort((a, b) => parseDBDate(a.timestamp) - parseDBDate(b.timestamp));

    // Group logs by day
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
          if (!firstInTime) {
            firstInTime = time;
          }
        } else if ((log.direction === 'OUT' || log.direction === 'SYS_OUT') && lastInTime) {
          dayWorkMs += (time - lastInTime);
          lastInTime = null;
        }
        lastPunchTime = time;
      });

      // Handle ongoing IN punch for today, or auto SYS_OUT completion for historical days
      if (lastInTime) {
        const isTodayStr = dateStr === new Date().toDateString();
        const endTime = isTodayStr ? new Date() : new Date(new Date(dateStr).setHours(23, 59, 59, 999));
        dayWorkMs += (endTime - lastInTime);
        lastPunchTime = endTime;
      }

      // Calculate break time for this day
      if (firstInTime && lastPunchTime) {
        const totalSpan = lastPunchTime - firstInTime;
        dayBreakMs = Math.max(0, totalSpan - dayWorkMs);
      }

      // Check on-time (first IN <= 9:15 AM)
      let isOnTime = false;
      if (firstInTime) {
        const hours = firstInTime.getHours();
        const minutes = firstInTime.getMinutes();
        const arrivalMinutes = hours * 60 + minutes;
        const targetMinutes = 9 * 60 + 15; // 09:15 AM
        if (arrivalMinutes <= targetMinutes) {
          isOnTime = true;
          onTimeDaysCount++;
        }
      }

      // Check goal met (work hours >= 7)
      const hoursWorked = dayWorkMs / 1000 / 60 / 60;
      const isGoalMet = hoursWorked >= 7;
      if (isGoalMet) {
        goalMetDaysCount++;
      }

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

    // Sort summaries descending (most recent first)
    daySummaries.sort((a, b) => new Date(b.dateStr) - new Date(a.dateStr));

    const avgWorkHours = daysPresentCount > 0 ? (totalWorkMs / 1000 / 60 / 60) / daysPresentCount : 0;
    const avgBreakHours = daysPresentCount > 0 ? (totalBreakMs / 1000 / 60 / 60) / daysPresentCount : 0;
    const goalComplianceRate = daysPresentCount > 0 ? (goalMetDaysCount / daysPresentCount) * 100 : 0;
    const punctualityRate = daysPresentCount > 0 ? (onTimeDaysCount / daysPresentCount) * 100 : 0;

    return {
      daysPresentCount,
      avgWorkHours,
      avgBreakHours,
      goalComplianceRate,
      punctualityRate,
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
      
      days.push({
        date: d,
        summary
      });
    }
    return days;
  }, [selectedEmployeeAnalytics]);

  // Dynamic grid lines computed outside of JSX to follow Rules of Hooks
  const hourlyGridLines = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const yVal = 15 + 140 * (1 - ratio);
      return { ratio, yVal };
    });
  }, []);

  const weeklyGridLines = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const yVal = 15 + 140 * (1 - ratio);
      return { ratio, yVal };
    });
  }, []);

  // Helper to compile horizontal timeline sparkline segments
  const getTimelineSegments = (punchesToday, currentTime) => {
    if (!punchesToday || punchesToday.length === 0) {
      return [];
    }

    const sortedPunches = [...punchesToday].sort((a, b) => parseDBDate(a.timestamp) - parseDBDate(b.timestamp));

    const firstPunchTime = parseDBDate(sortedPunches[0].timestamp);
    const lastPunch = sortedPunches[sortedPunches.length - 1];
    const lastPunchTime = lastPunch.direction === 'IN' ? currentTime : parseDBDate(lastPunch.timestamp);

    const defaultStart = new Date(currentTime);
    defaultStart.setHours(8, 0, 0, 0); // 8:00 AM
    
    const defaultEnd = new Date(currentTime);
    defaultEnd.setHours(20, 0, 0, 0); // 8:00 PM

    const start = firstPunchTime < defaultStart ? firstPunchTime : defaultStart;
    const end = lastPunchTime > defaultEnd ? lastPunchTime : defaultEnd;
    const totalDuration = end - start;

    if (totalDuration <= 0) return [];

    const segments = [];
    
    const addSegment = (segStart, segEnd, type) => {
      const duration = segEnd - segStart;
      if (duration <= 0) return;
      const widthPercent = (duration / totalDuration) * 100;
      segments.push({
        type, // 'active' | 'break' | 'away'
        width: widthPercent,
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
          const isBeforeFirstPunch = cursor <= firstPunchTime;
          const type = isBeforeFirstPunch ? 'away' : 'break';
          addSegment(cursor, punchTime, type);
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
      if (currentTime < end) {
        addSegment(currentTime, end, 'away');
      }
    } else {
      if (cursor < end) {
        addSegment(cursor, end, 'away');
      }
    }

    return segments;
  };

  // ==========================================
  // 11. Upgraded Export Helpers & Handlers
  // ==========================================

  // Perform database query for requested date range
  const fetchExportData = async () => {
    const { startISO, endISO } = getDateRangeBounds(exportDateRange, exportStartDate, exportEndDate);
    
    setIsFetchingExportData(true);
    try {
      if (!isSupabaseMode || !supabase) {
        // Fallback filter using processedLogs
        let filtered = processedLogs.filter(l => l.timestamp >= startISO && l.timestamp <= endISO);
        if (exportEmployeeFilter === 'single') {
          filtered = filtered.filter(l => l.employee_id === exportSelectedEmployee);
        } else if (exportEmployeeFilter === 'group') {
          filtered = filtered.filter(l => exportSelectedEmployeesGroup.includes(l.employee_id));
        }
        return filtered;
      }

      let query = supabase
        .from('biometric_logs')
        .select('*')
        .gte('timestamp', startISO)
        .lte('timestamp', endISO);

      if (exportEmployeeFilter === 'single') {
        query = query.eq('employee_id', exportSelectedEmployee);
      } else if (exportEmployeeFilter === 'group') {
        if (exportSelectedEmployeesGroup.length > 0) {
          query = query.in('employee_id', exportSelectedEmployeesGroup);
        } else {
          return [];
        }
      }

      const { data, error } = await query.order('timestamp', { ascending: false });

      if (error) throw error;

      const mapped = (data || [])
        .filter(log => employees[log.employee_id]) // ONLY include active employees (excludes company 'X')
        .map(log => ({
          log_id: `LOG-${log.id}`,
          employee_id: log.employee_id,
          timestamp: log.timestamp,
          direction: log.direction
        }));

      return injectVirtualLogs(mapped, currentTime);
    } catch (e) {
      console.error("Historical log query failed:", e);
      let filtered = processedLogs.filter(l => l.timestamp >= startISO && l.timestamp <= endISO);
      if (exportEmployeeFilter === 'single') {
        filtered = filtered.filter(l => l.employee_id === exportSelectedEmployee);
      } else if (exportEmployeeFilter === 'group') {
        filtered = filtered.filter(l => exportSelectedEmployeesGroup.includes(l.employee_id));
      }
      return filtered;
    } finally {
      setIsFetchingExportData(false);
    }
  };

  // Compile multi-day timesheet
  const compileTimesheetData = (fetchedLogs) => {
    const timesheet = {};
    
    // Get target employee list based on the active selection filter
    let targetEmpIds = Object.keys(employees);
    if (exportEmployeeFilter === 'single') {
      targetEmpIds = [exportSelectedEmployee];
    } else if (exportEmployeeFilter === 'group') {
      targetEmpIds = exportSelectedEmployeesGroup;
    }
    
    // Initialize structure only for targeted employees
    targetEmpIds.forEach(empId => {
      if (!employees[empId]) return;
      timesheet[empId] = {
        empId,
        name: employees[empId].name,
        totalHours: 0,
        totalBreakHours: 0,
        daysPresent: new Set(),
        punchesCount: 0
      };
    });

    const sortedLogs = [...fetchedLogs].sort((a, b) => parseDBDate(a.timestamp) - parseDBDate(b.timestamp));
    const groupedByEmployeeAndDay = {};

    sortedLogs.forEach(log => {
      const empId = log.employee_id;
      if (!timesheet[empId]) return;

      timesheet[empId].punchesCount++;
      const dateStr = parseDBDate(log.timestamp).toDateString();
      timesheet[empId].daysPresent.add(dateStr);

      if (!groupedByEmployeeAndDay[empId]) groupedByEmployeeAndDay[empId] = {};
      if (!groupedByEmployeeAndDay[empId][dateStr]) groupedByEmployeeAndDay[empId][dateStr] = [];
      groupedByEmployeeAndDay[empId][dateStr].push(log);
    });

    Object.keys(groupedByEmployeeAndDay).forEach(empId => {
      const daysMap = groupedByEmployeeAndDay[empId];
      let empTotalMs = 0;
      let empTotalBreakMs = 0;

      Object.keys(daysMap).forEach(dateStr => {
        const dayLogs = daysMap[dateStr];
        let lastInTime = null;
        let dayMs = 0;
        let firstInTime = null;
        let lastPunchTime = null;

        dayLogs.forEach(log => {
          const time = parseDBDate(log.timestamp);
          if (log.direction === 'IN') {
            lastInTime = time;
            if (!firstInTime) {
              firstInTime = time;
            }
          } else if ((log.direction === 'OUT' || log.direction === 'SYS_OUT') && lastInTime) {
            dayMs += (time - lastInTime);
            lastInTime = null;
          }
          lastPunchTime = time;
        });

        if (lastInTime) {
          const isToday = dateStr === new Date().toDateString();
          const endTime = isToday ? new Date() : new Date(new Date(dateStr).setHours(23, 59, 59, 999));
          dayMs += (endTime - lastInTime);
          lastPunchTime = endTime;
        }

        empTotalMs += dayMs;

        // Calculate break time for this day
        if (firstInTime && lastPunchTime) {
          const totalSpanMs = lastPunchTime - firstInTime;
          const dayBreakMs = Math.max(0, totalSpanMs - dayMs);
          empTotalBreakMs += dayBreakMs;
        }
      });

      timesheet[empId].totalHours = empTotalMs / 1000 / 60 / 60;
      timesheet[empId].totalBreakHours = empTotalBreakMs / 1000 / 60 / 60;
    });

    return Object.values(timesheet);
  };

  // Preview Data Fetcher Effect
  useEffect(() => {
    if (activeTab !== 'export') return;

    let isCancelled = false;
    const updatePreview = async () => {
      setIsPreviewLoading(true);
      const { startISO, endISO } = getDateRangeBounds(exportDateRange, exportStartDate, exportEndDate);
      
      try {
        let fetched = [];
        if (!isSupabaseMode || !supabase) {
          // Fallback filter using processedLogs
          fetched = processedLogs.filter(l => l.timestamp >= startISO && l.timestamp <= endISO);
        } else {
          let query = supabase
            .from('biometric_logs')
            .select('*')
            .gte('timestamp', startISO)
            .lte('timestamp', endISO);
            
          if (exportEmployeeFilter === 'single') {
            query = query.eq('employee_id', exportSelectedEmployee);
          } else if (exportEmployeeFilter === 'group') {
            if (exportSelectedEmployeesGroup.length > 0) {
              query = query.in('employee_id', exportSelectedEmployeesGroup);
            } else {
              query = null;
            }
          }

          if (query) {
            const { data, error } = await query.order('timestamp', { ascending: false });
            if (!error && data) {
              const mapped = data
                .filter(log => employees[log.employee_id]) // ONLY include active employees (excludes company 'X')
                .map(log => ({
                  log_id: `LOG-${log.id}`,
                  employee_id: log.employee_id,
                  timestamp: log.timestamp,
                  direction: log.direction
                }));
              fetched = injectVirtualLogs(mapped, currentTime);
            }
          }
        }

        // Apply employee filtering on fallback if needed
        if (!isSupabaseMode || !supabase) {
          if (exportEmployeeFilter === 'single') {
            fetched = fetched.filter(l => l.employee_id === exportSelectedEmployee);
          } else if (exportEmployeeFilter === 'group') {
            fetched = fetched.filter(l => exportSelectedEmployeesGroup.includes(l.employee_id));
          }
        }

        if (!isCancelled) {
          setPreviewLogs(fetched);
          const compiled = compileTimesheetData(fetched);
          setPreviewTimesheet(compiled);
        }
      } catch (err) {
        console.error("Failed to update report preview:", err);
      } finally {
        if (!isCancelled) {
          setIsPreviewLoading(false);
        }
      }
    };

    updatePreview();

    return () => {
      isCancelled = true;
    };
  }, [
    exportReportType,
    exportDateRange,
    exportStartDate,
    exportEndDate,
    exportEmployeeFilter,
    exportSelectedEmployee,
    exportSelectedEmployeesGroup,
    activeTab,
    processedLogs,
    employees,
    isSupabaseMode
  ]);

  // Compile CSV string
  const getReportCSVString = (type, fetchedLogs, timesheetList) => {
    if (type === 'logs') {
      const headers = ["Log ID", "Employee ID", "Employee Name", "Direction", "Date", "Time"];
      const rows = fetchedLogs.map(log => {
        const emp = employees[log.employee_id] || { name: "Unknown Employee" };
        const d = parseDBDate(log.timestamp);
        const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        
        return [
          log.log_id,
          log.employee_id,
          `"${emp.name.replace(/"/g, '""')}"`,
          log.direction,
          `"${dateStr}"`,
          `"${timeStr}"`
        ];
      });
      return [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    } else {
      const headers = ["Employee ID", "Employee Name", "Days Present", "Total Punches", "Total Hours Worked", "Total Break Hours", "Avg Daily Hours", "Goal Completion Status"];
      const rows = timesheetList.map(item => {
        const avgHours = item.daysPresent.size > 0 ? (item.totalHours / item.daysPresent.size) : 0;
        const goalStatus = avgHours >= 7 ? 'Completed' : 'Incomplete';
        
        const formattedTotalHours = `${Math.floor(item.totalHours)}h ${Math.round((item.totalHours % 1) * 60)}m`;
        const formattedBreakHours = `${Math.floor(item.totalBreakHours || 0)}h ${Math.round(((item.totalBreakHours || 0) % 1) * 60)}m`;
        const formattedAvgHours = `${Math.floor(avgHours)}h ${Math.round((avgHours % 1) * 60)}m`;

        return [
          item.empId,
          `"${item.name.replace(/"/g, '""')}"`,
          item.daysPresent.size,
          item.punchesCount,
          `"${formattedTotalHours}"`,
          `"${formattedBreakHours}"`,
          `"${formattedAvgHours}"`,
          goalStatus
        ];
      });
      return [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    }
  };

  // Action: Download CSV (With Excel BOM prepended)
  const handleDownloadExport = async () => {
    const fetchedLogs = await fetchExportData();
    const timesheetList = compileTimesheetData(fetchedLogs);
    const csvContent = getReportCSVString(exportReportType, fetchedLogs, timesheetList);
    
    // Prepend UTF-8 BOM byte marker so Excel opens it with proper encoding
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${exportReportType}_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setExportSuccess(true);
    setTimeout(() => {
      setExportSuccess(false);
    }, 1200);
  };

  // Action: Copy CSV string to Clipboard
  const handleClipboardExport = async () => {
    const fetchedLogs = await fetchExportData();
    const timesheetList = compileTimesheetData(fetchedLogs);
    const csvContent = getReportCSVString(exportReportType, fetchedLogs, timesheetList);
    
    navigator.clipboard.writeText(csvContent)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => {
          setCopySuccess(false);
        }, 1200);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  // Action: Export Multi-Sheet XLSX (SheetJS)
  const handleExportXLSX = async () => {
    try {
      const fetchedLogs = await fetchExportData();
      const timesheetList = compileTimesheetData(fetchedLogs);
      
      const { startISO, endISO } = getDateRangeBounds(exportDateRange, exportStartDate, exportEndDate);
      const startStr = new Date(startISO).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const endStr = new Date(endISO).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      // Sheet 1: Summary Dashboard
      const deptEmployeesMap = {};
      Object.entries(employees).forEach(([empId, emp]) => {
        if (departmentFilter === 'All' || emp.department === departmentFilter) {
          deptEmployeesMap[empId] = emp;
        }
      });
      const totalScopedEmployees = Object.keys(deptEmployeesMap).length;

      let totalLateCount = 0;
      let totalEarlyDepartures = 0;
      let sumArrivalMinutes = 0;
      let countArrivals = 0;
      let totalWorkedHours = 0;
      let totalOvertimeHours = 0;
      let totalDaysPresent = 0;

      timesheetList.forEach(item => {
        totalWorkedHours += item.totalHours;
        totalDaysPresent += item.daysPresent.size;

        const avgHours = item.daysPresent.size > 0 ? (item.totalHours / item.daysPresent.size) : 0;
        if (avgHours > 8.0) {
          totalOvertimeHours += (item.totalHours - (item.daysPresent.size * 8.0));
        }

        // Parse day logs to get first In & last Out
        const empLogs = fetchedLogs.filter(l => l.employee_id === item.empId);
        // Group by date
        const dateGroups = {};
        empLogs.forEach(log => {
          const t = parseDBDate(log.timestamp);
          const dStr = t.toDateString();
          if (!dateGroups[dStr]) dateGroups[dStr] = [];
          dateGroups[dStr].push(log);
        });

        Object.values(dateGroups).forEach(dayLogs => {
          const sorted = [...dayLogs].sort((a,b) => parseDBDate(a.timestamp) - parseDBDate(b.timestamp));
          const firstInLog = sorted.find(l => l.direction === 'IN');
          const lastOutLog = [...sorted].reverse().find(l => l.direction === 'OUT' || l.direction === 'SYS_OUT');

          if (firstInLog) {
            const t = parseDBDate(firstInLog.timestamp);
            const arrivalMinutes = t.getHours() * 60 + t.getMinutes();
            sumArrivalMinutes += arrivalMinutes;
            countArrivals++;
            if (arrivalMinutes > 9 * 60 + 15) {
              totalLateCount++;
            }
          }
          if (lastOutLog) {
            const t = parseDBDate(lastOutLog.timestamp);
            const departureMinutes = t.getHours() * 60 + t.getMinutes();
            if (departureMinutes < 17 * 60) {
              totalEarlyDepartures++;
            }
          }
        });
      });

      const avgArrivalMinutes = countArrivals > 0 ? (sumArrivalMinutes / countArrivals) : 0;
      const avgArrHrs = Math.floor(avgArrivalMinutes / 60);
      const avgArrMins = Math.floor(avgArrivalMinutes % 60);
      const averageArrivalStr = countArrivals > 0 
        ? `${avgArrHrs === 0 ? 12 : avgArrHrs > 12 ? avgArrHrs - 12 : avgArrHrs}:${avgArrMins.toString().padStart(2, '0')} ${avgArrHrs >= 12 ? 'PM' : 'AM'}`
        : 'N/A';

      const summaryData = [
        ['DPI Attendance Analytics - Summary Report', ''],
        ['Report Parameter', 'Value'],
        ['Company Name', pdfCompanyName],
        ['Department Scope', departmentFilter === 'All' ? 'All Departments' : departmentFilter],
        ['Date Range', `${startStr} to ${endStr}`],
        ['Generated On', new Date().toLocaleString('en-IN')],
        ['', ''],
        ['Workforce KPIs', ''],
        ['Total Employees Scoped', totalScopedEmployees],
        ['Total Working Days Present', totalDaysPresent],
        ['Average First IN Time', averageArrivalStr],
        ['Total Worked Hours', parseFloat(totalWorkedHours.toFixed(2))],
        ['Total Overtime Hours', parseFloat(Math.max(0, totalOvertimeHours).toFixed(2))],
        ['Total Late Arrivals (>9:15 AM)', totalLateCount],
        ['Total Early Departures (<5:00 PM)', totalEarlyDepartures],
      ];

      // Sheet 2: Employee Metrics
      const metricsHeaders = [
        'Employee ID', 'Name', 'Department', 'Days Present', 'Punches Count', 
        'Total Hours Worked', 'Total Break Hours', 'Avg Daily Hours', 'Goal Status'
      ];
      const metricsRows = timesheetList.map(item => {
        const avgHours = item.daysPresent.size > 0 ? (item.totalHours / item.daysPresent.size) : 0;
        const goalStatus = avgHours >= 7 ? 'Completed' : 'Incomplete';
        return [
          item.empId,
          item.name,
          employees[item.empId]?.department || 'N/A',
          item.daysPresent.size,
          item.punchesCount,
          parseFloat(item.totalHours.toFixed(2)),
          parseFloat((item.totalBreakHours || 0).toFixed(2)),
          parseFloat(avgHours.toFixed(2)),
          goalStatus
        ];
      });
      const metricsData = [metricsHeaders, ...metricsRows];

      // Sheet 3: Raw Logs
      const logsHeaders = ['Log ID', 'Employee ID', 'Employee Name', 'Department', 'Timestamp', 'Direction', 'Device Code'];
      const logsRows = fetchedLogs.map(log => {
        const emp = employees[log.employee_id] || {};
        const localTimeStr = parseDBDate(log.timestamp).toLocaleString('en-IN', { hour12: true });
        return [
          log.log_id,
          log.employee_id,
          emp.name || 'Unknown',
          emp.department || 'N/A',
          localTimeStr,
          log.direction,
          log.device_code || 'N/A'
        ];
      });
      const logsData = [logsHeaders, ...logsRows];

      // Create SheetJS workbook and sheets
      const wb = XLSX.utils.book_new();

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      const wsMetrics = XLSX.utils.aoa_to_sheet(metricsData);
      const wsLogs = XLSX.utils.aoa_to_sheet(logsData);

      // Auto-fit column widths
      [wsSummary, wsMetrics, wsLogs].forEach(ws => {
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
        const cols = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
          let maxLen = 10;
          for (let R = range.s.r; R <= range.e.r; ++R) {
            const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
            if (cell && cell.v) {
              const len = cell.v.toString().length;
              if (len > maxLen) maxLen = len;
            }
          }
          cols.push({ wch: maxLen + 2 });
        }
        ws['!cols'] = cols;
      });

      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary Overview');
      XLSX.utils.book_append_sheet(wb, wsMetrics, 'Employee Metrics');
      XLSX.utils.book_append_sheet(wb, wsLogs, 'Raw Logs');

      // Write to file
      XLSX.writeFile(wb, `biometric_analytics_${departmentFilter.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`);

      setExportSuccess(true);
      setTimeout(() => {
    }, 1200);
  } catch (err) {
    console.error('XLSX export failed:', err);
  }
};

// Action: Download PDF Report
const handleDownloadPDFReport = async () => {
  setIsFetchingExportData(true);
  try {
    const fetchedLogs = await fetchExportData();
    const timesheetList = compileTimesheetData(fetchedLogs);
    const { startISO, endISO } = getDateRangeBounds(exportDateRange, exportStartDate, exportEndDate);
    
    const startStr = new Date(startISO).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const endStr = new Date(endISO).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    // Set colors according to selected theme
    const themes = {
      slate: { primary: '#475569', accent: '#f8fafc', border: '#cbd5e1' },
      blue: { primary: '#1d4ed8', accent: '#eff6ff', border: '#bfdbfe' },
      emerald: { primary: '#047857', accent: '#ecfdf5', border: '#a7f3d0' },
      indigo: { primary: '#4338ca', accent: '#eef2ff', border: '#c7d2fe' }
    };
    const activeTheme = themes[pdfThemeColor] || themes.blue;

    const logoHtml = `
      <img src="/dpi.png" alt="DPI Logo" style="width: 28px; height: 28px; object-fit: contain; vertical-align: middle;" />
    `;

    let title = '';
    let contentHtml = '';

    if (exportReportType === 'logs') {
      title = 'Detailed Biometric Punch Logs';
      const logChunks = chunkArray(fetchedLogs, 20);

      // Determine log headers to render
      const headers = [];
      if (pdfLogColumns.logId) headers.push('<th>Log ID</th>');
      if (pdfLogColumns.empId) headers.push('<th>Employee ID</th>');
      if (pdfLogColumns.empName) headers.push('<th>Employee Name</th>');
      if (pdfLogColumns.direction) headers.push('<th>Direction</th>');
      if (pdfLogColumns.date) headers.push('<th>Date</th>');
      if (pdfLogColumns.time) headers.push('<th>Time</th>');
      const headersHtml = `<tr>${headers.join('')}</tr>`;

      contentHtml = logChunks.map((chunk, index) => {
        const rowsHtml = chunk.map(log => {
          const emp = employees[log.employee_id] || { name: 'Unknown Employee' };
          const d = parseDBDate(log.timestamp);
          
          const cells = [];
          if (pdfLogColumns.logId) cells.push(`<td>${log.log_id}</td>`);
          if (pdfLogColumns.empId) cells.push(`<td>${log.employee_id}</td>`);
          if (pdfLogColumns.empName) cells.push(`<td><strong>${emp.name}</strong></td>`);
          if (pdfLogColumns.direction) {
            cells.push(`
              <td>
                <span class="badge ${log.direction === 'IN' ? 'badge-in' : log.direction === 'SYS_OUT' ? 'badge-sys-out' : 'badge-out'}">${log.direction === 'SYS_OUT' ? 'SYS OUT' : log.direction}</span>
              </td>
            `);
          }
          if (pdfLogColumns.date) cells.push(`<td>${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>`);
          if (pdfLogColumns.time) cells.push(`<td>${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</td>`);
          
          return `<tr>${cells.join('')}</tr>`;
        }).join('');

        const tableHtml = `
          <table class="report-table">
            <thead>
              ${headersHtml}
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        `;

        return `
          <div class="page-container">
            <div class="header">
              <div style="display: flex; align-items: center; gap: 10px;">
                ${logoHtml}
                <div>
                  <h1 class="title">${pdfCompanyName}</h1>
                  <div class="subtitle">${title}</div>
                </div>
              </div>
              <div class="meta-info">
                <div><strong>Report Range:</strong> ${startStr} - ${endStr}</div>
                <div><strong>Generated On:</strong> ${new Date().toLocaleString('en-IN')}</div>
                <div><strong>Page:</strong> ${index + 1} of ${logChunks.length}</div>
              </div>
            </div>
            
            <div class="main-content">
              ${tableHtml}
            </div>
            
            <div class="footer">
              <div>
                <p style="font-size: 9px; color: #94a3b8; margin: 0; max-width: 400px; line-height: 1.3;">${pdfComments}</p>
              </div>
              <div class="signature-box">
                Authorized Signature
              </div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      title = 'Workforce Attendance Timesheet';
      const timesheetChunks = chunkArray(timesheetList, 15);

      // Determine timesheet headers to render
      const headers = [];
      if (pdfTimesheetColumns.empId) headers.push('<th>Employee ID</th>');
      if (pdfTimesheetColumns.empName) headers.push('<th>Employee Name</th>');
      if (pdfTimesheetColumns.daysPresent) headers.push('<th>Days Present</th>');
      if (pdfTimesheetColumns.punchesCount) headers.push('<th>Total Punches</th>');
      if (pdfTimesheetColumns.totalHours) headers.push('<th>Total Hours Worked</th>');
      if (pdfTimesheetColumns.totalBreakHours) headers.push('<th>Total Break Hours</th>');
      if (pdfTimesheetColumns.avgDailyHours) headers.push('<th>Avg Daily Hours</th>');
      if (pdfTimesheetColumns.goalStatus) headers.push('<th>Shift Goal Status</th>');
      const headersHtml = `<tr>${headers.join('')}</tr>`;

      contentHtml = timesheetChunks.map((chunk, index) => {
        const rowsHtml = chunk.map(item => {
          const rawTotalMins = item.totalMins || 0;
          const formattedTotalHours = `${Math.floor(rawTotalMins / 60)}h ${Math.round(rawTotalMins % 60)}m`;
          const rawBreakMins = item.breakMins || 0;
          const formattedBreakHours = `${Math.floor(rawBreakMins / 60)}h ${Math.round(rawBreakMins % 60)}m`;
          const rawAvgMins = item.avgMins || 0;
          const formattedAvgHours = `${Math.floor(rawAvgMins / 60)}h ${Math.round(rawAvgMins % 60)}m`;
          
          const cells = [];
          if (pdfTimesheetColumns.empId) cells.push(`<td>${item.empId}</td>`);
          if (pdfTimesheetColumns.empName) cells.push(`<td><strong>${item.name}</strong></td>`);
          if (pdfTimesheetColumns.daysPresent) cells.push(`<td>${item.daysPresent.size}</td>`);
          if (pdfTimesheetColumns.punchesCount) cells.push(`<td>${item.punchesCount}</td>`);
          if (pdfTimesheetColumns.totalHours) cells.push(`<td>${formattedTotalHours}</td>`);
          if (pdfTimesheetColumns.totalBreakHours) cells.push(`<td>${formattedBreakHours}</td>`);
          if (pdfTimesheetColumns.avgDailyHours) cells.push(`<td>${formattedAvgHours}</td>`);
          if (pdfTimesheetColumns.goalStatus) {
            const meetsGoal = item.meetsGoal;
            cells.push(`
              <td>
                <span class="badge ${meetsGoal ? 'badge-in' : 'badge-out'}">${meetsGoal ? 'MEETS GOAL' : 'BELOW GOAL'}</span>
              </td>
            `);
          }
          
          return `<tr>${cells.join('')}</tr>`;
        }).join('');

        const tableHtml = `
          <table class="report-table">
            <thead>
              ${headersHtml}
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        `;

        return `
          <div class="page-container">
            <div class="header">
              <div style="display: flex; align-items: center; gap: 10px;">
                ${logoHtml}
                <div>
                  <h1 class="title">${pdfCompanyName}</h1>
                  <div class="subtitle">${title}</div>
                </div>
              </div>
              <div class="meta-info">
                <div><strong>Report Range:</strong> ${startStr} - ${endStr}</div>
                <div><strong>Generated On:</strong> ${new Date().toLocaleString('en-IN')}</div>
                <div><strong>Page:</strong> ${index + 1} of ${timesheetChunks.length}</div>
              </div>
            </div>
            
            <div class="main-content">
              ${tableHtml}
            </div>
            
            <div class="footer">
              <div>
                <p style="font-size: 9px; color: #94a3b8; margin: 0; max-width: 400px; line-height: 1.3;">${pdfComments}</p>
              </div>
              <div class="signature-box">
                Authorized Signature
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    const styles = `
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; line-height: 1.5; background: #ffffff; }
        .page-container {
          box-sizing: border-box;
          padding: 15mm 20mm;
          height: 1123px;
          width: 794px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: #ffffff;
          border-bottom: 1px dashed #e2e8f0;
        }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid ${activeTheme.border}; padding-bottom: 12px; margin-bottom: 12px; }
        .title { font-size: 16px; font-weight: 800; color: ${activeTheme.primary}; margin: 0; }
        .subtitle { font-size: 10px; color: #64748b; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: bold; }
        .meta-info { text-align: right; font-size: 9px; color: #475569; line-height: 1.4; }
        .main-content { flex-grow: 1; }
        table.report-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        table.report-table th { background: ${activeTheme.accent}; font-size: 10px; font-weight: 800; text-transform: uppercase; color: ${activeTheme.primary}; text-align: left; padding: 8px 10px; border-bottom: 2px solid ${activeTheme.border}; }
        table.report-table td { font-size: 10px; padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
        table.report-table tr:nth-child(even) { background: #f8fafc; }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase; }
        .badge-in { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
        .badge-sys-out { background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; }
        .badge-out { background: #ffe4e6; color: #b91c1c; border: 1px solid #fecdd3; }
        .footer { border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; }
        .signature-box { width: 180px; text-align: center; border-top: 1px solid ${activeTheme.primary}; padding-top: 8px; font-size: 10px; color: #64748b; font-weight: bold; }
      </style>
    `;

    // Set HTML content to state to render in the hidden container
    setPdfReportHtml(`${styles}<div>${contentHtml}</div>`);
    
    // Trigger the canvas compiler in next tick
    setTimeout(async () => {
      try {
        const element = document.getElementById('pdf-report-render-target');
        if (!element) {
          console.error('Render target element not found');
          setIsFetchingExportData(false);
          return;
        }

        setIsGeneratingPDF(true);

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const pageCanvasHeight = (canvas.width * pdfHeight) / pdfWidth;
        let heightLeft = canvas.height;
        let sY = 0;
        let isFirstPage = true;

        while (heightLeft > 0) {
          if (!isFirstPage) {
            pdf.addPage();
          }
          isFirstPage = false;

          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = Math.min(pageCanvasHeight, heightLeft);

          const ctx = pageCanvas.getContext('2d');
          ctx.drawImage(
            canvas,
            0, sY, canvas.width, pageCanvas.height,
            0, 0, pageCanvas.width, pageCanvas.height
          );

          const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
          const currentPdfPageHeight = (pageCanvas.height * pdfWidth) / canvas.width;

          pdf.addImage(pageImgData, 'JPEG', 0, 0, pdfWidth, currentPdfPageHeight);

          sY += pageCanvasHeight;
          heightLeft -= pageCanvasHeight;
        }

        const fileName = `${pdfCompanyName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report_${new Date().toISOString().slice(0, 10)}.pdf`;
        pdf.save(fileName);

        setExportSuccess(true);
        setTimeout(() => {
          setExportSuccess(false);
        }, 1200);
      } catch (canvasErr) {
        console.error('Error compiling PDF canvas:', canvasErr);
      } finally {
        setIsGeneratingPDF(false);
        setPdfReportHtml(null);
        setIsFetchingExportData(false);
      }
    }, 600);

  } catch (err) {
    console.error('PDF export failed:', err);
    setIsFetchingExportData(false);
    setIsGeneratingPDF(false);
    setPdfReportHtml(null);
  }
};

  const handleDownloadIndividualPDF = async () => {
    if (!selectedProfileEmpId || !selectedEmployeeAnalytics) return;
    
    const emp = employees[selectedProfileEmpId] || { name: 'Employee', department: 'General' };
    const stats = selectedEmployeeAnalytics;
    
    // Set colors according to selected theme or a default deep blue theme
    const activeTheme = { primary: '#1e293b', accent: '#f8fafc', border: '#e2e8f0' };

    const logoHtml = `
      <div style="font-size: 16px; font-weight: 900; color: #1e293b; letter-spacing: 0.5px;">DPI BIOMETRIC SYSTEM</div>
    `;

    const styles = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=JetBrains+Mono:wght@700&display=swap');
        #pdf-report-render-target * {
          font-family: 'Inter', -apple-system, sans-serif !important;
          box-sizing: border-box;
        }
        .header {
          padding: 20px 24px;
          border-bottom: 2px solid ${activeTheme.primary};
          background-color: ${activeTheme.accent};
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .title {
          font-size: 18px;
          font-weight: 900;
          color: ${activeTheme.primary};
          margin: 0;
          text-transform: uppercase;
        }
        .meta-grid {
          display: grid;
          grid-template-cols: 1fr 1fr;
          gap: 16px;
          padding: 20px 24px;
          background-color: #ffffff;
        }
        .meta-box {
          border: 1px solid ${activeTheme.border};
          padding: 12px;
          border-radius: 8px;
        }
        .meta-label {
          font-size: 9px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .meta-value {
          font-size: 12px;
          font-weight: 800;
          color: #0f172a;
        }
        .stats-grid {
          display: grid;
          grid-template-cols: repeat(4, 1fr);
          gap: 12px;
          padding: 0 24px 20px 24px;
        }
        .stat-card {
          background-color: ${activeTheme.accent};
          border: 1px solid ${activeTheme.border};
          border-radius: 8px;
          padding: 12px;
          text-align: center;
        }
        .stat-num {
          font-size: 16px;
          font-weight: 900;
          color: ${activeTheme.primary};
          margin-top: 4px;
        }
        .section-title {
          font-size: 11px;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 0 24px;
          margin: 16px 0 8px 0;
        }
        table {
          width: calc(100% - 48px);
          margin: 0 24px 24px 24px;
          border-collapse: collapse;
          font-size: 10px;
        }
        th {
          background-color: ${activeTheme.primary};
          color: white;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 8px;
          letter-spacing: 0.5px;
          padding: 8px 10px;
          text-align: left;
        }
        td {
          padding: 8px 10px;
          border-bottom: 1px solid ${activeTheme.border};
          color: #334155;
        }
        tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .badge {
          display: inline-block;
          font-size: 8px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .badge-green { background-color: #dcfce7; color: #15803d; }
        .badge-red { background-color: #fee2e2; color: #b91c1c; }
        .badge-amber { background-color: #fef3c7; color: #b45309; }
      </style>
    `;

    const contentHtml = `
      <div style="background-color: white; padding-bottom: 24px;">
        <div class="header">
          <div>
            ${logoHtml}
            <h1 class="title" style="margin-top: 4px;">Individual Performance Report</h1>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 9px; font-weight: 600; color: #64748b;">Report Generated</div>
            <div style="font-size: 11px; font-weight: 800; color: #0f172a; margin-top: 2px;">${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-box">
            <div class="meta-label">Employee Details</div>
            <div class="meta-value">${emp.name}</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">ID: ${selectedProfileEmpId}</div>
          </div>
          <div class="meta-box">
            <div class="meta-label">Department</div>
            <div class="meta-value">${emp.department}</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Role: Staff Member</div>
          </div>
        </div>

        <div class="section-title">Performance Summary</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="meta-label">Goal Compliance</div>
            <div class="stat-num">${Math.round(stats.goalComplianceRate)}%</div>
          </div>
          <div class="stat-card">
            <div class="meta-label">On-Time Arrival</div>
            <div class="stat-num">${Math.round(stats.punctualityRate)}%</div>
          </div>
          <div class="stat-card">
            <div class="meta-label">Avg Daily Hours</div>
            <div class="stat-num">${Math.floor(stats.avgWorkHours)}h ${Math.round((stats.avgWorkHours % 1) * 60)}m</div>
          </div>
          <div class="stat-card">
            <div class="meta-label">Days Present</div>
            <div class="stat-num">${stats.daysPresentCount} Days</div>
          </div>
        </div>

        <div class="section-title">Daily Attendance Logs</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>First In</th>
              <th>Last Out</th>
              <th>Work Hours</th>
              <th>Break Hours</th>
              <th>Compliance</th>
            </tr>
          </thead>
          <tbody>
            ${stats.daySummaries.map(day => `
              <tr>
                <td style="font-weight: 700; color: #0f172a;">${day.dateStr}</td>
                <td style="font-family: 'JetBrains Mono', monospace !important;">${day.firstIn}</td>
                <td style="font-family: 'JetBrains Mono', monospace !important;">${day.lastOut}</td>
                <td style="font-weight: 600;">${Math.floor(day.hoursWorked)}h ${Math.round((day.hoursWorked % 1) * 60)}m</td>
                <td>${Math.floor(day.breakHours)}h ${Math.round((day.breakHours % 1) * 60)}m</td>
                <td>
                  <span class="badge ${day.isGoalMet ? 'badge-green' : 'badge-red'}">
                    ${day.isGoalMet ? 'Goal Met' : 'Short Hrs'}
                  </span>
                  ${!day.isOnTime ? `
                    <span class="badge badge-amber" style="margin-left: 4px;">
                      Late
                    </span>
                  ` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Set HTML content to state to render in the hidden container
    setPdfReportHtml(`${styles}<div>${contentHtml}</div>`);
    
    // Trigger the canvas compiler in next tick
    setTimeout(async () => {
      try {
        const element = document.getElementById('pdf-report-render-target');
        if (!element) {
          console.error('Render target element not found');
          return;
        }

        setIsGeneratingPDF(true);

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const pageCanvasHeight = (canvas.width * pdfHeight) / pdfWidth;
        let heightLeft = canvas.height;
        let sY = 0;
        let isFirstPage = true;

        while (heightLeft > 0) {
          if (!isFirstPage) {
            pdf.addPage();
          }
          isFirstPage = false;

          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = Math.min(pageCanvasHeight, heightLeft);

          const ctx = pageCanvas.getContext('2d');
          ctx.drawImage(
            canvas,
            0, sY, canvas.width, pageCanvas.height,
            0, 0, pageCanvas.width, pageCanvas.height
          );

          const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
          const currentPdfPageHeight = (pageCanvas.height * pdfWidth) / canvas.width;

          pdf.addImage(pageImgData, 'JPEG', 0, 0, pdfWidth, currentPdfPageHeight);

          sY += pageCanvasHeight;
          heightLeft -= pageCanvasHeight;
        }

        const fileName = `employee_profile_${emp.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${selectedProfileEmpId}.pdf`;
        pdf.save(fileName);
      } catch (canvasErr) {
        console.error('Error compiling PDF canvas:', canvasErr);
      } finally {
        setIsGeneratingPDF(false);
        setPdfReportHtml(null);
      }
    }, 600);
  };

  // Formatting utilities
  const formatTimeStr = (isoString) => {
    const d = parseDBDate(isoString);
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDateStr = (isoString) => {
    const d = parseDBDate(isoString);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatRefreshedTime = (d) => {
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Helper condition variables
  const showLoader = isInitializing || isLoaderFading;
  const showLogin = !isAuthenticated || isLoginFading;

  return (
    <div className="relative min-h-screen bg-slate-50 font-sans antialiased text-slate-800 flex flex-col overflow-x-hidden">
      {/* Dashboard Section */}
      {isAuthenticated && (
        <div className="flex-1 flex flex-col animate-fadeIn">
      {/* Header Section */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          {/* Logo & Subtitle */}
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center space-x-3">
              <div className="bg-white p-1 rounded-xl shadow-md border border-slate-200 shrink-0 w-9 h-9 flex items-center justify-center">
                <img src="/dpi.png" alt="DPI Logo" className="h-7 w-7 object-contain" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                  Biometric Attendance Radar
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Live Webhook Monitor</span>
                  <span className="text-slate-350 text-[10px]">•</span>
                  {isSupabaseMode ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                      Offline
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Mobile Log Out Icon Button */}
            <button
              onClick={handleLogout}
              className="sm:hidden flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors shadow-sm cursor-pointer"
              title="Log Out"
            >
              <UserX className="h-4 w-4" />
            </button>
          </div>

          {/* Controls & Connection Status */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Clock & Sync Row on Mobile */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Clock */}
              <div className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold shadow-sm">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span className="hidden xs:inline">{currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                <span className="hidden xs:inline text-slate-300">|</span>
                <span className="font-mono text-slate-950">
                  {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </span>
              </div>

              {/* Sync Now Action */}
              <button
                onClick={triggerManualRefresh}
                disabled={isLoadingData}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors shadow-md shadow-blue-200/50 cursor-pointer h-[34px]"
              >
                <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${isLoadingData ? 'animate-spin' : ''}`} />
                <span>Sync Now</span>
              </button>
            </div>

            {/* Desktop Log Out Action */}
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors border border-slate-200 shadow-sm cursor-pointer"
            >
              <UserX className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        
        {/* Connection Error Toast Notification */}
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

        {/* Unified Tab Navigation & Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
          {/* Tab Navigation */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 w-full overflow-x-auto whitespace-nowrap scrollbar-none">
            <div className="flex items-center space-x-6">
              <button 
                onClick={() => setActiveTab('logs')}
                className={`text-xs font-bold pb-2 border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'logs' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                🕒 Live Punch Logs
              </button>
              <button 
                onClick={() => setActiveTab('presence')}
                className={`text-xs font-bold pb-2 border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'presence' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                👥 Employee Profiles
              </button>
              <button 
                onClick={() => setActiveTab('analytics')}
                className={`text-xs font-bold pb-2 border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'analytics' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                📈 Advanced Analytics
              </button>
              <button 
                onClick={() => setActiveTab('export')}
                className={`text-xs font-bold pb-2 border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'export' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                📊 Reports & Export Hub
              </button>
            </div>
            
            <div className="hidden lg:block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {activeTab === 'logs' && 'Live Stream Logs'}
              {activeTab === 'presence' && 'Real-Time Presence'}
              {activeTab === 'analytics' && 'Workforce Insights'}
              {activeTab === 'export' && 'PDF & Excel Reporting'}
            </div>
          </div>

          {/* Filter Bar (Shown on Logs and Analytics tabs, hidden on Presence/Export) */}
          {activeTab !== 'export' && activeTab !== 'presence' && (
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 w-full animate-fadeIn">
              
              {/* Left Side: Search Bar */}
              {activeTab !== 'analytics' ? (
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search employee name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-white placeholder-slate-400 text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm"
                  />
                </div>
              ) : (
                <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Interactive analytics workspace for current filters.
                </div>
              )}

              {/* Right Side: Filters & Controls */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Date Scope Selector */}
                {activeTab === 'logs' && (
                  <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setDateScope('today')}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                        dateScope === 'today' 
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setDateScope('all')}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                        dateScope === 'all' 
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      All History
                    </button>
                  </div>
                )}

                {/* Department Dropdown Selector */}
                <div className="relative w-full sm:w-36 dept-dropdown-container">
                  <button
                    type="button"
                    onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 outline-none cursor-pointer flex items-center justify-between shadow-sm hover:border-slate-300 transition-all text-left"
                  >
                    <span className="truncate">
                      {departmentFilter === 'All' ? 'All Depts' : departmentFilter}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                  </button>

                  {isDeptDropdownOpen && (
                    <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 p-1.5 min-w-[140px] w-full animate-fadeIn space-y-0.5">
                      {[
                        { value: 'All', label: 'All Departments' },
                        { value: 'Engineering', label: 'Engineering' },
                        { value: 'Operations', label: 'Operations' },
                        { value: 'Marketing', label: 'Marketing' },
                        { value: 'HR', label: 'Human Resources' },
                        { value: 'Sales', label: 'Sales' }
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            setDepartmentFilter(item.value);
                            setIsDeptDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex justify-between items-center transition-colors cursor-pointer hover:bg-slate-50 ${
                            departmentFilter === item.value 
                              ? 'bg-blue-50/70 text-blue-750 font-bold' 
                              : 'text-slate-700'
                          }`}
                        >
                          <span className="truncate">{item.label}</span>
                          {departmentFilter === item.value && (
                            <Check className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Presence Status Selector */}
                {activeTab !== 'analytics' && (
                  <div className="relative w-full sm:w-36 status-dropdown-container">
                    <button
                      type="button"
                      onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 outline-none cursor-pointer flex items-center justify-between shadow-sm hover:border-slate-300 transition-all text-left"
                    >
                      <span className="truncate">
                        {statusFilter === 'All' && 'All Statuses'}
                        {statusFilter === 'IN' && 'Present (IN)'}
                        {statusFilter === 'OUT' && 'Absent (OUT)'}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    </button>

                    {isStatusDropdownOpen && (
                      <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 p-1.5 min-w-[140px] w-full animate-fadeIn space-y-0.5">
                        {[
                          { value: 'All', label: 'All Statuses' },
                          { value: 'IN', label: 'Present (IN)' },
                          { value: 'OUT', label: 'Absent (OUT)' }
                        ].map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => {
                              setStatusFilter(item.value);
                              setIsStatusDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex justify-between items-center transition-colors cursor-pointer hover:bg-slate-50 ${
                              statusFilter === item.value 
                                ? 'bg-blue-50/70 text-blue-750 font-bold' 
                                : 'text-slate-700'
                            }`}
                          >
                            <span className="truncate">{item.label}</span>
                            {statusFilter === item.value && (
                              <Check className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Jump to Export Tab */}
                {activeTab !== 'analytics' && (
                  <button
                    onClick={() => {
                      setExportReportType(activeTab === 'logs' ? 'logs' : 'timesheet');
                      setActiveTab('export');
                    }}
                    className="flex items-center justify-center p-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-sm cursor-pointer shrink-0"
                    title="Go to Export Hub"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {activeTab === 'analytics' ? (
          /* Full Width Analytics Dashboard Workspace */
          <div className="space-y-6 animate-fadeIn">
            {/* Analytics Date Selector & Details Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-base font-black text-slate-900 tracking-tight">Advanced Attendance Insights</h2>
                <p className="text-xs text-slate-500 font-medium">Scoping logs for <span className="font-semibold text-slate-700">{analyticsData.summary.totalEmployees} Employees</span> in <span className="font-semibold text-blue-600">{departmentFilter === 'All' ? 'All Departments' : departmentFilter}</span></p>
              </div>

              {/* Date Scope Controls */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  {[
                    { value: 'week', label: 'Last 7 Days' },
                    { value: 'custom', label: 'Custom Range' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setAnalyticsDateScope(opt.value)}
                      className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                        analyticsDateScope === opt.value
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {analyticsDateScope === 'custom' && (
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                    <input
                      type="date"
                      value={analyticsStartDate}
                      onChange={(e) => setAnalyticsStartDate(e.target.value)}
                      className="bg-transparent text-[10px] font-bold text-slate-700 outline-none px-1"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">to</span>
                    <input
                      type="date"
                      value={analyticsEndDate}
                      onChange={(e) => setAnalyticsEndDate(e.target.value)}
                      className="bg-transparent text-[10px] font-bold text-slate-700 outline-none px-1"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Attendance rate */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[110px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</span>
                <span className="text-2xl font-black text-slate-900 mt-1">{Math.round(analyticsData.summary.attendanceRate)}%</span>
                <span className="text-[10px] text-emerald-600 font-semibold mt-1">Present: {analyticsData.summary.presentToday} | Leave: {analyticsData.summary.leaveCount}</span>
              </div>

              {/* Card 2: Average Hours */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[110px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Daily Hours</span>
                <span className="text-2xl font-black text-slate-900 mt-1">
                  {Math.floor(analyticsData.summary.averageWorkingHours)}h {Math.round((analyticsData.summary.averageWorkingHours % 1) * 60)}m
                </span>
                <span className="text-[10px] text-blue-600 font-semibold mt-1">Standard target: 8h</span>
              </div>

              {/* Card 3: Average Arrival time */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[110px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg First IN</span>
                <span className="text-2xl font-black text-slate-900 mt-1">{analyticsData.summary.averageArrivalStr}</span>
                <span className="text-[10px] text-amber-600 font-semibold mt-1">Total Lates: {analyticsData.summary.lateArrivals} {"(>9:15)"}</span>
              </div>

              {/* Card 4: Overtime Hours */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[110px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Overtime</span>
                <span className="text-2xl font-black text-slate-900 mt-1">
                  {Math.floor(analyticsData.summary.totalOvertimeHours)}h {Math.round((analyticsData.summary.totalOvertimeHours % 1) * 60)}m
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold mt-1">Accumulated in range</span>
              </div>
            </div>

            {/* Trends & Heatmap Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Daily Attendance Trend */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Daily Attendance Trend</h3>
                  <span className="text-[10px] font-bold text-slate-400">Presence % per Day</span>
                </div>
                <div className="h-48 flex items-end justify-between gap-1 pt-4 border-b border-l border-slate-100 px-2">
                  {analyticsData.attendanceTrend.map((d, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-1 bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow">
                        {d.rate.toFixed(1)}% ({d.presentCount} present)
                      </div>
                      {/* Bar */}
                      <div 
                        className="w-full bg-blue-500 hover:bg-blue-600 rounded-t transition-all"
                        style={{ height: `${Math.max(d.rate, 6)}%` }}
                      ></div>
                      <span className="text-[8px] font-semibold text-slate-400 mt-1 truncate max-w-full">
                        {new Date(d.dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Late Arrivals Heatmap */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Late Arrivals Heat Map</h3>
                  <span className="text-[10px] font-bold text-slate-400">Lates by hour/day</span>
                </div>
                <div className="grid grid-cols-6 gap-1.5 pt-2">
                  <span className="text-[8px] font-bold text-slate-400">Day</span>
                  {['8AM', '9AM', '10AM', '11AM', '12PM+'].map(h => (
                    <span key={h} className="text-[8px] font-bold text-slate-400 text-center">{h}</span>
                  ))}

                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, dIdx) => (
                    <React.Fragment key={dIdx}>
                      <span className="text-[8px] font-bold text-slate-500 self-center">{dayName}</span>
                      {analyticsData.heatmap[dIdx].map((slot, sIdx) => {
                        let bg = 'bg-slate-50 border-slate-100';
                        let text = 'text-slate-300';
                        if (slot.count > 4) {
                          bg = 'bg-rose-500 text-white';
                        } else if (slot.count > 2) {
                          bg = 'bg-rose-300 text-white';
                        } else if (slot.count > 0) {
                          bg = 'bg-rose-100 text-rose-850 border-rose-200';
                        }
                        return (
                          <div 
                            key={sIdx} 
                            className={`aspect-square rounded flex items-center justify-center text-[9px] font-black border transition-all ${bg}`}
                            title={`${dayName} at ${slot.hourSlot} AM: ${slot.count} lates`}
                          >
                            {slot.count > 0 ? slot.count : '-'}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* Leaderboards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Leaderboard 1: Punctual */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  Top 10 Most Punctual Employees
                </h3>
                <div className="divide-y divide-slate-100">
                  {analyticsData.leaderboard.mostPunctual.length > 0 ? (
                    analyticsData.leaderboard.mostPunctual.map((item, idx) => (
                      <div key={item.empId} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 font-bold text-slate-400">#{idx + 1}</span>
                          <div>
                            <p className="font-bold text-slate-800">{item.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{item.empId}</p>
                          </div>
                        </div>
                        <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-100 font-mono">
                          Avg: {item.valStr}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="py-4 text-center text-xs text-slate-400">No punch data found</p>
                  )}
                </div>
              </div>

              {/* Leaderboard 2: Frequently Late */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                  Top 10 Frequently Late Employees {"(>9:15 AM)"}
                </h3>
                <div className="divide-y divide-slate-100">
                  {analyticsData.leaderboard.frequentlyLate.length > 0 ? (
                    analyticsData.leaderboard.frequentlyLate.map((item, idx) => (
                      <div key={item.empId} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 font-bold text-slate-400">#{idx + 1}</span>
                          <div>
                            <p className="font-bold text-slate-800">{item.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{item.empId}</p>
                          </div>
                        </div>
                        <span className="bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-100">
                          {item.lateCount} Late Arrivals
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="py-4 text-center text-xs text-slate-400">No late entries recorded</p>
                  )}
                </div>
              </div>
            </div>

            {/* Exception Reports Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                ⚠️ Biometric Logs Exception Reports
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Column 1: Missing IN / OUT Punches */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Missing IN / OUT Punches</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-100 rounded-xl p-2.5 divide-y divide-slate-100 bg-slate-50/50">
                    {analyticsData.exceptions.missingIn.length === 0 && analyticsData.exceptions.missingOut.length === 0 && (
                      <p className="text-center text-[10px] text-slate-450 py-4 font-bold">No anomalies detected</p>
                    )}
                    {analyticsData.exceptions.missingIn.map((item, i) => (
                      <div key={`in-${i}`} className="text-[10px] py-1.5">
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-850">{item.name}</span>
                          <span className="text-rose-600 font-black uppercase text-[8px] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">Missing IN</span>
                        </div>
                        <p className="text-slate-400 mt-0.5 font-mono">{item.date} at {item.time}</p>
                      </div>
                    ))}
                    {analyticsData.exceptions.missingOut.map((item, i) => (
                      <div key={`out-${i}`} className="text-[10px] py-1.5">
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-850">{item.name}</span>
                          <span className="text-amber-600 font-black uppercase text-[8px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">Missing OUT</span>
                        </div>
                        <p className="text-slate-400 mt-0.5 font-mono">{item.date} at {item.time} (Auto-OUT)</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 2: Duplicate Punches */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duplicate Punches (&lt;3 mins)</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-100 rounded-xl p-2.5 divide-y divide-slate-100 bg-slate-50/50">
                    {analyticsData.exceptions.duplicates.length === 0 ? (
                      <p className="text-center text-[10px] text-slate-450 py-4 font-bold">No duplicate entries found</p>
                    ) : (
                      analyticsData.exceptions.duplicates.map((item, i) => (
                        <div key={`dup-${i}`} className="text-[10px] py-1.5">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-850">{item.name}</span>
                            <span className="text-blue-600 font-bold font-mono text-[9px]">{item.time}</span>
                          </div>
                          <p className="text-slate-500 mt-0.5 font-medium">{item.detail}</p>
                          <p className="text-slate-400 mt-0.5 font-mono text-[9px]">{item.date}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Column 3: Employees Without Attendance */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No Attendance Recorded</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-100 rounded-xl p-2.5 divide-y divide-slate-100 bg-slate-50/50">
                    {analyticsData.exceptions.noAttendance.length === 0 ? (
                      <p className="text-center text-[10px] text-slate-450 py-4 font-bold">All employees present in period</p>
                    ) : (
                      analyticsData.exceptions.noAttendance.map((item) => (
                        <div key={item.empId} className="text-[10px] py-1.5 flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-850">{item.name}</span>
                            <p className="text-slate-400 mt-0.5 font-mono">{item.empId}</p>
                          </div>
                          <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">{item.department}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'export' ? (
          /* Full Width Reports Workspace */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* CONFIGURATION COLUMN (1/3) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">1. Report Type</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setExportReportType('logs')}
                    className={`p-3 border rounded-xl flex flex-col items-start gap-1.5 transition-all text-left cursor-pointer ${
                      exportReportType === 'logs'
                        ? 'border-blue-600 bg-blue-50/50 text-slate-900 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold block">Raw Punch Logs</span>
                    <span className="text-[9px] text-slate-400 font-medium">Individual clockings</span>
                  </button>
                  <button
                    onClick={() => setExportReportType('timesheet')}
                    className={`p-3 border rounded-xl flex flex-col items-start gap-1.5 transition-all text-left cursor-pointer ${
                      exportReportType === 'timesheet'
                        ? 'border-blue-600 bg-blue-50/50 text-slate-900 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold block">Timesheet Summary</span>
                    <span className="text-[9px] text-slate-400 font-medium">Daily hours & compliance</span>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">2. Date Range</h3>
                <div className="relative mb-3 export-date-dropdown-container">
                  <button
                    type="button"
                    onClick={() => setIsExportDateDropdownOpen(!isExportDateDropdownOpen)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 outline-none cursor-pointer flex items-center justify-between shadow-sm hover:border-slate-300 transition-all text-left"
                  >
                    <span className="truncate">
                      {exportDateRange === 'today' && 'Today'}
                      {exportDateRange === 'yesterday' && 'Yesterday'}
                      {exportDateRange === 'week' && 'Last 7 Days'}
                      {exportDateRange === 'custom' && 'Custom Date Range...'}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                  </button>

                  {isExportDateDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 p-1.5 animate-fadeIn space-y-0.5">
                      {[
                        { value: 'today', label: 'Today' },
                        { value: 'yesterday', label: 'Yesterday' },
                        { value: 'week', label: 'Last 7 Days' },
                        { value: 'custom', label: 'Custom Date Range...' }
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            setExportDateRange(item.value);
                            setIsExportDateDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex justify-between items-center transition-colors cursor-pointer hover:bg-slate-50 ${
                            exportDateRange === item.value 
                              ? 'bg-blue-50/70 text-blue-750 font-bold' 
                              : 'text-slate-700'
                          }`}
                        >
                          <span className="truncate">{item.label}</span>
                          {exportDateRange === item.value && (
                            <Check className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {exportDateRange === 'custom' && (
                  <div className="grid grid-cols-2 gap-3 animate-fadeIn">
                    <div>
                      <label className="text-[9px] font-bold text-slate-455 block mb-1">Start Date</label>
                      <input 
                        type="date" 
                        value={exportStartDate}
                        onChange={(e) => setExportStartDate(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-455 block mb-1">End Date</label>
                      <input 
                        type="date" 
                        value={exportEndDate}
                        onChange={(e) => setExportEndDate(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" 
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">3. Employee Selection</h3>
                <div className="space-y-3">
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center space-x-2 text-xs text-slate-750 cursor-pointer">
                      <input
                        type="radio"
                        name="empFilter"
                        checked={exportEmployeeFilter === 'all'}
                        onChange={() => setExportEmployeeFilter('all')}
                        className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span>All Employees ({totalWorkforce})</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-slate-750 cursor-pointer">
                      <input
                        type="radio"
                        name="empFilter"
                        checked={exportEmployeeFilter === 'single'}
                        onChange={() => setExportEmployeeFilter('single')}
                        className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span>Single Employee</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-slate-750 cursor-pointer">
                      <input
                        type="radio"
                        name="empFilter"
                        checked={exportEmployeeFilter === 'group'}
                        onChange={() => setExportEmployeeFilter('group')}
                        className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span>Custom Group ({exportSelectedEmployeesGroup.length} selected)</span>
                    </label>
                  </div>

                  {exportEmployeeFilter === 'single' && (
                    <div className="pt-2 animate-fadeIn relative single-dropdown-container">
                      <button
                        type="button"
                        onClick={() => setIsSingleDropdownOpen(!isSingleDropdownOpen)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 outline-none cursor-pointer flex items-center justify-between shadow-sm hover:border-slate-300 transition-all text-left"
                      >
                        <span className="truncate">
                          {employees[exportSelectedEmployee] 
                            ? `${employees[exportSelectedEmployee].name} (${exportSelectedEmployee})`
                            : 'Select Employee...'}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      </button>

                      {isSingleDropdownOpen && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 p-2 space-y-2 max-h-60 overflow-y-auto animate-fadeIn">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search employee..."
                              value={exportSingleSearch}
                              onChange={(e) => setExportSingleSearch(e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 border border-slate-150 rounded-xl text-xs text-slate-700 bg-white placeholder-slate-400 focus:border-blue-500 outline-none"
                            />
                          </div>
                          
                          <div className="max-h-40 overflow-y-auto space-y-0.5">
                            {Object.entries(employees)
                              .filter(([id, emp]) => 
                                emp.name.toLowerCase().includes(exportSingleSearch.toLowerCase()) || 
                                id.toLowerCase().includes(exportSingleSearch.toLowerCase())
                              )
                              .map(([id, emp]) => (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => {
                                    setExportSelectedEmployee(id);
                                    setIsSingleDropdownOpen(false);
                                    setExportSingleSearch('');
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex justify-between items-center transition-colors cursor-pointer hover:bg-slate-50 ${
                                    exportSelectedEmployee === id 
                                      ? 'bg-blue-50/70 text-blue-750 font-bold' 
                                      : 'text-slate-700'
                                  }`}
                                >
                                  <span className="truncate">{emp.name} ({id})</span>
                                  {exportSelectedEmployee === id && (
                                    <Check className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                                  )}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {exportEmployeeFilter === 'group' && (
                    <div className="pt-2 animate-fadeIn relative group-dropdown-container">
                      <button
                        type="button"
                        onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 outline-none cursor-pointer flex items-center justify-between shadow-sm hover:border-slate-300 transition-all text-left"
                      >
                        <span className="truncate">
                          {exportSelectedEmployeesGroup.length === Object.keys(employees).length
                            ? `All Employees (${exportSelectedEmployeesGroup.length})`
                            : `${exportSelectedEmployeesGroup.length} Selected`}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      </button>

                      {isGroupDropdownOpen && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 p-2.5 space-y-2 animate-fadeIn">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search employees..."
                              value={exportGroupSearch}
                              onChange={(e) => setExportGroupSearch(e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 border border-slate-150 rounded-xl text-xs text-slate-700 bg-white placeholder-slate-400 focus:border-blue-500 outline-none"
                            />
                          </div>

                          <div className="flex justify-between items-center px-1 text-[10px]">
                            <span className="text-slate-400">Select employees below:</span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setExportSelectedEmployeesGroup(Object.keys(employees))}
                                className="text-blue-650 hover:underline font-bold cursor-pointer"
                              >
                                Select All
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                type="button"
                                onClick={() => setExportSelectedEmployeesGroup([])}
                                className="text-blue-650 hover:underline font-bold cursor-pointer"
                              >
                                Clear All
                              </button>
                            </div>
                          </div>

                          <div className="border border-slate-100 rounded-xl p-1.5 max-h-40 overflow-y-auto space-y-0.5 bg-slate-50/50">
                            {Object.entries(employees)
                              .filter(([id, emp]) => 
                                emp.name.toLowerCase().includes(exportGroupSearch.toLowerCase()) || 
                                id.toLowerCase().includes(exportGroupSearch.toLowerCase())
                              )
                              .map(([id, emp]) => {
                                const isChecked = exportSelectedEmployeesGroup.includes(id);
                                return (
                                  <label key={id} className="flex items-center space-x-2 text-xs text-slate-750 cursor-pointer select-none p-1.5 rounded-lg hover:bg-white transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        setExportSelectedEmployeesGroup(prev => 
                                          isChecked ? prev.filter(x => x !== id) : [...prev, id]
                                        );
                                      }}
                                      className="rounded text-blue-650 focus:ring-blue-550 h-3.5 w-3.5 cursor-pointer"
                                    />
                                    <span className="truncate">
                                      <strong>{emp.name}</strong> <span className="text-slate-400">({id})</span>
                                    </span>
                                  </label>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* PDF Customize Section */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">4. Custom PDF Options</h3>
                
                {/* Theme Selector */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Report Color Theme
                  </label>
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
                        className={`flex flex-col items-center justify-center py-2 px-1 border rounded-lg transition-all cursor-pointer ${
                          pdfThemeColor === theme.id 
                            ? 'border-slate-800 bg-slate-50 font-bold text-slate-900' 
                            : 'border-slate-200 hover:border-slate-250 text-slate-600 text-[10px]'
                        }`}
                      >
                        <span className={`h-3 w-3 rounded-full ${theme.color} mb-1 shadow-sm`}></span>
                        <span className="text-[9px] font-semibold">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Company Name */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Company Header Name
                  </label>
                  <input
                    type="text"
                    value={pdfCompanyName}
                    onChange={(e) => setPdfCompanyName(e.target.value)}
                    placeholder="Enter company name..."
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                {/* Custom Comments */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Custom Footer Comments
                  </label>
                  <textarea
                    value={pdfComments}
                    onChange={(e) => setPdfComments(e.target.value)}
                    placeholder="Add report footnotes..."
                    rows={2}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs resize-none"
                  />
                </div>

                {/* Column Selector */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Select Columns to Include
                  </label>
                  {exportReportType === 'logs' ? (
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                      {[
                        { id: 'logId', label: 'Log ID' },
                        { id: 'empId', label: 'Employee ID' },
                        { id: 'empName', label: 'Employee Name' },
                        { id: 'direction', label: 'Direction' },
                        { id: 'date', label: 'Date' },
                        { id: 'time', label: 'Time' }
                      ].map(col => (
                        <label key={col.id} className="flex items-center space-x-1.5 text-[10px] text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pdfLogColumns[col.id]}
                            onChange={(e) => setPdfLogColumns(prev => ({ ...prev, [col.id]: e.target.checked }))}
                            className="rounded text-blue-600 focus:ring-blue-500 h-3 w-3"
                          />
                          <span>{col.label}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                      {[
                        { id: 'empId', label: 'Employee ID' },
                        { id: 'empName', label: 'Employee Name' },
                        { id: 'daysPresent', label: 'Days Present' },
                        { id: 'punchesCount', label: 'Total Punches' },
                        { id: 'totalHours', label: 'Total Hours' },
                        { id: 'totalBreakHours', label: 'Total Breaks' },
                        { id: 'avgDailyHours', label: 'Avg Daily Hours' },
                        { id: 'goalStatus', label: 'Shift Goal Status' }
                      ].map(col => (
                        <label key={col.id} className="flex items-center space-x-1.5 text-[10px] text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pdfTimesheetColumns[col.id]}
                            onChange={(e) => setPdfTimesheetColumns(prev => ({ ...prev, [col.id]: e.target.checked }))}
                            className="rounded text-blue-600 focus:ring-blue-500 h-3 w-3"
                          />
                          <span>{col.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">5. Export Actions</h3>
                <div className="flex gap-3">
                  <button
                    onClick={handleClipboardExport}
                    disabled={copySuccess || exportSuccess || isFetchingExportData || isPreviewLoading}
                    className="flex-1 py-2 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                  >
                    {copySuccess ? 'Copied! ✓' : 'Copy CSV'}
                  </button>
                  <button
                    onClick={handleDownloadExport}
                    disabled={copySuccess || exportSuccess || isFetchingExportData || isPreviewLoading}
                    className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                  >
                    {exportSuccess ? 'Downloaded! ✓' : 'Download CSV'}
                  </button>
                </div>

                <button
                  onClick={handleExportXLSX}
                  disabled={copySuccess || exportSuccess || isFetchingExportData || isPreviewLoading}
                  className="w-full py-2.5 px-3 border border-blue-250 bg-blue-50 hover:bg-blue-100 text-blue-850 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                >
                  <Download className="h-4 w-4 text-blue-600" />
                  {exportSuccess ? 'Exported! ✓' : 'Export Multi-Sheet Excel (XLSX)'}
                </button>

                <button
                  onClick={handleDownloadPDFReport}
                  disabled={copySuccess || exportSuccess || isFetchingExportData || isPreviewLoading}
                  className="w-full py-2.5 px-3 border border-emerald-250 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                >
                  <Download className="h-4 w-4 text-emerald-600" />
                  {isFetchingExportData ? 'Preparing...' : 'Download PDF Report'}
                </button>
              </div>
            </div>

            {/* PREVIEW COLUMN (2/3) */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Report Preview Panel</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Showing real-time calculations matching your filters.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                    {exportReportType === 'logs' ? `${previewLogs.length} Records` : `${previewTimesheet.length} Employees`}
                  </span>
                </div>
              </div>

              <div className="flex-1 relative overflow-auto p-4">
                {isPreviewLoading ? (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center z-10">
                    <RefreshCw className="h-8 w-8 text-blue-650 animate-spin mb-2" />
                    <span className="text-xs font-bold text-slate-500">Updating preview data...</span>
                  </div>
                ) : null}

                {exportReportType === 'logs' ? (
                  // Preview Logs Table
                  previewLogs.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50 text-slate-500 text-[9px] uppercase tracking-wider font-semibold">
                          <tr>
                            <th className="px-3 py-2 text-left">Log ID</th>
                            <th className="px-3 py-2 text-left">Employee Name</th>
                            <th className="px-3 py-2 text-center">Direction</th>
                            <th className="px-3 py-2 text-right">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-150 text-xs">
                          {previewLogs.slice(0, 15).map(log => {
                            const emp = employees[log.employee_id] || { name: 'Unknown' };
                            return (
                              <tr key={log.log_id} className="hover:bg-slate-50/50">
                                <td className="px-3 py-2 font-mono text-slate-500">{log.log_id}</td>
                                <td className="px-3 py-2">
                                  <div className="font-bold text-slate-900">{emp.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{log.employee_id}</div>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    log.direction === 'IN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                                  }`}>
                                    {log.direction}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right text-slate-700">
                                  <div className="font-mono">{parseDBDate(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</div>
                                  <div className="text-[9px] text-slate-400">{parseDBDate(log.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {previewLogs.length > 15 && (
                        <p className="text-[10px] text-slate-400 text-center mt-3 italic">
                          Showing first 15 of {previewLogs.length} matching entries. Full set will be exported.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16">
                      <UserX className="h-10 w-10 text-slate-300 mb-2" />
                      <p className="text-xs">No punch logs found matching the filters.</p>
                    </div>
                  )
                ) : (
                  // Preview Timesheet Table
                  previewTimesheet.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50 text-slate-500 text-[9px] uppercase tracking-wider font-semibold">
                          <tr>
                            <th className="px-3 py-2 text-left">Employee</th>
                            <th className="px-3 py-2 text-center">Days Present</th>
                            <th className="px-3 py-2 text-center">Punches</th>
                            <th className="px-3 py-2 text-right">Total Hours</th>
                            <th className="px-3 py-2 text-right">Break Time</th>
                            <th className="px-3 py-2 text-right">Avg/Day</th>
                            <th className="px-3 py-2 text-center">Goal Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-150 text-xs">
                          {previewTimesheet.slice(0, 15).map(item => {
                            const avgHours = item.daysPresent.size > 0 ? (item.totalHours / item.daysPresent.size) : 0;
                            const isGoalMet = avgHours >= 7;
                            const totalHoursStr = `${Math.floor(item.totalHours)}h ${Math.round((item.totalHours % 1) * 60)}m`;
                            const totalBreakHoursStr = `${Math.floor(item.totalBreakHours || 0)}h ${Math.round(((item.totalBreakHours || 0) % 1) * 60)}m`;
                            const avgHoursStr = `${Math.floor(avgHours)}h ${Math.round((avgHours % 1) * 60)}m`;
                            return (
                              <tr key={item.empId} className="hover:bg-slate-50/50">
                                <td className="px-3 py-2">
                                  <div className="font-bold text-slate-900">{item.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{item.empId}</div>
                                  </td>
                                <td className="px-3 py-2 text-center font-bold text-slate-800">{item.daysPresent.size}</td>
                                <td className="px-3 py-2 text-center text-slate-500">{item.punchesCount}</td>
                                <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">{totalHoursStr}</td>
                                <td className="px-3 py-2 text-right font-mono text-slate-500">{totalBreakHoursStr}</td>
                                <td className="px-3 py-2 text-right font-mono text-slate-600">{avgHoursStr}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    isGoalMet ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                                  }`}>
                                    {isGoalMet ? 'Met' : 'Under'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {previewTimesheet.length > 15 && (
                        <p className="text-[10px] text-slate-400 text-center mt-3 italic">
                          Showing first 15 of {previewTimesheet.length} employees. Full set will be exported.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16">
                      <UserX className="h-10 w-10 text-slate-300 mb-2" />
                      <p className="text-xs">No attendance summary found matching the filters.</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'presence' ? (
          /* Full Width Employee Profiles Hub Workspace */
          <div className="space-y-6 animate-fadeIn">
            {/* 1. Cockpit Stats Panel */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* Card 1: Total Directory */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between border-l-4 border-l-blue-600 hover:shadow-md transition-all">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Directory Scope</p>
                  <p className="text-xl font-black text-slate-900 font-sans">{profileSummaryStats.total}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-xl">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>

              {/* Card 2: Present */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between border-l-4 border-l-emerald-500 hover:shadow-md transition-all">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Present (IN)</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xl font-black text-slate-900 font-sans">{profileSummaryStats.present}</p>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                </div>
                <div className="p-2 bg-emerald-50 rounded-xl">
                  <Clock className="h-5 w-5 text-emerald-600" />
                </div>
              </div>

              {/* Card 3: Away */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between border-l-4 border-l-slate-400 hover:shadow-md transition-all">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Away (OUT)</p>
                  <p className="text-xl font-black text-slate-900 font-sans">{profileSummaryStats.away}</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <UserX className="h-5 w-5 text-slate-655" />
                </div>
              </div>

              {/* Card 4: Late Today */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between border-l-4 border-l-amber-500 hover:shadow-md transition-all">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Late Arrival</p>
                  <p className="text-xl font-black text-slate-900 font-sans">{profileSummaryStats.late}</p>
                </div>
                <div className="p-2 bg-amber-50 rounded-xl">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
              </div>

              {/* Card 5: Overtime */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between border-l-4 border-l-rose-500 hover:shadow-md transition-all">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overtime (&gt;9h)</p>
                  <p className="text-xl font-black text-slate-900 font-sans">{profileSummaryStats.overtime}</p>
                </div>
                <div className="p-2 bg-rose-50 rounded-xl">
                  <BarChart3 className="h-5 w-5 text-rose-600" />
                </div>
              </div>
            </div>

            {/* 2. Main Workspace Container */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              {/* Content Header */}
              <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    Staff Directory & Presence Analytics
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Real-time status tracking, daily hour goals, and timeline sparklines
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start md:self-auto">
                  <span className="text-[10px] font-bold text-slate-500 font-mono bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                    Showing {sortedAndFilteredProfiles.length} of {filteredEmployeesList.length} filtered profiles
                  </span>
                </div>
              </div>

              {/* Enhanced Control Bar Row */}
              <div className="bg-slate-50/30 px-5 py-4 border-b border-slate-200 flex flex-col lg:flex-row gap-4 items-center justify-between">
                {/* Search & Dept inline filters */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto flex-1">
                  {/* Local Quick Search */}
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Quick search name/ID..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setPresencePage(1); }}
                      className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 text-xs font-semibold text-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                    />
                  </div>

                  {/* Local Dept Filter Custom Dropdown */}
                  <div className="relative w-full sm:w-44 profile-dept-dropdown-container">
                    <button
                      type="button"
                      onClick={() => setIsProfileDeptDropdownOpen(!isProfileDeptDropdownOpen)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-705 outline-none cursor-pointer flex items-center justify-between shadow-sm hover:border-slate-300 transition-all text-left"
                    >
                      <span className="truncate">
                        {departmentFilter === 'All' ? 'All Departments' : departmentFilter}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 ml-1.5" />
                    </button>

                    {isProfileDeptDropdownOpen && (
                      <div className="absolute left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 p-1.5 min-w-[170px] w-full animate-fadeIn space-y-0.5">
                        {[
                          { value: 'All', label: 'All Departments' },
                          { value: 'Engineering', label: 'Engineering' },
                          { value: 'Operations', label: 'Operations' },
                          { value: 'Marketing', label: 'Marketing' },
                          { value: 'HR', label: 'Human Resources' },
                          { value: 'Sales', label: 'Sales' }
                        ].map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => {
                              setDepartmentFilter(item.value);
                              setPresencePage(1);
                              setIsProfileDeptDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex justify-between items-center transition-colors cursor-pointer hover:bg-slate-50 ${
                              departmentFilter === item.value 
                                ? 'bg-blue-50/70 text-blue-750 font-bold' 
                                : 'text-slate-700'
                            }`}
                          >
                            <span className="truncate">{item.label}</span>
                            {departmentFilter === item.value && (
                              <Check className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Presence Status Quick Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                    {[
                      { value: 'All', label: 'All Status' },
                      { value: 'IN', label: 'Present' },
                      { value: 'OUT', label: 'Away' },
                      { value: 'late', label: 'Late' },
                      { value: 'overtime', label: 'Overtime' }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setProfileFilter(opt.value); setPresencePage(1); }}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                          profileFilter === opt.value
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort, View Toggle, Density options */}
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                  {/* Sorting Custom Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sort:</span>
                    <div className="relative w-36 profile-sort-dropdown-container">
                      <button
                        type="button"
                        onClick={() => setIsProfileSortDropdownOpen(!isProfileSortDropdownOpen)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-705 outline-none cursor-pointer flex items-center justify-between shadow-sm hover:border-slate-300 transition-all text-left"
                      >
                        <span className="truncate">
                          {profileSort === 'name' && 'Name (A-Z)'}
                          {profileSort === 'hours' && 'Hours Worked'}
                          {profileSort === 'status' && 'Presence Status'}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 ml-1.5" />
                      </button>

                      {isProfileSortDropdownOpen && (
                        <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 p-1.5 min-w-[140px] w-full animate-fadeIn space-y-0.5">
                          {[
                            { value: 'name', label: 'Name (A-Z)' },
                            { value: 'hours', label: 'Hours Worked' },
                            { value: 'status', label: 'Presence Status' }
                          ].map((item) => (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => {
                                setProfileSort(item.value);
                                setPresencePage(1);
                                setIsProfileSortDropdownOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex justify-between items-center transition-colors cursor-pointer hover:bg-slate-50 ${
                                profileSort === item.value 
                                  ? 'bg-blue-50/70 text-blue-750 font-bold' 
                                  : 'text-slate-700'
                              }`}
                            >
                              <span className="truncate">{item.label}</span>
                              {profileSort === item.value && (
                                <Check className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Density Custom Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Density:</span>
                    <div className="relative w-28 profile-density-dropdown-container">
                      <button
                        type="button"
                        onClick={() => setIsProfileDensityDropdownOpen(!isProfileDensityDropdownOpen)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-705 outline-none cursor-pointer flex items-center justify-between shadow-sm hover:border-slate-300 transition-all text-left"
                      >
                        <span className="truncate">
                          {profileItemsPerPage === 'All' ? 'Show All' : `${profileItemsPerPage} / Page`}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 ml-1.5" />
                      </button>

                      {isProfileDensityDropdownOpen && (
                        <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 p-1.5 min-w-[110px] w-full animate-fadeIn space-y-0.5">
                          {[
                            { value: '8', label: '8 / Page' },
                            { value: '16', label: '16 / Page' },
                            { value: '32', label: '32 / Page' },
                            { value: '64', label: '64 / Page' },
                            { value: 'All', label: 'Show All' }
                          ].map((item) => (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => {
                                setProfileItemsPerPage(item.value === 'All' ? 'All' : Number(item.value));
                                setPresencePage(1);
                                setIsProfileDensityDropdownOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex justify-between items-center transition-colors cursor-pointer hover:bg-slate-50 ${
                                String(profileItemsPerPage) === item.value 
                                  ? 'bg-blue-50/70 text-blue-750 font-bold' 
                                  : 'text-slate-700'
                              }`}
                            >
                              <span className="truncate">{item.label}</span>
                              {String(profileItemsPerPage) === item.value && (
                                <Check className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grid / List View Toggle */}
                  <div className="flex border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                    <button
                      onClick={() => setProfileViewMode('grid')}
                      className={`p-2 transition-colors cursor-pointer ${
                        profileViewMode === 'grid' 
                          ? 'bg-blue-600 text-white' 
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                      title="Card Grid View"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setProfileViewMode('table')}
                      className={`p-2 transition-colors cursor-pointer ${
                        profileViewMode === 'table' 
                          ? 'bg-blue-600 text-white' 
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                      title="Compact Table List View"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5">
                {paginatedEmployees.length > 0 ? (
                  <>
                    {/* Render GRID VIEW */}
                    {profileViewMode === 'grid' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                        {paginatedEmployees.map(([empId, emp]) => {
                          const statusData = employeePresenceMap[empId] || {
                            status: 'OUT',
                            lastPunchTime: null,
                            hoursWorkedToday: 0,
                            formattedTime: '0h 0m',
                            punchesToday: []
                          };
                          
                          const isInside = statusData.status === 'IN';
                          const shiftHoursGoal = 8;
                          const segments = getTimelineSegments(statusData.punchesToday, currentTime);

                          const punches = statusData.punchesToday || [];
                          const firstIn = punches.find(p => p.type === 'IN');
                          let isLate = false;
                          if (firstIn) {
                            const time = new Date(firstIn.time);
                            isLate = (time.getHours() > 9) || (time.getHours() === 9 && time.getMinutes() > 15);
                          }
                          const isOvertime = statusData.hoursWorkedToday > 9;

                          return (
                            <div 
                              key={empId} 
                              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-slate-305 hover:shadow-md transition-all duration-200"
                            >
                              {/* Identity Header */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="text-xs font-bold text-slate-900 truncate max-w-[120px]" title={emp.name}>{emp.name}</h4>
                                    <button
                                      onClick={() => setSelectedProfileEmpId(empId)}
                                      className="text-slate-400 hover:text-slate-655 transition-colors p-0.5 rounded hover:bg-slate-105 cursor-pointer"
                                      title="View Detailed Profile & Analytics"
                                    >
                                      <BarChart3 className="h-3.5 w-3.5 text-blue-600" />
                                    </button>
                                  </div>
                                  <p className="text-[9px] font-mono text-slate-400 font-bold mt-0.5">{empId}</p>
                                </div>
                                
                                <div className="flex flex-col items-end gap-1">
                                  {isInside ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-505 animate-pulse"></span>
                                      IN
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-250">
                                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                                      OUT
                                    </span>
                                  )}
                                  {isOvertime && (
                                    <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100 text-[8px] font-bold uppercase shadow-sm">
                                      ⚠️ Overtime
                                    </span>
                                  )}
                                  {isLate && (
                                    <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 text-[8px] font-bold uppercase shadow-sm">
                                      ⏱️ Late
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Hours worked progress */}
                              <div className="mt-4 space-y-2.5">
                                <div className="flex items-center justify-between text-[10px] border-b border-slate-50 pb-1.5">
                                  <span className="text-slate-455 font-medium">Last Punch:</span>
                                  <span className="font-mono text-slate-705 font-bold truncate max-w-[130px]" title={statusData.lastPunchTime ? `${statusData.status} at ${new Date(statusData.lastPunchTime).toLocaleTimeString('en-IN')}` : ''}>
                                    {statusData.lastPunchTime ? (
                                      `${statusData.status} at ${new Date(statusData.lastPunchTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`
                                    ) : (
                                      "No logs today"
                                    )}
                                  </span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-150">
                                  <div>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Active</p>
                                    <p className="text-xs font-black text-slate-800 font-mono mt-0.5">
                                      {statusData.formattedTime}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[8px] font-bold text-slate-450 uppercase tracking-wider">Break</p>
                                    <p className="text-xs font-black text-amber-600 font-mono mt-0.5">
                                      {statusData.formattedBreakTime || '0h 0m'}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Goal</p>
                                    <p className="text-xs font-black text-slate-500 font-mono mt-0.5">
                                      {shiftHoursGoal}h
                                    </p>
                                  </div>
                                </div>

                                {/* Shift Timeline Sparkline */}
                                <div className="space-y-1.5">
                                  <div className="flex justify-between text-[8px] font-bold text-slate-400">
                                    <span>Timeline Sparkline</span>
                                    <span className="font-mono">8 AM - 8 PM</span>
                                  </div>
                                  <div className="w-full h-3 rounded-lg overflow-hidden border border-slate-150 flex bg-slate-100/60 shadow-inner">
                                    {segments.length > 0 ? (
                                      segments.map((seg, sIdx) => {
                                        let colorClass = 'bg-slate-100'; // away
                                        let tooltipText = '';
                                        const startStr = seg.start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                                        const endStr = seg.end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

                                        if (seg.type === 'active') {
                                          colorClass = 'bg-emerald-500 hover:bg-emerald-600';
                                          tooltipText = `Active: ${startStr} - ${endStr}`;
                                        } else if (seg.type === 'break') {
                                          colorClass = 'bg-amber-500 hover:bg-amber-600';
                                          tooltipText = `Break: ${startStr} - ${endStr}`;
                                        } else {
                                          colorClass = 'bg-slate-200/50 hover:bg-slate-200';
                                          tooltipText = `Away: ${startStr} - ${endStr}`;
                                        }

                                        return (
                                          <div
                                            key={sIdx}
                                            className={`${colorClass} h-full transition-all duration-150 cursor-help`}
                                            style={{ width: `${seg.width}%` }}
                                            title={tooltipText}
                                          />
                                        );
                                      })
                                    ) : (
                                      <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[7px] font-bold text-slate-405">
                                        NO RECORD
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Render TABLE VIEW */
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white mb-4">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-left text-xs text-slate-500">
                            <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 tracking-wider border-b border-slate-200">
                              <tr>
                                <th className="px-5 py-3">Employee</th>
                                <th className="px-5 py-3">Status</th>
                                <th className="px-5 py-3">Department</th>
                                <th className="px-5 py-3">First In</th>
                                <th className="px-5 py-3">Last Out</th>
                                <th className="px-5 py-3">Active Hours</th>
                                <th className="px-5 py-3">Break Hours</th>
                                <th className="px-5 py-3" style={{ width: '150px' }}>Timeline</th>
                                <th className="px-5 py-3">Alerts</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                              {paginatedEmployees.map(([empId, emp]) => {
                                const statusData = employeePresenceMap[empId] || {
                                  status: 'OUT',
                                  lastPunchTime: null,
                                  hoursWorkedToday: 0,
                                  formattedTime: '0h 0m',
                                  punchesToday: []
                                };
                                
                                const isInside = statusData.status === 'IN';
                                const shiftHoursGoal = 8;
                                const segments = getTimelineSegments(statusData.punchesToday, currentTime);

                                const punches = statusData.punchesToday || [];
                                const firstIn = punches.find(p => p.type === 'IN');
                                const lastOut = punches.length > 0 ? punches[punches.length - 1] : null;

                                let isLate = false;
                                let firstInStr = '--:--';
                                if (firstIn) {
                                  const time = new Date(firstIn.time);
                                  firstInStr = time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                                  isLate = (time.getHours() > 9) || (time.getHours() === 9 && time.getMinutes() > 15);
                                }

                                let lastOutStr = '--:--';
                                if (lastOut && lastOut.type === 'OUT') {
                                  const time = new Date(lastOut.time);
                                  lastOutStr = time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                                }

                                const isOvertime = statusData.hoursWorkedToday > 9;

                                return (
                                  <tr key={empId} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                      <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-600 shadow-inner">
                                          {emp.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                          <div className="text-xs font-bold text-slate-900">{emp.name}</div>
                                          <div className="text-[10px] text-slate-400 font-mono font-medium">{empId}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                      {isInside ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-250">
                                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                          IN
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                                          OUT
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                      <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-bold text-slate-600">
                                        {emp.department}
                                      </span>
                                    </td>
                                    <td className="px-5 py-3.5 whitespace-nowrap font-mono text-[10px] text-slate-650">
                                      {firstInStr}
                                    </td>
                                    <td className="px-5 py-3.5 whitespace-nowrap font-mono text-[10px] text-slate-650">
                                      {lastOutStr}
                                    </td>
                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                      <span className="font-mono text-xs font-bold text-slate-800">
                                        {statusData.formattedTime}
                                      </span>
                                    </td>
                                    <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs text-amber-600">
                                      {statusData.formattedBreakTime || '0h 0m'}
                                    </td>
                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                      <div className="w-28 h-3 rounded overflow-hidden border border-slate-150 flex bg-slate-100 shadow-inner">
                                        {segments.length > 0 ? (
                                          segments.map((seg, sIdx) => {
                                            let colorClass = 'bg-slate-100';
                                            let tooltipText = '';
                                            const startStr = seg.start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                                            const endStr = seg.end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

                                            if (seg.type === 'active') {
                                              colorClass = 'bg-emerald-500 hover:bg-emerald-600';
                                              tooltipText = `Active: ${startStr} - ${endStr}`;
                                            } else if (seg.type === 'break') {
                                              colorClass = 'bg-amber-500 hover:bg-amber-600';
                                              tooltipText = `Break: ${startStr} - ${endStr}`;
                                            } else {
                                              colorClass = 'bg-slate-200/50 hover:bg-slate-200';
                                              tooltipText = `Away: ${startStr} - ${endStr}`;
                                            }

                                            return (
                                              <div
                                                key={sIdx}
                                                className={`${colorClass} h-full transition-all duration-150 cursor-help`}
                                                style={{ width: `${seg.width}%` }}
                                                title={tooltipText}
                                              />
                                            );
                                          })
                                        ) : (
                                          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[7px] font-bold text-slate-400">
                                            NO RECORD
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                      <div className="flex flex-wrap gap-1">
                                        {isOvertime && (
                                          <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100 text-[8px] font-bold uppercase shadow-sm">
                                            ⚠️ Overtime
                                          </span>
                                        )}
                                        {isLate && (
                                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 text-[8px] font-bold uppercase shadow-sm">
                                            ⏱️ Late
                                          </span>
                                        )}
                                        {!isOvertime && !isLate && (
                                          <span className="text-[10px] text-slate-400 italic font-medium">None</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          onClick={() => setSelectedProfileEmpId(empId)}
                                          className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg border border-slate-200 bg-white transition-all cursor-pointer shadow-sm"
                                          title="Detailed Profile & Analytics"
                                        >
                                          <BarChart3 className="h-3.5 w-3.5" />
                                        </button>
                                        
                                        <button
                                          onClick={async () => {
                                            setSelectedProfileEmpId(empId);
                                            setTimeout(() => {
                                              handleDownloadIndividualPDF();
                                            }, 400);
                                          }}
                                          className="text-slate-600 hover:bg-slate-50 p-1.5 rounded-lg border border-slate-200 bg-white transition-all cursor-pointer shadow-sm"
                                          title="Quick Export PDF Report"
                                        >
                                          <Download className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Pagination Controls */}
                    {profileItemsPerPage !== 'All' && sortedAndFilteredProfiles.length > profileItemsPerPage && (
                      <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
                        <p className="text-[10px] text-slate-505 font-medium">
                          Showing <span className="font-bold text-slate-800">{(presencePage - 1) * profileItemsPerPage + 1}</span> to{' '}
                          <span className="font-bold text-slate-800">
                            {Math.min(presencePage * profileItemsPerPage, sortedAndFilteredProfiles.length)}
                          </span>{' '}
                          of <span className="font-bold text-slate-800">{sortedAndFilteredProfiles.length}</span> employees
                        </p>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setPresencePage(prev => Math.max(prev - 1, 1))}
                            disabled={presencePage === 1}
                            className="px-2.5 py-1 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-[10px] font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
                          >
                            Prev
                          </button>
                          <button
                            onClick={() => setPresencePage(prev => Math.min(prev + 1, totalPresencePages))}
                            disabled={presencePage === totalPresencePages}
                            className="px-2.5 py-1 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-[10px] font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No employee directory profiles match your query or filters.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* 2-Column Responsive Dashboard Layout */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* LEFT COLUMN: Stats & Insights (1/3 Width) */}
          <div className="space-y-6">
            
            {/* Unified Stats Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Workforce Overview</h3>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                {/* Stat 1: Total */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                  <p className="text-[10px] font-bold text-slate-450 uppercase">Total</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">{totalWorkforce}</p>
                </div>
                {/* Stat 2: Active */}
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-2.5">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase">Active</p>
                  <p className="text-lg font-black text-emerald-800 mt-0.5">{activeInOfficeCount}</p>
                </div>
                {/* Stat 3: Absent */}
                <div className="bg-slate-100/70 border border-slate-200/50 rounded-xl p-2.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Absent</p>
                  <p className="text-lg font-black text-slate-800 mt-0.5">{absentRemoteCount}</p>
                </div>
              </div>

              {/* Progress bar of active occupancy */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                  <span>Office Occupancy Rate</span>
                  <span className="text-emerald-600">
                    {totalWorkforce > 0 ? Math.round((activeInOfficeCount / totalWorkforce) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${totalWorkforce > 0 ? (activeInOfficeCount / totalWorkforce) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Tabbed Analytics Insights Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
              
              {/* Analytics Header with toggles */}
              <div className="flex flex-col border-b border-slate-100 pb-3 mb-4 gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                    Insights Panel
                  </h3>
                </div>
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 w-full overflow-x-auto whitespace-nowrap scrollbar-none">
                  <button
                    onClick={() => { setActiveChartTab('hourly'); setHoveredHour(null); }}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer flex-1 text-center shrink-0 ${
                      activeChartTab === 'hourly' 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Peak Hours
                  </button>
                  <button
                    onClick={() => { setActiveChartTab('weekly'); setHoveredWeekIndex(null); }}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer flex-1 text-center shrink-0 ${
                      activeChartTab === 'weekly' 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Weekly Trends
                  </button>
                  <button
                    onClick={() => { setActiveChartTab('insights'); }}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 flex-1 text-center shrink-0 ${
                      activeChartTab === 'insights' 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <span>Audits & Alerts</span>
                    {(smartInsights.lateArrivals.length > 0 || smartInsights.longBreaks.length > 0) && (
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0"></span>
                    )}
                  </button>
                </div>
              </div>

              {/* Chart Content Area */}
              <div className="relative flex-1 flex flex-col justify-center min-h-[220px]">
                {activeChartTab === 'hourly' ? (
                  // Hourly Peaks Bar Chart
                  <div className="flex flex-col">
                    <svg className="w-full h-full max-h-[160px]" viewBox="0 0 480 200" preserveAspectRatio="xMidYMid meet">
                      {/* Grid Lines */}
                      {hourlyGridLines.map(({ ratio, yVal }) => (
                        <line key={ratio} x1="30" y1={yVal} x2="470" y2={yVal} stroke="#E2E8F0" strokeDasharray="3 3" />
                      ))}

                      {/* Bars & Interactive Areas */}
                      {hourlyPunchPeaks.map((d, i) => {
                        const maxVal = Math.max(...hourlyPunchPeaks.map(x => x.total), 1);
                        const colWidth = 440 / hourlyPunchPeaks.length;
                        const xCenter = 30 + i * colWidth + colWidth / 2;
                        const inHeight = (d.IN / maxVal) * 140;
                        const outHeight = (d.OUT / maxVal) * 140;
                        
                        const isSelected = selectedHourFilter === d.hour;
                        const opacity = selectedHourFilter === null || isSelected ? 1 : 0.25;

                        return (
                          <g key={d.hour} className="group/bar">
                            {/* Selected Background Highlight */}
                            {isSelected && (
                              <rect
                                x={30 + i * colWidth}
                                y="10"
                                width={colWidth}
                                height="150"
                                fill="rgba(37, 99, 235, 0.08)"
                                rx="4"
                              />
                            )}
                            {/* IN Bar */}
                            <rect 
                              x={xCenter - 8} 
                              y={15 + 140 - inHeight} 
                              width="6" 
                              height={inHeight} 
                              rx="1.5" 
                              fill="rgb(16, 185, 129)" 
                              opacity={opacity}
                              className="transition-all duration-200"
                            />
                            {/* OUT Bar */}
                            <rect 
                              x={xCenter + 2} 
                              y={15 + 140 - outHeight} 
                              width="6" 
                              height={outHeight} 
                              rx="1.5" 
                              fill="rgb(244, 63, 94)" 
                              opacity={opacity}
                              className="transition-all duration-200"
                            />
                            {/* Interactive Hover/Click Area */}
                            <rect
                              x={30 + i * colWidth}
                              y="15"
                              width={colWidth}
                              height="140"
                              fill="transparent"
                              className="cursor-pointer"
                              onMouseEnter={() => setHoveredHour(d.hour)}
                              onClick={() => {
                                setSelectedHourFilter(prev => prev === d.hour ? null : d.hour);
                                setActiveTab('logs');
                              }}
                            />
                            {/* Label - render every 3 hours */}
                            {d.hour % 3 === 0 && (
                              <text 
                                x={xCenter} 
                                y="175" 
                                textAnchor="middle" 
                                className="text-[9px] font-bold text-slate-400 fill-current"
                              >
                                {d.label}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>
 
                    {/* Integrated Tooltip Area */}
                    <div className="mt-4 min-h-[48px] bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex items-center justify-between text-xs transition-all">
                      {hoveredHour !== null ? (
                        (() => {
                          const hData = hourlyPunchPeaks.find(d => d.hour === hoveredHour);
                          if (!hData) return null;
                          const isSelected = selectedHourFilter === hoveredHour;
                          return (
                            <>
                              <div>
                                <span className="font-bold text-slate-900">{hData.label} Peak</span>
                                <span className="text-slate-400 block text-[10px]">
                                  {isSelected ? 'Click to clear filter' : 'Click to filter punch logs'}
                                </span>
                              </div>
                              <div className="flex gap-4">
                                <span className="flex items-center gap-1 font-semibold text-emerald-700">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span> IN: {hData.IN}
                                </span>
                                <span className="flex items-center gap-1 font-semibold text-rose-700">
                                  <span className="h-2 w-2 rounded-full bg-rose-500"></span> OUT: {hData.OUT}
                                </span>
                              </div>
                            </>
                          );
                        })()
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">
                          {selectedHourFilter !== null 
                            ? `Filtering logs by ${selectedHourFilter === 0 ? '12 AM' : selectedHourFilter === 12 ? '12 PM' : selectedHourFilter > 12 ? `${selectedHourFilter - 12} PM` : `${selectedHourFilter} AM`}. Click column to clear.`
                            : 'Hover columns to view details. Click columns to filter logs by specific hour.'}
                        </span>
                      )}
                    </div>
                  </div>
                ) : activeChartTab === 'weekly' ? (
                  // Weekly Trends Line Chart
                  <div className="flex flex-col">
                    <svg className="w-full h-full max-h-[160px]" viewBox="0 0 480 200" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgb(37, 99, 235)" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="rgb(37, 99, 235)" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Grid Lines */}
                      {weeklyGridLines.map(({ ratio, yVal }) => (
                        <line key={ratio} x1="30" y1={yVal} x2="460" y2={yVal} stroke="#E2E8F0" strokeDasharray="3 3" />
                      ))}

                      {/* Line Coordinates */}
                      {(() => {
                        const maxVal = Math.max(...weeklyPresenceTrends.map(d => d.count), totalWorkforce, 1);
                        const points = weeklyPresenceTrends.map((d, i) => {
                          const x = 30 + i * (430 / 6);
                          const y = 15 + 140 - (d.count / maxVal) * 140;
                          return { x, y, label: d.label, count: d.count };
                        });

                        const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                        const areaD = `${pathD} L ${points[points.length - 1].x} 155 L ${points[0].x} 155 Z`;

                        return (
                          <>
                            {/* Area Shading */}
                            <path d={areaD} fill="url(#areaGradient)" />

                            {/* Main Stroke Line */}
                            <path 
                              d={pathD} 
                              fill="none" 
                              stroke="rgb(37, 99, 235)" 
                              strokeWidth="2.5" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                            />

                            {/* Points & Interactive Zones */}
                            {points.map((p, i) => (
                              <g key={i}>
                                <circle 
                                  cx={p.x} 
                                  cy={p.y} 
                                  r={hoveredWeekIndex === i ? "5.5" : "4"} 
                                  fill="rgb(37, 99, 235)" 
                                  stroke="white" 
                                  strokeWidth="1.5" 
                                />
                                <text 
                                  x={p.x} 
                                  y="175" 
                                  textAnchor="middle" 
                                  className="text-[9px] font-bold text-slate-400 fill-current"
                                >
                                  {p.label}
                                </text>
                                {/* Interactive Column Segment */}
                                <rect 
                                  x={p.x - 215/6}
                                  y="15"
                                  width={430/6}
                                  height="140"
                                  fill="transparent"
                                  className="cursor-pointer"
                                  onMouseEnter={() => setHoveredWeekIndex(i)}
                                />
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>

                    {/* Integrated Tooltip Area */}
                    <div className="mt-4 min-h-[48px] bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex items-center justify-between text-xs transition-all">
                      {hoveredWeekIndex !== null && weeklyPresenceTrends[hoveredWeekIndex] ? (
                        <>
                          <div>
                            <span className="font-bold text-slate-900">{weeklyPresenceTrends[hoveredWeekIndex].label} Presence</span>
                            <span className="text-slate-400 block text-[10px]">Unique check-ins today</span>
                          </div>
                          <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                            {weeklyPresenceTrends[hoveredWeekIndex].count} / {totalWorkforce} Active
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">Hover over the weekly trend points above to view details.</span>
                      )}
                    </div>
                  </div>
                ) : (
                  // Audits & Alerts View
                  <div className="flex flex-col space-y-2.5 max-h-[220px] overflow-y-auto pr-1 text-slate-700">
                    
                    {/* Alert 1: Late Arrivals */}
                    {smartInsights.lateArrivals.length > 0 ? (
                      <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3 flex gap-2.5 items-start">
                        <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-amber-800 text-[11px] leading-tight">Late Arrivals Today ({smartInsights.lateArrivals.length})</div>
                          <p className="text-[10px] text-amber-600 font-medium mt-1 leading-snug">
                            {smartInsights.lateArrivals.map(emp => `${emp.name} (${emp.timeStr})`).join(', ')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-2.5 flex gap-2 items-center">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="font-bold text-emerald-800 text-[10px]">No late arrivals detected today!</span>
                      </div>
                    )}

                    {/* Alert 2: Forgotten Checkouts resolved by System */}
                    {(smartInsights.sysOutYesterday > 0 || smartInsights.sysOutToday > 0) && (
                      <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-3 flex gap-2.5 items-start">
                        <Fingerprint className="h-4.5 w-4.5 text-purple-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-purple-800 text-[11px] leading-tight">Biometric Auto-Fix Logs</div>
                          <p className="text-[10px] text-purple-650 font-medium mt-1 leading-snug">
                            {smartInsights.sysOutYesterday > 0 && `Yesterday: ${smartInsights.sysOutYesterday} clock-outs auto-injected.`}
                            {smartInsights.sysOutToday > 0 && ` Today: ${smartInsights.sysOutToday} virtual clock-out scheduled.`}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Alert 3: Long Breaks */}
                    {smartInsights.longBreaks.length > 0 && (
                      <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3 flex gap-2.5 items-start">
                        <Coffee className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-rose-800 text-[11px] leading-tight">Extended Break Time ({smartInsights.longBreaks.length})</div>
                          <p className="text-[10px] text-rose-650 font-medium mt-1 leading-snug">
                            {smartInsights.longBreaks.map(emp => `${emp.name} (${Math.round(emp.minutes)}m)`).join(', ')}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Alert 4: Overtime Shift Goals */}
                    {smartInsights.overtimeEmployees.length > 0 && (
                      <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex gap-2.5 items-start">
                        <Clock className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-blue-800 text-[11px] leading-tight">Active Shift Overtime ({smartInsights.overtimeEmployees.length})</div>
                          <p className="text-[10px] text-blue-650 font-medium mt-1 leading-snug">
                            {smartInsights.overtimeEmployees.map(emp => `${emp.name} (${Math.floor(emp.hours)}h worked)`).join(', ')}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Fallback when everything is perfect */}
                    {smartInsights.lateArrivals.length === 0 && smartInsights.longBreaks.length === 0 && smartInsights.overtimeEmployees.length === 0 && (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center text-slate-400">
                        <p className="text-xs font-semibold">Perfect Compliance Day</p>
                        <p className="text-[10px] mt-1">All clock-ins and active shifts are fully compliant with shift targets.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* System Status Summary */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-xs space-y-2 text-slate-500">
              <div className="flex justify-between font-medium">
                <span>Webhook Listener:</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Active Sync
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Polling Frequency:</span>
                <span>Every 15 minutes</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Last Updated:</span>
                <span className="font-mono text-slate-700 font-bold">{formatRefreshedTime(lastRefreshedTime)}</span>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Primary Content Area (2/3 Width) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Main Content Pane */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              
              {/* Content Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans">
                  🕒 Detailed Punch Activity Logs
                </span>
                <span className="text-[10px] font-bold text-slate-400 font-mono">
                  {filteredLogs.length} Records
                </span>
              </div>

              {/* TAB 1: Live Punch Logs Table */}
              {activeTab === 'logs' && (
                <div className="overflow-x-auto w-full">
                  {selectedHourFilter !== null && (
                    <div className="bg-blue-50/85 border-b border-blue-100 px-5 py-2.5 flex items-center justify-between text-xs text-blue-850 animate-fadeIn">
                      <span className="font-semibold flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
                        Filtering by Punch Hour:{' '}
                        <span className="font-mono bg-blue-100/80 px-2 py-0.5 rounded border border-blue-200">
                          {selectedHourFilter === 0
                            ? '12 AM'
                            : selectedHourFilter === 12
                            ? '12 PM'
                            : selectedHourFilter > 12
                            ? `${selectedHourFilter - 12} PM`
                            : `${selectedHourFilter} AM`}
                        </span>
                      </span>
                      <button
                        onClick={() => setSelectedHourFilter(null)}
                        className="text-blue-600 hover:text-blue-800 font-extrabold hover:underline cursor-pointer text-[10px] uppercase tracking-wider bg-white border border-blue-200 px-2.5 py-1 rounded-lg shadow-sm transition-all"
                      >
                        Clear Filter
                      </button>
                    </div>
                  )}
                  {isLoadingData && logs.length === 0 ? (
                    <div className="p-6 divide-y divide-slate-100">
                      {[...Array(5)].map((_, idx) => (
                        <div key={idx} className="py-4 flex items-center justify-between animate-pulse">
                          <div className="flex items-center space-x-4 w-1/3">
                            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                          </div>
                          <div className="h-6 bg-slate-200 rounded-full w-16"></div>
                          <div className="h-4 bg-slate-200 rounded w-1/6"></div>
                        </div>
                      ))}
                    </div>
                  ) : paginatedLogs.length > 0 ? (
                    <>
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                          <tr>
                            <th scope="col" className="px-5 py-3 text-left font-semibold">Log ID</th>
                            <th scope="col" className="px-5 py-3 text-left font-semibold">Employee</th>
                            <th scope="col" className="px-5 py-3 text-left font-semibold text-center">Direction</th>
                            <th scope="col" className="px-5 py-3 text-right font-semibold">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-150">
                          {paginatedLogs.map((log) => {
                            const emp = employees[log.employee_id] || { 
                              name: "Unknown Employee", 
                              role: "Staff Profile Not Found", 
                              department: "Unknown" 
                            };
                            const isNew = log.log_id === highlightedLogId;

                            return (
                              <tr 
                                key={log.log_id} 
                                className={`hover:bg-slate-50/80 transition-colors duration-200 border-b border-slate-200/60 ${isNew ? 'animate-flashRow' : ''}`}
                              >
                                <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono font-medium text-slate-500">
                                  {log.log_id}
                                </td>
                                <td className="px-5 py-3.5 whitespace-nowrap">
                                  <div>
                                    <div className="text-xs font-bold text-slate-900">{emp.name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono font-medium">{log.employee_id}</div>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5 whitespace-nowrap text-center">
                                  {log.direction === 'IN' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">
                                      <ArrowUpRight className="h-3 w-3" />
                                      IN
                                    </span>
                                  ) : log.direction === 'SYS_OUT' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-700 border border-purple-200 shadow-sm" title="System Auto-Checkout">
                                      <ArrowDownLeft className="h-3 w-3" />
                                      SYS OUT
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-200 shadow-sm">
                                      <ArrowDownLeft className="h-3 w-3" />
                                      OUT
                                    </span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 whitespace-nowrap text-xs text-right text-slate-700">
                                  <div className="font-mono font-semibold text-slate-900">{formatTimeStr(log.timestamp)}</div>
                                  <div className="text-[9px] text-slate-400 font-medium">{formatDateStr(log.timestamp)}</div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Pagination Bar */}
                      {filteredLogs.length > LOGS_PER_PAGE && (
                        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 bg-slate-50/50">
                          <div className="text-[10px] text-slate-500 font-medium">
                            Showing <span className="font-bold text-slate-800">{(logsPage - 1) * LOGS_PER_PAGE + 1}</span> to{' '}
                            <span className="font-bold text-slate-800">
                              {Math.min(logsPage * LOGS_PER_PAGE, filteredLogs.length)}
                            </span>{' '}
                            of <span className="font-bold text-slate-800">{filteredLogs.length}</span> logs
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setLogsPage(prev => Math.max(prev - 1, 1))}
                              disabled={logsPage === 1}
                              className="px-2.5 py-1 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-[10px] font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() => setLogsPage(prev => Math.min(prev + 1, totalLogsPages))}
                              disabled={logsPage === totalLogsPages}
                              className="px-2.5 py-1 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-[10px] font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-16 px-4 text-center flex flex-col items-center justify-center">
                      <div className="bg-slate-100 p-4 rounded-full text-slate-450 mb-3 border border-slate-200">
                        <UserX className="h-8 w-8" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">No records found</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm">
                        We couldn't find any logs matching employee name/ID "<span className="font-semibold">{searchQuery}</span>".
                      </p>
                      <button
                        onClick={() => { setSearchQuery(''); setStatusFilter('All'); setSelectedHourFilter(null); }}
                        className="mt-4 text-xs font-semibold text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 bg-blue-50 px-3.5 py-1.5 rounded-xl transition-all"
                      >
                        Clear Filters
                      </button>
                    </div>
                      )}
                </div>
              )}
            </div>

          </div>

        </div>
        )}
      </main>

      {/* Hidden container for PDF rendering */}
      {pdfReportHtml && (
        <div 
          id="pdf-report-render-target" 
          dangerouslySetInnerHTML={{ __html: pdfReportHtml }} 
          style={{ 
            position: 'absolute', 
            left: '-9999px', 
            top: '-9999px', 
            width: '794px', 
            background: 'white',
            zIndex: -999,
            pointerEvents: 'none'
          }} 
        />
      )}

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

      {/* Employee Profile & Analytics Modal */}
      {selectedProfileEmpId && selectedEmployeeAnalytics && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-lg text-slate-200 shadow-inner">
                  {(employees[selectedProfileEmpId]?.name || 'E').split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base tracking-tight">{employees[selectedProfileEmpId]?.name}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      (employeePresenceMap[selectedProfileEmpId]?.status === 'IN') 
                        ? 'bg-emerald-500/20 text-emerald-305 border border-emerald-500/30' 
                        : 'bg-slate-700 text-slate-350 border border-slate-650'
                    }`}>
                      {(employeePresenceMap[selectedProfileEmpId]?.status === 'IN') ? 'IN' : 'OUT'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedProfileEmpId} • Staff Member</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadIndividualPDF}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-sm border border-blue-500 hover:scale-[1.02]"
                  title="Download Individual Performance PDF Report"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export PDF
                </button>
                
                <button
                  onClick={() => setSelectedProfileEmpId(null)}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 transition-all p-1.5 rounded-lg cursor-pointer"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {/* Analytics Summary Stats Grid */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Performance Analytics</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Goal Compliance Gauge */}
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Goal Compliance</p>
                      <p className="text-xl font-black text-slate-900 font-mono">
                        {Math.round(selectedEmployeeAnalytics.goalComplianceRate)}%
                      </p>
                      <p className="text-[9px] text-slate-505 font-medium">Days met 7h+ goal</p>
                    </div>
                    <div className="relative h-14 w-14">
                      {/* SVG Gauge */}
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="28" cy="28" r="22" className="stroke-slate-200 fill-transparent" strokeWidth="4" />
                        <circle 
                          cx="28" 
                          cy="28" 
                          r="22" 
                          className={`${selectedEmployeeAnalytics.goalComplianceRate >= 75 ? 'stroke-emerald-500' : selectedEmployeeAnalytics.goalComplianceRate >= 50 ? 'stroke-amber-500' : 'stroke-rose-500'} fill-transparent`} 
                          strokeWidth="4" 
                          strokeDasharray={2 * Math.PI * 22}
                          strokeDashoffset={2 * Math.PI * 22 * (1 - selectedEmployeeAnalytics.goalComplianceRate / 100)}
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Punctuality Gauge */}
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">On-Time Arrival</p>
                      <p className="text-xl font-black text-slate-900 font-mono">
                        {Math.round(selectedEmployeeAnalytics.punctualityRate)}%
                      </p>
                      <p className="text-[9px] text-slate-505 font-medium">First In by 9:15 AM</p>
                    </div>
                    <div className="relative h-14 w-14">
                      {/* SVG Gauge */}
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="28" cy="28" r="22" className="stroke-slate-200 fill-transparent" strokeWidth="4" />
                        <circle 
                          cx="28" 
                          cy="28" 
                          r="22" 
                          className={`${selectedEmployeeAnalytics.punctualityRate >= 85 ? 'stroke-emerald-500' : selectedEmployeeAnalytics.punctualityRate >= 60 ? 'stroke-amber-500' : 'stroke-rose-500'} fill-transparent`} 
                          strokeWidth="4" 
                          strokeDasharray={2 * Math.PI * 22}
                          strokeDashoffset={2 * Math.PI * 22 * (1 - selectedEmployeeAnalytics.punctualityRate / 100)}
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Avg Daily Hours */}
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Daily Hours</p>
                    <div className="flex items-baseline gap-1">
                      <p className="text-xl font-black text-slate-950 font-mono">
                        {Math.floor(selectedEmployeeAnalytics.avgWorkHours)}h
                      </p>
                      <p className="text-sm font-bold text-slate-605 font-mono">
                        {Math.round((selectedEmployeeAnalytics.avgWorkHours % 1) * 60)}m
                      </p>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${selectedEmployeeAnalytics.avgWorkHours >= 7 ? 'bg-emerald-500' : 'bg-amber-500'} transition-all`} 
                        style={{ width: `${Math.min((selectedEmployeeAnalytics.avgWorkHours / 8) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Avg Breaks */}
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Daily Break</p>
                    <div className="flex items-baseline gap-1">
                      <p className="text-xl font-black text-amber-600 font-mono">
                        {Math.floor(selectedEmployeeAnalytics.avgBreakHours)}h
                      </p>
                      <p className="text-sm font-bold text-amber-550 font-mono">
                        {Math.round((selectedEmployeeAnalytics.avgBreakHours % 1) * 60)}m
                      </p>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 transition-all" 
                        style={{ width: `${Math.min((selectedEmployeeAnalytics.avgBreakHours / 2) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 30-Day Attendance Heatmap & Trend */}
              <div className="bg-slate-50 border border-slate-150 p-5 rounded-2xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    30-Day Attendance Heatmap & Trend
                  </h4>
                  <div className="flex flex-wrap items-center gap-3 text-[9px] font-bold text-slate-500">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-slate-200"></span> Absent</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-amber-500"></span> Short Hours</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-emerald-500"></span> Goal Met</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded border border-rose-400 bg-white"></span> Late Arrival</span>
                  </div>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2.5">
                  {heatmapDays.map((item, idx) => {
                    const { date, summary } = item;
                    const dateFormatted = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                    
                    let bgClass = 'bg-slate-200/70 hover:bg-slate-300/80 text-slate-400';
                    let borderClass = 'border-transparent';
                    let tooltipText = `${dateFormatted}: Absent (No Logs)`;
                    
                    if (summary) {
                      const hrs = Math.floor(summary.hoursWorked);
                      const mins = Math.round((summary.hoursWorked % 1) * 60);
                      
                      if (summary.isGoalMet) {
                        bgClass = 'bg-emerald-500 hover:bg-emerald-600 text-white';
                      } else {
                        bgClass = 'bg-amber-500 hover:bg-amber-600 text-white';
                      }
                      
                      if (!summary.isOnTime) {
                        borderClass = 'border-rose-455 border-2';
                      }
                      
                      tooltipText = `${dateFormatted}: ${hrs}h ${mins}m worked | In: ${summary.firstIn} | Out: ${summary.lastOut} ${summary.isOnTime ? '(On-time)' : '(Late)'}`;
                    }

                    return (
                      <div
                        key={idx}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center text-[10px] font-black transition-all cursor-help relative group/heatmap-cell ${bgClass} ${borderClass} border shadow-inner`}
                        title={tooltipText}
                      >
                        {date.getDate()}
                        {/* Custom Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/heatmap-cell:block z-50 bg-slate-950 text-white text-[9px] font-bold py-1.5 px-2.5 rounded-lg shadow-xl whitespace-nowrap pointer-events-none border border-slate-800">
                          {tooltipText}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Attendance Log History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Attendance Log History</h4>
                  <span className="text-[10px] text-slate-500 font-medium">{selectedEmployeeAnalytics.daysPresentCount} days recorded</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs text-slate-500">
                      <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">Date</th>
                          <th className="px-4 py-2.5">First Clock In</th>
                          <th className="px-4 py-2.5">Last Clock Out</th>
                          <th className="px-4 py-2.5 text-center">Work Duration</th>
                          <th className="px-4 py-2.5 text-center">Break Duration</th>
                          <th className="px-4 py-2.5 text-right">Compliance</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-150">
                        {selectedEmployeeAnalytics.daySummaries.map((day, dIdx) => (
                          <tr key={dIdx} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 font-semibold text-slate-900">{day.dateStr}</td>
                            <td className="px-4 py-2.5 font-mono text-slate-705">{day.firstIn}</td>
                            <td className="px-4 py-2.5 font-mono text-slate-705">{day.lastOut}</td>
                            <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-800">
                              {Math.floor(day.hoursWorked)}h {Math.round((day.hoursWorked % 1) * 60)}m
                            </td>
                            <td className="px-4 py-2.5 text-center font-mono text-slate-600">
                              {Math.floor(day.breakHours)}h {Math.round((day.breakHours % 1) * 60)}m
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <div className="flex justify-end gap-1.5">
                                {day.isGoalMet ? (
                                  <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-50 text-emerald-705 border border-emerald-100 uppercase">
                                    Goal Met
                                  </span>
                                ) : (
                                  <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold bg-rose-50 text-rose-705 border border-rose-100 uppercase">
                                    Short Hrs
                                  </span>
                                )}
                                {!day.isOnTime && (
                                  <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-50 text-amber-705 border border-amber-100 uppercase">
                                    Late
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end">
              <button
                onClick={() => setSelectedProfileEmpId(null)}
                className="px-4 py-2 border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-sm"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      )}

      {/* Login Overlay */}
      {showLogin && (
        <div className={`fixed inset-0 z-50 bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-all duration-300 ease-out ${
          isLoginFading ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 animate-fadeIn'
        }`}>
          <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
            <div className="bg-white p-2.5 rounded-2xl shadow-md mb-4 border border-slate-200 w-16 h-16 flex items-center justify-center shrink-0 hover:scale-105 transition-all duration-300 animate-fadeIn">
              <img src="/dpi.png" alt="DPI Logo" className="h-11 w-11 object-contain" />
            </div>
            <h2 className="text-center text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Sign in to DPI Attendance
            </h2>
            <p className="mt-1 text-center text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest font-sans">
              Secured Dashboard System
            </p>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white border border-slate-200/80 shadow-xl rounded-2xl p-6 sm:p-10 space-y-6 animate-fadeIn">
              {loginError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-lg text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form className="space-y-5" onSubmit={handleLogin}>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="Enter username"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-808 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-808 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              </form>

              <div className="text-center pt-2 border-t border-slate-100">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Secured Administrative Console
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* App Loader Overlay */}
      {showLoader && (
        <div className={`fixed inset-0 z-[100] bg-slate-50 flex flex-col items-center justify-center p-4 transition-all duration-300 ease-out ${
          isLoaderFading ? 'opacity-0 pointer-events-none scale-105' : 'opacity-100'
        }`}>
          <div className="flex flex-col items-center max-w-sm text-center space-y-6">
            <div className="relative flex items-center justify-center h-28 w-28">
              {/* Biometric pulse waves */}
              <div className="absolute inset-0 rounded-full border border-blue-500/30 animate-wave1"></div>
              <div className="absolute inset-0 rounded-full border border-blue-500/20 animate-wave2"></div>
              {/* Spinning orbital dash ring */}
              <div className="absolute inset-0 rounded-full border border-dashed border-slate-200/80 animate-orbit"></div>
              {/* Rotating glow aura */}
              <div className="absolute inset-[-8px] rounded-full bg-gradient-to-tr from-blue-500/10 via-indigo-500/5 to-cyan-500/10 animate-spin-slow"></div>
              {/* Inner pulsing glow */}
              <div className="absolute inset-4 rounded-full bg-blue-500/5 blur-xl animate-pulse"></div>
              {/* Outer spinning ring */}
              <div className="absolute inset-2 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin"></div>
              {/* Logo container */}
              <div className="absolute inset-6 bg-white/90 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center p-3 animate-logoPulse">
                <img src="/dpi.png" alt="DPI Logo" className="h-12 w-12 object-contain" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-slate-800 font-extrabold text-lg tracking-tight font-sans">DPI Attendance</h2>
              <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest font-mono animate-pulse">
                Initializing Secure Connection...
              </p>
            </div>
            <div className="w-32 bg-slate-200 h-0.5 rounded-full overflow-hidden border border-slate-100 relative">
              <div className="absolute top-0 bottom-0 bg-blue-600 rounded-full animate-shimmer" style={{ width: '40%' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
