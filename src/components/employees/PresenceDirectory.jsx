import React from 'react';
import { 
  Users, 
  Clock, 
  UserX, 
  AlertCircle, 
  BarChart3, 
  Search, 
  ChevronDown, 
  Check,
  Download,
  Filter,
  Grid,
  List,
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownLeft,
  Coffee,
  CheckCircle2
} from 'lucide-react';
import { parseDBDate } from '@/utils/dateUtils';
import CustomDropdown from '@/components/common/CustomDropdown';

export default function PresenceDirectory({
  profileSummaryStats,
  sortedAndFilteredProfiles,
  filteredEmployeesList,
  searchQuery,
  setSearchQuery,
  departmentFilter,
  setDepartmentFilter,
  isProfileDeptDropdownOpen,
  setIsProfileDeptDropdownOpen,
  profileFilter,
  setProfileFilter,
  profileSort,
  setProfileSort,
  isProfileSortDropdownOpen,
  setIsProfileSortDropdownOpen,
  profileItemsPerPage,
  setProfileItemsPerPage,
  isProfileDensityDropdownOpen,
  setIsProfileDensityDropdownOpen,
  profileViewMode,
  setProfileViewMode,
  presencePage,
  setPresencePage,
  totalPresencePages,
  paginatedEmployees,
  employeePresenceMap,
  currentTime,
  setSelectedProfileEmpId,
  handleDownloadIndividualPDF,
  getTimelineSegments
}) {
  const departmentsList = ['All', 'PF', 'NON PF', 'NI Group1', 'NI Group2'];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* 1. Live Workforce Overview KPI Cards - Matched to Logs Tab Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-all flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Workforce Scope</span>
            <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight mt-1 block">{profileSummaryStats.total}</span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-blue-50 border border-blue-150 flex items-center justify-center text-blue-600 shadow-2xs">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:border-emerald-300 transition-all flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Present (IN)</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">{profileSummaryStats.present}</span>
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
            </div>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-emerald-50 border border-emerald-150 flex items-center justify-center text-emerald-600 shadow-2xs">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-all flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Away (OUT)</span>
            <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight mt-1 block">{profileSummaryStats.away}</span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shadow-2xs">
            <UserX className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:border-rose-300 transition-all flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overtime (&gt;9h)</span>
            <span className="text-2xl font-extrabold text-rose-600 font-mono tracking-tight mt-1 block">{profileSummaryStats.overtime}</span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-rose-50 border border-rose-150 flex items-center justify-center text-rose-600 shadow-2xs">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 2. Unified Control Toolbar Header - Matched to Logs Tab Filter Header */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Filtered Profiles</h3>
            <span className="text-[10px] font-bold text-slate-500 font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
              Showing {paginatedEmployees.length} of {sortedAndFilteredProfiles.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter Pills */}
            <div className="flex bg-slate-200/70 p-0.5 rounded-xl border border-slate-250">
              {[
                { value: 'All', label: 'All Status' },
                { value: 'IN', label: 'Present' },
                { value: 'OUT', label: 'Away' },
                { value: 'goalMet', label: 'Goal Met' },
                { value: 'overtime', label: 'Overtime' }
              ].map(pill => (
                <button
                  key={pill.value}
                  onClick={() => {
                    setProfileFilter(pill.value);
                    setPresencePage(1);
                  }}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    profileFilter === pill.value 
                      ? 'bg-white text-slate-900 shadow-2xs font-extrabold' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Department Dropdown */}
            <CustomDropdown
              options={departmentsList.map(dept => ({
                value: dept,
                label: dept === 'All' ? 'All Departments' : `Dept: ${dept}`
              }))}
              value={departmentFilter}
              onChange={(val) => {
                setDepartmentFilter(val);
                setPresencePage(1);
              }}
            />

            {/* Sort Selector */}
            <CustomDropdown
              options={[
                { value: 'name', label: 'Sort: Name (A-Z)' },
                { value: 'hours', label: 'Sort: Hours Worked' },
                { value: 'status', label: 'Sort: Presence Status' }
              ]}
              value={profileSort}
              onChange={(val) => {
                setProfileSort(val);
                setPresencePage(1);
              }}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 font-medium pt-2 border-t border-slate-100">
          <span>Showing <span className="font-bold text-slate-800">{paginatedEmployees.length}</span> of <span className="font-bold text-slate-800">{sortedAndFilteredProfiles.length}</span> filtered profiles</span>
          
          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* View Mode Switcher */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                onClick={() => setProfileViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  profileViewMode === 'grid' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Grid Cards View"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setProfileViewMode('table')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  profileViewMode === 'table' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Table List View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Page Size:</span>
              {[8, 16, 24, 'All'].map(val => (
                <button
                  key={val}
                  onClick={() => {
                    setProfileItemsPerPage(val);
                    setPresencePage(1);
                  }}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all cursor-pointer ${
                    profileItemsPerPage === val ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Directory Workspace rendering */}
      {paginatedEmployees.length > 0 ? (
        profileViewMode === 'grid' ? (
          /* Redesigned Card Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginatedEmployees.map(([empId, emp]) => {
              const statusData = employeePresenceMap[empId] || {
                status: 'OUT',
                lastPunchTime: null,
                hoursWorkedToday: 0,
                formattedTime: '0h 0m',
                formattedBreakTime: '0h 0m',
                punchesToday: []
              };

              const isInside = statusData.status === 'IN';
              const hoursWorked = statusData.hoursWorkedToday || 0;
              const isGoalMet = hoursWorked >= 7;
              const isOvertime = hoursWorked > 9;
              const progressPct = Math.min(100, Math.round((hoursWorked / 8) * 100));

              const lastPunchTimeStr = statusData.lastPunchTime 
                ? `${statusData.status} at ${parseDBDate(statusData.lastPunchTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`
                : 'No logs today';

              return (
                <div
                  key={empId}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col justify-between group space-y-3"
                >
                  {/* Card Header: Avatar, Name, Designation & Status */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-inner">
                        {(emp.name || 'E').split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors truncate max-w-[130px]" title={emp.name}>
                          {emp.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {empId} • <span className="font-semibold text-slate-600">{emp.designation || 'Staff'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 ${
                      isInside 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-slate-100 text-slate-600 border border-slate-250'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isInside ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                      {isInside ? 'IN' : 'OUT'}
                    </span>
                  </div>

                  {/* Department Tag & Badges */}
                  <div className="flex items-center justify-between gap-1 text-[10px]">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-bold">
                      {emp.department} {emp.subDepartment && emp.subDepartment !== 'N/A' ? `/ ${emp.subDepartment}` : ''}
                    </span>

                    {isOvertime ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[8px] font-extrabold uppercase">
                        ⚠️ Overtime
                      </span>
                    ) : isGoalMet ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-extrabold uppercase">
                        ✓ Goal Met
                      </span>
                    ) : null}
                  </div>

                  {/* Last Punch Summary */}
                  <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-150 space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-medium">Last Punch:</span>
                      <span className="font-mono text-slate-800 font-bold truncate max-w-[130px]" title={lastPunchTimeStr}>
                        {lastPunchTimeStr}
                      </span>
                    </div>

                    {/* Worked Hours Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-500">Active Worked</span>
                        <span className="font-mono font-extrabold text-slate-900">{statusData.formattedTime} <span className="text-slate-400 font-normal">/ 8h</span></span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOvertime 
                              ? 'bg-gradient-to-r from-emerald-500 to-rose-500' 
                              : isGoalMet 
                              ? 'bg-emerald-500' 
                              : 'bg-blue-600'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <button
                    onClick={() => setSelectedProfileEmpId(empId)}
                    className="w-full py-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-xl text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    View Performance Drawer
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* Redesigned Table List View */
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Designation & Department</th>
                    <th className="px-4 py-3">Presence Status</th>
                    <th className="px-4 py-3">Worked Hours Today</th>
                    <th className="px-4 py-3">Break Time</th>
                    <th className="px-4 py-3">Last Punch</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-xs">
                  {paginatedEmployees.map(([empId, emp]) => {
                    const statusData = employeePresenceMap[empId] || {
                      status: 'OUT',
                      lastPunchTime: null,
                      hoursWorkedToday: 0,
                      formattedTime: '0h 0m',
                      formattedBreakTime: '0h 0m'
                    };

                    const isInside = statusData.status === 'IN';
                    const lastPunchTimeStr = statusData.lastPunchTime 
                      ? `${statusData.status} at ${parseDBDate(statusData.lastPunchTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`
                      : 'No logs today';

                    return (
                      <tr key={empId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <div 
                            onClick={() => setSelectedProfileEmpId(empId)}
                            className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer flex items-center gap-2"
                          >
                            <div className="h-7 w-7 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-[10px]">
                              {(emp.name || 'E').split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <span>{emp.name}</span>
                              <div className="text-[10px] text-slate-400 font-mono font-normal">{empId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-800 block">{emp.designation || 'Staff'}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{emp.department} {emp.subDepartment && emp.subDepartment !== 'N/A' ? `/ ${emp.subDepartment}` : ''}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            isInside ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-250'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isInside ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                            {isInside ? 'IN' : 'OUT'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {statusData.formattedTime}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {statusData.formattedBreakTime}
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-mono text-[11px]">
                          {lastPunchTimeStr}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedProfileEmpId(empId)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                            title="View Employee Profile"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs shadow-sm">
          <UserX className="h-8 w-8 mx-auto text-slate-300 mb-2" />
          No employee profiles matching your search or filters.
        </div>
      )}

      {/* Pagination Controls Footer */}
      {totalPresencePages > 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-2xs">
          <p className="text-[10px] text-slate-500 font-medium">
            Page <span className="font-bold text-slate-800">{presencePage}</span> of <span className="font-bold text-slate-800">{totalPresencePages}</span>
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPresencePage(prev => Math.max(prev - 1, 1))}
              disabled={presencePage === 1}
              className="px-3 py-1 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs text-slate-700"
            >
              Prev
            </button>
            <button
              onClick={() => setPresencePage(prev => Math.min(prev + 1, totalPresencePages))}
              disabled={presencePage === totalPresencePages}
              className="px-3 py-1 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs text-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
