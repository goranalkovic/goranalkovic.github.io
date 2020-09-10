'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';
const RESOURCES = {
  "assets/AssetManifest.json": "54d607d6c125db8136e2387abc555415",
"assets/assets/fonts/minesweep.ttf": "52bbb7b4f5349b0ffa583c5f95471620",
"assets/assets/fonts/pressstart.ttf": "2c404fd06cd67770807d242b2d2e5a16",
"assets/assets/fonts/Rubik-Bold.ttf": "87b4e0d5acc5093dfca4c4355b809749",
"assets/assets/fonts/Rubik-BoldItalic.ttf": "7f21422cadc0517d3335346936481078",
"assets/assets/fonts/Rubik-Italic.ttf": "5ca63c019a27084168dd94003689a755",
"assets/assets/fonts/Rubik-Regular.ttf": "6c980940392587c8d7d325c07965ebda",
"assets/assets/fonts/sevenseg.ttf": "e700831dee1b10a94c5c16fdbf4458e8",
"assets/assets/images/bliss.jpg": "87c986c96e0a5856ef71ef71017280ce",
"assets/assets/images/DangerousDaveRedux.png": "6aaf2f461db0dce975f05b13192aab13",
"assets/assets/images/dave.jpg": "ade6fca28c02f04d8f3c0f82e6a6afa5",
"assets/assets/images/mine.jpg": "453e4ef7ba1de48303d8b9fdc5d71f9b",
"assets/assets/images/moscow.jpg": "75d70ad4c0236a7cfb7322c39abcb587",
"assets/assets/images/tetris.jpg": "2ef522b1859c9e34ef07ff1dff55adfe",
"assets/assets/tiles/davehallway.tmx": "7581614a850a6955be77683de71eeed5",
"assets/assets/tiles/davelvl1.tmx": "d7ffb4b9eb333926deff3e5587cda973",
"assets/assets/tiles/davelvl2.tmx": "db1372ea95a4ef1fabea64c085039bb8",
"assets/assets/tiles/davelvl3.tmx": "ea95c5661dce7268dfbf7e96b2140206",
"assets/FontManifest.json": "bb4f8e53ec1fdd46d3619adfce882c78",
"assets/fonts/MaterialIcons-Regular.otf": "a68d2a28c526b3b070aefca4bac93d25",
"assets/NOTICES": "2b5b97d44f262eb8ce821ae16da218e6",
"assets/packages/cupertino_icons/assets/CupertinoIcons.ttf": "115e937bb829a890521f72d2e664b632",
"assets/packages/flame_splash_screen/assets/flame-logo-black.gif": "ad85ef276b33a29a309eaa725dce444b",
"assets/packages/flame_splash_screen/assets/flame-logo-white.gif": "ca3eef6cf149c4e206ac9fa237e69bf9",
"assets/packages/fluentui_icons/fonts/FluentSystemIconsP1.ttf": "23b73ce8aefb542ee0feaedd0386845c",
"assets/packages/fluentui_icons/fonts/FluentSystemIconsP2.ttf": "56dba58d2d8093c72e03733446b2ee8b",
"assets/packages/fluentui_icons/fonts/FluentSystemIconsP3.ttf": "ab4cbfb0be90d695779ab26d52482d53",
"assets/packages/fluentui_icons/fonts/FluentSystemIconsP4.ttf": "3c6ce6ca81112ece4acc134621354b1a",
"assets/packages/fluentui_icons/fonts/FluentSystemIconsP5.ttf": "6883e94fa2e1616edc835fbfa41f8993",
"assets/packages/fluentui_icons/fonts/FluentSystemIconsP6.ttf": "989fe1d7b2e0d3b11725dc8325754981",
"assets/packages/fluentui_icons/fonts/FluentSystemIconsP7.ttf": "a27b319a179db105f2e05092d214cff1",
"favicon.png": "5dcef449791fa27946b3d35ad8803796",
"icons/Icon-192.png": "ac9a721a12bbc803b44f645561ecb1e1",
"icons/Icon-512.png": "96e752610906ba2a93c65f8abe1645f1",
"index.html": "d7750da2ada0e67bd4fc9af7fe07088c",
"/": "d7750da2ada0e67bd4fc9af7fe07088c",
"main.dart.js": "0e7d59c8439f9c9b9430becd027d582d",
"manifest.json": "87cecdec3bb5cd427b331d526eed38fa"
};

