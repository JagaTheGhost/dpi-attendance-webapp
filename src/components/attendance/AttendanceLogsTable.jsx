import React, { useState, useMemo, memo } from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  UserX, 
  BarChart3, 
  Download, 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown,
  Activity,
  ShieldAlert,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink
} from 'lucide-react';
import { parseDBDate } from '@/utils/dateUtils';
import CustomDropdown from '@/components/common/CustomDropdown';

function AttendanceLogsTable({
  paginatedLogs,
  employees,
  highlightedLogId,
  logsPage,
  totalLogsPages,
  setLogsPage,
  logsFilteredBySearch,
  setSelectedProfileEmpId,
  handleDownloadExport,
  statusFilter,
  setStatusFilter,
  departmentFilter,
  setDepartmentFilter,
  activeInOfficeCount,
  totalWorkforce,
  currentTime
}) {
  const [sortField, setSortField] = useState('timestamp'); // 'log_id' | 'name' | 'direction' | 'department' | 'timestamp'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'

  const handleSortToggle = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  // 1. Feature 1: Shift Overview & Real-time KPI Counters
  const kpiStats = useMemo(() => {
    let recent60mCount = 0;
    let autoOutCount = 0;
    const now = currentTime ? currentTime.getTime() : Date.now();
    const sixtyMinsAgo = now - (60 * 60 * 1000);

    logsFilteredBySearch.forEach(log => {
      const logTime = parseDBDate(log.timestamp).getTime();
      if (logTime >= sixtyMinsAgo && logTime <= now) {
        recent60mCount++;
      }
      if (log.direction === 'SYS_OUT') {
        autoOutCount++;
      }
    });

    return {
      recent60mCount,
      autoOutCount
    };
  }, [logsFilteredBySearch, currentTime]);

  const departmentsList = ['All', 'PF', 'NON PF', 'NI Group1', 'NI Group2'];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Live Shift Overview KPI Cards - Clean 3 Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="group bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-emerald-600" />
              On Floor Now
            </span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">{activeInOfficeCount}</span>
              <span className="text-xs font-bold text-slate-400">/ {totalWorkforce || 0} active</span>
            </div>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs group-hover:scale-110 group-hover:rotate-3 transition-transform duration-200">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
          </div>
        </div>

        <div className="group bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-sky-600" />
              Today's Logs
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight mt-1.5 block">{logsFilteredBySearch.length}</span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shadow-2xs group-hover:scale-110 group-hover:rotate-3 transition-transform duration-200">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="group bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldAlert className="h-3 w-3 text-[#3b3492]" />
              Auto-Out Alerts
            </span>
            <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight mt-1.5 block ${kpiStats.autoOutCount > 0 ? 'text-[#3b3492]' : 'text-slate-900'}`}>
              {kpiStats.autoOutCount}
            </span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-[#eeedfa] border border-[#c7c4f0] flex items-center justify-center text-[#3b3492] shadow-2xs group-hover:scale-110 group-hover:rotate-3 transition-transform duration-200">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col">
        {/* Table Header & Quick Filter Pill Controls */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Today's Live Punch Logs</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Direction Filter Pills */}
            <div className="flex bg-slate-200/70 p-0.5 rounded-xl border border-slate-250">
              {[
                { id: 'All', label: 'All' },
                { id: 'IN', label: 'IN' },
                { id: 'OUT', label: 'OUT' },
                { id: 'SYS_OUT', label: 'Auto Out' }
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setStatusFilter(pill.id)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === pill.id 
                      ? 'bg-white text-slate-900 shadow-2xs font-extrabold' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Department Selector */}
            <CustomDropdown
              options={departmentsList.map(dept => ({
                value: dept,
                label: dept === 'All' ? 'All Departments' : `Dept: ${dept}`
              }))}
              value={departmentFilter}
              onChange={(val) => setDepartmentFilter(val)}
            />

          </div>
        </div>

        {/* Table Content */}
        {(() => {
          const sortedPaginatedLogs = [...paginatedLogs].sort((a, b) => {
            let valA, valB;
            const empA = employees[a.employee_id] || { name: '', department: '' };
            const empB = employees[b.employee_id] || { name: '', department: '' };

            if (sortField === 'name') {
              valA = empA.name.toLowerCase();
              valB = empB.name.toLowerCase();
            } else if (sortField === 'department') {
              valA = empA.department.toLowerCase();
              valB = empB.department.toLowerCase();
            } else if (sortField === 'direction') {
              valA = a.direction;
              valB = b.direction;
            } else if (sortField === 'log_id') {
              valA = a.log_id;
              valB = b.log_id;
            } else {
              valA = parseDBDate(a.timestamp).getTime();
              valB = parseDBDate(b.timestamp).getTime();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
          });

          const renderSortIcon = (field) => {
            if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-slate-300 ml-1 inline" />;
            return sortDirection === 'asc' 
              ? <ArrowUp className="h-3 w-3 text-blue-600 ml-1 inline" /> 
              : <ArrowDown className="h-3 w-3 text-blue-600 ml-1 inline" />;
          };

          return (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 select-none">
                    <th 
                      onClick={() => handleSortToggle('log_id')} 
                      className="px-4 py-3 cursor-pointer hover:text-slate-900 transition-colors"
                    >
                      Log ID {renderSortIcon('log_id')}
                    </th>
                    <th 
                      onClick={() => handleSortToggle('name')} 
                      className="px-4 py-3 cursor-pointer hover:text-slate-900 transition-colors"
                    >
                      Employee & Designation {renderSortIcon('name')}
                    </th>
                    <th 
                      onClick={() => handleSortToggle('direction')} 
                      className="px-4 py-3 cursor-pointer hover:text-slate-900 transition-colors"
                    >
                      Direction & Status {renderSortIcon('direction')}
                    </th>
                    <th 
                      onClick={() => handleSortToggle('department')} 
                      className="px-4 py-3 cursor-pointer hover:text-slate-900 transition-colors"
                    >
                      Department {renderSortIcon('department')}
                    </th>
                    <th 
                      onClick={() => handleSortToggle('timestamp')} 
                      className="px-4 py-3 cursor-pointer hover:text-slate-900 transition-colors"
                    >
                      Timestamp / Elapsed {renderSortIcon('timestamp')}
                    </th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-xs">
                  {sortedPaginatedLogs.length > 0 ? (
                    sortedPaginatedLogs.map((log) => {
                  const emp = employees[log.employee_id] || { name: 'Unknown Employee', department: 'N/A' };
                  const isHighlight = log.log_id === highlightedLogId;
                  const logDate = parseDBDate(log.timestamp);
                  const timeStr = logDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
                  const dateStr = logDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

                  // Feature 4: Anomaly Detection (Late Clock-In)
                  let isLateIn = false;
                  if (log.direction === 'IN') {
                    const hours = logDate.getHours();
                    const mins = logDate.getMinutes();
                    if (hours > 9 || (hours === 9 && mins > 15)) {
                      isLateIn = true;
                    }
                  }

                  // Feature 3: Elapsed Shift Time Calculation for IN punches
                  let elapsedTimeStr = null;
                  if (log.direction === 'IN' && currentTime) {
                    const diffMs = Math.max(0, currentTime.getTime() - logDate.getTime());
                    const diffMins = Math.floor(diffMs / 1000 / 60);
                    const h = Math.floor(diffMins / 60);
                    const m = diffMins % 60;
                    elapsedTimeStr = `Inside for ${h}h ${m}m`;
                  }

                  return (
                    <tr 
                      key={log.log_id} 
                      className={`transition-colors hover:bg-slate-50/80 ${isHighlight ? 'bg-blue-50/80 font-semibold' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{log.log_id}</td>

                      {/* Feature 3: Employee Name + Code + Designation */}
                      <td className="px-4 py-3">
                        <div 
                          onClick={() => setSelectedProfileEmpId(log.employee_id)}
                          className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer flex items-center gap-1.5"
                        >
                          {emp.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {log.employee_id} • <span className="font-semibold text-slate-600">{emp.designation || emp.role || 'Staff'}</span>
                        </div>
                      </td>

                      {/* Feature 4: Direction + Anomaly Badges */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            log.direction === 'IN' 
                              ? 'bg-[#eaf7ed] text-[#15803d] border border-[#bbf7d0]' 
                              : log.direction === 'SYS_OUT' 
                              ? 'bg-[#eeedfa] text-[#3b3492] border border-[#c7c4f0]' 
                              : 'bg-[#f8fafc] text-[#475569] border border-[#e2e8f0]'
                          }`}>
                            {log.direction === 'IN' ? (
                              <ArrowDownLeft className="h-3 w-3" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3" />
                            )}
                            {log.direction === 'SYS_OUT' ? 'AUTO OUT' : log.direction}
                          </span>

                          {isLateIn && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#fcf0f0] text-[#b91c1c] border border-[#fecaca] text-[8px] font-black uppercase tracking-wider" title="Clocked IN after 09:15 AM threshold">
                              ⏱️ LATE
                            </span>
                          )}

                          {log.direction === 'SYS_OUT' && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#eeedfa] text-[#3b3492] border border-[#c7c4f0] text-[8px] font-black uppercase tracking-wider" title="Virtual checkout generated by system">
                              ⚡ VIRTUAL
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-700 font-medium">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
                          {emp.department}
                        </span>
                      </td>

                      {/* Feature 3: Timestamp + Live Elapsed Time */}
                      <td className="px-4 py-3 text-slate-700 font-mono text-[11px]">
                        <div className="font-bold text-slate-900">{timeStr}</div>
                        <div className="text-[9px] text-slate-400">{dateStr}</div>
                        {elapsedTimeStr && (
                          <div className="text-[9px] font-sans font-bold text-emerald-600 mt-0.5">
                            {elapsedTimeStr}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedProfileEmpId(log.employee_id)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                            title="View Profile"
                          >
                            <BarChart3 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                    <UserX className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    No logs matching your query or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
          );
        })()}

        {/* Pagination Footer */}
        {totalLogsPages > 1 && (
          <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-[10px] text-slate-500 font-medium">
              Page <span className="font-bold text-slate-800">{logsPage}</span> of <span className="font-bold text-slate-800">{totalLogsPages}</span>
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setLogsPage(prev => Math.max(prev - 1, 1))}
                disabled={logsPage === 1}
                className="px-2.5 py-1 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-[10px] font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                Prev
              </button>
              <button
                onClick={() => setLogsPage(prev => Math.min(prev + 1, totalLogsPages))}
                disabled={logsPage === totalLogsPages}
                className="px-2.5 py-1 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-[10px] font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(AttendanceLogsTable);
