import React from 'react';
import { User, Lock, AlertTriangle } from 'lucide-react';

export default function LoginView({
  showLogin,
  isLoginFading,
  loginUsername,
  setLoginUsername,
  loginPassword,
  setLoginPassword,
  loginError,
  handleLogin
}) {
  if (!showLogin) return null;

  return (
    <div className={`fixed inset-0 z-50 bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-all duration-300 ease-out ${
      isLoginFading ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 animate-fadeIn'
    }`}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <div className="bg-white p-2.5 rounded-2xl shadow-md mb-4 border border-slate-200 w-16 h-16 flex items-center justify-center shrink-0 hover:scale-105 transition-all duration-300 animate-fadeIn">
          <img src="/dpi.png" alt="DPI Logo" className="h-11 w-11 object-contain" />
        </div>
        <h2 className="text-center text-xl sm:text-2xl font-black tracking-tight text-slate-900">
          Sign in to DPI Attendance
        </h2>
        <p className="mt-1 text-center text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest font-sans">
          Secured Dashboard System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-slate-200/80 shadow-xl rounded-2xl p-6 sm:p-10 space-y-6 animate-fadeIn">
          {loginError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-lg text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-808 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-808 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </form>

          <div className="text-center pt-2 border-t border-slate-100">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Secured Administrative Console
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
