import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabaseClient';
import { STATIC_EMPLOYEES, INITIAL_LOGS } from '@/utils/constants';
import { getDateRangeBounds } from '@/utils/dateUtils';

export function useAttendanceData() {
  const [employees, setEmployees] = useState(STATIC_EMPLOYEES);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [analyticsLogs, setAnalyticsLogs] = useState([]);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [hasHitQueryLimit, setHasHitQueryLimit] = useState(false);
  const [queryLimitMessage, setQueryLimitMessage] = useState(null);

  const [isSupabaseMode, setIsSupabaseMode] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoaderFading, setIsLoaderFading] = useState(false);
  const [lastRefreshedTime, setLastRefreshedTime] = useState(null);
  const [highlightedLogId, setHighlightedLogId] = useState(null);

  const loadDatabaseData = useCallback(async (showLoadingIndicator = true) => {
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

      // Process primary employee_devices table
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

      // Fallback to base employees table
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
        .limit(1000);

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
  }, []);

  // On-demand employee history query
  const fetchEmployeeHistory = useCallback(async (empId) => {
    if (!supabase || !empId) return [];
    try {
      const { data, error } = await supabase
        .from('biometric_logs')
        .select('*')
        .eq('employee_id', empId)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      if (data) {
        return data.map(log => ({
          log_id: `LOG-${log.id}`,
          employee_id: log.employee_id,
          timestamp: log.timestamp,
          direction: log.direction
        }));
      }
      return [];
    } catch (err) {
      console.error(`Failed to fetch history for employee ${empId}:`, err);
      return [];
    }
  }, []);

  // Auto-paginated complete analytics logs fetcher
  const fetchAnalyticsLogs = useCallback(async (scope, startInput, endInput) => {
    if (!supabase) return;
    setIsAnalyticsLoading(true);
    setHasHitQueryLimit(false);
    setQueryLimitMessage(null);

    try {
      const { startISO, endISO } = getDateRangeBounds(scope, startInput, endInput);
      
      let allLogs = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;
      let iterations = 0;
      const MAX_ITERATIONS = 10; // Up to 10,000 logs max per window

      while (hasMore && iterations < MAX_ITERATIONS) {
        iterations++;
        const { data, error } = await supabase
          .from('biometric_logs')
          .select('*')
          .gte('timestamp', startISO)
          .lte('timestamp', endISO)
          .order('timestamp', { ascending: false })
          .range(from, from + step - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allLogs = [...allLogs, ...data];
          if (data.length < step) {
            hasMore = false;
          } else {
            from += step;
          }
        } else {
          hasMore = false;
        }
      }

      if (iterations >= MAX_ITERATIONS && hasMore) {
        setHasHitQueryLimit(true);
        setQueryLimitMessage(`Loaded max safety limit of 10,000 logs for ${scope === 'custom' ? 'custom date window' : scope}. Showing top 10,000 records.`);
      }

      const formatted = allLogs.map(log => ({
        log_id: `LOG-${log.id}`,
        employee_id: log.employee_id,
        timestamp: log.timestamp,
        direction: log.direction
      }));

      setAnalyticsLogs(formatted);
    } catch (err) {
      console.error("Failed to fetch analytics logs:", err);
    } finally {
      setIsAnalyticsLoading(false);
    }
  }, []);

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
  }, [loadDatabaseData]);

  // Realtime subscription channel
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

          setLogs((prevLogs) => [newLog, ...prevLogs]);
          setHighlightedLogId(newLog.log_id);
          setTimeout(() => setHighlightedLogId(null), 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSupabaseMode, employees]);

  return {
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
  };
}
