import React from 'react';
import { Clock, RefreshCw, LogOut, Search, Users, BarChart3, FileText, ShieldCheck } from 'lucide-react';

export default function Header({
  isSupabaseMode,
  currentTime,
  triggerManualRefresh,
  isLoadingData,
  handleLogout,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery
}) {
  const tabs = [
    { id: 'logs', label: 'Punch Logs', icon: Clock },
    { id: 'presence', label: 'Directory', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'admin', label: 'Admin Ops', icon: ShieldCheck },
    { id: 'export', label: 'Reports', icon: FileText }
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center h-14 gap-2 sm:gap-4">
        
        {/* Brand — always visible, text size adapts */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-white p-1 rounded-xl shadow-2xs border border-slate-200 shrink-0 w-8 h-8 flex items-center justify-center">
            <img src="/dpi.png" alt="DPI Logo" className="h-6 w-6 object-contain" />
          </div>
          <div>
            <h1 className="text-[11px] sm:text-xs font-extrabold text-slate-900 tracking-tight leading-none whitespace-nowrap">
              DPI Attendance
            </h1>
            <div className="flex items-center gap-1 mt-0.5">
              {isSupabaseMode ? (
                <span className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/60">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span className="hidden xs:inline">Live Sync</span>
                  <span className="xs:hidden">Live</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                  Local
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Vertical Divider — desktop only */}
        <div className="hidden sm:block w-px bg-slate-200/80 self-stretch my-2.5 shrink-0"></div>

        {/* Desktop Center Tab Navigation — hidden on mobile (bottom nav handles it) */}
        <nav className="hidden sm:flex items-center flex-1 gap-0.5 py-2.5 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all duration-150 cursor-pointer whitespace-nowrap group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${isActive ? '' : 'group-hover:scale-110'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Vertical Divider — desktop only */}
        <div className="hidden sm:block w-px bg-slate-200/80 self-stretch my-2.5 shrink-0"></div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
          {/* Inline Search — md+ only when on relevant tabs */}
          {activeTab !== 'export' && activeTab !== 'analytics' && (
            <div className="hidden md:flex relative w-36 lg:w-52">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white text-slate-800 outline-none focus:border-blue-500 transition-all font-medium"
              />
            </div>
          )}

          {/* Clock — lg+ only */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200/80 text-slate-700 text-xs font-bold shadow-2xs font-mono">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>{currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
          </div>

          {/* Refresh */}
          <button
            type="button"
            onClick={triggerManualRefresh}
            disabled={isLoadingData}
            className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-all shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${isLoadingData ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center p-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 transition-all cursor-pointer"
            title="Log Out"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline ml-1">Exit</span>
          </button>
        </div>
      </div>

      {/* sm-only search bar — between sm and md where inline search isn't shown */}
      {activeTab !== 'export' && activeTab !== 'analytics' && (
        <div className="hidden sm:flex md:hidden items-center px-6 pb-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white text-slate-800 outline-none focus:border-blue-500 transition-all font-medium"
            />
          </div>
        </div>
      )}
    </header>
  );
}
