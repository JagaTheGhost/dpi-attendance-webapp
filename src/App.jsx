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
  Coffee
} from 'lucide-react';
import { supabase } from './supabaseClient';

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

const injectVirtualLogs = (rawLogs, currentTime = new Date()) => {
  if (!rawLogs || rawLogs.length === 0) return [];
  
  const logsByEmpAndDate = {};
  rawLogs.forEach(log => {
    const empId = log.employee_id;
    const dateStr = new Date(log.timestamp).toDateString();
    if (!logsByEmpAndDate[empId]) logsByEmpAndDate[empId] = {};
    if (!logsByEmpAndDate[empId][dateStr]) logsByEmpAndDate[empId][dateStr] = [];
    logsByEmpAndDate[empId][dateStr].push(log);
  });

  const virtualLogs = [];
  const todayStr = currentTime.toDateString();

  Object.keys(logsByEmpAndDate).forEach(empId => {
    Object.keys(logsByEmpAndDate[empId]).forEach(dateStr => {
      if (dateStr === todayStr) return;

      const dayLogs = [...logsByEmpAndDate[empId][dateStr]].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      const lastLog = dayLogs[dayLogs.length - 1];

      if (lastLog.direction === 'IN') {
        const firstInTime = new Date(dayLogs[0].timestamp);
        let autoOutTime = new Date(firstInTime.getTime() + 8 * 60 * 60 * 1000);
        const endOfDay = new Date(firstInTime);
        endOfDay.setHours(23, 59, 59, 999);
        if (autoOutTime > endOfDay) {
          autoOutTime = endOfDay;
        }

        virtualLogs.push({
          log_id: `SYS-${empId}-${dateStr.replace(/ /g, '-')}`,
          employee_id: empId,
          timestamp: autoOutTime.toISOString(),
          direction: 'SYS_OUT',
          isSystemGenerated: true
        });
      }
    });
  });

  return [...rawLogs, ...virtualLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
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
  
  // Navigation & Pagination state
  const [activeTab, setActiveTab] = useState('logs'); // 'logs' or 'presence'
  const [activeChartTab, setActiveChartTab] = useState('hourly'); // 'hourly' or 'weekly'
  const [logsPage, setLogsPage] = useState(1);
  const [presencePage, setPresencePage] = useState(1);

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

  const [isSingleDropdownOpen, setIsSingleDropdownOpen] = useState(false);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isExportDateDropdownOpen, setIsExportDateDropdownOpen] = useState(false);
  const [exportSingleSearch, setExportSingleSearch] = useState('');

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

      if (empData && empData.length > 0) {
        const employeeMap = {};
        empData.forEach(emp => {
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
        .limit(100);

      if (logsError) throw logsError;

      if (logsData) {
        const formattedLogs = logsData.map(log => ({
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
    }
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
  }, [isSupabaseMode]);

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

      const logDate = new Date(log.timestamp);
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
        const time = new Date(punch.timestamp);
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
        const firstInTime = new Date(firstInPunch.timestamp);
        const lastPunch = todayPunches[todayPunches.length - 1];
        const endReferenceTime = lastPunch.direction === 'IN' ? currentTime : new Date(lastPunch.timestamp);
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
        const firstIn = new Date(todayInPunches[0].timestamp);
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
        const time = new Date(punch.timestamp);
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
        const firstInTime = new Date(firstInPunch.timestamp);
        const lastPunch = todayPunches[todayPunches.length - 1];
        const endReferenceTime = lastPunch.direction === 'IN' ? currentTime : new Date(lastPunch.timestamp);
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
        const logDate = new Date(log.timestamp).toDateString();
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

      return searchQuery.trim() === '' || 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.employee_id.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [processedLogs, employees, searchQuery]);

  const filteredLogs = useMemo(() => {
    return logsFilteredBySearch.filter(log => {
      // Filter by Punch Direction (handle SYS_OUT as OUT)
      const matchesStatus = statusFilter === 'All' || 
        log.direction === statusFilter || 
        (statusFilter === 'OUT' && log.direction === 'SYS_OUT');

      // Filter by Date (Today vs All)
      let matchesDate = true;
      if (dateScope === 'today') {
        const logDate = new Date(log.timestamp);
        matchesDate = logDate.toDateString() === currentTime.toDateString();
      }

      // Filter by Hour
      let matchesHour = true;
      if (selectedHourFilter !== null) {
        const logDate = new Date(log.timestamp);
        matchesHour = logDate.getHours() === selectedHourFilter;
      }

      return matchesStatus && matchesDate && matchesHour;
    });
  }, [logsFilteredBySearch, statusFilter, dateScope, currentTime, selectedHourFilter]);

  // Filtered employees for Presence Grid Board
  const filteredEmployeesList = useMemo(() => {
    return Object.entries(employees).filter(([empId, emp]) => {
      const matchesSearch = searchQuery.trim() === '' || 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        empId.toLowerCase().includes(searchQuery.toLowerCase());

      const statusData = employeePresenceMap[empId] || { status: 'OUT' };
      const matchesStatus = statusFilter === 'All' || statusData.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [employees, searchQuery, statusFilter, employeePresenceMap]);

  // ==========================================
  // 9. Pagination Calculators (useMemo)
  // ==========================================
  const totalLogsPages = useMemo(() => {
    return Math.ceil(filteredLogs.length / LOGS_PER_PAGE) || 1;
  }, [filteredLogs]);

  const totalPresencePages = useMemo(() => {
    return Math.ceil(filteredEmployeesList.length / EMPLOYEES_PER_PAGE) || 1;
  }, [filteredEmployeesList]);

  // Paginated content slices
  const paginatedLogs = useMemo(() => {
    const start = (logsPage - 1) * LOGS_PER_PAGE;
    return filteredLogs.slice(start, start + LOGS_PER_PAGE);
  }, [filteredLogs, logsPage]);

  const paginatedEmployees = useMemo(() => {
    const start = (presencePage - 1) * EMPLOYEES_PER_PAGE;
    return filteredEmployeesList.slice(start, start + EMPLOYEES_PER_PAGE);
  }, [filteredEmployeesList, presencePage]);

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
      const d = new Date(log.timestamp);
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
        const logDate = new Date(log.timestamp);
        if (logDate.toDateString() === targetDate.toDateString() && log.direction === 'IN') {
          uniqueEmps.add(log.employee_id);
        }
      });
      
      day.count = uniqueEmps.size;
    });

    return list;
  }, [logsFilteredBySearch]);

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

    const sortedPunches = [...punchesToday].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const firstPunchTime = new Date(sortedPunches[0].timestamp);
    const lastPunch = sortedPunches[sortedPunches.length - 1];
    const lastPunchTime = lastPunch.direction === 'IN' ? currentTime : new Date(lastPunch.timestamp);

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
      const punchTime = new Date(punch.timestamp);
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
  
  // Calculate boundary ISO strings
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

      const mapped = (data || []).map(log => ({
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

    const sortedLogs = [...fetchedLogs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const groupedByEmployeeAndDay = {};

    sortedLogs.forEach(log => {
      const empId = log.employee_id;
      if (!timesheet[empId]) return;

      timesheet[empId].punchesCount++;
      const dateStr = new Date(log.timestamp).toDateString();
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
          const time = new Date(log.timestamp);
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
              const mapped = data.map(log => ({
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
        const d = new Date(log.timestamp);
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
      setIsExportModalOpen(false);
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
          setIsExportModalOpen(false);
        }, 1200);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  // Action: Print HTML report layout
  const handlePrintPDFReport = async () => {
    const fetchedLogs = await fetchExportData();
    const timesheetList = compileTimesheetData(fetchedLogs);
    const { startISO, endISO } = getDateRangeBounds(exportDateRange, exportStartDate, exportEndDate);
    
    const startStr = new Date(startISO).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const endStr = new Date(endISO).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Popup blocked! Please allow popups to generate print layouts.");
      return;
    }

    let title = '';
    let contentHtml = '';

    if (exportReportType === 'logs') {
      title = 'Detailed Biometric Punch Logs Report';
      const logChunks = chunkArray(fetchedLogs, 20);

      contentHtml = logChunks.map((chunk, index) => {
        const tableHtml = `
          <table class="report-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Direction</th>
                <th>Date</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              ${chunk.map(log => {
                const emp = employees[log.employee_id] || { name: 'Unknown Employee' };
                const d = new Date(log.timestamp);
                return `
                  <tr>
                    <td>${log.log_id}</td>
                    <td>${log.employee_id}</td>
                    <td><strong>${emp.name}</strong></td>
                    <td>
                      <span class="badge ${log.direction === 'IN' ? 'badge-in' : log.direction === 'SYS_OUT' ? 'badge-sys-out' : 'badge-out'}">${log.direction === 'SYS_OUT' ? 'SYS OUT' : log.direction}</span>
                    </td>
                    <td>${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td>${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;

        return `
          <div class="page-container">
            <div class="header">
              <div>
                <h1 class="title">${title}</h1>
                <div class="subtitle">DPI Attendance Monitoring Dashboard</div>
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
                <p style="font-size: 9px; color: #94a3b8; margin: 0;">This is an automated biometric report synced directly from cloud logs.</p>
              </div>
              <div class="signature-box">
                Authorized Signature
              </div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      title = 'Workforce Timesheet & Compliance Report';
      const timesheetChunks = chunkArray(timesheetList, 20);

      contentHtml = timesheetChunks.map((chunk, index) => {
        const tableHtml = `
          <table class="report-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Days Present</th>
                <th>Total Punches</th>
                <th>Total Hours Worked</th>
                <th>Total Break Hours</th>
                <th>Avg Daily Hours</th>
                <th>Shift Goal Status</th>
              </tr>
            </thead>
            <tbody>
              ${chunk.map(item => {
                const avgHours = item.daysPresent.size > 0 ? (item.totalHours / item.daysPresent.size) : 0;
                const goalStatus = avgHours >= 7 ? 'Completed' : 'Incomplete';
                const formattedTotalHours = `${Math.floor(item.totalHours)}h ${Math.round((item.totalHours % 1) * 60)}m`;
                const formattedBreakHours = `${Math.floor(item.totalBreakHours || 0)}h ${Math.round(((item.totalBreakHours || 0) % 1) * 60)}m`;
                const formattedAvgHours = `${Math.floor(avgHours)}h ${Math.round((avgHours % 1) * 60)}m`;
                
                return `
                  <tr>
                    <td>${item.empId}</td>
                    <td><strong>${item.name}</strong></td>
                    <td>${item.daysPresent.size}</td>
                    <td>${item.punchesCount}</td>
                    <td>${formattedTotalHours}</td>
                    <td>${formattedBreakHours}</td>
                    <td>${formattedAvgHours}</td>
                    <td>
                      <span class="badge ${goalStatus === 'Completed' ? 'badge-in' : 'badge-out'}">${goalStatus}</span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;

        return `
          <div class="page-container">
            <div class="header">
              <div>
                <h1 class="title">${title}</h1>
                <div class="subtitle">DPI Attendance Monitoring Dashboard</div>
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
                <p style="font-size: 9px; color: #94a3b8; margin: 0;">This is an automated biometric report synced directly from cloud logs.</p>
              </div>
              <div class="signature-box">
                Authorized Signature
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page { size: auto; margin: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; line-height: 1.5; }
            
            .page-container {
              page-break-after: always;
              break-after: page;
              box-sizing: border-box;
              padding: 15mm 20mm;
              height: 100vh;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }

            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 12px; }
            .title { font-size: 18px; font-weight: bold; color: #0f172a; margin: 0; }
            .subtitle { font-size: 10px; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: bold; }
            .meta-info { text-align: right; font-size: 10px; color: #475569; line-height: 1.4; }
            
            .main-content { flex-grow: 1; }
            table.report-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            table.report-table th { background: #f1f5f9; font-size: 10px; font-weight: bold; text-transform: uppercase; color: #475569; text-align: left; padding: 8px 10px; border-bottom: 2px solid #cbd5e1; }
            table.report-table td { font-size: 10px; padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
            table.report-table tr:nth-child(even) { background: #f8fafc; }
            table.report-table tr { page-break-inside: avoid; }
            
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase; }
            .badge-in { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
            .badge-sys-out { background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; }
            .badge-out { background: #ffe4e6; color: #b91c1c; border: 1px solid #fecdd3; }
            
            .footer { border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; }
            .signature-box { width: 180px; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 10px; color: #64748b; font-weight: bold; }
          </style>
        </head>
        <body>
          ${contentHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);

    setExportSuccess(true);
    setTimeout(() => {
      setExportSuccess(false);
      setIsExportModalOpen(false);
    }, 1200);
  };

  // Formatting utilities
  const formatTimeStr = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDateStr = (isoString) => {
    const d = new Date(isoString);
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-800 flex flex-col">
      {/* Header Section */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          
          {/* Logo & Subtitle */}
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="bg-blue-600 p-2 rounded-xl shadow-md text-white shrink-0">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-[15px] sm:text-lg font-bold text-slate-900 tracking-tight">
                Biometric Attendance Radar
              </h1>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Live Webhook Monitor</p>
            </div>
          </div>

          {/* Controls & Connection Status */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            
            {/* Clock */}
            <div className="col-span-2 sm:col-span-auto flex items-center justify-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>{currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
              <span className="text-slate-300">|</span>
              <span className="font-mono text-slate-950">
                {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </span>
            </div>

            {/* Connection Indicator */}
            {isSupabaseMode ? (
              <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0"></span>
                Offline
              </span>
            )}

            {/* Sync Now Action */}
            <button
              onClick={triggerManualRefresh}
              disabled={isLoadingData}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${isLoadingData ? 'animate-spin' : ''}`} />
              <span>Sync Now</span>
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
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-5 border-b sm:border-b-0 w-full sm:w-auto pb-2.5 sm:pb-0 overflow-x-auto whitespace-nowrap scrollbar-none">
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
              👥 Presence & Shift Board
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

          {/* Filter Bar (Only shown on Logs & Presence tabs) */}
          {activeTab !== 'export' && (
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 w-full md:w-auto">
              
              {/* Row 1 on mobile: Search Bar + Jump-to-Export button */}
              <div className="flex items-center gap-2 w-full md:w-auto md:flex-1">
                {/* Search Input */}
                <div className="relative flex-1 md:w-44">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Name/ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white placeholder-slate-400 text-slate-700 outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                {/* Quick Jump to Export Tab (Only visible on Row 1 on mobile) */}
                <button
                  onClick={() => {
                    setExportReportType(activeTab === 'logs' ? 'logs' : 'timesheet');
                    setActiveTab('export');
                  }}
                  className="flex items-center justify-center p-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-sm cursor-pointer md:hidden shrink-0"
                  title="Go to Export Hub"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                </button>
              </div>

              {/* Row 2 on mobile: Date Scope + Status Selectors */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                {/* Date Scope Selector */}
                {activeTab === 'logs' && (
                  <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 flex-1 md:flex-initial">
                    <button
                      onClick={() => setDateScope('today')}
                      className={`flex-1 md:flex-initial text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                        dateScope === 'today' 
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setDateScope('all')}
                      className={`flex-1 md:flex-initial text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                        dateScope === 'all' 
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      All History
                    </button>
                  </div>
                )}

                {/* Presence Status Selector */}
                <div className="relative md:w-36 flex-1 md:flex-initial status-dropdown-container">
                  <button
                    type="button"
                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 outline-none cursor-pointer flex items-center justify-between shadow-sm hover:border-slate-300 transition-all text-left"
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

                {/* Quick Jump to Export Tab (Only visible on desktop) */}
                <button
                  onClick={() => {
                    setExportReportType(activeTab === 'logs' ? 'logs' : 'timesheet');
                    setActiveTab('export');
                  }}
                  className="hidden md:flex items-center justify-center p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-sm cursor-pointer shrink-0"
                  title="Go to Export Hub"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                </button>
              </div>

            </div>
          )}
        </div>

        {activeTab === 'export' ? (
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

              <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">4. Export Actions</h3>
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
                  onClick={handlePrintPDFReport}
                  disabled={copySuccess || exportSuccess || isFetchingExportData || isPreviewLoading}
                  className="w-full py-2.5 px-3 border border-emerald-250 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                >
                  <Printer className="h-4 w-4 text-emerald-600" />
                  {isFetchingExportData ? 'Preparing...' : 'Print Report / Save as PDF'}
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
                                  <div className="font-mono">{new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</div>
                                  <div className="text-[9px] text-slate-400">{new Date(log.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
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
                  {activeTab === 'logs' ? '🕒 Detailed Punch Activity Logs' : '👥 Presence Status & Hours Compliance'}
                </span>
                <span className="text-[10px] font-bold text-slate-400 font-mono">
                  {activeTab === 'logs' ? `${filteredLogs.length} Records` : `${filteredEmployeesList.length} Staff Profiles`}
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

              {/* TAB 2: Presence & Shift Board Grid */}
              {activeTab === 'presence' && (
                <div className="p-5">
                  {paginatedEmployees.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        {paginatedEmployees.map(([empId, emp]) => {
                          const statusData = employeePresenceMap[empId] || {
                            status: 'OUT',
                            lastPunchTime: null,
                            hoursWorkedToday: 0,
                            formattedTime: '0h 0m'
                          };
                          
                          const isInside = statusData.status === 'IN';
                          const shiftHoursGoal = 8;
                          const completionPercent = Math.min((statusData.hoursWorkedToday / shiftHoursGoal) * 100, 100);
                          const segments = getTimelineSegments(statusData.punchesToday, currentTime);

                          let progressColor = 'bg-amber-500';
                          if (statusData.hoursWorkedToday >= 7) {
                            progressColor = 'bg-emerald-500';
                          } else if (statusData.hoursWorkedToday >= 4) {
                            progressColor = 'bg-blue-600';
                          }

                          return (
                            <div 
                              key={empId} 
                              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all duration-200"
                            >
                              {/* Identity Header */}
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900">{emp.name}</h4>
                                  <p className="text-[9px] font-mono text-slate-400 font-bold mt-0.5">{empId}</p>
                                </div>
                                
                                {isInside ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    IN
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-250">
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                                    OUT
                                  </span>
                                )}
                              </div>

                              {/* Hours worked progress */}
                              <div className="mt-4 space-y-2.5">
                                <div className="flex items-center justify-between text-[10px] border-b border-slate-50 pb-1.5">
                                  <span className="text-slate-455 font-medium">Last Punch:</span>
                                  <span className="font-mono text-slate-705 font-bold">
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
                                            className={`${colorClass} h-full transition-all cursor-pointer relative group/timeline-seg`}
                                            style={{ width: `${seg.width}%` }}
                                            title={tooltipText}
                                          >
                                            {/* Custom Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/timeline-seg:block z-50 bg-slate-900 text-white text-[8px] font-bold py-1 px-2 rounded shadow-md whitespace-nowrap pointer-events-none">
                                              {tooltipText}
                                            </div>
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <div 
                                        className="w-full h-full bg-slate-100 hover:bg-slate-150/80 transition-colors flex items-center justify-center text-[8px] font-bold text-slate-400 cursor-help"
                                        title="No punch activity recorded today."
                                      >
                                        No activity today
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Progress bar */}
                                <div className="space-y-1">
                                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-150">
                                    <div 
                                      className={`h-full ${progressColor} transition-all duration-300`} 
                                      style={{ width: `${completionPercent}%` }}
                                    ></div>
                                  </div>
                                  <div className="flex justify-between text-[8px] font-bold text-slate-400">
                                    <span>Shift Progress</span>
                                    <span className="font-mono">{Math.round(completionPercent)}%</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination Bar */}
                      {filteredEmployeesList.length > EMPLOYEES_PER_PAGE && (
                        <div className="flex items-center justify-between border-t border-slate-200 pt-4 bg-transparent">
                          <div className="text-[10px] text-slate-500 font-medium">
                            Showing <span className="font-bold text-slate-800">{(presencePage - 1) * EMPLOYEES_PER_PAGE + 1}</span> to{' '}
                            <span className="font-bold text-slate-800">
                              {Math.min(presencePage * EMPLOYEES_PER_PAGE, filteredEmployeesList.length)}
                            </span>{' '}
                            of <span className="font-bold text-slate-800">{filteredEmployeesList.length}</span> employees
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setPresencePage(prev => Math.max(prev - 1, 1))}
                              disabled={presencePage === 1}
                              className="px-2.5 py-1 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-[10px] font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
                            >
                              Previous
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
              )}
            </div>

          </div>

        </div>
        )}
      </main>

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
  );
}
