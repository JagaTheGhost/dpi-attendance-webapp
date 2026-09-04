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
  CheckCircle2,
  X,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Briefcase,
  CalendarCheck
} from 'lucide-react';
import { parseDBDate } from '@/utils/dateUtils';
import CustomDropdown from '@/components/common/CustomDropdown';

export default function PresenceDirectory({
  employees = {},
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
  profileSortDir = 'desc',
  setProfileSortDir,
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
  // Dynamically compute department options from loaded employee database
  const dynamicDepartments = React.useMemo(() => {
    const set = new Set();
    Object.values(employees || {}).forEach(e => {
      if (e.department && e.department.trim() !== '') set.add(e.department);
    });
    return ['All', ...Array.from(set).sort()];
  }, [employees]);

  const hasActiveFilters = searchQuery !== '' || departmentFilter !== 'All' || profileFilter !== 'All';

  const resetAllFilters = () => {
    if (setSearchQuery) setSearchQuery('');
    setDepartmentFilter('All');
    setProfileFilter('All');
    setPresencePage(1);
  };

  const handleHeaderSort = (sortKey) => {
    if (profileSort === sortKey) {
      if (setProfileSortDir) setProfileSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setProfileSort(sortKey);
      if (setProfileSortDir) setProfileSortDir(sortKey === 'name' || sortKey === 'dept' ? 'asc' : 'desc');
    }
    setPresencePage(1);
  };

  const renderSortIcon = (sortKey) => {
    if (profileSort !== sortKey) return <ArrowUpDown className="h-3 w-3 opacity-40 inline ml-1" />;
    return profileSortDir === 'asc' 
      ? <ArrowUp className="h-3 w-3 text-blue-600 inline ml-1" />
      : <ArrowDown className="h-3 w-3 text-blue-600 inline ml-1" />;
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* 1. Compact 3-Card Consolidated Workforce Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Primary Presence Hub (Present in Center, Total on Left, Away on Right) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-blue-600" />
              Live Presence Overview
            </span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>

          {/* Center Present Count */}
          <div className="py-2 text-center my-auto">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Currently Present</p>
            <div className="flex items-center justify-center gap-2 mt-0.5">
              <span className="text-4xl font-black text-slate-900 font-mono tracking-tight">{profileSummaryStats.present}</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                {profileSummaryStats.total > 0 ? Math.round((profileSummaryStats.present / profileSummaryStats.total) * 100) : 0}% Present
              </span>
            </div>
          </div>

          {/* Bottom Row: Total Force (Bottom Left) & Away (Bottom Right) */}
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Scope</span>
              <span className="font-extrabold text-slate-900 font-mono text-sm">{profileSummaryStats.total} <span className="text-[10px] text-slate-400 font-normal">staff</span></span>
            </div>
            <div className="text-right space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Away (Out)</span>
              <span className="font-extrabold text-slate-600 font-mono text-sm">{profileSummaryStats.away} <span className="text-[10px] text-slate-400 font-normal">staff</span></span>
            </div>
          </div>
        </div>

        {/* Card 2: Approved Filings (On Leave & On Duty Combined) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm hover:border-purple-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarCheck className="h-3.5 w-3.5 text-purple-600" />
              Approved Filings (Today)
            </span>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              {(profileSummaryStats.onLeave || 0) + (profileSummaryStats.onDuty || 0)} Total
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 py-2 my-auto">
            {/* On Leave */}
            <div className="bg-purple-50/70 border border-purple-200/70 rounded-xl p-2.5 text-center">
              <span className="text-[9px] font-extrabold text-purple-600 uppercase tracking-wider block">On Leave</span>
              <span className="text-2xl font-black text-purple-800 font-mono block mt-0.5">{profileSummaryStats.onLeave || 0}</span>
            </div>
            {/* On Duty */}
            <div className="bg-blue-50/70 border border-blue-200/70 rounded-xl p-2.5 text-center">
              <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider block">On Duty (OD)</span>
              <span className="text-2xl font-black text-blue-800 font-mono block mt-0.5">{profileSummaryStats.onDuty || 0}</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-2 text-center">
            Active approved admin filings for today
          </p>
        </div>

        {/* Card 3: Shift Exceptions & Overtime */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm hover:border-rose-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-rose-600" />
              Workforce Exceptions
            </span>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              Shift Alerts
            </span>
          </div>

          <div className="py-2 text-center my-auto">
            <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider block">Overtime (&gt;9 Hours)</span>
            <span className="text-3xl font-black text-rose-600 font-mono block mt-0.5">{profileSummaryStats.overtime}</span>
          </div>

          <p className="text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-2 text-center">
            Personnel working beyond 9 hours today
          </p>
        </div>

      </div>

      {/* 2. Redesigned 2-Row Unified Workforce Roster Control Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4">
        
        {/* Row 1: Roster Title, Embedded Quick Search & Dropdown Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Roster Title & Active Count Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Workforce Roster</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono">
              {sortedAndFilteredProfiles.length} Total
            </span>

            {/* Active Universal Search Badge */}
            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 animate-fadeIn">
                <Search className="h-3 w-3 text-blue-500" />
                Query: "{searchQuery}"
                <button 
                  onClick={() => setSearchQuery && setSearchQuery('')}
                  className="hover:bg-blue-200/60 text-blue-600 rounded-full p-0.5 transition-colors cursor-pointer ml-0.5"
                  title="Clear Search"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>

          {/* Inline Controls: Search Box + Department Dropdown + Sort Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Embedded Direct Search Box */}
            <div className="relative w-full sm:w-48 lg:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter worker or ID..."
                value={searchQuery}
                onChange={(e) => {
                  if (setSearchQuery) setSearchQuery(e.target.value);
                  setPresencePage(1);
                }}
                className="w-full pl-8 pr-7 py-1.5 border border-slate-200 focus:border-blue-500 rounded-xl text-xs bg-slate-50 focus:bg-white text-slate-800 outline-none transition-all font-semibold"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery && setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded-full cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Department Dropdown (Fixed max width) */}
            <div className="w-auto min-w-[140px] max-w-[180px]">
              <CustomDropdown
                options={dynamicDepartments.map(dept => ({
                  value: dept,
                  label: dept === 'All' ? 'All Departments' : `Dept: ${dept}`
                }))}
                value={departmentFilter}
                onChange={(val) => {
                  setDepartmentFilter(val);
                  setPresencePage(1);
                }}
              />
            </div>

            {/* Sort Selector Dropdown (Fixed max width) */}
            <div className="w-auto min-w-[150px] max-w-[190px]">
              <CustomDropdown
                options={[
                  { value: 'name', label: 'Sort: Name (A-Z)' },
                  { value: 'dept', label: 'Sort: Department' },
                  { value: 'hours', label: 'Sort: Hours Worked' },
                  { value: 'break', label: 'Sort: Break Duration' },
                  { value: 'lastPunch', label: 'Sort: Last Punch' },
                  { value: 'status', label: 'Sort: Presence Status' }
                ]}
                value={profileSort}
                onChange={(val) => {
                  setProfileSort(val);
                  setPresencePage(1);
                }}
              />
            </div>

            {/* Reset Filters Shortcut */}
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs"
                title="Reset active filters"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Status Filter Pills with Live Numeric Counts & View Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
          
          {/* Status Filter Pills with Live Count Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { value: 'All', label: 'All Status', count: profileSummaryStats.total },
              { value: 'IN', label: 'Present', count: profileSummaryStats.present, badgeClass: 'bg-emerald-500/20 text-emerald-700' },
              { value: 'OUT', label: 'Away', count: profileSummaryStats.away, badgeClass: 'bg-slate-200 text-slate-700' },
              { value: 'LEAVE', label: 'On Leave', count: profileSummaryStats.onLeave || 0, badgeClass: 'bg-purple-100 text-purple-700' },
              { value: 'OD', label: 'On Duty', count: profileSummaryStats.onDuty || 0, badgeClass: 'bg-blue-100 text-blue-700' },
              { value: 'goalMet', label: 'Goal Met', count: Object.values(employeePresenceMap).filter(e => e.hoursWorkedToday >= 7).length, badgeClass: 'bg-emerald-100 text-emerald-800' },
              { value: 'overtime', label: 'Overtime', count: profileSummaryStats.overtime, badgeClass: 'bg-rose-100 text-rose-800' }
            ].map(pill => {
              const isActive = profileFilter === pill.value;
              return (
                <button
                  key={pill.value}
                  onClick={() => {
                    setProfileFilter(pill.value);
                    setPresencePage(1);
                  }}
                  className={`text-[10px] font-extrabold px-3 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isActive 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-150 hover:text-slate-900 border-slate-200/80'
                  }`}
                >
                  <span>{pill.label}</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-md ${
                    isActive ? 'bg-slate-700 text-white' : pill.badgeClass || 'bg-slate-200 text-slate-700'
                  }`}>
                    {pill.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View Mode & Page Size Controls */}
          <div className="flex items-center gap-3 self-end lg:self-auto shrink-0">
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              Showing <span className="font-bold text-slate-800">{paginatedEmployees.length}</span> of <span className="font-bold text-slate-800">{sortedAndFilteredProfiles.length}</span>
            </span>

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
                punchesToday: [],
                isOnTime: true,
                lateMinutes: 0
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
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-inner shrink-0">
                        {(emp.name || 'E').split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors truncate max-w-[130px]" title={emp.name}>
                          {emp.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                          {empId} • <span className="font-semibold text-slate-600">{emp.designation || 'Staff'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 ${
                      statusData.status === 'IN' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : statusData.status === 'LEAVE'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : statusData.status === 'OD'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-250'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        statusData.status === 'IN' ? 'bg-emerald-500 animate-pulse' :
                        statusData.status === 'LEAVE' ? 'bg-purple-500' :
                        statusData.status === 'OD' ? 'bg-blue-500' : 'bg-slate-400'
                      }`}></span>
                      {statusData.status === 'IN' ? 'IN' : statusData.status === 'LEAVE' ? 'ON LEAVE' : statusData.status === 'OD' ? 'ON DUTY' : 'OUT'}
                    </span>
                  </div>

                  {/* Department Tag & Badges */}
                  <div className="flex items-center justify-between gap-1 text-[10px] flex-wrap">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-bold truncate max-w-[110px]">
                      {emp.department} {emp.subDepartment && emp.subDepartment !== 'N/A' ? `/ ${emp.subDepartment}` : ''}
                    </span>

                    {/* Punctuality Arrival Pill */}
                    {statusData.firstInPunch ? (
                      statusData.isOnTime ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-extrabold uppercase">
                          ✓ On-Time
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[8px] font-extrabold uppercase" title={`Late by ${statusData.lateMinutes} mins`}>
                          ⏰ Late {statusData.lateMinutes}m
                        </span>
                      )
                    ) : isOvertime ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[8px] font-extrabold uppercase">
                        ⚠️ Overtime
                      </span>
                    ) : isGoalMet ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-extrabold uppercase">
                        ✓ Goal Met
                      </span>
                    ) : null}
                  </div>

                  {/* Last Punch & Worked/Break Duration Summary */}
                  <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-150 space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-medium">Last Punch:</span>
                      <span className="font-mono text-slate-800 font-bold truncate max-w-[130px]" title={lastPunchTimeStr}>
                        {lastPunchTimeStr}
                      </span>
                    </div>

                    {/* Worked & Break Duration Indicators */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-500 flex items-center gap-1">
                          Worked
                          {statusData.formattedBreakTime !== '0h 0m' && (
                            <span className="text-[9px] text-slate-400 font-normal"> (Break: {statusData.formattedBreakTime})</span>
                          )}
                        </span>
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
          /* Redesigned Table List View with Clickable Column Header Sorting */
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th 
                      onClick={() => handleHeaderSort('name')}
                      className="px-4 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                    >
                      Employee {renderSortIcon('name')}
                    </th>
                    <th 
                      onClick={() => handleHeaderSort('dept')}
                      className="px-4 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                    >
                      Designation & Department {renderSortIcon('dept')}
                    </th>
                    <th 
                      onClick={() => handleHeaderSort('status')}
                      className="px-4 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                    >
                      Presence Status {renderSortIcon('status')}
                    </th>
                    <th 
                      onClick={() => handleHeaderSort('hours')}
                      className="px-4 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                    >
                      Worked Hours Today {renderSortIcon('hours')}
                    </th>
                    <th 
                      onClick={() => handleHeaderSort('break')}
                      className="px-4 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                    >
                      Break Time {renderSortIcon('break')}
                    </th>
                    <th 
                      onClick={() => handleHeaderSort('lastPunch')}
                      className="px-4 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                    >
                      Last Punch {renderSortIcon('lastPunch')}
                    </th>
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
                      formattedBreakTime: '0h 0m',
                      isOnTime: true,
                      lateMinutes: 0
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
                            <div className="h-7 w-7 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
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
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              statusData.status === 'IN'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : statusData.status === 'LEAVE'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : statusData.status === 'OD'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-250'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                statusData.status === 'IN' ? 'bg-emerald-500 animate-pulse' :
                                statusData.status === 'LEAVE' ? 'bg-purple-500' :
                                statusData.status === 'OD' ? 'bg-blue-500' : 'bg-slate-400'
                              }`}></span>
                              {statusData.status === 'IN' ? 'IN' : statusData.status === 'LEAVE' ? 'ON LEAVE' : statusData.status === 'OD' ? 'ON DUTY' : 'OUT'}
                            </span>

                            {statusData.firstInPunch && (
                              statusData.isOnTime ? (
                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  On-Time
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                  Late {statusData.lateMinutes}m
                                </span>
                              )
                            )}
                          </div>
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
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs shadow-sm space-y-3">
          <UserX className="h-8 w-8 mx-auto text-slate-300" />
          <p>No employee profiles matching your active search or filters.</p>
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 font-bold text-xs rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Active Filters
            </button>
          )}
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
