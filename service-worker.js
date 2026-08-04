// service-worker.js — V Todo
// Gère le cache pour un fonctionnement hors connexion (PWA).
 
const CACHE_NAME = "v-todo-cache-v1";
 
// Fichiers à mettre en cache dès l'installation.
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/favicon.png",
  "./icons/splash.png"
];
 
// Installation : on pré-remplit le cache.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});
 
// Activation : on supprime les anciens caches.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});
 
// Interception des requêtes : cache d'abord, réseau en secours.
self.addEventListener("fetch", (event) => {
  // On ne gère que les requêtes GET du même domaine.
  if (event.request.method !== "GET") return;
 
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
 
      return fetch(event.request)
        .then((networkResponse) => {
          // On met en cache la nouvelle ressource pour la prochaine fois.
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
          return networkResponse;
        })
        .catch(() => {
          // Hors connexion et absent du cache : on retombe sur la page principale.
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
 
