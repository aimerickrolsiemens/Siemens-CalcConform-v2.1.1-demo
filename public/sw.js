// Service Worker pour Siemens CalcConform PWA
// Utilise Workbox pour la gestion du cache

const CACHE_NAME = 'siemens-calcconform-v2.0.0';
const STATIC_CACHE_NAME = 'siemens-static-v2.0.0';
const RUNTIME_CACHE_NAME = 'siemens-runtime-v2.0.0';

// Ressources statiques à mettre en cache immédiatement
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/web-app-styles.css',
  '/assets/images/icon.png',
  '/assets/images/Siemens-Logo.png',
  '/assets/images/siemens-header-logo.png',
  // Pages principales de l'app
  '/simple',
  '/search',
  '/notes',
  '/export',
  '/about',
  '/settings'
];

// Ressources à mettre en cache au runtime
const RUNTIME_CACHE_PATTERNS = [
  // Pages dynamiques
  /\/project\/.*/,
  /\/building\/.*/,
  /\/zone\/.*/,
  /\/shutter\/.*/,
  /\/note\/.*/,
  // Assets dynamiques
  /\/assets\/.*/,
  // Fonts
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installation en cours...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Mise en cache des ressources statiques');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker: Installation terminée');
        // Forcer l'activation immédiate
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Erreur installation:', error);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activation en cours...');
  
  event.waitUntil(
    Promise.all([
      // Nettoyer les anciens caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== RUNTIME_CACHE_NAME && 
                cacheName !== CACHE_NAME) {
              console.log('🗑️ Service Worker: Suppression ancien cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Prendre le contrôle de tous les clients
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Service Worker: Activation terminée');
    })
  );
});

// Stratégie de cache pour les requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-HTTP
  if (!request.url.startsWith('http')) {
    return;
  }

  // Ignorer les requêtes vers des domaines externes (sauf fonts)
  if (url.origin !== self.location.origin && 
      !url.hostname.includes('googleapis.com') && 
      !url.hostname.includes('gstatic.com')) {
    return;
  }

  event.respondWith(
    handleRequest(request)
  );
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // 1. Ressources statiques : Cache First
    if (STATIC_ASSETS.some(asset => url.pathname === asset) || 
        url.pathname.includes('/assets/') ||
        url.pathname.includes('.css') ||
        url.pathname.includes('.js') ||
        url.pathname.includes('.png') ||
        url.pathname.includes('.jpg') ||
        url.pathname.includes('.svg')) {
      
      return await cacheFirst(request, STATIC_CACHE_NAME);
    }

    // 2. Pages dynamiques : Network First avec fallback cache
    if (RUNTIME_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      return await networkFirst(request, RUNTIME_CACHE_NAME);
    }

    // 3. Fonts Google : Cache First
    if (url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) {
      return await cacheFirst(request, STATIC_CACHE_NAME);
    }

    // 4. Navigation (pages HTML) : Network First avec fallback offline
    if (request.mode === 'navigate') {
      return await networkFirstWithOfflineFallback(request);
    }

    // 5. Autres requêtes : Network First
    return await networkFirst(request, RUNTIME_CACHE_NAME);

  } catch (error) {
    console.error('❌ Service Worker: Erreur handling request:', error);
    
    // Fallback pour les pages de navigation
    if (request.mode === 'navigate') {
      return await getOfflineFallback();
    }
    
    // Pour les autres requêtes, essayer le cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Dernière option : réponse d'erreur
    return new Response('Ressource non disponible hors ligne', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Stratégie Cache First (pour les ressources statiques)
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log('📦 Cache hit:', request.url);
    return cachedResponse;
  }
  
  console.log('🌐 Cache miss, fetching:', request.url);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('❌ Network error:', error);
    throw error;
  }
}

// Stratégie Network First (pour les pages dynamiques)
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    console.log('🌐 Network first:', request.url);
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('📦 Network failed, trying cache:', request.url);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Stratégie Network First avec fallback offline pour la navigation
async function networkFirstWithOfflineFallback(request) {
  try {
    console.log('🌐 Navigation request:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Mettre en cache la page
      const cache = await caches.open(RUNTIME_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('📦 Navigation offline, trying cache or fallback');
    
    // Essayer le cache d'abord
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback vers la page d'accueil en cache
    const homeResponse = await caches.match('/');
    if (homeResponse) {
      return homeResponse;
    }
    
    // Dernière option : page offline simple
    return await getOfflineFallback();
  }
}

// Page de fallback hors ligne
async function getOfflineFallback() {
  const offlineHTML = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Siemens CalcConform - Hors ligne</title>
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          margin: 0;
          padding: 0;
          background: linear-gradient(135deg, #009999 0%, #007A7A 100%);
          color: white;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          text-align: center;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 2px;
          margin-bottom: 8px;
        }
        .app-name {
          font-size: 18px;
          font-weight: 500;
          margin-bottom: 40px;
        }
        .offline-icon {
          font-size: 64px;
          margin-bottom: 24px;
          opacity: 0.8;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 16px;
        }
        .message {
          font-size: 16px;
          opacity: 0.9;
          line-height: 1.5;
          max-width: 400px;
          margin-bottom: 32px;
        }
        .retry-button {
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .retry-button:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
        }
        .features {
          margin-top: 40px;
          opacity: 0.8;
        }
        .feature {
          margin: 8px 0;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="logo">SIEMENS</div>
      <div class="app-name">CalcConform</div>
      
      <div class="offline-icon">📱</div>
      <div class="title">Application hors ligne</div>
      <div class="message">
        Vous êtes actuellement hors ligne. L'application fonctionne en mode local avec vos données sauvegardées.
      </div>
      
      <button class="retry-button" onclick="window.location.reload()">
        Réessayer la connexion
      </button>
      
      <div class="features">
        <div class="feature">✅ Vos projets sont accessibles</div>
        <div class="feature">✅ Calculs de conformité disponibles</div>
        <div class="feature">✅ Notes et données sauvegardées</div>
      </div>
      
      <script>
        // Rediriger vers l'accueil après 3 secondes si en ligne
        setTimeout(() => {
          if (navigator.onLine) {
            window.location.href = '/';
          }
        }, 3000);
        
        // Écouter le retour de connexion
        window.addEventListener('online', () => {
          window.location.href = '/';
        });
      </script>
    </body>
    </html>
  `;

  return new Response(offlineHTML, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache'
    }
  });
}

// Gestion des messages du client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('🔄 Service Worker: Skip waiting demandé');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Notification de mise à jour disponible
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    // Vérifier s'il y a une nouvelle version
    caches.keys().then((cacheNames) => {
      const hasUpdate = !cacheNames.includes(CACHE_NAME);
      event.ports[0].postMessage({ hasUpdate });
    });
  }
});

console.log('🚀 Service Worker Siemens CalcConform initialisé');