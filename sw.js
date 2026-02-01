
// Service Worker vorerst leer, um Cache-Probleme während der Einrichtung zu vermeiden.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
