// Parse DB timestamp strings as 24-hour local wall-clock times from biometric devices
export const parseDBDate = (timestampStr) => {
  if (!timestampStr) return new Date();
  if (timestampStr instanceof Date) return timestampStr;
  if (typeof timestampStr === 'string') {
    const str = timestampStr.trim();
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      const [, year, month, day, hours, minutes, seconds] = match;
      return new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10),
        parseInt(hours, 10),
        parseInt(minutes, 10),
        parseInt(seconds, 10)
      );
    }
  }
  return new Date(timestampStr);
};

// Calculate boundary ISO strings for attendance date scope
export const getDateRangeBounds = (range, startInput, endInput) => {
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
  } else if (range === '14days') {
    start.setDate(start.getDate() - 13);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (range === '30days') {
    start.setDate(start.getDate() - 29);
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

export const toLocalISOString = (date) => {
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};