// The application shell files that are downloaded before a service worker can
// start.
const CORE = [
  "/",
"main.dart.js",
"index.html",
"assets/NOTICES",
"assets/AssetManifest.json",
"assets/FontManifest.json"];
// During install, the TEMP cache is populated with the application shell files.
self.addEventListener("install", (event) => {
  return event.waitUntil(
    caches.open(TEMP).then((cache) => {
      return cache.addAll(
        CORE.map((value) => new Request(value + '?revision=' + RESOURCES[value], {'cache': 'reload'})));
    })
  );
});

// During activate, the cache is populated with the temp files downloaded in
// install. If this service worker is upgrading from one with a saved
// MANIFEST, then use this to retain unchanged resource files.
self.addEventListener("activate", function(event) {
  return event.waitUntil(async function() {
    try {
      var contentCache = await caches.open(CACHE_NAME);
      var tempCache = await caches.open(TEMP);
      var manifestCache = await caches.open(MANIFEST);
      var manifest = await manifestCache.match('manifest');
      // When there is no prior manifest, clear the entire cache.
      if (!manifest) {
        await caches.delete(CACHE_NAME);
        contentCache = await caches.open(CACHE_NAME);
        for (var request of await tempCache.keys()) {
          var response = await tempCache.match(request);
          await contentCache.put(request, response);
        }
        await caches.delete(TEMP);
        // Save the manifest to make future upgrades efficient.
        await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
        return;
      }
      var oldManifest = await manifest.json();
      var origin = self.location.origin;
      for (var request of await contentCache.keys()) {
        var key = request.url.substring(origin.length + 1);
        if (key == "") {
          key = "/";
        }
        // If a resource from the old manifest is not in the new cache, or if
        // the MD5 sum has changed, delete it. Otherwise the resource is left
        // in the cache and can be reused by the new service worker.
        if (!RESOURCES[key] || RESOURCES[key] != oldManifest[key]) {
          await contentCache.delete(request);
        }
      }
      // Populate the cache with the app shell TEMP files, potentially overwriting
      // cache files preserved above.
      for (var request of await tempCache.keys()) {
        var response = await tempCache.match(request);
        await contentCache.put(request, response);
      }
      await caches.delete(TEMP);
      // Save the manifest to make future upgrades efficient.
      await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
      return;
    } catch (err) {
      // On an unhandled exception the state of the cache cannot be guaranteed.
      console.error('Failed to upgrade service worker: ' + err);
      await caches.delete(CACHE_NAME);
      await caches.delete(TEMP);
      await caches.delete(MANIFEST);
    }
  }());
});

// The fetch handler redirects requests for RESOURCE files to the service
// worker cache.
self.addEventListener("fetch", (event) => {
  var origin = self.location.origin;
  var key = event.request.url.substring(origin.length + 1);
  // Redirect URLs to the index.html
  if (key.indexOf('?v=') != -1) {
    key = key.split('?v=')[0];
  }
  if (event.request.url == origin || event.request.url.startsWith(origin + '/#') || key == '') {
    key = '/';
  }
  // If the URL is not the RESOURCE list, skip the cache.
  if (!RESOURCES[key]) {
    return event.respondWith(fetch(event.request));
  }
  // If the URL is the index.html, perform an online-first request.
  if (key == '/') {
    return onlineFirst(event);
  }
  event.respondWith(caches.open(CACHE_NAME)
    .then((cache) =>  {
      return cache.match(event.request).then((response) => {
        // Either respond with the cached resource, or perform a fetch and
        // lazily populate the cache.
        return response || fetch(event.request).then((response) => {
          cache.put(event.request, response.clone());
          return response;
        });
      })
    })
  );
});

self.addEventListener('message', (event) => {
  // SkipWaiting can be used to immediately activate a waiting service worker.
  // This will also require a page refresh triggered by the main worker.
  if (event.data === 'skipWaiting') {
    return self.skipWaiting();
  }
  if (event.message === 'downloadOffline') {
    downloadOffline();
  }
});

// Download offline will check the RESOURCES for all files not in the cache
// and populate them.
async function downloadOffline() {
  var resources = [];
  var contentCache = await caches.open(CACHE_NAME);
  var currentContent = {};
  for (var request of await contentCache.keys()) {
    var key = request.url.substring(origin.length + 1);
    if (key == "") {
      key = "/";
    }
    currentContent[key] = true;
  }
  for (var resourceKey in Object.keys(RESOURCES)) {
    if (!currentContent[resourceKey]) {
      resources.push(resourceKey);
    }
  }
  return contentCache.addAll(resources);
}

// Attempt to download the resource online before falling back to
// the offline cache.
function onlineFirst(event) {
  return event.respondWith(
    fetch(event.request).then((response) => {
      return caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, response.clone());
        return response;
      });
    }).catch((error) => {
      return caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response != null) {
            return response;
          }
          throw error;
        });
      });
    })
  );
}
