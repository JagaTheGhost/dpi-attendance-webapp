import React, { useState, useEffect, useRef, memo } from 'react';
import { Clock, RefreshCw, LogOut, Search, Users, BarChart3, FileText, ShieldCheck, Settings, Menu, X } from 'lucide-react';
import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt';

function Header({
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
  const [liveTime, setLiveTime] = useState(() => currentTime || new Date());
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close search bar on outside click if search query is empty
  useEffect(() => {
    if (!isSearchOpen) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.universal-search-container')) {
        if (!searchQuery) {
          setIsSearchOpen(false);
        }
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isSearchOpen, searchQuery]);

  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'logs', label: 'Punch Logs', icon: Clock },
    { id: 'presence', label: 'Directory', icon: Users },
    { id: 'admin', label: 'Admin Ops', icon: ShieldCheck },
    { id: 'export', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <header className="lg:hidden bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 relative">
      {/* DPI Logo Brand Accent Bar */}
      <div className="h-0.5 bg-gradient-to-r from-[#3b3492] via-[#16a34a] to-[#dc2626] w-full"></div>
      
      <div className="max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 flex items-center h-14 justify-between gap-2">
        {/* Left: Brand Logo & Title */}
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

        {/* Right Controls: Universal Search + PWA Install */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Universal Search Container */}
          <div className="universal-search-container relative flex items-center">
            {!(isSearchOpen || searchQuery) ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSearchOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
                className="h-8.5 w-8.5 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer border border-slate-200/80 shadow-2xs group"
                title="Search workforce logs & employees"
              >
                <Search className="h-4 w-4 transition-transform group-hover:scale-110" />
              </button>
            ) : (
              <div className="relative flex items-center w-48 sm:w-60 animate-fadeIn">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-600 shrink-0 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search workers or logs..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (activeTab === 'analytics' || activeTab === 'export') {
                      setActiveTab('logs');
                    }
                  }}
                  className="w-full pl-8 pr-7 py-1.5 border border-blue-400 focus:border-blue-600 rounded-full text-xs bg-white text-slate-900 outline-none ring-2 ring-blue-500/20 transition-all font-semibold shadow-2xs"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded-full cursor-pointer transition-colors"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* PWA Install App Prompt / Badge */}
          <PWAInstallPrompt />
        </div>
      </div>
    </header>
  );
}

export default memo(Header);
