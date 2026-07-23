import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';

export default function SplashLoader({ showLoader, isLoaderFading }) {
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    { label: "Initializing Biometric Radar Core", detail: "Validating local storage & log engines" },
    { label: "Connecting Hardware Gateway", detail: "Establishing secure biometric feeds" },
    { label: "Verifying Security Protocols", detail: "Encrypting admin operational session" }
  ];

  useEffect(() => {
    if (!showLoader) return;

    const timer = setInterval(() => {
      setStepIndex(prev => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 450);

    return () => clearInterval(timer);
  }, [showLoader]);

  if (!showLoader) return null;

  return (
    <div className={`fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6 transition-all duration-400 ease-out ${
      isLoaderFading ? 'opacity-0 pointer-events-none scale-105' : 'opacity-100'
    }`}>
      <div className="flex flex-col items-center max-w-sm text-center space-y-7">
        
        {/* Minimalist Executive Logo Ring */}
        <div className="relative flex items-center justify-center h-24 w-24">
          {/* Subtle Outer Spinner Arc */}
          <div className="absolute inset-0 rounded-full border-2 border-slate-100 border-t-blue-600 animate-spin"></div>
          
          {/* Subtle Soft Pulse Aura */}
          <div className="absolute inset-2 rounded-full bg-blue-50/60 animate-pulse"></div>

          {/* Clean White Card */}
          <div className="relative h-16 w-16 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex items-center justify-center p-2.5">
            <img src="/dpi.png" alt="DPI Logo" className="h-10 w-10 object-contain" />
          </div>
        </div>

        {/* Brand & Title */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-blue-600">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-slate-500">DPI ATTENDANCE RADAR</span>
          </div>
          <h2 className="text-slate-900 font-extrabold text-xl tracking-tight font-sans">
            Biometric Attendance Portal
          </h2>
        </div>

        {/* Minimalist Purpose Checkpoint Card */}
        <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-3 shadow-2xs">
          {steps.map((step, idx) => {
            const isDone = idx < stepIndex;
            const isCurrent = idx === stepIndex;

            return (
              <div key={idx} className="flex items-start gap-3 transition-all">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : isCurrent ? (
                  <RefreshCw className="h-4 w-4 text-blue-600 shrink-0 mt-0.5 animate-spin" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-slate-300 shrink-0 mt-0.5 bg-white" />
                )}

                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold leading-tight ${isCurrent ? 'text-slate-900' : isDone ? 'text-slate-700' : 'text-slate-400'}`}>
                    {step.label}
                  </p>
                  {isCurrent && (
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5 font-mono animate-fadeIn">
                      {step.detail}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Minimalist Progress Line */}
        <div className="w-52 space-y-1.5">
          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden border border-slate-200/60 relative">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all duration-400 ease-out" 
              style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
          <p className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">
            Secured Biometric Gateway
          </p>
        </div>

      </div>
    </div>
  );
}
