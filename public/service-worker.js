self.addEventListener("install", (event) => {
    console.log("Service worker installed");
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    console.log("Service worker activated");
});

self.addEventListener("fetch", (event) => {
    // Let network requests pass through
});
