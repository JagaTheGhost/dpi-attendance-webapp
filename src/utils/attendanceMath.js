import { parseDBDate, toLocalISOString } from './dateUtils';

export const chunkArray = (array, size) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

export const injectVirtualLogs = (rawLogs, currentTime = new Date()) => {
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
