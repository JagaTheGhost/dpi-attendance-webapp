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

      // Robust deletion check
      const isDeletedRecord = (emp) => {
        if (!emp) return true;
        const name = String(emp.name || emp.EmployeeName || '').toLowerCase().trim();
        const company = String(emp.company_name || emp.Company || '').toLowerCase().trim();
        const status = String(emp.status || emp.Status || '').toLowerCase().trim();

        if (company === 'x' || company === 'deleted' || company === 'del') return true;
        if (status === 'deleted' || status === 'x') return true;
        if (name.startsWith('del')) return true;
        if (name.includes('deleted')) return true;
        return false;
      };

      // Collect normalized names of deleted employees to cross-filter employee_devices legacy records
      const deletedNamesSet = new Set();
      if (empData) {
        empData.forEach(e => {
          if (isDeletedRecord(e)) {
            const cleanName = String(e.name || '').replace(/^del[_\s-]*|\bdeleted\b/i, '').toLowerCase().trim();
            if (cleanName) deletedNamesSet.add(cleanName);
          }
        });
      }

      // Map device metadata by normalized name and device code
      const deviceByName = {};
      const deviceByCode = {};
      if (deviceData && deviceData.length > 0) {
        deviceData.forEach(d => {
          const normName = String(d.EmployeeName || '').toLowerCase().trim();
          if (isDeletedRecord(d) || deletedNamesSet.has(normName)) return;

          if (normName) deviceByName[normName] = d;
          if (d.EmployeeCode) {
            const codeStr = String(d.EmployeeCode);
            const codePadded = codeStr.padStart(4, '0');
            deviceByCode[codeStr] = d;
            deviceByCode[codePadded] = d;
          }
        });
      }

      const employeeMap = {};
      const codeToIdLookup = {};

      // Primary source: base employees table (matches biometric_logs.employee_id)
      if (empData && empData.length > 0) {
        empData.forEach(emp => {
          if (isDeletedRecord(emp)) return;

          const empId = String(emp.id);
          const paddedId = empId.padStart(4, '0');
          const normName = String(emp.name || '').toLowerCase().trim();

          const deviceMatch = deviceByName[normName] || deviceByCode[paddedId] || deviceByCode[empId] || {};

          const cleanSubDept = (!deviceMatch.SubDepartment || deviceMatch.SubDepartment === 'null') ? 'N/A' : deviceMatch.SubDepartment;
          const cleanDOJ = (!deviceMatch.DOJ || deviceMatch.DOJ.startsWith('1900')) ? 'N/A' : deviceMatch.DOJ.slice(0, 10);
          const cleanDOC = (!deviceMatch.DOC || deviceMatch.DOC.startsWith('1900')) ? 'N/A' : deviceMatch.DOC.slice(0, 10);

          const record = {
            id: empId,
            name: emp.name || deviceMatch.EmployeeName || `Employee ${empId}`,
            department: emp.department || deviceMatch.Department || 'General',
            subDepartment: cleanSubDept,
            designation: deviceMatch.Designation || 'Staff',
            role: emp.role || deviceMatch.Designation || 'Staff Member',
            company: 'DPI',
            employmentType: deviceMatch.EmploymentType || 'Permanent',
            gender: (!deviceMatch.Gender || deviceMatch.Gender === 'null') ? 'N/A' : deviceMatch.Gender,
            status: deviceMatch.Status || 'Working',
            doj: cleanDOJ,
            doc: cleanDOC,
            verificationType: deviceMatch.VerificationType || 'Biometric',
            avatar: emp.avatar || `https://i.pravatar.cc/150?u=${empId}`
          };

          employeeMap[empId] = record;

          // Register lookup aliases for log matching
          codeToIdLookup[empId] = empId;
          codeToIdLookup[paddedId] = empId;
          if (deviceMatch.EmployeeCode) {
            const dCode = String(deviceMatch.EmployeeCode);
            codeToIdLookup[dCode] = empId;
            codeToIdLookup[dCode.padStart(4, '0')] = empId;
          }
        });
      } else if (deviceData && deviceData.length > 0) {
        // Fallback if base employees table is unavailable
        deviceData.forEach(emp => {
          if (isDeletedRecord(emp)) return;
          const empId = String(emp.EmployeeCode || emp.id).padStart(4, '0');
          const record = {
            id: empId,
            name: emp.EmployeeName || `Employee ${empId}`,
            department: emp.Department || 'General',
            subDepartment: (!emp.SubDepartment || emp.SubDepartment === 'null') ? 'N/A' : emp.SubDepartment,
            designation: emp.Designation || 'Staff',
            role: emp.Designation || 'Staff Member',
            company: emp.Company || 'DPI',
            employmentType: emp.EmploymentType || 'Permanent',
            gender: (!emp.Gender || emp.Gender === 'null') ? 'N/A' : emp.Gender,
            status: emp.Status || 'Working',
            doj: (!emp.DOJ || emp.DOJ.startsWith('1900')) ? 'N/A' : emp.DOJ.slice(0, 10),
            doc: (!emp.DOC || emp.DOC.startsWith('1900')) ? 'N/A' : emp.DOC.slice(0, 10),
            verificationType: emp.VerificationType || 'Biometric',
            avatar: `https://i.pravatar.cc/150?u=${empId}`
          };
          employeeMap[empId] = record;
          codeToIdLookup[empId] = empId;
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
          .map(log => {
            const rawId = String(log.employee_id);
            const paddedId = rawId.padStart(4, '0');
            const targetId = codeToIdLookup[rawId] || codeToIdLookup[paddedId];
            const matchedEmp = targetId ? employeeMap[targetId] : null;

            if (!matchedEmp && Object.keys(employeeMap).length > 0) return null;

            return {
              log_id: `LOG-${log.id}`,
              employee_id: matchedEmp ? matchedEmp.id : log.employee_id,
              timestamp: log.timestamp,
              direction: log.direction
            };
          })
          .filter(Boolean);
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
          const rawId = String(payload.new.employee_id);
          const paddedId = rawId.padStart(4, '0');
          const matchedEmp = employees[paddedId] || employees[rawId];
          if (!matchedEmp && Object.keys(employees).length > 0) return;

          const newLog = {
            log_id: `LOG-${payload.new.id}`,
            employee_id: matchedEmp ? matchedEmp.id : payload.new.employee_id,
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
