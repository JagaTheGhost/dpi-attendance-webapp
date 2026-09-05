import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Monitor, X, Share, PlusSquare, CheckCircle2, Info } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Capture Chrome/Edge/Android beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      } catch (err) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  if (isInstalled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl shadow-2xs">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
        <span>App Installed</span>
      </span>
    );
  }

  return (
    <>
      {/* Installed Success Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">App successfully installed on your device!</span>
        </div>
      )}

      {/* Main Install Button */}
      <button
        type="button"
        onClick={handleInstallClick}
        className="relative group flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all shadow-sm hover:shadow-md cursor-pointer border border-blue-500/30"
        title="Install DPI Attendance app on desktop or mobile"
      >
        <Download className="h-4 w-4 shrink-0 group-hover:-translate-y-0.5 transition-transform" />
        <span>Install App</span>
      </button>

      {/* Install Guidance Modal for Desktop & Mobile */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 relative text-slate-800">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                <Monitor className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Install DPI Attendance App</h3>
                <p className="text-xs text-slate-500 font-semibold">Desktop &amp; Mobile App Installation</p>
              </div>
            </div>

            {isIOS ? (
              /* iOS Manual Instructions */
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs text-slate-700 font-medium">
                <p className="font-bold text-slate-900">Follow these steps on Safari (iOS):</p>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0">1</div>
                  <span>Tap the <Share className="inline h-4 w-4 text-blue-600 mx-0.5" /> <strong>Share</strong> icon in Safari toolbar.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0">2</div>
                  <span>Scroll down and tap <PlusSquare className="inline h-4 w-4 text-blue-600 mx-0.5" /> <strong>Add to Home Screen</strong>.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0">3</div>
                  <span>Tap <strong>Add</strong> in the top right corner.</span>
                </div>
              </div>
            ) : (
              /* Chrome/Edge Desktop & Android Instructions */
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs text-slate-700 font-medium">
                <p className="font-bold text-slate-900">Install as Desktop App on Chrome / Edge:</p>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0">1</div>
                  <span>Look at the top browser URL address bar.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0">2</div>
                  <span>Click the <strong>Install Icon</strong> (<Download className="inline h-3.5 w-3.5 text-blue-600 mx-0.5" />) or 3 dots menu ➔ <strong>"Install DPI Attendance"</strong>.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0">3</div>
                  <span>Confirm <strong>Install</strong> to add the app icon to your Windows desktop and taskbar.</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

