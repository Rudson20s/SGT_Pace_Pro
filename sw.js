// Service Worker para PACE PRO
// Versão: 1.0.0

const CACHE_NAME = 'pace-pro-v1.0.0';
const RUNTIME_CACHE = 'pace-pro-runtime';

// Recursos para cache inicial
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalação: pre-cache de recursos essenciais
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache aberto, adicionando recursos...');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Recursos em cache com sucesso');
        return self.skipWaiting(); // Ativa imediatamente
      })
      .catch((error) => {
        console.error('[SW] Erro ao fazer cache:', error);
      })
  );
});

// Ativação: limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[SW] Service Worker ativado');
      return self.clients.claim(); // Toma controle imediato
    })
  );
});

// Estratégia de cache: Network First com fallback para Cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições de outros domínios (exceto CDNs conhecidos)
  if (url.origin !== location.origin) {
    // Permite CDNs de fontes e recursos externos
    if (url.hostname.includes('cdnjs.cloudflare.com') || 
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('fonts.gstatic.com')) {
      event.respondWith(
        caches.match(request).then((cachedResponse) => {
          return cachedResponse || fetch(request).then((response) => {
            return caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, response.clone());
              return response;
            });
          });
        })
      );
    }
    return;
  }

  // Para recursos do app: Network First (sempre tenta buscar atualização)
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Se conseguiu da rede, atualiza o cache
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Se falhou, tenta do cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Servindo do cache:', request.url);
            return cachedResponse;
          }
          
          // Se não tem no cache e é HTML, retorna página offline
          if (request.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Sincronização em background (quando voltar online)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-training-data') {
    event.waitUntil(
      // Aqui você poderia sincronizar dados de treino com servidor
      Promise.resolve()
    );
  }
});

// Notificações push (para lembretes de treino)
self.addEventListener('push', (event) => {
  console.log('[SW] Push recebido');
  
  const options = {
    body: event.data ? event.data.text() : 'Hora de treinar! 🏃‍♂️',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    tag: 'pace-pro-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'start',
        title: 'Iniciar Treino'
      },
      {
        action: 'dismiss',
        title: 'Depois'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('PACE PRO', options)
  );
});

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificação clicada:', event.action);
  
  event.notification.close();
  
  if (event.action === 'start') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Mensagens do cliente
self.addEventListener('message', (event) => {
  console.log('[SW] Mensagem recebida:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

console.log('[SW] Service Worker carregado');
