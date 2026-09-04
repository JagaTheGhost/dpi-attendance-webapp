import React, { useMemo, memo } from 'react';
import { 
  Settings, 
  Database, 
  RefreshCw, 
  Palette, 
  FileText, 
  ShieldCheck, 
  Check, 
  Sparkles, 
  LogOut, 
  Smartphone, 
  Clock, 
  Cpu, 
  HardDrive, 
  Info,
  Server,
  Layers,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt';

function SettingsDashboard({
  isSupabaseMode,
  triggerManualRefresh,
  isLoadingData,
  dbError,
  lastRefreshedTime,
  processedLogsCount = 0,
  employeesCount = 0,
  pdfCompanyName,
  setPdfCompanyName,
  pdfThemeColor,
  setPdfThemeColor,
  handleLogout,
  showToast
}) {
  const themeColors = useMemo(() => [
    { id: 'indigo', name: 'DPI Indigo', hex: '#3b3492', bg: 'bg-[#3b3492]' },
    { id: 'emerald', name: 'Emerald Green', hex: '#16a34a', bg: 'bg-[#16a34a]' },
    { id: 'blue', name: 'Sapphire Blue', hex: '#0284c7', bg: 'bg-[#0284c7]' },
    { id: 'rose', name: 'Coral Red', hex: '#dc2626', bg: 'bg-[#dc2626]' },
    { id: 'slate', name: 'Slate Dark', hex: '#1e293b', bg: 'bg-[#1e293b]' }
  ], []);

  const handleSavePreferences = (e) => {
    e.preventDefault();
    if (showToast) {
      showToast('System preferences & PDF branding saved successfully!');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 h-48 w-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-400">
              <Settings className="h-4 w-4" />
              <span>System &amp; Application Configuration</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              Control Panel &amp; Preferences
            </h2>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Manage database realtime synchronization, customize executive PDF report branding, check telemetry connection health, and configure system preferences.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={triggerManualRefresh}
              disabled={isLoadingData}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
              <span>Sync Realtime Data</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Database Realtime Telemetry Settings */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Database &amp; Realtime Sync</h3>
                <p className="text-[11px] text-slate-500">Telemetry status and manual synchronization control</p>
              </div>
            </div>

            {isSupabaseMode ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-extrabold border border-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Supabase Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-extrabold border border-amber-200">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                Local Mode
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Layers className="h-3 w-3 text-slate-500" /> Loaded Logs
              </span>
              <p className="text-lg font-black text-slate-900">{processedLogsCount.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 font-medium">Biometric record entries</p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Server className="h-3 w-3 text-slate-500" /> Active Roster
              </span>
              <p className="text-lg font-black text-slate-900">{employeesCount}</p>
              <p className="text-[10px] text-slate-500 font-medium">Enrolled personnel</p>
            </div>
          </div>

          {dbError && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-center gap-2.5 text-rose-800 text-xs font-bold">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>Sync Error: {dbError}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Last Sync Time: {lastRefreshedTime ? new Date(lastRefreshedTime).toLocaleTimeString('en-IN') : 'Just Now'}</span>
            <button
              type="button"
              onClick={triggerManualRefresh}
              disabled={isLoadingData}
              className="text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer disabled:opacity-50"
            >
              Force DB Fetch
            </button>
          </div>
        </div>

        {/* 2. PDF Branding & Report Theme Customization */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-50 border border-purple-100 text-purple-600">
                <Palette className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">PDF Report &amp; Branding Setup</h3>
                <p className="text-[11px] text-slate-500">Customize generated circulars &amp; executive notices</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Official Company Header Title
              </label>
              <input
                type="text"
                value={pdfCompanyName}
                onChange={(e) => setPdfCompanyName(e.target.value)}
                placeholder="e.g. DPI Biometric Attendance Radar"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white text-slate-900 outline-none focus:border-blue-500 font-semibold transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                PDF Accent Color Palette
              </label>
              <div className="flex flex-wrap gap-2.5">
                {themeColors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPdfThemeColor(c.hex)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      pdfThemeColor === c.hex
                        ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full ${c.bg}`}></span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-all shadow-sm cursor-pointer"
              >
                Save Preferences
              </button>
            </div>
          </form>
        </div>

        {/* 3. Progressive Web App (PWA) & System Diagnostics */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                <Smartphone className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">App Installation &amp; Diagnostics</h3>
                <p className="text-[11px] text-slate-500">Progressive Web App status and timezone</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2.5">
                <Smartphone className="h-4 w-4 text-slate-600" />
                <div>
                  <p className="text-xs font-extrabold text-slate-900">Install Mobile / Desktop App</p>
                  <p className="text-[10px] text-slate-500">Add to Home Screen for offline access</p>
                </div>
              </div>
              <PWAInstallPrompt />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-slate-600" />
                <div>
                  <p className="text-xs font-extrabold text-slate-900">Standard Timezone</p>
                  <p className="text-[10px] text-slate-500">Indian Standard Time (IST - UTC+05:30)</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                Asia/Kolkata
              </span>
            </div>
          </div>
        </div>

        {/* 4. Session & Security Controls */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-600">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Logout &amp; Account Security</h3>
                <p className="text-[11px] text-slate-500">Session termination and access control</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-slate-900">Active Admin Session</p>
                <p className="text-[10px] text-slate-500">Authenticated via Local / Master Security Key</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                Active Session
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200/60 flex justify-end">
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition-all shadow-sm cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(SettingsDashboard);
