// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
firebase.initializeApp({
    apiKey: "AIzaSyDdz4AgqojNY_UMo1t6ahf5KCdJnEWxB0I",
    authDomain: "fast-haazir-786.firebaseapp.com",
    projectId: "fast-haazir-786",
    storageBucket: "fast-haazir-786.firebasestorage.app",
    messagingSenderId: "285845112968",
    appId: "1:285845112968:web:ec5d0ffd9a3b8b6e21b73d",
    measurementId: "G-7FBG46XBBS"
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icons/icon-192x192.png', // Ensure this path is correct
        image: payload.notification.image || null,
        data: payload.data,
        requireInteraction: true,
        actions: [
            { action: 'open_url', title: 'Open App' }
        ]
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function (event) {
    console.log('[firebase-messaging-sw.js] Notification click Received.', event);

    event.notification.close();

    // Open the app or specific URL
    let url = '/';
    if (event.notification.data && event.notification.data.url) {
        url = event.notification.data.url;
    } else if (event.notification.data && event.notification.data.click_action) {
        url = event.notification.data.click_action;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
            // Check if there is already a window/tab open with the target URL
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window/tab
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
