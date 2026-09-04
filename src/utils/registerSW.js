export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    if (import.meta.env.DEV) {
      // In development mode, unregister any active service worker to prevent stale caching & Vite HMR errors
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
          console.log('[PWA] Unregistered dev service worker:', registration.scope);
        }
      });
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name);
          }
        });
      }
      return;
    }

    // In production mode, register service worker normally
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[PWA] ServiceWorker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.error('[PWA] ServiceWorker registration failed:', error);
        });
    });
  }
}

