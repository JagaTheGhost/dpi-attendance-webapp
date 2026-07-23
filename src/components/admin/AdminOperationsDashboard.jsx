import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Briefcase, 
  MapPin, 
  FileText, 
  Building2, 
  UserCheck, 
  Zap, 
  Check, 
  X,
  Filter,
  Search,
  ChevronRight,
  Download,
  Palmtree,
  Wrench
} from 'lucide-react';
import CustomDropdown from '@/components/common/CustomDropdown';
import { generateHolidayNoticePDF, generateSingleHolidayNoticePDF } from '@/services/exportServices';

export default function AdminOperationsDashboard({
  employees = {},
  processedLogs = [],
  adminLeaves = [],
  setAdminLeaves,
  adminODs = [],
  setAdminODs,
  adminHolidays = [],
  setAdminHolidays,
  manualPunches = [],
  setManualPunches,
  onSelectEmployee
}) {
  const [activeSubTab, setActiveSubTab] = useState('leaves'); // 'leaves' | 'od' | 'regularization' | 'holidays'
  const [notification, setNotification] = useState(null);

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Stats Calculations
  const activeLeavesToday = adminLeaves.filter(l => todayStr >= l.startDate && todayStr <= l.endDate).length;
  const activeODsToday = adminODs.filter(o => todayStr >= o.startDate && todayStr <= o.endDate).length;
  const upcomingHolidaysCount = adminHolidays.filter(h => h.date >= todayStr).length;

  const employeeOptions = Object.entries(employees).map(([empId, emp]) => ({
    value: empId,
    label: `${emp.name} (${empId}) • ${emp.department}`
  }));

  // Form States for Leaves
  const [leaveEmpId, setLeaveEmpId] = useState('');
  const [leaveType, setLeaveType] = useState('Casual Leave (CL)');
  const [leaveStartDate, setLeaveStartDate] = useState(todayStr);
  const [leaveEndDate, setLeaveEndDate] = useState(todayStr);
  const [leaveReason, setLeaveReason] = useState('');

  // Form States for On Duty (OD)
  const [odEmpId, setOdEmpId] = useState('');
  const [odLocation, setOdLocation] = useState('');
  const [odStartDate, setOdStartDate] = useState(todayStr);
  const [odEndDate, setOdEndDate] = useState(todayStr);
  const [odReason, setOdReason] = useState('');

  // Form States for Punch Correction
  const [punchEmpId, setPunchEmpId] = useState('');
  const [punchDate, setPunchDate] = useState(todayStr);
  const [punchTime, setPunchTime] = useState('09:00');
  const [punchDirection, setPunchDirection] = useState('IN');
  const [punchReason, setPunchReason] = useState('Biometric Scan Failed');

  // Form States for Holidays
  const [holidayTitle, setHolidayTitle] = useState('');
  const [holidayDate, setHolidayDate] = useState(todayStr);
  const [holidayEndDate, setHolidayEndDate] = useState(todayStr);
  const [holidayType, setHolidayType] = useState('National Holiday');
  const [holidayNotes, setHolidayNotes] = useState('');
  const [holidayScope, setHolidayScope] = useState('All Departments');
  const [isRecurring, setIsRecurring] = useState(false);
  const [holidayViewMode, setHolidayViewMode] = useState('cards'); // 'cards' | 'month'
  const [holidayFilterCategory, setHolidayFilterCategory] = useState('All'); // 'All' | 'National' | 'Festival' | 'Shutdown' | 'Upcoming'
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [noticeLanguage, setNoticeLanguage] = useState('en'); // 'en' | 'ta' | 'hi'
  
  // Bulk selection & inline quick modal states
  const [selectedHolidayIds, setSelectedHolidayIds] = useState([]);
  const [inlineModalDate, setInlineModalDate] = useState(null);
  const [inlineModalTitle, setInlineModalTitle] = useState('');
  const [inlineModalType, setInlineModalType] = useState('National Holiday');
  const [inlineModalNotes, setInlineModalNotes] = useState('');

  // Search & Filter state for management tables
  const [adminSearchQuery, setAdminSearchQuery] = useState('');

  // Handlers
  const handleAssignLeave = (e) => {
    e.preventDefault();
    if (!leaveEmpId) {
      showToast('Please select an employee', 'error');
      return;
    }
    const emp = employees[leaveEmpId];
    if (!emp) return;

    const newLeave = {
      id: `LV-${Date.now()}`,
      empId: leaveEmpId,
      empName: emp.name,
      department: emp.department || 'General',
      designation: emp.designation || 'Staff',
      leaveType,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      reason: leaveReason.trim() || 'Approved Leave',
      createdAt: new Date().toISOString()
    };

    const updated = [newLeave, ...adminLeaves];
    setAdminLeaves(updated);
    localStorage.setItem('dpi_admin_leaves', JSON.stringify(updated));
    showToast(`Leave granted to ${emp.name} (${leaveType})`);
    setLeaveReason('');
  };

  const handleRevokeLeave = (id) => {
    const updated = adminLeaves.filter(l => l.id !== id);
    setAdminLeaves(updated);
    localStorage.setItem('dpi_admin_leaves', JSON.stringify(updated));
    showToast('Leave entry revoked', 'info');
  };

  const handleLogOD = (e) => {
    e.preventDefault();
    if (!odEmpId) {
      showToast('Please select an employee', 'error');
      return;
    }
    if (!odLocation.trim()) {
      showToast('Please enter the client / duty location', 'error');
      return;
    }
    const emp = employees[odEmpId];
    if (!emp) return;

    const newRecord = {
      id: `OD-${Date.now()}`,
      empId: odEmpId,
      empName: emp.name,
      department: emp.department || 'General',
      designation: emp.designation || 'Staff',
      location: odLocation.trim(),
      startDate: odStartDate,
      endDate: odEndDate,
      reason: odReason.trim() || 'Official Duty',
      createdAt: new Date().toISOString()
    };

    const updated = [newRecord, ...adminODs];
    setAdminODs(updated);
    localStorage.setItem('dpi_admin_ods', JSON.stringify(updated));
    showToast(`On Duty logged for ${emp.name} at ${odLocation}`);
    setOdLocation('');
    setOdReason('');
  };

  const handleRevokeOD = (id) => {
    const updated = adminODs.filter(o => o.id !== id);
    setAdminODs(updated);
    localStorage.setItem('dpi_admin_ods', JSON.stringify(updated));
    showToast('On Duty entry revoked', 'info');
  };

  const handleAddManualPunch = (e) => {
    e.preventDefault();
    if (!punchEmpId) {
      showToast('Please select an employee', 'error');
      return;
    }
    const emp = employees[punchEmpId];
    if (!emp) return;

    const fullIso = new Date(`${punchDate}T${punchTime}:00`).toISOString();

    const newPunch = {
      id: `MP-${Date.now()}`,
      empId: punchEmpId,
      empName: emp.name,
      department: emp.department || 'General',
      designation: emp.designation || 'Staff',
      timestamp: fullIso,
      dateStr: punchDate,
      timeStr: punchTime,
      direction: punchDirection,
      reason: punchReason,
      createdAt: new Date().toISOString()
    };

    const updated = [newPunch, ...manualPunches];
    setManualPunches(updated);
    localStorage.setItem('dpi_manual_punches', JSON.stringify(updated));
    showToast(`Manual ${punchDirection} punch added for ${emp.name} at ${punchTime}`);
  };

  const handleDeleteManualPunch = (id) => {
    const updated = manualPunches.filter(p => p.id !== id);
    setManualPunches(updated);
    localStorage.setItem('dpi_manual_punches', JSON.stringify(updated));
    showToast('Manual punch deleted', 'info');
  };

  const handleAddHoliday = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!holidayTitle.trim()) {
      showToast('Please enter holiday title', 'error');
      return;
    }

    const start = new Date(holidayDate);
    const end = new Date(holidayEndDate || holidayDate);

    if (end < start) {
      showToast('End date cannot be earlier than start date', 'error');
      return;
    }

    const newHolidays = [];
    const current = new Date(start);
    let dayCount = 0;

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      if (!adminHolidays.some(h => h.date === dateStr)) {
        newHolidays.push({
          id: `HOL-${Date.now()}-${dayCount}`,
          title: holidayTitle.trim(),
          date: dateStr,
          type: holidayType,
          scope: holidayScope,
          isRecurring,
          notes: holidayNotes.trim() || 'Declared Official Holiday',
          createdAt: new Date().toISOString()
        });
      }
      current.setDate(current.getDate() + 1);
      dayCount++;
    }

    if (newHolidays.length === 0) {
      showToast('Selected date range already has declared holidays', 'error');
      return;
    }

    const updated = [...newHolidays, ...adminHolidays].sort((a, b) => a.date.localeCompare(b.date));
    setAdminHolidays(updated);
    localStorage.setItem('dpi_admin_holidays', JSON.stringify(updated));
    showToast(`Declared ${newHolidays.length} holiday day(s) for "${holidayTitle}"`);
    setHolidayTitle('');
    setHolidayNotes('');
  };

  const handleDeleteHoliday = (id) => {
    const updated = adminHolidays.filter(h => h.id !== id);
    setAdminHolidays(updated);
    localStorage.setItem('dpi_admin_holidays', JSON.stringify(updated));
    setSelectedHolidayIds(prev => prev.filter(i => i !== id));
    showToast('Holiday entry deleted', 'info');
  };

  const handleBulkDeleteHolidays = () => {
    if (selectedHolidayIds.length === 0) return;
    const updated = adminHolidays.filter(h => !selectedHolidayIds.includes(h.id));
    setAdminHolidays(updated);
    localStorage.setItem('dpi_admin_holidays', JSON.stringify(updated));
    showToast(`Deleted ${selectedHolidayIds.length} selected holiday(s)`, 'info');
    setSelectedHolidayIds([]);
  };

  const presets2026 = [
    { title: 'New Year Day', date: '2026-01-01', type: 'National Holiday', notes: 'Official New Year' },
    { title: 'Pongal / Makar Sankranti', date: '2026-01-14', type: 'Festival Holiday', notes: 'Harvest Festival' },
    { title: 'Thiruvalluvar Day / Mattu Pongal', date: '2026-01-15', type: 'Festival Holiday', notes: 'Regional Festival' },
    { title: 'Republic Day', date: '2026-01-26', type: 'National Holiday', notes: 'National Day' },
    { title: 'Good Friday', date: '2026-04-03', type: 'National Holiday', notes: 'Good Friday' },
    { title: 'Tamil New Year / Ambedkar Jayanti', date: '2026-04-14', type: 'Festival Holiday', notes: 'State Off & Jayanti' },
    { title: 'May Day / Labor Day', date: '2026-05-01', type: 'National Holiday', notes: 'International Workers Day' },
    { title: 'Independence Day', date: '2026-08-15', type: 'National Holiday', notes: '79th Independence Day' },
    { title: 'Vinayagar Chaturthi', date: '2026-09-04', type: 'Festival Holiday', notes: 'Festival Off' },
    { title: 'Gandhi Jayanti', date: '2026-10-02', type: 'National Holiday', notes: 'Mahatma Gandhi Jayanti' },
    { title: 'Ayudha Pooja / Vijaya Dasami', date: '2026-10-19', type: 'Festival Holiday', notes: 'Ayudha Pooja Off' },
    { title: 'Deepavali / Diwali', date: '2026-11-08', type: 'Festival Holiday', notes: 'Festival of Lights' },
    { title: 'Christmas Day', date: '2026-12-25', type: 'Festival Holiday', notes: 'Christmas Off' }
  ];

  const handleImportFullYear2026 = () => {
    let addedCount = 0;
    const existingDates = new Set(adminHolidays.map(h => h.date));
    const toAdd = [];

    presets2026.forEach((p, idx) => {
      if (!existingDates.has(p.date)) {
        toAdd.push({
          id: `HOL-2026-IMP-${idx}-${Date.now()}`,
          title: p.title,
          date: p.date,
          type: p.type,
          scope: 'All Departments',
          isRecurring: true,
          notes: p.notes,
          createdAt: new Date().toISOString()
        });
        addedCount++;
      }
    });

    if (addedCount === 0) {
      showToast('All 2026 official holidays are already loaded!', 'info');
      return;
    }

    const updated = [...toAdd, ...adminHolidays].sort((a, b) => a.date.localeCompare(b.date));
    setAdminHolidays(updated);
    localStorage.setItem('dpi_admin_holidays', JSON.stringify(updated));
    showToast(`Loaded ${addedCount} official 2026 holidays into calendar!`);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-24 sm:pb-12">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-16 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
          notification.type === 'error' ? 'bg-rose-950 text-rose-200 border-rose-800' :
          notification.type === 'info' ? 'bg-blue-950 text-blue-200 border-blue-800' :
          'bg-emerald-950 text-emerald-200 border-emerald-800'
        }`}>
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{notification.msg}</span>
        </div>
      )}

      {/* 1. Header & Quick Stat Cards */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Admin &amp; Business Operations Portal</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                <ShieldCheck className="h-3 w-3 text-blue-600" /> Admin Exclusive
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Direct administrative entries for leaves, On Duty (OD) field work, punch corrections &amp; company calendar
            </p>
          </div>
        </div>

        {/* Executive Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">On Leave Today</span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono">{activeLeavesToday}</span>
            </div>
            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center font-bold">
              <Palmtree className="h-4 w-4" />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">On Duty (OD) Today</span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono">{activeODsToday}</span>
            </div>
            <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center font-bold">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Manual Punches</span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono">{manualPunches.length}</span>
            </div>
            <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/80 flex items-center justify-center font-bold">
              <Wrench className="h-4 w-4" />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Upcoming Holidays</span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono">{upcomingHolidaysCount}</span>
            </div>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center font-bold">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Operations Sub-Tab Switcher Navigation (Mobile Swipeable Snap Pills) */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 overflow-x-auto scrollbar-none snap-x snap-mandatory gap-1 sm:gap-1.5">
        {[
          { id: 'leaves', label: 'Leave Manager', shortLabel: 'Leaves', icon: Calendar, badge: adminLeaves.length },
          { id: 'od', label: 'On Duty (OD) Register', shortLabel: 'On Duty (OD)', icon: Briefcase, badge: adminODs.length },
          { id: 'regularization', label: 'Punch Regularization', shortLabel: 'Punch Corrections', icon: Clock, badge: manualPunches.length },
          { id: 'holidays', label: 'Holiday Calendar', shortLabel: 'Holidays', icon: Building2, badge: adminHolidays.length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`snap-start shrink-0 min-w-[130px] sm:min-w-0 sm:flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
                isActive
                  ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline">{tab.label}</span>
              <span className="inline md:hidden">{tab.shortLabel}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'}`}>
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Sub-Tab Content Windows */}
      
      {/* SECTION A: LEAVE MANAGER */}
      {activeSubTab === 'leaves' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Assign Leave (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Plus className="h-4 w-4 text-blue-600" />
                Assign Employee Leave
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Directly grant Sick, Casual, Paid, or Unpaid Leave</p>
            </div>

            <form onSubmit={handleAssignLeave} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">Select Employee</label>
                <CustomDropdown
                  options={employeeOptions}
                  value={leaveEmpId}
                  onChange={setLeaveEmpId}
                  placeholder="-- Select Employee --"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">Leave Classification</label>
                <CustomDropdown
                  options={[
                    { value: 'Casual Leave (CL)', label: 'Casual Leave (CL)' },
                    { value: 'Sick Leave (SL)', label: 'Sick Leave (SL)' },
                    { value: 'Earned Leave (EL)', label: 'Earned / Paid Leave (EL)' },
                    { value: 'Leave Without Pay (LWP)', label: 'Unpaid Leave (LWP)' },
                    { value: 'Half-Day Leave', label: 'Half-Day Leave' }
                  ]}
                  value={leaveType}
                  onChange={setLeaveType}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">End Date</label>
                  <input
                    type="date"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Medical emergency, Family function..."
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="h-4 w-4" /> Assign Leave Entry
              </button>
            </form>
          </div>

          {/* Right Table: Active & Historical Leaves (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  Active &amp; Granted Leave Registry
                </h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Showing {adminLeaves.length} leave records</p>
              </div>
            </div>

            {/* Mobile Card View (sm:hidden) */}
            <div className="sm:hidden space-y-2.5">
              {adminLeaves.length > 0 ? (
                adminLeaves.map((item) => {
                  const isActiveToday = todayStr >= item.startDate && todayStr <= item.endDate;
                  return (
                    <div key={item.id} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span
                            onClick={() => onSelectEmployee && onSelectEmployee(item.empId)}
                            className="font-extrabold text-slate-900 text-xs hover:text-blue-600 cursor-pointer block"
                          >
                            {item.empName}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">{item.empId} • {item.department}</span>
                        </div>
                        <button
                          onClick={() => handleRevokeLeave(item.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-100/70 rounded-xl transition-colors cursor-pointer"
                          title="Revoke Leave"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                        <span className="bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                          {item.leaveType}
                        </span>
                        <span className="font-mono font-extrabold text-slate-800 text-[10px]">{item.startDate} to {item.endDate}</span>
                      </div>

                      {item.reason && (
                        <p className="text-[10px] text-slate-500 italic">"{item.reason}"</p>
                      )}

                      {isActiveToday && (
                        <div className="pt-1">
                          <span className="text-[8px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono border border-emerald-200">
                            On Leave Today
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs font-medium bg-slate-50 border border-slate-200/60 rounded-2xl">
                  No leave records assigned yet.
                </div>
              )}
            </div>

            {/* Desktop Table View (hidden sm:block) */}
            <div className="hidden sm:block border border-slate-200/80 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5">Employee</th>
                      <th className="px-3 py-2.5">Leave Type</th>
                      <th className="px-3 py-2.5">Date Range</th>
                      <th className="px-3 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-slate-700">
                    {adminLeaves.length > 0 ? (
                      adminLeaves.map((item) => {
                        const isActiveToday = todayStr >= item.startDate && todayStr <= item.endDate;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-3 py-2.5">
                              <span
                                onClick={() => onSelectEmployee && onSelectEmployee(item.empId)}
                                className="font-extrabold text-slate-900 hover:text-blue-600 cursor-pointer block"
                              >
                                {item.empName}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">{item.empId} • {item.department}</span>
                            </td>
                            <td className="px-3 py-2.5 font-bold">
                              <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-lg text-[10px] block w-fit font-semibold">
                                {item.leaveType}
                              </span>
                              <span className="text-[9px] text-slate-400 font-normal block truncate max-w-[120px]">{item.reason}</span>
                            </td>
                            <td className="px-3 py-2.5 font-mono">
                              <span className="font-bold text-slate-800 block text-[11px]">{item.startDate} to {item.endDate}</span>
                              {isActiveToday && (
                                <span className="text-[8px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono">On Leave Today</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <button
                                onClick={() => handleRevokeLeave(item.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Revoke Leave"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-slate-400 text-xs font-medium">
                          No leave records assigned yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION B: ON DUTY (OD) REGISTER */}
      {activeSubTab === 'od' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Log OD (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-600" />
                Register On Duty (OD) Entry
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Log client visits, off-site duty or business travel</p>
            </div>

            <form onSubmit={handleLogOD} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">Select Employee</label>
                <CustomDropdown
                  options={employeeOptions}
                  value={odEmpId}
                  onChange={setOdEmpId}
                  placeholder="-- Select Employee --"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">Duty Location / Client Site</label>
                <input
                  type="text"
                  placeholder="e.g. Chennai Plant Site, Bangalore Client Office..."
                  value={odLocation}
                  onChange={(e) => setOdLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={odStartDate}
                    onChange={(e) => setOdStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">End Date</label>
                  <input
                    type="date"
                    value={odEndDate}
                    onChange={(e) => setOdEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">Work Description / Justification</label>
                <input
                  type="text"
                  placeholder="e.g. Annual Audit, System Installation..."
                  value={odReason}
                  onChange={(e) => setOdReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="h-4 w-4" /> Register On Duty
              </button>
            </form>
          </div>

          {/* Right Table: OD Log Table (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  On Duty (OD) Active Records
                </h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Showing {adminODs.length} field duty logs</p>
              </div>
            </div>

            {/* Mobile Card View (sm:hidden) */}
            <div className="sm:hidden space-y-2.5">
              {adminODs.length > 0 ? (
                adminODs.map((item) => {
                  const isActiveToday = todayStr >= item.startDate && todayStr <= item.endDate;
                  return (
                    <div key={item.id} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span
                            onClick={() => onSelectEmployee && onSelectEmployee(item.empId)}
                            className="font-extrabold text-slate-900 text-xs hover:text-blue-600 cursor-pointer block"
                          >
                            {item.empName}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">{item.empId} • {item.department}</span>
                        </div>
                        <button
                          onClick={() => handleRevokeOD(item.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-100/70 rounded-xl transition-colors cursor-pointer"
                          title="Revoke OD"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                        <span className="bg-blue-100 text-blue-900 border border-blue-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                          📍 {item.location}
                        </span>
                        <span className="font-mono font-extrabold text-slate-800 text-[10px]">{item.startDate} to {item.endDate}</span>
                      </div>

                      {item.reason && (
                        <p className="text-[10px] text-slate-500 italic">"{item.reason}"</p>
                      )}

                      {isActiveToday && (
                        <div className="pt-1">
                          <span className="text-[8px] font-extrabold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono border border-blue-200">
                            OD Active Today
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs font-medium bg-slate-50 border border-slate-200/60 rounded-2xl">
                  No On Duty records logged yet.
                </div>
              )}
            </div>

            {/* Desktop Table View (hidden sm:block) */}
            <div className="hidden sm:block border border-slate-200/80 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5">Employee</th>
                      <th className="px-3 py-2.5">Location &amp; Reason</th>
                      <th className="px-3 py-2.5">Date Range</th>
                      <th className="px-3 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-slate-700">
                    {adminODs.length > 0 ? (
                      adminODs.map((item) => {
                        const isActiveToday = todayStr >= item.startDate && todayStr <= item.endDate;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-3 py-2.5">
                              <span
                                onClick={() => onSelectEmployee && onSelectEmployee(item.empId)}
                                className="font-extrabold text-slate-900 hover:text-blue-600 cursor-pointer block"
                              >
                                {item.empName}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">{item.empId} • {item.department}</span>
                            </td>
                            <td className="px-3 py-2.5 font-bold">
                              <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-lg text-[10px] block w-fit font-semibold">
                                📍 {item.location}
                              </span>
                              <span className="text-[9px] text-slate-400 font-normal block truncate max-w-[120px]">{item.reason}</span>
                            </td>
                            <td className="px-3 py-2.5 font-mono">
                              <span className="font-bold text-slate-800 block text-[11px]">{item.startDate} to {item.endDate}</span>
                              {isActiveToday && (
                                <span className="text-[8px] font-extrabold uppercase bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-mono">OD Active Today</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <button
                                onClick={() => handleRevokeOD(item.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Revoke OD"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-slate-400 text-xs font-medium">
                          No On Duty records logged yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION C: PUNCH REGULARIZATION */}
      {activeSubTab === 'regularization' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Insert Punch (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-600" />
                Manual Punch Regularization
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Add missing IN or OUT punch for biometric scan errors</p>
            </div>

            <form onSubmit={handleAddManualPunch} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">Select Employee</label>
                <CustomDropdown
                  options={employeeOptions}
                  value={punchEmpId}
                  onChange={setPunchEmpId}
                  placeholder="-- Select Employee --"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">Punch Date</label>
                  <input
                    type="date"
                    value={punchDate}
                    onChange={(e) => setPunchDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">Time (HH:MM)</label>
                  <input
                    type="time"
                    value={punchTime}
                    onChange={(e) => setPunchTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">Direction</label>
                <CustomDropdown
                  options={[
                    { value: 'IN', label: 'Clock-IN (Arrival)' },
                    { value: 'OUT', label: 'Clock-OUT (Departure)' }
                  ]}
                  value={punchDirection}
                  onChange={setPunchDirection}
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">Correction Reason</label>
                <CustomDropdown
                  options={[
                    { value: 'Biometric Scan Failed', label: 'Biometric Scan Failed' },
                    { value: 'Forgotten Swipe', label: 'Forgotten Swipe' },
                    { value: 'Emergency Duty Entry', label: 'Emergency Duty Entry' },
                    { value: 'Authorized Admin Adjustment', label: 'Authorized Admin Adjustment' }
                  ]}
                  value={punchReason}
                  onChange={setPunchReason}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 sm:py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="h-4 w-4" /> Insert Regularized Punch
              </button>
            </form>
          </div>

          {/* Right Table: Regularized Logs Table (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  Manual Punch Corrections Log
                </h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Showing {manualPunches.length} regularized entries</p>
              </div>
            </div>

            {/* Mobile Card View (sm:hidden) */}
            <div className="sm:hidden space-y-2.5">
              {manualPunches.length > 0 ? (
                manualPunches.map((item) => (
                  <div key={item.id} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          onClick={() => onSelectEmployee && onSelectEmployee(item.empId)}
                          className="font-extrabold text-slate-900 text-xs hover:text-blue-600 cursor-pointer block"
                        >
                          {item.empName}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">{item.empId} • {item.department}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteManualPunch(item.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-100/70 rounded-xl transition-colors cursor-pointer"
                        title="Delete Punch"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 font-mono">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] border font-bold ${
                        item.direction === 'IN' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        {item.direction}
                      </span>
                      <span className="font-bold text-slate-800 text-[10px]">{item.dateStr} at {item.timeStr}</span>
                    </div>

                    <p className="text-[10px] text-slate-500 italic">"{item.reason}"</p>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs font-medium bg-slate-50 border border-slate-200/60 rounded-2xl">
                  No manual punch entries added yet.
                </div>
              )}
            </div>

            {/* Desktop Table View (hidden sm:block) */}
            <div className="hidden sm:block border border-slate-200/80 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5">Employee</th>
                      <th className="px-3 py-2.5">Punch Timestamp</th>
                      <th className="px-3 py-2.5">Direction &amp; Reason</th>
                      <th className="px-3 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-slate-700">
                    {manualPunches.length > 0 ? (
                      manualPunches.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3 py-2.5">
                            <span
                              onClick={() => onSelectEmployee && onSelectEmployee(item.empId)}
                              className="font-extrabold text-slate-900 hover:text-blue-600 cursor-pointer block"
                            >
                              {item.empName}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">{item.empId} • {item.department}</span>
                          </td>
                          <td className="px-3 py-2.5 font-mono">
                            <span className="font-bold text-slate-800 block text-[11px]">{item.dateStr} at {item.timeStr}</span>
                          </td>
                          <td className="px-3 py-2.5 font-bold">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] border block w-fit font-mono font-extrabold ${
                              item.direction === 'IN' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}>
                              {item.direction}
                            </span>
                            <span className="text-[9px] text-slate-400 font-normal block truncate max-w-[120px]">{item.reason}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <button
                              onClick={() => handleDeleteManualPunch(item.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Punch"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-slate-400 text-xs font-medium">
                          No manual punch entries added yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION D: HOLIDAY CALENDAR */}
      {activeSubTab === 'holidays' && (
        (() => {
          // Full Official 2026 Calendar Preset List
          const presets2026 = [
            { title: 'New Year Day', date: '2026-01-01', type: 'National Holiday', notes: 'New Year Day' },
            { title: 'Pongal / Makar Sankranti', date: '2026-01-14', type: 'Festival Holiday', notes: 'Harvest Festival' },
            { title: 'Thiruvalluvar Day / Mattu Pongal', date: '2026-01-15', type: 'Festival Holiday', notes: 'State Festival Off' },
            { title: 'Republic Day', date: '2026-01-26', type: 'National Holiday', notes: 'Republic Day' },
            { title: 'Good Friday', date: '2026-04-03', type: 'National Holiday', notes: 'Good Friday' },
            { title: 'Tamil New Year / Ambedkar Jayanti', date: '2026-04-14', type: 'Festival Holiday', notes: 'New Year & Ambedkar Jayanti' },
            { title: 'May Day / Labor Day', date: '2026-05-01', type: 'National Holiday', notes: 'International Workers Day' },
            { title: 'Independence Day', date: '2026-08-15', type: 'National Holiday', notes: 'Independence Day' },
            { title: 'Vinayagar Chaturthi', date: '2026-09-04', type: 'Festival Holiday', notes: 'Ganesh Chaturthi' },
            { title: 'Gandhi Jayanti', date: '2026-10-02', type: 'National Holiday', notes: 'Gandhi Jayanti' },
            { title: 'Ayudha Pooja / Vijaya Dasami', date: '2026-10-19', type: 'Festival Holiday', notes: 'Ayudha Pooja' },
            { title: 'Deepavali / Diwali', date: '2026-11-08', type: 'Festival Holiday', notes: 'Festival of Lights' },
            { title: 'Christmas Day', date: '2026-12-25', type: 'Festival Holiday', notes: 'Christmas Celebration' }
          ];

          const handleImportFullYear2026 = () => {
            let addedCount = 0;
            const updated = [...adminHolidays];
            presets2026.forEach((p, idx) => {
              if (!updated.some(h => h.date === p.date)) {
                updated.push({
                  id: `HOL-2026-${idx}-${Date.now()}`,
                  title: p.title,
                  date: p.date,
                  type: p.type,
                  scope: 'All Departments',
                  isRecurring: true,
                  notes: p.notes,
                  createdAt: new Date().toISOString()
                });
                addedCount++;
              }
            });
            updated.sort((a, b) => a.date.localeCompare(b.date));
            setAdminHolidays(updated);
            localStorage.setItem('dpi_admin_holidays', JSON.stringify(updated));
            showToast(`Loaded ${addedCount} official 2026 holidays into calendar!`);
          };

          const handleExportHolidayExcel = async () => {
            try {
              const XLSX = await import('xlsx');
              const data = adminHolidays.map((h, i) => ({
                'S.No': i + 1,
                'Holiday Title': h.title,
                'Date': h.date,
                'Classification': h.type,
                'Scope': h.scope || 'All Departments',
                'Recurring': h.isRecurring ? 'Yes' : 'No',
                'Notes': h.notes || '-'
              }));
              const ws = XLSX.utils.json_to_sheet(data);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'Official Holidays');
              XLSX.writeFile(wb, `DPI_Company_Holiday_Calendar_${new Date().getFullYear()}.xlsx`);
              showToast('Exported Holiday Schedule to Excel!');
            } catch (err) {
              showToast('Excel export failed', 'error');
            }
          };

          const handleExportHolidayNoticePDF = async () => {
            try {
              if (adminHolidays.length === 0) {
                showToast('No declared holidays to export', 'error');
                return;
              }
              showToast(`Generating Official ${noticeLanguage.toUpperCase()} Holiday Notice PDF...`, 'info');
              await generateHolidayNoticePDF({
                companyName: 'DPI Attendance Systems',
                holidays: adminHolidays,
                language: noticeLanguage,
                filename: `DPI_Official_Holiday_Notice_${noticeLanguage.toUpperCase()}_${new Date().getFullYear()}.pdf`
              });
              showToast('Downloaded Official Holiday Notice PDF!');
            } catch (err) {
              console.error(err);
              showToast('PDF generation failed', 'error');
            }
          };

          const handleExportSingleHolidayNoticePDF = async (item) => {
            try {
              showToast(`Generating Circular PDF for "${item.title}"...`, 'info');
              await generateSingleHolidayNoticePDF({
                companyName: 'DPI Attendance Systems',
                holiday: item,
                language: noticeLanguage,
                filename: `DPI_Official_Circular_${item.title.replace(/[^a-zA-Z0-9]/g, '_')}_${noticeLanguage.toUpperCase()}.pdf`
              });
              showToast(`Downloaded Circular PDF for "${item.title}"!`);
            } catch (err) {
              console.error(err);
              showToast('Single circular PDF export failed', 'error');
            }
          };

          const handleInlineModalSubmit = (e) => {
            e.preventDefault();
            if (!inlineModalTitle.trim() || !inlineModalDate) return;

            const newHoliday = {
              id: `HOL-${Date.now()}`,
              title: inlineModalTitle.trim(),
              date: inlineModalDate,
              type: inlineModalType,
              scope: 'All Departments',
              isRecurring: false,
              notes: inlineModalNotes.trim() || 'Direct calendar entry',
              createdAt: new Date().toISOString()
            };

            const updated = [newHoliday, ...adminHolidays].sort((a, b) => a.date.localeCompare(b.date));
            setAdminHolidays(updated);
            localStorage.setItem('dpi_admin_holidays', JSON.stringify(updated));
            showToast(`Holiday "${inlineModalTitle}" declared for ${inlineModalDate}`);
            setInlineModalDate(null);
            setInlineModalTitle('');
            setInlineModalNotes('');
          };

          // Filtered Holidays
          const filteredHolidays = adminHolidays.filter(h => {
            if (holidayFilterCategory === 'Upcoming') return h.date >= todayStr;
            if (holidayFilterCategory === 'National') return h.type === 'National Holiday';
            if (holidayFilterCategory === 'Festival') return h.type === 'Festival Holiday';
            if (holidayFilterCategory === 'Shutdown') return h.type === 'Factory Maintenance Shutdown';
            return true;
          });

          // Compute Month Calendar Days for Month View
          const [yearStr, monthStr] = selectedMonth.split('-');
          const year = parseInt(yearStr, 10);
          const monthIdx = parseInt(monthStr, 10) - 1; // 0-indexed
          const firstDayOfMonth = new Date(year, monthIdx, 1).getDay(); // 0 = Sun
          const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
          
          const monthDays = [];
          for (let i = 0; i < firstDayOfMonth; i++) {
            monthDays.push(null);
          }
          for (let d = 1; d <= daysInMonth; d++) {
            const dateString = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const matchingHolidays = adminHolidays.filter(h => h.date === dateString);
            monthDays.push({ dayNum: d, dateString, holidays: matchingHolidays });
          }

          return (
            <div className="space-y-6">
              {/* Executive 1-Click Holiday Generator & Notice PDF Banner */}
              <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-600 animate-pulse" />
                      <h4 className="text-xs font-extrabold uppercase text-slate-900 tracking-wider">Fast 1-Click Official Holiday Generator</h4>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Instant 1-click import of complete 2026 calendar &amp; Notice Board PDF print</p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleImportFullYear2026}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3 py-2 rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Load Full 2026 Calendar (13 Holidays)
                    </button>
                    <button
                      type="button"
                      onClick={handleExportHolidayExcel}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
                    >
                      <FileText className="h-3.5 w-3.5 text-slate-500" /> Export Excel
                    </button>
                    <div className="w-36 lg:w-44">
                      <CustomDropdown
                        options={[
                          { value: 'en', label: '🇬🇧 English Notice' },
                          { value: 'ta', label: '🇮🇳 தமிழ் (Tamil)' },
                          { value: 'hi', label: '🇮🇳 हिन्दी (Hindi)' }
                        ]}
                        value={noticeLanguage}
                        onChange={setNoticeLanguage}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleExportHolidayNoticePDF}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-3 py-2 rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-blue-400" /> Export PDF Notice
                    </button>
                  </div>
                </div>

                {/* Quick Presets Bar */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                  {presets2026.slice(0, 7).map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setHolidayTitle(p.title);
                        setHolidayDate(p.date);
                        setHolidayEndDate(p.date);
                        setHolidayType(p.type);
                        setHolidayNotes(p.notes);
                        showToast(`Pre-filled preset "${p.title}"`);
                      }}
                      className="bg-slate-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1"
                    >
                      + {p.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Form: Add Holiday Range (5 cols) */}
                <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Plus className="h-4 w-4 text-blue-600" />
                      Declare Holiday (Single or Multi-Day Range)
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Select a single date or date range (e.g. Nov 1 to Nov 4)</p>
                  </div>

                  <form onSubmit={handleAddHoliday} className="space-y-3">
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">Holiday Title / Occasion</label>
                      <input
                        type="text"
                        placeholder="e.g. Pongal Vacation, Plant Off..."
                        value={holidayTitle}
                        onChange={(e) => setHolidayTitle(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">Start Date</label>
                        <input
                          type="date"
                          value={holidayDate}
                          onChange={(e) => {
                            setHolidayDate(e.target.value);
                            if (e.target.value > holidayEndDate) setHolidayEndDate(e.target.value);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">End Date (Range)</label>
                        <input
                          type="date"
                          value={holidayEndDate}
                          onChange={(e) => setHolidayEndDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">Department Scope</label>
                        <CustomDropdown
                          options={[
                            { value: 'All Departments', label: 'All Departments' },
                            { value: 'PF Only', label: 'PF Staff Only' },
                            { value: 'NON PF Only', label: 'NON PF Labor Only' },
                            { value: 'NI Group1', label: 'NI Group 1' },
                            { value: 'NI Group2', label: 'NI Group 2' }
                          ]}
                          value={holidayScope}
                          onChange={setHolidayScope}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">Classification</label>
                        <CustomDropdown
                          options={[
                            { value: 'National Holiday', label: 'National Holiday' },
                            { value: 'Festival Holiday', label: 'Festival Holiday' },
                            { value: 'Factory Maintenance Shutdown', label: 'Factory Maintenance Shutdown' },
                            { value: 'Company Off-Day', label: 'Company Off-Day' }
                          ]}
                          value={holidayType}
                          onChange={setHolidayType}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">Admin Notes</label>
                      <input
                        type="text"
                        placeholder="e.g. Paid holiday for all departments..."
                        value={holidayNotes}
                        onChange={(e) => setHolidayNotes(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="recurringCheck"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <label htmlFor="recurringCheck" className="text-xs font-extrabold text-slate-700 cursor-pointer">
                        Mark as Annual Recurring Holiday
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Check className="h-4 w-4" /> Declare Holiday Entry
                    </button>
                  </form>
                </div>

                {/* Right View Window: Cards or Month View (7 cols) */}
                <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
                  {/* Header with View Controls & Bulk Action Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        Declared Company Holidays
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Showing {filteredHolidays.length} declared events</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedHolidayIds.length > 0 && (
                        <button
                          onClick={handleBulkDeleteHolidays}
                          className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" /> Delete Selected ({selectedHolidayIds.length})
                        </button>
                      )}

                      {/* View Switcher Pills */}
                      <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                        <button
                          onClick={() => setHolidayViewMode('cards')}
                          className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            holidayViewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          List Cards
                        </button>
                        <button
                          onClick={() => setHolidayViewMode('month')}
                          className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            holidayViewMode === 'month' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          📅 Month View
                        </button>
                      </div>

                      {/* Category Filter */}
                      <CustomDropdown
                        options={[
                          { value: 'All', label: 'All Categories' },
                          { value: 'Upcoming', label: 'Upcoming Only' },
                          { value: 'National', label: 'National Holidays' },
                          { value: 'Festival', label: 'Festival Off' },
                          { value: 'Shutdown', label: 'Plant Shutdowns' }
                        ]}
                        value={holidayFilterCategory}
                        onChange={setHolidayFilterCategory}
                      />
                    </div>
                  </div>

                  {/* VIEW MODE 1: LIST CARDS WITH BULK CHECKBOXES */}
                  {holidayViewMode === 'cards' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto scrollbar-thin pr-1">
                      {filteredHolidays.length > 0 ? (
                        filteredHolidays.map((item) => {
                          const isUpcoming = item.date >= todayStr;
                          const isChecked = selectedHolidayIds.includes(item.id);

                          return (
                            <div key={item.id} className={`border rounded-2xl p-3.5 flex flex-col justify-between space-y-2 transition-all ${
                              isChecked ? 'bg-emerald-50/90 border-emerald-300' : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
                            }`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedHolidayIds(prev => [...prev, item.id]);
                                      } else {
                                        setSelectedHolidayIds(prev => prev.filter(i => i !== item.id));
                                      }
                                    }}
                                    className="mt-1 h-3.5 w-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                  />
                                  <div>
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-extrabold uppercase border ${
                                        isUpcoming ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-200 text-slate-600 border-slate-300'
                                      }`}>
                                        {isUpcoming ? 'Upcoming' : 'Past'}
                                      </span>
                                      <span className="text-[9px] font-bold text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded border border-slate-300/60">
                                        {item.type}
                                      </span>
                                    </div>
                                    <h4 className="font-extrabold text-slate-900 text-xs mt-1.5">{item.title}</h4>
                                    <span className="text-[9px] text-slate-500 font-mono block mt-0.5">Scope: {item.scope || 'All Departments'}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleExportSingleHolidayNoticePDF(item)}
                                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-1.5 rounded-xl text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer border border-blue-200/80 shadow-2xs"
                                    title="Export Single Event Notice Circular PDF"
                                  >
                                    <FileText className="h-3 w-3 text-blue-600" />
                                    <span>Notice</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteHoliday(item.id)}
                                    className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors cursor-pointer"
                                    title="Delete Holiday"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-mono">
                                <span className="font-extrabold text-slate-800">📅 {item.date}</span>
                                {item.notes && <span className="text-[9px] text-slate-400 font-sans truncate max-w-[110px]">{item.notes}</span>}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="sm:col-span-2 py-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          No company holidays match selected filter.
                        </div>
                      )}
                    </div>
                  )}

                  {/* VIEW MODE 2: INTERACTIVE MONTHLY CALENDAR GRID WITH INLINE CLICK MODAL */}
                  {holidayViewMode === 'month' && (
                    <div className="space-y-3 relative">
                      {/* Month Picker Control */}
                      <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Select Month Grid:</span>
                        <input
                          type="month"
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(e.target.value)}
                          className="bg-white border border-slate-200 text-xs font-bold text-slate-800 rounded-lg px-2.5 py-1 outline-none font-mono"
                        />
                      </div>

                      {/* Month 7x5 Calendar Grid */}
                      <div className="border border-slate-200 rounded-2xl p-2.5 bg-slate-50/50">
                        {/* Day Name Header */}
                        <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dI) => (
                            <div key={day} className={`text-[10px] font-extrabold uppercase tracking-wider py-1 ${dI === 0 || dI === 6 ? 'text-rose-500' : 'text-slate-500'}`}>
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* Day Tiles */}
                        <div className="grid grid-cols-7 gap-1">
                          {monthDays.map((cell, cIdx) => {
                            if (!cell) {
                              return <div key={`empty-${cIdx}`} className="h-14 bg-slate-100/40 rounded-lg border border-slate-150/40"></div>;
                            }
                            const hasHoliday = cell.holidays.length > 0;
                            const isToday = cell.dateString === todayStr;

                            return (
                              <div
                                key={cell.dateString}
                                onClick={() => {
                                  setInlineModalDate(cell.dateString);
                                  setInlineModalTitle(hasHoliday ? cell.holidays[0].title : '');
                                  setInlineModalNotes(hasHoliday ? (cell.holidays[0].notes || '') : '');
                                }}
                                className={`h-14 rounded-lg p-1 border transition-all cursor-pointer flex flex-col justify-between ${
                                  hasHoliday
                                    ? 'bg-emerald-500 border-emerald-600 text-white font-extrabold shadow-2xs hover:bg-emerald-600'
                                    : isToday
                                    ? 'bg-blue-50 border-blue-300 text-blue-900 font-extrabold'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                                title={hasHoliday ? cell.holidays.map(h => h.title).join(', ') : `Click to declare holiday for ${cell.dateString}`}
                              >
                                <div className="flex items-center justify-between text-[10px] font-mono leading-none">
                                  <span className={hasHoliday ? 'text-white font-black' : isToday ? 'text-blue-700 font-black' : 'text-slate-500'}>{cell.dayNum}</span>
                                  {hasHoliday && <span className="text-[8px] bg-white/20 px-1 rounded">OFF</span>}
                                </div>
                                {hasHoliday && (
                                  <div className="text-[8.5px] truncate font-sans leading-tight mt-1 text-emerald-50">
                                    {cell.holidays[0].title}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* INLINE QUICK DECLARE POPUP MODAL */}
                      {inlineModalDate && (
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs rounded-2xl flex items-center justify-center p-4 z-30 animate-fadeIn">
                          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl max-w-sm w-full space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <div>
                                <span className="text-[10px] font-mono font-extrabold text-emerald-600 uppercase">Direct Declare</span>
                                <h4 className="text-xs font-extrabold text-slate-900">Declare Holiday for {inlineModalDate}</h4>
                              </div>
                              <button
                                type="button"
                                onClick={() => setInlineModalDate(null)}
                                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>

                            <form onSubmit={handleInlineModalSubmit} className="space-y-3">
                              <div>
                                <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">Holiday Title</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Regional Off, Festival Day..."
                                  value={inlineModalTitle}
                                  onChange={(e) => setInlineModalTitle(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                                  autoFocus
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">Classification</label>
                                <CustomDropdown
                                  options={[
                                    { value: 'National Holiday', label: 'National Holiday' },
                                    { value: 'Festival Holiday', label: 'Festival Holiday' },
                                    { value: 'Factory Maintenance Shutdown', label: 'Factory Maintenance Shutdown' },
                                    { value: 'Company Off-Day', label: 'Company Off-Day' }
                                  ]}
                                  value={inlineModalType}
                                  onChange={setInlineModalType}
                                />
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setInlineModalDate(null)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="px-4 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer flex items-center gap-1"
                                >
                                  <Check className="h-3.5 w-3.5" /> Save Holiday
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })())}
    </div>
  );
}
