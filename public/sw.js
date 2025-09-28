// Empty service worker to prevent 404 errors
// This file exists to handle browser requests for /sw.js

self.addEventListener('install', () => {
  // Skip waiting and activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  // Take control of all clients immediately
  self.clients.claim();
});

// No-op fetch handler - just pass through all requests
self.addEventListener('fetch', (event) => {
  // Let the browser handle all fetch requests normally
  return;
});
