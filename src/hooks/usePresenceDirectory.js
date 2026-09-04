import { useMemo } from 'react';
import { parseDBDate } from '@/utils/dateUtils';

export function usePresenceDirectory({
  employees,
  processedLogs,
  currentTime,
  searchQuery,
  statusFilter,
  departmentFilter,
  profileFilter,
  profileSort,
  profileSortDir = 'desc',
  adminLeaves = [],
  adminODs = []
}) {
  const totalWorkforce = Object.keys(employees).length;

  const todayISO = useMemo(() => {
    const y = currentTime.getFullYear();
    const m = String(currentTime.getMonth() + 1).padStart(2, '0');
    const d = String(currentTime.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [currentTime]);

  const activeInOfficeCount = useMemo(() => {
    let activeCount = 0;
    Object.keys(employees).forEach(empId => {
      const lastLog = processedLogs.find(log => log.employee_id === empId);
      if (lastLog && lastLog.direction === 'IN') activeCount++;
    });
    return activeCount;
  }, [processedLogs, employees]);

  // Presence Map Engine
  const employeePresenceMap = useMemo(() => {
    const map = {};
    Object.keys(employees).forEach(empId => {
      map[empId] = {
        status: 'OUT',
        activeLeave: null,
        activeOD: null,
        lastPunchTime: null,
        punchesToday: [],
        hoursWorkedToday: 0,
        formattedTime: '0h 0m',
        formattedBreakTime: '0h 0m',
        firstInPunch: null,
        isOnTime: true,
        lateMinutes: 0
      };
    });

    // Map active admin leaves & ODs for today
    Object.keys(employees).forEach(empId => {
      const activeLeave = (adminLeaves || []).find(l => 
        String(l.empId).trim() === String(empId).trim() &&
        l.startDate <= todayISO &&
        todayISO <= l.endDate
      );
      const activeOD = (adminODs || []).find(o => 
        String(o.empId).trim() === String(empId).trim() &&
        o.startDate <= todayISO &&
        todayISO <= o.endDate
      );
      if (activeLeave) map[empId].activeLeave = activeLeave;
      if (activeOD) map[empId].activeOD = activeOD;
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
      const isCurrentlyIn = data.status === 'IN';

      // Status resolution logic: IN > LEAVE > OD > OUT
      if (!isCurrentlyIn) {
        if (data.activeLeave) {
          data.status = 'LEAVE';
        } else if (data.activeOD) {
          data.status = 'OD';
        }
      }

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
      const firstIn = todayPunches.find(p => p.direction === 'IN');
      if (firstIn) {
        data.firstInPunch = firstIn;
        const firstInTime = parseDBDate(firstIn.timestamp);
        
        // Punctuality check (9:15 AM baseline)
        const targetTime = new Date(firstInTime);
        targetTime.setHours(9, 15, 0, 0);
        if (firstInTime > targetTime) {
          data.isOnTime = false;
          data.lateMinutes = Math.round((firstInTime - targetTime) / 1000 / 60);
        } else {
          data.isOnTime = true;
          data.lateMinutes = 0;
        }

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
      data.breakHoursToday = breakMs / 1000 / 60 / 60;
      data.formattedTime = `${hrs}h ${mins}m`;
      data.formattedBreakTime = `${breakHrs}h ${breakMins}m`;
    });

    return map;
  }, [processedLogs, employees, currentTime, adminLeaves, adminODs, todayISO]);

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
        if (profileFilter === 'OUT') return statusData.status === 'OUT';
        if (profileFilter === 'LEAVE') return statusData.status === 'LEAVE';
        if (profileFilter === 'OD') return statusData.status === 'OD';
        if (profileFilter === 'goalMet') return statusData.hoursWorkedToday >= 7;
        if (profileFilter === 'overtime') return statusData.hoursWorkedToday > 9;
        return true;
      });
    }

    const mult = profileSortDir === 'asc' ? 1 : -1;

    list.sort(([idA, empA], [idB, empB]) => {
      const statusA = employeePresenceMap[idA] || { status: 'OUT', hoursWorkedToday: 0, breakHoursToday: 0, lastPunchTime: 0 };
      const statusB = employeePresenceMap[idB] || { status: 'OUT', hoursWorkedToday: 0, breakHoursToday: 0, lastPunchTime: 0 };
      
      if (profileSort === 'name') return mult * empA.name.localeCompare(empB.name);
      if (profileSort === 'dept') return mult * (empA.department || '').localeCompare(empB.department || '');
      if (profileSort === 'hours') return mult * (statusA.hoursWorkedToday - statusB.hoursWorkedToday);
      if (profileSort === 'break') return mult * ((statusA.breakHoursToday || 0) - (statusB.breakHoursToday || 0));
      if (profileSort === 'lastPunch') {
        const tA = statusA.lastPunchTime ? new Date(statusA.lastPunchTime).getTime() : 0;
        const tB = statusB.lastPunchTime ? new Date(statusB.lastPunchTime).getTime() : 0;
        return mult * (tA - tB);
      }
      if (profileSort === 'status') {
        const score = (s) => (s === 'IN' ? 4 : s === 'OD' ? 3 : s === 'LEAVE' ? 2 : 1);
        return mult * (score(statusA.status) - score(statusB.status));
      }
      return 0;
    });

    return list;
  }, [filteredEmployeesList, profileFilter, profileSort, profileSortDir, employeePresenceMap]);

  const profileSummaryStats = useMemo(() => {
    let present = 0, away = 0, late = 0, overtime = 0, onLeave = 0, onDuty = 0;
    filteredEmployeesList.forEach(([empId]) => {
      const statusData = employeePresenceMap[empId] || { status: 'OUT', hoursWorkedToday: 0 };
      if (statusData.status === 'IN') present++;
      else if (statusData.status === 'LEAVE') onLeave++;
      else if (statusData.status === 'OD') onDuty++;
      else away++;

      if (statusData.hoursWorkedToday > 9) overtime++;
    });

    return { total: filteredEmployeesList.length, present, away, late, overtime, onLeave, onDuty };
  }, [filteredEmployeesList, employeePresenceMap]);

  return {
    totalWorkforce,
    activeInOfficeCount,
    employeePresenceMap,
    filteredEmployeesList,
    sortedAndFilteredProfiles,
    profileSummaryStats
  };
}

