import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

function ToastItem({ toast, onDismiss }) {
  const { id, msg, type = 'success' } = toast;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onDismiss) onDismiss(id);
    }, 3200);

    return () => clearTimeout(timer);
  }, [id]); // Run timer once per toast id

  const getTheme = () => {
    switch (type) {
      case 'error':
        return {
          icon: AlertCircle,
          iconColor: 'text-[#dc2626]',
          badgeBg: 'bg-[#fcf0f0]',
          borderColor: 'border-[#fecaca]',
          grad: 'linear-gradient(to right, #dc2626, #fb7185)'
        };
      case 'info':
        return {
          icon: Info,
          iconColor: 'text-[#0284c7]',
          badgeBg: 'bg-[#f0f9ff]',
          borderColor: 'border-[#bae6fd]',
          grad: 'linear-gradient(to right, #0284c7, #38bdf8)'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-amber-600',
          badgeBg: 'bg-amber-50',
          borderColor: 'border-amber-200',
          grad: 'linear-gradient(to right, #f59e0b, #facc15)'
        };
      case 'success':
      default:
        return {
          icon: CheckCircle2,
          iconColor: 'text-[#16a34a]',
          badgeBg: 'bg-[#eaf7ed]',
          borderColor: 'border-[#bbf7d0]',
          grad: 'linear-gradient(to right, #16a34a, #34d399)'
        };
    }
  };

  const theme = getTheme();
  const Icon = theme.icon;

  return (
    <div className="w-full pointer-events-auto animate-in slide-in-from-bottom-3 fade-in duration-200">
      <div className={`relative bg-white/95 backdrop-blur-md border ${theme.borderColor} shadow-xl rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 overflow-hidden group`}>
        {/* Icon */}
        <div className={`h-9 w-9 rounded-xl ${theme.badgeBg} border ${theme.borderColor} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform duration-200`}>
          <Icon className={`h-5 w-5 ${theme.iconColor}`} />
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-xs font-black text-slate-900 leading-snug tracking-tight">
            {msg}
          </p>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => onDismiss && onDismiss(id)}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          title="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Countdown Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100 overflow-hidden">
          <div
            className="h-full w-full"
            style={{
              animation: 'toastProgress 3.2s linear forwards',
              backgroundImage: theme.grad
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}

export default function Toast({ notification, onClose, toasts = [], onDismiss }) {
  // Mode 1: Multi-toast Stacking Queue
  if (toasts && toasts.length > 0) {
    return (
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col-reverse gap-2.5 items-end max-w-sm sm:max-w-md w-full pointer-events-none">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
        <style>{`
          @keyframes toastProgress {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>
      </div>
    );
  }

  // Mode 2: Single Notification Backward Compatibility
  if (!notification) return null;

  const singleToast = {
    id: 'single-toast',
    msg: notification.msg,
    type: notification.type
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] max-w-sm sm:max-w-md w-full pointer-events-none">
      <ToastItem toast={singleToast} onDismiss={onClose} />
      <style>{`
        @keyframes toastProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
