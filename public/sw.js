self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
  let title = 'ColocManager';
  let body = 'Nouvelle notification de votre colocation.';
  let data = {};

  if (event.data) {
    try {
      const parsed = event.data.json();
      title = parsed.title || title;
      body = parsed.body || body;
      data = parsed.data || {};
    } catch (e) {
      body = event.data.text() || body;
    }
  }

  const options = {
    body: body,
    icon: '/icon.png',
    badge: '/icon.png',
    data: data,
    vibrate: [200, 100, 200],
    tag: 'colocmanager-' + Date.now(),
    renotify: true
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
            break;
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
