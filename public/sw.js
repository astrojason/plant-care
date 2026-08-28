// Passthrough service worker: no caching. Its only job is to satisfy the
// browser's installability criteria (a registered SW with a fetch handler).
// This app reads live Firebase/Firestore and OpenAI data, so caching
// responses here would risk serving stale plant data or auth state.
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
