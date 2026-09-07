import React, { useState, memo } from 'react';
import { 
  BookOpen, 
  Cpu, 
  Calculator, 
  ShieldCheck, 
  FileText, 
  Monitor, 
  Globe, 
  Clock, 
  Users, 
  Database, 
  Layers, 
  CheckCircle2, 
  AlertTriangle,
  ChevronRight,
  Download,
  Info
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

function SystemDocumentationView() {
  const { t } = useTranslation();
  const [activeDocSection, setActiveDocSection] = useState('arch');

  const sections = [
    { id: 'arch', label: t('overviewArch'), icon: Cpu },
    { id: 'math', label: t('attendanceMathRules'), icon: Calculator },
    { id: 'admin', label: t('adminWorkflows'), icon: ShieldCheck },
    { id: 'reports', label: t('reportsExportGuide'), icon: FileText },
    { id: 'install', label: t('installationPWA'), icon: Monitor }
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-6 animate-fadeIn">
      {/* Documentation Header Title & Subtitle */}
      <div className="space-y-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shrink-0">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              {t('userManualTitle')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              {t('userManualSubtitle')}
            </p>
          </div>
        </div>

        {/* Dedicated Responsive Tab Navigation Bar */}
        <div className="w-full overflow-x-auto pb-1 scrollbar-none">
          <div className="inline-flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 min-w-max">
            {sections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeDocSection === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveDocSection(sec.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 1: ARCHITECTURE & DATA FLOW */}
      {activeDocSection === 'arch' && (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed animate-fadeIn">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600" />
              1. Architecture &amp; Real-Time Data Pipeline
            </h4>
            <p>
              The <strong>DPI Biometric Attendance Radar</strong> operates as a hybrid real-time web application. It connects directly to eSSL biometric fingerprint, face recognition, and RFID hardware scanners via HTTP Webhooks and Supabase PostgreSQL.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-2xl p-4 space-y-2 bg-white">
              <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Supabase Realtime Mode
              </h5>
              <p className="text-slate-600">
                Listens to PostgreSQL webhooks in real time using WebSocket channels (<code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">postgres_changes</code>). New biometric swipes immediately trigger optimistic UI updates with zero page reloads.
              </p>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 space-y-2 bg-white">
              <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span> Local Standalone Mode
              </h5>
              <p className="text-slate-600">
                If internet or database connectivity drops, the application automatically fails over to Local Mode. Attendance logs and admin operations are saved to browser <code className="bg-slate-100 px-1 py-0.5 rounded text-amber-700 font-mono">localStorage</code> and synced automatically when back online.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: ATTENDANCE MATH & RULES */}
      {activeDocSection === 'math' && (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed animate-fadeIn">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Calculator className="h-4 w-4 text-indigo-600" />
              2. Biometric Calculation Engine &amp; Logic Rules
            </h4>
            <p>
              The calculation engine pairs chronological biometric punches to determine daily presence, late arrivals, early departures, and active working hours.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-xs">Standard Work Shift</span>
                <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">09:00 AM - 06:00 PM (9 Hours)</span>
              </div>
              <p className="text-slate-600">
                The standard shift starts at 09:00 AM. A grace period allows punches up to <strong>09:30 AM</strong> before marking an employee as <em>Late Arrival</em>.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-xs">Punch Pairing &amp; Active Session</span>
                <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">IN ➔ OUT Pair</span>
              </div>
              <p className="text-slate-600">
                - <strong>First Punch of the Day</strong>: Classified as <strong>IN Punch</strong>.<br />
                - <strong>Subsequent Punches</strong>: Chronologically paired. If an IN punch has no corresponding OUT punch on the current day, the employee is marked as <strong>Active In Office</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-xs">Overtime (OT) Calculation</span>
                <span className="font-mono text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">Hours Worked &gt; 9.0 hrs</span>
              </div>
              <p className="text-slate-600">
                Any net accumulated duration exceeding 9.0 hours per shift is automatically recorded as <strong>Overtime (OT) Hours</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: ADMIN OPERATIONS & LEAVE */}
      {activeDocSection === 'admin' && (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed animate-fadeIn">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              3. Admin Operations &amp; Business Rules
            </h4>
            <p>
              Admin Ops allows management to grant official leaves, register client site On Duty (OD) visits, fix missed punches, and setup company holidays.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-2xl p-4 space-y-2 bg-white">
              <h5 className="font-bold text-slate-900">🌴 Leave Manager (Sick, Casual, Paid, Unpaid)</h5>
              <p className="text-slate-600">
                Assign official leaves to employees. Active leave entries automatically update the workforce registry and excuse absence during daily calculations.
              </p>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 space-y-2 bg-white">
              <h5 className="font-bold text-slate-900">💼 On Duty (OD) Register</h5>
              <p className="text-slate-600">
                For employees visiting client locations or external meetings. OD entries automatically override <em>"Absent"</em> status without requiring physical machine swipes.
              </p>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 space-y-2 bg-white">
              <h5 className="font-bold text-slate-900">🔧 Punch Regularization</h5>
              <p className="text-slate-600">
                Manually record missing IN or OUT punches caused by scanner hardware glitches, unreadable fingerprints, or forgotten swipes.
              </p>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 space-y-2 bg-white">
              <h5 className="font-bold text-slate-900">📅 Holiday Calendar &amp; Shift Timings</h5>
              <p className="text-slate-600">
                Manage official company holidays and configure customized shift schedules for different departments.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: REPORTS & PDF BRANDING */}
      {activeDocSection === 'reports' && (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed animate-fadeIn">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-600" />
              4. Reports &amp; Executive PDF Export Hub
            </h4>
            <p>
              Generate printable PDF executive circulars, individual employee timesheets, and raw Excel data dumps.
            </p>
          </div>

          <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white">
            <h5 className="font-bold text-slate-900">Custom Branding Setup</h5>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li><strong>Official Header Title</strong>: Set company title in Settings ➔ PDF Branding (e.g. <em>DPI Attendance Systems</em>).</li>
              <li><strong>Accent Palette</strong>: Choose between DPI Indigo, Emerald Green, Sapphire Blue, Coral Red, and Slate Dark.</li>
              <li><strong>Formats Supported</strong>: High-resolution PDF circulars with letterhead branding, Excel (.xlsx) data sheets.</li>
            </ul>
          </div>
        </div>
      )}

      {/* SECTION 5: INSTALLATION & PWA */}
      {activeDocSection === 'install' && (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed animate-fadeIn">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Monitor className="h-4 w-4 text-blue-600" />
              5. Desktop &amp; Mobile App Deployment
            </h4>
            <p>
              DPI Attendance is a fully featured Progressive Web App (PWA). It can be installed directly onto Windows desktops, macOS, Android, and iOS devices.
            </p>
          </div>

          <div className="border border-slate-200 rounded-2xl p-4 space-y-2 bg-white">
            <h5 className="font-bold text-slate-900">How to Install as Desktop App:</h5>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600 font-medium">
              <li>Go to <strong>Settings ➔ App Installation &amp; Diagnostics</strong>.</li>
              <li>Click the <strong>Install App</strong> button.</li>
              <li>Confirm installation in your Chrome or Microsoft Edge browser bar.</li>
              <li>The app will launch as an independent window with its own taskbar shortcut and custom DPI icon!</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(SystemDocumentationView);
