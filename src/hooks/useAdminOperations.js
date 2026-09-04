import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';

// Helper to normalize PostgreSQL column names (empid -> empId, createdat -> createdAt)
const normalizeFromDb = (item) => {
  if (!item) return item;
  return {
    ...item,
    empId: item.empId || item.empid,
    empName: item.empName || item.empname,
    startDate: item.startDate || item.startdate,
    endDate: item.endDate || item.enddate,
    createdAt: item.createdAt || item.createdat,
    dateStr: item.dateStr || item.datestr,
    timeStr: item.timeStr || item.timestr,
    leaveType: item.leaveType || item.leavetype,
    scopeType: item.scopeType || item.scopetype,
    targetName: item.targetName || item.targetname,
    shiftName: item.shiftName || item.shiftname,
    graceMinutes: item.graceMinutes || item.graceminutes
  };
};

export function useAdminOperations() {
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
  const [shiftSchedules, setShiftSchedules] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dpi_shift_schedules')) || []; } catch { return []; }
  });

  // Cloud Database Restoration on App Initialization
  useEffect(() => {
    if (!supabase) return;

    const syncFromCloud = async () => {
      try {
        // 1. Fetch Cloud Leaves
        const { data: dbLeaves } = await supabase.from('admin_leaves').select('*');
        if (dbLeaves) {
          const normLeaves = dbLeaves.map(normalizeFromDb);
          setAdminLeaves(normLeaves);
          localStorage.setItem('dpi_admin_leaves', JSON.stringify(normLeaves));
        }

        // 2. Fetch Cloud ODs
        const { data: dbODs } = await supabase.from('admin_ods').select('*');
        if (dbODs) {
          const normODs = dbODs.map(normalizeFromDb);
          setAdminODs(normODs);
          localStorage.setItem('dpi_admin_ods', JSON.stringify(normODs));
        }

        // 3. Fetch Cloud Manual Punches
        const { data: dbPunches } = await supabase.from('manual_punches').select('*');
        if (dbPunches) {
          const normPunches = dbPunches.map(normalizeFromDb);
          setManualPunches(normPunches);
          localStorage.setItem('dpi_manual_punches', JSON.stringify(normPunches));
        }

        // 4. Fetch Cloud Holidays
        const { data: dbHolidays } = await supabase.from('admin_holidays').select('*');
        if (dbHolidays) {
          const normHolidays = dbHolidays.map(normalizeFromDb);
          setAdminHolidays(normHolidays);
          localStorage.setItem('dpi_admin_holidays', JSON.stringify(normHolidays));
        }

        // 5. Fetch Cloud Shift Schedules
        const { data: dbShifts } = await supabase.from('shift_schedules').select('*');
        if (dbShifts) {
          const normShifts = dbShifts.map(normalizeFromDb);
          setShiftSchedules(normShifts);
          localStorage.setItem('dpi_shift_schedules', JSON.stringify(normShifts));
        }
      } catch (err) {
        console.warn("Notice: Cloud DB sync error on app load:", err);
      }
    };

    syncFromCloud();
  }, []);

  return {
    adminLeaves,
    setAdminLeaves,
    adminODs,
    setAdminODs,
    adminHolidays,
    setAdminHolidays,
    manualPunches,
    setManualPunches,
    shiftSchedules,
    setShiftSchedules
  };
}
