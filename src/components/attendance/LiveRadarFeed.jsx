import React from 'react';
import { Fingerprint, ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react';
import { parseDBDate } from '@/utils/dateUtils';

export default function LiveRadarFeed({
  processedLogs,
  employees,
  highlightedLogId,
  setSelectedProfileEmpId
}) {
  const recentLogs = processedLogs.slice(0, 8);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <Fingerprint className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Live Punch Activity</h3>
            <p className="text-[10px] text-slate-400 font-medium">Real-time biometric radar feed</p>
          </div>
        </div>
        <div className="relative flex items-center justify-center h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </div>
      </div>

      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {recentLogs.length > 0 ? (
          recentLogs.map((log) => {
            const emp = employees[log.employee_id] || { name: 'Unknown Employee', department: 'N/A' };
            const isHighlight = log.log_id === highlightedLogId;
            const logDate = parseDBDate(log.timestamp);
            const timeStr = logDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

            return (
              <div
                key={log.log_id}
                onClick={() => setSelectedProfileEmpId(log.employee_id)}
                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                  isHighlight 
                    ? 'bg-blue-50 border-blue-200 shadow-sm animate-flashRow' 
                    : 'bg-slate-50/50 hover:bg-slate-50 border-slate-100'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    log.direction === 'IN' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : log.direction === 'SYS_OUT' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                    {log.direction === 'IN' ? (
                      <ArrowDownLeft className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{emp.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{log.employee_id} • {emp.department}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase mb-0.5 ${
                    log.direction === 'IN' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                      : log.direction === 'SYS_OUT' 
                      ? 'bg-purple-50 text-purple-700 border border-purple-100' 
                      : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}>
                    {log.direction === 'SYS_OUT' ? 'AUTO OUT' : log.direction}
                  </span>
                  <p className="text-[9px] font-mono text-slate-500">{timeStr}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-slate-400 text-xs flex flex-col items-center">
            <AlertCircle className="h-6 w-6 text-slate-300 mb-1" />
            <p>No recent activity recorded</p>
          </div>
        )}
      </div>
    </div>
  );
}
