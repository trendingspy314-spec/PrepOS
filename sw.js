/* ═══════════════════════════════════════════════════════════
   PrepOS v3.0 — Service Worker
   SIMPRA EDTECH · Offline First PWA
   ═══════════════════════════════════════════════════════════ */

'use strict';

var CACHE_NAME = 'prepos-v3-0-1';
var STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// ── INSTALL ──
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE ──
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_NAME;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── FETCH ──
self.addEventListener('fetch', function(e) {

  // AI API calls — Network only, never cache
  if (e.request.url.indexOf('openrouter.ai') !== -1 ||
      e.request.url.indexOf('googleapis.com') !== -1) {
    e.respondWith(fetch(e.request));
    return;
  }

  // POST requests — Network only
  if (e.request.method !== 'GET') {
    e.respondWith(fetch(e.request));
    return;
  }

  // Static assets — Cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;

      return fetch(e.request).then(function(response) {
        // Only cache valid responses
        if (!response || response.status !== 200 ||
            response.type === 'opaque') {
          return response;
        }

        var toCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, toCache);
        });

        return response;

      }).catch(function() {
        // Offline fallback
        return caches.match('./index.html');
      });
    })
  );
});

// ── MESSAGE HANDLER ──
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (e.data && e.data.type === 'GET_VERSION') {
    e.ports[0].postMessage({ version: CACHE_NAME });
  }
});
