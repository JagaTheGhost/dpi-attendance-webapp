import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { 
  BarChart3, 
  Clock, 
  Users, 
  ShieldCheck, 
  FileText, 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Settings,
  X
} from 'lucide-react';

function DesktopSidebar({
  isSupabaseMode,
  currentTime,
  triggerManualRefresh,
  isLoadingData,
  handleLogout,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  isCollapsed,
  setIsCollapsed
}) {
  const [liveTime, setLiveTime] = useState(() => currentTime || new Date());
  const searchInputRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const tabs = useMemo(() => [
    { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: 'Insights' },
    { id: 'logs', label: 'Punch Logs', icon: Clock, badge: 'Live' },
    { id: 'presence', label: 'Directory', icon: Users, badge: 'Roster' },
    { id: 'admin', label: 'Admin Ops', icon: ShieldCheck, badge: 'Ops' },
    { id: 'export', label: 'Reports', icon: FileText, badge: 'Exports' }
  ], []);

  return (
    <aside
      className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-slate-950/95 backdrop-blur-xl border-r border-slate-800/80 shadow-2xl text-slate-300 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Brand Top Header */}
      <div className="h-16 border-b border-slate-800/80 px-3 flex items-center justify-between shrink-0 relative overflow-hidden">
        {/* Brand Accent Top Line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#3b3492] via-[#16a34a] to-[#dc2626]"></div>

        {isCollapsed ? (
          /* Collapsed Header: Centered Logo Button with Expand Icon Hover Overlay */
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="group relative bg-white p-1 rounded-xl shadow-md border border-slate-700 w-9 h-9 flex items-center justify-center mx-auto cursor-pointer transition-transform hover:scale-105"
            title="Expand sidebar"
          >
            <img src="/dpi.png" alt="DPI Logo" className="h-6 w-6 object-contain group-hover:opacity-20 transition-opacity" />
            <ChevronRight className="absolute h-5 w-5 text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ) : (
          /* Expanded Header: Logo + Title + Collapse Button */
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="bg-white p-1 rounded-xl shadow-md border border-slate-700 shrink-0 w-9 h-9 flex items-center justify-center">
                <img src="/dpi.png" alt="DPI Logo" className="h-6 w-6 object-contain" />
              </div>

              <div className="flex flex-col min-w-0 animate-fadeIn">
                <h1 className="text-xs font-black text-white tracking-tight leading-none truncate">
                  DPI Attendance
                </h1>
                <div className="flex items-center gap-1 mt-1">
                  {isSupabaseMode ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded-full border border-emerald-800/60">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      Live Sync
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded-full border border-amber-800/60">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                      Local
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Toggle Collapse Button */}
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="h-7 w-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-800 transition-all cursor-pointer shrink-0"
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Main Navigation Tab Items */}
      <div className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <div key={tab.id} className="relative group">
              <button
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/90'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                
                {!isCollapsed && (
                  <span className="truncate font-bold tracking-tight text-[12px]">{tab.label}</span>
                )}

                {!isCollapsed && isActive && (
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-md bg-white/20 text-white font-extrabold uppercase tracking-wider">
                    {tab.badge}
                  </span>
                )}
              </button>

              {/* Tooltip on Collapsed Mode */}
              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xl border border-slate-800 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                  {tab.label}
                </div>
              )}
            </div>
          );
        })}

        <div className="my-3 border-t border-slate-800/80"></div>

        {/* Universal Search in Sidebar */}
        <div className="px-1">
          {isCollapsed ? (
            <div className="relative group">
              <button
                type="button"
                onClick={() => {
                  setIsCollapsed(false);
                  setTimeout(() => searchInputRef.current?.focus(), 100);
                }}
                className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-800 transition-all cursor-pointer"
              >
                <Search className="h-4 w-4" />
              </button>
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xl border border-slate-800 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                Search workforce...
              </div>
            </div>
          ) : (
            <div className="relative flex items-center w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search workers..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab === 'analytics' || activeTab === 'export') {
                    setActiveTab('logs');
                  }
                }}
                className="w-full pl-8 pr-7 py-2 border border-slate-800 focus:border-blue-500 rounded-xl text-xs bg-slate-900 text-white placeholder-slate-500 outline-none transition-all font-semibold"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Controls & User Actions */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950 space-y-2 shrink-0">
        {/* Live Clock Box */}
        {!isCollapsed && (
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2 flex items-center justify-center gap-2 text-slate-300 font-mono text-[11px] font-bold">
            <Clock className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span>{liveTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
          </div>
        )}

        {/* Settings Tab Button */}
        <div className="relative group">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-800'
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
          >
            <Settings className={`h-4 w-4 shrink-0 ${activeTab === 'settings' ? 'rotate-45' : ''}`} />
            {!isCollapsed && <span>Settings</span>}
          </button>
          {isCollapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xl border border-slate-800 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
              Settings &amp; System Config
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default memo(DesktopSidebar);

