import React from 'react';
import { Download, X, Calendar, Clock, Award, ShieldCheck, UserCheck, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

export default function ProfileModal({
  selectedProfileEmpId,
  setSelectedProfileEmpId,
  selectedEmployeeAnalytics,
  employees,
  employeePresenceMap,
  handleDownloadIndividualPDF,
  heatmapDays,
  adminLeaves = [],
  adminODs = []
}) {
  if (!selectedProfileEmpId || !selectedEmployeeAnalytics) return null;

  const emp = employees[selectedProfileEmpId] || { name: 'Employee', department: 'N/A' };
  const presence = employeePresenceMap[selectedProfileEmpId] || { status: 'OUT' };

  // Filter Leave and OD records for this specific employee
  const empLeaves = (adminLeaves || []).filter(l => String(l.empId).trim() === String(selectedProfileEmpId).trim());
  const empODs = (adminODs || []).filter(o => String(o.empId).trim() === String(selectedProfileEmpId).trim());

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 transition-all duration-300">
      <div className="bg-slate-50 border border-slate-200/90 rounded-[2rem] w-full max-w-5xl max-h-[95vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-4 sm:px-8 py-4 flex items-center justify-between gap-3 border-b border-slate-800/50 relative overflow-hidden shrink-0">
          {/* Decorative Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          
          {/* Employee Identity — always a row, truncate on small screens */}
          <div className="flex items-center gap-3 relative z-10 min-w-0">
            <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 border border-blue-400/30 flex items-center justify-center font-extrabold text-base sm:text-xl text-white shadow-lg shrink-0">
              {(emp.name || 'E').split(' ').map(n => n[0]).join('')}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight truncate">{emp.name}</h3>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase shrink-0 ${
                  presence.status === 'IN'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : presence.status === 'LEAVE'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : presence.status === 'OD'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    presence.status === 'IN' ? 'bg-emerald-400 animate-pulse' :
                    presence.status === 'LEAVE' ? 'bg-purple-400' :
                    presence.status === 'OD' ? 'bg-blue-400' : 'bg-slate-500'
                  }`}></span>
                  {presence.status === 'IN' ? 'IN' : presence.status === 'LEAVE' ? 'ON LEAVE' : presence.status === 'OD' ? 'ON DUTY' : 'AWAY'}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-mono mt-0.5 truncate">
                <span className="text-blue-300 font-bold">{selectedProfileEmpId}</span>
                <span className="text-slate-600 mx-1">•</span>
                <span className="text-slate-300 font-semibold">{emp.designation || emp.role || 'Staff'}</span>
                <span className="hidden sm:inline">
                  <span className="text-slate-600 mx-1">•</span>
                  <span className="text-slate-400">{emp.department}</span>
                </span>
              </p>
            </div>
          </div>

          {/* Action Buttons — always on the right */}
          <div className="flex items-center gap-2 relative z-10 shrink-0">
            <button
              onClick={handleDownloadIndividualPDF}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-xs font-bold rounded-xl cursor-pointer transition-all border border-blue-500/30 hover:border-blue-500 shadow-sm"
              title="Download Individual Performance PDF Report"
            >
              <Download className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            <button
              onClick={() => setSelectedProfileEmpId(null)}
              className="text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all p-2 rounded-xl cursor-pointer border border-transparent hover:border-slate-600/50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 scrollbar-thin">
          
          {/* Employee Master Specifications - Redesigned sleek grid */}
          <div className="bg-white border border-slate-200/80 rounded-[2rem] p-5 sm:p-7 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 to-indigo-600"></div>
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-5">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              Employee Master Specifications
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
              <div className="space-y-1 border-l-2 border-slate-100 pl-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Designation</span>
                <span className="font-extrabold text-slate-800 text-sm truncate block">{emp.designation || 'N/A'}</span>
              </div>
              <div className="space-y-1 border-l-2 border-slate-100 pl-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Department / Sub</span>
                <span className="font-extrabold text-slate-800 text-sm truncate block">{emp.department}{emp.subDepartment && emp.subDepartment !== 'N/A' ? ` / ${emp.subDepartment}` : ''}</span>
              </div>
              <div className="space-y-1 border-l-2 border-slate-100 pl-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Employment Type</span>
                <span className="font-extrabold text-slate-800 text-sm truncate block">{emp.employmentType || 'Permanent'}</span>
              </div>
              <div className="space-y-1 border-l-2 border-slate-100 pl-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Company / Status</span>
                <span className="font-extrabold text-slate-800 text-sm truncate block">{emp.company || 'DPI'} ({emp.status || 'Active'})</span>
              </div>
              
              <div className="space-y-1 border-l-2 border-slate-100 pl-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Gender</span>
                <span className="font-extrabold text-slate-800 text-sm truncate block">{emp.gender || 'N/A'}</span>
              </div>
              <div className="space-y-1 border-l-2 border-slate-100 pl-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Date of Joining</span>
                <span className="font-extrabold text-slate-800 text-sm font-mono truncate block">{emp.doj ? emp.doj.slice(0, 10) : 'N/A'}</span>
              </div>
              <div className="space-y-1 border-l-2 border-slate-100 pl-3 md:col-span-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Verification Mode</span>
                <span className="font-extrabold text-slate-800 text-sm truncate block">{emp.verificationType === 'Finger or Face or Card or Password' ? 'Biometric' : (emp.verificationType || 'Biometric')}</span>
              </div>
            </div>
          </div>

          {/* Admin Leaves & OD Filings Section */}
          <div className="bg-white border border-slate-200/80 rounded-[2rem] p-5 sm:p-7 shadow-sm space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-purple-600" />
                Admin Operations Approvals (Leaves & OD)
              </h4>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200/60 px-2.5 py-0.5 rounded-full">
                {empLeaves.length + empODs.length} Record(s)
              </span>
            </div>

            {empLeaves.length === 0 && empODs.length === 0 ? (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-2 italic font-medium">
                <CheckCircle2 className="h-4 w-4 text-slate-300" />
                No active or historical Leave/OD records found for this employee profile.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {empLeaves.map((l, idx) => (
                  <div key={`l-${idx}`} className="bg-purple-50/70 border border-purple-200/80 p-4 rounded-2xl flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-extrabold bg-purple-600 text-white uppercase tracking-wider">
                        LEAVE • {l.leaveType || 'General'}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded-md">
                        {l.startDate} to {l.endDate}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-purple-950">{l.reason || 'Approved Admin Leave'}</p>
                  </div>
                ))}

                {empODs.map((o, idx) => (
                  <div key={`o-${idx}`} className="bg-blue-50/70 border border-blue-200/80 p-4 rounded-2xl flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-extrabold bg-blue-600 text-white uppercase tracking-wider">
                        ON DUTY (OD)
                      </span>
                      <span className="text-[10px] font-mono font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-md">
                        {o.startDate} to {o.endDate}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-blue-950">{o.reason || 'Approved On-Duty Assignment'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Performance Analytics Gauge Section */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
              <Award className="h-4 w-4 text-amber-500" />
              Performance Analytics Summary
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Goal Compliance Gauge */}
              <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Goal Compliance</p>
                  <p className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
                    {Math.round(selectedEmployeeAnalytics.goalComplianceRate)}%
                  </p>
                  <p className="text-[9px] text-slate-500 font-medium">Days met 7h+ goal</p>
                </div>
                <div className="relative h-13 w-13 shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="26" cy="26" r="20" className="stroke-slate-100 fill-transparent" strokeWidth="4" />
                    <circle 
                      cx="26" 
                      cy="26" 
                      r="20" 
                      className={`${selectedEmployeeAnalytics.goalComplianceRate >= 75 ? 'stroke-emerald-500' : selectedEmployeeAnalytics.goalComplianceRate >= 50 ? 'stroke-amber-500' : 'stroke-rose-500'} fill-transparent transition-all duration-500`} 
                      strokeWidth="4" 
                      strokeDasharray={2 * Math.PI * 20}
                      strokeDashoffset={2 * Math.PI * 20 * (1 - selectedEmployeeAnalytics.goalComplianceRate / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Punctuality Gauge */}
              <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">On-Time Arrival</p>
                  <p className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
                    {Math.round(selectedEmployeeAnalytics.punctualityRate)}%
                  </p>
                  <p className="text-[9px] text-slate-500 font-medium">First In by 9:15 AM</p>
                </div>
                <div className="relative h-13 w-13 shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="26" cy="26" r="20" className="stroke-slate-100 fill-transparent" strokeWidth="4" />
                    <circle 
                      cx="26" 
                      cy="26" 
                      r="20" 
                      className={`${selectedEmployeeAnalytics.punctualityRate >= 85 ? 'stroke-emerald-500' : selectedEmployeeAnalytics.punctualityRate >= 60 ? 'stroke-amber-500' : 'stroke-rose-500'} fill-transparent transition-all duration-500`} 
                      strokeWidth="4" 
                      strokeDasharray={2 * Math.PI * 20}
                      strokeDashoffset={2 * Math.PI * 20 * (1 - selectedEmployeeAnalytics.punctualityRate / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Avg Daily Hours */}
              <div className="bg-white border border-slate-200/80 p-5 rounded-3xl space-y-3 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Avg Daily Hours</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight group-hover:scale-105 transition-transform origin-left">
                    {Math.floor(selectedEmployeeAnalytics.avgWorkHours)}<span className="text-lg text-slate-400 ml-0.5">h</span>
                  </p>
                  <p className="text-base font-bold text-slate-500 font-mono">
                    {Math.round((selectedEmployeeAnalytics.avgWorkHours % 1) * 60)}<span className="text-[10px] text-slate-400 ml-0.5">m</span>
                  </p>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                  <div 
                    className={`h-full ${selectedEmployeeAnalytics.avgWorkHours >= 7 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-amber-400 to-amber-500'} transition-all duration-1000 ease-out`} 
                    style={{ width: `${Math.min((selectedEmployeeAnalytics.avgWorkHours / 8) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Avg Breaks */}
              <div className="bg-white border border-slate-200/80 p-5 rounded-3xl space-y-3 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 to-rose-500"></div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Avg Daily Break</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-3xl font-extrabold text-rose-600 font-mono tracking-tight group-hover:scale-105 transition-transform origin-left">
                    {Math.floor(selectedEmployeeAnalytics.avgBreakHours)}<span className="text-lg text-rose-300 ml-0.5">h</span>
                  </p>
                  <p className="text-base font-bold text-rose-500/80 font-mono">
                    {Math.round((selectedEmployeeAnalytics.avgBreakHours % 1) * 60)}<span className="text-[10px] text-rose-300 ml-0.5">m</span>
                  </p>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                  <div 
                    className="h-full bg-gradient-to-r from-rose-400 to-rose-500 transition-all duration-1000 ease-out" 
                    style={{ width: `${Math.min((selectedEmployeeAnalytics.avgBreakHours / 2) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* 30-Day Heatmap Section */}
          <div className="bg-white border border-slate-200/80 p-5 sm:p-7 rounded-[2rem] shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-blue-600" />
                30-Day Attendance Timeline
              </h4>

              {/* Updated Heatmap Legend with Leave & OD */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/80 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-200 border border-slate-300"></span> Absent</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.4)]"></span> Leave</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.4)]"></span> OD</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.4)]"></span> Short Hrs</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]"></span> Goal Met</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-white border-2 border-rose-400"></span> Late</span>
              </div>
            </div>

            {/* 30-Day Tally Summary Pills Bar */}
            {(() => {
              let presentCount = 0, lateCount = 0, leaveCount = 0, odCount = 0, absentCount = 0;
              heatmapDays.forEach(item => {
                const dateISO = item.date.getFullYear() + '-' + String(item.date.getMonth() + 1).padStart(2, '0') + '-' + String(item.date.getDate()).padStart(2, '0');
                const hasLeave = empLeaves.some(l => l.startDate <= dateISO && dateISO <= l.endDate);
                const hasOD = empODs.some(o => o.startDate <= dateISO && dateISO <= o.endDate);
                if (item.summary) {
                  presentCount++;
                  if (!item.summary.isOnTime) lateCount++;
                } else if (hasLeave) {
                  leaveCount++;
                } else if (hasOD) {
                  odCount++;
                } else {
                  absentCount++;
                }
              });
              return (
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold font-mono text-slate-700 bg-slate-50 p-2.5 rounded-2xl border border-slate-150 justify-between">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-extrabold">30-Day Tallies:</span>
                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    <span className="bg-emerald-100/80 text-emerald-800 px-2 py-0.5 rounded-lg border border-emerald-200">Present: {presentCount}d</span>
                    <span className="bg-rose-100/80 text-rose-800 px-2 py-0.5 rounded-lg border border-rose-200">Late: {lateCount}d</span>
                    <span className="bg-purple-100/80 text-purple-800 px-2 py-0.5 rounded-lg border border-purple-200">Leaves: {leaveCount}d</span>
                    <span className="bg-blue-100/80 text-blue-800 px-2 py-0.5 rounded-lg border border-blue-200">OD: {odCount}d</span>
                    <span className="bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-300">Absent: {absentCount}d</span>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-15 gap-1.5 sm:gap-2">
              {heatmapDays.map((item, idx) => {
                const { date, summary } = item;
                const dateFormatted = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                const dateISO = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
                
                const empLeave = empLeaves.find(l => l.startDate <= dateISO && dateISO <= l.endDate);
                const empOD = empODs.find(o => o.startDate <= dateISO && dateISO <= o.endDate);

                let bgClass = 'bg-slate-100 hover:bg-slate-200 text-slate-400 border-slate-200/50';
                let borderClass = 'border-transparent';
                let tooltipText = `${dateFormatted}: Absent (No Logs)`;
                
                if (summary) {
                  const hrs = Math.floor(summary.hoursWorked);
                  const mins = Math.round((summary.hoursWorked % 1) * 60);
                  
                  if (summary.isGoalMet) {
                    bgClass = 'bg-emerald-400 hover:bg-emerald-500 text-white shadow-[0_2px_10px_rgba(52,211,153,0.3)] border-emerald-300';
                  } else {
                    bgClass = 'bg-amber-400 hover:bg-amber-500 text-white shadow-[0_2px_10px_rgba(251,191,36,0.3)] border-amber-300';
                  }
                  
                  if (!summary.isOnTime) {
                    borderClass = 'border-rose-400 border-2';
                  } else {
                    borderClass = 'border border-opacity-50';
                  }
                  
                  tooltipText = `${dateFormatted}: ${hrs}h ${mins}m worked | In: ${summary.firstIn} | Out: ${summary.lastOut} ${summary.isOnTime ? '(On-time)' : '(Late)'}`;
                } else if (empLeave) {
                  bgClass = 'bg-purple-500 hover:bg-purple-600 text-white shadow-[0_2px_10px_rgba(168,85,247,0.3)] border-purple-400';
                  tooltipText = `${dateFormatted}: Approved Leave (${empLeave.leaveType || 'General'})`;
                } else if (empOD) {
                  bgClass = 'bg-blue-600 hover:bg-blue-700 text-white shadow-[0_2px_10px_rgba(37,99,235,0.3)] border-blue-500';
                  tooltipText = `${dateFormatted}: On Duty Assignment (${empOD.reason || 'Client Visit/Site Work'})`;
                }

                return (
                  <div
                    key={idx}
                    className={`aspect-square rounded-xl flex items-center justify-center text-[10px] sm:text-[11px] font-extrabold transition-all cursor-help relative group/heatmap-cell ${bgClass} ${borderClass}`}
                    title={tooltipText}
                  >
                    {date.getDate()}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/heatmap-cell:block z-50 bg-slate-900 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap pointer-events-none border border-slate-700 before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-slate-900">
                      {tooltipText}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-5 sm:p-7 rounded-[2rem] shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-blue-600" />
                Attendance Log History
              </h4>
              <span className="text-[10px] font-bold text-blue-700 font-mono bg-blue-50 border border-blue-200/50 px-2.5 py-1 rounded-xl">
                {selectedEmployeeAnalytics.daysPresentCount} days recorded
              </span>
            </div>

            <div className="border border-slate-200/70 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full border-collapse text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[9px] font-extrabold uppercase text-slate-500 tracking-wider border-b border-slate-200/80">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">First Clock In</th>
                      <th className="px-4 py-3">Last Clock Out</th>
                      <th className="px-4 py-3 text-center">Work Duration</th>
                      <th className="px-4 py-3 text-center">Break Duration</th>
                      <th className="px-4 py-3 text-right">Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-150">
                    {selectedEmployeeAnalytics.daySummaries.map((day, dIdx) => (
                      <tr key={dIdx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900">{day.dateStr}</td>
                        <td className="px-4 py-3 font-mono text-slate-700">{day.firstIn}</td>
                        <td className="px-4 py-3 font-mono text-slate-700">{day.lastOut}</td>
                        <td className="px-4 py-3 text-center font-mono font-extrabold text-slate-900">
                          {Math.floor(day.hoursWorked)}h {Math.round((day.hoursWorked % 1) * 60)}m
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-slate-600">
                          {Math.floor(day.breakHours)}h {Math.round((day.breakHours % 1) * 60)}m
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            {day.isGoalMet ? (
                              <span className="inline-flex px-2 py-0.5 rounded text-[8px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                                GOAL MET
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 rounded text-[8px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                                SHORT HRS
                              </span>
                            )}
                            {!day.isOnTime && (
                              <span className="inline-flex px-2 py-0.5 rounded text-[8px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                                LATE
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
        {/* Bottom spacer replaced by padding-bottom in modal body so we don't need a separate footer with close button. 
            The X button in the header is sufficient for closing. */}
      </div>
    </div>
  );
}
