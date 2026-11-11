// Semester Desk's service worker (v2): the app opens offline and can be installed. The build (vite.config.ts) fills in
// SHELL, every file the app itself is made of, and VERSION, which changes whenever one of them does, so an update
// arrives the next time the app is online. Its path is v1's (sw.js), so each replaces the other (REBUILD-PLAN.md §1).
const VERSION = "339012354b47", SHELL = ["./","assets/index-D9WlZc2s.css","assets/index-DDv9Kn3Z.js","assets/inter-cyrillic-ext-wght-normal-BOeWTOD4.woff2","assets/inter-cyrillic-wght-normal-DqGufNeO.woff2","assets/inter-greek-ext-wght-normal-DlzME5K_.woff2","assets/inter-greek-wght-normal-CkhJZR-_.woff2","assets/inter-latin-ext-wght-normal-DO1Apj_S.woff2","assets/inter-latin-wght-normal-Dx4kXJAl.woff2","assets/inter-vietnamese-wght-normal-CBcvBZtf.woff2","assets/ocr-browser-CkeLSUxu.js","index.html","manifest.webmanifest","icon.svg","icon-180.png","icon-192.png","icon-512.png","icon-maskable-512.png"];
const CACHE = "semester-desk-" + VERSION;
// The vendored libraries carry their version in their path (vendor/xlsx-0.20.3/…), so they're kept from one update to
// the next. They're saved the first time something needs them: a spreadsheet, a picture to read (about 7 MB).
const LIBS = "semester-desk-libs";
const isLib = path => path.includes("/vendor/");

// The shell is fetched past the browser's own cache: GitHub Pages lets a browser reuse a file for 10 minutes, and a
// copy of the page from before this update would ask for files the update removed.
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: "reload"})))).then(() => self.skipWaiting()));
});
// Older copies go, v1's included; the libraries stay.
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== LIBS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    // The page: the network first so updates arrive (always asking the server, never the browser's 10-minute copy), the
    // saved copy offline.
    e.respondWith(fetch(req, {cache: "no-cache"}).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put("index.html", copy)); } return r; })
      .catch(() => caches.match("index.html", {cacheName: CACHE, ignoreVary: true})));
    return;
  }
  // ignoreVary: the page asks for its scripts with an Origin header and servers mark answers "Vary: Origin" (or
  // Accept-Encoding), which would make the copy saved at install never match.
  e.respondWith(caches.match(req, {ignoreVary: true}).then(hit => hit || fetch(req).then(r => {
    if (r.ok && r.status === 200) { const copy = r.clone(); caches.open(isLib(url.pathname) ? LIBS : CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});
